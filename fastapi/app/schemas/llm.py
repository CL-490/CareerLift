"""Structured schemas for LLM-backed features."""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ResumeGraphPerson(BaseModel):
    """Person details extracted from a resume."""

    name: str = Field(min_length=1)
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None


class ResumeGraphExperience(BaseModel):
    """Work experience extracted from a resume."""

    title: str = ""
    company: str = ""
    duration: str = ""
    description: str = ""


class ResumeGraphEducation(BaseModel):
    """Education entry extracted from a resume."""

    degree: str = ""
    institution: str = ""
    year: str = ""


class ResumeGraphData(BaseModel):
    """Validated graph payload derived from a resume."""

    person: ResumeGraphPerson
    skills: List[str] = Field(default_factory=list)
    experiences: List[ResumeGraphExperience] = Field(default_factory=list)
    education: List[ResumeGraphEducation] = Field(default_factory=list)


class CareerAdviceResponse(BaseModel):
    """Structured career advice output."""

    summary: str
    skill_gaps: List[str] = Field(default_factory=list)
    learning_path: List[str] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)


class JobAnalysisResponse(BaseModel):
    """Structured job analysis output."""

    required_skills: List[str] = Field(default_factory=list)
    preferred_qualifications: List[str] = Field(default_factory=list)
    key_responsibilities: List[str] = Field(default_factory=list)
    experience_level: str = "unknown"
    summary: str = ""


class ResumeFeedbackResponse(BaseModel):
    """Structured resume feedback output."""

    summary: str
    content_relevance: List[str] = Field(default_factory=list)
    skills_highlighting: List[str] = Field(default_factory=list)
    achievement_quantification: List[str] = Field(default_factory=list)
    format_and_structure: List[str] = Field(default_factory=list)
    prioritized_actions: List[str] = Field(default_factory=list)


class LLMErrorResponse(BaseModel):
    """Optional error payload for failed LLM operations."""

    detail: str
    code: Literal["llm_output_invalid", "llm_unavailable"]
