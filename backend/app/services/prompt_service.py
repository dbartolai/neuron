import asyncpg
from uuid import UUID
from typing import Optional, Dict, Any, List
from app.schemas.thread import ThreadType
from app.dependencies.levels import (
    WRITING_LEVELS,
    TESTING_LEVELS,
    DEBUGGING_LEVELS,
    GLOBAL_INVARIANTS,
)
from app.services.rules_service import RulesService


class PromptService:

    @staticmethod
    def get_level(level_type: str, level_index: int):
        """Return a level object for the given type and level.
        
        DEPRECATED: Use get_course_rules() instead for database-backed rules.
        Kept for backward compatibility during migration.
        """
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

    @staticmethod
    async def get_course_rules(
        db: asyncpg.Connection,
        course_id: UUID,
        thread_type: ThreadType
    ) -> Dict[str, Any]:
        """Get course rules from database and convert to level format.
        
        Args:
            db: Database connection
            course_id: Course UUID
            thread_type: ThreadType (writing, testing, debugging)
            
        Returns:
            Dictionary in level format with student_rules, guardrails, response_rules
        """
        # Get rules from database
        rules = await RulesService.get_course_rules(db, course_id, thread_type)
        
        if rules is None:
            # Fallback to hardcoded levels if database rules not found
            # Get level from course
            level_query = """
                SELECT writing_level, testing_level, debugging_level
                FROM courses
                WHERE id = $1
            """
            course_row = await db.fetchrow(level_query, course_id)
            if course_row is None:
                raise ValueError(f"Course not found: {course_id}")
            
            if thread_type == ThreadType.writing:
                level_idx = course_row["writing_level"]
            elif thread_type == ThreadType.testing:
                level_idx = course_row["testing_level"]
            elif thread_type == ThreadType.debugging:
                level_idx = course_row["debugging_level"]
            else:
                raise ValueError(f"Invalid thread type: {thread_type}")
            
            if level_idx is None:
                raise ValueError(f"Level is NULL for {thread_type.value} - custom rules not found")
            
            # Fallback to hardcoded level
            return PromptService.get_level(thread_type, level_idx)
        
        # Convert database rules to level format
        level_format = RulesService.convert_rules_to_level_format(rules)
        
        return level_format

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

        # Use database-backed rules
        level_obj = await PromptService.get_course_rules(db, course_id, thread_type)
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

    @staticmethod
    async def build_full_system_prompt(
        db: asyncpg.Connection,
        course_id: UUID,
        thread_type: ThreadType,
        detected_topic: Optional[str] = None
    ) -> str:
        """Build complete system prompt with all layers.
        
        Args:
            db: Database connection
            course_id: Course UUID
            thread_type: ThreadType (writing, testing, debugging)
            detected_topic: Optional topic name for context
            
        Returns:
            Complete system prompt string with all sections
        """
        # Get course rules from database
        rules = await RulesService.get_course_rules(db, course_id, thread_type)
        
        # Start with base contract
        from app.schemas.prompt_contract import build_system_prompt
        base_prompt = build_system_prompt()
        
        # Add course goals
        goals_section = PromptService.format_goals(rules.get("goals", []))
        
        # Add detected topic
        topic_section = PromptService.format_topic(detected_topic) if detected_topic else ""
        
        # Add model rules (formatted by type)
        model_rules_section = PromptService.format_model_rules(rules.get("output_rules", []))
        
        # Add output requirements
        output_requirements_section = PromptService.format_output_requirements(rules.get("outputs", []))
        
        # Add level guardrails (prompt rules)
        guardrails_section = PromptService.format_guardrails(rules.get("prompt_rules", []))
        
        # Combine all sections, filtering out empty sections
        sections = [base_prompt]
        if goals_section:
            sections.append(goals_section)
        if topic_section:
            sections.append(topic_section)
        if model_rules_section:
            sections.append(model_rules_section)
        if output_requirements_section:
            sections.append(output_requirements_section)
        if guardrails_section:
            sections.append(guardrails_section)
        
        return "\n\n".join(sections)

    @staticmethod
    def format_goals(goals: Optional[List[str]]) -> str:
        """Format course goals section.
        
        Args:
            goals: List of goal strings
            
        Returns:
            Formatted goals section or empty string
        """
        if not goals:
            return ""
        
        sections = ["--- COURSE GOALS ---"]
        for goal in goals:
            sections.append(f"- {goal}")
        
        return "\n".join(sections)

    @staticmethod
    def format_topic(topic: str) -> str:
        """Format topic section.
        
        Args:
            topic: Topic name
            
        Returns:
            Formatted topic section
        """
        return f"--- CURRENT TOPIC ---\nThe student is asking about: {topic}"

    @staticmethod
    def format_model_rules(output_rules: Optional[List[Dict[str, Any]]]) -> str:
        """Format model rules by type (REQUEST, REQUIRE, ALLOW, DENY).
        
        Args:
            output_rules: List of rule objects with 'type' and 'content' keys
            
        Returns:
            Formatted model rules section or empty string
        """
        if not output_rules:
            return ""
        
        by_type = {"REQUEST": [], "REQUIRE": [], "ALLOW": [], "DENY": []}
        for rule in output_rules:
            rule_type = rule.get("type", "REQUEST")
            content = rule.get("content", "")
            if content:
                by_type[rule_type].append(content)
        
        # Check if we have any rules to format
        if not any(by_type.values()):
            return ""
        
        sections = ["--- MODEL BEHAVIOR RULES ---"]
        
        if by_type["REQUEST"]:
            sections.append("\nREQUEST (you should include when relevant):")
            sections.extend([f"- {r}" for r in by_type["REQUEST"]])
        
        if by_type["REQUIRE"]:
            sections.append("\nREQUIRE (you must always include):")
            sections.extend([f"- {r}" for r in by_type["REQUIRE"]])
        
        if by_type["ALLOW"]:
            sections.append("\nALLOW (explicitly permitted):")
            sections.extend([f"- {r}" for r in by_type["ALLOW"]])
        
        if by_type["DENY"]:
            sections.append("\nDENY (never include):")
            sections.extend([f"- {r}" for r in by_type["DENY"]])
        
        return "\n".join(sections)

    @staticmethod
    def format_output_requirements(outputs: Optional[List[str]]) -> str:
        """Format output requirements section.
        
        Args:
            outputs: List of output requirement strings
            
        Returns:
            Formatted output requirements section or empty string
        """
        if not outputs:
            return ""
        
        sections = ["--- OUTPUT REQUIREMENTS ---", "Your response structure should include:"]
        for output in outputs:
            sections.append(f"- {output}")
        
        return "\n".join(sections)

    @staticmethod
    def format_guardrails(prompt_rules: Optional[List[Dict[str, Any]]]) -> str:
        """Format prompt rules as guardrails.
        
        Args:
            prompt_rules: List of rule objects with 'type' and 'content' keys
            
        Returns:
            Formatted guardrails section or empty string
        """
        if not prompt_rules:
            return ""
        
        # Extract content from all prompt rules
        guardrails = [rule.get("content", "") for rule in prompt_rules if rule.get("content")]
        
        if not guardrails:
            return ""
        
        sections = ["--- LEVEL-SPECIFIC GUARDRAILS ---"]
        sections.extend(guardrails)
        
        return "\n".join(sections)
