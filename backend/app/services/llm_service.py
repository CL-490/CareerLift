"""LLM service using LangChain and Ollama."""

from typing import Optional
from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.core.config import settings


class LLMService:
    """Service for LLM operations using Ollama."""

    def __init__(self):
        """Initialize the LLM service."""
        self.llm = OllamaLLM(
            base_url=settings.ollama_url,
            model=settings.ollama_model,
        )
        self.parser = StrOutputParser()

    async def generate_career_advice(
        self,
        current_role: str,
        target_role: str,
        skills: list[str],
        experience_years: int
    ) -> str:
        """Generate career advice based on user profile."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a career advisor helping professionals advance their careers."),
            ("human", """
                Current Role: {current_role}
                Target Role: {target_role}
                Current Skills: {skills}
                Years of Experience: {experience_years}

                Provide specific, actionable career advice for transitioning from the current role to the target role.
                Include skill gaps to address and recommended learning paths.
            """)
        ])

        chain = prompt | self.llm | self.parser

        response = await chain.ainvoke({
            "current_role": current_role,
            "target_role": target_role,
            "skills": ", ".join(skills),
            "experience_years": experience_years
        })

        return response

    async def analyze_job_description(self, job_description: str) -> dict:
        """Analyze a job description and extract key information."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an expert at analyzing job descriptions."),
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

        chain = prompt | self.llm | self.parser

        response = await chain.ainvoke({"job_description": job_description})

        return {"analysis": response}

    async def generate_resume_feedback(
        self,
        resume_text: str,
        target_role: str
    ) -> str:
        """Generate feedback on a resume for a target role."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a professional resume reviewer."),
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

        chain = prompt | self.llm | self.parser

        response = await chain.ainvoke({
            "target_role": target_role,
            "resume_text": resume_text
        })

        return response


# Global LLM service instance
llm_service = LLMService()
