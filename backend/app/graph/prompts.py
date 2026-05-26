"""Structured system prompt with immutable and configurable layers.

The SystemPrompt class cleanly separates:
- IMMUTABLE layers: tutor identity, pedagogical framework, core principles,
  formatting rules. These are hardcoded and cannot be modified by instructors.
- CONFIGURABLE layers: course goals, thread-type rules, topic context,
  RAG context. These are loaded from the DB per-request.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from app.schemas.prompt_contract import (
    TUTOR_IDENTITY,
    PEDAGOGICAL_FRAMEWORK,
    OUTPUT_SCHEMA_MARKDOWN,
    CORE_PRINCIPLES,
    FILE_EXPLORATION_RULES,
    FORMATTING_RULES,
)
from app.dependencies.levels import GLOBAL_INVARIANTS


# ---------------------------------------------------------------------------
# Immutable prompt text (assembled once at import time)
# ---------------------------------------------------------------------------

_IMMUTABLE_PROMPT = "\n\n---\n\n".join([
    TUTOR_IDENTITY.strip(),
    PEDAGOGICAL_FRAMEWORK.strip(),
    OUTPUT_SCHEMA_MARKDOWN.strip(),
    CORE_PRINCIPLES.strip(),
    FILE_EXPLORATION_RULES.strip(),
    FORMATTING_RULES.strip(),
])


def _format_rules_by_type(rules: list[dict]) -> str:
    """Format rules grouped by their type (CAPABILITIES, PROHIBITIONS, etc.)."""
    if not rules:
        return ""

    # If rules are plain strings (legacy format), just list them
    if rules and isinstance(rules[0], str):
        return "\n".join(f"- {r}" for r in rules)

    groups: dict[str, list[str]] = {}
    for rule in rules:
        if isinstance(rule, dict):
            rtype = rule.get("type", rule.get("content", "").split(":")[0] if ":" in rule.get("content", "") else "GENERAL")
            content = rule.get("content", str(rule))
        else:
            # Legacy string format — extract type prefix if present
            content = str(rule)
            rtype = content.split(":")[0] if ":" in content else "GENERAL"

        groups.setdefault(rtype, []).append(content)

    sections = []
    for rtype, items in groups.items():
        sections.append(f"### {rtype}")
        sections.extend(f"- {item}" for item in items)
    return "\n".join(sections)


# ---------------------------------------------------------------------------
# SystemPrompt dataclass
# ---------------------------------------------------------------------------

@dataclass
class SystemPrompt:
    """Assembles the multi-layer system prompt.

    Immutable layers are set automatically. Configurable layers are set
    per-request from DB values or detected context.
    """

    # ---- Configurable layers (set per-request) ----------------------------
    course_goals: list[str] = field(default_factory=list)
    thread_rules: list[dict | str] = field(default_factory=list)
    guardrails: list[str] = field(default_factory=list)
    topic_context: Optional[str] = None
    rag_context: Optional[str] = None

    # ---- Immutable (read-only, set once) ----------------------------------
    _identity: str = field(init=False, repr=False, default=_IMMUTABLE_PROMPT)
    _invariants: list[str] = field(init=False, repr=False, default_factory=lambda: list(GLOBAL_INVARIANTS))

    def build(self) -> str:
        """Assemble all layers into the final system prompt string.

        Order matters — immutable sections come first so they cannot be
        overridden by instructor-supplied text.
        """
        sections: list[str] = [self._identity]

        # Global invariants
        if self._invariants:
            inv_text = "\n".join(f"- {inv}" for inv in self._invariants)
            sections.append(f"\n\n---\n\n**GLOBAL INVARIANTS:**\n{inv_text}")

        # Course goals (configurable)
        if self.course_goals:
            goals_text = "\n".join(f"- {g}" for g in self.course_goals)
            sections.append(f"\n\n---\n\n**COURSE GOALS:**\n{goals_text}")

        # Thread-type rules (configurable)
        if self.thread_rules:
            rules_text = _format_rules_by_type(self.thread_rules)
            sections.append(f"\n\n---\n\n**LEVEL-SPECIFIC RULES:**\n{rules_text}")

        # Level guardrails (configurable)
        if self.guardrails:
            grd_text = "\n".join(f"- {g}" for g in self.guardrails)
            sections.append(f"\n\n---\n\n**LEVEL-SPECIFIC GUARDRAILS:**\n{grd_text}")

        # Detected topic (configurable)
        if self.topic_context:
            sections.append(f"\n\n---\n\n**CURRENT TOPIC:**\n{self.topic_context}")

        # RAG course materials (configurable)
        if self.rag_context:
            sections.append(
                f"\n\n---\n\n**RELEVANT COURSE MATERIALS:**\n{self.rag_context}"
            )

        return "".join(sections)
