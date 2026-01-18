from pydantic import BaseModel
from typing import Optional, List
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
    role: str
    purpose: Optional[str]

class OutreachRequest(BaseModel):
    name: Optional[str]
    email: str
    notes: Optional[str]
    role: str
    purpose: str


class SchedulerRequest(BaseModel):
    timeslot: datetime
    employee_id: UUID

class BatchTimeslotRequest(BaseModel):
    timeslots: List[datetime]

class BookTimeslotRequest(BaseModel):
    timeslot_id: int
    name: str
    email: str
    notes: Optional[str] = None
    purpose: Optional[str] = None

class SchedulerResponse(BaseModel):
    id: int
    created_at: datetime
    timeslot: datetime
    employee_id: UUID
    instructor_id: Optional[UUID]
    name: str
    email: str
    notes: Optional[str]
    purpose: Optional[str]

class InterestRequest(BaseModel):
    name: str
    email: str
    notes: Optional[str]
    purpose: Optional[str]
    timeslot: datetime
