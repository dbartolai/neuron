import asyncpg
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from app.schemas.announcement import Announcement, AnnouncementRequest, AnnouncementUpdate, ReactionCounts, ReactionResponse, UnseenCountResponse
from app.schemas.course import CourseFile
from app.services.course_service import CourseService
from fastapi import HTTPException

class AnnouncementService:

    @staticmethod
    async def create_announcement(
        db: asyncpg.Connection,
        course_id: UUID,
        instructor_id: UUID,
        title: str,
        content: str,
        file_ids: Optional[List[UUID]] = None
    ) -> UUID:
        """Create a new announcement and optionally link files."""
        
        # Verify instructor owns the course
        from app.services.user_service import UserService
        if not await UserService.verify_instructor_course(db, course_id, instructor_id):
            raise HTTPException(status_code=401, detail="Not authorized to create announcement for this course")
        
        # Insert announcement
        query = """
            INSERT INTO announcements (course_id, instructor_id, title, content)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        """
        
        announcement_id = await db.fetchval(query, course_id, instructor_id, title, content)
        
        # Link files if provided
        if file_ids:
            await AnnouncementService._link_files(db, announcement_id, file_ids, course_id)
        
        return announcement_id
    
    @staticmethod
    async def _link_files(
        db: asyncpg.Connection,
        announcement_id: UUID,
        file_ids: List[UUID],
        course_id: UUID
    ):
        """Link files to an announcement, verifying they belong to the course."""
        
        # Verify all files belong to the course
        for file_id in file_ids:
            file = await CourseService.get_course_file(db, file_id)
            if file.course_id != course_id:
                raise HTTPException(status_code=400, detail=f"File {file_id} does not belong to course {course_id}")
        
        # Insert file links
        query = """
            INSERT INTO announcement_files (announcement_id, file_id)
            VALUES ($1, $2)
            ON CONFLICT (announcement_id, file_id) DO NOTHING
        """
        
        for file_id in file_ids:
            await db.execute(query, announcement_id, file_id)
    
    @staticmethod
    async def get_announcements_by_course(
        db: asyncpg.Connection,
        course_id: UUID
    ) -> List[Announcement]:
        """Get all announcements for a course, ordered by newest first."""
        
        query = """
            SELECT 
                a.id,
                a.course_id,
                a.instructor_id,
                a.title,
                a.content,
                a.created_at,
                a.updated_at
            FROM announcements a
            WHERE a.course_id = $1
            ORDER BY a.created_at DESC
        """
        
        rows = await db.fetch(query, course_id)
        
        announcements = []
        for row in rows:
            # Get files for this announcement
            files = await AnnouncementService._get_announcement_files(db, row["id"])
            
            announcement = Announcement(
                id=row["id"],
                course_id=row["course_id"],
                instructor_id=row["instructor_id"],
                title=row["title"],
                content=row["content"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                files=files
            )
            announcements.append(announcement)
        
        return announcements
    
    @staticmethod
    async def get_announcement(
        db: asyncpg.Connection,
        announcement_id: UUID
    ) -> Announcement:
        """Get a single announcement with its files."""
        
        query = """
            SELECT 
                a.id,
                a.course_id,
                a.instructor_id,
                a.title,
                a.content,
                a.created_at,
                a.updated_at
            FROM announcements a
            WHERE a.id = $1
        """
        
        row = await db.fetchrow(query, announcement_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Announcement not found")
        
        files = await AnnouncementService._get_announcement_files(db, announcement_id)
        
        return Announcement(
            id=row["id"],
            course_id=row["course_id"],
            instructor_id=row["instructor_id"],
            title=row["title"],
            content=row["content"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            files=files
        )
    
    @staticmethod
    async def _get_announcement_files(
        db: asyncpg.Connection,
        announcement_id: UUID
    ) -> List[CourseFile]:
        """Get all files linked to an announcement."""
        
        query = """
            SELECT 
                cf.id,
                cf.course_id,
                cf.name,
                cf.supabase_filepath,
                cf.openai_file_id,
                cf.size,
                cf.mime_type
            FROM announcement_files af
            JOIN course_files cf ON cf.id = af.file_id
            WHERE af.announcement_id = $1
        """
        
        rows = await db.fetch(query, announcement_id)
        return [CourseFile(**dict(row)) for row in rows]
    
    @staticmethod
    async def update_announcement(
        db: asyncpg.Connection,
        announcement_id: UUID,
        instructor_id: UUID,
        title: Optional[str] = None,
        content: Optional[str] = None,
        file_ids: Optional[List[UUID]] = None
    ) -> Announcement:
        """Update an announcement. Verifies ownership."""
        
        # Verify ownership
        announcement = await AnnouncementService.get_announcement(db, announcement_id)
        if announcement.instructor_id != instructor_id:
            raise HTTPException(status_code=401, detail="Not authorized to update this announcement")
        
        # Build update query dynamically based on what's provided
        updates = []
        params = []
        param_idx = 1
        
        if title is not None:
            updates.append(f"title = ${param_idx}")
            params.append(title)
            param_idx += 1
        
        if content is not None:
            updates.append(f"content = ${param_idx}")
            params.append(content)
            param_idx += 1
        
        if updates:
            updates.append(f"updated_at = NOW()")
            query = f"""
                UPDATE announcements
                SET {', '.join(updates)}
                WHERE id = ${param_idx}
            """
            params.append(announcement_id)
            await db.execute(query, *params)
        
        # Update files if provided
        if file_ids is not None:
            # Delete existing file links
            delete_query = """
                DELETE FROM announcement_files
                WHERE announcement_id = $1
            """
            await db.execute(delete_query, announcement_id)
            
            # Add new file links
            if file_ids:
                await AnnouncementService._link_files(db, announcement_id, file_ids, announcement.course_id)
        
        # Return updated announcement
        return await AnnouncementService.get_announcement(db, announcement_id)
    
    @staticmethod
    async def delete_announcement(
        db: asyncpg.Connection,
        announcement_id: UUID,
        instructor_id: UUID
    ):
        """Delete an announcement. Verifies ownership."""
        
        # Verify ownership
        announcement = await AnnouncementService.get_announcement(db, announcement_id)
        if announcement.instructor_id != instructor_id:
            raise HTTPException(status_code=401, detail="Not authorized to delete this announcement")
        
        # Delete announcement (cascade will handle file links and reactions)
        query = """
            DELETE FROM announcements
            WHERE id = $1
        """
        await db.execute(query, announcement_id)
    
    @staticmethod
    async def add_reaction(
        db: asyncpg.Connection,
        announcement_id: UUID,
        student_id: UUID,
        reaction_type: str
    ):
        """Add or update a reaction. Uses upsert."""
        
        # Verify announcement exists
        await AnnouncementService.get_announcement(db, announcement_id)
        
        # Validate reaction type
        valid_types = ['thumbs_up', 'thumbs_down', 'question', 'exclamation', 'celebration']
        if reaction_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid reaction type. Must be one of: {valid_types}")
        
        query = """
            INSERT INTO announcement_reactions (announcement_id, student_id, reaction_type)
            VALUES ($1, $2, $3)
            ON CONFLICT (announcement_id, student_id)
            DO UPDATE SET reaction_type = $3
        """
        
        await db.execute(query, announcement_id, student_id, reaction_type)
    
    @staticmethod
    async def remove_reaction(
        db: asyncpg.Connection,
        announcement_id: UUID,
        student_id: UUID
    ):
        """Remove a reaction."""
        
        query = """
            DELETE FROM announcement_reactions
            WHERE announcement_id = $1 AND student_id = $2
        """
        
        await db.execute(query, announcement_id, student_id)
    
    @staticmethod
    async def get_reaction_counts(
        db: asyncpg.Connection,
        announcement_id: UUID
    ) -> ReactionCounts:
        """Get reaction counts for an announcement."""
        
        query = """
            SELECT 
                reaction_type,
                COUNT(*) as count
            FROM announcement_reactions
            WHERE announcement_id = $1
            GROUP BY reaction_type
        """
        
        rows = await db.fetch(query, announcement_id)
        
        counts = ReactionCounts()
        for row in rows:
            reaction_type = row["reaction_type"]
            count = row["count"]
            if reaction_type == 'thumbs_up':
                counts.thumbs_up = count
            elif reaction_type == 'thumbs_down':
                counts.thumbs_down = count
            elif reaction_type == 'question':
                counts.question = count
            elif reaction_type == 'exclamation':
                counts.exclamation = count
            elif reaction_type == 'celebration':
                counts.celebration = count
        
        return counts
    
    @staticmethod
    async def get_user_reaction(
        db: asyncpg.Connection,
        announcement_id: UUID,
        student_id: UUID
    ) -> Optional[str]:
        """Get a user's current reaction to an announcement."""
        
        query = """
            SELECT reaction_type
            FROM announcement_reactions
            WHERE announcement_id = $1 AND student_id = $2
        """
        
        result = await db.fetchval(query, announcement_id, student_id)
        return result
    
    @staticmethod
    async def get_reaction_response(
        db: asyncpg.Connection,
        announcement_id: UUID,
        student_id: UUID
    ) -> ReactionResponse:
        """Get reaction counts and user's reaction in one call."""
        
        counts = await AnnouncementService.get_reaction_counts(db, announcement_id)
        user_reaction = await AnnouncementService.get_user_reaction(db, announcement_id, student_id)
        
        return ReactionResponse(
            counts=counts,
            user_reaction=user_reaction
        )
    
    @staticmethod
    async def mark_announcement_seen(
        db: asyncpg.Connection,
        announcement_id: UUID,
        student_id: UUID
    ):
        """Mark an announcement as seen by a student. Uses upsert."""
        
        # Verify announcement exists
        await AnnouncementService.get_announcement(db, announcement_id)
        
        query = """
            INSERT INTO announcement_seen (announcement_id, student_id, seen_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (announcement_id, student_id)
            DO UPDATE SET seen_at = NOW()
        """
        
        await db.execute(query, announcement_id, student_id)
    
    @staticmethod
    async def get_unseen_count(
        db: asyncpg.Connection,
        course_id: UUID,
        student_id: UUID
    ) -> int:
        """Get count of unseen announcements for a student in a course."""
        
        query = """
            SELECT COUNT(*) as count
            FROM announcements a
            WHERE a.course_id = $1
            AND NOT EXISTS (
                SELECT 1
                FROM announcement_seen s
                WHERE s.announcement_id = a.id
                AND s.student_id = $2
            )
        """
        
        count = await db.fetchval(query, course_id, student_id)
        return count if count else 0
    
    @staticmethod
    async def mark_all_course_announcements_seen(
        db: asyncpg.Connection,
        course_id: UUID,
        student_id: UUID
    ):
        """Mark all announcements in a course as seen for a student."""
        
        query = """
            INSERT INTO announcement_seen (announcement_id, student_id, seen_at)
            SELECT a.id, $2, NOW()
            FROM announcements a
            WHERE a.course_id = $1
            AND NOT EXISTS (
                SELECT 1
                FROM announcement_seen s
                WHERE s.announcement_id = a.id
                AND s.student_id = $2
            )
            ON CONFLICT (announcement_id, student_id) DO NOTHING
        """
        
        await db.execute(query, course_id, student_id)
