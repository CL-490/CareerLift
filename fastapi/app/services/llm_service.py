"""LLM service using LangChain and Ollama."""

import json
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

    async def _invoke_structured(
        self,
        prompt: ChatPromptTemplate,
        variables: dict[str, Any],
        response_model: Type[T],
    ) -> T:
        """Invoke the model and validate a JSON-shaped response."""
        chain = prompt | self.llm | self.parser
        response = await chain.ainvoke(variables)

        try:
            payload = json.loads(response)
        except json.JSONDecodeError as exc:
            raise LLMOutputError("LLM returned invalid JSON") from exc

        try:
            return response_model.model_validate(payload)
        except ValidationError as exc:
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


# Global LLM service instance
llm_service = LLMService()
