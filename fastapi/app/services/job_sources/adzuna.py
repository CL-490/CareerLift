"""Adzuna API integration for commercial job aggregation."""

from typing import List, Dict, Any, Optional
import httpx
from datetime import datetime


class AdzunaClient:
    """Client for Adzuna API (requires API key)."""

    BASE_URL = "https://api.adzuna.com/v1/api/jobs/us/search"

    def __init__(self, app_id: str, app_key: str):
        """
        Initialize Adzuna client.

        Args:
            app_id: Adzuna application ID
            app_key: Adzuna application key
        """
        self.app_id = app_id
        self.app_key = app_key
        self.session = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close the HTTP session."""
        await self.session.aclose()

    def is_configured(self) -> bool:
        """Check if API credentials are configured."""
        return bool(self.app_id and self.app_key)

    async def fetch_jobs(
        self,
        keyword: str = "",
        location: str = "",
        page: int = 1,
        results_per_page: int = 50,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch jobs from Adzuna API.

        Args:
            keyword: Job title or keyword search
            location: Location filter
            page: Page number (1-indexed)
            results_per_page: Results per page (max 50)
            category: Job category tag

        Returns:
            List of job dictionaries in standardized format
        """
        if not self.is_configured():
            print("Adzuna API credentials not configured")
            return []

        params = {
            "app_id": self.app_id,
            "app_key": self.app_key,
            "results_per_page": min(results_per_page, 50),
            "what": keyword,
            "where": location,
        }

        if category:
            params["category"] = category

        try:
            response = await self.session.get(
                f"{self.BASE_URL}/{page}",
                params=params,
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            data = response.json()

            # Parse Adzuna response
            results = data.get("results", [])
            jobs = [self._parse_job(job_data) for job_data in results]

            return jobs

        except httpx.HTTPError as e:
            print(f"Adzuna API error: {e}")
            return []

    def _parse_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Adzuna job data into standardized format."""
        # Extract job details
        job_id = job_data.get("id", "")
        title = job_data.get("title", "")

        # Get company info
        company = job_data.get("company", {}).get("display_name", "")

        # Get location
        location_data = job_data.get("location", {})
        location_str = location_data.get("display_name", "")

        # Get employment type from contract_type or category
        contract_type = job_data.get("contract_type", "")
        employment_type = contract_type if contract_type else ""

        # Remote jobs are not explicitly tagged in Adzuna, but may be in description
        remote = False
        description = job_data.get("description", "")
        if description:
            desc_lower = description.lower()
            remote = any(
                term in desc_lower
                for term in ["remote", "work from home", "wfh", "telecommute"]
            )

        # Get salary
        salary_min = job_data.get("salary_min")
        salary_max = job_data.get("salary_max")
        salary_text = ""
        if salary_min and salary_max:
            salary_text = f"${int(salary_min):,} - ${int(salary_max):,}"
        elif salary_min:
            salary_text = f"From ${int(salary_min):,}"
        elif salary_max:
            salary_text = f"Up to ${int(salary_max):,}"

        # Get posting date
        posted_at = job_data.get("created", "")
        if posted_at:
            try:
                # Adzuna uses ISO format
                posted_at = datetime.fromisoformat(posted_at.replace("Z", "+00:00")).isoformat()
            except (ValueError, AttributeError):
                posted_at = None

        # Get URLs
        apply_url = job_data.get("redirect_url", "")

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
            "source": "adzuna",
            "source_job_id": str(job_id),
        }

    @staticmethod
    def get_attribution_text() -> str:
        """
        Get required attribution text for Adzuna.

        Must be displayed when showing Adzuna job results.
        """
        return "Jobs powered by Adzuna"
