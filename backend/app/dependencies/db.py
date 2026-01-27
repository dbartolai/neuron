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
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    
    try:
        pool = await asyncpg.create_pool(
            DATABASE_URL,
            statement_cache_size=0,
            min_size=1,  # Minimum connections in pool
            max_size=10,  # Maximum connections in pool
            command_timeout=60,  # Timeout for individual queries (seconds)
            timeout=30,  # Timeout for acquiring connection from pool (seconds)
            server_settings={
                "application_name": "neuron_backend",
            }
        )
        # Test the connection
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        print("Database pool initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize database pool: {e}")
        raise

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