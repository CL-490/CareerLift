import pytest
from datetime import datetime

from app.services.interview_service import InterviewService
from app.services import interview_service
from app.services.llm_service import llm_service
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
        if "MATCH (r:Resume" in query and "RETURN r.text" in query:
            return DummyResult({"text": "dummy resume text"})
        if "RETURN st.question" in query and "ORDER BY" in query:
            return DummyResult([
                {"question": "Q1", "answer": "A1", "score": 5, "feedback": "ok", "ts": datetime.utcnow()}
            ])
        if "RETURN s.resume_name" in query:
            return DummyResult({"resume_name": "myresume", "role_level": "entry"})
        return DummyResult({})


@pytest.mark.asyncio
async def test_start_and_submit():
    db = DummyDB()

    async def fake_question(resume_text, role_level, previous_steps=None):
        return Question(text="What is 2+2?")

    async def fake_eval(question, answer):
        return Evaluation(score=9.0, feedback="Great")

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(llm_service, "generate_interview_question", fake_question)
    monkeypatch.setattr(llm_service, "evaluate_interview_answer", fake_eval)

    resp: InterviewResponse = await interview_service.start_session(db, "myresume", "entry")
    assert resp.session_id is not None
    assert resp.next_question.text == "What is 2+2?"

    resp2: InterviewResponse = await interview_service.submit_answer(db, resp.session_id, "4")
    assert resp2.evaluation.score == 9.0
    assert resp2.next_question.text == "What is 2+2?"

    monkeypatch.undo()
