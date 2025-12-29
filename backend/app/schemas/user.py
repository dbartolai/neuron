from pydantic import BaseModel
from enum import Enum
from uuid import UUID
from typing import List

class ProfileRole(str, Enum):
    student="student"
    admin="admin"
    instructor="instructor"

class User(BaseModel):
    id: UUID
    role: ProfileRole
    name: str
