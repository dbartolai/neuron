"""Schemas for course rules management."""

from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional, Dict, Any
from enum import Enum
from app.schemas.thread import ThreadType


class RuleType(str, Enum):
    """Rule type enum."""
    REQUEST = "REQUEST"
    REQUIRE = "REQUIRE"
    DENY = "DENY"
    ALLOW = "ALLOW"


class RuleObject(BaseModel):
    """Individual rule object structure."""
    type: RuleType
    content: str


class CourseRulesRequest(BaseModel):
    """Request schema for creating/updating course rules."""
    goals: Optional[List[str]] = None
    prompt_rules: Optional[List[RuleObject]] = None
    output_rules: Optional[List[RuleObject]] = None
    fallback_prompt: Optional[str] = None
    outputs: Optional[List[str]] = None
    version_num: Optional[int] = None


class CourseRulesResponse(BaseModel):
    """Response schema for course rules."""
    id: UUID
    goals: Optional[List[str]] = None
    prompt_rules: Optional[List[Dict[str, Any]]] = None
    output_rules: Optional[List[Dict[str, Any]]] = None
    fallback_prompt: Optional[str] = None
    outputs: Optional[List[str]] = None
    version_num: Optional[int] = None
    course_id: Optional[UUID] = None
    rule_type: Optional[ThreadType] = None


class ResetRulesRequest(BaseModel):
    """Request schema for resetting rules to default."""
    level: int


class LevelDefaultResponse(BaseModel):
    """Response schema for level default rules."""
    level_idx: int
    id: UUID
    goals: Optional[List[str]] = None
    prompt_rules: Optional[List[Dict[str, Any]]] = None
    output_rules: Optional[List[Dict[str, Any]]] = None
    fallback_prompt: Optional[str] = None
    outputs: Optional[List[str]] = None
    version_num: Optional[int] = None
    course_id: Optional[UUID] = None
    rule_type: Optional[ThreadType] = None
