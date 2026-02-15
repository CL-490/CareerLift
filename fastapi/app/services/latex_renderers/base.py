"""Base LaTeX renderer with common utilities."""

from abc import ABC, abstractmethod
from app.schemas.latex import ResumeData


class BaseLatexRenderer(ABC):
    """Abstract base class for template-specific LaTeX renderers."""

    template_file: str  # e.g., "template1.tex"

    @abstractmethod
    def render(self, data: ResumeData) -> str:
        """Return complete .tex source with data injected."""
        ...

    @staticmethod
    def escape(text: str) -> str:
        """Escape LaTeX special characters in user text."""
        if not text:
            return ""
        # Order matters: backslash first, then the rest
        replacements = [
            ("\\", r"\textbackslash{}"),
            ("&", r"\&"),
            ("%", r"\%"),
            ("$", r"\$"),
            ("#", r"\#"),
            ("_", r"\_"),
            ("{", r"\{"),
            ("}", r"\}"),
            ("~", r"\textasciitilde{}"),
            ("^", r"\textasciicircum{}"),
        ]
        for old, new in replacements:
            text = text.replace(old, new)
        return text

    def _read_template(self) -> str:
        """Read the original .tex template file."""
        import os
        template_path = os.path.join("/app/latex", self.template_file)
        # Fallback for local development
        if not os.path.exists(template_path):
            base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
            template_path = os.path.join(base, "latex", self.template_file)
        with open(template_path, "r") as f:
            return f.read()

    def _split_at_document(self, tex: str) -> tuple[str, str]:
        """Split tex source into (preamble, body) at \\begin{document}."""
        marker = r"\begin{document}"
        idx = tex.index(marker)
        preamble = tex[:idx]
        body = tex[idx:]
        return preamble, body

    def _renewcommand(self, name: str, value: str) -> str:
        """Generate a \\renewcommand line."""
        return f"\\renewcommand{{\\{name}}}{{{self.escape(value)}}}\n"

    def _renewcommand_raw(self, name: str, value: str) -> str:
        """Generate a \\renewcommand line without escaping (for pre-built LaTeX)."""
        return f"\\renewcommand{{\\{name}}}{{{value}}}\n"

    def _items_block(self, items: list[str]) -> str:
        """Build a block of \\item lines from a list of strings.

        Returns at least one \\item to prevent empty itemize environments
        which cause 'missing \\item' LaTeX errors.
        """
        block = "\n".join(f"\\item {self.escape(item)}" for item in items if item)
        if not block:
            return "\\item ~"
        return block
