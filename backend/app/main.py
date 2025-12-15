# app/main.py

from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.dependencies.db import init_pool, close_pool
from app.routers import chat

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_pool()

    yield   

    # Shutdown
    await close_pool()


app = FastAPI(lifespan=lifespan)

# Include routers
app.include_router(chat.router, prefix="/assignments")