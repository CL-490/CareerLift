import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import interview_service
from app.schemas.interview import InterviewResponse, Question, Evaluation

client = TestClient(app)


def test_start_interview_endpoint(monkeypatch):
    dummy_resp = InterviewResponse(next_question=Question(text="What is your name?"), session_id="sess123")
    monkeypatch.setattr(interview_service, "start_session", lambda db, rn, rl: dummy_resp)

    response = client.post("/api/interview/start", json={"resume_name": "foo", "role_level": "entry"})
    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == "sess123"
    assert body["next_question"]["text"] == "What is your name?"


def test_respond_interview_endpoint(monkeypatch):
    dummy_resp = InterviewResponse(
        next_question=Question(text="Next?"),
        evaluation=Evaluation(score=7.5, feedback="Good answer"),
        session_id="sess123"
    )
    monkeypatch.setattr(interview_service, "submit_answer", lambda db, sid, ans: dummy_resp)

    response = client.post("/api/interview/respond", params={"session_id": "sess123", "answer": "ok"})
    assert response.status_code == 200
    body = response.json()
    assert body["evaluation"]["score"] == 7.5
    assert body["next_question"]["text"] == "Next?"


def test_get_session_endpoint(monkeypatch):
    dummy_session = {
        "session_id": "sess123",
        "resume_name": "foo",
        "role_level": "entry",
        "started_at": "2026-03-11T00:00:00",
        "completed_at": None,
        "summary": None,
    }
    from app.schemas.interview import InterviewSession as IS
    monkeypatch.setattr(interview_service, "get_session", lambda db, sid: IS(**dummy_session))

    response = client.get("/api/interview/session/sess123")
    assert response.status_code == 200
    body = response.json()
    assert body["session_id"] == "sess123"
    assert body["resume_name"] == "foo"
    assert body["role_level"] == "entry"
