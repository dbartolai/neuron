# get a list of courses that a user is enrolled in
# get the threads that belong to each course
# includes the /sidebar endpoint, which returns the most recent 5 chats in each course

import asyncpg
from typing import List
from app.schemas.course import UserCourse, NewCourse, CoursePolicy
from uuid import UUID
from fastapi import HTTPException

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

        course_name: str = await db.fetchval(query, course_id)

        if course_name is None:
            raise HTTPException(status_code=404, detail="course not found")
        
        return course_name


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
    
    @staticmethod
    async def get_id_from_code(db: asyncpg.Connection, course_code: str) -> UUID:

        query: str = """
            SELECT id
            FROM courses 
            WHERE code = $1
        """

        course_id: UUID = await db.fetchval(query, course_code)
        if course_id is None:
            raise HTTPException(status_code=404, detail="Invalid course code")

        return course_id
    
    @staticmethod
    async def new_course(db: asyncpg.Connection, course: NewCourse, instructor_id: UUID):
        
        query: str = """
            INSERT INTO courses (name, code, instructor_id, allow_code_in, allow_code_out, allow_psuedocode_out, guardrail_level)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        """

        await db.execute(query, course.name, course.code, instructor_id, course.allow_code_in, course.allow_code_out, course.allow_pseudocode_out, course.guardrail_level)


                    

    @staticmethod
    async def get_course_policy(db: asyncpg.Connection, course_id: UUID) -> CoursePolicy:

        query: str = """
            SELECT name, allow_code_in, allow_code_out, allow_pseudocode_out, guardrail_level
            FROM courses
            WHERE id = $1
        """

        row = await db.fetchrow(query, course_id)

        return CoursePolicy(**dict(row))
