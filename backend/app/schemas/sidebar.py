from pydantic import BaseModel
from uuid import UUID
from typing import List
from app.schemas.thread import GetThreadResponse


class SidebarCourse(BaseModel):
    id: UUID
    name: str
    thread_count: int
    thread_preview: List[GetThreadResponse]
    