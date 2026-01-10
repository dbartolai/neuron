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
    writing_level: int
    testing_level: int
    debugging_level: int

class CoursePolicy(BaseModel):
    name: str
    writing_level: int
    testing_level: int
    debugging_level: int
