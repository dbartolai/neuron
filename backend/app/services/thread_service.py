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





