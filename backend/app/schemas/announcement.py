from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List
from datetime import datetime
from app.schemas.course import CourseFile

class AnnouncementRequest(BaseModel):
    title: str
    content: str
    file_ids: Optional[List[UUID]] = None

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    file_ids: Optional[List[UUID]] = None

class Announcement(BaseModel):
    id: UUID
    course_id: UUID
    instructor_id: UUID
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
    files: Optional[List[CourseFile]] = None

class AnnouncementReaction(BaseModel):
    id: UUID
    announcement_id: UUID
    student_id: UUID
    reaction_type: str
    created_at: datetime

class ReactionCounts(BaseModel):
    thumbs_up: int = 0
    thumbs_down: int = 0
    question: int = 0
    exclamation: int = 0
    celebration: int = 0

class ReactionRequest(BaseModel):
    reaction_type: str

class ReactionResponse(BaseModel):
    counts: ReactionCounts
    user_reaction: Optional[str] = None

class UnseenCountResponse(BaseModel):
    count: int
