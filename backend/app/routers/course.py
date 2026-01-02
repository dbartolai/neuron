from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.thread import CreateThreadResponse, ThreadRequest, GetThreadResponse
from app.dependencies.db import get_db
from app.dependencies.auth import me
from app.services.thread_service import ThreadService
from app.services.chat_service import ChatService
from app.services.course_service import CourseService
from app.services.log_service import LogService
from app.schemas.user import User
from uuid import UUID
from typing import List, Optional
from app.schemas.chat import ChatRole
 


router = APIRouter(tags=["courses"])


@router.post(path="/{course_id}/thread", response_model=CreateThreadResponse, status_code=201)
async def create_course_thread(course_id: UUID, body: ThreadRequest, db = Depends(get_db), user: User = Depends(me)) -> Optional[UUID]:

    print("CREATING THREAD:")
    
    # handle title creation
    new_title: str = await ChatService.create_title(body.first_message)

    # create new thread with title
    thread_id = await ThreadService.create_thread_in_course(db, course_id=course_id, user_id=user["id"], thread_name=new_title)

    # add first message to logs
    await LogService.insert_message(db, thread_id, ChatRole.student, body.first_message)
    
    # send first message in thread
    response: str = await ChatService.send_message(body.first_message)

    # add response to logs
    await LogService.insert_message(db, thread_id, ChatRole.assistant, response)

    return {"id": thread_id}


@router.get(path="/{course_id}/threads", response_model=List[GetThreadResponse])
async def get_course_threads(course_id: UUID, db = Depends(get_db), user: User = Depends(me)) -> List[UUID]:

    return await ThreadService.get_thread_ids_by_course(db, course_id, user["id"])


@router.get(path="/{course_id}/name")
async def get_course_name(course_id: UUID, db = Depends(get_db), user: User = Depends(me)) -> str:

    return await CourseService.get_course_name_by_id(db, course_id)

@router.get(path="/{course_id}/policy")
async def get_course_policy(course_id: UUID, db = Depends(get_db), user: User = Depends(me)) -> str:

    return await CourseService.get_course_policy(db, course_id)

