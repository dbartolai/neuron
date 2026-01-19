import asyncpg
from typing import List
from app.schemas.admin import Outreach, OutreachRequest, OutreachUpdate
from fastapi import HTTPException


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

    @staticmethod
    async def update_outreach(db: asyncpg.Connection, outreach_id: int, updates: OutreachUpdate) -> Outreach:
        """
        Update an outreach record.
        """
        # Build update query dynamically based on provided fields
        update_fields = []
        values = []
        param_index = 1
        
        if updates.name is not None:
            update_fields.append(f"name = ${param_index}")
            values.append(updates.name)
            param_index += 1
        
        if updates.email is not None:
            update_fields.append(f"email = ${param_index}")
            values.append(updates.email)
            param_index += 1
        
        if updates.phone is not None:
            update_fields.append(f"phone = ${param_index}")
            values.append(updates.phone)
            param_index += 1
        
        if updates.notes is not None:
            update_fields.append(f"notes = ${param_index}")
            values.append(updates.notes)
            param_index += 1
        
        if updates.role is not None:
            update_fields.append(f"role = ${param_index}")
            values.append(updates.role)
            param_index += 1
        
        if updates.purpose is not None:
            update_fields.append(f"purpose = ${param_index}")
            values.append(updates.purpose)
            param_index += 1
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        values.append(outreach_id)
        
        query = f"""
            UPDATE outreach
            SET {', '.join(update_fields)}
            WHERE id = ${param_index}
            RETURNING id, name, email, phone, notes, created_at, role, purpose
        """
        
        row = await db.fetchrow(query, *values)
        
        if row is None:
            raise HTTPException(status_code=404, detail="Outreach entry not found")
        
        return Outreach(
            id=row["id"],
            name=row["name"],
            email=row["email"],
            phone=row["phone"],
            notes=row["notes"],
            created_at=row["created_at"],
            role=row["role"],
            purpose=row["purpose"] if row["purpose"] is not None else None
        )

    @staticmethod
    async def delete_outreach(db: asyncpg.Connection, outreach_id: int) -> bool:
        """
        Delete an outreach record.
        """
        query = """
            DELETE FROM outreach
            WHERE id = $1
            RETURNING id
        """
        
        row = await db.fetchrow(query, outreach_id)
        
        if row is None:
            raise HTTPException(status_code=404, detail="Outreach entry not found")
        
        return True

    @staticmethod
    async def batch_delete_outreach(db: asyncpg.Connection, outreach_ids: List[int]) -> int:
        """
        Batch delete multiple outreach records.
        Returns the number of deleted records.
        """
        if not outreach_ids:
            return 0
        
        query = """
            DELETE FROM outreach
            WHERE id = ANY($1::int[])
            RETURNING id
        """
        
        rows = await db.fetch(query, outreach_ids)
        return len(rows)
