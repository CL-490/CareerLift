import uuid
import logging
from datetime import datetime
from typing import Any, List, Optional

from app.services.ats_service import ats_service
from app.services.llm_service import LLMOutputError, llm_service
from app.schemas.interview import (
    InterviewResponse,
    Question,
    Evaluation,
    InterviewSession,
    InterviewStep,
    SessionSummary,
)

logger = logging.getLogger(__name__)


class InterviewService:
    MAX_QUESTIONS = 5

    @staticmethod
    def _build_fallback_question(
        resume_context: dict[str, Any],
        job_context: dict[str, Any],
        asked_questions: list[str],
    ) -> Question:
        lower_questions = " ".join(question.lower() for question in asked_questions)

        for skill in job_context.get("required_skills") or []:
            if skill and skill.lower() not in lower_questions:
                return Question(
                    text=(
                        f"Tell me about a time you used {skill} in your work, and how that experience "
                        f"would help you succeed in this {job_context.get('title') or 'role'}."
                    )
                )

        experiences = resume_context.get("experiences") or []
        if experiences:
            latest = experiences[0]
            title = latest.get("title") or "your most recent role"
            company = latest.get("company") or "that team"
            return Question(
                text=(
                    f"In {title} at {company}, what project or responsibility best prepared you for "
                    f"this {job_context.get('title') or 'role'}?"
                )
            )

        return Question(
            text=(
                f"What makes you a strong fit for the {job_context.get('title') or 'role'}, "
                "and which part of your background best supports that?"
            )
        )

    async def _get_resume_context(self, db, resume_id: str) -> dict[str, Any]:
        query = """
        MATCH (r:Resume {id: $resume_id})-[:BELONGS_TO]->(p:Person)
        OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
        OPTIONAL MATCH (p)-[:HAS_EXPERIENCE]->(e:Experience)
        OPTIONAL MATCH (p)-[:HAS_EDUCATION]->(ed:Education)
        RETURN r.id AS resume_id,
               r.name AS resume_name,
               r.text AS resume_text,
               p.name AS person_name,
               p.email AS person_email,
               p.phone AS person_phone,
               p.location AS person_location,
               collect(DISTINCT s.name) AS skills,
               collect(DISTINCT {
                   title: e.title,
                   company: e.company,
                   duration: e.duration,
                   description: e.description
               }) AS experiences,
               collect(DISTINCT {
                   degree: ed.degree,
                   institution: ed.institution,
                   year: ed.year
               }) AS education
        LIMIT 1
        """
        result = await db.run(query, resume_id=resume_id)
        record = await result.single()
        if not record or not record.get("resume_text"):
            raise ValueError(f"Resume not found for id: {resume_id}")

        skills = [skill for skill in (record.get("skills") or []) if skill]
        experiences = [
            experience
            for experience in (record.get("experiences") or [])
            if experience and any(experience.values())
        ]
        education = [
            edu
            for edu in (record.get("education") or [])
            if edu and any(edu.values())
        ]

        return {
            "resume_id": record["resume_id"],
            "resume_name": record["resume_name"],
            "resume_text": record["resume_text"],
            "person": {
                "name": record.get("person_name"),
                "email": record.get("person_email"),
                "phone": record.get("person_phone"),
                "location": record.get("person_location"),
            },
            "skills": skills,
            "experiences": experiences,
            "education": education,
            # Projects are not yet stored in Neo4j; keep the shape explicit.
            "projects": [],
        }

    async def _get_job_context(self, db, resume_id: str, job_apply_url: str) -> dict:
        query = """
        MATCH (r:Resume {id: $resume_id})-[:SAVED_JOB]->(j:JobPosting {apply_url: $job_apply_url})
        RETURN j.apply_url AS apply_url,
               j.title AS title,
               j.company AS company,
               j.location AS location,
               j.description AS description,
               j.source AS source
        LIMIT 1
        """
        result = await db.run(query, resume_id=resume_id, job_apply_url=job_apply_url)
        record = await result.single()
        if not record:
            raise ValueError("Saved job not found for this resume")

        job_data = {
            "apply_url": record["apply_url"],
            "title": record.get("title") or "Target role",
            "company": record.get("company"),
            "location": record.get("location"),
            "description": record.get("description") or "",
            "source": record.get("source"),
        }
        requirements = ats_service.extract_job_requirements(job_data)
        return {
            **job_data,
            "required_skills": requirements["required_skills"],
            "preferred_skills": requirements["preferred_skills"],
            "responsibility_keywords": requirements["responsibility_keywords"],
            "seniority": requirements["seniority"],
            "years_required": requirements["years_required"],
            "degree_required": requirements["degree_required"],
        }

    async def start_session(
        self,
        db,
        resume_id: str,
        job_apply_url: str,
        role_level: str,
    ) -> InterviewResponse:
        resume_context = await self._get_resume_context(db, resume_id)
        resolved_resume_id = resume_context["resume_id"]
        resume_name = resume_context["resume_name"]
        job_context = await self._get_job_context(db, resolved_resume_id, job_apply_url)

        # ask LLM for first question
        question = await llm_service.generate_interview_question(
            resume_context=resume_context,
            role_level=role_level,
            job_context=job_context,
            previous_steps=None,
        )

        session_id = str(uuid.uuid4())
        now_iso = datetime.utcnow().isoformat()
        create_query = """
        CREATE (s:InterviewSession {
            session_id: $session_id,
            resume_id: $resume_id,
            resume_name: $resume_name,
            job_apply_url: $job_apply_url,
            job_title: $job_title,
            job_company: $job_company,
            job_requirements: $job_requirements,
            job_responsibilities: $job_responsibilities,
            role_level: $role_level,
            started_at: datetime($started_at)
        })
        """
        await db.run(
            create_query,
            session_id=session_id,
            resume_id=resolved_resume_id,
            resume_name=resume_name,
            job_apply_url=job_context["apply_url"],
            job_title=job_context["title"],
            job_company=job_context.get("company"),
            job_requirements=job_context["required_skills"] + job_context["preferred_skills"],
            job_responsibilities=job_context["responsibility_keywords"],
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
        RETURN st.question AS question,
               st.answer AS answer,
               st.evaluation_score AS score,
               st.evaluation_feedback AS feedback,
               st.evaluation_relevance AS relevance,
               st.evaluation_clarity AS clarity,
               st.evaluation_technical_depth AS technical_depth,
               st.evaluation_evidence AS evidence,
               st.evaluation_communication AS communication,
               st.evaluation_strengths AS strengths,
               st.evaluation_improvements AS improvements,
               st.timestamp AS ts
        ORDER BY st.timestamp ASC
        """
        result = await db.run(history_query, session_id=session_id)
        records = await result.data()
        if not records:
            raise ValueError("Session not found or has no steps")

        last_step = records[-1]
        question_text = last_step["question"]

        meta_query = """
        MATCH (s:InterviewSession {session_id: $session_id})
        RETURN s.resume_id AS resume_id,
               s.resume_name AS resume_name,
               s.role_level AS role_level,
               s.job_apply_url AS job_apply_url
        LIMIT 1
        """
        meta_res = await db.run(meta_query, session_id=session_id)
        meta = await meta_res.single()
        if not meta:
            raise ValueError("Session metadata not found")
        resume_id = meta["resume_id"]
        resume_name = meta["resume_name"]
        role_level = meta["role_level"]
        job_apply_url = meta["job_apply_url"]

        resume_context = await self._get_resume_context(db, resume_id)
        job_context = await self._get_job_context(db, resume_id, job_apply_url)

        evaluation = await llm_service.evaluate_interview_answer(
            question_text,
            answer,
            role_level=role_level,
            resume_context=resume_context,
            job_context=job_context,
        )

        update_query = """
        MATCH (s:InterviewSession {session_id: $session_id})-[:HAS_STEP]->(st:InterviewStep)
        WHERE st.timestamp = $last_ts
        SET st.answer = $answer,
            st.evaluation_score = $score,
            st.evaluation_feedback = $feedback,
            st.evaluation_relevance = $relevance,
            st.evaluation_clarity = $clarity,
            st.evaluation_technical_depth = $technical_depth,
            st.evaluation_evidence = $evidence,
            st.evaluation_communication = $communication,
            st.evaluation_strengths = $strengths,
            st.evaluation_improvements = $improvements
        """
        await db.run(
            update_query,
            session_id=session_id,
            last_ts=last_step["ts"],
            answer=answer,
            score=evaluation.score,
            feedback=evaluation.feedback,
            relevance=evaluation.rubric.relevance,
            clarity=evaluation.rubric.clarity,
            technical_depth=evaluation.rubric.technical_depth,
            evidence=evaluation.rubric.evidence,
            communication=evaluation.rubric.communication,
            strengths=evaluation.strengths,
            improvements=evaluation.improvements,
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
        try:
            next_question = await llm_service.generate_interview_question(
                resume_context=resume_context,
                role_level=role_level,
                job_context=job_context,
                previous_steps=history_steps,
            )
        except LLMOutputError:
            logger.warning(
                "Falling back to deterministic interview question for session %s",
                session_id,
                exc_info=True,
            )
            next_question = self._build_fallback_question(
                resume_context=resume_context,
                job_context=job_context,
                asked_questions=[step["question"] for step in history_steps],
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
                        rubric={
                            "relevance": st.get("evaluation_relevance"),
                            "clarity": st.get("evaluation_clarity"),
                            "technical_depth": st.get("evaluation_technical_depth"),
                            "evidence": st.get("evaluation_evidence"),
                            "communication": st.get("evaluation_communication"),
                        },
                        strengths=st.get("evaluation_strengths") or [],
                        improvements=st.get("evaluation_improvements") or [],
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
            resume_id=snode.get("resume_id"),
            resume_name=snode.get("resume_name"),
            job_apply_url=snode.get("job_apply_url"),
            job_title=snode.get("job_title"),
            job_company=snode.get("job_company"),
            job_requirements=snode.get("job_requirements") or [],
            job_responsibilities=snode.get("job_responsibilities") or [],
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
        RETURN st.question AS question,
               st.answer AS answer,
               st.evaluation_score AS score,
               st.evaluation_feedback AS feedback,
               st.evaluation_relevance AS relevance,
               st.evaluation_clarity AS clarity,
               st.evaluation_technical_depth AS technical_depth,
               st.evaluation_evidence AS evidence,
               st.evaluation_communication AS communication,
               st.evaluation_strengths AS strengths,
               st.evaluation_improvements AS improvements
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
                eval_obj = Evaluation(
                    score=score,
                    feedback=rec.get("feedback"),
                    rubric={
                        "relevance": rec.get("relevance"),
                        "clarity": rec.get("clarity"),
                        "technical_depth": rec.get("technical_depth"),
                        "evidence": rec.get("evidence"),
                        "communication": rec.get("communication"),
                    },
                    strengths=rec.get("strengths") or [],
                    improvements=rec.get("improvements") or [],
                )
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
