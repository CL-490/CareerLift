from __future__ import annotations
from typing import List, Dict, Any
from neo4j import AsyncGraphDatabase
import httpx
import json
#import asyncio
from backend.app.core.config import settings


driver = AsyncGraphDatabase.driver("neo4j://127.0.0.1:7687", auth=("neo4j", "comp_490"))

class JobIngest:
    #Fetches job posting and inserts them into the knowledge graph
    def __init__(self):
        self.api_url = "https://www.usajobs.gov/api/search/"
        self.user_agent = settings.usajobs_user_agent
        self.api_key = settings.usajobs_api_key

        self.ollama_url = settings.ollama_url
        self.model = settings.ollama_model

    async def fetch_jobs(self, keywords: str, location: str = "United States") -> List[Dict[str, Any]]:
        #Get job postings

        headers = {
            "Host": "data.usajobs.gov",
            "User_Agent": self.user_agent,
            "Authorization-Key": self.api_key
            
        }

        params = {
            "Keyword": keywords,
            "LocationName": location,
            "ResultsPerPage": 20
        }

        async with httpx.AsyncClient(timeout = 30.0) as client:
            response = await client.get(self.api_url, headers = headers, params = params)
            response.raise_for_status()

        items = response.json().get("SearchResult", {}).get("SearchResultItems", [])

        jobs = []

        for item in items:
            data = item.get("MatchedObjectDescriptor", {})

            job_id = str(item.get("MatchedObjectId"))
            job_title = data.get("PositionTitle")
            job_company = data.get("OrganizationName")
            locations = data.get("PositionLocation", [])
            location_name = locations[0].get("LocationName") if locations else None
            job_description = data.get("UserArea", {}).get("Details", {}).get("JobSummary")

            url = data.get("PositionURI")

            jobs.append({
                "id": job_id,
                "title": job_title,
                "company": job_company,
                "location": location_name,
                "url": url,
                "description": job_description
            })
        return jobs
    
    async def ollama_skill_extract(self, job_description: str) -> List[str]:
        prompt = f""" Extract ONLY a list of skills from the job description and return ONLY a JSON format.
        Job Description:
        {job_description}
        """

        async with httpx.AsyncClient(timeout = 30.0) as client:
            response = await client.post(
                f"{self.ollama_url}/api/generate",
                json = {"model": self.model, "prompt": prompt, "stream": False}
            )
            result = response.json()
        text = result.get("response", "").strip()
        print("Response:, ", text)

        try:
            json_start = text.find("[")
            json_end = text.rfind("]") + 1
            skills = json.loads(text[json_start:json_end])
            return skills
        except Exception:
            return []
        
    async def store_jobs(self, db, job: Dict[str, Any], skills: List[str]):
        job_query = """
        MERGE (j:Job {id: $id})
        SET j.title = $title,
            j.company = $company,
            j.location = $location,
            j.url = $url,
            j.description = $description,
            j.updated_at = datetime()
        RETURN j
        """

        await db.run(job_query, **job)

        for skill in skills:
            print("Skills: ", skill)
            if not skill or not isinstance(skill, str):
                continue
            
            skill_query = """
            MERGE (s:Skill {name: $skill})
            WITH s
            MATCH (j: Job {id: $job_id})
            MERGE (j)-[:REQUIRES_SKILLS]->(s)
            """

            await db.run(skill_query, skill = skill.strip(), job_id = job["id"])

    async def ingest_jobs (self, keywords: str, location: str = "United States") -> int:
        jobs = await self.fetch_jobs(keywords, location)
        #await JobIngest.ingest_jobs("Software Engineer", "United States")
        async with driver.session(database="neo4j") as db:
            for job in jobs:
                desc = job["description"] or job["title"] or ""
                skills = await self.ollama_skill_extract(job[desc])
                print(job["title"])
                print("Jopb desc:", desc[:200])
                print("Skills:", skills)
                await self.store_jobs(db, job, skills)
        
        return len(jobs)
    
JobIngest = JobIngest()