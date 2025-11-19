"""Resume processing API endpoints."""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body
from app.core.database import get_db
from app.services.resume_processor import resume_processor
from app.services.knowledge_graph_service import knowledge_graph_service
from app.services.ats_service import ats_service
from app.schemas.resume import (
    ResumeCreate,
    ResumeInfo,
    ResumeList,
    SavedJobCreate,
    SavedJobInfo,
    SavedJobsList,
)
from typing import List, Optional
import uuid
from datetime import datetime


router = APIRouter(prefix="/api/resume", tags=["resume"])


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    person_name: str = "Unknown",
    resume_name: str = "Default Resume",
    db=Depends(get_db)
):
    """
    Upload and process a resume file with multiple resume support.

    Supports: .txt, .md, .pdf, .doc, .docx

    Extracts text, transforms to knowledge graph, and stores in Neo4j.
    Each resume gets a unique ID and can be associated with a person.
    """
    # Validate file type
    allowed_extensions = {'.txt', '.md', '.pdf', '.doc', '.docx'}
    file_ext = '.' + file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )

    # Read file content
    file_content = await file.read()

    try:
        # Extract text from file
        text = await resume_processor.extract_text_from_file(file_content, file.filename)

        if not text or len(text.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Could not extract meaningful text from the file"
            )

        # Generate unique resume ID
        resume_id = str(uuid.uuid4())

        # Create Resume node in Neo4j
        resume_query = """
        CREATE (r:Resume {
            id: $resume_id,
            name: $resume_name,
            person_name: $person_name,
            text: $text,
            filename: $filename,
            created_at: datetime(),
            updated_at: datetime()
        })
        RETURN r
        """

        result = await db.run(
            resume_query,
            resume_id=resume_id,
            resume_name=resume_name,
            person_name=person_name,
            text=text,
            filename=file.filename
        )
        await result.consume()

        # Transform to knowledge graph structure
        graph_data = await knowledge_graph_service.transform_resume_to_graph(text)

        # Override person name with provided name
        graph_data["person"]["name"] = person_name

        # Create subgraph in Neo4j and link to Resume
        nodes_created = await knowledge_graph_service.create_resume_subgraph(db, graph_data)

        # Link Resume to Person
        link_query = """
        MATCH (r:Resume {id: $resume_id})
        MATCH (p:Person {name: $person_name})
        MERGE (r)-[:BELONGS_TO]->(p)
        """
        await db.run(link_query, resume_id=resume_id, person_name=person_name)

        return {
            "message": "Resume processed successfully",
            "resume_id": resume_id,
            "resume_name": resume_name,
            "person_name": person_name,
            "filename": file.filename,
            "text_length": len(text),
            "nodes_created": nodes_created
        }

    except ValueError as e:
        error_msg = str(e)
        # Check if this is an Ollama auth error
        if error_msg.startswith("OLLAMA_AUTH_REQUIRED:"):
            signin_url = error_msg.split(":", 1)[1] if ":" in error_msg else None
            raise HTTPException(
                status_code=401,
                detail={
                    "error": "Ollama authentication required",
                    "signin_url": signin_url,
                    "message": "Please sign in to Ollama to process resumes"
                }
            )
        raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")


@router.get("/graph/{person_name}")
async def get_resume_graph(person_name: str, db=Depends(get_db)):
    """
    Retrieve the resume subgraph for a person from Neo4j.

    Returns the person node and all related skills, experiences, and education.
    """
    query = """
    MATCH (p:Person {name: $person_name})
    OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
    OPTIONAL MATCH (p)-[:HAS_EXPERIENCE]->(e:Experience)
    OPTIONAL MATCH (p)-[:HAS_EDUCATION]->(ed:Education)
    RETURN p,
           collect(DISTINCT s) as skills,
           collect(DISTINCT e) as experiences,
           collect(DISTINCT ed) as education
    """

    result = await db.run(query, person_name=person_name)
    record = await result.single()

    if not record:
        raise HTTPException(status_code=404, detail=f"Person '{person_name}' not found")

    person = dict(record["p"])
    skills = [dict(s) for s in record["skills"] if s is not None]
    experiences = [dict(e) for e in record["experiences"] if e is not None]
    education = [dict(ed) for ed in record["education"] if ed is not None]

    return {
        "person": person,
        "skills": skills,
        "experiences": experiences,
        "education": education
    }


@router.get("/score/{person_name}")
async def score_resume_against_jobs(person_name: str, db=Depends(get_db)):
    # Pull resume graph
    person_query = """
    MATCH (p:Person {name: $person_name})
    OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
    OPTIONAL MATCH (p)-[:HAS_EXPERIENCE]->(e:Experience)
    RETURN p,
           collect(DISTINCT s.name) AS skills,
           collect(DISTINCT e.description) AS experiences
    """

    record = await (await db.run(person_query, person_name=person_name)).single()
    if not record:
        raise HTTPException(status_code=404, detail="Resume not found")

    skills = record["skills"] or []
    exp_text = " ".join(record["experiences"] or [])

    # Get all jobs
    job_query = """
    MATCH (j:JobPosting)
    RETURN j
    """
    result = await db.run(job_query)

    jobs = []
    async for row in result:
        j = dict(row["j"])
        score = ats_service.score_resume_to_job(skills, exp_text, j)
        j["ats_score"] = score
        jobs.append(j)

    return {"jobs": jobs}


