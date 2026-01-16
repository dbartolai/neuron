from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
from datetime import datetime
from app.dependencies.db import get_db
from app.dependencies.auth import me
from app.schemas.chat import ChatRequest, ChatResponse, ChatRole, MessageEntry
from app.schemas.log import MessageLog
from app.schemas.user import User
from app.services.chat_service import ChatService
from app.services.log_service import LogService
from app.services.thread_service import ThreadService
from uuid import UUID
import asyncpg
from app.schemas.thread import ThreadType
from app.services.prompt_service import PromptService


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

    level = PromptService.get_level(thread_type, level_idx)

    # 1) Stage 1 — Student rules evaluation
    # add user chat to logs
    await LogService.insert_message(db, thread_id, ChatRole.student, body.message)

    passed, details = await ChatService.evaluate_student_rules(body.message, level.get("student_rules", []))
    if not passed:
        violations = details.get("violations", [])
        reasons = "; ".join([f"#{v.get('rule')}: {v.get('reason')}" for v in violations]) or "Does not meet student rules."
        system_msg = (
            f"Your prompt did not pass the current course rules. Please revise and try again.\n"
            f"Violations: {reasons}"
        )
        # Log and return system guidance (as assistant so the UI shows it)
        await LogService.insert_message(db, thread_id, ChatRole.assistant, system_msg)
        return ChatResponse(role=ChatRole.assistant, content=system_msg)

    # 2) Stage 2 — Chat with guardrails
    prior_logs: List[MessageLog] = await LogService.get_messages_from_thread(db, thread_id)
    messages: List[MessageEntry] = [
        MessageEntry(role=ChatRole(chat.role), content=chat.message, timestamp=chat.created_at.isoformat())
        for chat in prior_logs
    ]

    # Decide whether to enable file_search for this turn
    requires_file_search: bool = bool(details.get("requires_file_search", False))

    # ALWAYS ALLOW FILE SEARCH
    allow_file_search: bool = True

    vector_store_id: str | None = None
    if requires_file_search and allow_file_search:
        from app.services.course_service import CourseService  # local import to avoid cycles
        vector_store_id = await CourseService.get_vector_store(db, course_id)

    # Augment guardrails and response rules if file_search is available
    guardrails = list(level.get("guardrails", []))
    response_rules = list(level.get("response_rules", []))
    if vector_store_id:
        guardrails += [
            "5. Use the file_search tool only when necessary to retrieve exact details from course files.",
            "6. When relying on file contents, cite the filename and quote only the minimal relevant snippet.",
        ]
        response_rules += [
            "99. If file_search was used, include citations with filename and a minimal quoted snippet.",
        ]

    assistant_output: str = await ChatService.chat_with_guardrails(messages, guardrails, vector_store_id=vector_store_id)

    # 3) Stage 3 — Response rule evaluation
    resp_passed, resp_details = await ChatService.evaluate_response_rules(body.message, assistant_output, response_rules)

    if not resp_passed:
        violations = resp_details.get("violations", [])
        vtext = "; ".join([f"#{v.get('rule')}: {v.get('reason')}" for v in violations]) or "Unspecified violations"
        corrective_guardrail = [
            f"Follow all response rules strictly. Your previous response violated: {vtext}. Revise and answer again without violating any rules."
        ]
        assistant_output_retry: str = await ChatService.chat_with_guardrails(messages, guardrails + corrective_guardrail, vector_store_id=vector_store_id)
        retry_passed, _ = await ChatService.evaluate_response_rules(body.message, assistant_output_retry, response_rules)
        if retry_passed:
            await LogService.insert_message(db, thread_id, ChatRole.assistant, assistant_output_retry)
            return ChatResponse(role=ChatRole.assistant, content=assistant_output_retry)
        else:
            fail_msg = (
                "I couldn't produce a response that met the course guardrails. "
                "Please rephrase your request with more clarity or contact your instructor to adjust prompts."
            )
            await LogService.insert_message(db, thread_id, ChatRole.assistant, fail_msg)
            return ChatResponse(role=ChatRole.assistant, content=fail_msg)

    # success on first attempt
    await LogService.insert_message(db, thread_id, ChatRole.assistant, assistant_output)
    return StreamingResponse(ChatResponse(role=ChatRole.assistant, content=assistant_output), media_type="text/event-stream")


@router.get(path="/{thread_id}")
async def chat_history(thread_id: UUID, db = Depends(get_db), user: User = Depends(me)) -> List[ChatResponse]:

    # fetch message logs from db
    logs: List[MessageLog] = await LogService.get_messages_from_thread(db, thread_id)
    
    # send back a list of chat responses
    return [

        ChatResponse(
            content=chat.message,
            role = chat.role
        )
        for chat in logs
    ]
    

@router.get(path="/{thread_id}/name")
async def get_thread_name_by_id(thread_id: UUID, db = Depends(get_db), user: User = Depends(me)) -> str:

    return await ThreadService.get_thread_name_by_id(db, thread_id)
