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

