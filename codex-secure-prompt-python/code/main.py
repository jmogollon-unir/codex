"""Secure user lookup API backed by PostgreSQL."""

from contextlib import asynccontextmanager
import logging
import os
from typing import Any

import asyncpg
from fastapi import FastAPI, HTTPException, Query, Request

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required")

    app.state.db_pool = await asyncpg.create_pool(database_url)
    try:
        yield
    finally:
        await app.state.db_pool.close()


app = FastAPI(lifespan=lifespan)


@app.get("/users")
async def get_user(
    request: Request,
    user_id: int = Query(..., gt=0, description="Positive integer user ID"),
) -> dict[str, Any]:
    """Return a user's details as JSON for GET /users?user_id=123."""
    try:
        async with request.app.state.db_pool.acquire() as connection:
            # $1 is a bound parameter; user input is never interpolated into SQL.
            row = await connection.fetchrow(
                "SELECT * FROM users WHERE id = $1",
                user_id,
            )
    except Exception:
        logger.exception("Database error while retrieving user")
        raise HTTPException(
            status_code=500,
            detail="No se pudo completar la solicitud",
        ) from None

    if row is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return dict(row)
