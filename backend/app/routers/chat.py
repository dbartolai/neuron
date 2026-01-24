from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import List, AsyncGenerator, Optional
from datetime import datetime
from app.dependencies.db import get_db
from app.dependencies import db as db_module
from app.dependencies.auth import me
from app.schemas.chat import ChatRequest, ChatResponse, ChatRole, MessageEntry, ChatFeedbackRequest, ChatFeedbackResponse, ChatFallbackRequest
from app.schemas.log import MessageLog
from app.schemas.user import User
from app.services.chat_service import ChatService
from app.services.log_service import LogService
from app.services.thread_service import ThreadService
from app.services.enroll_service import EnrollService
from app.services.feedback_service import FeedbackService
from app.services.user_service import UserService
from uuid import UUID
import asyncpg
import json
from app.schemas.thread import ThreadType
from app.services.prompt_service import PromptService
from app.dependencies.levels import GLOBAL_INVARIANTS
from app.services.fallback_service import FallbackService, ViolationType


router = APIRouter(tags=["chat"])

@router.post(path="/", response_model=ChatResponse)
async def send_chat(body: ChatRequest, db: asyncpg.Connection = Depends(get_db), user: User = Depends(me)) -> ChatResponse:

    # get thread id via the body
    thread_id: UUID = body.thread_id

    # 0) Fetch thread metadata and course levels
    meta_query = """
        SELECT t.thread_type, t.course_id
        FROM threads t
        WHERE t.id = $1
    """
    meta_row = await db.fetchrow(meta_query, thread_id)
    if meta_row is None:
        raise HTTPException(status_code=404, detail="thread not found")
    thread_type: ThreadType = meta_row["thread_type"]
    course_id: UUID = meta_row["course_id"]

    # Verify thread belongs to user and user is enrolled in course
    if not await ThreadService.verify_thread_belongs_to_user(db, thread_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this thread")
    if not await EnrollService.verify_student_enrollment(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this course")

    # Get course rules from database
    level = await PromptService.get_course_rules(db, course_id, thread_type)
    
    # Get level_idx for fallback service (may be None for custom rules)
    levels_query = """
        SELECT writing_level, testing_level, debugging_level
        FROM courses
        WHERE id = $1
    """
    course_row = await db.fetchrow(levels_query, course_id)
    if course_row is None:
        raise HTTPException(status_code=404, detail="course not found")

    if thread_type == ThreadType.writing:
        level_idx = course_row["writing_level"]
    elif thread_type == ThreadType.testing:
        level_idx = course_row["testing_level"]
    elif thread_type == ThreadType.debugging:
        level_idx = course_row["debugging_level"]
    else:
        raise HTTPException(status_code=400, detail="invalid thread type")

    # 1) Stage 1 — Student rules evaluation
    # add user chat to logs
    await LogService.insert_message(db, thread_id, ChatRole.student, body.message)

    user_id = UUID(user["id"])
    passed, details = await ChatService.evaluate_student_rules(
        body.message,
        level.get("student_rules", []),
        db=db,
        user_id=user_id,
        thread_id=thread_id,
    )
    if not passed:
        violations = details.get("violations", [])
        
        # Use deterministic fallback service (pedagogy-first, not generic rejection)
        violation_type = FallbackService.infer_violation_type(violations, body.message)
        system_msg = FallbackService.generate_fallback(
            violation_type=violation_type,
            thread_type=thread_type,
            level_index=level_idx,
            student_prompt=body.message,
            violations=violations
        )
        
        # Log and return pedagogical guidance (as system so it doesn't pollute LLM context)
        await LogService.insert_message(db, thread_id, ChatRole.system, system_msg)
        return ChatResponse(role=ChatRole.system, content=system_msg)

    # 2) Get thread topic (set during thread creation)
    thread_topic = await ThreadService.get_thread_topic(db, thread_id)
    
    # 3) Stage 2 — Chat with full prompt architecture
    # Build complete system prompt with all layers (using thread topic)
    full_system_prompt = await PromptService.build_full_system_prompt(
        db=db,
        course_id=course_id,
        thread_type=thread_type,
        detected_topic=thread_topic  # Read from thread, not detected on each message
    )
    
    # Get conversation history
    prior_logs: List[MessageLog] = await LogService.get_messages_from_thread(db, thread_id)
    messages: List[MessageEntry] = [
        MessageEntry(role=ChatRole(chat.role), content=chat.message, timestamp=chat.created_at.isoformat())
        for chat in prior_logs
    ]

    # Decide whether to enable file_search for this turn
    # File exploration is available at all levels when explicitly requested
    requires_file_search: bool = bool(details.get("requires_file_search", False))

    vector_store_id: str | None = None
    if requires_file_search:
        from app.services.course_service import CourseService  # local import to avoid cycles
        vector_store_id = await CourseService.get_vector_store(db, course_id)

    # Call model with full prompt
    assistant_output: str = await ChatService.chat_with_full_prompt(
        system_prompt=full_system_prompt,
        messages=messages,
        vector_store_id=vector_store_id,
        db=db,
        user_id=user_id,
        thread_id=thread_id,
    )

    # 4) Stage 3 — Response rule evaluation with type awareness
    resp_passed, resp_details = await ChatService.evaluate_response_rules(
        body.message,
        assistant_output,
        level.get("output_rules", []),
        db=db,
        user_id=user_id,
        thread_id=thread_id,
    )

    if not resp_passed:
        violations = resp_details.get("violations", [])
        require_violations = resp_details.get("require_violations", [])
        deny_violations = resp_details.get("deny_violations", [])
        
        # Build corrective prompt based on violation types
        corrective_instructions = []
        
        if require_violations:
            req_text = "; ".join(require_violations)
            corrective_instructions.append(
                f"Your response is missing REQUIRED elements: {req_text}. "
                "Regenerate your response and ensure these required elements are included."
            )
        
        if deny_violations:
            deny_text = "; ".join(deny_violations)
            corrective_instructions.append(
                f"Your response included DENIED content: {deny_text}. "
                "Regenerate your response without this forbidden content."
            )
        
        if not corrective_instructions:
            # Fallback for violations without types
            vtext = "; ".join([f"#{v.get('rule')}: {v.get('reason')}" for v in violations]) or "Unspecified violations"
            corrective_instructions.append(
                f"Follow all response rules strictly. Your previous response violated: {vtext}. Revise and answer again without violating any rules."
            )
        
        # Retry with corrective instructions
        corrective_prompt = full_system_prompt + "\n\n" + " ".join(corrective_instructions)
        
        assistant_output_retry: str = await ChatService.chat_with_full_prompt(
            system_prompt=corrective_prompt,
            messages=messages,
            vector_store_id=vector_store_id,
            db=db,
            user_id=user_id,
            thread_id=thread_id,
        )
        
        # Evaluate retry
        retry_passed, _ = await ChatService.evaluate_response_rules(
            body.message,
            assistant_output_retry,
            level.get("output_rules", []),
            db=db,
            user_id=user_id,
            thread_id=thread_id,
        )
        
        if retry_passed:
            chat_id = await LogService.insert_message(db, thread_id, ChatRole.assistant, assistant_output_retry)
            # Update thread summary after assistant message
            await ThreadService.update_thread_summary_from_messages(db, thread_id, user_id)
            return ChatResponse(role=ChatRole.assistant, content=assistant_output_retry)
        else:
            # Two failures - return error fallback
            fail_msg = FallbackService.generate_fallback(
                violation_type=ViolationType.GENERIC,
                thread_type=thread_type,
                level_index=level_idx,
                student_prompt=body.message,
                violations=violations
            )
            await LogService.insert_message(db, thread_id, ChatRole.system, fail_msg)
            return ChatResponse(role=ChatRole.system, content=fail_msg)

    # success on first attempt
    chat_id = await LogService.insert_message(db, thread_id, ChatRole.assistant, assistant_output)
    # Update thread summary after assistant message
    await ThreadService.update_thread_summary_from_messages(db, thread_id, user_id)
    return ChatResponse(role=ChatRole.assistant, content=assistant_output)


@router.post(path="/stream")
async def send_chat_stream(body: ChatRequest, db: asyncpg.Connection = Depends(get_db), user: User = Depends(me)):
    """Stream chat response via Server-Sent Events (SSE)."""
    
    # get thread id via the body
    thread_id: UUID = body.thread_id

    # 0) Fetch thread metadata and course levels
    meta_query = """
        SELECT t.thread_type, t.course_id
        FROM threads t
        WHERE t.id = $1
    """
    meta_row = await db.fetchrow(meta_query, thread_id)
    if meta_row is None:
        raise HTTPException(status_code=404, detail="thread not found")
    thread_type: Optional[ThreadType] = meta_row["thread_type"]
    course_id: UUID = meta_row["course_id"]

    # Verify thread belongs to user and user is enrolled in course
    if not await ThreadService.verify_thread_belongs_to_user(db, thread_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this thread")
    if not await EnrollService.verify_student_enrollment(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this course")

    if thread_type is None:
        thread_type = ThreadType.writing
    
    # Get course rules from database
    level = await PromptService.get_course_rules(db, course_id, thread_type)
    
    # Get level_idx for fallback service (may be None for custom rules)
    levels_query = """
        SELECT writing_level, testing_level, debugging_level
        FROM courses
        WHERE id = $1
    """
    course_row = await db.fetchrow(levels_query, course_id)
    if course_row is None:
        raise HTTPException(status_code=404, detail="course not found")

    if thread_type == ThreadType.writing:
        level_idx = course_row["writing_level"]
    elif thread_type == ThreadType.testing:
        level_idx = course_row["testing_level"]
    elif thread_type == ThreadType.debugging:
        level_idx = course_row["debugging_level"]
    else:
        raise HTTPException(status_code=400, detail="invalid thread type")

    # 1) Stage 1 — Student rules evaluation
    # add user chat to logs
    await LogService.insert_message(db, thread_id, ChatRole.student, body.message)

    user_id = UUID(user["id"])
    passed, details = await ChatService.evaluate_student_rules(
        body.message,
        level.get("student_rules", []),
        db=db,
        user_id=user_id,
        thread_id=thread_id,
    )
    
    # Prepare data for the stream generator
    stream_context = {
        "thread_id": thread_id,
        "course_id": course_id,
        "body_message": body.message,
        "passed": passed,
        "details": details,
        "level": level,
        "user_id": user_id,
    }

    async def event_generator() -> AsyncGenerator[str, None]:
        nonlocal stream_context
        
        thread_id = stream_context["thread_id"]
        body_message = stream_context["body_message"]
        passed = stream_context["passed"]
        details = stream_context["details"]
        level = stream_context["level"]
        course_id = stream_context["course_id"]
        user_id = stream_context["user_id"]
        
        # Acquire a fresh DB connection for operations inside the generator
        # (the dependency-injected connection is released when endpoint returns)
        async with db_module.pool.acquire() as db_conn:
        
            # If student rules check failed, send pedagogical fallback and stop
            if not passed:
                violations = details.get("violations", [])
                
                # Fetch thread_type for fallback generation
                meta_query = """
                    SELECT t.thread_type
                    FROM threads t
                    WHERE t.id = $1
                """
                meta_row = await db_conn.fetchrow(meta_query, thread_id)
                thread_type_val = meta_row["thread_type"] if meta_row else "writing"
                
                # Fetch level_idx
                course_query = """
                    SELECT t.course_id
                    FROM threads t
                    WHERE t.id = $1
                """
                course_row = await db_conn.fetchrow(course_query, thread_id)
                course_id_val = course_row["course_id"] if course_row else None
                
                level_idx_val = 0
                if course_id_val:
                    levels_query = """
                        SELECT writing_level, testing_level, debugging_level
                        FROM courses
                        WHERE id = $1
                    """
                    course_levels = await db_conn.fetchrow(levels_query, course_id_val)
                    if course_levels:
                        if thread_type_val == "writing":
                            level_idx_val = course_levels["writing_level"]
                        elif thread_type_val == "testing":
                            level_idx_val = course_levels["testing_level"]
                        elif thread_type_val == "debugging":
                            level_idx_val = course_levels["debugging_level"]
                
                # Generate pedagogical fallback
                violation_type = FallbackService.infer_violation_type(violations, body_message)
                system_msg = FallbackService.generate_fallback(
                    violation_type=violation_type,
                    thread_type=thread_type_val,
                    level_index=level_idx_val,
                    student_prompt=body_message,
                    violations=violations
                )
                
                system_message_id = await LogService.insert_message(db_conn, thread_id, ChatRole.system, system_msg)
                
                # Check if FALLBACK rules exist in level configuration
                fallback_rules = PromptService.extract_fallback_rules(level)
                has_fallback = len(fallback_rules) > 0
                
                # Emit violation event with metadata for fallback functionality
                yield f"event: violation\ndata: {json.dumps({'has_fallback': has_fallback, 'system_message_id': str(system_message_id), 'original_message': body_message})}\n\n"
                
                # Also emit error event for backward compatibility
                yield f"event: error\ndata: {json.dumps({'message': system_msg})}\n\n"
                yield f"event: done\ndata: {json.dumps({})}\n\n"
                return

            # 2) Get thread topic (set during thread creation)
            thread_topic = await ThreadService.get_thread_topic(db_conn, thread_id)
            
            # 3) Stage 2 — Chat with full prompt architecture (streaming)
            # Build complete system prompt with all layers (using thread topic)
            full_system_prompt = await PromptService.build_full_system_prompt(
                db=db_conn,
                course_id=course_id,
                thread_type=thread_type_val if 'thread_type_val' in locals() else thread_type,
                detected_topic=thread_topic  # Read from thread, not detected on each message
            )
            
            prior_logs: List[MessageLog] = await LogService.get_messages_from_thread(db_conn, thread_id)
            messages: List[MessageEntry] = [
                MessageEntry(role=ChatRole(chat.role), content=chat.message, timestamp=chat.created_at.isoformat())
                for chat in prior_logs
            ]

            # Decide whether to enable file_search for this turn
            # File exploration is available at all levels when explicitly requested
            requires_file_search: bool = bool(details.get("requires_file_search", False))

            vector_store_id: str | None = None
            if requires_file_search:
                from app.services.course_service import CourseService
                vector_store_id = await CourseService.get_vector_store(db_conn, course_id)

            # Stream the response and capture usage
            full_response = ""
            usage_info = {}
            try:
                async for token in ChatService.chat_with_full_prompt_stream(
                    system_prompt=full_system_prompt,
                    messages=messages,
                    vector_store_id=vector_store_id,
                    usage_info=usage_info,
                ):
                    full_response += token
                    yield f"event: token\ndata: {json.dumps({'content': token})}\n\n"

                # Save the complete message to the database and get chat_id
                chat_id = await LogService.insert_message(db_conn, thread_id, ChatRole.assistant, full_response)
                
                # Update thread summary after assistant message
                await ThreadService.update_thread_summary_from_messages(db_conn, thread_id, user_id)
                
                # Log AI event with usage info
                if usage_info:
                    from app.services.ai_events_service import AIEventsService
                    try:
                        await AIEventsService.log_ai_event(
                            db=db_conn,
                            provider="openai",
                            model=usage_info.get('model', 'gpt-5.1'),
                            user_id=user_id,
                            tokens_in=usage_info.get('tokens_in'),
                            tokens_out=usage_info.get('tokens_out'),
                            tokens_total=usage_info.get('tokens_total'),
                            chat_id=chat_id,
                            thread_id=thread_id,
                            purpose="student_chat",
                            response_id=usage_info.get('response_id'),
                        )
                    except Exception as e:
                        print(f"Failed to log AI event for streaming chat: {str(e)}")
            except Exception as e:
                # Log the error and send a pedagogical fallback to the client
                # Use generic fallback for unexpected errors
                error_msg = FallbackService.generate_fallback(
                    violation_type=ViolationType.GENERIC,
                    thread_type=thread_type if 'thread_type' in locals() else "writing",
                    level_index=level.get("index", 0) if level else 0,
                    student_prompt=body_message,
                    violations=[{"rule": 0, "reason": "Internal processing error"}]
                )
                await LogService.insert_message(db_conn, thread_id, ChatRole.system, error_msg)
                yield f"event: error\ndata: {json.dumps({'message': error_msg})}\n\n"
                # Log the actual error for debugging (you might want to use a proper logger)
                print(f"Error in chat stream: {str(e)}")
        
        yield f"event: done\ndata: {json.dumps({})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get(path="/{thread_id}")
async def chat_history(thread_id: UUID, db = Depends(get_db), user: User = Depends(me)) -> List[ChatResponse]:

    # Get course_id from thread and verify access
    course_id = await ThreadService.get_thread_course_id(db, thread_id)
    
    # Check if user owns the thread (student) OR is instructor for the course
    thread_belongs_to_user = await ThreadService.verify_thread_belongs_to_user(db, thread_id, user["id"])
    is_instructor = await UserService.verify_instructor_course(db, course_id, user["id"])
    
    if not thread_belongs_to_user and not is_instructor:
        raise HTTPException(401, "Not authorized to access this thread")
    
    # If not instructor, verify student enrollment
    if not is_instructor:
        if not await EnrollService.verify_student_enrollment(db, course_id, user["id"]):
            raise HTTPException(401, "Not authorized to access this course")

    # fetch message logs from db
    logs: List[MessageLog] = await LogService.get_messages_from_thread(db, thread_id)
    
    # send back a list of chat responses
    return [

        ChatResponse(
            id=chat.id,
            content=chat.message,
            role = chat.role
        )
        for chat in logs
    ]
    

@router.get(path="/{thread_id}/name")
async def get_thread_name_by_id(thread_id: UUID, db = Depends(get_db), user: User = Depends(me)) -> str:

    # Get course_id from thread and verify access
    course_id = await ThreadService.get_thread_course_id(db, thread_id)
    
    # Check if user owns the thread (student) OR is instructor for the course
    thread_belongs_to_user = await ThreadService.verify_thread_belongs_to_user(db, thread_id, user["id"])
    is_instructor = await UserService.verify_instructor_course(db, course_id, user["id"])
    
    if not thread_belongs_to_user and not is_instructor:
        raise HTTPException(401, "Not authorized to access this thread")
    
    # If not instructor, verify student enrollment
    if not is_instructor:
        if not await EnrollService.verify_student_enrollment(db, course_id, user["id"]):
            raise HTTPException(401, "Not authorized to access this course")

    return await ThreadService.get_thread_name_by_id(db, thread_id)


@router.post(path="/feedback")
async def submit_feedback(
    body: ChatFeedbackRequest,
    db: asyncpg.Connection = Depends(get_db),
    user: User = Depends(me)
) -> dict:
    """Submit feedback for a chat message."""
    
    # Get thread_id from chat_id and verify access
    thread_id = await FeedbackService.get_thread_id_from_chat(db, body.chat_id)
    if thread_id is None:
        raise HTTPException(status_code=404, detail="chat message not found")
    
    course_id = await ThreadService.get_thread_course_id(db, thread_id)
    if not await ThreadService.verify_thread_belongs_to_user(db, thread_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this thread")
    if not await EnrollService.verify_student_enrollment(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this course")
    
    # Submit feedback
    try:
        await FeedbackService.submit_feedback(
            db,
            body.chat_id,
            body.thumbs_up,
            body.thumbs_down,
            body.feedback_ceria,
            body.feedback_instructor,
            body.type
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {"success": True}


@router.get(path="/{chat_id}/feedback")
async def get_feedback(
    chat_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
    user: User = Depends(me)
) -> ChatFeedbackResponse:
    """Get feedback for a chat message."""
    
    # Get thread_id from chat_id and verify access
    thread_id = await FeedbackService.get_thread_id_from_chat(db, chat_id)
    if thread_id is None:
        raise HTTPException(status_code=404, detail="chat message not found")
    
    course_id = await ThreadService.get_thread_course_id(db, thread_id)
    if not await ThreadService.verify_thread_belongs_to_user(db, thread_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this thread")
    if not await EnrollService.verify_student_enrollment(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this course")
    
    # Get feedback
    feedback = await FeedbackService.get_feedback(db, chat_id)
    
    if feedback is None:
        return ChatFeedbackResponse(thumbs_up=False, thumbs_down=False, feedback_ceria=None, feedback_instructor=None)
    
    return ChatFeedbackResponse(
        thumbs_up=feedback["thumbs_up"],
        thumbs_down=feedback["thumbs_down"],
        feedback_ceria=feedback["feedback_ceria"],
        feedback_instructor=feedback["feedback_instructor"]
    )


@router.post(path="/fallback")
async def use_fallback(body: ChatFallbackRequest, db: asyncpg.Connection = Depends(get_db), user: User = Depends(me)):
    """Stream fallback response using FALLBACK rules from level configuration."""
    
    thread_id = body.thread_id
    
    # Verify thread access
    course_id = await ThreadService.get_thread_course_id(db, thread_id)
    if not await ThreadService.verify_thread_belongs_to_user(db, thread_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this thread")
    if not await EnrollService.verify_student_enrollment(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this course")
    
    # Get thread metadata and course levels
    meta_query = """
        SELECT t.thread_type, t.course_id
        FROM threads t
        WHERE t.id = $1
    """
    meta_row = await db.fetchrow(meta_query, thread_id)
    if meta_row is None:
        raise HTTPException(status_code=404, detail="thread not found")
    thread_type: ThreadType = meta_row["thread_type"]
    course_id = meta_row["course_id"]
    
    # Get course rules from database
    level = await PromptService.get_course_rules(db, course_id, thread_type)
    
    # Get level_idx for fallback service (may be None for custom rules)
    levels_query = """
        SELECT writing_level, testing_level, debugging_level
        FROM courses
        WHERE id = $1
    """
    course_row = await db.fetchrow(levels_query, course_id)
    if course_row is None:
        raise HTTPException(status_code=404, detail="course not found")
    
    if thread_type == ThreadType.writing:
        level_idx = course_row["writing_level"]
    elif thread_type == ThreadType.testing:
        level_idx = course_row["testing_level"]
    elif thread_type == ThreadType.debugging:
        level_idx = course_row["debugging_level"]
    else:
        raise HTTPException(status_code=400, detail="invalid thread type")
    
    # Extract FALLBACK rules from level (keep for metadata, but don't use in prompt)
    fallback_rules = PromptService.extract_fallback_rules(level)
    
    user_id = UUID(user["id"])
    
    async def event_generator() -> AsyncGenerator[str, None]:
        async with db_module.pool.acquire() as db_conn:
            # Get conversation history, excluding the system message
            prior_logs: List[MessageLog] = await LogService.get_messages_from_thread(db_conn, thread_id)
            messages: List[MessageEntry] = []
            for chat in prior_logs:
                # Skip the system message that triggered the fallback
                if chat.id == body.system_message_id:
                    continue
                # Skip other system messages to avoid polluting context
                if chat.role == ChatRole.system:
                    continue
                messages.append(
                    MessageEntry(role=ChatRole(chat.role), content=chat.message, timestamp=chat.created_at.isoformat())
                )
            
            # Get thread topic for full prompt architecture
            thread_topic = await ThreadService.get_thread_topic(db_conn, thread_id)
            
            # Build full system prompt with all layers
            full_system_prompt = await PromptService.build_full_system_prompt(
                db=db_conn,
                course_id=course_id,
                thread_type=thread_type,
                detected_topic=thread_topic
            )
            
            # Add concise instruction for fallback responses
            full_system_prompt += "\n\nProvide a concise, helpful response (2-3 paragraphs maximum) that guides the student within their level constraints."
            response_rules = level.get("output_rules", [])
            
            # Check if file_search is needed (re-evaluate for the original message)
            passed, details = await ChatService.evaluate_student_rules(
                body.original_message,
                level.get("student_rules", []),
                db=db_conn,
                user_id=user_id,
                thread_id=thread_id,
            )
            requires_file_search: bool = bool(details.get("requires_file_search", False))
            
            vector_store_id: str | None = None
            if requires_file_search:
                from app.services.course_service import CourseService
                vector_store_id = await CourseService.get_vector_store(db_conn, course_id)
            
            # Augment guardrails if file_search is available
            if vector_store_id:
                guardrails += [
                    "Use the file_search tool only when necessary to retrieve exact details from course files.",
                    "When relying on file contents, cite the filename and quote only the minimal relevant snippet.",
                ]
                response_rules += [
                    "If file_search was used, include citations with filename and a minimal quoted snippet.",
                ]
            
            # Stream the response and capture usage
            full_response = ""
            usage_info = {}
            try:
                async for token in ChatService.chat_with_full_prompt_stream(
                    system_prompt=full_system_prompt,
                    messages=messages,
                    vector_store_id=vector_store_id,
                    usage_info=usage_info,
                ):
                    full_response += token
                    yield f"event: token\ndata: {json.dumps({'content': token})}\n\n"
                
                # Evaluate response rules
                resp_passed, resp_details = await ChatService.evaluate_response_rules(
                    body.original_message,
                    full_response,
                    response_rules,
                    db=db_conn,
                    user_id=user_id,
                    thread_id=thread_id,
                )
                
                if not resp_passed:
                    # Build type-aware corrective instructions
                    violations = resp_details.get("violations", [])
                    require_violations = resp_details.get("require_violations", [])
                    deny_violations = resp_details.get("deny_violations", [])
                    
                    corrective_instructions = []
                    if require_violations:
                        req_text = "; ".join(require_violations)
                        corrective_instructions.append(
                            f"Your response is missing REQUIRED elements: {req_text}. Regenerate with these required elements."
                        )
                    if deny_violations:
                        deny_text = "; ".join(deny_violations)
                        corrective_instructions.append(
                            f"Your response included DENIED content: {deny_text}. Regenerate without this forbidden content."
                        )
                    if not corrective_instructions:
                        vtext = "; ".join([f"#{v.get('rule')}: {v.get('reason')}" for v in violations]) or "Unspecified violations"
                        corrective_instructions.append(
                            f"Follow all response rules strictly. Your previous response violated: {vtext}. Revise and answer again."
                        )
                    
                    corrective_prompt = full_system_prompt + "\n\n" + " ".join(corrective_instructions)
                    
                    full_response_retry = ""
                    usage_info_retry = {}
                    async for token in ChatService.chat_with_full_prompt_stream(
                        system_prompt=corrective_prompt,
                        messages=messages,
                        vector_store_id=vector_store_id,
                        usage_info=usage_info_retry,
                    ):
                        full_response_retry += token
                        yield f"event: token\ndata: {json.dumps({'content': token})}\n\n"
                    
                    # Re-evaluate retry response
                    retry_passed, _ = await ChatService.evaluate_response_rules(
                        body.original_message,
                        full_response_retry,
                        response_rules,
                        db=db_conn,
                        user_id=user_id,
                        thread_id=thread_id,
                    )
                    
                    if retry_passed:
                        chat_id = await LogService.insert_message(db_conn, thread_id, ChatRole.assistant, full_response_retry)
                        await ThreadService.update_thread_summary_from_messages(db_conn, thread_id, user_id)
                        
                        # Log AI event with retry usage info
                        if usage_info_retry:
                            from app.services.ai_events_service import AIEventsService
                            try:
                                await AIEventsService.log_ai_event(
                                    db=db_conn,
                                    provider="openai",
                                    model=usage_info_retry.get('model', 'gpt-5.1'),
                                    user_id=user_id,
                                    tokens_in=usage_info_retry.get('tokens_in'),
                                    tokens_out=usage_info_retry.get('tokens_out'),
                                    tokens_total=usage_info_retry.get('tokens_total'),
                                    chat_id=chat_id,
                                    thread_id=thread_id,
                                    purpose="student_chat_fallback",
                                    response_id=usage_info_retry.get('response_id'),
                                )
                            except Exception as e:
                                print(f"Failed to log AI event for fallback retry: {str(e)}")
                    else:
                        # Response validation failed twice - use deterministic fallback
                        violations_retry = resp_details.get("violations", [])
                        violation_type_retry = FallbackService.infer_violation_type(violations_retry, body.original_message)
                        fail_msg = FallbackService.generate_fallback(
                            violation_type=violation_type_retry,
                            thread_type=thread_type,
                            level_index=level_idx,
                            student_prompt=body.original_message,
                            violations=violations_retry
                        )
                        await LogService.insert_message(db_conn, thread_id, ChatRole.system, fail_msg)
                        yield f"event: error\ndata: {json.dumps({'message': fail_msg})}\n\n"
                else:
                    # Success on first attempt
                    chat_id = await LogService.insert_message(db_conn, thread_id, ChatRole.assistant, full_response)
                    await ThreadService.update_thread_summary_from_messages(db_conn, thread_id, user_id)
                    
                    # Log AI event with usage info
                    if usage_info:
                        from app.services.ai_events_service import AIEventsService
                        try:
                            await AIEventsService.log_ai_event(
                                db=db_conn,
                                provider="openai",
                                model=usage_info.get('model', 'gpt-5.1'),
                                user_id=user_id,
                                tokens_in=usage_info.get('tokens_in'),
                                tokens_out=usage_info.get('tokens_out'),
                                tokens_total=usage_info.get('tokens_total'),
                                chat_id=chat_id,
                                thread_id=thread_id,
                                purpose="student_chat_fallback",
                                response_id=usage_info.get('response_id'),
                            )
                        except Exception as e:
                            print(f"Failed to log AI event for fallback: {str(e)}")
            except Exception as e:
                # Log the error and send a pedagogical fallback to the client
                error_msg = FallbackService.generate_fallback(
                    violation_type=ViolationType.GENERIC,
                    thread_type=thread_type,
                    level_index=level_idx,
                    student_prompt=body.original_message,
                    violations=[{"rule": 0, "reason": "Internal processing error"}]
                )
                await LogService.insert_message(db_conn, thread_id, ChatRole.system, error_msg)
                yield f"event: error\ndata: {json.dumps({'message': error_msg})}\n\n"
                print(f"Error in fallback stream: {str(e)}")
        
        yield f"event: done\ndata: {json.dumps({})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
