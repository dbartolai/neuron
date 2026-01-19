import hashlib
import asyncpg
from typing import List
from app.schemas.course import UserCourse, NewCourse, CoursePolicy
from uuid import UUID
from fastapi import HTTPException
from app.schemas.invite import Invite, InviteRequest, InviteStatus
from datetime import datetime, timezone



class InviteService:

    @staticmethod
    def hash_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()
    
    @staticmethod
    async def log_invite(db: asyncpg.Connection, invite: InviteRequest, hash_token: str, admin_id: UUID):

        invite_query = """
            INSERT INTO instructor_invites (name, email, token_hash, created_by, note)
            VALUES ($1, $2, $3, $4, $5)
        """

        await db.execute(invite_query, invite.name, invite.email, hash_token, admin_id, invite.note)

        log_query = """
            INSERT INTO admin_logs (action, admin, target_email, admin_notes)
            VALUES ($1, $2, $3, $4)
        """

        await db.execute(log_query, "sent invite", admin_id, invite.email, invite.note)



    @staticmethod
    async def check_token(db: asyncpg.Connection, hash_token: str) -> bool:

        query = """
            SELECT id, name, email, created_at, expires_at, revoked_at, accepted_at
            FROM instructor_invites
            WHERE token_hash = $1
        """

        row = await db.fetchrow(query, hash_token)

        if row is None:
            return False
        
        created_at: datetime = row["created_at"]
        expires_at: datetime = row["expires_at"]
        revoked_at: datetime|None = row["revoked_at"]
        accepted_at: datetime|None = row["accepted_at"]

        if revoked_at is not None:
            return False
        if accepted_at is not None:
            return False

        now = datetime.now(timezone.utc)

        # Check that we are between creation and expiration
        if created_at > now:
            return False
        if expires_at < now:
            return False
        
        
        return True
     
    
    @staticmethod
    async def get_token_status(db: asyncpg.Connection, token: str) -> InviteStatus|None:

        query = """
            SELECT id, name, email, created_at, expires_at, revoked_at, accepted_at
            FROM instructor_invites
            WHERE token_hash = $1
        """

        row = await db.fetchrow(query, token)

        if row is None:
            return None
        
        expires_at: datetime = row["expires_at"]
        revoked_at: datetime|None = row["revoked_at"]
        accepted_at: datetime|None = row["accepted_at"]

        if revoked_at is not None:
            return InviteStatus.revoked
        
        if accepted_at is not None:
            return InviteStatus.accepted
        
        now = datetime.now(timezone.utc)

        if expires_at < now:
            return InviteStatus.expired
        
        return InviteStatus.pending



    
    @staticmethod
    async def redeem_token(db: asyncpg.Connection, hash_token: str, new_user: UUID)->bool:

        query = """
            UPDATE instructor_invites
            SET accepted_at = now(), accepted_by = $1
            WHERE token_hash = $2
        """

        await db.execute(query, new_user, hash_token)

        return True

    @staticmethod
    async def get_token_info(db: asyncpg.Connection, hash_token: str):

        query = """
            SELECT name, email
            FROM instructor_invites
            WHERE token_hash = $1
        """

        row = await db.fetchrow(query, hash_token)

        return ({"email": row["email"], "name": row["name"]})
    
    @staticmethod
    async def get_token_email(db: asyncpg.Connection, hash_token: str):

        query = """
            SELECT email
            FROM instructor_invites
            WHERE token_hash = $1
        """

        email = await db.fetchval(query, hash_token)

        return email

    @staticmethod
    async def get_all_invites(db: asyncpg.Connection) -> List[Invite]:

        query = """
            SELECT id, name, email, token_hash, created_by, created_at, expires_at, revoked_at, accepted_at, accepted_by, note
            FROM instructor_invites
            ORDER BY created_at DESC
        """

        rows = await db.fetch(query)

        return [
            Invite(
                id=row["id"],
                name=row["name"],
                email=row["email"],
                token_hash=row["token_hash"],
                created_by=row["created_by"],
                created_at=row["created_at"],
                expires_at=row["expires_at"],
                revoked_at=row["revoked_at"],
                accepted_at=row["accepted_at"],
                accepted_by=row["accepted_by"],
                note=row["note"]
            )
            for row in rows
        ]

    @staticmethod
    async def revoke_invite(db: asyncpg.Connection, invite_id: UUID, admin_id: UUID) -> bool:
        """
        Revoke an invite by setting revoked_at timestamp.
        Also logs the action in admin_logs.
        """
        # Check if invite exists and get email for logging
        check_query = """
            SELECT id, email, revoked_at, accepted_at
            FROM instructor_invites
            WHERE id = $1
        """
        row = await db.fetchrow(check_query, invite_id)
        
        if row is None:
            raise HTTPException(status_code=404, detail="Invite not found")
        
        if row["revoked_at"] is not None:
            raise HTTPException(status_code=400, detail="Invite is already revoked")
        
        if row["accepted_at"] is not None:
            raise HTTPException(status_code=400, detail="Cannot revoke an already accepted invite")
        
        # Revoke the invite
        revoke_query = """
            UPDATE instructor_invites
            SET revoked_at = now()
            WHERE id = $1
            RETURNING id
        """
        
        revoked_row = await db.fetchrow(revoke_query, invite_id)
        
        if revoked_row is None:
            raise HTTPException(status_code=500, detail="Failed to revoke invite")
        
        # Log the action
        log_query = """
            INSERT INTO admin_logs (action, admin, target_email, admin_notes)
            VALUES ($1, $2, $3, $4)
        """
        
        await db.execute(log_query, "revoked invite", admin_id, row["email"], f"Revoked invite for {row['email']}")
        
        return True

    