@router.get("/list", response_model=ResumeList)
async def list_resumes(person_name: Optional[str] = None, db=Depends(get_db)):
    """
    List all resumes, optionally filtered by person name.

    Returns resume ID, name, person name, and timestamps.
    """
    if person_name:
        query = """
        MATCH (r:Resume {person_name: $person_name})
        RETURN r.id AS resume_id,
               r.name AS resume_name,
               r.person_name AS person_name,
               toString(r.created_at) AS created_at,
               toString(r.updated_at) AS updated_at
        ORDER BY r.created_at DESC
        """
        result = await db.run(query, person_name=person_name)
    else:
        query = """
        MATCH (r:Resume)
        RETURN r.id AS resume_id,
               r.name AS resume_name,
               r.person_name AS person_name,
               toString(r.created_at) AS created_at,
               toString(r.updated_at) AS updated_at
        ORDER BY r.created_at DESC
        """
        result = await db.run(query)

    resumes = []
    async for record in result:
        resumes.append(ResumeInfo(
            resume_id=record["resume_id"],
            person_name=record["person_name"],
            resume_name=record["resume_name"],
            created_at=record.get("created_at"),
            updated_at=record.get("updated_at")
        ))

    return ResumeList(resumes=resumes)


@router.post("/save-job")
async def save_job_to_resume(
    data: SavedJobCreate,
    db=Depends(get_db)
):
    """
    Save a job posting to a resume in the knowledge graph.

    Creates a SAVED_JOB relationship between Resume and JobPosting.
    """
    # Check if resume exists
    resume_check = await db.run(
        "MATCH (r:Resume {id: $resume_id}) RETURN r",
        resume_id=data.resume_id
    )
    if not await resume_check.single():
        raise HTTPException(status_code=404, detail="Resume not found")

    # Check if job exists
    job_check = await db.run(
        "MATCH (j:JobPosting {apply_url: $apply_url}) RETURN j",
        apply_url=data.job_apply_url
    )
    if not await job_check.single():
        raise HTTPException(status_code=404, detail="Job not found")

    # Create SAVED_JOB relationship
    save_query = """
    MATCH (r:Resume {id: $resume_id})
    MATCH (j:JobPosting {apply_url: $apply_url})
    MERGE (r)-[s:SAVED_JOB]->(j)
    SET s.saved_at = datetime(),
        s.notes = $notes
    RETURN s
    """

    result = await db.run(
        save_query,
        resume_id=data.resume_id,
        apply_url=data.job_apply_url,
        notes=data.notes
    )
    await result.consume()

    return {
        "message": "Job saved successfully",
        "resume_id": data.resume_id,
        "job_url": data.job_apply_url
    }


@router.get("/saved-jobs/{resume_id}", response_model=SavedJobsList)
async def get_saved_jobs(resume_id: str, db=Depends(get_db)):
    """
    Get all saved jobs for a resume with ATS scores.
    """
    # Get resume info
    resume_query = """
    MATCH (r:Resume {id: $resume_id})
    RETURN r.name AS resume_name, r.person_name AS person_name
    """
    resume_result = await db.run(resume_query, resume_id=resume_id)
    resume_record = await resume_result.single()

    if not resume_record:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Get person's skills for ATS scoring
    person_query = """
    MATCH (p:Person {name: $person_name})
    OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
    OPTIONAL MATCH (p)-[:HAS_EXPERIENCE]->(e:Experience)
    RETURN collect(DISTINCT s.name) AS skills,
           collect(DISTINCT e.description) AS experiences
    """
    person_result = await db.run(person_query, person_name=resume_record["person_name"])
    person_data = await person_result.single()

    skills = person_data["skills"] or []
    exp_text = " ".join(person_data["experiences"] or [])

    # Get saved jobs
    jobs_query = """
    MATCH (r:Resume {id: $resume_id})-[s:SAVED_JOB]->(j:JobPosting)
    RETURN j.title AS title,
           j.company AS company,
           j.location AS location,
           j.apply_url AS apply_url,
           j.source AS source,
           j.description AS description,
           toString(s.saved_at) AS saved_at,
           s.notes AS notes
    ORDER BY s.saved_at DESC
    """

    result = await db.run(jobs_query, resume_id=resume_id)

    jobs = []
    async for record in result:
        # Calculate ATS score
        job_data = {
            "description": record.get("description", ""),
            "title": record.get("title", "")
        }
        score = ats_service.score_resume_to_job(skills, exp_text, job_data)

        jobs.append(SavedJobInfo(
            job_title=record["title"],
            company=record.get("company"),
            location=record.get("location"),
            apply_url=record["apply_url"],
            source=record.get("source"),
            saved_at=record["saved_at"],
            notes=record.get("notes"),
            ats_score=score
        ))

    return SavedJobsList(
        resume_id=resume_id,
        resume_name=resume_record["resume_name"],
        jobs=jobs
    )


@router.delete("/saved-job/{resume_id}/{job_apply_url:path}")
async def remove_saved_job(resume_id: str, job_apply_url: str, db=Depends(get_db)):
    """
    Remove a saved job from a resume.
    """
    query = """
    MATCH (r:Resume {id: $resume_id})-[s:SAVED_JOB]->(j:JobPosting {apply_url: $apply_url})
    DELETE s
    RETURN count(s) AS deleted
    """

    result = await db.run(query, resume_id=resume_id, apply_url=job_apply_url)
    record = await result.single()

    if not record or record["deleted"] == 0:
        raise HTTPException(status_code=404, detail="Saved job not found")

    return {"message": "Job removed from saved list"}
