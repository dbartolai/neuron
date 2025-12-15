from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.dependencies.db import get_db
from app.dependencies.auth import me
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.log import MessageLog
from app.services.chat_service import ChatService
from app.services.log_service import LogService
from app.services.thread_service import ThreadService


router = APIRouter(prefix="/chat", tags=["chat"])

@router.post(path="/",response_model=ChatResponse)
async def send_chat(body: ChatRequest, db = Depends(get_db), user = Depends(me)) -> ChatResponse:

    # get thread id via the name
    thread_id: str = ThreadService.get_thread_id(db, body.thread_name)

    # get context from recent messages in the same thread
    logs: List[MessageLog] = LogService.get_messages_from_thread(db, body.thread_id)
    context: str = ChatService.summarize_context(logs)

    # add user chat to logs
    LogService.insert_message(db, body.thread_id, True)    

    # call open ai api to complete chat
    input: str = " Previous Chats: \n" + context + "\n Message: \n" + body.message
    output: str = ChatService.send_message(input)

    # add chatbot response to logs
    LogService.insert_message(db, body.thread_id, False, output)

    # send response to frontend 
    return ChatResponse(
        role = False,
        reply = output
    )


@router.get(path="/")
async def chat_history(thread_id: str, db = Depends(get_db), user = Depends(me)) -> List[ChatResponse]:

    # fetch message logs from db
    logs: List[MessageLog] = LogService.get_messages_from_thread(db, thread_id)
    
    # send back a list of chat responses
    return [

        ChatResponse(
            reply=chat.message,
            role = chat.role
        )
        for chat in logs
    ]
    