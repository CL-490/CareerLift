from __future__ import annotations
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Body, Query

# Use your existing async Neo4j dependency
from app.core.database import get_db  # yields an async Neo4j session

from app.schemas.job import Job as JobSchema
from app.services.job_ingest_service import ingest_from_seeds, COMMON_SOURCES  # we'll replace this file next

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("/", response_model=List[JobSchema])
async def list_jobs(
    q: Optional[str] = None,
    location: Optional[str] = None,
    db = Depends(get_db),     # async session from your code
):
    cypher = """
    MATCH (j:JobPosting)
    WHERE ($q IS NULL OR toLower(j.title) CONTAINS toLower($q))
      AND ($location IS NULL OR toLower(j.location) CONTAINS toLower($location))
    RETURN j
    ORDER BY coalesce(j.updated_at, j.created_at, datetime({epochSeconds:0})) DESC
    LIMIT 200
    """
    result = await db.run(cypher, q=q, location=location)

    items: List[Dict[str, Any]] = []
    async for rec in result:
        j = rec["j"]
        items.append({
            "title": j.get("title"),
            "company": j.get("company"),
            "location": j.get("location"),
            "employment_type": j.get("employment_type"),
            "remote": j.get("remote"),
            "salary_text": j.get("salary_text"),
            "posted_at": j.get("posted_at"),
            "apply_url": j.get("apply_url"),
            "source_url": j.get("source_url"),
            "description": j.get("description"),
        })
    return items

@router.post("/ingest")
async def ingest_jobs(
    seeds: List[str] = Body(default=[]),
    limit: int | None = Query(default=None, ge=1, le=5000, description="Max new jobs to ingest"),
    db = Depends(get_db),
):
    seeds_to_use = seeds or COMMON_SOURCES
    created = await ingest_from_seeds(db, seeds_to_use, max_jobs=limit)
    return {"ingested": created, "seeds": seeds_to_use, "limit": limit}
