from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime

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

class JobList(BaseModel):
    jobs: List[Job]
