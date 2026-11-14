from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sellbird.api.routes import router

logger = logging.getLogger("sellbird.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Sales Agent API starting...")
    yield
    logger.info("Sales Agent API shutting down.")


app = FastAPI(
    title="Harvey Local Sales Agent API",
    description="Multi-product AI sales agent running on local Ollama inference.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
