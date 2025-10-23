"""Web scraping service using Playwright."""

from typing import Optional
from playwright.async_api import async_playwright, Browser, Page


class ScraperService:
    """Service for web scraping using Playwright."""

    def __init__(self):
        """Initialize the scraper service."""
        self.browser: Optional[Browser] = None

    async def initialize(self):
        """Initialize the browser."""
        if not self.browser:
            playwright = await async_playwright().start()
            self.browser = await playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )

    async def close(self):
        """Close the browser."""
        if self.browser:
            await self.browser.close()
            self.browser = None

    async def scrape_job_posting(self, url: str) -> dict:
        """Scrape a job posting from a URL."""
        await self.initialize()

        page = await self.browser.new_page()

        try:
            await page.goto(url, wait_until="networkidle")

            # Extract job information
            title = await page.title()

            # Try to get job description
            description = ""
            try:
                description = await page.locator("div.job-description, div.description, article").first.inner_text()
            except:
                description = await page.locator("body").inner_text()

            return {
                "title": title,
                "description": description,
                "url": url
            }

        finally:
            await page.close()

    async def scrape_company_info(self, company_name: str, linkedin_url: Optional[str] = None) -> dict:
        """Scrape company information."""
        await self.initialize()

        page = await self.browser.new_page()

        try:
            # Search for company on Google
            search_query = f"{company_name} company information"
            await page.goto(f"https://www.google.com/search?q={search_query}")

            # Extract basic information from search results
            info = {
                "name": company_name,
                "description": "",
                "industry": "",
                "source": "google_search"
            }

            try:
                # Try to get company description from knowledge panel
                description = await page.locator("div.kno-rdesc span").first.inner_text()
                info["description"] = description
            except:
                pass

            return info

        finally:
            await page.close()

    async def extract_text_from_url(self, url: str) -> str:
        """Extract all text content from a URL."""
        await self.initialize()

        page = await self.browser.new_page()

        try:
            await page.goto(url, wait_until="networkidle")
            text = await page.locator("body").inner_text()
            return text

        finally:
            await page.close()


# Global scraper service instance
scraper_service = ScraperService()
