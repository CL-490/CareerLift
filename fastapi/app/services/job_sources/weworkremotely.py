"""WeWorkRemotely RSS feed integration for remote job listings."""

from typing import List, Dict, Any, Optional
import httpx
from datetime import datetime
import xml.etree.ElementTree as ET
import re


class WeWorkRemotelyClient:
    """Client for WeWorkRemotely RSS feed (no authentication required)."""

    RSS_URL = "https://weworkremotely.com/categories/remote-programming-jobs.rss"
    CATEGORIES = {
        "programming": "https://weworkremotely.com/categories/remote-programming-jobs.rss",
        "design": "https://weworkremotely.com/categories/remote-design-jobs.rss",
        "devops": "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
        "marketing": "https://weworkremotely.com/categories/remote-marketing-jobs.rss",
        "customer-support": "https://weworkremotely.com/categories/remote-customer-support-jobs.rss",
        "sales": "https://weworkremotely.com/categories/remote-sales-jobs.rss",
        "product": "https://weworkremotely.com/categories/remote-product-jobs.rss",
    }

    def __init__(self):
        """Initialize WeWorkRemotely client."""
        self.session = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close the HTTP session."""
        await self.session.aclose()

    async def fetch_jobs(
        self,
        category: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch jobs from WeWorkRemotely RSS feed.

        Args:
            category: Category to fetch (programming, design, devops, etc.)
            limit: Maximum number of results to return

        Returns:
            List of job dictionaries in standardized format
        """
        # Use specified category or default to programming
        rss_url = self.CATEGORIES.get(category, self.RSS_URL)

        try:
            response = await self.session.get(rss_url)
            response.raise_for_status()

            # Parse RSS XML
            root = ET.fromstring(response.text)

            jobs = []
            items = root.findall(".//item")[:limit]

            for item in items:
                job = self._parse_rss_item(item, category)
                if job:
                    jobs.append(job)

            return jobs

        except (httpx.HTTPError, ET.ParseError) as e:
            print(f"WeWorkRemotely RSS error: {e}")
            return []

    def _parse_rss_item(self, item: ET.Element, category: Optional[str]) -> Optional[Dict[str, Any]]:
        """Parse RSS item into standardized job format."""
        try:
            # Extract basic fields
            title_elem = item.find("title")
            link_elem = item.find("link")
            description_elem = item.find("description")
            pub_date_elem = item.find("pubDate")

            if not title_elem or not link_elem:
                return None

            title_text = title_elem.text or ""
            link = link_elem.text or ""
            description = description_elem.text or "" if description_elem is not None else ""
            pub_date = pub_date_elem.text or "" if pub_date_elem is not None else ""

            # Parse title - WeWorkRemotely format: "Company Name: Job Title"
            company = ""
            title = title_text
            if ": " in title_text:
                parts = title_text.split(": ", 1)
                company = parts[0].strip()
                title = parts[1].strip()

            # Parse description to extract additional info
            # WeWorkRemotely descriptions often contain location, type info
            location_str = "Remote"

            # Try to extract location from description
            location_match = re.search(r'Location:?\s*([^<\n]+)', description, re.IGNORECASE)
            if location_match:
                location_str = location_match.group(1).strip()

            # Determine employment type from description
            employment_type = "Full-time"
            if re.search(r'\bpart[- ]time\b', description, re.IGNORECASE):
                employment_type = "Part-time"
            elif re.search(r'\bcontract\b', description, re.IGNORECASE):
                employment_type = "Contract"
            elif re.search(r'\bfreelance\b', description, re.IGNORECASE):
                employment_type = "Freelance"

            if category:
                employment_type = f"{employment_type} - {category.title()}"

            # All WeWorkRemotely jobs are remote
            remote = True

            # Parse publication date
            posted_at = None
            if pub_date:
                try:
                    # RSS pubDate format: "Wed, 15 Jan 2025 12:00:00 +0000"
                    dt = datetime.strptime(pub_date, "%a, %d %b %Y %H:%M:%S %z")
                    posted_at = dt.isoformat()
                except ValueError:
                    pass

            # Extract job ID from URL
            job_id = link.split("/")[-1] if "/" in link else link

            return {
                "title": title,
                "company": company,
                "location": location_str,
                "employment_type": employment_type,
                "remote": remote,
                "salary_text": None,  # WeWorkRemotely doesn't typically include salary in RSS
                "posted_at": posted_at,
                "apply_url": link,
                "source_url": link,
                "description": description,
                "source": "weworkremotely",
                "source_job_id": job_id,
            }

        except Exception as e:
            print(f"Error parsing WeWorkRemotely RSS item: {e}")
            return None

    @staticmethod
    def get_available_categories() -> List[str]:
        """Get list of available job categories."""
        return list(WeWorkRemotelyClient.CATEGORIES.keys())
