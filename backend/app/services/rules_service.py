"""Service for managing course rules stored in the database."""

import asyncpg
from uuid import UUID
from typing import Dict, List, Optional, Any
from app.schemas.thread import ThreadType


class RulesService:
    """Service for CRUD operations on course_rules table."""

    @staticmethod
    async def get_course_rules(
        db: asyncpg.Connection, 
        course_id: UUID, 
        rule_type: ThreadType
    ) -> Optional[Dict[str, Any]]:
        """Fetch rules for a course and rule type.
        
        Args:
            db: Database connection
            course_id: Course UUID
            rule_type: ThreadType (writing, testing, debugging)
            
        Returns:
            Dictionary with rules data or None if not found
        """
        # Get the rules_id from courses table based on rule_type
        field_map = {
            ThreadType.writing: "writing_rules",
            ThreadType.testing: "testing_rules",
            ThreadType.debugging: "debugging_rules",
        }
        
        field_name = field_map.get(rule_type)
        if not field_name:
            raise ValueError(f"Invalid rule_type: {rule_type}")
        
        query = f"""
            SELECT cr.id, cr.goals, cr.prompt_rules, cr.output_rules, 
                   cr.fallback_prompt, cr.outputs, cr.version_num, cr.course_id, cr.rule_type
            FROM course_rules cr
            JOIN courses c ON c.{field_name} = cr.id
            WHERE c.id = $1 AND cr.rule_type = $2
        """
        
        row = await db.fetchrow(query, course_id, rule_type.value)
        
        if row is None:
            return None
        
        return dict(row)

    @staticmethod
    async def get_level_default_rules(
        db: asyncpg.Connection,
        thread_type: ThreadType,
        level_idx: int
    ) -> Optional[Dict[str, Any]]:
        """Get default rules from level_defaults table.
        
        Args:
            db: Database connection
            thread_type: ThreadType (writing, testing, debugging)
            level_idx: Level index (0-7 for writing, 0-5 for testing/debugging)
            
        Returns:
            Dictionary with default rules data or None if not found
        """
        query = """
            SELECT cr.id, cr.goals, cr.prompt_rules, cr.output_rules,
                   cr.fallback_prompt, cr.outputs, cr.version_num, cr.course_id, cr.rule_type
            FROM level_defaults ld
            JOIN course_rules cr ON ld.rules_id = cr.id
            WHERE ld.thread_type = $1 AND ld.level_idx = $2
        """
        
        row = await db.fetchrow(query, thread_type.value, level_idx)
        
        if row is None:
            return None
        
        return dict(row)

    @staticmethod
    async def duplicate_default_rules(
        db: asyncpg.Connection,
        course_id: UUID,
        thread_type: ThreadType,
        level_idx: int
    ) -> UUID:
        """Duplicate default rules from level_defaults to course_rules.
        
        Args:
            db: Database connection
            course_id: Course UUID
            thread_type: ThreadType (writing, testing, debugging)
            level_idx: Level index
            
        Returns:
            UUID of the newly created course_rules row
        """
        # Get default rules
        default_rules = await RulesService.get_level_default_rules(db, thread_type, level_idx)
        
        if default_rules is None:
            raise ValueError(f"No default rules found for {thread_type.value} level {level_idx}")
        
        # Insert new row with course_id set
        query = """
            INSERT INTO course_rules (
                goals, prompt_rules, output_rules, fallback_prompt, outputs,
                version_num, course_id, rule_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        """
        
        rules_id = await db.fetchval(
            query,
            default_rules.get("goals"),
            default_rules.get("prompt_rules"),
            default_rules.get("output_rules"),
            default_rules.get("fallback_prompt"),
            default_rules.get("outputs"),
            default_rules.get("version_num", 1),
            course_id,
            thread_type.value
        )
        
        return rules_id

    @staticmethod
    async def create_course_rules(
        db: asyncpg.Connection,
        course_id: UUID,
        rule_type: ThreadType,
        rules_data: Dict[str, Any]
    ) -> UUID:
        """Create a new course ruleset.
        
        Args:
            db: Database connection
            course_id: Course UUID
            rule_type: ThreadType
            rules_data: Dictionary with rules fields
            
        Returns:
            UUID of the created course_rules row
        """
        query = """
            INSERT INTO course_rules (
                goals, prompt_rules, output_rules, fallback_prompt, outputs,
                version_num, course_id, rule_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        """
        
        rules_id = await db.fetchval(
            query,
            rules_data.get("goals"),
            rules_data.get("prompt_rules"),
            rules_data.get("output_rules"),
            rules_data.get("fallback_prompt"),
            rules_data.get("outputs"),
            rules_data.get("version_num", 1),
            course_id,
            rule_type.value
        )
        
        return rules_id

    @staticmethod
    async def update_course_rules(
        db: asyncpg.Connection,
        rules_id: UUID,
        rules_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update an existing course ruleset.
        
        Args:
            db: Database connection
            rules_id: Course rules UUID
            rules_data: Dictionary with fields to update
            
        Returns:
            Updated rules dictionary
        """
        # Build dynamic update query
        updates = []
        values = []
        param_idx = 1
        
        for field in ["goals", "prompt_rules", "output_rules", "fallback_prompt", "outputs", "version_num"]:
            if field in rules_data:
                updates.append(f"{field} = ${param_idx}")
                values.append(rules_data[field])
                param_idx += 1
        
        if not updates:
            # No updates, just return current rules
            return await RulesService.get_rules_by_id(db, rules_id)
        
        values.append(rules_id)
        
        query = f"""
            UPDATE course_rules
            SET {", ".join(updates)}
            WHERE id = ${param_idx}
            RETURNING id, goals, prompt_rules, output_rules, fallback_prompt, outputs, version_num, course_id, rule_type
        """
        
        row = await db.fetchrow(query, *values)
        
        if row is None:
            raise ValueError(f"Rules not found: {rules_id}")
        
        return dict(row)

    @staticmethod
    async def get_rules_by_id(
        db: asyncpg.Connection,
        rules_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """Get rules by ID.
        
        Args:
            db: Database connection
            rules_id: Course rules UUID
            
        Returns:
            Rules dictionary or None
        """
        query = """
            SELECT id, goals, prompt_rules, output_rules, fallback_prompt, outputs,
                   version_num, course_id, rule_type
            FROM course_rules
            WHERE id = $1
        """
        
        row = await db.fetchrow(query, rules_id)
        
        if row is None:
            return None
        
        return dict(row)

    @staticmethod
    async def delete_course_rules(
        db: asyncpg.Connection,
        rules_id: UUID
    ) -> bool:
        """Delete a course ruleset (with cascade checks).
        
        Args:
            db: Database connection
            rules_id: Course rules UUID
            
        Returns:
            True if deleted, False if not found
        """
        # Check if any courses reference this ruleset
        check_query = """
            SELECT COUNT(*) FROM courses
            WHERE writing_rules = $1 OR testing_rules = $1 OR debugging_rules = $1
        """
        
        count = await db.fetchval(check_query, rules_id)
        
        if count > 0:
            raise ValueError(f"Cannot delete rules: {count} course(s) still reference it")
        
        query = "DELETE FROM course_rules WHERE id = $1"
        result = await db.execute(query, rules_id)
        
        return result == "DELETE 1"

    @staticmethod
    def convert_rules_to_level_format(rules: Dict[str, Any]) -> Dict[str, List[str]]:
        """Convert database rules format to level format expected by chat service.
        
        Database format:
        - prompt_rules: [{"type": "REQUEST", "content": "rule text"}, ...]
        - output_rules: [{"type": "REQUIRE", "content": "rule text"}, ...]
        
        Level format:
        - student_rules: ["rule text", ...]
        - guardrails: ["rule text", ...]
        - response_rules: ["rule text", ...]
        
        Args:
            rules: Rules dictionary from database
            
        Returns:
            Dictionary with student_rules, guardrails, response_rules arrays
        """
        # Extract content from rule objects
        def extract_content(rule_objects: Optional[List[Dict]]) -> List[str]:
            if not rule_objects:
                return []
            return [rule.get("content", "") for rule in rule_objects if rule.get("content")]
        
        # prompt_rules become student_rules and guardrails
        prompt_rules = extract_content(rules.get("prompt_rules"))
        
        # output_rules become response_rules
        response_rules = extract_content(rules.get("output_rules"))
        
        # For now, use prompt_rules for both student_rules and guardrails
        # This can be refined later if needed
        return {
            "student_rules": prompt_rules,
            "guardrails": prompt_rules,
            "response_rules": response_rules,
        }

    @staticmethod
    async def get_level_default_rules_id(
        db: asyncpg.Connection,
        thread_type: ThreadType,
        level_idx: int
    ) -> Optional[UUID]:
        """Get rules_id from level_defaults table.
        
        Args:
            db: Database connection
            thread_type: ThreadType (writing, testing, debugging)
            level_idx: Level index
            
        Returns:
            UUID of rules_id or None if not found
        """
        query = """
            SELECT rules_id
            FROM level_defaults
            WHERE thread_type = $1 AND level_idx = $2
        """
        
        rules_id = await db.fetchval(query, thread_type.value, level_idx)
        return rules_id

    @staticmethod
    async def create_or_update_level_default(
        db: asyncpg.Connection,
        thread_type: ThreadType,
        level_idx: int,
        rules_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create or update default rules for a level.
        
        If level_defaults row exists, updates the linked course_rules.
        If not, creates new course_rules and level_defaults rows.
        
        Args:
            db: Database connection
            thread_type: ThreadType (writing, testing, debugging)
            level_idx: Level index
            rules_data: Dictionary with rules fields
            
        Returns:
            Updated rules dictionary
        """
        # Check if level_defaults row exists
        existing_rules_id = await RulesService.get_level_default_rules_id(db, thread_type, level_idx)
        
        if existing_rules_id:
            # Update existing course_rules
            updated_rules = await RulesService.update_course_rules(db, existing_rules_id, rules_data)
            return updated_rules
        else:
            # Create new course_rules row (with course_id = NULL for defaults)
            query = """
                INSERT INTO course_rules (
                    goals, prompt_rules, output_rules, fallback_prompt, outputs,
                    version_num, course_id, rule_type
                )
                VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)
                RETURNING id
            """
            
            rules_id = await db.fetchval(
                query,
                rules_data.get("goals"),
                rules_data.get("prompt_rules"),
                rules_data.get("output_rules"),
                rules_data.get("fallback_prompt"),
                rules_data.get("outputs"),
                rules_data.get("version_num", 1),
                thread_type.value
            )
            
            # Create level_defaults row pointing to the new course_rules
            insert_default_query = """
                INSERT INTO level_defaults (thread_type, level_idx, rules_id)
                VALUES ($1, $2, $3)
                RETURNING id
            """
            
            await db.fetchval(insert_default_query, thread_type.value, level_idx, rules_id)
            
            # Return the created rules
            return await RulesService.get_rules_by_id(db, rules_id)

    @staticmethod
    async def list_level_defaults(
        db: asyncpg.Connection,
        thread_type: ThreadType
    ) -> List[Dict[str, Any]]:
        """List all level_defaults for a thread_type with their rules.
        
        Args:
            db: Database connection
            thread_type: ThreadType (writing, testing, debugging)
            
        Returns:
            List of dictionaries with level_idx and rules data
        """
        query = """
            SELECT 
                ld.level_idx,
                cr.id, cr.goals, cr.prompt_rules, cr.output_rules,
                cr.fallback_prompt, cr.outputs, cr.version_num, cr.course_id, cr.rule_type
            FROM level_defaults ld
            JOIN course_rules cr ON ld.rules_id = cr.id
            WHERE ld.thread_type = $1
            ORDER BY ld.level_idx
        """
        
        rows = await db.fetch(query, thread_type.value)
        
        result = []
        for row in rows:
            rule_dict = {
                "level_idx": row["level_idx"],
                "id": row["id"],
                "goals": row["goals"],
                "prompt_rules": row["prompt_rules"],
                "output_rules": row["output_rules"],
                "fallback_prompt": row["fallback_prompt"],
                "outputs": row["outputs"],
                "version_num": row["version_num"],
                "course_id": row["course_id"],
                "rule_type": row["rule_type"],
            }
            result.append(rule_dict)
        
        return result
