from __future__ import annotations
from typing import List, Dict, Any, Literal
import asyncio
from app.services.playwright import discover_links, extract_jobs_from_url
from app.services.job_sources import (
    USAJobsClient,
    AdzunaClient,
    RemotiveClient,
    WeWorkRemotelyClient,
)
from app.core.config import settings
from pathlib import Path
import os, json

COMMON_SOURCES = [
    # Major ATS / job-board hosts (generic):
    # "https://careers.icims.com/",
    # company career roots that don't use the above:
    "https://stripe.com/jobs",
    # "https://openai.com/careers",
]

SAMPLE_JOBS_PATH = os.getenv("JOBS_SAMPLE_PATH", "/app/app/data/sample_jobs.json")

JobSourceType = Literal["usajobs", "adzuna", "remotive", "weworkremotely", "scraped"]

# Changeable constant
JOBS_INGEST_LIMIT = 30

def _load_sample_jobs() -> list[dict]:
    p = Path(SAMPLE_JOBS_PATH)
    if not p.exists():
        return []
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return []
    if isinstance(data, dict) and isinstance(data.get("jobs"), list):
        return [j for j in data["jobs"] if isinstance(j, dict)]
    if isinstance(data, list):
        return [j for j in data if isinstance(j, dict)]
    return []


async def ingest_from_seeds(db, seed_urls: list[str], max_jobs: int | None = None, offline: bool = False) -> int:
    """
    db is your async Neo4j session from get_db().
    Returns count of NEW job nodes created (updates not counted).
    Stops early once limit is reached.
    """
    limit = max_jobs if (max_jobs is not None and max_jobs > 0) else JOBS_INGEST_LIMIT

    seen_urls: set[str] = set()
    created_total = 0
    # Optionally, cap "attempted" jobs instead of "created" by tracking a seen counter
    # seen_jobs = 0
    
    # --- Offline/sample-first path ---
    sample = _load_sample_jobs() if (offline or Path(SAMPLE_JOBS_PATH).exists()) else []
    if sample:
        created = 0
        for job in sample:
            if created >= limit:
                break
            created += await _upsert_job(db, job)
        return created

    for seed in seed_urls:
        links = await asyncio.to_thread(discover_links, seed)
        for url in links:
            if url in seen_urls:
                continue
            seen_urls.add(url)

            # bail early if we already hit limit
            if created_total >= limit:
                return created_total

            jobs = await asyncio.to_thread(extract_jobs_from_url, url)
            for job in jobs:
                # If you want to limit by "attempted", uncomment:
                # seen_jobs += 1
                # if seen_jobs > limit: return created_total

                if created_total >= limit:
                    return created_total

                created_total += await _upsert_job(db, job)

                if created_total >= limit:
                    return created_total

    return created_total

async def ingest_from_usajobs(
    db,
    keyword: str = "",
    location: str = "",
    remote: bool = False,
    limit: int = 100
) -> int:
    """
    Ingest jobs from USAJOBS API.

    Args:
        db: Neo4j database session
        keyword: Job title or keyword search
        location: Location filter
        remote: Filter for remote positions
        limit: Maximum number of jobs to ingest

    Returns:
        Number of new jobs created
    """
    client = USAJobsClient(settings.usajobs_api_key, settings.usajobs_email)
    try:
        if not client.is_configured():
            print("USAJOBS API key not configured. Skipping.")
            return 0

        jobs = await client.fetch_jobs(keyword, location, remote, limit)
        created = 0
        for job in jobs:
            created += await _upsert_job(db, job)
        return created
    finally:
        await client.close()


async def ingest_from_adzuna(
    db,
    keyword: str = "",
    location: str = "",
    limit: int = 50
) -> int:
    """
    Ingest jobs from Adzuna API.

    Args:
        db: Neo4j database session
        keyword: Job title or keyword search
        location: Location filter
        limit: Maximum number of jobs to ingest

    Returns:
        Number of new jobs created
    """
    client = AdzunaClient(settings.adzuna_app_id, settings.adzuna_app_key)
    try:
        if not client.is_configured():
            print("Adzuna API credentials not configured. Skipping.")
            return 0

        jobs = await client.fetch_jobs(keyword, location, results_per_page=limit)
        created = 0
        for job in jobs:
            created += await _upsert_job(db, job)
        return created
    finally:
        await client.close()


async def ingest_from_remotive(
    db,
    category: str = None,
    limit: int = 100
) -> int:
    """
    Ingest jobs from Remotive API.

    Args:
        db: Neo4j database session
        category: Job category filter
        limit: Maximum number of jobs to ingest

    Returns:
        Number of new jobs created
    """
    client = RemotiveClient()
    try:
        jobs = await client.fetch_jobs(category=category, limit=limit)
        created = 0
        for job in jobs:
            created += await _upsert_job(db, job)
        return created
    finally:
        await client.close()


async def ingest_from_weworkremotely(
    db,
    category: str = None,
    limit: int = 100
) -> int:
    """
    Ingest jobs from WeWorkRemotely RSS.

    Args:
        db: Neo4j database session
        category: Job category (programming, design, devops, etc.)
        limit: Maximum number of jobs to ingest

    Returns:
        Number of new jobs created
    """
    client = WeWorkRemotelyClient()
    try:
        jobs = await client.fetch_jobs(category=category, limit=limit)
        created = 0
        for job in jobs:
            created += await _upsert_job(db, job)
        return created
    finally:
        await client.close()


async def ingest_all_sources(
    db,
    limit_per_source: int = 50
) -> Dict[str, int]:
    """
    Ingest jobs from all configured sources.

    Args:
        db: Neo4j database session
        limit_per_source: Maximum jobs to fetch from each source

    Returns:
        Dictionary with counts per source
    """
    results = {}

    # USAJOBS - federal jobs
    print("Fetching from USAJOBS...")
    results["usajobs"] = await ingest_from_usajobs(db, limit=limit_per_source)

    # Adzuna - commercial jobs
    print("Fetching from Adzuna...")
    results["adzuna"] = await ingest_from_adzuna(db, limit=limit_per_source)

    # Remotive - remote jobs
    print("Fetching from Remotive...")
    results["remotive"] = await ingest_from_remotive(db, limit=limit_per_source)

    # WeWorkRemotely - remote jobs
    print("Fetching from WeWorkRemotely...")
    results["weworkremotely"] = await ingest_from_weworkremotely(db, limit=limit_per_source)

    return results


async def _upsert_job(db, job: Dict[str, Any]) -> int:
    apply_url = job.get("apply_url")
    if not apply_url:
        return 0  # skip if no stable unique key

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
    """
    result = await db.run(cypher, **params)
    summary = await result.consume()
    return summary.counters.nodes_created  # 1 if created, 0 if updated