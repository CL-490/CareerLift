from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class InterviewStartRequest(BaseModel):
    resume_id: str
    job_apply_url: str
    role_level: str = Field(..., description="Desired experience level (e.g. entry, mid, senior)")


class Question(BaseModel):
    text: str
    topic: Optional[str] = None
    difficulty: Optional[str] = None


class EvaluationRubric(BaseModel):
    relevance: Optional[float] = None
    clarity: Optional[float] = None
    technical_depth: Optional[float] = None
    evidence: Optional[float] = None
    communication: Optional[float] = None


class Evaluation(BaseModel):
    score: Optional[float] = None
    feedback: Optional[str] = None
    rubric: EvaluationRubric = Field(default_factory=EvaluationRubric)
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)


class InterviewStep(BaseModel):
    question: Question
    answer: Optional[str] = None
    evaluation: Optional[Evaluation] = None
    timestamp: datetime


class InterviewResponse(BaseModel):
    next_question: Optional[Question] = None
    evaluation: Optional[Evaluation] = None
    session_complete: bool = False
    session_id: Optional[str] = None


class SessionSummary(BaseModel):
    total_score: Optional[float] = None
    overall_feedback: Optional[str] = None
    steps: List[InterviewStep]


class InterviewSession(BaseModel):
    session_id: str
    resume_id: str
    resume_name: str
    job_apply_url: str
    job_title: Optional[str] = None
    job_company: Optional[str] = None
    job_requirements: List[str] = Field(default_factory=list)
    job_responsibilities: List[str] = Field(default_factory=list)
    role_level: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    summary: Optional[SessionSummary] = None
