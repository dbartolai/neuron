import asyncpg
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.schemas.admin import Interaction, InteractionRequest, InteractionUpdate
from fastapi import HTTPException


class InteractionService:

    @staticmethod
    async def get_interactions_by_outreach(db: asyncpg.Connection, outreach_id: int) -> List[Interaction]:
        """
        Fetch all interactions for a specific outreach entry.
        """
        query = """
            SELECT id, created_at, type, notes, employee_id, instructor_id, outreach_id, name
            FROM interactions
            WHERE outreach_id = $1
            ORDER BY created_at DESC
        """
        
        rows = await db.fetch(query, outreach_id)
        
        return [
            Interaction(
                id=row["id"],
                created_at=row["created_at"],
                type=row["type"] or "email",
                notes=row["notes"],
                employee_id=row["employee_id"],
                instructor_id=row["instructor_id"],
                outreach_id=row["outreach_id"],
                name=row["name"]
            )
            for row in rows
        ]

    @staticmethod
    async def create_interaction(
        db: asyncpg.Connection,
        interaction_data: InteractionRequest,
        employee_id: UUID
    ) -> Interaction:
        """
        Create a new interaction record.
        """
        query = """
            INSERT INTO interactions (type, notes, employee_id, outreach_id, name)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at, type, notes, employee_id, instructor_id, outreach_id, name
        """
        
        row = await db.fetchrow(
            query,
            interaction_data.type or "email",
            interaction_data.notes,
            employee_id,
            interaction_data.outreach_id,
            interaction_data.name
        )
        
        return Interaction(
            id=row["id"],
            created_at=row["created_at"],
            type=row["type"] or "email",
            notes=row["notes"],
            employee_id=row["employee_id"],
            instructor_id=row["instructor_id"],
            outreach_id=row["outreach_id"],
            name=row["name"]
        )

    @staticmethod
    async def update_interaction(
        db: asyncpg.Connection,
        interaction_id: UUID,
        updates: InteractionUpdate
    ) -> Interaction:
        """
        Update an existing interaction.
        """
        # Build update query dynamically based on provided fields
        update_fields = []
        values = []
        param_index = 1
        
        if updates.notes is not None:
            update_fields.append(f"notes = ${param_index}")
            values.append(updates.notes)
            param_index += 1
        
        if updates.type is not None:
            update_fields.append(f"type = ${param_index}")
            values.append(updates.type)
            param_index += 1
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        values.append(interaction_id)
        
        query = f"""
            UPDATE interactions
            SET {', '.join(update_fields)}
            WHERE id = ${param_index}
            RETURNING id, created_at, type, notes, employee_id, instructor_id, outreach_id, name
        """
        
        row = await db.fetchrow(query, *values)
        
        if row is None:
            raise HTTPException(status_code=404, detail="Interaction not found")
        
        return Interaction(
            id=row["id"],
            created_at=row["created_at"],
            type=row["type"] or "email",
            notes=row["notes"],
            employee_id=row["employee_id"],
            instructor_id=row["instructor_id"],
            outreach_id=row["outreach_id"],
            name=row["name"]
        )

    @staticmethod
    async def delete_interaction(db: asyncpg.Connection, interaction_id: UUID) -> bool:
        """
        Delete an interaction record.
        """
        query = """
            DELETE FROM interactions
            WHERE id = $1
            RETURNING id
        """
        
        row = await db.fetchrow(query, interaction_id)
        
        if row is None:
            raise HTTPException(status_code=404, detail="Interaction not found")
        
        return True
