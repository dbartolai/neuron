from pydantic import BaseModel
from uuid import UUID

class UserCourse(BaseModel):
    id: UUID
    name: str
    code: str
    instructor_id: UUID

class EnrollRequest(BaseModel):
    code: str
    
    
class NewCourse(BaseModel):
    name: str
    code: str
    allow_code_in: bool = False
    allow_code_out: bool = False
    allow_pseudocode_out: bool = False
    guardrail_level: int = 1

class CoursePolicy(BaseModel):
    name: str
    allow_code_in: bool
    allow_code_out: bool
    allow_pseudocode_out: bool
    guardrail_level: int
