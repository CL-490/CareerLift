"""LaTeX renderer factory."""

from .base import BaseLatexRenderer
from .template1 import Template1Renderer
from .template2 import Template2Renderer
from .template3 import Template3Renderer
from .template4 import Template4Renderer
from .template5 import Template5Renderer
from .template6 import Template6Renderer
from .template7 import Template7Renderer

_RENDERERS: dict[str, type[BaseLatexRenderer]] = {
    "template1": Template1Renderer,
    "template2": Template2Renderer,
    "template3": Template3Renderer,
    "template4": Template4Renderer,
    "template5": Template5Renderer,
    "template6": Template6Renderer,
    "template7": Template7Renderer,
}


def get_renderer(template_id: str) -> BaseLatexRenderer:
    """Get a renderer instance for the given template ID."""
    cls = _RENDERERS.get(template_id)
    if cls is None:
        raise ValueError(f"Unknown template: {template_id}")
    return cls()
