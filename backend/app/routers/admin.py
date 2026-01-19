from fastapi import APIRouter, Depends, HTTPException
from app.dependencies.db import get_db
from app.dependencies.auth import me, require_admin
from app.schemas.user import User
from uuid import UUID
from typing import List, Optional
from app.schemas.invite import InviteRequest, Invite
from app.schemas.admin import (
    Outreach, OutreachRequest, OutreachUpdate, SchedulerResponse, BatchTimeslotRequest,
    BookTimeslotRequest, InterestRequest, TimeslotUpdate, MassTimeslotRequest,
    BatchOutreachDeleteRequest, BatchTimeslotDeleteRequest,
    Interaction, InteractionRequest, InteractionUpdate
)
import secrets, hashlib
from app.services.invite_service import InviteService
from app.services.resend_service import ResendService
from app.services.outreach_service import OutreachService
from app.services.scheduler_service import SchedulerService
from app.services.interaction_service import InteractionService



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


@router.post(path="/invites/{invite_id}/revoke")
async def revoke_invite(invite_id: UUID, db = Depends(get_db), user: User = Depends(require_admin)):
    """
    Admin-only endpoint to revoke an invite.
    """
    try:
        await InviteService.revoke_invite(db, invite_id, user["id"])
        return {"ok": True, "message": "Invite revoked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


@router.put(path="/outreach/{outreach_id}")
async def update_outreach(
    outreach_id: int,
    body: OutreachUpdate,
    db = Depends(get_db),
    user: User = Depends(require_admin)
) -> Outreach:
    """
    Admin-only endpoint to update an outreach entry.
    """
    try:
        updated = await OutreachService.update_outreach(db, outreach_id, body)
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(path="/outreach/{outreach_id}")
async def delete_outreach(
    outreach_id: int,
    db = Depends(get_db),
    user: User = Depends(require_admin)
):
    """
    Admin-only endpoint to delete an outreach entry.
    """
    try:
        await OutreachService.delete_outreach(db, outreach_id)
        return {"ok": True, "message": "Outreach entry deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(path="/outreach/batch")
async def batch_delete_outreach(
    body: BatchOutreachDeleteRequest,
    db = Depends(get_db),
    user: User = Depends(require_admin)
):
    """
    Admin-only endpoint to batch delete outreach entries.
    """
    try:
        deleted_count = await OutreachService.batch_delete_outreach(db, body.outreach_ids)
        return {"ok": True, "message": f"Deleted {deleted_count} outreach entries", "count": deleted_count}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


@router.post(path="/scheduler/timeslots/mass")
async def mass_create_timeslots(body: MassTimeslotRequest, db = Depends(get_db), user: User = Depends(require_admin)):
    """
    Admin-only endpoint to mass create timeslots at :00 and :30 intervals.
    """
    try:
        created_ids = await SchedulerService.mass_create_timeslots(
            db,
            body.start_time,
            body.end_time,
            user["id"]
        )
        return {"ok": True, "message": f"Created {len(created_ids)} timeslots", "ids": created_ids}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put(path="/scheduler/{timeslot_id}")
async def update_timeslot(
    timeslot_id: int,
    body: TimeslotUpdate,
    db = Depends(get_db),
    user: User = Depends(require_admin)
) -> SchedulerResponse:
    """
    Admin-only endpoint to update a timeslot.
    """
    try:
        updated = await SchedulerService.update_timeslot(db, timeslot_id, body)
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(path="/scheduler/{timeslot_id}")
async def delete_timeslot(
    timeslot_id: int,
    db = Depends(get_db),
    user: User = Depends(require_admin)
):
    """
    Admin-only endpoint to delete a timeslot.
    """
    try:
        await SchedulerService.delete_timeslot(db, timeslot_id)
        return {"ok": True, "message": "Timeslot deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(path="/scheduler/batch")
async def batch_delete_timeslots(
    body: BatchTimeslotDeleteRequest,
    db = Depends(get_db),
    user: User = Depends(require_admin)
):
    """
    Admin-only endpoint to batch delete timeslots.
    """
    try:
        deleted_count = await SchedulerService.batch_delete_timeslots(db, body.timeslot_ids)
        return {"ok": True, "message": f"Deleted {deleted_count} timeslots", "count": deleted_count}
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


# Interaction endpoints

@router.get(path="/interactions/outreach/{outreach_id}")
async def get_interactions_by_outreach(
    outreach_id: int,
    db = Depends(get_db),
    user: User = Depends(require_admin)
) -> List[Interaction]:
    """
    Admin-only endpoint to fetch all interactions for an outreach entry.
    """
    try:
        interactions = await InteractionService.get_interactions_by_outreach(db, outreach_id)
        return interactions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post(path="/interactions")
async def create_interaction(
    body: InteractionRequest,
    db = Depends(get_db),
    user: User = Depends(require_admin)
) -> Interaction:
    """
    Admin-only endpoint to create a new interaction.
    """
    try:
        interaction = await InteractionService.create_interaction(db, body, user["id"])
        return interaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put(path="/interactions/{interaction_id}")
async def update_interaction(
    interaction_id: UUID,
    body: InteractionUpdate,
    db = Depends(get_db),
    user: User = Depends(require_admin)
) -> Interaction:
    """
    Admin-only endpoint to update an interaction.
    """
    try:
        updated = await InteractionService.update_interaction(db, interaction_id, body)
        return updated
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete(path="/interactions/{interaction_id}")
async def delete_interaction(
    interaction_id: UUID,
    db = Depends(get_db),
    user: User = Depends(require_admin)
):
    """
    Admin-only endpoint to delete an interaction.
    """
    try:
        await InteractionService.delete_interaction(db, interaction_id)
        return {"ok": True, "message": "Interaction deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
