"""FastAPI main application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import job as jobs_router

from app.core.config import settings
from app.core.database import neo4j_db
from app.services.scraper_service import scraper_service
from app.routers import career, scraper, resume, ollama


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    print("Starting CareerLift Backend...")
    await neo4j_db.connect()
    await neo4j_db.initialize_schema()
    await scraper_service.initialize()
    print("All services initialized")

    yield

    # Shutdown
    print("Shutting down CareerLift Backend...")
    await neo4j_db.close()
    await scraper_service.close()
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
)

# Include routers
app.include_router(career.router)
app.include_router(scraper.router)
app.include_router(jobs_router.router)
app.include_router(resume.router)
app.include_router(ollama.router)


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
            "ollama": "available",
            "playwright": "initialized"
        }
    }
