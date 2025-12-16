from pydantic import BaseModel
from datetime import datetime
from app.schemas.chat import ChatRole
from uuid import UUID

class MessageLog(BaseModel):
    id: UUID
    thread_id: UUID
    role: ChatRole
    message: str
    created_at: datetime
