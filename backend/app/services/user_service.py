# handle role, get and update user profile

import asyncpg
from uuid import UUID

class UserService:

    @staticmethod
    async def get_role(db: asyncpg.Connection, user_id: UUID):

        query = """
            SELECT role 
            FROM profiles
            WHERE id = $1
        """

        return await db.fetchval(query, user_id)
    
    @staticmethod
    async def get_name(db: asyncpg.Connection, user_id: UUID):

        query = """
            SELECT name 
            FROM profiles
            WHERE id = $1
        """

        return await db.fetchval(query, user_id)
    
    @staticmethod
    async def verify_instructor_course(db: asyncpg.Connection, course_id: UUID, user_id: UUID):

        query = """
            SELECT instructor_id
            FROM courses
            WHERE id = $1
        """

        instructor_id: UUID = await db.fetchval(query, course_id)

        print(instructor_id)

        print(user_id)

        return str(instructor_id) == str(user_id)
    