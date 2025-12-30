from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.dependencies.db import get_db
from app.dependencies.auth import me
from app.schemas.chat import ChatRequest, ChatResponse, ChatRole
from app.schemas.log import MessageLog
from app.schemas.user import User
from app.services.chat_service import ChatService
from app.services.log_service import LogService
from app.services.thread_service import ThreadService
from uuid import UUID


router = APIRouter(tags=["chat"])

@router.post(path="/",response_model=ChatResponse)
async def send_chat(body: ChatRequest, db = Depends(get_db), user: User = Depends(me)) -> ChatResponse:

    # get thread id via the body
    thread_id: UUID = body.thread_id

    # get context from recent messages in the same thread
    logs: List[MessageLog] = await LogService.get_messages_from_thread(db, thread_id)
    context: str = await ChatService.summarize_context(logs)

    # add user chat to logs
    await LogService.insert_message(db, thread_id, ChatRole.student, body.message)    

    # call open ai api to complete chat
    input: str = " Previous Chats: \n" + context + "\n Message: \n" + body.message
    output: str = await ChatService.send_message(input)

    # add chatbot response to logs
    await LogService.insert_message(db, body.thread_id, ChatRole.assistant, output)

    # send response to frontend 
    return ChatResponse(
        role = ChatRole.assistant,
        content = output
    )


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