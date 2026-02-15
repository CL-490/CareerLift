"""LaTeX resume builder API endpoints."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.schemas.latex import CompileRequest, TemplateInfo
from app.services.latex_service import compile_latex, compile_latex_preview

router = APIRouter(prefix="/api/latex", tags=["latex"])

TEMPLATES: list[TemplateInfo] = [
    TemplateInfo(
        id="template1",
        name="Classic Academic",
        description="Clean single-column academic resume with section dividers",
        engine="pdflatex",
        supported_sections=["education", "awards", "experiences", "skills", "projects", "leadership"],
    ),
    TemplateInfo(
        id="template2",
        name="Modern AltaCV",
        description="Colorful modern layout with icons and a red accent bar",
        engine="xelatex",
        supported_sections=["skills", "education", "experiences", "projects", "awards", "languages"],
    ),
    TemplateInfo(
        id="template3",
        name="Tabular Academic",
        description="Education in a table, structured sections with tcolorbox headers",
        engine="pdflatex",
        supported_sections=["education", "experiences", "projects", "skills", "certifications", "leadership", "miscellaneous"],
    ),
    TemplateInfo(
        id="template4",
        name="Research Professional",
        description="Professional layout with blue headings, profile section, and references",
        engine="pdflatex",
        supported_sections=["education", "experiences", "publications", "projects", "skills", "languages", "references"],
    ),
    TemplateInfo(
        id="template5",
        name="Deedy Two-Column",
        description="Two-column Deedy-inspired layout with left sidebar",
        engine="xelatex",
        supported_sections=["education", "coursework", "skills", "experiences", "projects", "publications"],
    ),
    TemplateInfo(
        id="template6",
        name="Photo Resume",
        description="Professional resume with summary, roles section, and certifications",
        engine="pdflatex",
        supported_sections=["summary", "education", "skills", "projects", "leadership", "experiences", "certifications", "references"],
    ),
    TemplateInfo(
        id="template7",
        name="IIT-Style",
        description="Compact IIT-style resume with education table and grey section headers",
        engine="pdflatex",
        supported_sections=["education", "awards", "experiences", "skills", "projects", "leadership", "extracurricular"],
    ),
]

_VALID_IDS = {t.id for t in TEMPLATES}


def _validate_template(template_id: str) -> None:
    if template_id not in _VALID_IDS:
        raise HTTPException(status_code=400, detail=f"Unknown template: {template_id}")


@router.get("/templates", response_model=list[TemplateInfo])
async def list_templates():
    """List available LaTeX resume templates."""
    return TEMPLATES


@router.post("/compile")
async def compile_template(request: CompileRequest):
    """Compile a LaTeX template with resume data and return PDF."""
    _validate_template(request.template_id)

    try:
        pdf_bytes = await compile_latex(request)
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compilation error: {str(e)}")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=resume.pdf"},
    )


@router.post("/compile/preview")
async def compile_template_preview(
    request: CompileRequest,
    page: int = 0,
    dpi: int = 150,
):
    """Compile a LaTeX template and return a PNG preview image."""
    _validate_template(request.template_id)

    try:
        png_bytes, page_count = await compile_latex_preview(request, page=page, dpi=dpi)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compilation error: {str(e)}")

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "X-Page-Count": str(page_count),
            "Cache-Control": "no-cache",
        },
    )
