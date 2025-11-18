"""Web scraping API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

from app.services.scraper_service import scraper_service

router = APIRouter(prefix="/scraper", tags=["scraper"])


class ScrapeJobRequest(BaseModel):
    """Request model for job scraping."""
    url: HttpUrl


class ScrapeCompanyRequest(BaseModel):
    """Request model for company scraping."""
    company_name: str
    linkedin_url: HttpUrl | None = None


@router.post("/job")
async def scrape_job(request: ScrapeJobRequest):
    """Scrape a job posting from a URL."""
    try:
        job_data = await scraper_service.scrape_job_posting(str(request.url))
        return job_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scrape job: {str(e)}")


@router.post("/company")
async def scrape_company(request: ScrapeCompanyRequest):
    """Scrape company information."""
    try:
        company_data = await scraper_service.scrape_company_info(
            company_name=request.company_name,
            linkedin_url=str(request.linkedin_url) if request.linkedin_url else None
        )
        return company_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scrape company: {str(e)}")


@router.post("/extract-text")
async def extract_text(url: HttpUrl):
    """Extract text content from a URL."""
    try:
        text = await scraper_service.extract_text_from_url(str(url))
        return {"text": text, "url": str(url)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")
