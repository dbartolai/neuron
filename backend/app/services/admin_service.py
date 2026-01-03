import hashlib
import asyncpg
from typing import List
from app.schemas.course import UserCourse, NewCourse, CoursePolicy
from uuid import UUID
from fastapi import HTTPException
from app.schemas.admin import Invite, InviteRequest



class AdminService:

    @staticmethod
    def hash_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()
    
    @staticmethod
    def log_invite(db: asyncpg.Connection, invite: InviteRequest, hash_token: str, admin_id: UUID):

        invite_query = """
            INSERT INTO instructor_invites (email, token_hash, created_by, note)
            VALUES ($1, $2, $3, $4)
        """

        db.execute(invite_query, invite.email, hash_token, admin_id, invite.note)

        log_query = """
            INSERT INTO admin_logs (action, admin, target_email, admin_notes)
            VALUES ($1, $2, $3, $4)
        """

        db.execute(log_query, "sent invite", admin_id, invite.email, invite.note)

    

