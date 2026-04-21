"""FastAPI main application."""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import job as jobs_router

from app.core.config import settings
from app.core.database import neo4j_db
from app.routers import career, resume, ollama, latex, interview, tts
from app.routers.tts import warmup_kokoro


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    print("Starting CareerLift Backend...")
    await neo4j_db.connect()
    await neo4j_db.initialize_schema()
    # Warm Kokoro TTS in the background so the first real request is fast.
    # Fire-and-forget: don't block startup on it.
    kokoro_warmup_task = asyncio.create_task(warmup_kokoro())
    print("All services initialized")

    yield

    # Shutdown
    print("Shutting down CareerLift Backend...")
    kokoro_warmup_task.cancel()
    await neo4j_db.close()
    print("All services closed")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Page-Count"],
)

# Include routers
app.include_router(career.router)
app.include_router(jobs_router.router)
app.include_router(resume.router)
app.include_router(ollama.router)
app.include_router(latex.router)
app.include_router(interview.router)
app.include_router(tts.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "status": "running"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "services": {
            "neo4j": "connected",
            "ollama": "available"
        }
    }
