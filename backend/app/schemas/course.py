from pydantic import BaseModel
from uuid import UUID
from typing import Optional

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
    code: str
    writing_level: int
    testing_level: int
    debugging_level: int

class PatchCourse(BaseModel):
    id: UUID
    name: Optional[str] = None
    code: Optional[str] = None
    writing_level: Optional[int] = None
    testing_level: Optional[int] = None
    debugging_level: Optional[int] = None

class CourseFile(BaseModel):
    id: UUID
    course_id: UUID
    name: str
    supabase_filepath: str
    openai_file_id: str
    size: int    
    mime_type: str

class CourseFileRequest(BaseModel):
    course_id: UUID
    name: str
    supabase_path: str
    openai_file_id: str
    size: int    
    mime_type: str

    