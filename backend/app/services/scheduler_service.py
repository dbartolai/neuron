import asyncpg
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID
from app.schemas.admin import SchedulerResponse, InterestRequest, TimeslotUpdate
from fastapi import HTTPException


class SchedulerService:

    @staticmethod
    async def get_all_scheduler_entries(db: asyncpg.Connection) -> List[SchedulerResponse]:
        """
        Fetch all scheduler records from the database, ordered by timeslot.
        Includes employee name from profiles table.
        """
        query = """
            SELECT 
                s.id, 
                s.created_at, 
                s.timeslot, 
                s.employee_id, 
                s.instructor_id, 
                s.name, 
                s.email, 
                s.notes, 
                s.purpose,
                s.admin_notes,
                p.name as employee_name
            FROM scheduler s
            LEFT JOIN profiles p ON p.id = s.employee_id
            ORDER BY s.timeslot ASC
        """
        
        rows = await db.fetch(query)
        
        return [
            SchedulerResponse(
                id=row["id"],
                created_at=row["created_at"],
                timeslot=row["timeslot"],
                employee_id=row["employee_id"],
                employee_name=row["employee_name"],
                instructor_id=row["instructor_id"],
                name=row["name"] or "",
                email=row["email"] or "",
                notes=row["notes"],
                admin_notes=row.get("admin_notes"),
                purpose=row["purpose"]
            )
            for row in rows
        ]

    @staticmethod
    async def get_available_timeslots(db: asyncpg.Connection) -> List[SchedulerResponse]:
        """
        Fetch all unbooked future timeslots, ordered chronologically.
        """
        now = datetime.utcnow()
        query = """
            SELECT 
                s.id, 
                s.created_at, 
                s.timeslot, 
                s.employee_id, 
                s.instructor_id, 
                s.name, 
                s.email, 
                s.notes, 
                s.purpose,
                s.admin_notes,
                p.name as employee_name
            FROM scheduler s
            LEFT JOIN profiles p ON p.id = s.employee_id
            WHERE s.instructor_id IS NULL
            AND s.timeslot > $1
            ORDER BY s.timeslot ASC
        """
        
        rows = await db.fetch(query, now)
        
        return [
            SchedulerResponse(
                id=row["id"],
                created_at=row["created_at"],
                timeslot=row["timeslot"],
                employee_id=row["employee_id"],
                employee_name=row["employee_name"],
                instructor_id=row["instructor_id"],
                name=row["name"] or "",
                email=row["email"] or "",
                notes=row["notes"],
                admin_notes=row.get("admin_notes"),
                purpose=row["purpose"]
            )
            for row in rows
        ]

    @staticmethod
    async def get_employee_timeslots(db: asyncpg.Connection, employee_id: UUID) -> List[SchedulerResponse]:
        """
        Get all timeslots for a specific employee, ordered by timeslot.
        """
        query = """
            SELECT 
                s.id, 
                s.created_at, 
                s.timeslot, 
                s.employee_id, 
                s.instructor_id, 
                s.name, 
                s.email, 
                s.notes, 
                s.purpose,
                s.admin_notes,
                p.name as employee_name
            FROM scheduler s
            LEFT JOIN profiles p ON p.id = s.employee_id
            WHERE s.employee_id = $1
            ORDER BY s.timeslot ASC
        """
        
        rows = await db.fetch(query, employee_id)
        
        return [
            SchedulerResponse(
                id=row["id"],
                created_at=row["created_at"],
                timeslot=row["timeslot"],
                employee_id=row["employee_id"],
                employee_name=row["employee_name"],
                instructor_id=row["instructor_id"],
                name=row["name"] or "",
                email=row["email"] or "",
                notes=row["notes"],
                admin_notes=row.get("admin_notes"),
                purpose=row["purpose"]
            )
            for row in rows
        ]

    @staticmethod
    async def _check_overlap(db: asyncpg.Connection, timeslot: datetime, employee_id: UUID) -> bool:
        """
        Check if a timeslot overlaps with any existing timeslot for this employee.
        Returns True if there's an overlap, False otherwise.
        
        A timeslot runs from T to T+30min.
        Overlap occurs if: new_start < existing_end AND new_end > existing_start
        """
        slot_end = timeslot + timedelta(minutes=30)
        
        query = """
            SELECT id FROM scheduler
            WHERE employee_id = $1
            AND timeslot < $3
            AND (timeslot + INTERVAL '30 minutes') > $2
        """
        
        row = await db.fetchrow(query, employee_id, timeslot, slot_end)
        return row is not None

    @staticmethod
    async def create_timeslot(db: asyncpg.Connection, timeslot: datetime, employee_id: UUID) -> int:
        """
        Create a single timeslot with overlap validation.
        Returns the ID of the created timeslot.
        Raises HTTPException if overlap detected.
        """
        # Check for overlaps
        has_overlap = await SchedulerService._check_overlap(db, timeslot, employee_id)
        if has_overlap:
            raise HTTPException(
                status_code=400,
                detail=f"Timeslot at {timeslot} overlaps with an existing timeslot for this employee"
            )
        
        query = """
            INSERT INTO scheduler (timeslot, employee_id, name, email)
            VALUES ($1, $2, '', '')
            RETURNING id
        """
        
        row = await db.fetchrow(query, timeslot, employee_id)
        return row["id"]

    @staticmethod
    async def batch_create_timeslots(db: asyncpg.Connection, timeslots: List[datetime], employee_id: UUID) -> List[int]:
        """
        Batch create timeslots with validation.
        Validates all timeslots before creating any (all-or-nothing).
        Returns list of created timeslot IDs.
        """
        # Validate all timeslots first
        for timeslot in timeslots:
            has_overlap = await SchedulerService._check_overlap(db, timeslot, employee_id)
            if has_overlap:
                raise HTTPException(
                    status_code=400,
                    detail=f"Timeslot at {timeslot} overlaps with an existing timeslot for this employee"
                )
        
        # Also check for overlaps within the batch itself
        sorted_slots = sorted(timeslots)
        for i in range(len(sorted_slots) - 1):
            current_end = sorted_slots[i] + timedelta(minutes=30)
            next_start = sorted_slots[i + 1]
            if next_start < current_end:
                raise HTTPException(
                    status_code=400,
                    detail=f"Timeslots in batch overlap: {sorted_slots[i]} and {sorted_slots[i + 1]}"
                )
        
        # Create all timeslots
        created_ids = []
        for timeslot in timeslots:
            query = """
                INSERT INTO scheduler (timeslot, employee_id, name, email)
                VALUES ($1, $2, '', '')
                RETURNING id
            """
            row = await db.fetchrow(query, timeslot, employee_id)
            created_ids.append(row["id"])
        
        return created_ids

    @staticmethod
    async def book_timeslot(
        db: asyncpg.Connection,
        timeslot_id: int,
        name: str,
        email: str,
        notes: Optional[str] = None,
        purpose: Optional[str] = None,
        instructor_id: Optional[UUID] = None
    ) -> SchedulerResponse:
        """
        Book an available timeslot with booking data.
        Raises HTTPException if timeslot is already booked or doesn't exist.
        """
        # Check if timeslot exists and is available
        check_query = """
            SELECT id, instructor_id FROM scheduler WHERE id = $1
        """
        row = await db.fetchrow(check_query, timeslot_id)
        
        if row is None:
            raise HTTPException(status_code=404, detail="Timeslot not found")
        
        if row["instructor_id"] is not None:
            raise HTTPException(status_code=400, detail="Timeslot is already booked")
        
        # Update the timeslot with booking information
        update_query = """
            UPDATE scheduler
            SET instructor_id = $1,
                name = $2,
                email = $3,
                notes = $4,
                purpose = $5
            WHERE id = $6
            RETURNING id, created_at, timeslot, employee_id, instructor_id, name, email, notes, purpose, admin_notes
        """
        
        updated_row = await db.fetchrow(
            update_query,
            instructor_id,
            name,
            email,
            notes,
            purpose,
            timeslot_id
        )
        
        # Get employee name
        employee_name_query = "SELECT name FROM profiles WHERE id = $1"
        employee_name = await db.fetchval(employee_name_query, updated_row["employee_id"])
        
        return SchedulerResponse(
            id=updated_row["id"],
            created_at=updated_row["created_at"],
            timeslot=updated_row["timeslot"],
            employee_id=updated_row["employee_id"],
            employee_name=employee_name,
            instructor_id=updated_row["instructor_id"],
            name=updated_row["name"] or "",
            email=updated_row["email"] or "",
            notes=updated_row["notes"],
            admin_notes=updated_row.get("admin_notes"),
            purpose=updated_row["purpose"]
        )

    @staticmethod
    async def update_timeslot(db: asyncpg.Connection, timeslot_id: int, updates: TimeslotUpdate) -> SchedulerResponse:
        """
        Update a timeslot record.
        """
        # Build update query dynamically based on provided fields
        update_fields = []
        values = []
        param_index = 1
        
        if updates.timeslot is not None:
            # Check for overlaps if timeslot is being changed
            # First get the current employee_id
            current_query = "SELECT employee_id FROM scheduler WHERE id = $1"
            current_row = await db.fetchrow(current_query, timeslot_id)
            if current_row is None:
                raise HTTPException(status_code=404, detail="Timeslot not found")
            
            employee_id = current_row["employee_id"]
            has_overlap = await SchedulerService._check_overlap(db, updates.timeslot, employee_id)
            if has_overlap:
                raise HTTPException(
                    status_code=400,
                    detail=f"Updated timeslot at {updates.timeslot} overlaps with an existing timeslot"
                )
            
            update_fields.append(f"timeslot = ${param_index}")
            values.append(updates.timeslot)
            param_index += 1
        
        if updates.name is not None:
            update_fields.append(f"name = ${param_index}")
            values.append(updates.name)
            param_index += 1
        
        if updates.email is not None:
            update_fields.append(f"email = ${param_index}")
            values.append(updates.email)
            param_index += 1
        
        if updates.notes is not None:
            update_fields.append(f"notes = ${param_index}")
            values.append(updates.notes)
            param_index += 1
        
        if updates.admin_notes is not None:
            update_fields.append(f"admin_notes = ${param_index}")
            values.append(updates.admin_notes)
            param_index += 1
        
        if updates.purpose is not None:
            update_fields.append(f"purpose = ${param_index}")
            values.append(updates.purpose)
            param_index += 1
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        values.append(timeslot_id)
        
        query = f"""
            UPDATE scheduler
            SET {', '.join(update_fields)}
            WHERE id = ${param_index}
            RETURNING id, created_at, timeslot, employee_id, instructor_id, name, email, notes, purpose, admin_notes
        """
        
        row = await db.fetchrow(query, *values)
        
        if row is None:
            raise HTTPException(status_code=404, detail="Timeslot not found")
        
        # Get employee name
        employee_name_query = "SELECT name FROM profiles WHERE id = $1"
        employee_name = await db.fetchval(employee_name_query, row["employee_id"])
        
        return SchedulerResponse(
            id=row["id"],
            created_at=row["created_at"],
            timeslot=row["timeslot"],
            employee_id=row["employee_id"],
            employee_name=employee_name,
            instructor_id=row["instructor_id"],
            name=row["name"] or "",
            email=row["email"] or "",
            notes=row["notes"],
            admin_notes=row.get("admin_notes"),
            purpose=row["purpose"]
        )

    @staticmethod
    async def delete_timeslot(db: asyncpg.Connection, timeslot_id: int) -> bool:
        """
        Delete a timeslot record.
        """
        query = """
            DELETE FROM scheduler
            WHERE id = $1
            RETURNING id
        """
        
        row = await db.fetchrow(query, timeslot_id)
        
        if row is None:
            raise HTTPException(status_code=404, detail="Timeslot not found")
        
        return True

    @staticmethod
    async def batch_delete_timeslots(db: asyncpg.Connection, timeslot_ids: List[int]) -> int:
        """
        Batch delete multiple timeslot records.
        Returns the number of deleted records.
        """
        if not timeslot_ids:
            return 0
        
        query = """
            DELETE FROM scheduler
            WHERE id = ANY($1::int[])
            RETURNING id
        """
        
        rows = await db.fetch(query, timeslot_ids)
        return len(rows)

    @staticmethod
    async def mass_create_timeslots(
        db: asyncpg.Connection,
        start_time: datetime,
        end_time: datetime,
        employee_id: UUID
    ) -> List[int]:
        """
        Mass create timeslots at :00 and :30 intervals between start_time and end_time.
        Returns list of created timeslot IDs.
        """
        if start_time >= end_time:
            raise HTTPException(status_code=400, detail="Start time must be before end time")
        
        # Generate all :00 and :30 timeslots between start and end
        timeslots = []
        current = start_time.replace(second=0, microsecond=0)
        
        # Round to nearest :00 or :30
        if current.minute > 30:
            current = current.replace(minute=0) + timedelta(hours=1)
        elif current.minute > 0:
            current = current.replace(minute=30)
        
        while current <= end_time:
            timeslots.append(current)
            current += timedelta(minutes=30)
        
        if not timeslots:
            raise HTTPException(status_code=400, detail="No valid timeslots generated in the specified range")
        
        # Validate all timeslots for overlaps before creating any
        for timeslot in timeslots:
            has_overlap = await SchedulerService._check_overlap(db, timeslot, employee_id)
            if has_overlap:
                raise HTTPException(
                    status_code=400,
                    detail=f"Timeslot at {timeslot} overlaps with an existing timeslot for this employee"
                )
        
        # Also check for overlaps within the batch itself
        sorted_slots = sorted(timeslots)
        for i in range(len(sorted_slots) - 1):
            current_end = sorted_slots[i] + timedelta(minutes=30)
            next_start = sorted_slots[i + 1]
            if next_start < current_end:
                raise HTTPException(
                    status_code=400,
                    detail=f"Timeslots in batch overlap: {sorted_slots[i]} and {sorted_slots[i + 1]}"
                )
        
        # Create all timeslots
        created_ids = []
        for timeslot in timeslots:
            query = """
                INSERT INTO scheduler (timeslot, employee_id, name, email)
                VALUES ($1, $2, '', '')
                RETURNING id
            """
            row = await db.fetchrow(query, timeslot, employee_id)
            created_ids.append(row["id"])
        
        return created_ids
