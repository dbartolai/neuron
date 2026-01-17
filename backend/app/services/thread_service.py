# create and delete threads, update names, etc
# always set the updatedat time

# Write chats back to the db, gather context, delete/revise individual messages

import asyncpg
from typing import Optional, List
from uuid import UUID
from app.schemas.thread import GetThreadResponse, ThreadType
from fastapi import HTTPException

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





