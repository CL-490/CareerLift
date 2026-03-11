from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class InterviewStartRequest(BaseModel):
    resume_name: str
    role_level: str = Field(..., description="Desired experience level (e.g. entry, mid, senior)")


class Question(BaseModel):
    text: str
    topic: Optional[str] = None
    difficulty: Optional[str] = None


class Evaluation(BaseModel):
    score: Optional[float] = None
    feedback: Optional[str] = None


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
    resume_name: str
    role_level: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    summary: Optional[SessionSummary] = None
