from __future__ import annotations
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Body, Query

# Use your existing async Neo4j dependency
from app.core.database import get_db  # yields an async Neo4j session

from app.schemas.job import Job as JobSchema
from app.services.job_ingest_service import (
    ingest_from_seeds,
    ingest_from_usajobs,
    ingest_from_adzuna,
    ingest_from_remotive,
    ingest_from_weworkremotely,
    ingest_all_sources,
    COMMON_SOURCES,
)
from app.services.job_sources.adzuna import AdzunaClient

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("/")
async def list_jobs(
    q: Optional[str] = None,
    location: Optional[str] = None,
    source: Optional[str] = None,
    remote_only: bool = False,
    resume_id: Optional[str] = None,
    limit: int = Query(default=200, le=500),
    db = Depends(get_db),
):
    """
    List jobs with optional filters and ATS scoring.

    Args:
        q: Search query (searches title and description)
        location: Location filter
        source: Filter by job source (usajobs, adzuna, remotive, weworkremotely)
        remote_only: Show only remote jobs
        resume_id: Optional resume ID for ATS scoring
        limit: Maximum number of results
    """
    from app.services.ats_service import ats_service

    cypher = """
    MATCH (j:JobPosting)
    WHERE ($q IS NULL OR toLower(j.title) CONTAINS toLower($q) OR toLower(j.description) CONTAINS toLower($q))
      AND ($location IS NULL OR toLower(j.location) CONTAINS toLower($location))
      AND ($source IS NULL OR j.source = $source)
      AND ($remote_only = false OR j.remote = true)
    RETURN j
    ORDER BY coalesce(j.updated_at, j.created_at, datetime({epochSeconds:0})) DESC
    LIMIT $limit
    """
    result = await db.run(cypher, q=q, location=location, source=source, remote_only=remote_only, limit=limit)

    # Get resume skills for ATS scoring if resume_id provided
    skills = []
    exp_text = ""
    if resume_id:
        resume_query = """
        MATCH (r:Resume {id: $resume_id})-[:BELONGS_TO]->(p:Person)
        OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
        OPTIONAL MATCH (p)-[:HAS_EXPERIENCE]->(e:Experience)
        RETURN collect(DISTINCT s.name) AS skills,
               collect(DISTINCT e.description) AS experiences
        """
        resume_result = await db.run(resume_query, resume_id=resume_id)
        resume_data = await resume_result.single()
        if resume_data:
            skills = resume_data["skills"] or []
            exp_text = " ".join(resume_data["experiences"] or [])

    items: List[Dict[str, Any]] = []
    async for rec in result:
        j = rec["j"]
        job_data = {
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
            "source": j.get("source"),
            "source_job_id": j.get("source_job_id"),
        }

        # Add ATS score if resume provided
        if resume_id and skills:
            job_data["ats_score"] = ats_service.score_resume_to_job(skills, exp_text, j)

        items.append(job_data)

    # Sort by ATS score if resume provided
    if resume_id and skills:
        items.sort(key=lambda x: x.get("ats_score", 0), reverse=True)

    return items

@router.post("/ingest")
async def ingest_jobs(
    seeds: List[str] = Body(default=[]),
    limit: int | None = Query(default=None, ge=1, le=5000, description="Max new jobs to ingest"),
    db = Depends(get_db),
):
    """Legacy endpoint for scraping jobs from seed URLs."""
    seeds_to_use = seeds or COMMON_SOURCES
    created = await ingest_from_seeds(db, seeds_to_use, max_jobs=limit)
    return {"ingested": created, "seeds": seeds_to_use, "limit": limit}


@router.post("/ingest/usajobs")
async def ingest_usajobs(
    keyword: str = Query(default="", description="Job keyword or title"),
    location: str = Query(default="", description="Location filter"),
    remote: bool = Query(default=False, description="Remote jobs only"),
    limit: int = Query(default=100, ge=1, le=500, description="Max jobs to ingest"),
    db = Depends(get_db),
):
    """
    Ingest jobs from USAJOBS API (federal government jobs).

    Requires USAJOBS_API_KEY and USAJOBS_EMAIL in environment.
    Register at: https://developer.usajobs.gov/
    """
    created = await ingest_from_usajobs(db, keyword, location, remote, limit)
    return {
        "source": "usajobs",
        "ingested": created,
        "params": {"keyword": keyword, "location": location, "remote": remote, "limit": limit}
    }


@router.post("/ingest/adzuna")
async def ingest_adzuna(
    keyword: str = Query(default="", description="Job keyword or title"),
    location: str = Query(default="", description="Location filter"),
    limit: int = Query(default=50, ge=1, le=50, description="Max jobs to ingest"),
    db = Depends(get_db),
):
    """
    Ingest jobs from Adzuna API (commercial job aggregator).

    Requires ADZUNA_APP_ID and ADZUNA_APP_KEY in environment.
    Attribution: Must display "Jobs powered by Adzuna" when showing results.
    """
    created = await ingest_from_adzuna(db, keyword, location, limit)
    return {
        "source": "adzuna",
        "ingested": created,
        "attribution": AdzunaClient.get_attribution_text(),
        "params": {"keyword": keyword, "location": location, "limit": limit}
    }


@router.post("/ingest/remotive")
async def ingest_remotive(
    category: Optional[str] = Query(default=None, description="Job category filter"),
    limit: int = Query(default=100, ge=1, le=500, description="Max jobs to ingest"),
    db = Depends(get_db),
):
    """
    Ingest jobs from Remotive API (remote jobs).

    No API key required. All jobs are remote.
    """
    created = await ingest_from_remotive(db, category, limit)
    return {
        "source": "remotive",
        "ingested": created,
        "params": {"category": category, "limit": limit}
    }


@router.post("/ingest/weworkremotely")
async def ingest_weworkremotely(
    category: Optional[str] = Query(
        default=None,
        description="Category: programming, design, devops, marketing, etc."
    ),
    limit: int = Query(default=100, ge=1, le=200, description="Max jobs to ingest"),
    db = Depends(get_db),
):
    """
    Ingest jobs from WeWorkRemotely RSS feed (remote jobs).

    No API key required. All jobs are remote.
    """
    created = await ingest_from_weworkremotely(db, category, limit)
    return {
        "source": "weworkremotely",
        "ingested": created,
        "params": {"category": category, "limit": limit}
    }


@router.post("/ingest/all")
async def ingest_all(
    limit_per_source: int = Query(default=50, ge=1, le=200, description="Max jobs per source"),
    db = Depends(get_db),
):
    """
    Ingest jobs from all configured sources.

    Fetches from USAJOBS, Adzuna (if configured), Remotive, and WeWorkRemotely.
    """
    results = await ingest_all_sources(db, limit_per_source)
    total = sum(results.values())
    return {
        "total_ingested": total,
        "by_source": results,
        "limit_per_source": limit_per_source
    }
