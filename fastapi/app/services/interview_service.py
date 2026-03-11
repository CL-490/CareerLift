import uuid
from datetime import datetime
from typing import List, Optional

from app.services.llm_service import llm_service
from app.schemas.interview import (
    InterviewResponse,
    Question,
    Evaluation,
    InterviewSession,
    InterviewStep,
    SessionSummary,
)


class InterviewService:
    MAX_QUESTIONS = 5

    async def start_session(self, db, resume_name: str, role_level: str) -> InterviewResponse:
        # lookup resume text
        query = """
        MATCH (r:Resume {name: $name})
        RETURN r.text AS text
        LIMIT 1
        """
        result = await db.run(query, name=resume_name)
        record = await result.single()
        if not record or not record.get("text"):
            raise ValueError(f"Resume not found for name: {resume_name}")
        resume_text = record["text"]

        # ask LLM for first question
        question = await llm_service.generate_interview_question(
            resume_text=resume_text,
            role_level=role_level,
            previous_steps=None,
        )

        session_id = str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()
        create_query = """
        CREATE (s:InterviewSession {
            session_id: $session_id,
            resume_name: $resume_name,
            role_level: $role_level,
            started_at: datetime($started_at)
        })
        """
        await db.run(
            create_query,
            session_id=session_id,
            resume_name=resume_name,
            role_level=role_level,
            started_at=now_iso,
        )

        step_query = """
        MATCH (s:InterviewSession {session_id: $session_id})
        CREATE (step:InterviewStep {
            id: $step_id,
            question: $question,
            timestamp: datetime($timestamp)
        })
        MERGE (s)-[:HAS_STEP]->(step)
        """
        await db.run(
            step_query,
            session_id=session_id,
            step_id=str(uuid.uuid4()),
            question=question.text,
            timestamp=now_iso,
        )

        return InterviewResponse(next_question=question, session_id=session_id)

    async def submit_answer(
        self, db, session_id: str, answer: str
    ) -> InterviewResponse:
        history_query = """
        MATCH (s:InterviewSession {session_id: $session_id})-[:HAS_STEP]->(st:InterviewStep)
        RETURN st.question AS question, st.answer AS answer, st.evaluation_score AS score, st.evaluation_feedback AS feedback, st.timestamp AS ts
        ORDER BY st.timestamp ASC
        """
        result = await db.run(history_query, session_id=session_id)
        records = await result.data()
        if not records:
            raise ValueError("Session not found or has no steps")

        last_step = records[-1]
        question_text = last_step["question"]

        evaluation = await llm_service.evaluate_interview_answer(
            question_text, answer
        )

        update_query = """
        MATCH (s:InterviewSession {session_id: $session_id})-[:HAS_STEP]->(st:InterviewStep)
        WHERE st.timestamp = $last_ts
        SET st.answer = $answer,
            st.evaluation_score = $score,
            st.evaluation_feedback = $feedback
        """
        await db.run(
            update_query,
            session_id=session_id,
            last_ts=last_step["ts"],
            answer=answer,
            score=evaluation.score,
            feedback=evaluation.feedback,
        )

        count = len(records)
        if count >= self.MAX_QUESTIONS:
            summary = await self._build_summary(db, session_id)
            await self._mark_completed(db, session_id, summary)
            return InterviewResponse(
                evaluation=evaluation,
                session_complete=True,
                session_id=session_id,
            )

        # generate next question
        history_steps = [
            {"question": rec["question"], "answer": rec.get("answer") or ""}
            for rec in records
        ]
        meta_query = """
        MATCH (s:InterviewSession {session_id: $session_id})
        RETURN s.resume_name AS resume_name, s.role_level AS role_level
        LIMIT 1
        """
        meta_res = await db.run(meta_query, session_id=session_id)
        meta = await meta_res.single()
        resume_name = meta["resume_name"]
        role_level = meta["role_level"]
        text_res = await db.run(
            "MATCH (r:Resume {name: $name}) RETURN r.text AS text LIMIT 1",
            name=resume_name,
        )
        text_record = await text_res.single()
        resume_text = text_record["text"] if text_record else ""

        next_question = await llm_service.generate_interview_question(
            resume_text=resume_text,
            role_level=role_level,
            previous_steps=history_steps,
        )

        now_iso = datetime.utcnow().isoformat()
        new_step_query = """
        MATCH (s:InterviewSession {session_id: $session_id})
        CREATE (step:InterviewStep {
            id: $step_id,
            question: $question,
            timestamp: datetime($timestamp)
        })
        MERGE (s)-[:HAS_STEP]->(step)
        """
        await db.run(
            new_step_query,
            session_id=session_id,
            step_id=str(uuid.uuid4()),
            question=next_question.text,
            timestamp=now_iso,
        )

        return InterviewResponse(
            next_question=next_question,
            evaluation=evaluation,
            session_id=session_id,
        )

    async def get_session(self, db, session_id: str) -> InterviewSession:
        q = """
        MATCH (s:InterviewSession {session_id: $session_id})
        OPTIONAL MATCH (s)-[:HAS_STEP]->(st:InterviewStep)
        RETURN s, collect(st) as steps
        """
        res = await db.run(q, session_id=session_id)
        rec = await res.single()
        if not rec or not rec.get("s"):
            raise ValueError("Session not found")
        snode = rec["s"]
        steps_raw = rec["steps"]
        steps: List[InterviewStep] = []
        for st in steps_raw:
            steps.append(
                InterviewStep(
                    question=Question(text=st.get("question")),
                    answer=st.get("answer"),
                    evaluation=Evaluation(
                        score=st.get("evaluation_score"),
                        feedback=st.get("evaluation_feedback"),
                    )
                    if st.get("evaluation_score") is not None
                    else None,
                    timestamp=st.get("timestamp"),
                )
            )
        summary = None
        if snode.get("completed_at"):
            total = sum([step.evaluation.score or 0 for step in steps if step.evaluation])
            count = len([step for step in steps if step.evaluation and step.evaluation.score is not None])
            overall = total / count if count else None
            summary = SessionSummary(
                total_score=overall,
                overall_feedback=None,
                steps=steps,
            )
        return InterviewSession(
            session_id=snode.get("session_id"),
            resume_name=snode.get("resume_name"),
            role_level=snode.get("role_level"),
            started_at=snode.get("started_at"),
            completed_at=snode.get("completed_at"),
            summary=summary,
        )

    async def _mark_completed(self, db, session_id: str, summary: SessionSummary):
        completed_at = datetime.utcnow().isoformat()
        upd = """
        MATCH (s:InterviewSession {session_id: $session_id})
        SET s.completed_at = datetime($completed_at)
        """
        await db.run(upd, session_id=session_id, completed_at=completed_at)
        return

    async def _build_summary(self, db, session_id: str) -> SessionSummary:
        history_query = """
        MATCH (s:InterviewSession {session_id: $session_id})-[:HAS_STEP]->(st:InterviewStep)
        RETURN st.question AS question, st.answer AS answer, st.evaluation_score AS score, st.evaluation_feedback AS feedback
        ORDER BY st.timestamp ASC
        """
        res = await db.run(history_query, session_id=session_id)
        records = await res.data()
        steps: List[InterviewStep] = []
        total = 0.0
        count = 0
        for rec in records:
            eval_obj = None
            score = rec.get("score")
            if score is not None:
                eval_obj = Evaluation(score=score, feedback=rec.get("feedback"))
                total += score
                count += 1
            steps.append(
                InterviewStep(
                    question=Question(text=rec.get("question")),
                    answer=rec.get("answer"),
                    evaluation=eval_obj,
                    timestamp=datetime.utcnow(),
                )
            )
        overall = total / count if count else None
        return SessionSummary(total_score=overall, overall_feedback=None, steps=steps)


# global instance
interview_service = InterviewService()
