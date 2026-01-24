# get a list of courses that a user is enrolled in
# get the threads that belong to each course
# includes the /sidebar endpoint, which returns the most recent 5 chats in each course

import asyncpg
from typing import List, Optional, Dict
from app.schemas.course import UserCourse, NewCourse, CoursePolicy, PatchCourse, CourseFile, CourseFileRequest
from app.services.user_service import UserService
from app.services.rules_service import RulesService
from app.schemas.thread import ThreadType
from uuid import UUID
from app.schemas.user import Student, EnrollmentResponse
from fastapi import HTTPException

class CourseService:

    @staticmethod
    async def verify_access(db: asyncpg.Connection, course_id: UUID, user_id: UUID) -> bool:

        query = """
            SELECT student_id
            FROM enrollment
            WHERE course_id = $1 AND student_id = $2
        """

        student_id: UUID = await db.fetchval(query, course_id, user_id)

        return student_id is not None

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
        """Create a new course and duplicate default rules for each mode.
        
        Args:
            db: Database connection
            course: NewCourse object with course details
            instructor_id: UUID of the instructor
            
        Returns:
            UUID of the created course
        """
        # First create the course
        query: str = """
            INSERT INTO courses (name, code, instructor_id, writing_level, testing_level, debugging_level)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        """

        course_id = await db.fetchval(
            query, 
            course.name, 
            course.code, 
            instructor_id, 
            course.writing_level, 
            course.testing_level, 
            course.debugging_level
        )
        
        # Duplicate default rules for each mode and link them
        writing_rules_id = await RulesService.duplicate_default_rules(
            db, course_id, ThreadType.writing, course.writing_level
        )
        testing_rules_id = await RulesService.duplicate_default_rules(
            db, course_id, ThreadType.testing, course.testing_level
        )
        debugging_rules_id = await RulesService.duplicate_default_rules(
            db, course_id, ThreadType.debugging, course.debugging_level
        )
        
        # Update course with rule IDs
        update_query = """
            UPDATE courses
            SET writing_rules = $1, testing_rules = $2, debugging_rules = $3
            WHERE id = $4
        """
        await db.execute(
            update_query,
            writing_rules_id,
            testing_rules_id,
            debugging_rules_id,
            course_id
        )
        
        return course_id


                    

    @staticmethod
    async def get_course_policy(db: asyncpg.Connection, course_id: UUID) -> CoursePolicy:

        query: str = """
            SELECT name, code, writing_level, testing_level, debugging_level
            FROM courses
            WHERE id = $1
        """

        row = await db.fetchrow(query, course_id)

        if row is None:
            return None

        return CoursePolicy(**dict(row))
    
    @staticmethod
    async def get_instructor_id_by_course(db: asyncpg.Connection, course_id: UUID):

        query = """
            SELECT instructor_id
            FROM courses
            WHERE id = $1
        """

        return await db.fetchval(query, course_id)
    
    @staticmethod
    async def update_course(db: asyncpg.Connection, patch: PatchCourse, user_id: UUID):

        verified = await UserService.verify_instructor_course(db, patch.id, user_id)

        if not verified:
            raise PermissionError("Unauthorized to edit course") 

        changes = patch.model_dump(exclude_unset=True)
        changes.pop("id", None)

        if not changes:
            return await CourseService.get_course_policy(db, patch.id)
        
        # Handle level changes - duplicate new defaults if level is being set
        # Get current course state
        current_query = """
            SELECT writing_level, testing_level, debugging_level, writing_rules, testing_rules, debugging_rules
            FROM courses
            WHERE id = $1
        """
        current = await db.fetchrow(current_query, patch.id)
        if current is None:
            raise LookupError("course not found")
        
        # Check for level changes and duplicate rules if needed
        if "writing_level" in changes:
            new_level = changes["writing_level"]
            if new_level is not None and current["writing_level"] != new_level:
                # Duplicate new default rules
                new_rules_id = await RulesService.duplicate_default_rules(
                    db, patch.id, ThreadType.writing, new_level
                )
                # Update the writing_rules foreign key
                await db.execute(
                    "UPDATE courses SET writing_rules = $1 WHERE id = $2",
                    new_rules_id, patch.id
                )
        
        if "testing_level" in changes:
            new_level = changes["testing_level"]
            if new_level is not None and current["testing_level"] != new_level:
                new_rules_id = await RulesService.duplicate_default_rules(
                    db, patch.id, ThreadType.testing, new_level
                )
                await db.execute(
                    "UPDATE courses SET testing_rules = $1 WHERE id = $2",
                    new_rules_id, patch.id
                )
        
        if "debugging_level" in changes:
            new_level = changes["debugging_level"]
            if new_level is not None and current["debugging_level"] != new_level:
                new_rules_id = await RulesService.duplicate_default_rules(
                    db, patch.id, ThreadType.debugging, new_level
                )
                await db.execute(
                    "UPDATE courses SET debugging_rules = $1 WHERE id = $2",
                    new_rules_id, patch.id
                )
        
        set_parts: list[str] = []
        values: list[str] = []
        i=1

        for field, value in changes.items():
            set_parts.append(f"{field} = ${i}")
            values.append(value)
            i+=1

        values.append(patch.id)
        
        query = f"""
            UPDATE courses
            SET {", ".join(set_parts)}
            WHERE id = ${i}
            RETURNING id, name, code, writing_level, testing_level, debugging_level
        """

        row = await db.fetchrow(query, *values)
        if row is None:
            raise LookupError("course not found")

        return CoursePolicy(**dict(row))
    
    @staticmethod
    async def get_course_rules_ids(db: asyncpg.Connection, course_id: UUID) -> Dict[str, Optional[UUID]]:
        """Get all three rules IDs for a course.
        
        Args:
            db: Database connection
            course_id: Course UUID
            
        Returns:
            Dictionary with writing_rules, testing_rules, debugging_rules UUIDs
        """
        query = """
            SELECT writing_rules, testing_rules, debugging_rules
            FROM courses
            WHERE id = $1
        """
        
        row = await db.fetchrow(query, course_id)
        if row is None:
            raise LookupError("course not found")
        
        return {
            "writing_rules": row["writing_rules"],
            "testing_rules": row["testing_rules"],
            "debugging_rules": row["debugging_rules"],
        } 


    @staticmethod
    async def get_enrollment(db: asyncpg.Connection, course_id: UUID) -> List[Student]:

        query = """
            SELECT
                e.student_id,
                p.name,
                COALESCE(au.email, '') as email,
                e.created_at as enrolled_at
            FROM enrollment e
            JOIN profiles p ON p.id = e.student_id
            LEFT JOIN auth.users au ON au.id = e.student_id
            WHERE e.course_id = $1
            ORDER BY e.created_at DESC
        """

        rows = await db.fetch(query, course_id)

        return [
            Student(
                id=row["student_id"], 
                name=row["name"],
                email=row["email"] if row["email"] else "",
                enrolled_at=row["enrolled_at"]
            )
            for row in rows
        ]
    

    @staticmethod
    async def get_enrollment_preview(db: asyncpg.Connection, course_id: UUID) -> List[Student]:

        query = """
            SELECT
                e.student_id,
                p.name,
                COALESCE(au.email, '') as email,
                e.created_at as enrolled_at
            FROM enrollment e
            JOIN profiles p ON p.id = e.student_id
            LEFT JOIN auth.users au ON au.id = e.student_id
            WHERE e.course_id = $1
            ORDER BY e.created_at DESC
            LIMIT 5
        """

        rows = await db.fetch(query, course_id)

        return [
            Student(
                id=row["student_id"], 
                name=row["name"],
                email=row["email"] if row["email"] else "",
                enrolled_at=row["enrolled_at"]
            )
            for row in rows
        ]

    @staticmethod
    async def get_vector_store(db: asyncpg.Connection, course_id: UUID) -> str | None:

        query = """
            SELECT vector_store_id
            FROM courses
            WHERE id = $1
        """

        return await db.fetchval(query, course_id)
    
    @staticmethod
    async def get_course_code(db: asyncpg.Connection, course_id: UUID) -> str | None:

        query = """
            SELECT code
            FROM courses
            WHERE id = $1
        """

        return await db.fetchval(query, course_id)
    
    @staticmethod
    async def add_vector_store(db: asyncpg.Connection, course_id: UUID, vector_store_id: str):

        query = """
            UPDATE courses
            SET vector_store_id = $2
            WHERE id = $1
        """

        await db.execute(query, course_id, vector_store_id)

        return vector_store_id
    
    @staticmethod
    async def add_coursefile(db: asyncpg.Connection, file: CourseFileRequest):

        query = """
            INSERT INTO course_files
            (openai_file_id, supabase_filepath, size, name, course_id, mime_type)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        """

        return await db.fetchval(query, file.openai_file_id, file.supabase_path, file.size, file.name, file.course_id, file.mime_type)
    
    @staticmethod
    async def get_course_files(db: asyncpg.Connection, course_id: UUID):

        query = """
            SELECT id, course_id, name, supabase_filepath, openai_file_id, size, mime_type
            FROM course_files
            WHERE course_id = $1
        """

        rows = await db.fetch(query, course_id)

        return [CourseFile(**dict(row)) for row in rows]
    
    @staticmethod
    async def get_course_file(db: asyncpg.Connection, file_id: UUID):

        query = """
            SELECT id, course_id, name, supabase_filepath, openai_file_id, size, mime_type
            FROM course_files
            WHERE id = $1
        """

        row = await db.fetchrow(query, file_id)

        return CourseFile(**dict(row))
    
    @staticmethod
    async def delete_course_file(db: asyncpg.Connection, file_id: UUID):
        
        query = """
            DELETE FROM course_files
            WHERE id = $1
        """

        await db.execute(query, file_id)
    
    @staticmethod
    async def get_thread_tags(db: asyncpg.Connection, course_id: UUID) -> List[str] | None:
        """Get the thread_tags array from courses table."""
        query = """
            SELECT topics
            FROM courses
            WHERE id = $1
        """
        tags = await db.fetchval(query, course_id)
        return tags if tags else None
    
    @staticmethod
    async def set_thread_tags(db: asyncpg.Connection, course_id: UUID, tags: List[str]) -> None:
        """Update thread_tags array."""
        query = """
            UPDATE courses
            SET topics = $2
            WHERE id = $1
        """
        await db.execute(query, course_id, tags)
