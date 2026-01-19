"""Service for managing student insights in the insights table."""

import asyncpg
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.services.chat_service import ChatService
from app.services.thread_service import ThreadService
from app.services.ai_events_service import AIEventsService


class InsightsStudentService:
    """Service for managing student insights generation and storage."""

    @staticmethod
    async def get_insights_by_id(db: asyncpg.Connection, insights_id: UUID) -> Optional[dict]:
        """Get insights by ID."""
        query = """
            SELECT id, created_at, summary, renewable_at
            FROM insights
            WHERE id = $1
        """
        row = await db.fetchrow(query, insights_id)
        if row is None:
            return None
        return dict(row)

    @staticmethod
    async def create_insights(
        db: asyncpg.Connection,
        summary: str,
    ) -> UUID:
        """Create a new insights record."""
        query = """
            INSERT INTO insights (summary, renewable_at)
            VALUES ($1, NOW() + INTERVAL '7 days')
            RETURNING id
        """
        row = await db.fetchrow(query, summary)
        return row["id"]

    @staticmethod
    async def update_insights(
        db: asyncpg.Connection,
        insights_id: UUID,
        summary: str,
    ) -> None:
        """Update an existing insights record and reset renewable_at."""
        query = """
            UPDATE insights
            SET summary = $2,
                renewable_at = NOW() + INTERVAL '7 days',
                created_at = NOW()
            WHERE id = $1
        """
        await db.execute(query, insights_id, summary)

    @staticmethod
    async def get_enrollment_insights_id(
        db: asyncpg.Connection,
        course_id: UUID,
        student_id: UUID,
    ) -> Optional[UUID]:
        """Get the insights_id for a student's enrollment."""
        query = """
            SELECT insights_id
            FROM enrollment
            WHERE course_id = $1 AND student_id = $2
        """
        return await db.fetchval(query, course_id, student_id)

    @staticmethod
    async def set_enrollment_insights_id(
        db: asyncpg.Connection,
        course_id: UUID,
        student_id: UUID,
        insights_id: UUID,
    ) -> None:
        """Set the insights_id for a student's enrollment."""
        query = """
            UPDATE enrollment
            SET insights_id = $3
            WHERE course_id = $1 AND student_id = $2
        """
        await db.execute(query, course_id, student_id, insights_id)

    @staticmethod
    async def generate_and_store_insights(
        db: asyncpg.Connection,
        course_id: UUID,
        student_id: UUID,
        instructor_id: UUID,
        is_refresh: bool = False,
    ) -> dict:
        """Generate insights from thread summaries and store in database."""
        # Get threads with summaries
        threads = await ThreadService.get_student_threads_with_summaries(
            db, course_id, student_id, instructor_id
        )
        
        # Extract summaries (filter out empty ones)
        summaries = [t["summary"] for t in threads if t.get("summary") and t["summary"].strip()]
        
        if not summaries:
            raise ValueError("No thread summaries available for analysis.")
        
        # Generate pedagogical analysis
        analysis = await ChatService.generate_pedagogical_analysis(
            thread_summaries=summaries,
            db=db,
            user_id=instructor_id,
            student_id=student_id,
        )
        
        # Get existing insights_id if any
        existing_insights_id = await InsightsStudentService.get_enrollment_insights_id(
            db, course_id, student_id
        )
        
        if is_refresh and existing_insights_id:
            # Update existing insights
            await InsightsStudentService.update_insights(
                db, existing_insights_id, analysis
            )
            insights_id = existing_insights_id
        else:
            # Create new insights
            insights_id = await InsightsStudentService.create_insights(db, analysis)
            # Link to enrollment
            await InsightsStudentService.set_enrollment_insights_id(
                db, course_id, student_id, insights_id
            )
        
        # Return the insights data
        insights_data = await InsightsStudentService.get_insights_by_id(db, insights_id)
        return insights_data
