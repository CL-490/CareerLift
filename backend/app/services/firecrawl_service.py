from __future__ import annotations
import os, time, logging, re
from typing import List, Dict, Any
from pydantic import BaseModel

try:
    from firecrawl import Firecrawl  # pip install firecrawl-py
except Exception:  # pragma: no cover
    Firecrawl = None

log = logging.getLogger(__name__)
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
client = Firecrawl(api_key=FIRECRAWL_API_KEY) if (Firecrawl and FIRECRAWL_API_KEY) else None


# --- helpers (add these near the top of the file) ---
def _as_dict(obj):
    """Return a best-effort dict view for Pydantic models or plain dicts."""
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    # Pydantic v2 models
    md = getattr(obj, "model_dump", None)
    if callable(md):
        try:
            return md()
        except Exception:
            pass
    # Fallback to __dict__ for simple objects
    d = getattr(obj, "__dict__", None)
    if isinstance(d, dict):
        return d
    return {}  # unknown

def _get_attr(obj, name, default=None):
    """Safely get attribute or dict key from Pydantic model / dict."""
    if isinstance(obj, dict):
        return obj.get(name, default)
    val = getattr(obj, name, default)
    if val is default:
        d = _as_dict(obj)
        return d.get(name, default)
    return val
# --- end helpers ---


class _Job(BaseModel):
    title: str
    company: str | None = None
    location: str | None = None
    employment_type: str | None = None
    remote: bool | None = None
    salary_text: str | None = None
    posted_at: str | None = None
    apply_url: str | None = None
    source_url: str | None = None
    description: str | None = None

class _JobList(BaseModel):
    jobs: List[_Job]

def _retry(fn, tries=3, delay=1.0):
    last = None
    for i in range(tries):
        try:
            return fn()
        except Exception as e:
            last = e
            time.sleep(delay * (2 ** i))
    if last:
        raise last

def discover_links(root_url: str, limit: int = 1000) -> list[str]:
    if not client:
        return []
    res = _retry(lambda: client.map(root_url, sitemap="include", limit=limit))
    # Handle both dict and Pydantic model responses
    links = _get_attr(res, "links", [])  # MapData.links or {"links": ...}

    urls: list[str] = []
    for link in links or []:
        url = _get_attr(link, "url")
        if url:
            urls.append(url)

    allow = ("job", "careers", "positions", "openings", "greenhouse", "lever", "workday", "ashby", "apply")
    return [u for u in urls if any(a in u.lower() for a in allow)]

def extract_jobs_from_url(url: str) -> list[dict]:
    if not client:
        return []
    res = _retry(lambda: client.scrape(
        url,
        formats=[{
            "type": "json",
            "schema": _JobList,  # works on recent SDKs; switch to _JobList.model_json_schema() if needed
            "prompt": (
                "Extract all job listings on this page under 'jobs'. "
                "For each: title, company, location, employment_type, remote, salary_text, "
                "posted_at (ISO if present), apply_url (direct if possible), "
                "source_url (this page or the detail page), description (short)."
            ),
        }],
        only_main_content=True,
        timeout=120000,
    ))

    # ScrapeData may be a model with .data.json OR a dict with {"data": {"json": ...}}
    data = _get_attr(res, "data", {})
    payload = _get_attr(data, "json", {})  # ScrapeData.data.json
    jobs = payload.get("jobs", []) if isinstance(payload, dict) else []

    out: list[dict] = []
    for j in jobs:
        if not isinstance(j, dict):
            j = _as_dict(j)  # in case items are Pydantic models too
        if not j:
            continue
        j.setdefault("source_url", url)
        # light normalization
        for k in ("title", "company", "location", "employment_type", "salary_text", "description"):
            if isinstance(j.get(k), str):
                j[k] = j[k].strip()
        out.append(j)
    return out

