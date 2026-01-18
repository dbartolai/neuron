import asyncpg
from typing import List, Optional
from datetime import datetime, timedelta
from uuid import UUID
from app.schemas.admin import SchedulerResponse, InterestRequest
from fastapi import HTTPException


class SchedulerService:

    @staticmethod
    async def get_all_scheduler_entries(db: asyncpg.Connection) -> List[SchedulerResponse]:
        """
        Fetch all scheduler records from the database, ordered by timeslot.
        """
        query = """
            SELECT id, created_at, timeslot, employee_id, instructor_id, name, email, notes, purpose
            FROM scheduler
            ORDER BY timeslot ASC
        """
        
        rows = await db.fetch(query)
        
        return [
            SchedulerResponse(
                id=row["id"],
                created_at=row["created_at"],
                timeslot=row["timeslot"],
                employee_id=row["employee_id"],
                instructor_id=row["instructor_id"],
                name=row["name"] or "",
                email=row["email"] or "",
                notes=row["notes"],
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
            SELECT id, created_at, timeslot, employee_id, instructor_id, name, email, notes, purpose
            FROM scheduler
            WHERE instructor_id IS NULL
            AND timeslot > $1
            ORDER BY timeslot ASC
        """
        
        rows = await db.fetch(query, now)
        
        return [
            SchedulerResponse(
                id=row["id"],
                created_at=row["created_at"],
                timeslot=row["timeslot"],
                employee_id=row["employee_id"],
                instructor_id=row["instructor_id"],
                name=row["name"] or "",
                email=row["email"] or "",
                notes=row["notes"],
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
            SELECT id, created_at, timeslot, employee_id, instructor_id, name, email, notes, purpose
            FROM scheduler
            WHERE employee_id = $1
            ORDER BY timeslot ASC
        """
        
        rows = await db.fetch(query, employee_id)
        
        return [
            SchedulerResponse(
                id=row["id"],
                created_at=row["created_at"],
                timeslot=row["timeslot"],
                employee_id=row["employee_id"],
                instructor_id=row["instructor_id"],
                name=row["name"] or "",
                email=row["email"] or "",
                notes=row["notes"],
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
            RETURNING id, created_at, timeslot, employee_id, instructor_id, name, email, notes, purpose
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
        
        return SchedulerResponse(
            id=updated_row["id"],
            created_at=updated_row["created_at"],
            timeslot=updated_row["timeslot"],
            employee_id=updated_row["employee_id"],
            instructor_id=updated_row["instructor_id"],
            name=updated_row["name"] or "",
            email=updated_row["email"] or "",
            notes=updated_row["notes"],
            purpose=updated_row["purpose"]
        )
