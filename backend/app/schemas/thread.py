from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from enum import Enum
from typing import Optional

class ThreadType(str, Enum):
    writing="writing"
    testing="testing"
    debugging="debugging"

class ChatThread(BaseModel):
    id: UUID
    user_id: UUID
    course_id: UUID
    updated_at: datetime
    title: str
    thread_type: ThreadType

class ThreadRequest(BaseModel):
    first_message: str
    thread_type: Optional[ThreadType]

class CreateThreadResponse(BaseModel):
    id: UUID

class GetThreadResponse(BaseModel):
    id: UUID
    updated_at: datetime
    title: str
    thread_type: Optional[ThreadType]
