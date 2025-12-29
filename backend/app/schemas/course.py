from pydantic import BaseModel
from uuid import UUID

class UserCourse(BaseModel):
    id: UUID
    name: str
    code: str
    instructor: str
    
    
