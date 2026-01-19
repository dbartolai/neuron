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
    employee_name: Optional[str]
    instructor_id: Optional[UUID]
    name: str
    email: str
    notes: Optional[str]
    admin_notes: Optional[str]
    purpose: Optional[str]

class InterestRequest(BaseModel):
    name: str
    email: str
    notes: Optional[str]
    purpose: Optional[str]
    timeslot: datetime

class Interaction(BaseModel):
    id: UUID
    created_at: datetime
    type: str
    notes: Optional[str]
    employee_id: Optional[UUID]
    instructor_id: Optional[UUID]
    outreach_id: Optional[int]
    name: Optional[str]

class InteractionRequest(BaseModel):
    type: Optional[str] = "email"
    notes: Optional[str]
    outreach_id: int
    name: Optional[str]

class InteractionUpdate(BaseModel):
    notes: Optional[str] = None
    type: Optional[str] = None

class OutreachUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    role: Optional[str] = None
    purpose: Optional[str] = None

class TimeslotUpdate(BaseModel):
    timeslot: Optional[datetime] = None
    name: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    purpose: Optional[str] = None

class MassTimeslotRequest(BaseModel):
    start_time: datetime
    end_time: datetime

class BatchOutreachDeleteRequest(BaseModel):
    outreach_ids: List[int]

class BatchTimeslotDeleteRequest(BaseModel):
    timeslot_ids: List[int]
