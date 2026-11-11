"""FastAPI endpoint for retrieving a user from PostgreSQL.

Set DATABASE_URL, for example:
postgresql://app_user:secret@localhost:5432/app_db
"""

from contextlib import asynccontextmanager
import os
from typing import Any

import asyncpg
from fastapi import FastAPI, HTTPException, Query, Request


@asynccontextmanager
async def lifespan(app: FastAPI):
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is required")

    app.state.db_pool = await asyncpg.create_pool(database_url)
    try:
        yield
    finally:
        await app.state.db_pool.close()


app = FastAPI(lifespan=lifespan)


@app.get("/users")
async def get_user(request: Request, user_id: int = Query(..., gt=0)) -> dict[str, Any]:
    """Return the user whose id matches the `user_id` query parameter."""
    async with request.app.state.db_pool.acquire() as connection:
        row = await connection.fetchrow(
            "SELECT * FROM users WHERE id = $1",
            user_id,
        )

    if row is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # asyncpg records are converted to a plain dict so FastAPI can serialize
    # the database result as JSON.
    return dict(row)
