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
    content: str
    role: ChatRole
