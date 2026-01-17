from pydantic import BaseModel
from typing import Optional
from enum import Enum
from uuid import UUID
from datetime import datetime

class Outreach(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    notes: Optional[str]
    created_at: datetime
    role: Optional[str]
    inbound: bool

class OutreachRequest(BaseModel):
    email: str
    role: Optional[str]
    notes: Optional[str]
