from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Literal
from datetime import datetime

JobSource = Literal["usajobs", "adzuna", "remotive", "weworkremotely", "scraped", "manual"]

class Job(BaseModel):
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    remote: Optional[bool] = None
    salary_text: Optional[str] = None
    posted_at: Optional[datetime] = None
    apply_url: Optional[HttpUrl] = None
    source_url: Optional[HttpUrl] = None
    description: Optional[str] = None
    source: Optional[JobSource] = None
    source_job_id: Optional[str] = None  # Unique ID from the source API

class JobList(BaseModel):
    jobs: List[Job]
