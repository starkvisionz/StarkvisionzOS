"""StarkControls compute service.

FastAPI application hosting the analytics workloads that are impractical inside
a Cloudflare Worker — XER ingestion today, DCMA and EVM in later sessions.
Every route under ``/xer`` requires an HMAC-signed body; the health endpoints
are deliberately open so Fly can probe them.
"""

from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

from app import db
from app.routers import xer

load_dotenv()

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

SERVICE_VERSION = "0.1.0"


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield
    db.close_pool()


app = FastAPI(
    title="StarkControls Compute",
    version=SERVICE_VERSION,
    description="XER ingestion and project-controls analytics for StarkControls.",
    lifespan=lifespan,
)

app.include_router(xer.router)


@app.get("/healthz", tags=["ops"])
def healthz() -> dict[str, str]:
    """Liveness: the process is up.  Does not touch the database."""
    return {"status": "ok", "version": SERVICE_VERSION}


@app.get("/readyz", tags=["ops"])
def readyz() -> dict[str, object]:
    """Readiness: the process can reach Postgres."""
    return {"status": "ok" if db.healthy() else "degraded", "database": db.healthy()}
