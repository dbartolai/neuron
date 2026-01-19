# create and delete threads, update names, etc
# always set the updatedat time

# Write chats back to the db, gather context, delete/revise individual messages

import asyncpg
from typing import Optional, List, Dict
from uuid import UUID
from app.schemas.thread import GetThreadResponse, ThreadType
from fastapi import HTTPException
from app.services.log_service import LogService
from app.services.chat_service import ChatService

class ThreadService:

    @staticmethod
    async def get_thread_id(db: asyncpg.Connection, thread_name: str, user_id: UUID) -> Optional[UUID]:
        query = """
            SELECT id 
            FROM threads 
            WHERE title = $1 AND user_id = $2
        """

        row = await db.fetchrow(query, thread_name, user_id)

        if row is None:
            return None
        
        return row["id"]
    
    @staticmethod
    async def get_thread_ids_by_course(db: asyncpg.Connection, course_id: UUID, user_id: UUID) -> List[UUID]:

        query = """
            SELECT id 
            FROM threads
            WHERE user_id = $2
            AND course_id = $1
            AND (deleted IS NULL OR deleted = false)
        """

        rows = await db.fetch(query, course_id, user_id)

        return [row["id"] for row in rows]
    
    @staticmethod
    async def get_threads_by_course(db: asyncpg.Connection, course_id: UUID, user_id: UUID) -> List[GetThreadResponse]:

        query = """
            SELECT id, updated_at, title
            FROM threads
            WHERE user_id = $2
            AND course_id = $1
            AND (deleted IS NULL OR deleted = false)
            ORDER BY updated_at DESC
        """

        rows = await db.fetch(query, course_id, user_id)

        return [dict(row) for row in rows]
    
    @staticmethod
    async def get_thread_preview_by_course(db: asyncpg.Connection, course_id: UUID, user_id: UUID) -> List[GetThreadResponse]:

        query = """
            SELECT id, updated_at, title, thread_type
            FROM threads
            WHERE user_id = $2
            AND course_id = $1
            AND (deleted IS NULL OR deleted = false)
            ORDER BY updated_at DESC
            LIMIT 10
        """

        rows = await db.fetch(query, course_id, user_id)

        return [dict(row) for row in rows]
    
    @staticmethod
    async def get_thread_count_by_course(db: asyncpg.Connection, course_id: UUID, user_id: UUID) -> int:

        query = """
            SELECT COUNT(*) 
            FROM threads
            WHERE user_id = $2
                AND course_id = $1
                AND (deleted IS NULL OR deleted = false)
        """
    
        count: int = await db.fetchval(query, course_id, user_id)

        return count
    
    
    @staticmethod
    async def create_thread_in_course(db: asyncpg.Connection, course_id: UUID, user_id: UUID, thread_name: str, thread_type: ThreadType) -> UUID:
        
        query = """
            INSERT INTO threads (title, user_id, course_id, thread_type)
            VALUES ($3, $2, $1, $4)
            RETURNING id
        """

        row = await db.fetchrow(query, course_id, user_id, thread_name, thread_type)

        return row["id"]
    
    @staticmethod
    async def get_thread_name_by_id(db: asyncpg.Connection, thread_id: UUID) -> str:

        query = """
            SELECT title
            FROM threads
            WHERE id = $1
        """
        
        name: str = await db.fetchval(query, thread_id)

        if name is None:
            raise HTTPException(status_code=404, detail="thread not found")
        return name
    
    @staticmethod
    async def get_total_thread_count_by_course(db: asyncpg.Connection, course_id: UUID) -> int:
        """Count all threads across all students for a course."""
        query = """
            SELECT COUNT(*) 
            FROM threads
            WHERE course_id = $1
        """
        count: int = await db.fetchval(query, course_id)
        return count
    
    @staticmethod
    async def get_all_threads_by_course(db: asyncpg.Connection, course_id: UUID) -> List[dict]:
        """Get all threads (across all students) for a course."""
        query = """
            SELECT id, title, thread_tag, user_id, updated_at
            FROM threads
            WHERE course_id = $1
            ORDER BY updated_at DESC
        """
        rows = await db.fetch(query, course_id)
        return [dict(row) for row in rows]
    
    @staticmethod
    async def get_threads_with_messages(db: asyncpg.Connection, course_id: UUID) -> List[dict]:
        """Get threads with their first student message for AI analysis."""
        query = """
            SELECT 
                t.id,
                t.title,
                t.thread_type,
                (
                    SELECT message 
                    FROM chat_logs 
                    WHERE thread_id = t.id 
                    AND role = 'student' 
                    ORDER BY created_at ASC 
                    LIMIT 1
                ) as first_message
            FROM threads t
            WHERE t.course_id = $1
            ORDER BY t.updated_at DESC
        """
        rows = await db.fetch(query, course_id)
        return [dict(row) for row in rows]
    
    @staticmethod
    async def update_thread_tag(db: asyncpg.Connection, thread_id: UUID, tag: str) -> None:
        """Update a thread's tag."""
        query = """
            UPDATE threads
            SET thread_tag = $2
            WHERE id = $1
        """
        await db.execute(query, thread_id, tag)
    
    @staticmethod
    async def get_threads_by_tag(db: asyncpg.Connection, course_id: UUID, tag: str) -> List[dict]:
        """Get threads filtered by tag."""
        query = """
            SELECT id, title, thread_tag, user_id, updated_at
            FROM threads
            WHERE course_id = $1 AND thread_tag = $2
            ORDER BY updated_at DESC
        """
        rows = await db.fetch(query, course_id, tag)
        return [dict(row) for row in rows]

    @staticmethod
    async def verify_thread_belongs_to_user(db: asyncpg.Connection, thread_id: UUID, user_id: UUID) -> bool:
        """Verify that a thread belongs to a specific user."""
        query = """
            SELECT user_id
            FROM threads
            WHERE id = $1
        """
        thread_user_id: UUID = await db.fetchval(query, thread_id)
        if thread_user_id is None:
            return False
        return str(thread_user_id) == str(user_id)
    
    @staticmethod
    async def get_thread_course_id(db: asyncpg.Connection, thread_id: UUID) -> UUID:
        """Get the course_id for a thread. Raises HTTPException(404) if thread not found."""
        query = """
            SELECT course_id
            FROM threads
            WHERE id = $1
        """
        course_id: UUID = await db.fetchval(query, thread_id)
        if course_id is None:
            raise HTTPException(status_code=404, detail="thread not found")
        return course_id
    
    @staticmethod
    async def update_thread_name(db: asyncpg.Connection, thread_id: UUID, user_id: UUID, new_title: str) -> None:
        """Update a thread's title. Verifies ownership before updating."""
        # Verify ownership
        if not await ThreadService.verify_thread_belongs_to_user(db, thread_id, user_id):
            raise HTTPException(status_code=401, detail="Not authorized to update this thread")
        
        query = """
            UPDATE threads
            SET title = $2, updated_at = NOW()
            WHERE id = $1
        """
        await db.execute(query, thread_id, new_title)
    
    @staticmethod
    async def soft_delete_thread(db: asyncpg.Connection, thread_id: UUID, user_id: UUID) -> None:
        """Soft delete a thread by setting deleted = true. Verifies ownership before deleting."""
        # Verify ownership
        if not await ThreadService.verify_thread_belongs_to_user(db, thread_id, user_id):
            raise HTTPException(status_code=401, detail="Not authorized to delete this thread")
        
        query = """
            UPDATE threads
            SET deleted = true, updated_at = NOW()
            WHERE id = $1
        """
        await db.execute(query, thread_id)
    
    @staticmethod
    async def get_student_threads_with_summaries(
        db: asyncpg.Connection, 
        course_id: UUID, 
        student_id: UUID,
        instructor_id: UUID
    ) -> List[Dict]:
        """Get threads for a specific student in a course with summaries from database."""
        # Query threads filtered by course_id and user_id (student_id), including summary column
        query = """
            SELECT id, title, updated_at, summary
            FROM threads
            WHERE course_id = $1
            AND user_id = $2
            AND (deleted IS NULL OR deleted = false)
            ORDER BY updated_at DESC
        """
        rows = await db.fetch(query, course_id, student_id)
        
        result = []
        for row in rows:
            # Get summary from database, default to empty string if null
            summary = row["summary"] if row["summary"] else ""
            
            result.append({
                "id": row["id"],
                "title": row["title"],
                "updated_at": row["updated_at"],
                "summary": summary,
            })
        
        return result

    @staticmethod
    async def update_thread_summary(db: asyncpg.Connection, thread_id: UUID, summary: str) -> None:
        """Update the summary column for a thread."""
        query = """
            UPDATE threads
            SET summary = $2
            WHERE id = $1
        """
        await db.execute(query, thread_id, summary)

    @staticmethod
    async def update_thread_summary_from_messages(
        db: asyncpg.Connection,
        thread_id: UUID,
        user_id: UUID,
    ) -> None:
        """Generate and update thread summary from all messages in the thread."""
        try:
            # Get all messages from chat_logs for the thread
            messages = await LogService.get_messages_from_thread(db, thread_id, limit=1000)
            
            if not messages:
                # No messages yet, set empty summary
                await ThreadService.update_thread_summary(db, thread_id, "")
                return
            
            # Generate summary using gpt-5-nano
            summary = await ChatService.generate_thread_summary(
                log=messages,
                db=db,
                user_id=user_id,
                thread_id=thread_id,
            )
            
            # Update the summary in the database
            await ThreadService.update_thread_summary(db, thread_id, summary)
        except Exception as e:
            # Log error but don't fail - summary generation is non-critical
            print(f"Failed to update thread summary for thread {thread_id}: {str(e)}")





