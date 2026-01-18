import asyncpg
from uuid import UUID
from fastapi import HTTPException 

class EnrollService:

    @staticmethod
    async def enroll_student(db: asyncpg.Connection, student_id: UUID, course_id: UUID):

        query = """
            INSERT INTO enrollment (course_id, student_id)
            VALUES ($1, $2)
        """

        try:
            await db.execute(query, course_id, student_id)
            
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=409, detail="Already enrolled")

    @staticmethod
    async def verify_student_enrollment(db: asyncpg.Connection, course_id: UUID, user_id: UUID) -> bool:
        """Verify that a student is enrolled in a course."""
        query = """
            SELECT student_id
            FROM enrollment
            WHERE course_id = $1 AND student_id = $2
        """
        student_id: UUID = await db.fetchval(query, course_id, user_id)
        return student_id is not None

