from fastapi import APIRouter, Depends, HTTPException
from app.dependencies.db import get_db
from app.dependencies.auth import me
from app.schemas.user import User
from uuid import UUID
from typing import List, Optional
from app.services.course_service import CourseService
from app.schemas.course import NewCourse




router = APIRouter(tags=["instructor"])

@router.get(path="/courses")
async def get_instructor_courses(db = Depends(get_db), user: User = Depends(me)):

    return await CourseService.get_instructor_courses(db, user["id"])

@router.post(path="/courses")
async def new_course(body: NewCourse, db = Depends(get_db), user: User = Depends(me)):

    await CourseService.new_course(db, body, user["id"])