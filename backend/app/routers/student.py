from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.db import get_db
from app.dependencies.auth import me
from app.services.thread_service import ThreadService
from app.services.course_service import CourseService
from app.services.enroll_service import EnrollService
from app.services.announcement_service import AnnouncementService
from app.schemas.sidebar import SidebarCourse
from app.schemas.course import UserCourse, EnrollRequest
from app.schemas.thread import UpdateThreadNameRequest
from app.schemas.announcement import ReactionRequest, UnseenCountResponse
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

@router.get(path="/courses/{course_id}/announcements", tags=["announcements"])
async def get_course_announcements(
    course_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Get all announcements for a course (read-only for students)."""
    # Verify student is enrolled in course
    if not await CourseService.verify_access(db, course_id, user["id"]):
        raise HTTPException(status_code=401, detail="Not authorized to view announcements for this course")
    
    return await AnnouncementService.get_announcements_by_course(db, course_id)

@router.get(path="/announcements/{announcement_id}", tags=["announcements"])
async def get_announcement(
    announcement_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Get a single announcement."""
    announcement = await AnnouncementService.get_announcement(db, announcement_id)
    
    # Verify student is enrolled in course
    if not await CourseService.verify_access(db, announcement.course_id, user["id"]):
        raise HTTPException(status_code=401, detail="Not authorized to view this announcement")
    
    return announcement

@router.post(path="/announcements/{announcement_id}/reactions", tags=["announcements"])
async def add_reaction(
    announcement_id: UUID,
    body: ReactionRequest,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Add or update a reaction to an announcement."""
    announcement = await AnnouncementService.get_announcement(db, announcement_id)
    
    # Verify student is enrolled in course
    if not await CourseService.verify_access(db, announcement.course_id, user["id"]):
        raise HTTPException(status_code=401, detail="Not authorized to react to this announcement")
    
    await AnnouncementService.add_reaction(db, announcement_id, user["id"], body.reaction_type)
    return {"success": True}

@router.delete(path="/announcements/{announcement_id}/reactions", tags=["announcements"])
async def remove_reaction(
    announcement_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Remove a reaction from an announcement."""
    announcement = await AnnouncementService.get_announcement(db, announcement_id)
    
    # Verify student is enrolled in course
    if not await CourseService.verify_access(db, announcement.course_id, user["id"]):
        raise HTTPException(status_code=401, detail="Not authorized to react to this announcement")
    
    await AnnouncementService.remove_reaction(db, announcement_id, user["id"])
    return {"success": True}

@router.get(path="/announcements/{announcement_id}/reactions", tags=["announcements"])
async def get_reactions(
    announcement_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Get reaction counts and user's current reaction."""
    announcement = await AnnouncementService.get_announcement(db, announcement_id)
    
    # Verify student is enrolled in course
    if not await CourseService.verify_access(db, announcement.course_id, user["id"]):
        raise HTTPException(status_code=401, detail="Not authorized to view reactions for this announcement")
    
    return await AnnouncementService.get_reaction_response(db, announcement_id, user["id"])

@router.post(path="/announcements/{announcement_id}/seen", tags=["announcements"])
async def mark_announcement_seen(
    announcement_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Mark an announcement as seen by the current student."""
    announcement = await AnnouncementService.get_announcement(db, announcement_id)
    
    # Verify student is enrolled in course
    if not await CourseService.verify_access(db, announcement.course_id, user["id"]):
        raise HTTPException(status_code=401, detail="Not authorized to mark this announcement as seen")
    
    await AnnouncementService.mark_announcement_seen(db, announcement_id, user["id"])
    return {"success": True}

@router.post(path="/courses/{course_id}/announcements/seen", tags=["announcements"])
async def mark_all_announcements_seen(
    course_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Mark all announcements in a course as seen for the current student."""
    # Verify student is enrolled in course
    if not await CourseService.verify_access(db, course_id, user["id"]):
        raise HTTPException(status_code=401, detail="Not authorized to mark announcements as seen for this course")
    
    await AnnouncementService.mark_all_course_announcements_seen(db, course_id, user["id"])
    return {"success": True}

@router.get(path="/courses/{course_id}/announcements/unseen-count", tags=["announcements"])
async def get_unseen_count(
    course_id: UUID,
    db = Depends(get_db),
    user: User = Depends(me)
):
    """Get count of unseen announcements for the current student in a course."""
    # Verify student is enrolled in course
    if not await CourseService.verify_access(db, course_id, user["id"]):
        raise HTTPException(status_code=401, detail="Not authorized to view unseen count for this course")
    
    count = await AnnouncementService.get_unseen_count(db, course_id, user["id"])
    return UnseenCountResponse(count=count)

