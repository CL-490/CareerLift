"""LLM service using LangChain and Ollama."""

import json
import logging
from typing import Any, Type, TypeVar

from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.schemas.llm import (
    CareerAdviceResponse,
    JobAnalysisResponse,
    ResumeFeedbackResponse,
)


T = TypeVar("T", bound=BaseModel)
logger = logging.getLogger(__name__)


class LLMOutputError(ValueError):
    """Raised when the LLM does not return a valid structured payload."""


class LLMService:
    """Service for LLM operations using Ollama."""

    def __init__(self):
        """Initialize the LLM service."""
        self.llm = OllamaLLM(
            base_url=settings.ollama_url,
            model=settings.ollama_model,
        )
        self.parser = StrOutputParser()

    @staticmethod
    def _truncate_text(value: str | None, limit: int) -> str:
        """Trim long prompt fields to reduce Ollama failures on oversized context."""
        text = (value or "").strip()
        if len(text) <= limit:
            return text
        return text[: limit - 3].rstrip() + "..."

    @staticmethod
    def _extract_json_payload(response: str) -> Any:
        """Parse JSON directly or recover it from mixed model output."""
        cleaned = response.strip()
        if not cleaned:
            raise json.JSONDecodeError("Empty response", cleaned, 0)

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Handle fenced code blocks such as ```json ... ```
        if "```" in cleaned:
            segments = cleaned.split("```")
            for segment in segments:
                candidate = segment.strip()
                if not candidate:
                    continue
                if candidate.lower().startswith("json"):
                    candidate = candidate[4:].strip()
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    continue

        json_start = cleaned.find("{")
        json_end = cleaned.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            return json.loads(cleaned[json_start:json_end])

        raise json.JSONDecodeError("No JSON object found", cleaned, 0)

    async def _invoke_structured(
        self,
        prompt: ChatPromptTemplate,
        variables: dict[str, Any],
        response_model: Type[T],
    ) -> T:
        """Invoke the model and validate a JSON-shaped response."""
        chain = prompt | self.llm | self.parser
        try:
            response = await chain.ainvoke(variables)
        except Exception as exc:
            logger.exception("Structured LLM invocation failed")
            raise LLMOutputError("LLM request failed") from exc

        try:
            payload = self._extract_json_payload(response)
        except json.JSONDecodeError as exc:
            preview = response.strip().replace("\n", "\\n")[:500]
            logger.warning("Structured LLM response was not valid JSON: %s", preview)

            # Interview questions are simple enough to recover from plain text.
            if response_model.__name__ == "Question":
                fallback_text = response.strip().strip("`").strip()
                if fallback_text:
                    return response_model.model_validate({"text": fallback_text})
            raise LLMOutputError("LLM returned invalid JSON") from exc

        try:
            return response_model.model_validate(payload)
        except ValidationError as exc:
            logger.warning(
                "Structured LLM response had unexpected shape for %s: %s",
                response_model.__name__,
                str(payload)[:500],
            )
            raise LLMOutputError("LLM returned an unexpected response shape") from exc

    async def generate_career_advice(
        self,
        current_role: str,
        target_role: str,
        skills: list[str],
        experience_years: int
    ) -> CareerAdviceResponse:
        """Generate career advice based on user profile."""
        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                "You are a career advisor helping professionals advance their careers. "
                "Return only valid JSON with keys: summary, skill_gaps, learning_path, next_steps.",
            ),
            ("human", """
                Current Role: {current_role}
                Target Role: {target_role}
                Current Skills: {skills}
                Years of Experience: {experience_years}

                Provide specific, actionable career advice for transitioning from the current role to the target role.
                Include skill gaps to address and recommended learning paths.
            """)
        ])

        return await self._invoke_structured(prompt, {
            "current_role": current_role,
            "target_role": target_role,
            "skills": ", ".join(skills),
            "experience_years": experience_years
        }, CareerAdviceResponse)

    async def analyze_job_description(self, job_description: str) -> JobAnalysisResponse:
        """Analyze a job description and extract key information."""
        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                "You are an expert at analyzing job descriptions. "
                "Return only valid JSON with keys: required_skills, preferred_qualifications, "
                "key_responsibilities, experience_level, summary.",
            ),
            ("human", """
                Analyze this job description and extract:
                1. Required skills
                2. Preferred qualifications
                3. Key responsibilities
                4. Experience level required

                Job Description:
                {job_description}

                Provide the analysis in a structured format.
            """)
        ])

        return await self._invoke_structured(
            prompt,
            {"job_description": job_description},
            JobAnalysisResponse,
        )

    async def generate_resume_feedback(
        self,
        resume_text: str,
        target_role: str
    ) -> ResumeFeedbackResponse:
        """Generate feedback on a resume for a target role."""
        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                "You are a professional resume reviewer. "
                "Return only valid JSON with keys: summary, content_relevance, skills_highlighting, "
                "achievement_quantification, format_and_structure, prioritized_actions.",
            ),
            ("human", """
                Target Role: {target_role}

                Resume:
                {resume_text}

                Provide specific feedback on how to improve this resume for the target role.
                Focus on:
                1. Content relevance
                2. Skills highlighting
                3. Achievement quantification
                4. Format and structure
            """)
        ])

        return await self._invoke_structured(prompt, {
            "target_role": target_role,
            "resume_text": resume_text
        }, ResumeFeedbackResponse)

    # interview helpers -----------------------------------------------------

    @staticmethod
    def _format_resume_context(resume_context: dict[str, Any]) -> str:
        """Convert graph data plus raw resume text into a concise prompt block."""
        person = resume_context.get("person") or {}
        lines = [
            f"Candidate name: {person.get('name') or 'Unknown'}",
            f"Location: {person.get('location') or 'Unknown'}",
            "Structured graph data should be treated as the primary source of truth.",
            "Raw resume text is supplemental and may contain details not yet normalized into the graph, such as projects, awards, or side work.",
            "Skills: "
            + (", ".join(resume_context.get("skills") or []) or "None found in graph"),
        ]

        experiences = resume_context.get("experiences") or []
        if experiences:
            lines.append("Experience:")
            for experience in experiences[:5]:
                title = experience.get("title") or "Untitled role"
                company = experience.get("company") or "Unknown company"
                duration = experience.get("duration") or "Unknown duration"
                description = LLMService._truncate_text(
                    experience.get("description") or "No description provided",
                    220,
                )
                lines.append(f"- {title} at {company} ({duration}): {description}")
        else:
            lines.append("Experience: None found in graph")

        education = resume_context.get("education") or []
        if education:
            lines.append("Education:")
            for entry in education[:4]:
                degree = entry.get("degree") or "Degree not listed"
                institution = entry.get("institution") or "Unknown institution"
                year = entry.get("year") or "Unknown year"
                lines.append(f"- {degree}, {institution} ({year})")
        else:
            lines.append("Education: None found in graph")

        projects = resume_context.get("projects") or []
        if projects:
            lines.append("Projects from graph:")
            for project in projects[:4]:
                lines.append(f"- {project}")
        else:
            lines.append("Projects from graph: None stored in graph")

        raw_resume_text = resume_context.get("resume_text") or ""
        if raw_resume_text:
            lines.append(
                "Supplemental raw resume text for union coverage "
                "(use this for details not present in the graph):"
            )
            lines.append(LLMService._truncate_text(raw_resume_text, 1800))

        return "\n".join(lines)

    async def generate_interview_question(
        self,
        resume_context: dict[str, Any],
        role_level: str,
        job_context: dict[str, Any],
        previous_steps: list[dict[str, str]] | None = None,
    ) -> "Question":
        """Produce the next interview question from structured resume graph data and job context."""
        from app.schemas.interview import Question

        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                "You are an experienced interviewer. "
                "Given a candidate's structured resume graph context, raw resume text, target job context, and desired role level, generate an appropriate next question. "
                "Use a union of the graph-backed profile and the raw resume text. "
                "Treat graph-backed skills, experience, education, and projects as the primary structured source, "
                "but also use raw resume text for important details that may not yet exist in the graph, especially projects, accomplishments, and side work. "
                "Prioritize questions that test the candidate's real background against the selected job's missing or important requirements. "
                "Do not invent projects or experience not present in either source. "
                "Return only valid JSON with key `text`."
            ),
            (
                "human",
                """
                Candidate profile from Neo4j:
                {resume_profile}

                Target job title: {job_title}
                Company: {job_company}
                Job description:
                {job_description}

                Required skills: {required_skills}
                Preferred skills: {preferred_skills}
                Key responsibilities: {responsibility_keywords}

                Role level: {role_level}

                {history_section}

                Return the next question as JSON. Ask something that helps assess fit for this specific role
                based on the candidate's actual background from either the graph or the raw resume text,
                especially if the raw resume text contains projects or evidence missing from the graph.
            """
            ),
        ])

        history_section = ""
        if previous_steps:
            entries = []
            for step in previous_steps[-3:]:
                entries.append(
                    "Q: "
                    + self._truncate_text(step["question"], 220)
                    + "\nA: "
                    + self._truncate_text(step["answer"], 320)
                )
            history_section = "Previous Q/A:\n" + "\n".join(entries)

        variables = {
            "resume_profile": self._format_resume_context(resume_context),
            "job_title": job_context.get("title") or "Target role",
            "job_company": job_context.get("company") or "Unknown company",
            "job_description": self._truncate_text(
                job_context.get("description") or "No job description available.",
                1800,
            ),
            "required_skills": ", ".join((job_context.get("required_skills") or [])[:12]) or "None listed",
            "preferred_skills": ", ".join((job_context.get("preferred_skills") or [])[:10]) or "None listed",
            "responsibility_keywords": ", ".join((job_context.get("responsibility_keywords") or [])[:10]) or "None listed",
            "role_level": role_level,
            "history_section": history_section,
        }

        result = await self._invoke_structured(prompt, variables, Question)
        return result

    async def evaluate_interview_answer(
        self,
        question: str,
        answer: str,
        role_level: str,
        resume_context: dict[str, Any],
        job_context: dict[str, Any],
    ) -> "Evaluation":
        from app.schemas.interview import Evaluation

        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                "You are a skilled interviewer evaluating candidate answers. "
                "Evaluate the answer against the selected job, the asked question, and the candidate's combined resume context. "
                "Use a union of graph-backed resume data and raw resume text when judging relevance and evidence. "
                "Treat the graph as the primary structured source, but allow raw resume text to supply missing details such as projects, accomplishments, and side work. "
                "Do not credit the candidate for experience or projects not present in either source unless the answer clearly frames them as separate learning or side work. "
                "Return JSON with keys `score`, `feedback`, `rubric`, `strengths`, and `improvements`. "
                "`rubric` must include numeric 0-10 scores for relevance, clarity, technical_depth, evidence, and communication."
            ),
            (
                "human",
                """
                Target job title: {job_title}
                Company: {job_company}
                Job description:
                {job_description}

                Required skills: {required_skills}
                Preferred skills: {preferred_skills}
                Key responsibilities: {responsibility_keywords}
                Role level: {role_level}

                Candidate profile from Neo4j:
                {resume_profile}

                Question:
                {question}

                Candidate Answer:
                {answer}

                Provide a numeric overall score (0-10), concise feedback, five rubric scores,
                2-3 strengths, and 2-3 improvement suggestions.
                Reward answers that clearly connect resume experience to this specific role.
                Penalize generic or role-mismatched answers.
            """
            ),
        ])

        return await self._invoke_structured(
            prompt,
            {
                "job_title": job_context.get("title") or "Target role",
                "job_company": job_context.get("company") or "Unknown company",
                "job_description": self._truncate_text(
                    job_context.get("description") or "No job description available.",
                    1800,
                ),
                "required_skills": ", ".join((job_context.get("required_skills") or [])[:12]) or "None listed",
                "preferred_skills": ", ".join((job_context.get("preferred_skills") or [])[:10]) or "None listed",
                "responsibility_keywords": ", ".join((job_context.get("responsibility_keywords") or [])[:10]) or "None listed",
                "role_level": role_level,
                "resume_profile": self._format_resume_context(resume_context),
                "question": self._truncate_text(question, 320),
                "answer": self._truncate_text(answer, 900),
            },
            Evaluation,
        )


# Global LLM service instance
llm_service = LLMService()
