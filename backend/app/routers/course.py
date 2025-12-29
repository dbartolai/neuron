from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.thread import CreateThreadResponse, ThreadRequest, GetThreadResponse
from app.dependencies.db import get_db
from app.dependencies.auth import me
from app.services.thread_service import ThreadService
from app.schemas.user import User
from uuid import UUID
from typing import List, Optional
 


router = APIRouter(prefix="/courses", tags=["courses"])


@router.post(path="/{course_id}/threads", response_model=CreateThreadResponse, status_code=201)
async def create_course_thread(course_id: UUID, body: ThreadRequest, db = Depends(get_db), user: User = Depends(me)) -> Optional[UUID]:
    
    thread_id = await ThreadService.create_thread_in_course(db, course_id=course_id, user_id=user.id, thread_name=body.title)
    return {"id": thread_id}


@router.get(path="/{course_id}/threads", response_model=List[GetThreadResponse])
async def get_course_threads(course_id: UUID, db = Depends(get_db), user: User = Depends(me)) -> List[UUID]:

    return await ThreadService.get_thread_ids_by_course(db, course_id, user.id)


