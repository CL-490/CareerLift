import pytest
from datetime import datetime

from app.services.interview_service import InterviewService
from app.services import interview_service
from app.services.llm_service import LLMOutputError, llm_service
from app.schemas.interview import Question, Evaluation, InterviewResponse


class DummyResult:
    def __init__(self, data):
        self._data = data

    async def single(self):
        return self._data

    async def data(self):
        if isinstance(self._data, list):
            return self._data
        return [self._data]

    async def consume(self):
        return


class DummyDB:
    def __init__(self):
        self.calls = []

    async def run(self, query, **kwargs):
        self.calls.append((query, kwargs))
        if "MATCH (r:Resume {id: $resume_id})-[:BELONGS_TO]->(p:Person)" in query:
            return DummyResult({
                "resume_id": "resume-123",
                "resume_name": "myresume",
                "resume_text": "dummy resume text",
                "person_name": "Jane Doe",
                "person_email": "jane@example.com",
                "person_phone": "555-0100",
                "person_location": "Remote",
                "skills": ["Python", "FastAPI"],
                "experiences": [
                    {
                        "title": "Backend Engineer",
                        "company": "Acme",
                        "duration": "2023-2025",
                        "description": "Built APIs and services",
                    }
                ],
                "education": [
                    {
                        "degree": "BS Computer Science",
                        "institution": "State University",
                        "year": "2023",
                    }
                ],
            })
        if "MATCH (r:Resume {id: $resume_id})-[:SAVED_JOB]->(j:JobPosting" in query:
            return DummyResult({
                "apply_url": "https://example.com/job",
                "title": "Backend Engineer",
                "company": "Acme",
                "location": "Remote",
                "description": "Build APIs with Python and FastAPI. Required: Python, FastAPI. Bonus: Docker.",
                "source": "remotive",
            })
        if "RETURN st.question" in query and "ORDER BY" in query:
            return DummyResult([
                {"question": "Q1", "answer": "A1", "score": 5, "feedback": "ok", "ts": datetime.utcnow()}
            ])
        if "RETURN s.resume_id" in query:
            return DummyResult({
                "resume_id": "resume-123",
                "resume_name": "myresume",
                "role_level": "entry",
                "job_apply_url": "https://example.com/job",
            })
        return DummyResult({})


@pytest.mark.asyncio
async def test_start_and_submit():
    db = DummyDB()

    async def fake_question(resume_context, role_level, job_context, previous_steps=None):
        assert resume_context["skills"] == ["Python", "FastAPI"]
        assert resume_context["experiences"][0]["title"] == "Backend Engineer"
        return Question(text="What is 2+2?")

    async def fake_eval(question, answer, role_level, resume_context, job_context):
        assert resume_context["education"][0]["degree"] == "BS Computer Science"
        return Evaluation(
            score=9.0,
            feedback="Great",
            rubric={
                "relevance": 9.0,
                "clarity": 8.5,
                "technical_depth": 8.0,
                "evidence": 9.5,
                "communication": 8.5,
            },
            strengths=["Strong example"],
            improvements=["Add more implementation detail"],
        )

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(llm_service, "generate_interview_question", fake_question)
    monkeypatch.setattr(llm_service, "evaluate_interview_answer", fake_eval)

    resp: InterviewResponse = await interview_service.start_session(
        db,
        "resume-123",
        "https://example.com/job",
        "entry",
    )
    assert resp.session_id is not None
    assert resp.next_question.text == "What is 2+2?"

    resp2: InterviewResponse = await interview_service.submit_answer(db, resp.session_id, "4")
    assert resp2.evaluation.score == 9.0
    assert resp2.next_question.text == "What is 2+2?"

    monkeypatch.undo()


@pytest.mark.asyncio
async def test_submit_uses_fallback_question_when_llm_followup_fails():
    db = DummyDB()

    async def fake_question(resume_context, role_level, job_context, previous_steps=None):
        if previous_steps:
            raise LLMOutputError("LLM request failed")
        return Question(text="What is 2+2?")

    async def fake_eval(question, answer, role_level, resume_context, job_context):
        return Evaluation(
            score=8.0,
            feedback="Solid answer",
            rubric={
                "relevance": 8.0,
                "clarity": 8.0,
                "technical_depth": 7.5,
                "evidence": 7.5,
                "communication": 8.0,
            },
            strengths=["Relevant example"],
            improvements=["Add more measurable impact"],
        )

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(llm_service, "generate_interview_question", fake_question)
    monkeypatch.setattr(llm_service, "evaluate_interview_answer", fake_eval)

    resp = await interview_service.start_session(
        db,
        "resume-123",
        "https://example.com/job",
        "entry",
    )
    resp2 = await interview_service.submit_answer(db, resp.session_id, "4")

    assert resp2.evaluation.score == 8.0
    assert "Backend Engineer" in resp2.next_question.text or "Python" in resp2.next_question.text

    monkeypatch.undo()
