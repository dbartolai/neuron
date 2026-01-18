from fastapi import APIRouter, Depends, HTTPException
from app.dependencies.db import get_db
from app.dependencies.auth import me, require_admin
from app.schemas.user import User
from uuid import UUID
from typing import List, Optional
from app.schemas.invite import InviteRequest, Invite
from app.schemas.admin import Outreach, OutreachRequest, SchedulerResponse, BatchTimeslotRequest, BookTimeslotRequest, InterestRequest
import secrets, hashlib
from app.services.invite_service import InviteService
from app.services.resend_service import ResendService
from app.services.outreach_service import OutreachService
from app.services.scheduler_service import SchedulerService



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
async def submit_outreach(body: OutreachRequest, db = Depends(get_db), user: User = Depends(require_admin)):
    """
    Admin-only endpoint to manually create outbound outreach entries.
    """
    try:
        await OutreachService.create_outbound_outreach(db, body)
        return {"ok": True, "message": "Outreach entry created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(path="/outreach")
async def get_outreach(db = Depends(get_db), user: User = Depends(require_admin)) -> List[Outreach]:
    """
    Admin-only endpoint to fetch all outreach records.
    """
    outreach = await OutreachService.get_all_outreach(db)
    return outreach


# Scheduler endpoints

@router.get(path="/scheduler")
async def get_scheduler(db = Depends(get_db), user: User = Depends(require_admin)) -> List[SchedulerResponse]:
    """
    Admin-only endpoint to fetch all scheduler entries.
    """
    scheduler_entries = await SchedulerService.get_all_scheduler_entries(db)
    return scheduler_entries


@router.get(path="/scheduler/available")
async def get_available_timeslots(db = Depends(get_db)) -> List[SchedulerResponse]:
    """
    Public endpoint to fetch available (unbooked) future timeslots.
    No authentication required.
    """
    timeslots = await SchedulerService.get_available_timeslots(db)
    return timeslots


@router.post(path="/scheduler/timeslots")
async def create_timeslots(body: BatchTimeslotRequest, db = Depends(get_db), user: User = Depends(require_admin)):
    """
    Admin-only endpoint to batch create timeslots.
    """
    print("USER ID:")
    print(user["id"])
    try:
        # Use the authenticated user's ID as employee_id
        created_ids = await SchedulerService.batch_create_timeslots(db, body.timeslots, user["id"])
        return {"ok": True, "message": f"Created {len(created_ids)} timeslots", "ids": created_ids}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(path="/scheduler/book")
async def book_timeslot(body: BookTimeslotRequest, db = Depends(get_db), user: User = Depends(require_admin)):
    """
    Admin-only endpoint to book a timeslot.
    """
    try:
        booked = await SchedulerService.book_timeslot(
            db,
            body.timeslot_id,
            body.name,
            body.email,
            body.notes,
            body.purpose,
            user["id"]
        )
        return booked
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(path="/scheduler/interest")
async def submit_interest(body: InterestRequest, db = Depends(get_db)):
    """
    Public endpoint to submit interest from landing page.
    Creates a scheduler entry and sends email notification.
    No authentication required.
    """
    try:
        # Find an available timeslot matching the requested time
        # We need to find a timeslot that matches the requested datetime
        available_slots = await SchedulerService.get_available_timeslots(db)
        
        # Find matching timeslot (exact match or within a small window)
        matching_slot = None
        for slot in available_slots:
            # Allow 1 minute tolerance for timezone/rounding issues
            time_diff = abs((slot.timeslot - body.timeslot).total_seconds())
            if time_diff < 60:
                matching_slot = slot
                break
        
        if not matching_slot:
            raise HTTPException(
                status_code=404,
                detail=f"No available timeslot found for {body.timeslot}"
            )
        
        # Book the timeslot
        booked = await SchedulerService.book_timeslot(
            db,
            matching_slot.id,
            body.name,
            body.email,
            body.notes,
            body.purpose,
            None  # No instructor_id for public submissions
        )
        
        # Send email notification
        ResendService.send_outreach_notification(body.name, body.email, body.purpose or "Interest submission", body.notes)
        
        return {"ok": True, "message": "Interest submitted successfully", "scheduler_id": booked.id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
