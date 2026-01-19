from pydantic import BaseModel
from typing import List, Optional
from enum import Enum
from uuid import UUID

class ChatRole(str, Enum):
    student="student"
    assistant="assistant"
    system="system"
    instructor="instructor"

class ChatRequest(BaseModel):
    thread_id: UUID
    message: str

class MessageEntry(BaseModel):
    role: ChatRole
    content: str
    timestamp: str

class ChatResponse(BaseModel):
    id: Optional[UUID] = None
    content: str
    role: ChatRole

class ChatFeedbackRequest(BaseModel):
    chat_id: UUID
    thumbs_up: Optional[bool] = None
    thumbs_down: Optional[bool] = None
    feedback: Optional[str] = None

class ChatFeedbackResponse(BaseModel):
    thumbs_up: bool
    thumbs_down: bool
    feedback: Optional[str] = None
