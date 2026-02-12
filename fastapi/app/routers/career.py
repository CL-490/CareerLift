"""Career-related API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from neo4j import AsyncSession

from app.core.database import get_db
from app.models.career import CareerGoal, Skill, Experience
from app.services.llm_service import llm_service

router = APIRouter(prefix="/career", tags=["career"])


@router.post("/goals", response_model=CareerGoal)
async def create_career_goal(
    goal: CareerGoal,
    session: AsyncSession = Depends(get_db)
):
    """Create a new career goal."""
    query = """
    CREATE (g:CareerGoal {
        id: randomUUID(),
        title: $title,
        description: $description,
        target_role: $target_role,
        target_company: $target_company,
        deadline: $deadline,
        created_at: datetime(),
        updated_at: datetime()
    })
    RETURN g
    """

    result = await session.run(
        query,
        title=goal.title,
        description=goal.description,
        target_role=goal.target_role,
        target_company=goal.target_company,
        deadline=goal.deadline.isoformat() if goal.deadline else None
    )

    record = await result.single()
    if not record:
        raise HTTPException(status_code=500, detail="Failed to create career goal")

    created_goal = dict(record["g"])
    return CareerGoal(**created_goal)


@router.get("/goals")
async def get_career_goals(session: AsyncSession = Depends(get_db)):
    """Get all career goals."""
    query = """
    MATCH (g:CareerGoal)
    RETURN g
    ORDER BY g.created_at DESC
    """

    result = await session.run(query)
    goals = [dict(record["g"]) async for record in result]

    return goals


@router.post("/skills", response_model=Skill)
async def add_skill(
    skill: Skill,
    session: AsyncSession = Depends(get_db)
):
    """Add a new skill."""
    query = """
    CREATE (s:Skill {
        id: randomUUID(),
        name: $name,
        category: $category,
        proficiency_level: $proficiency_level,
        created_at: datetime()
    })
    RETURN s
    """

    result = await session.run(
        query,
        name=skill.name,
        category=skill.category,
        proficiency_level=skill.proficiency_level
    )

    record = await result.single()
    if not record:
        raise HTTPException(status_code=500, detail="Failed to add skill")

    created_skill = dict(record["s"])
    return Skill(**created_skill)


@router.get("/advice")
async def get_career_advice(
    current_role: str,
    target_role: str,
    skills: str,
    experience_years: int
):
    """Get LLM-generated career advice."""
    skills_list = [s.strip() for s in skills.split(",")]

    advice = await llm_service.generate_career_advice(
        current_role=current_role,
        target_role=target_role,
        skills=skills_list,
        experience_years=experience_years
    )

    return {"advice": advice}


@router.post("/analyze-job")
async def analyze_job_description(job_description: str):
    """Analyze a job description."""
    analysis = await llm_service.analyze_job_description(job_description)
    return analysis


@router.post("/resume-feedback")
async def get_resume_feedback(resume_text: str, target_role: str):
    """Get feedback on a resume."""
    feedback = await llm_service.generate_resume_feedback(
        resume_text=resume_text,
        target_role=target_role
    )
    return {"feedback": feedback}
