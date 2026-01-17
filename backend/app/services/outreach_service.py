import asyncpg
from typing import List
from app.schemas.admin import Outreach, OutreachRequest


class OutreachService:

    @staticmethod
    async def log_outreach(db: asyncpg.Connection, outreach: OutreachRequest):
        """
        Insert an outreach record into the database.
        Extracts name from email (part before @) or uses empty string.
        Sets inbound=True for landing page submissions.
        """
        # Extract name from email (part before @) or use empty string
        name = outreach.email.split("@")[0] if "@" in outreach.email else ""
        
        query = """
            INSERT INTO outreach (name, email, phone, notes, role, inbound)
            VALUES ($1, $2, $3, $4, $5, $6)
        """
        
        await db.execute(
            query,
            name,
            outreach.email,
            None,  # phone not collected from landing page
            outreach.notes,
            outreach.role,
            True  # inbound=True for landing page submissions
        )

    @staticmethod
    async def get_all_outreach(db: asyncpg.Connection) -> List[Outreach]:
        """
        Fetch all outreach records from the database, ordered by created_at DESC.
        """
        query = """
            SELECT id, name, email, phone, notes, created_at, role, inbound
            FROM outreach
            ORDER BY created_at DESC
        """
        
        rows = await db.fetch(query)
        
        return [
            Outreach(
                id=row["id"],
                name=row["name"],
                email=row["email"],
                phone=row["phone"],
                notes=row["notes"],
                created_at=row["created_at"],
                role=row["role"],
                inbound=row["inbound"]
            )
            for row in rows
        ]
