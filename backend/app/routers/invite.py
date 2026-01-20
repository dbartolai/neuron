from fastapi import APIRouter, Depends, HTTPException
from app.dependencies.db import get_db
from app.dependencies.auth import me
from app.dependencies.client import supabase
from app.schemas.user import User, InstructorActivate, ProfileRole
from app.schemas.invite import InviteStatus, Token, TokenInfo
from uuid import UUID
from typing import List, Optional
from app.services.course_service import CourseService
from app.services.invite_service import InviteService
from app.schemas.course import NewCourse
import os




router = APIRouter(tags=["invite"])



@router.post(path="/activate")
async def activate_instructor(body: InstructorActivate, db = Depends(get_db)):

    print("activating")

    token = body.token
    hashed_token = InviteService.hash_token(token)
    email = await InviteService.get_token_email(db, hashed_token)


    is_valid = await InviteService.check_token(db, hashed_token)
    if not is_valid:
        raise HTTPException(status_code=404, detail="invalid token")

    try:
        res = supabase.auth.admin.create_user({
            "email": email,
            "password": body.password,
            "user_metadata": {"role": (ProfileRole.instructor), "name": body.name},
            # "email_confirm": True,  ----> optional
        })
    except Exception:
        print("user not created")
        raise HTTPException(status_code=400, detail="Unable to create user")

    user_id = res.user.id

    redeemed = await InviteService.redeem_token(db, hashed_token, user_id)
    if not redeemed:
        # Someone else redeemed, or token no longer pending
        raise HTTPException(status_code=409, detail="invite already used")
    
    try:
       link_res = supabase.auth.admin.generate_link({
           "type": "magiclink",
            "email": email,
            "options":{
                "redirect_to":f"https://neuron.ceria.io/instructor/dashboard"
            }
       })

       link = link_res.properties.action_link
       

    except Exception as e:
        print("link gen failed")
        raise HTTPException(status_code=400, detail=str(e))

    return {"ok": True, "magic_link": link}




# Use this endpoint when first arriving to the instructor activate page
# To display the status of the token if not pending
@router.post(path="/info")
async def token_info(body: Token, db = Depends(get_db)):

    token = InviteService.hash_token(body.raw_token)

    status = await InviteService.get_token_status(db, token)

    if status is None:
        return {"status": "invalid"}
    
    if status == InviteStatus.revoked or status == InviteStatus.expired:
        return {"status": "invalid"}
    
    data = await InviteService.get_token_info(db, token)

    return TokenInfo(name=data["name"], email=data["email"], status=status)




