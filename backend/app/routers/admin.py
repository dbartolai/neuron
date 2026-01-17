from fastapi import APIRouter, Depends, HTTPException
from app.dependencies.db import get_db
from app.dependencies.auth import me, require_admin
from app.schemas.user import User
from uuid import UUID
from typing import List, Optional
from app.schemas.invite import InviteRequest, Invite
from app.schemas.admin import Outreach, OutreachRequest
import secrets, hashlib
from app.services.invite_service import InviteService
from app.services.resend_service import ResendService
from app.services.outreach_service import OutreachService



router = APIRouter(tags=["admin"])


@router.get(path="/invites")
async def get_invites(db = Depends(get_db), user: User = Depends(require_admin)) -> List[Invite]:
    invites = await InviteService.get_all_invites(db)
    return invites


@router.post(path="/invites")
async def send_invite(body: InviteRequest, db = Depends(get_db), user: User = Depends(require_admin)):

    token = secrets.token_urlsafe(32)
    hashed_token = InviteService.hash_token(token)

    ResendService.send_invite_to_email(token, body.email)

    await InviteService.log_invite(db, body, hashed_token, user["id"])


@router.post(path="/outreach")
async def submit_outreach(body: OutreachRequest, db = Depends(get_db)):
    """
    Public endpoint to submit outreach from landing page.
    No authentication required.
    """
    try:
        # Log to database
        await OutreachService.log_outreach(db, body)
        
        # Send email notification
        ResendService.send_outreach_notification(body.email, body.role, body.notes)
        
        return {"ok": True, "message": "Outreach submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(path="/outreach")
async def get_outreach(db = Depends(get_db), user: User = Depends(require_admin)) -> List[Outreach]:
    """
    Admin-only endpoint to fetch all outreach records.
    """
    outreach = await OutreachService.get_all_outreach(db)
    return outreach

    




