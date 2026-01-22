import asyncpg
from uuid import UUID
from app.schemas.thread import ThreadType
from app.dependencies.levels import (
    WRITING_LEVELS,
    TESTING_LEVELS,
    DEBUGGING_LEVELS,
    GLOBAL_INVARIANTS,
)


class PromptService:

    @staticmethod
    def get_level(level_type: str, level_index: int):
        """Return a level object for the given type and level."""
        if level_type == ThreadType.writing:
            levels = WRITING_LEVELS
        elif level_type == ThreadType.testing:
            levels = TESTING_LEVELS
        elif level_type == ThreadType.debugging:
            levels = DEBUGGING_LEVELS
        else:
            raise ValueError("Unknown level type")

        for lvl in levels:
            if lvl.get("index") == level_index:
                return lvl
        raise IndexError(f"No level found for {level_type} index {level_index}")

    # Backward-compatible helper that builds a single system prompt string
    # from the selected level's guardrails. This maintains current behavior
    # while enabling the new level-driven flow.
    @staticmethod
    async def build_prompt(db: asyncpg.Connection, thread_id: UUID, course_id: UUID):
        type_query = """
            SELECT thread_type
            FROM threads 
            WHERE id = $1
        """

        thread_type: ThreadType = await db.fetchval(type_query, thread_id)

        level_query = """
            SELECT writing_level, testing_level, debugging_level
            FROM courses
            WHERE id = $1
        """

        row = await db.fetchrow(level_query, course_id)

        if thread_type == ThreadType.writing:
            level_idx = row["writing_level"]
        elif thread_type == ThreadType.testing:
            level_idx = row["testing_level"]
        elif thread_type == ThreadType.debugging:
            level_idx = row["debugging_level"]
        else:
            return "no prompt found."

        level_obj = PromptService.get_level(thread_type, level_idx)
        guardrails = list(GLOBAL_INVARIANTS) + list(level_obj.get("guardrails", []))

        header = (
            "You are ceria, a coding assistant who helps students with their programming assignments.\n"
            "Follow the guardrails below strictly to preserve academic integrity.\n"
        )
        numbered = "\n".join(guardrails)
        return f"{header}\n{numbered}"

    @staticmethod
    def extract_fallback_rules(level: dict) -> list[str]:
        """Extract FALLBACK rules from a level's guardrails.
        
        Args:
            level: Level dictionary with 'guardrails' key containing list of rule strings
            
        Returns:
            List of fallback rule strings (rules starting with 'FALLBACK:')
        """
        guardrails = level.get("guardrails", [])
        fallback_rules = [rule for rule in guardrails if rule.startswith("FALLBACK:")]
        return fallback_rules
