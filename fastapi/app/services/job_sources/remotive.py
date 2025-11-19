"""Remotive API integration for remote job listings."""

from typing import List, Dict, Any, Optional
import httpx
from datetime import datetime


class RemotiveClient:
    """Client for Remotive API (no authentication required)."""

    BASE_URL = "https://remotive.com/api/remote-jobs"

    def __init__(self):
        """Initialize Remotive client."""
        self.session = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close the HTTP session."""
        await self.session.aclose()

    async def fetch_jobs(
        self,
        category: Optional[str] = None,
        company: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch jobs from Remotive API.

        Args:
            category: Filter by category (e.g., 'software-dev', 'marketing')
            company: Filter by company name
            limit: Maximum number of results to return

        Returns:
            List of job dictionaries in standardized format
        """
        params = {}
        if category:
            params["category"] = category
        if company:
            params["company_name"] = company

        try:
            response = await self.session.get(
                self.BASE_URL,
                params=params
            )
            response.raise_for_status()
            data = response.json()

            # Parse Remotive response
            jobs_data = data.get("jobs", [])
            jobs = [self._parse_job(job_data) for job_data in jobs_data[:limit]]

            return jobs

        except httpx.HTTPError as e:
            print(f"Remotive API error: {e}")
            return []

    def _parse_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Remotive job data into standardized format."""
        # Extract job details
        job_id = job_data.get("id", "")
        title = job_data.get("title", "")

        # Get company info
        company = job_data.get("company_name", "")

        # Get location - Remotive jobs are remote but may have location preference
        candidate_required_location = job_data.get("candidate_required_location", "")
        location_str = candidate_required_location if candidate_required_location else "Remote"

        # Get job type
        job_type = job_data.get("job_type", "")
        employment_type = job_type if job_type else "Full-time"

        # All Remotive jobs are remote
        remote = True

        # Get salary (Remotive often doesn't provide this)
        salary = job_data.get("salary", "")
        salary_text = salary if salary else None

        # Get posting date
        posted_at = job_data.get("publication_date", "")
        if posted_at:
            try:
                # Remotive uses ISO format
                posted_at = datetime.fromisoformat(posted_at.replace("Z", "+00:00")).isoformat()
            except (ValueError, AttributeError):
                posted_at = None

        # Get URLs
        apply_url = job_data.get("url", "")

        # Get description
        description = job_data.get("description", "")

        # Get category
        category = job_data.get("category", "")
        if category:
            # Add category to description or employment_type if needed
            employment_type = f"{employment_type} - {category}" if employment_type else category

        return {
            "title": title,
            "company": company,
            "location": location_str,
            "employment_type": employment_type,
            "remote": remote,
            "salary_text": salary_text,
            "posted_at": posted_at,
            "apply_url": apply_url,
            "source_url": apply_url,
            "description": description,
            "source": "remotive",
            "source_job_id": str(job_id),
        }

    async def get_categories(self) -> List[str]:
        """
        Get available job categories from Remotive.

        Returns:
            List of category slugs
        """
        try:
            response = await self.session.get(self.BASE_URL)
            response.raise_for_status()
            data = response.json()

            # Extract unique categories
            jobs = data.get("jobs", [])
            categories = set()
            for job in jobs:
                category = job.get("category")
                if category:
                    categories.add(category)

            return sorted(list(categories))

        except httpx.HTTPError as e:
            print(f"Remotive API error: {e}")
            return []
