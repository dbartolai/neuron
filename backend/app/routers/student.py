from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.db import get_db
from app.dependencies.auth import me
from app.services.thread_service import ThreadService
from app.services.course_service import CourseService
from app.services.enroll_service import EnrollService
from app.schemas.sidebar import SidebarCourse
from app.schemas.course import UserCourse, EnrollRequest
from app.schemas.thread import UpdateThreadNameRequest
from app.schemas.user import User
from uuid import UUID
from typing import List, Optional
 


router = APIRouter(tags=["student"])

@router.get(path="/sidebar", tags=["sidebar"])
async def get_student_sidebar(db = Depends(get_db), user: User = Depends(me)):

    courses: List[UserCourse] = await CourseService.get_student_courses(db, user["id"])

    res: List[SidebarCourse] = []

    for c in courses:

        course_id = c.id

        thread_count = await ThreadService.get_thread_count_by_course(db, course_id, user["id"])
        thread_preview = await ThreadService.get_thread_preview_by_course(db, course_id, user["id"])

        sidebar_course = SidebarCourse(
            id=course_id,
            name=c.name,
            thread_count=thread_count,
            thread_preview=thread_preview,
        )        
        
    
        res.append(sidebar_course)
        
    return res

@router.post(path="/enroll", tags=["enroll"])
async def enroll_student( body: EnrollRequest, db = Depends(get_db), user: User = Depends(me)):

    print("Starting to enroll")

    print("ENROLLING:", body.code)

    course_id: UUID = await CourseService.get_id_from_code(db, body.code)

    print("ENROLLING:", course_id)
    print("USER:", user["id"])

    await EnrollService.enroll_student(db, user["id"], course_id)

    return {"course_id": course_id}

@router.patch(path="/threads/{thread_id}/name", tags=["threads"])
async def update_thread_name(
    thread_id: UUID,
    body: UpdateThreadNameRequest,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Update a thread's name. Verifies thread belongs to user."""
    await ThreadService.update_thread_name(db, thread_id, user["id"], body.title)
    return {"thread_id": str(thread_id), "title": body.title}

@router.patch(path="/threads/{thread_id}/delete", tags=["threads"])
async def delete_thread(
    thread_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Soft delete a thread by setting deleted = true. Verifies thread belongs to user."""
    await ThreadService.soft_delete_thread(db, thread_id, user["id"])
    return {"thread_id": str(thread_id), "deleted": True}

