"""LangGraph node functions for the Neuron chat pipeline.

Each node receives the full ChatGraphState, performs one logical step,
and returns a partial dict that LangGraph merges into the state.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any
from uuid import UUID

from langchain_anthropic import ChatAnthropic
from langchain_core.callbacks import adispatch_custom_event
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.graph.state import ChatGraphState
from app.graph.prompts import SystemPrompt
from app.schemas.errors import (
    ChatError,
    ErrorCategory,
    RuleEvaluationError,
    ChatTimeoutError,
)
from app.schemas.chat import ChatRole
from app.services.thread_service import ThreadService
from app.services.enroll_service import EnrollService
from app.services.log_service import LogService
from app.services.prompt_service import PromptService
from app.services.ai_events_service import AIEventsService
from app.services.topics_service import TopicsService

logger = logging.getLogger("neuron.graph")

# ---------------------------------------------------------------------------
# LLM instances (module-level singletons)
# ---------------------------------------------------------------------------

sonnet = ChatAnthropic(
    model="claude-sonnet-4-6",
    max_tokens=4096,
)

haiku = ChatAnthropic(
    model="claude-haiku-4-5",
    max_tokens=1024,
)


def _get_db(config: RunnableConfig):
    """Extract the asyncpg connection from LangGraph config."""
    return config["configurable"]["db"]


def _get_user_id(config: RunnableConfig) -> str:
    return config["configurable"]["user_id"]


# ═══════════════════════════════════════════════════════════════════════════
# Node: validate_input
# ═══════════════════════════════════════════════════════════════════════════

async def validate_input(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Verify thread ownership and course enrollment."""
    db = _get_db(config)
    thread_id = state["thread_id"]
    user_id = state["user_id"]

    try:
        # Thread ownership
        owns = await ThreadService.verify_thread_belongs_to_user(
            db, thread_id, user_id
        )
        if not owns:
            return {
                "error": ChatError(
                    category=ErrorCategory.AUTH_ERROR,
                    message="Not authorized to access this thread",
                    recoverable=False,
                ).model_dump(),
            }

        # Get course_id from thread
        course_id = await ThreadService.get_thread_course_id(db, thread_id)

        # Enrollment check
        enrolled = await EnrollService.verify_student_enrollment(
            db, course_id, user_id
        )
        if not enrolled:
            return {
                "error": ChatError(
                    category=ErrorCategory.AUTH_ERROR,
                    message="Not enrolled in this course",
                    recoverable=False,
                ).model_dump(),
            }

        return {"course_id": course_id}

    except Exception as e:
        logger.exception("validate_input failed")
        return {
            "error": ChatError(
                category=ErrorCategory.DB_ERROR,
                message=f"Validation failed: {e}",
                recoverable=False,
            ).model_dump(),
        }


# ═══════════════════════════════════════════════════════════════════════════
# Node: load_context
# ═══════════════════════════════════════════════════════════════════════════

