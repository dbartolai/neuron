# Handle chat feedback operations

import asyncpg
from typing import Optional
from uuid import UUID

class FeedbackService:

    @staticmethod
    async def get_thread_id_from_chat(db: asyncpg.Connection, chat_id: UUID) -> Optional[UUID]:
        """Get the thread_id for a given chat_id."""
        query = """
            SELECT thread_id
            FROM chat_logs
            WHERE id = $1
        """
        thread_id = await db.fetchval(query, chat_id)
        return thread_id

    @staticmethod
    async def submit_feedback(
        db: asyncpg.Connection,
        chat_id: UUID,
        thumbs_up: Optional[bool] = None,
        thumbs_down: Optional[bool] = None,
        feedback_text: Optional[str] = None
    ) -> None:
        """
        Submit or update feedback for a chat message.
        Ensures thumbs_up and thumbs_down are mutually exclusive.
        """
        # Ensure mutual exclusivity
        if thumbs_up is True and thumbs_down is True:
            raise ValueError("Cannot set both thumbs_up and thumbs_down to true")
        
        # If setting one to True, set the other to False
        if thumbs_up is True:
            thumbs_down = False
        elif thumbs_down is True:
            thumbs_up = False

        # Check if feedback already exists
        existing_query = """
            SELECT id FROM chat_feedback WHERE chat_id = $1 LIMIT 1
        """
        existing = await db.fetchrow(existing_query, chat_id)
        
        if existing:
            # Update existing feedback
            # Use COALESCE to only update non-None values, but handle None explicitly for feedback_text
            update_query = """
                UPDATE chat_feedback
                SET thumbs_up = CASE WHEN $2 IS NOT NULL THEN $2 ELSE thumbs_up END,
                    thumbs_down = CASE WHEN $3 IS NOT NULL THEN $3 ELSE thumbs_down END,
                    feedback = CASE WHEN $4 IS NOT NULL THEN $4 ELSE feedback END
                WHERE chat_id = $1
            """
            await db.execute(update_query, chat_id, thumbs_up, thumbs_down, feedback_text)
        else:
            # Insert new feedback
            insert_query = """
                INSERT INTO chat_feedback (chat_id, thumbs_up, thumbs_down, feedback)
                VALUES ($1, $2, $3, $4)
            """
            await db.execute(insert_query, chat_id, thumbs_up, thumbs_down, feedback_text)

    @staticmethod
    async def get_feedback(db: asyncpg.Connection, chat_id: UUID) -> Optional[dict]:
        """Get existing feedback for a chat message."""
        query = """
            SELECT thumbs_up, thumbs_down, feedback
            FROM chat_feedback
            WHERE chat_id = $1
        """
        row = await db.fetchrow(query, chat_id)
        
        if row is None:
            return None
        
        return {
            "thumbs_up": row["thumbs_up"] or False,
            "thumbs_down": row["thumbs_down"] or False,
            "feedback": row["feedback"]
        }
