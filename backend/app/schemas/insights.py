from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional

class InsightsStatus(BaseModel):
    total_threads: int
    is_unlocked: bool
    thread_tags: Optional[List[str]] = None

class TagStatistics(BaseModel):
    tag: str
    count: int
    percentage: float

class UpdateTagsRequest(BaseModel):
    tags: List[str]
    reclassify: bool = False

class UpdateThreadTagRequest(BaseModel):
    tag: str

class ThreadWithTag(BaseModel):
    id: UUID
    title: str
    thread_tag: Optional[str] = None
