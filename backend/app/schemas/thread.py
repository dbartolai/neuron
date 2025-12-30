from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class ChatThread(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    updated_at: datetime
    title: str

class ThreadRequest(BaseModel):
    first_message: str

class CreateThreadResponse(BaseModel):
    id: UUID

class GetThreadResponse(BaseModel):
    id: UUID
    updated_at: datetime
    title: str