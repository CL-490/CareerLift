from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.services.interview_service import interview_service
from app.schemas.interview import (
    InterviewStartRequest,
    InterviewResponse,
    InterviewSession,
)

router = APIRouter(prefix="/api/interview", tags=["interview"])


@router.post("/start", response_model=InterviewResponse)
async def start_interview(request: InterviewStartRequest, db=Depends(get_db)):
    try:
        return await interview_service.start_session(
            db,
            request.resume_id,
            request.job_apply_url,
            request.role_level,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/respond", response_model=InterviewResponse)
async def respond_interview(session_id: str, answer: str, db=Depends(get_db)):
    try:
        return await interview_service.submit_answer(db, session_id, answer)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/session/{session_id}", response_model=InterviewSession)
async def get_session(session_id: str, db=Depends(get_db)):
    try:
        return await interview_service.get_session(db, session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
