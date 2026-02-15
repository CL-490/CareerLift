"""LaTeX compilation service using Tectonic."""

import asyncio
import os
import tempfile

import fitz  # PyMuPDF

from app.schemas.latex import CompileRequest
from app.services.latex_renderers import get_renderer


async def compile_latex(request: CompileRequest) -> bytes:
    """Compile a LaTeX template with resume data and return PDF bytes."""
    renderer = get_renderer(request.template_id)
    tex_content = renderer.render(request.resume_data)

    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, "resume.tex")
        pdf_path = os.path.join(tmpdir, "resume.pdf")

        with open(tex_path, "w") as f:
            f.write(tex_content)

        proc = await asyncio.create_subprocess_exec(
            "tectonic", tex_path,
            "--outdir", tmpdir,
            "--chatter", "minimal",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)

        # Check if PDF was produced — Tectonic may exit non-zero for
        # warnings (e.g. absolute font paths) even when compilation succeeds.
        if os.path.exists(pdf_path):
            with open(pdf_path, "rb") as f:
                return f.read()

        error_msg = stderr.decode("utf-8", errors="replace") or stdout.decode("utf-8", errors="replace")
        raise RuntimeError(f"LaTeX compilation failed:\n{error_msg}")


async def compile_latex_preview(
    request: CompileRequest,
    page: int = 0,
    dpi: int = 150,
) -> tuple[bytes, int]:
    """Compile a LaTeX template and return a PNG preview of a single page.

    Returns (png_bytes, page_count).
    """
    pdf_bytes = await compile_latex(request)

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_count = len(doc)

    if page < 0 or page >= page_count:
        doc.close()
        raise ValueError(f"Page {page} out of range (0-{page_count - 1})")

    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    pix = doc[page].get_pixmap(matrix=mat)
    png_bytes = pix.tobytes("png")

    doc.close()
    return png_bytes, page_count
