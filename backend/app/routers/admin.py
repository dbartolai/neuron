from fastapi import APIRouter, Depends, HTTPException
from app.dependencies.db import get_db
from app.dependencies.auth import me, require_admin
from app.schemas.user import User
from uuid import UUID
from typing import List, Optional
from app.schemas.admin import InviteRequest
import secrets, hashlib
from app.services.admin_service import AdminService
from app.services.resend_service import ResendService



router = APIRouter(tags=["admin"])


@router.post(path="/invites")
async def send_invite(body: InviteRequest, db = Depends(get_db), user: User = Depends(require_admin)):

    token = secrets.token_urlsafe(32)
    hashed_token = AdminService.hash_token(token)

    ResendService.send_invite_to_email(token, body.email)

    AdminService.log_invite(db, body, hashed_token, user["id"])

    