async def load_context(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Load rules, history, detect topic, build system prompt, save user msg."""
    db = _get_db(config)
    thread_id = state["thread_id"]
    user_id = state["user_id"]
    course_id = state["course_id"]
    thread_type = state["thread_type"]

    try:
        await adispatch_custom_event(
            "status", {"step": "Loading context..."}, config=config
        )

        # 1. Get course rules from DB
        rules = await PromptService.get_course_rules(db, course_id, thread_type)

        student_rules = rules.get("student_rules", [])
        output_rules = rules.get("response_rules", [])
        guardrails = rules.get("guardrails", [])
        goals = rules.get("goals", [])

        # 2. Fetch conversation history
        history_logs = await LogService.get_messages_from_thread(db, thread_id)
        messages = [
            {"role": log.role, "content": log.message}
            for log in history_logs
        ]

        # 3. Insert user message into DB
        await LogService.insert_message(
            db, thread_id, ChatRole.STUDENT, state["user_message"]
        )

        # 4. Topic detection (best-effort, non-fatal)
        detected_topic = None
        try:
            async with asyncio.timeout(10):
                detected_topic = await TopicsService.detect_topic_from_prompt(
                    db, course_id, state["user_message"],
                    user_id=user_id, thread_id=thread_id,
                )
        except Exception as e:
            logger.warning("Topic detection failed: %s", e)

        # 5. Build structured system prompt
        prompt = SystemPrompt(
            course_goals=goals,
            thread_rules=student_rules,
            guardrails=guardrails,
            topic_context=detected_topic,
        )

        return {
            "student_rules": student_rules,
            "output_rules": output_rules,
            "guardrails": guardrails,
            "goals": goals,
            "detected_topic": detected_topic,
            "messages": messages,
            "system_prompt": prompt.build(),
        }

    except Exception as e:
        logger.exception("load_context failed")
        return {
            "error": ChatError(
                category=ErrorCategory.DB_ERROR,
                message=f"Failed to load context: {e}",
                recoverable=False,
            ).model_dump(),
        }


# ═══════════════════════════════════════════════════════════════════════════
# Node: evaluate_student_rules
# ═══════════════════════════════════════════════════════════════════════════

async def evaluate_student_rules(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Check user message against student rules using Haiku."""
    student_rules = state.get("student_rules", [])

    # No rules → pass
    if not student_rules:
        return {"student_rules_passed": True, "student_rules_details": {}}

    await adispatch_custom_event(
        "status", {"step": "Checking guidelines..."}, config=config
    )

    try:
        async with asyncio.timeout(15):
            # Build rubric
            formatted = []
            for i, rule in enumerate(student_rules, 1):
                if isinstance(rule, dict):
                    rtype = rule.get("type", "REQUEST")
                    content = rule.get("content", "")
                    formatted.append(f"{i}. [{rtype}] {content}")
                else:
                    formatted.append(f"{i}. {rule}")

            rules_text = "\n".join(formatted)
            prompt = (
                "You are a rule auditor. Assess the student's prompt against these rules:\n"
                "- REQUIRE: Must be satisfied (missing = violation)\n"
                "- DENY: Must not be violated (present = violation)\n"
                "- REQUEST: Desired but not required\n"
                "- ALLOW: Explicitly permitted\n\n"
                f"Rules:\n{rules_text}\n\n"
                f"Student prompt:\n{state['user_message']}\n\n"
                "Return ONLY valid JSON: {\"passed\": bool, \"violations\": [{\"rule\": int, \"type\": str, \"reason\": str}], \"requires_file_search\": bool}"
            )

            result = await haiku.ainvoke([HumanMessage(content=prompt)])
            data = json.loads(result.content)

            passed = bool(data.get("passed", False))
            details = {
                "violations": data.get("violations", []),
                "requires_file_search": bool(data.get("requires_file_search", False)),
            }

            # Track AI usage
            ai_event = {
                "provider": "anthropic",
                "model": "claude-haiku-4-5",
                "purpose": "student_rules_check",
            }
            if hasattr(result, "usage_metadata") and result.usage_metadata:
                ai_event["tokens_in"] = result.usage_metadata.get("input_tokens")
                ai_event["tokens_out"] = result.usage_metadata.get("output_tokens")

            return {
                "student_rules_passed": passed,
                "student_rules_details": details,
                "ai_events": state.get("ai_events", []) + [ai_event],
            }

    except json.JSONDecodeError as e:
        logger.warning("Student rules JSON parse error: %s", e)
        return {
            "student_rules_passed": False,
            "student_rules_details": {
                "violations": [{"rule": 0, "reason": f"Rule evaluation parse error: {e}"}],
                "requires_file_search": False,
            },
        }
    except TimeoutError:
        logger.warning("Student rules evaluation timed out")
        return {
            "student_rules_passed": False,
            "student_rules_details": {
                "violations": [{"rule": 0, "reason": "Rule evaluation timed out"}],
                "requires_file_search": False,
            },
            "error": ChatError(
                category=ErrorCategory.TIMEOUT,
                message="Rule evaluation timed out",
                recoverable=True,
            ).model_dump(),
        }
    except Exception as e:
        logger.exception("evaluate_student_rules failed")
        return {
            "student_rules_passed": False,
            "student_rules_details": {
                "violations": [{"rule": 0, "reason": str(e)}],
                "requires_file_search": False,
            },
        }


# ═══════════════════════════════════════════════════════════════════════════
# Node: retrieve_rag
# ═══════════════════════════════════════════════════════════════════════════

async def retrieve_rag(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Retrieve relevant course materials via pgvector similarity search.

    Non-fatal: if RAG fails, we continue without context.
    """
    # TODO: Implement once embedding_service.py is built (Phase 4)
    # For now, pass through with no RAG context
    return {"rag_context": None}


# ═══════════════════════════════════════════════════════════════════════════
# Node: generate_response
# ═══════════════════════════════════════════════════════════════════════════

async def generate_response(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Generate the main response using Sonnet (buffered, not streamed to user)."""
    await adispatch_custom_event(
        "status", {"step": "Generating response..."}, config=config
    )

    try:
        async with asyncio.timeout(60):
            # Build LangChain messages
            lc_messages = [SystemMessage(content=state["system_prompt"])]

            # Add RAG context if available
            if state.get("rag_context"):
                lc_messages[0] = SystemMessage(
                    content=state["system_prompt"]
                    + f"\n\n---\n\n**RELEVANT COURSE MATERIALS:**\n{state['rag_context']}"
                )

            # Add corrective instructions for retries
            if state.get("corrective_instructions"):
                lc_messages.append(
                    SystemMessage(content=state["corrective_instructions"])
                )

            # Add conversation history
            for msg in state.get("messages", []):
                role = msg.get("role", "")
                content = msg.get("content", "")
                if role in ("student", "user"):
                    lc_messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    from langchain_core.messages import AIMessage
                    lc_messages.append(AIMessage(content=content))

            # Add current user message
            lc_messages.append(HumanMessage(content=state["user_message"]))

            # Invoke Sonnet (buffered — not streamed to user yet)
            result = await sonnet.ainvoke(lc_messages)

            # Track usage
            ai_event = {
                "provider": "anthropic",
                "model": "claude-sonnet-4-6",
                "purpose": "student_chat",
            }
            if hasattr(result, "usage_metadata") and result.usage_metadata:
                ai_event["tokens_in"] = result.usage_metadata.get("input_tokens")
                ai_event["tokens_out"] = result.usage_metadata.get("output_tokens")

            return {
                "response_text": result.content,
                "usage_info": ai_event,
                "ai_events": state.get("ai_events", []) + [ai_event],
            }

    except TimeoutError:
        logger.warning("Response generation timed out")
        return {
            "error": ChatError(
                category=ErrorCategory.TIMEOUT,
                message="Response generation timed out. Please try again.",
                recoverable=True,
            ).model_dump(),
        }
    except Exception as e:
        logger.exception("generate_response failed")
        return {
            "error": ChatError(
                category=ErrorCategory.AI_ERROR,
                message=f"Failed to generate response: {e}",
                recoverable=True,
            ).model_dump(),
        }


# ═══════════════════════════════════════════════════════════════════════════
# Node: evaluate_response_rules
# ═══════════════════════════════════════════════════════════════════════════

async def evaluate_response_rules(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Check the buffered response against output rules using Haiku."""
    output_rules = state.get("output_rules", [])

    if not output_rules:
        return {"response_rules_passed": True, "response_rules_details": {}}

    await adispatch_custom_event(
        "status", {"step": "Reviewing response..."}, config=config
    )

    try:
        async with asyncio.timeout(15):
            formatted = []
            for i, rule in enumerate(output_rules, 1):
                if isinstance(rule, dict):
                    rtype = rule.get("type", "REQUEST")
                    content = rule.get("content", "")
                    formatted.append(f"{i}. [{rtype}] {content}")
                else:
                    formatted.append(f"{i}. {rule}")

            rules_text = "\n".join(formatted)
            prompt = (
                "You are a rule auditor. Assess the model's response against these rules:\n"
                "- REQUIRE: Must be present (missing = violation)\n"
                "- DENY: Must not be present (present = violation)\n"
                "- REQUEST: Desired but not required\n"
                "- ALLOW: Explicitly permitted\n\n"
                f"Rules:\n{rules_text}\n\n"
                f"Student prompt:\n{state['user_message']}\n\n"
                f"Model response:\n{state['response_text']}\n\n"
                "Return ONLY valid JSON: {\"passed\": bool, \"violations\": [{\"rule\": int, \"type\": str, \"reason\": str}]}"
            )

            result = await haiku.ainvoke([HumanMessage(content=prompt)])
            data = json.loads(result.content)

            passed = bool(data.get("passed", False))
            violations = data.get("violations", [])

            # Separate violations by type
            require_violations = []
            deny_violations = []
            for v in violations:
                v_type = v.get("type", "")
                rule_num = v.get("rule", 0)
                if v_type == "REQUIRE" and 0 < rule_num <= len(output_rules):
                    r = output_rules[rule_num - 1]
                    require_violations.append(
                        r.get("content", str(r)) if isinstance(r, dict) else str(r)
                    )
                elif v_type == "DENY" and 0 < rule_num <= len(output_rules):
                    r = output_rules[rule_num - 1]
                    deny_violations.append(
                        r.get("content", str(r)) if isinstance(r, dict) else str(r)
                    )

            ai_event = {
                "provider": "anthropic",
                "model": "claude-haiku-4-5",
                "purpose": "response_rules_check",
            }
            if hasattr(result, "usage_metadata") and result.usage_metadata:
                ai_event["tokens_in"] = result.usage_metadata.get("input_tokens")
                ai_event["tokens_out"] = result.usage_metadata.get("output_tokens")

            return {
                "response_rules_passed": passed,
                "response_rules_details": {
                    "violations": violations,
                    "require_violations": require_violations,
                    "deny_violations": deny_violations,
                },
                "ai_events": state.get("ai_events", []) + [ai_event],
            }

    except json.JSONDecodeError as e:
        logger.warning("Response rules JSON parse error: %s", e)
        return {
            "response_rules_passed": False,
            "response_rules_details": {
                "violations": [{"rule": 0, "reason": f"Parse error: {e}"}],
            },
        }
    except TimeoutError:
        logger.warning("Response rules evaluation timed out")
        return {
            "response_rules_passed": True,  # allow through on timeout
            "response_rules_details": {"note": "Timed out, allowing response"},
        }
    except Exception as e:
        logger.exception("evaluate_response_rules failed")
        return {
            "response_rules_passed": False,
            "response_rules_details": {
                "violations": [{"rule": 0, "reason": str(e)}],
            },
        }


# ═══════════════════════════════════════════════════════════════════════════
# Node: stream_approved_response
# ═══════════════════════════════════════════════════════════════════════════

async def stream_approved_response(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Rapidly replay the validated response as token events for frontend animation."""
    text = state.get("response_text", "")
    chunk_size = 6  # ~6 chars per chunk for smooth animation

    for i in range(0, len(text), chunk_size):
        chunk = text[i : i + chunk_size]
        await adispatch_custom_event(
            "token", {"content": chunk}, config=config
        )
        await asyncio.sleep(0.01)  # 10ms between chunks

    return {}


# ═══════════════════════════════════════════════════════════════════════════
# Node: generate_guided_followup
# ═══════════════════════════════════════════════════════════════════════════

async def generate_guided_followup(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Generate policy-compliant follow-up questions instead of a hardcoded fallback."""
    violations = state.get("student_rules_details", {}).get("violations", [])
    if not violations:
        violations = state.get("response_rules_details", {}).get("violations", [])

    violation_summary = "\n".join(
        f"- Rule {v.get('rule', '?')}: {v.get('reason', 'unknown')}"
        for v in violations
    )

    try:
        async with asyncio.timeout(15):
            prompt = (
                "A student asked a question that conflicts with the course's current policy constraints.\n\n"
                f"Student message: {state['user_message']}\n\n"
                f"Policy violations:\n{violation_summary}\n\n"
                "Without providing the prohibited content, generate a helpful response that:\n"
                "1. Acknowledges what the student is trying to do\n"
                "2. Explains (briefly) why this request can't be fulfilled at their current level\n"
                "3. Asks 2-3 follow-up questions that redirect them toward what IS allowed\n"
                "4. Suggests how they could rephrase their request to stay within policy\n\n"
                "Be encouraging and supportive. Use GitHub-Flavored Markdown."
            )

            result = await haiku.ainvoke([HumanMessage(content=prompt)])
            followup_text = result.content

            # Track usage
            ai_event = {
                "provider": "anthropic",
                "model": "claude-haiku-4-5",
                "purpose": "guided_followup",
            }
            if hasattr(result, "usage_metadata") and result.usage_metadata:
                ai_event["tokens_in"] = result.usage_metadata.get("input_tokens")
                ai_event["tokens_out"] = result.usage_metadata.get("output_tokens")

    except Exception as e:
        logger.warning("Guided followup generation failed: %s", e)
        followup_text = (
            "I'd like to help, but your request falls outside the current guidelines "
            "for this course level. Could you try rephrasing your question to focus on "
            "the concepts rather than specific code? I'm happy to guide you through "
            "the thinking process!"
        )
        ai_event = {}

    # Save as system message
    db = _get_db(config)
    try:
        system_msg_id = await LogService.insert_message(
            db, state["thread_id"], ChatRole.SYSTEM, followup_text
        )
    except Exception as e:
        logger.warning("Failed to save guided followup message: %s", e)
        system_msg_id = None

    # Dispatch violation event to frontend
    await adispatch_custom_event(
        "violation",
        {
            "message": followup_text,
            "system_message_id": str(system_msg_id) if system_msg_id else None,
            "has_fallback": True,
            "original_message": state["user_message"],
            "violated_rules": [
                v.get("reason", "") for v in violations
            ],
        },
        config=config,
    )

    events = state.get("ai_events", [])
    if ai_event:
        events = events + [ai_event]

    return {
        "followup_text": followup_text,
        "ai_events": events,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Node: retry_response
# ═══════════════════════════════════════════════════════════════════════════

async def retry_response(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Build corrective instructions and increment attempt counter."""
    await adispatch_custom_event(
        "status", {"step": "Revising response..."}, config=config
    )

    violations = state.get("response_rules_details", {}).get("violations", [])
    violation_text = "\n".join(
        f"- {v.get('reason', 'unknown violation')}" for v in violations
    )

    require_violations = state.get("response_rules_details", {}).get(
        "require_violations", []
    )
    deny_violations = state.get("response_rules_details", {}).get(
        "deny_violations", []
    )

    corrections = "IMPORTANT CORRECTIONS FOR YOUR RESPONSE:\n"
    if deny_violations:
        corrections += "You MUST NOT include:\n" + "\n".join(
            f"- {v}" for v in deny_violations
        ) + "\n"
    if require_violations:
        corrections += "You MUST include:\n" + "\n".join(
            f"- {v}" for v in require_violations
        ) + "\n"
    corrections += f"\nPrevious violations:\n{violation_text}"

    return {
        "attempt": state.get("attempt", 0) + 1,
        "corrective_instructions": corrections,
        "response_text": "",  # clear previous response
    }


# ═══════════════════════════════════════════════════════════════════════════
# Node: save_msg
# ═══════════════════════════════════════════════════════════════════════════

async def save_msg(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Save the assistant response to chat_logs."""
    db = _get_db(config)
    try:
        chat_log_id = await LogService.insert_message(
            db, state["thread_id"], ChatRole.ASSISTANT, state["response_text"]
        )
        return {"chat_log_id": str(chat_log_id)}
    except Exception as e:
        logger.warning("Failed to save assistant message: %s", e)
        return {}


# ═══════════════════════════════════════════════════════════════════════════
# Node: log_events
# ═══════════════════════════════════════════════════════════════════════════

async def log_events(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Batch-log all accumulated AI events."""
    db = _get_db(config)
    user_id = state["user_id"]
    thread_id = state["thread_id"]

    for event in state.get("ai_events", []):
        try:
            await AIEventsService.log_ai_event(
                db=db,
                provider=event.get("provider", "anthropic"),
                model=event.get("model", "unknown"),
                user_id=user_id,
                tokens_in=event.get("tokens_in"),
                tokens_out=event.get("tokens_out"),
                thread_id=thread_id,
                purpose=event.get("purpose"),
            )
        except Exception as e:
            logger.warning("Failed to log AI event: %s", e)

    return {}


# ═══════════════════════════════════════════════════════════════════════════
# Node: update_summary
# ═══════════════════════════════════════════════════════════════════════════

async def update_summary(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Update thread summary. Non-fatal on failure."""
    db = _get_db(config)
    try:
        await ThreadService.update_thread_summary_from_messages(
            db, state["thread_id"], state["user_id"]
        )
    except Exception as e:
        logger.warning("Failed to update thread summary: %s", e)

    # Also update topic if detected
    if state.get("detected_topic"):
        try:
            await ThreadService.set_thread_topic(
                db, state["thread_id"], state["detected_topic"]
            )
        except Exception as e:
            logger.warning("Failed to update thread topic: %s", e)

    return {}


# ═══════════════════════════════════════════════════════════════════════════
# Node: handle_error
# ═══════════════════════════════════════════════════════════════════════════

async def handle_error(
    state: ChatGraphState, config: RunnableConfig
) -> dict[str, Any]:
    """Dispatch error event to the frontend via SSE."""
    error = state.get("error")
    if error:
        await adispatch_custom_event("error", error, config=config)
    return {}
