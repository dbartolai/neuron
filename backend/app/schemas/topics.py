from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional


class TopicResponse(BaseModel):
    name: str
    count: Optional[int] = None


class TopicsListResponse(BaseModel):
    topics: List[str]


class CreateTopicRequest(BaseModel):
    name: str


class UpdateTopicRequest(BaseModel):
    old_name: str
    new_name: str


class DeleteTopicRequest(BaseModel):
    name: str


class GenerateFromSyllabusRequest(BaseModel):
    file_id: UUID


class GenerateFromSyllabusResponse(BaseModel):
    suggested_topics: List[str]


class ReclassifyThreadsResponse(BaseModel):
    classified: int
    failed: int
    total: int
