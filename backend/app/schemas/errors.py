"""Typed error types for the chat pipeline.

These flow through the LangGraph state and are serialized
as SSE events to the frontend.
"""

from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel


class ErrorCategory(str, Enum):
    VALIDATION_ERROR = "validation_error"
    AI_ERROR = "ai_error"
    RULE_VIOLATION = "rule_violation"
    TIMEOUT = "timeout"
    AUTH_ERROR = "auth_error"
    DB_ERROR = "db_error"


class ChatError(BaseModel):
    """Structured error that travels through graph state and SSE."""

    category: ErrorCategory
    message: str
    details: Dict[str, Any] = {}
    recoverable: bool = False

    def to_sse_dict(self) -> dict:
        return {
            "category": self.category.value,
            "message": self.message,
            "recoverable": self.recoverable,
        }


# ---------------------------------------------------------------------------
# Custom exceptions raised within graph nodes and caught by the node wrapper
# ---------------------------------------------------------------------------

class RuleEvaluationError(Exception):
    """Raised when an LLM rule evaluation call fails or returns unparseable JSON."""

    def __init__(self, message: str, raw_response: Optional[str] = None):
        super().__init__(message)
        self.raw_response = raw_response


class AIResponseError(Exception):
    """Raised when the main LLM response generation fails."""
    pass


class ChatTimeoutError(Exception):
    """Raised when an LLM call exceeds its timeout."""
    pass
