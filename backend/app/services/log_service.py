# Write chats back to the db, gather context, delete/revise individual messages

import asyncpg
from typing import List
from app.schemas.log import MessageLog
from uuid import UUID

class LogService:

    @staticmethod
    async def insert_message(db: asyncpg.Connection, thread_id: UUID, role: str, message: str) -> None:
        query = """
            INSERT INTO chat_logs (thread_id, role, message)
            VALUES ($1, $2, $3)
        """

        await db.execute(query, thread_id, role, message)

    @staticmethod
    async def get_messages_from_thread(db: asyncpg.Connection, thread_id: UUID, limit: int = 20) -> List[MessageLog]:
        
        query = """
            SELECT id, thread_id, role, message, created_at
            FROM chat_logs
            WHERE thread_id = $1
            ORDER BY created_at ASC
            LIMIT $2
        """
        rows = await db.fetch(query, thread_id, limit)

        return[ 
            
            MessageLog(
                id=row["id"],
                thread_id=row["thread_id"],
                role=row["role"],
                message=row["message"],
                created_at=row["created_at"],
            )

            for row in rows
        ]
