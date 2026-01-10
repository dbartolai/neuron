from fastapi import APIRouter, Depends
from app.dependencies.db import get_db
from app.dependencies.auth import me 
from app.services.user_service import UserService

router = APIRouter(tags=["user"])

@router.get(path="/role")
async def get_user_role(db = Depends(get_db), user = Depends(me)):

    return await UserService.get_role(db, user["id"])

@router.get(path="/name")
async def get_user_role(db = Depends(get_db), user = Depends(me)):

    return await UserService.get_name(db, user["id"])
