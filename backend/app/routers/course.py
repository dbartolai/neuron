from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from app.schemas.thread import CreateThreadResponse, ThreadRequest, GetThreadResponse, ThreadType
from app.dependencies.db import get_db
from app.dependencies import db as db_module
from app.dependencies.auth import me
from app.services.thread_service import ThreadService
from app.services.chat_service import ChatService
from app.services.course_service import CourseService
from app.services.log_service import LogService
from app.services.prompt_service import PromptService
from app.services.enroll_service import EnrollService
from app.dependencies.levels import GLOBAL_INVARIANTS
from app.schemas.user import User
from app.schemas.course import CoursePolicy
from app.schemas.chat import ChatRole, ChatResponse, MessageEntry
from uuid import UUID
from typing import List, Optional, AsyncGenerator
import json
 


router = APIRouter(tags=["courses"])

@router.get(path="/{course_id}/access")
async def get_course_access(course_id: UUID, db = Depends(get_db), user: User = Depends(me)) -> bool:
    
    return await CourseService.verify_access(db, course_id, user["id"])


@router.post(path="/{course_id}/thread", response_model=CreateThreadResponse, status_code=201)
async def create_course_thread(course_id: UUID, body: ThreadRequest, db = Depends(get_db), user: User = Depends(me)) -> Optional[UUID]:
    
    # Verify student enrollment
    if not await EnrollService.verify_student_enrollment(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this course")
    
    # Fetch course levels from database
    levels_query = """
        SELECT writing_level, testing_level, debugging_level
        FROM courses
        WHERE id = $1
    """
    course_row = await db.fetchrow(levels_query, course_id)
    if course_row is None:
        raise HTTPException(status_code=404, detail="course not found")

    # Determine the appropriate level based on thread_type
    thread_type: ThreadType = body.thread_type
    if thread_type is None:
        thread_type = ThreadType.writing
    if thread_type == ThreadType.writing:
        level_idx = course_row["writing_level"]
    elif thread_type == ThreadType.testing:
        level_idx = course_row["testing_level"]
    elif thread_type == ThreadType.debugging:
        level_idx = course_row["debugging_level"]
    else:
        raise HTTPException(status_code=400, detail="invalid thread type")

    level = PromptService.get_level(thread_type, level_idx)

    user_id = UUID(user["id"])

    # Handle title creation (before thread is created, so no thread_id yet)
    new_title: str = await ChatService.create_title(
        body.first_message,
        db=db,
        user_id=user_id,
    )

    # Create new thread with title
    thread_id = await ThreadService.create_thread_in_course(db, course_id=course_id, user_id=user["id"], thread_name=new_title, thread_type=body.thread_type)

    # Add first message to logs
    await LogService.insert_message(db, thread_id, ChatRole.student, body.first_message)

    # Stage 1: Student rules evaluation
    passed, details = await ChatService.evaluate_student_rules(
        body.first_message,
        level.get("student_rules", []),
        db=db,
        user_id=user_id,
        thread_id=thread_id,
    )
    if not passed:
        violations = details.get("violations", [])
        reasons = "; ".join([f"#{v.get('rule')}: {v.get('reason')}" for v in violations]) or "Does not meet student rules."
        system_msg = (
            f"Your prompt did not pass the current course rules. Please revise and try again.\n"
            f"Violations: {reasons}"
        )
        await LogService.insert_message(db, thread_id, ChatRole.assistant, system_msg)
        return {"id": thread_id}

    # Stage 2: Chat with guardrails
    messages: List[MessageEntry] = [
        MessageEntry(role=ChatRole.student, content=body.first_message, timestamp="")
    ]

    # Check if file_search is required and get vector store if available
    # File exploration is available at all levels when explicitly requested
    requires_file_search: bool = bool(details.get("requires_file_search", False))

    vector_store_id: str | None = None
    if requires_file_search:
        vector_store_id = await CourseService.get_vector_store(db, course_id)

    # Build guardrails with global invariants prepended
    guardrails = list(GLOBAL_INVARIANTS) + list(level.get("guardrails", []))
    response_rules = list(level.get("response_rules", []))
    
    # Augment guardrails and response rules if file_search is available
    if vector_store_id:
        guardrails += [
            "Use the file_search tool only when necessary to retrieve exact details from course files.",
            "When relying on file contents, cite the filename and quote only the minimal relevant snippet.",
        ]
        response_rules += [
            "If file_search was used, include citations with filename and a minimal quoted snippet.",
        ]

    assistant_output: str = await ChatService.chat_with_guardrails(
        messages,
        guardrails,
        vector_store_id=vector_store_id,
        db=db,
        user_id=user_id,
        thread_id=thread_id,
    )

    # Stage 3: Response rule evaluation
    resp_passed, resp_details = await ChatService.evaluate_response_rules(
        body.first_message,
        assistant_output,
        response_rules,
        db=db,
        user_id=user_id,
        thread_id=thread_id,
    )

    if not resp_passed:
        violations = resp_details.get("violations", [])
        vtext = "; ".join([f"#{v.get('rule')}: {v.get('reason')}" for v in violations]) or "Unspecified violations"
        corrective_guardrail = [
            f"Follow all response rules strictly. Your previous response violated: {vtext}. Revise and answer again without violating any rules."
        ]
        assistant_output_retry: str = await ChatService.chat_with_guardrails(
            messages,
            guardrails + corrective_guardrail,
            vector_store_id=vector_store_id,
            db=db,
            user_id=user_id,
            thread_id=thread_id,
        )
        retry_passed, _ = await ChatService.evaluate_response_rules(
            body.first_message,
            assistant_output_retry,
            response_rules,
            db=db,
            user_id=user_id,
            thread_id=thread_id,
        )
        if retry_passed:
            chat_id = await LogService.insert_message(db, thread_id, ChatRole.assistant, assistant_output_retry)
            return {"id": thread_id}
        else:
            fail_msg = (
                "I couldn't produce a response that met the course guardrails. "
                "Please rephrase your request with more clarity or contact your instructor to adjust prompts."
            )
            await LogService.insert_message(db, thread_id, ChatRole.assistant, fail_msg)
            return {"id": thread_id}

    # Success on first attempt
    chat_id = await LogService.insert_message(db, thread_id, ChatRole.assistant, assistant_output)
    return {"id": thread_id}


@router.post(path="/{course_id}/thread/stream")
async def create_course_thread_stream(course_id: UUID, body: ThreadRequest, db = Depends(get_db), user: User = Depends(me)):
    """Create a new thread and stream the AI response via Server-Sent Events (SSE).
    
    Emits:
    - thread_created: {id: string} - Immediately after thread creation
    - token: {content: string} - Each token from OpenAI
    - error: {message: string} - If an error occurs
    - done: {} - When streaming is complete
    """
    
    # Verify student enrollment
    if not await EnrollService.verify_student_enrollment(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this course")
    
    # Fetch course levels from database
    levels_query = """
        SELECT writing_level, testing_level, debugging_level
        FROM courses
        WHERE id = $1
    """
    course_row = await db.fetchrow(levels_query, course_id)
    if course_row is None:
        raise HTTPException(status_code=404, detail="course not found")

    # Determine the appropriate level based on thread_type
    thread_type: ThreadType = body.thread_type
    if thread_type is None:
        thread_type = ThreadType.writing
    if thread_type == ThreadType.writing:
        level_idx = course_row["writing_level"]
    elif thread_type == ThreadType.testing:
        level_idx = course_row["testing_level"]
    elif thread_type == ThreadType.debugging:
        level_idx = course_row["debugging_level"]
    else:
        raise HTTPException(status_code=400, detail="invalid thread type")

    level = PromptService.get_level(thread_type, level_idx)

    # Handle title creation
    new_title: str = await ChatService.create_title(body.first_message)

    # Create new thread with title
    thread_id = await ThreadService.create_thread_in_course(
        db, 
        course_id=course_id, 
        user_id=user["id"], 
        thread_name=new_title, 
        thread_type=body.thread_type
    )

    # Add first message to logs
    await LogService.insert_message(db, thread_id, ChatRole.student, body.first_message)

    user_id = UUID(user["id"])

    # Stage 1: Student rules evaluation
    passed, details = await ChatService.evaluate_student_rules(body.first_message, level.get("student_rules", []))

    # Store context for the generator
    stream_context = {
        "thread_id": thread_id,
        "course_id": course_id,
        "first_message": body.first_message,
        "passed": passed,
        "details": details,
        "level": level,
        "user_id": user_id,
    }

    async def event_generator() -> AsyncGenerator[str, None]:
        nonlocal stream_context
        
        thread_id = stream_context["thread_id"]
        first_message = stream_context["first_message"]
        passed = stream_context["passed"]
        details = stream_context["details"]
        level = stream_context["level"]
        course_id = stream_context["course_id"]
        user_id = stream_context["user_id"]
        
        # Emit thread_created event immediately so frontend can redirect
        yield f"event: thread_created\ndata: {json.dumps({'id': str(thread_id)})}\n\n"

        # Acquire a fresh DB connection for operations inside the generator
        # (the dependency-injected connection is released when endpoint returns)
        async with db_module.pool.acquire() as db_conn:

            # If student rules check failed, send error message as tokens then done
            if not passed:
                violations = details.get("violations", [])
                reasons = "; ".join([f"#{v.get('rule')}: {v.get('reason')}" for v in violations]) or "Does not meet student rules."
                system_msg = (
                    f"Your prompt did not pass the current course rules. Please revise and try again.\n"
                    f"Violations: {reasons}"
                )
                await LogService.insert_message(db_conn, thread_id, ChatRole.assistant, system_msg)
                # Send the error message as tokens so it displays in the chat
                yield f"event: token\ndata: {json.dumps({'content': system_msg})}\n\n"
                yield f"event: done\ndata: {json.dumps({})}\n\n"
                return

            # Stage 2: Chat with guardrails (streaming)
            messages: List[MessageEntry] = [
                MessageEntry(role=ChatRole.student, content=first_message, timestamp="")
            ]

            # Check if file_search is required and get vector store if available
            # File exploration is available at all levels when explicitly requested
            requires_file_search: bool = bool(details.get("requires_file_search", False))

            vector_store_id: str | None = None
            if requires_file_search:
                vector_store_id = await CourseService.get_vector_store(db_conn, course_id)

            # Build guardrails with global invariants prepended
            guardrails = list(GLOBAL_INVARIANTS) + list(level.get("guardrails", []))
            
            # Augment guardrails if file_search is available
            if vector_store_id:
                guardrails += [
                    "Use the file_search tool only when necessary to retrieve exact details from course files.",
                    "When relying on file contents, cite the filename and quote only the minimal relevant snippet.",
                ]

            # Stream the response and capture usage
            full_response = ""
            usage_info = {}
            try:
                async for token in ChatService.chat_with_guardrails_stream(
                    messages,
                    guardrails,
                    vector_store_id=vector_store_id,
                    usage_info=usage_info,
                ):
                    full_response += token
                    yield f"event: token\ndata: {json.dumps({'content': token})}\n\n"

                # Save the complete message to the database and get chat_id
                chat_id = await LogService.insert_message(db_conn, thread_id, ChatRole.assistant, full_response)
                
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
                        )
                    except Exception as e:
                        print(f"Failed to log AI event for streaming thread creation: {str(e)}")
            except Exception as e:
                # Log the error and send an error event to the client
                error_msg = f"An error occurred while processing your request. Please try again or contact support if the issue persists."
                await LogService.insert_message(db_conn, thread_id, ChatRole.system, error_msg)
                yield f"event: error\ndata: {json.dumps({'message': error_msg})}\n\n"
                print(f"Error in thread stream: {str(e)}")
        
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


@router.get(path="/{course_id}/threads", response_model=List[GetThreadResponse])
async def get_course_threads(course_id: UUID, db = Depends(get_db), user: User = Depends(me)) -> List[UUID]:

    # Verify student enrollment
    if not await EnrollService.verify_student_enrollment(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this course")

    return await ThreadService.get_thread_ids_by_course(db, course_id, user["id"])


@router.get(path="/{course_id}/name")
async def get_course_name(course_id: UUID, db = Depends(get_db), user: User = Depends(me)) -> str:

    # Verify student enrollment
    if not await EnrollService.verify_student_enrollment(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this course")

    return await CourseService.get_course_name_by_id(db, course_id)

@router.get(path="/{course_id}/policy")
async def get_course_policy(course_id: UUID, db = Depends(get_db), user: User = Depends(me)) -> CoursePolicy:

    # Verify student enrollment
    if not await EnrollService.verify_student_enrollment(db, course_id, user["id"]):
        raise HTTPException(401, "Not authorized to access this course")

    return await CourseService.get_course_policy(db, course_id)

