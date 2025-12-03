"""Resume processing API endpoints."""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body, Form
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
    person_name: str = Form("") ,
    resume_name: str = Form("Default Resume"),
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

        # Transform to knowledge graph structure (use LLM to extract person name)
        graph_data = await knowledge_graph_service.transform_resume_to_graph(text)

        # Decide which person name to use: prefer provided person_name (if non-empty),
        # otherwise fallback to LLM extracted name in graph_data.
        extracted_person_name = graph_data.get("person", {}).get("name") if graph_data.get("person") else None
        final_person_name = person_name.strip() if person_name and person_name.strip() else (extracted_person_name or "Unknown")

        # Ensure graph_data person object exists and has the final name
        if not graph_data.get("person"):
            graph_data["person"] = {"name": final_person_name}
        else:
            graph_data["person"]["name"] = final_person_name

        # Create Resume node in Neo4j using the resolved person name
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
            person_name=final_person_name,
            text=text,
            filename=file.filename
        )
        await result.consume()

        # Create subgraph in Neo4j and link to Resume
        nodes_created = await knowledge_graph_service.create_resume_subgraph(db, graph_data)

        # Link Resume to Person
        link_query = """
        MATCH (r:Resume {id: $resume_id})
        MATCH (p:Person {name: $person_name})
        MERGE (r)-[:BELONGS_TO]->(p)
        """
        await db.run(link_query, resume_id=resume_id, person_name=final_person_name)

        return {
            "message": "Resume processed successfully",
            "resume_id": resume_id,
            "resume_name": resume_name,
            "person_name": final_person_name,
            "filename": file.filename,
            "text_length": len(text),
            "nodes_created": nodes_created,
            "graph_data": graph_data
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
    OPTIONAL MATCH (p)<-[:BELONGS_TO]-(r:Resume)-[:SAVED_JOB]->(j:JobPosting)
    RETURN p,
           collect(DISTINCT s) as skills,
           collect(DISTINCT e) as experiences,
           collect(DISTINCT ed) as education,
           collect(DISTINCT j) as saved_jobs,
           collect(DISTINCT r) as resumes
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


@router.get("/graph/raw/{person_name}")
async def get_resume_graph_raw(person_name: str, db=Depends(get_db)):
    """
    Retrieve the resume subgraph for a person and return simple nodes/edges JSON usable by graph visualizers.
    """
    query = """
MATCH (p:Person {name: $person_name})
OPTIONAL MATCH (p)-[:HAS_SKILL]->(s:Skill)
OPTIONAL MATCH (p)-[:HAS_EXPERIENCE]->(e:Experience)
OPTIONAL MATCH (p)-[:HAS_EDUCATION]->(ed:Education)
OPTIONAL MATCH (p)<-[:BELONGS_TO]-(r:Resume)-[:SAVED_JOB]->(j:JobPosting)
RETURN p,
       collect(DISTINCT s) as skills,
       collect(DISTINCT e) as experiences,
       collect(DISTINCT ed) as education,
       collect(DISTINCT j) as saved_jobs,
       collect(DISTINCT r) as resumes
    """

    result = await db.run(query, person_name=person_name)
    record = await result.single()

    if not record:
        raise HTTPException(status_code=404, detail=f"Person '{person_name}' not found")

    person = dict(record["p"]) if record.get("p") else {}
    skills = [dict(s) for s in record.get("skills", []) if s is not None]
    experiences = [dict(e) for e in record.get("experiences", []) if e is not None]
    education = [dict(ed) for ed in record.get("education", []) if ed is not None]
    saved_jobs = [dict(j) for j in record.get("saved_jobs", []) if j is not None]
    resumes = [dict(r) for r in record.get("resumes", []) if r is not None]

    # Build nodes and edges
    nodes = []
    edges = []

    person_id = f"person:{person.get('name', 'Unknown')}"
    nodes.append({
        "id": person_id,
        "label": person.get("name"),
        "group": "person",
        "properties": person
    })

    # Skills
    for s in skills:
        sid = f"skill:{s.get('name') or s.get('label') or s.get('skill')}"
        nodes.append({"id": sid, "label": s.get("name"), "group": "skill", "properties": s})
        edges.append({"from": person_id, "to": sid, "label": "HAS_SKILL"})

    # Experiences
    for idx, e in enumerate(experiences):
        eid = f"exp:{idx}:{e.get('company') or e.get('title')}"
        label = f"{e.get('title') or ''}{(' @ ' + (e.get('company') or '')) if e.get('company') else ''}"
        nodes.append({"id": eid, "label": label, "group": "experience", "properties": e})
        edges.append({"from": person_id, "to": eid, "label": "HAS_EXPERIENCE"})

    # Education
    for idx, ed in enumerate(education):
        gid = f"edu:{idx}:{ed.get('institution') or ed.get('degree')}"
        label = f"{ed.get('degree') or ''}{(' — ' + (ed.get('institution') or '')) if ed.get('institution') else ''}"
        nodes.append({"id": gid, "label": label, "group": "education", "properties": ed})
        edges.append({"from": person_id, "to": gid, "label": "HAS_EDUCATION"})

    # Resumes and saved jobs
    resume_id_map = {}
    for r in resumes:
        rid = f"resume:{r.get('id') or r.get('resume_id') or r.get('name') or 'unknown'}"
        resume_id_map[r.get('id') or r.get('resume_id') or rid] = rid
        nodes.append({"id": rid, "label": r.get('name') or r.get('resume_name') or 'Resume', "group": "resume", "properties": r})
        # Link person -> resume (visual link)
        edges.append({"from": person_id, "to": rid, "label": "HAS_RESUME"})

    for j in saved_jobs:
        # Sanitize apply_url for id
        apply_url = j.get('apply_url') or j.get('source_url') or j.get('source_job_id') or j.get('title')
        # Fallback for id if no URL
        jid_safe = str(apply_url).replace('http://', '').replace('https://', '').replace('/', '_')
        jid = f"job:{jid_safe}"
        nodes.append({"id": jid, "label": j.get('title') or j.get('company') or jid_safe, "group": "job", "properties": j})
        # Find the resume that links to this job
        # If multiple resumes exist, search resumes by id or name
        linked = False
        for r in resumes:
            # Use resume id match if available
            r_id_val = r.get('id') or r.get('resume_id')
            if r_id_val and resume_id_map.get(r_id_val):
                edges.append({"from": resume_id_map.get(r_id_val), "to": jid, "label": "SAVED_JOB"})
                linked = True
                break
        if not linked and resumes:
            # Default to connecting to the first resume
            edges.append({"from": resume_id_map[next(iter(resume_id_map))], "to": jid, "label": "SAVED_JOB"})

    return {"nodes": nodes, "edges": edges}
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
