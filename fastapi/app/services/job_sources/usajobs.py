"""USAJOBS API integration for federal government jobs."""

from typing import List, Dict, Any
import httpx
from datetime import datetime


class USAJobsClient:
    """
    Client for USAJOBS API.

    Note: USAJOBS API requires registration for an API key.
    Register at: https://developer.usajobs.gov/
    The API key should be passed as 'Authorization-Key' header.
    Email should be passed as 'User-Agent' header.
    """

    BASE_URL = "https://data.usajobs.gov/api/search"

    def __init__(self, api_key: str = "", email: str = ""):
        """
        Initialize USAJOBS client.

        Args:
            api_key: USAJOBS API key (register at https://developer.usajobs.gov/)
            email: Your email address for User-Agent
        """
        self.api_key = api_key
        self.email = email or "noreply@example.com"
        self.session = httpx.AsyncClient(timeout=30.0)

    def is_configured(self) -> bool:
        """Check if API credentials are configured."""
        return bool(self.api_key)

    async def close(self):
        """Close the HTTP session."""
        await self.session.aclose()

    async def fetch_jobs(
        self,
        keyword: str = "",
        location: str = "",
        remote: bool = False,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch jobs from USAJOBS API.

        Args:
            keyword: Job title or keyword search
            location: Location filter (city, state, or zip)
            remote: Filter for remote positions
            limit: Maximum number of results (max 500)

        Returns:
            List of job dictionaries in standardized format
        """
        params = {
            "Keyword": keyword,
            "ResultsPerPage": min(limit, 500),
            "Page": 1,
        }

        if location:
            params["LocationName"] = location

        if remote:
            params["RemoteIndicator"] = "True"

        if not self.is_configured():
            print("USAJOBS API key not configured. Skipping.")
            return []

        try:
            headers = {
                "User-Agent": self.email,
                "Authorization-Key": self.api_key,
            }

            response = await self.session.get(
                self.BASE_URL,
                params=params,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()

            # Parse USAJOBS response
            search_result = data.get("SearchResult", {})
            results = search_result.get("SearchResultItems", [])

            jobs = []
            for item in results:
                job_data = item.get("MatchedObjectDescriptor", {})
                jobs.append(self._parse_job(job_data))

            return jobs

        except httpx.HTTPError as e:
            print(f"USAJOBS API error: {e}")
            return []

    def _parse_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse USAJOBS job data into standardized format."""
        # Extract position details
        position_id = job_data.get("PositionID", "")
        title = job_data.get("PositionTitle", "")

        # Get organization name
        org_name = job_data.get("OrganizationName", "")

        # Get location info
        locations = job_data.get("PositionLocation", [])
        location_str = ""
        if locations and len(locations) > 0:
            loc = locations[0]
            city = loc.get("CityName", "")
            state = loc.get("StateCode", "")
            location_str = f"{city}, {state}" if city and state else (city or state)

        # Get remote indicator
        remote = job_data.get("PositionRemoteIndicator", False)
        if isinstance(remote, str):
            remote = remote.lower() in ["true", "1", "yes"]

        # Get employment type
        position_schedule = job_data.get("PositionSchedule", [])
        employment_type = position_schedule[0].get("Name", "") if position_schedule else ""

        # Get salary range
        salary_min = job_data.get("PositionRemumerationMinimumAmount", "")
        salary_max = job_data.get("PositionRemumerationMaximumAmount", "")
        salary_text = ""
        if salary_min and salary_max:
            salary_text = f"${salary_min} - ${salary_max}"
        elif salary_min:
            salary_text = f"From ${salary_min}"

        # Get posting dates
        posted_at = job_data.get("PublicationStartDate", "")
        if posted_at:
            try:
                posted_at = datetime.fromisoformat(posted_at.replace("Z", "+00:00")).isoformat()
            except (ValueError, AttributeError):
                posted_at = None

        # Get URLs
        apply_url = job_data.get("ApplyURI", [""])[0] if job_data.get("ApplyURI") else ""
        position_uri = job_data.get("PositionURI", "")

        # Get description
        description = job_data.get("UserArea", {}).get("Details", {}).get("JobSummary", "")

        return {
            "title": title,
            "company": org_name,
            "location": location_str,
            "employment_type": employment_type,
            "remote": remote,
            "salary_text": salary_text,
            "posted_at": posted_at,
            "apply_url": apply_url or position_uri,
            "source_url": position_uri,
            "description": description,
            "source": "usajobs",
            "source_job_id": position_id,
        }
