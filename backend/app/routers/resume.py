"""Resume processing API endpoints."""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.database import get_db
from app.services.resume_processor import resume_processor
from app.services.knowledge_graph_service import knowledge_graph_service
from app.services.ats_service import ats_service


router = APIRouter(prefix="/api/resume", tags=["resume"])


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    db=Depends(get_db)
):
    """
    Upload and process a resume file.

    Supports: .txt, .md, .pdf, .doc, .docx

    Extracts text, transforms to knowledge graph, and stores in Neo4j.
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

        # Transform to knowledge graph structure
        graph_data = await knowledge_graph_service.transform_resume_to_graph(text)

        # Create subgraph in Neo4j
        nodes_created = await knowledge_graph_service.create_resume_subgraph(db, graph_data)

        return {
            "message": "Resume processed successfully",
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


@router.get("/list")
async def list_resumes(db=Depends(get_db)):
    result = await db.run("MATCH (p:Person) RETURN p.name AS name")
    names = [record["name"] async for record in result]
    return {"resumes": names}
