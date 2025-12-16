# create and delete threads, update names, etc
# always set the updatedat time

# Write chats back to the db, gather context, delete/revise individual messages

import asyncpg
from typing import Optional, List
from uuid import UUID

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

