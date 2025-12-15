from pydantic import BaseModel
from typing import List, Optional


class ChatRequest(BaseModel):
    thread_name: str
    assignment_id: str
    message: str

class MessageEntry(BaseModel):
    role: bool
    content: str
    timestamp: str

class ChatResponse(BaseModel):
    reply: str
    role: bool
