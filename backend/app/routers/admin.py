from fastapi import APIRouter, Depends, HTTPException
from app.dependencies.db import get_db
from app.dependencies.auth import me, require_admin
from app.schemas.user import User
from uuid import UUID
from typing import List, Optional
from app.schemas.invite import InviteRequest
import secrets, hashlib
from app.services.invite_service import InviteService
from app.services.resend_service import ResendService



router = APIRouter(tags=["admin"])


@router.post(path="/invites")
async def send_invite(body: InviteRequest, db = Depends(get_db), user: User = Depends(require_admin)):

    token = secrets.token_urlsafe(32)
    hashed_token = InviteService.hash_token(token)

    ResendService.send_invite_to_email(token, body.email)

    await InviteService.log_invite(db, body, hashed_token, user["id"])

    




