from pydantic import BaseModel
from datetime import datetime

class MessageLog(BaseModel):
    id: int
    thread_id: str
    role: bool
    message: str
    created_at: datetime
