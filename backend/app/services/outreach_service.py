import asyncpg
from typing import List
from app.schemas.admin import Outreach, OutreachRequest


class OutreachService:

    @staticmethod
    async def log_outreach(db: asyncpg.Connection, outreach: OutreachRequest):
        """
        Insert an outreach record into the database.
        Uses provided name, or extracts from email (part before @) if not provided, or uses empty string.
        """
        # Use provided name, or extract from email (part before @) if not provided, or use empty string
        name = outreach.name if outreach.name else (outreach.email.split("@")[0] if "@" in outreach.email else "")
        
        query = """
            INSERT INTO outreach (name, email, phone, notes, role, purpose)
            VALUES ($1, $2, $3, $4, $5, $6)
        """
        
        await db.execute(
            query,
            name,
            outreach.email,
            None,  # phone not collected from landing page
            outreach.notes,
            outreach.role,
            outreach.purpose
        )

    @staticmethod
    async def get_all_outreach(db: asyncpg.Connection) -> List[Outreach]:
        """
        Fetch all outreach records from the database, ordered by created_at DESC.
        """
        query = """
            SELECT id, name, email, phone, notes, created_at, role, purpose
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
                purpose=row["purpose"] if row["purpose"] is not None else None
            )
            for row in rows
        ]

    @staticmethod
    async def create_outbound_outreach(db: asyncpg.Connection, outreach: OutreachRequest):
        """
        Manually create an outreach record (for admin logging).
        """
        # Use provided name, or extract from email (part before @) if not provided, or use empty string
        name = outreach.name if outreach.name else (outreach.email.split("@")[0] if "@" in outreach.email else "")
        
        query = """
            INSERT INTO outreach (name, email, phone, notes, role, purpose)
            VALUES ($1, $2, $3, $4, $5, $6)
        """
        
        await db.execute(
            query,
            name,
            outreach.email,
            None,  # phone not provided in OutreachRequest
            outreach.notes,
            outreach.role,
            outreach.purpose
        )
