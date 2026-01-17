# app/main.py

from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.dependencies.db import init_pool, close_pool
from app.routers import chat
from app.routers import course
from app.routers import student
from app.routers import instructor
from app.routers import admin
from app.routers import invite
from app.routers import user
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_pool()

    yield   

    # Shutdown
    await close_pool()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://neuron.ceria.io"],  # your Next dev server
    allow_credentials=True,
    allow_methods=["*"],                      # or ["GET","POST",...]
    allow_headers=["*"],
)


# Include routers
app.include_router(chat.router, prefix="/chat")
app.include_router(course.router, prefix="/courses")
app.include_router(student.router, prefix="/student")
app.include_router(instructor.router, prefix="/instructor")
app.include_router(admin.router, prefix="/admin")
app.include_router(invite.router, prefix="/invites")
app.include_router(user.router, prefix="/users")