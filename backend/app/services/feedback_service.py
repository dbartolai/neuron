# Handle chat feedback operations

import asyncpg
from typing import Optional
from uuid import UUID
from app.schemas.chat import ChatRole

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
        feedback_ceria: Optional[str] = None,
        feedback_instructor: Optional[str] = None,
        type: ChatRole = ChatRole.assistant
    ) -> None:
        """
        Submit or update feedback for a chat message.
        Ensures thumbs_up and thumbs_down are mutually exclusive.
        Ensures at least one feedback field is provided.
        """
        # Ensure mutual exclusivity
        if thumbs_up is True and thumbs_down is True:
            raise ValueError("Cannot set both thumbs_up and thumbs_down to true")
        
        # If setting one to True, set the other to False
        if thumbs_up is True:
            thumbs_down = False
        elif thumbs_down is True:
            thumbs_up = False

        # Validate that at least one feedback field is provided when feedback fields are being set
        # Allow thumbs_up/thumbs_down without feedback, but if providing feedback, at least one must be non-empty
        if feedback_ceria is not None or feedback_instructor is not None:
            # If at least one feedback field is being provided, ensure at least one is non-empty
            if (feedback_ceria is None or feedback_ceria.strip() == "") and (feedback_instructor is None or feedback_instructor.strip() == ""):
                raise ValueError("At least one feedback field (feedback_ceria or feedback_instructor) must be provided")

        # Check if feedback already exists
        existing_query = """
            SELECT id FROM chat_feedback WHERE chat_id = $1 LIMIT 1
        """
        existing = await db.fetchrow(existing_query, chat_id)
        
        if existing:
            # Update existing feedback
            # Use CASE WHEN to only update non-None values
            update_query = """
                UPDATE chat_feedback
                SET thumbs_up = CASE WHEN $2 IS NOT NULL THEN $2 ELSE thumbs_up END,
                    thumbs_down = CASE WHEN $3 IS NOT NULL THEN $3 ELSE thumbs_down END,
                    feedback_ceria = CASE WHEN $4 IS NOT NULL THEN $4 ELSE feedback_ceria END,
                    feedback_instructor = CASE WHEN $5 IS NOT NULL THEN $5 ELSE feedback_instructor END,
                    type = $6
                WHERE chat_id = $1
            """
            await db.execute(update_query, chat_id, thumbs_up, thumbs_down, feedback_ceria, feedback_instructor, type.value)
        else:
            # Insert new feedback
            insert_query = """
                INSERT INTO chat_feedback (chat_id, thumbs_up, thumbs_down, feedback_ceria, feedback_instructor, type)
                VALUES ($1, $2, $3, $4, $5, $6)
            """
            await db.execute(insert_query, chat_id, thumbs_up, thumbs_down, feedback_ceria, feedback_instructor, type.value)

    @staticmethod
    async def get_feedback(db: asyncpg.Connection, chat_id: UUID) -> Optional[dict]:
        """Get existing feedback for a chat message."""
        query = """
            SELECT thumbs_up, thumbs_down, feedback_ceria, feedback_instructor
            FROM chat_feedback
            WHERE chat_id = $1
        """
        row = await db.fetchrow(query, chat_id)
        
        if row is None:
            return None
        
        return {
            "thumbs_up": row["thumbs_up"] or False,
            "thumbs_down": row["thumbs_down"] or False,
            "feedback_ceria": row["feedback_ceria"],
            "feedback_instructor": row["feedback_instructor"]
        }
