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
from app.services.enroll_service import EnrollService
from app.schemas.user import User
from app.services.topics_service import TopicsService
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
    
    # Determine the appropriate level based on thread_type
    thread_type: ThreadType = body.thread_type
    if thread_type is None:
        thread_type = ThreadType.writing
    
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

    # Detect and store topic for new prompt architecture
    try:
        detected_topic = await TopicsService.detect_topic_from_prompt(
            db=db,
            course_id=course_id,
            student_prompt=body.first_message,
            user_id=user_id,
            thread_id=thread_id
        )
        if detected_topic:
            await ThreadService.set_thread_topic(db, thread_id, detected_topic)
    except Exception as e:
        # Don't fail thread creation if topic detection fails
        print(f"Failed to detect topic for thread {thread_id}: {str(e)}")
    
    # Also classify thread into a tag for backward compatibility
    try:
        topics = await TopicsService.get_topics(db, course_id)
        if topics:
            topic = await TopicsService.classify_thread_to_topic(
                db=db,
                thread_id=thread_id,
                thread_title=new_title,
                first_message=body.first_message,
                topics=topics,
                user_id=user_id,
            )
            if topic:
                await ThreadService.update_thread_tag(db, thread_id, topic)
    except Exception as e:
        # Don't fail thread creation if classification fails
        print(f"Failed to classify thread {thread_id} into topic: {str(e)}")

    # Direct chat (no prompt/rule intervention)
    messages: List[MessageEntry] = [
        MessageEntry(role=ChatRole.student, content=body.first_message, timestamp="")
    ]

    assistant_output: str = await ChatService.chat_direct(
        messages,
        db=db,
        user_id=user_id,
        thread_id=thread_id,
    )
    chat_id = await LogService.insert_message(db, thread_id, ChatRole.assistant, assistant_output)
    await ThreadService.update_thread_summary_from_messages(db, thread_id, user_id)
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
    
    # Determine the appropriate level based on thread_type
    thread_type: ThreadType = body.thread_type
    if thread_type is None:
        thread_type = ThreadType.writing
    
    user_id = UUID(user["id"])

    # Handle title creation (before thread is created, so no thread_id yet)
    new_title: str = await ChatService.create_title(
        body.first_message,
        db=db,
        user_id=user_id,
    )

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

    # Detect and store topic for new prompt architecture
    try:
        detected_topic = await TopicsService.detect_topic_from_prompt(
            db=db,
            course_id=course_id,
            student_prompt=body.first_message,
            user_id=user_id,
            thread_id=thread_id
        )
        if detected_topic:
            await ThreadService.set_thread_topic(db, thread_id, detected_topic)
    except Exception as e:
        # Don't fail thread creation if topic detection fails
        print(f"Failed to detect topic for thread {thread_id}: {str(e)}")
    
    # Also classify thread into a tag for backward compatibility
    try:
        topics = await TopicsService.get_topics(db, course_id)
        if topics:
            topic = await TopicsService.classify_thread_to_topic(
                db=db,
                thread_id=thread_id,
                thread_title=new_title,
                first_message=body.first_message,
                topics=topics,
                user_id=user_id,
            )
            if topic:
                await ThreadService.update_thread_tag(db, thread_id, topic)
    except Exception as e:
        # Don't fail thread creation if classification fails
        print(f"Failed to classify thread {thread_id} into topic: {str(e)}")

    # Store context for the generator
    stream_context = {
        "thread_id": thread_id,
        "first_message": body.first_message,
        "user_id": user_id,
    }

    async def event_generator() -> AsyncGenerator[str, None]:
        nonlocal stream_context
        
        thread_id = stream_context["thread_id"]
        first_message = stream_context["first_message"]
        user_id = stream_context["user_id"]
        
        # Emit thread_created event immediately so frontend can redirect
        yield f"event: thread_created\ndata: {json.dumps({'id': str(thread_id)})}\n\n"

        # Acquire a fresh DB connection for operations inside the generator
        # (the dependency-injected connection is released when endpoint returns)
        async with db_module.pool.acquire() as db_conn:

            # Direct chat (no prompt/rule intervention)
            messages: List[MessageEntry] = [
                MessageEntry(role=ChatRole.student, content=first_message, timestamp="")
            ]

            full_response = ""
            usage_info = {}
            try:
                async for token in ChatService.chat_direct_stream(
                    messages,
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
                        print(f"Failed to log AI event for streaming thread creation: {str(e)}")
            except Exception as e:
                error_msg = "Failed to stream chat response."
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

