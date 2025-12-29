from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.thread import CreateThreadResponse, ThreadRequest, GetThreadResponse
from app.dependencies.db import get_db
from app.dependencies.auth import me
from app.services.thread_service import ThreadService
from app.services.course_service import CourseService
from app.schemas.sidebar import SidebarCourse
from app.schemas.course import UserCourse
from app.schemas.user import User
from uuid import UUID
from typing import List, Optional
 


router = APIRouter(prefix="/user", tags=["user"])

@router.get(path="/sidebar", tags=["sidebar"])
async def get_user_sidebar(db = Depends(get_db), user: User = Depends(me)):

    courses: List[UserCourse] = await CourseService.get_student_courses(db, user.id)

    res: List[SidebarCourse] = []

    for c in courses:

        sidebar_course = SidebarCourse()

        course_id = c.id
        sidebar_course.id = course_id
        sidebar_course.name = c.name

        sidebar_course.thread_count = ThreadService.get_thread_count_by_course(db, course_id, user.id)
        sidebar_course.thread_preview = ThreadService.get_thread_preview_by_course(db, course_id, user.id)
    
        res.append(sidebar_course)
        
    return res
