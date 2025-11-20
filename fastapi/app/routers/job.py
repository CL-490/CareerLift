from __future__ import annotations
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, Body
from pydantic import BaseModel

# Use your existing async Neo4j dependency
from app.core.database import get_db  # yields an async Neo4j session

from app.schemas.job import Job as JobSchema
from app.services.job_ingest_service import ingest_all_sources
from app.services.job_sources import (
    USAJobsClient,
    AdzunaClient,
    RemotiveClient,
    WeWorkRemotelyClient,
)
from app.core.config import settings

router = APIRouter(prefix="/jobs", tags=["jobs"])


class ATSCalculationRequest(BaseModel):
    """Request model for ATS calculation."""
    jobs: List[Dict[str, Any]]
    resume_id: str


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


@router.post("/calculate-ats")
async def calculate_ats_scores(
    request: ATSCalculationRequest = Body(...),
    db = Depends(get_db),
):
    """
    Calculate ATS scores for a list of jobs against a resume.

    Args:
        request: Contains jobs list and resume_id

    Returns:
        List of jobs with ats_score added
    """
    from app.services.ats_service import ats_service

    # Get resume skills and experience
    resume_query = """
    MATCH (r:Resume {id: $resume_id})-[:BELONGS_TO]->(p:Person)
    OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
    OPTIONAL MATCH (p)-[:HAS_EXPERIENCE]->(e:Experience)
    RETURN collect(DISTINCT s.name) AS skills,
           collect(DISTINCT e.description) AS experiences
    """
    resume_result = await db.run(resume_query, resume_id=request.resume_id)
    resume_data = await resume_result.single()

    if not resume_data:
        return request.jobs

    skills = resume_data["skills"] or []
    exp_text = " ".join(resume_data["experiences"] or [])

    # Calculate ATS scores for each job
    scored_jobs = []
    for job in request.jobs:
        job_copy = job.copy()
        if skills:
            job_copy["ats_score"] = ats_service.score_resume_to_job(skills, exp_text, job)
        scored_jobs.append(job_copy)

    # Sort by ATS score
    scored_jobs.sort(key=lambda x: x.get("ats_score", 0), reverse=True)

    return scored_jobs


@router.post("/refresh")
async def refresh_jobs(
    limit_per_source: int = Query(default=50, ge=1, le=200, description="Max jobs per source"),
    db = Depends(get_db),
):
    """
    Fetch latest jobs from all sources and update the database.

    This endpoint fetches jobs from USAJOBS, Adzuna, Remotive, and WeWorkRemotely.
    Call this to populate or refresh the job database.
    """
    results = await ingest_all_sources(db, limit_per_source)
    total = sum(results.values())
    return {
        "total_fetched": total,
        "by_source": results,
        "limit_per_source": limit_per_source
    }


@router.get("/fetch-live/{source}")
async def fetch_jobs_live(
    source: str,
    keyword: Optional[str] = Query(default="", description="Search keyword"),
    location: Optional[str] = Query(default="", description="Location filter"),
    category: Optional[str] = Query(default=None, description="Category for remotive/weworkremotely"),
    limit: int = Query(default=100, ge=1, le=1000, description="Max jobs to return (1-1000)"),
):
    """
    Fetch jobs from a specific source WITHOUT storing them in the database.

    Returns jobs as a list for immediate display. User can then choose to add specific jobs to the knowledge graph.

    Supported sources: usajobs, adzuna, remotive, weworkremotely
    """
    jobs = []

    if source == "usajobs":
        client = USAJobsClient(settings.usajobs_api_key, settings.usajobs_email)
        try:
            if not client.is_configured():
                return {"jobs": [], "message": "USAJOBS API key not configured"}
            jobs = await client.fetch_jobs(keyword=keyword, location=location, limit=min(limit, 500))
        finally:
            await client.close()

    elif source == "adzuna":
        client = AdzunaClient(settings.adzuna_app_id, settings.adzuna_app_key)
        try:
            if not client.is_configured():
                return {"jobs": [], "message": "Adzuna API credentials not configured"}
            # Adzuna API returns max 50 jobs per page
            # Fetch multiple pages with buffer to account for duplicate URLs during deduplication
            jobs = []
            seen_urls = set()
            max_pages = min((limit + 49) // 50 + 2, 20)  # Extra pages for duplicates, max 20 pages
            page = 1

            while len(jobs) < limit and page <= max_pages:
                page_jobs = await client.fetch_jobs(
                    keyword=keyword,
                    location=location,
                    page=page,
                    results_per_page=50
                )
                if not page_jobs:
                    break

                # Deduplicate by apply_url
                for job in page_jobs:
                    url = job.get("apply_url")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        jobs.append(job)
                        if len(jobs) >= limit:
                            break

                page += 1
        finally:
            await client.close()

    elif source == "remotive":
        client = RemotiveClient()
        try:
            jobs = await client.fetch_jobs(category=category, limit=min(limit, 1000))
        finally:
            await client.close()

    elif source == "weworkremotely":
        client = WeWorkRemotelyClient()
        try:
            jobs = await client.fetch_jobs(category=category, limit=min(limit, 1000))
        finally:
            await client.close()

    else:
        return {"error": f"Unknown source: {source}"}

    return {"jobs": jobs, "count": len(jobs), "source": source}


@router.post("/add-to-graph")
async def add_job_to_graph(
    job: Dict[str, Any] = Body(...),
    db = Depends(get_db),
):
    """
    Add a single job posting to the Neo4j knowledge graph.

    This endpoint stores the complete job data as a JobPosting node with all its properties.
    """
    apply_url = job.get("apply_url")
    if not apply_url:
        return {"success": False, "message": "Job must have an apply_url"}

    params = {
        "apply_url": apply_url,
        "title": job.get("title") or "Unknown",
        "company": job.get("company"),
        "location": job.get("location"),
        "employment_type": job.get("employment_type"),
        "remote": job.get("remote"),
        "salary_text": job.get("salary_text"),
        "posted_at": job.get("posted_at"),
        "source_url": job.get("source_url"),
        "description": job.get("description"),
        "source": job.get("source"),
        "source_job_id": job.get("source_job_id"),
    }

    cypher = """
    MERGE (j:JobPosting {apply_url: $apply_url})
    ON CREATE SET
      j.title = $title,
      j.company = $company,
      j.location = $location,
      j.employment_type = $employment_type,
      j.remote = $remote,
      j.salary_text = $salary_text,
      j.posted_at = $posted_at,
      j.source_url = $source_url,
      j.description = $description,
      j.source = $source,
      j.source_job_id = $source_job_id,
      j.created_at = datetime()
    ON MATCH SET
      j.title = coalesce($title, j.title),
      j.company = coalesce($company, j.company),
      j.location = coalesce($location, j.location),
      j.employment_type = coalesce($employment_type, j.employment_type),
      j.remote = coalesce($remote, j.remote),
      j.salary_text = coalesce($salary_text, j.salary_text),
      j.posted_at = coalesce($posted_at, j.posted_at),
      j.source_url = coalesce($source_url, j.source_url),
      j.description = coalesce($description, j.description),
      j.source = coalesce($source, j.source),
      j.source_job_id = coalesce($source_job_id, j.source_job_id),
      j.updated_at = datetime()
    RETURN j
    """

    result = await db.run(cypher, **params)
    record = await result.single()

    if record:
        return {
            "success": True,
            "message": "Job added to knowledge graph",
            "job": {
                "title": record["j"].get("title"),
                "company": record["j"].get("company"),
                "apply_url": record["j"].get("apply_url"),
            }
        }
    else:
        return {"success": False, "message": "Failed to add job"}
