"""Career-related data models."""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class CareerGoal(BaseModel):
    """Career goal model."""

    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    target_role: str
    target_company: Optional[str] = None
    deadline: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Skill(BaseModel):
    """Skill model."""

    id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=100)
    category: str
    proficiency_level: int = Field(ge=1, le=5)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Experience(BaseModel):
    """Work experience model."""

    id: Optional[str] = None
    company: str
    role: str
    description: str
    start_date: datetime
    end_date: Optional[datetime] = None
    is_current: bool = False
    skills_used: list[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LLMRecommendation(BaseModel):
    """LLM-generated recommendation model."""

    id: Optional[str] = None
    recommendation_type: str
    content: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
