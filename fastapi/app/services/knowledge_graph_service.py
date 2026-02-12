"""Ollama-based knowledge graph transformer service."""
from __future__ import annotations
from typing import Dict, Any, List
import json
import httpx
from app.core.config import settings


class KnowledgeGraphService:
    """Service for transforming resume data into knowledge graph structures using Ollama."""

    def __init__(self):
        self.ollama_url = settings.ollama_url
        self.model = settings.ollama_model
        self.api_key = getattr(settings, 'ollama_api_key', None)

    async def transform_resume_to_graph(self, resume_text: str) -> Dict[str, Any]:
        """
        Transform resume text into a structured knowledge graph format.

        Args:
            resume_text: Raw resume text

        Returns:
            Dictionary containing nodes and relationships for Neo4j

        Raises:
            ValueError: If authentication is required (401)
        """
        prompt = f"""Extract information from this resume and return ONLY valid JSON.

Resume:
{resume_text}

Return JSON with this exact structure:
{{"person": {{"name": "...", "email": "...", "phone": "...", "location": "..."}}, "skills": [...], "experiences": [{{"title": "...", "company": "...", "duration": "...", "description": "..."}}], "education": [{{"degree": "...", "institution": "...", "year": "..."}}]}}"""

        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        async with httpx.AsyncClient(timeout=180.0) as client:
            try:
                response = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False
                    },
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                llm_response = result.get("response", "")
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 401:
                    # Get signin URL from error response
                    signin_url = None
                    try:
                        error_data = e.response.json()
                        signin_url = error_data.get("signin_url")
                    except:
                        pass

                    error_msg = "Ollama authentication required"
                    if signin_url:
                        error_msg = f"OLLAMA_AUTH_REQUIRED:{signin_url}"
                    raise ValueError(error_msg)
                raise

        # Parse the JSON response
        try:
            # Try to extract JSON from the response
            json_start = llm_response.find('{')
            json_end = llm_response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = llm_response[json_start:json_end]
                data = json.loads(json_str)
            else:
                data = json.loads(llm_response)
        except (json.JSONDecodeError, ValueError):
            # Fallback to basic structure if LLM doesn't return valid JSON
            data = {
                "person": {"name": "Unknown"},
                "skills": [],
                "experiences": [],
                "education": []
            }

        return data

    async def create_resume_subgraph(self, db, graph_data: Dict[str, Any]) -> int:
        """
        Create a subgraph in Neo4j from structured resume data.

        This method is idempotent - uploading the same resume multiple times
        will not create duplicates. All node types (Person, Skill, Experience,
        Education) use MERGE based on their content to prevent duplicate nodes.
        Existing relationships are deleted and recreated to ensure accuracy.

        Args:
            db: Neo4j database session
            graph_data: Structured data from transform_resume_to_graph

        Returns:
            Number of nodes created
        """
        nodes_created = 0

        # Create Person node
        person = graph_data.get("person", {})
        person_name = person.get("name", "Unknown")

        person_query = """
        MERGE (p:Person {name: $name})
        SET p.email = $email,
            p.phone = $phone,
            p.location = $location,
            p.updated_at = datetime()
        RETURN p
        """

        result = await db.run(person_query,
                             name=person_name,
                             email=person.get("email"),
                             phone=person.get("phone"),
                             location=person.get("location"))
        summary = await result.consume()
        nodes_created += summary.counters.nodes_created

        # Delete existing relationships (but not the nodes themselves)
        # This allows shared experience/education nodes across people
        delete_rel_query = """
        MATCH (p:Person {name: $person_name})-[r:HAS_EXPERIENCE]->(e:Experience)
        DELETE r
        """
        await db.run(delete_rel_query, person_name=person_name)

        delete_edu_rel_query = """
        MATCH (p:Person {name: $person_name})-[r:HAS_EDUCATION]->(ed:Education)
        DELETE r
        """
        await db.run(delete_edu_rel_query, person_name=person_name)

        # Create Skill nodes and relationships
        skills = graph_data.get("skills", [])
        for skill in skills:
            if isinstance(skill, str) and skill.strip():
                skill_query = """
                MERGE (s:Skill {name: $skill_name})
                WITH s
                MATCH (p:Person {name: $person_name})
                MERGE (p)-[r:HAS_SKILL]->(s)
                SET r.created_at = coalesce(r.created_at, datetime())
                RETURN s
                """
                result = await db.run(skill_query,
                                     skill_name=skill.strip(),
                                     person_name=person_name)
                summary = await result.consume()
                nodes_created += summary.counters.nodes_created

        # Create Experience nodes and relationships
        # Use MERGE to prevent duplicate experiences based on content
        experiences = graph_data.get("experiences", [])
        for exp in experiences:
            if isinstance(exp, dict):
                exp_query = """
                MERGE (e:Experience {
                    title: $title,
                    company: $company,
                    duration: $duration,
                    description: $description
                })
                ON CREATE SET e.created_at = datetime()
                WITH e
                MATCH (p:Person {name: $person_name})
                MERGE (p)-[r:HAS_EXPERIENCE]->(e)
                ON CREATE SET r.created_at = datetime()
                RETURN e
                """
                result = await db.run(exp_query,
                                     title=exp.get("title", ""),
                                     company=exp.get("company", ""),
                                     duration=exp.get("duration", ""),
                                     description=exp.get("description", ""),
                                     person_name=person_name)
                summary = await result.consume()
                nodes_created += summary.counters.nodes_created

        # Create Education nodes and relationships
        # Use MERGE to prevent duplicate education based on content
        education = graph_data.get("education", [])
        for edu in education:
            if isinstance(edu, dict):
                edu_query = """
                MERGE (e:Education {
                    degree: $degree,
                    institution: $institution,
                    year: $year
                })
                ON CREATE SET e.created_at = datetime()
                WITH e
                MATCH (p:Person {name: $person_name})
                MERGE (p)-[r:HAS_EDUCATION]->(e)
                ON CREATE SET r.created_at = datetime()
                RETURN e
                """
                result = await db.run(edu_query,
                                     degree=edu.get("degree", ""),
                                     institution=edu.get("institution", ""),
                                     year=edu.get("year", ""),
                                     person_name=person_name)
                summary = await result.consume()
                nodes_created += summary.counters.nodes_created

        return nodes_created


# Global service instance
knowledge_graph_service = KnowledgeGraphService()
