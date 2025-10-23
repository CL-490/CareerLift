"""Playwright-based web scraping service for job listings."""
from __future__ import annotations
import asyncio
import re
from typing import List, Dict, Any
from playwright.async_api import async_playwright, Browser, Page


class PlaywrightScraperService:
    """Service for scraping job listings using Playwright."""

    def __init__(self):
        self.browser: Browser | None = None

    async def initialize(self):
        """Initialize Playwright browser."""
        # Browser is initialized by scraper_service lifespan
        pass

    async def close(self):
        """Close Playwright browser."""
        if self.browser:
            await self.browser.close()
            self.browser = None


async def discover_links(root_url: str, limit: int = 100) -> list[str]:
    """
    Discover job-related links from a careers page.

    Args:
        root_url: The root URL to scrape
        limit: Maximum number of links to discover

    Returns:
        List of job-related URLs
    """
    urls: list[str] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto(root_url, wait_until='networkidle', timeout=30000)
            await page.wait_for_timeout(2000)  # Wait for dynamic content

            # Get all links
            links = await page.query_selector_all('a[href]')

            for link in links[:limit]:
                href = await link.get_attribute('href')
                if href:
                    # Convert relative URLs to absolute
                    if href.startswith('/'):
                        from urllib.parse import urljoin
                        href = urljoin(root_url, href)

                    # Filter for job-related URLs
                    job_keywords = ('job', 'career', 'position', 'opening',
                                   'greenhouse', 'lever', 'workday', 'ashby', 'apply')
                    if any(keyword in href.lower() for keyword in job_keywords):
                        urls.append(href)

        finally:
            await browser.close()

    return list(set(urls))[:limit]  # Remove duplicates


async def extract_jobs_from_url(url: str) -> list[dict]:
    """
    Extract job listings from a URL using Playwright.

    Args:
        url: The URL to scrape for job listings

    Returns:
        List of job dictionaries
    """
    jobs: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto(url, wait_until='networkidle', timeout=30000)
            await page.wait_for_timeout(2000)

            # Extract page text for job detection
            page_text = await page.text_content('body') or ''

            # Try to find job listings using common selectors
            job_selectors = [
                'div[class*="job"]',
                'div[class*="position"]',
                'article[class*="job"]',
                'li[class*="job"]',
                '.job-listing',
                '.position-listing',
            ]

            for selector in job_selectors:
                elements = await page.query_selector_all(selector)
                if elements and len(elements) > 0:
                    for element in elements[:20]:  # Limit to 20 jobs per page
                        job_text = await element.text_content() or ''

                        # Extract job information using heuristics
                        job = await _extract_job_from_element(element, url, job_text)
                        if job.get('title'):
                            jobs.append(job)

                    if jobs:
                        break  # Found jobs, no need to try other selectors

            # If no structured jobs found, try to extract from page text
            if not jobs:
                jobs = await _extract_jobs_from_text(page_text, url)

        finally:
            await browser.close()

    return jobs


async def _extract_job_from_element(element, url: str, job_text: str) -> dict:
    """Extract job information from a page element."""
    job: dict[str, Any] = {
        'source_url': url,
        'apply_url': url,
    }

    # Try to find title (usually in h1, h2, h3, or strong tags)
    title_elem = await element.query_selector('h1, h2, h3, h4, strong, .title, .job-title')
    if title_elem:
        job['title'] = (await title_elem.text_content() or '').strip()
    else:
        # Fallback: use first line or first few words
        lines = job_text.strip().split('\n')
        job['title'] = lines[0][:100] if lines else 'Unknown Position'

    # Try to find apply link
    link_elem = await element.query_selector('a[href*="apply"], a[href*="job"]')
    if link_elem:
        href = await link_elem.get_attribute('href')
        if href:
            from urllib.parse import urljoin
            job['apply_url'] = urljoin(url, href)

    # Extract other info from text
    if 'remote' in job_text.lower():
        job['remote'] = True

    # Try to extract company, location from text
    location_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})\b'
    location_match = re.search(location_pattern, job_text)
    if location_match:
        job['location'] = location_match.group(1)

    job['description'] = job_text[:500] if job_text else ''

    return job


async def _extract_jobs_from_text(page_text: str, url: str) -> list[dict]:
    """Extract jobs from unstructured page text."""
    jobs: list[dict] = []

    # Simple fallback: treat the page as a single job listing
    if 'job' in page_text.lower() or 'position' in page_text.lower():
        lines = page_text.strip().split('\n')
        title = next((line.strip() for line in lines if len(line.strip()) > 5), 'Position Available')

        jobs.append({
            'title': title[:100],
            'source_url': url,
            'apply_url': url,
            'description': page_text[:500],
        })

    return jobs


# Global service instance
playwright_scraper_service = PlaywrightScraperService()
