# app/dependencies/db.py

import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

pool: asyncpg.pool.Pool | None = None

async def init_pool():
    """Called inside lifespan to initialize the global pool."""
    global pool
    # The fix is added here: statement_cache_size=0
    pool = await asyncpg.create_pool(
        DATABASE_URL, 
        statement_cache_size=0
    )
    print("Database pool initialized.")

async def close_pool():
    """Called inside lifespan to close the global pool."""
    global pool
    if pool:
        await pool.close()
        print("Database pool closed.")

async def get_db():
    """FastAPI dependency for acquiring a connection."""
    if pool is None:
        raise RuntimeError("Database pool is not initialized")
    async with pool.acquire() as conn:
        yield conn