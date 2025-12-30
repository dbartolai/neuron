# get a list of courses that a user is enrolled in
# get the threads that belong to each course
# includes the /sidebar endpoint, which returns the most recent 5 chats in each course

import asyncpg
from typing import List
from app.schemas.course import UserCourse
from uuid import UUID

class CourseService:

    @staticmethod
    async def get_student_courses(db: asyncpg.Connection, user_id: UUID) -> List[UserCourse]:

        query = """
            SELECT
                c.id,
                c.name,
                c.code,
                c.instructor_id
            FROM enrollment e
            JOIN courses c ON c.id = e.course_id
            WHERE e.student_id = $1
        """

        rows = await db.fetch(query, user_id)

        return [UserCourse(**dict(row)) for row in rows]
    
    @staticmethod
    async def get_course_name_by_id(db: asyncpg.Connection, course_id: UUID) -> str:

        query = """
            SELECT name
            FROM courses
            WHERE id = $1
        """

        return await db.fetch(query, course_id)


    @staticmethod
    async def get_instructor_courses(db: asyncpg.Connection, user_id: UUID) -> List[UserCourse]:

        query: str = """
            SELECT 
                id,
                name,
                code,
                instructor_id
            FROM courses
            WHERE instructor_id = $1
        """

        rows = await db.fetch(query, user_id)
        return [UserCourse(**dict(row)) for row in rows]

