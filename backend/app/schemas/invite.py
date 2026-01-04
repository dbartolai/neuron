from pydantic import BaseModel
from enum import Enum
from uuid import UUID
from typing import List, Optional
from datetime import datetime


class InviteStatus(str, Enum):
    accepted="accepted"
    expired="expired"
    revoked="revoked"
    pending="pending"

class Invite(BaseModel):
    id: UUID
    email: str
    token_hash: str
    created_by: UUID
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime
    accepted_at: datetime
    accepted_by: UUID
    note: str

class InviteRequest(BaseModel):
    name: str
    email: str
    note: str

class Token(BaseModel):
    raw_token: str

class TokenInfo(BaseModel):
    name: str
    email: str
    status: InviteStatus
    