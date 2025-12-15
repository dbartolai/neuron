# create and delete threads, update names, etc
# always set the updatedat time

# Write chats back to the db, gather context, delete/revise individual messages

import asyncpg
from typing import List
from app.schemas.log import MessageLog

class ThreadService:

    @staticmethod
    async def get_thread_id(db: asyncpg.Connection, thread_name: str) -> str:
        query = """
            SELECT id FROM threads WHERE title = $1
        """

        return await db.fetch(query, thread_name)

