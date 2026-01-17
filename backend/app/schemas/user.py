from pydantic import BaseModel
from enum import Enum
from uuid import UUID
from typing import List, Optional
from datetime import datetime

class ProfileRole(str, Enum):
    student="student"
    admin="admin"
    instructor="instructor"

class User(BaseModel):
    id: UUID
    role: ProfileRole
    name: str

class EnrollmentResponse(BaseModel):
    id: UUID
    name: UUID

class Student(BaseModel):
    id: UUID
    name: str
    email: str
    enrolled_at: datetime

class InstructorActivate(BaseModel):
    token: str
    name: str
    password: str
