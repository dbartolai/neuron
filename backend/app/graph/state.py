"""LangGraph state schema for the Neuron chat pipeline."""

from __future__ import annotations

from typing import TypedDict, Optional, Any
from uuid import UUID


class ChatGraphState(TypedDict, total=False):
    """Full state that flows through the chat graph.

    Fields are grouped by lifecycle phase.  ``total=False`` allows nodes
    to return partial updates — LangGraph merges them into the full state.
    """

    # ---- Request input (set once at graph entry) --------------------------
    thread_id: UUID
    user_id: UUID
    course_id: UUID
    thread_type: str                        # "writing" | "testing" | "debugging"
    user_message: str
    is_fallback_retry: bool                 # True when user clicks "Use Fallback"
    system_message_id: Optional[UUID]       # for fallback retries

    # ---- Assembled prompt (built in load_context) -------------------------
    system_prompt: str                      # final prompt via SystemPrompt.build()

    # ---- Configurable context (loaded from DB, read-only in graph) --------
    student_rules: list[dict[str, Any]]     # prompt_rules for input validation
    output_rules: list[dict[str, Any]]      # response validation rules
    guardrails: list[str]
    goals: list[str]
    detected_topic: Optional[str]

    # ---- Conversation history ---------------------------------------------
    messages: list[dict[str, str]]          # [{role, content}]

    # ---- RAG context ------------------------------------------------------
    rag_context: Optional[str]

    # ---- LLM response (buffered until validated) --------------------------
    response_text: str
    usage_info: dict[str, Any]              # token counts from Anthropic

    # ---- Rule evaluation results ------------------------------------------
    student_rules_passed: bool
    student_rules_details: dict[str, Any]
    response_rules_passed: bool
    response_rules_details: dict[str, Any]

    # ---- Retry / Guided followup ------------------------------------------
    attempt: int                            # 0=first, 1=retry, 2=guided followup
    corrective_instructions: Optional[str]
    followup_text: Optional[str]            # LLM-generated follow-up questions

    # ---- Error state ------------------------------------------------------
    error: Optional[dict[str, Any]]         # serialised ChatError

    # ---- Tracking ---------------------------------------------------------
    ai_events: list[dict[str, Any]]         # accumulated for batch logging at end
    chat_log_id: Optional[str]              # ID of saved assistant message
