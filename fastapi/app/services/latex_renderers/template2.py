"""Renderer for Template 2 - Modern AltaCV (xelatex)."""

from app.schemas.latex import ResumeData
from .base import BaseLatexRenderer


class Template2Renderer(BaseLatexRenderer):
    template_file = "template2.tex"

    def render(self, data: ResumeData) -> str:
        tex = self._read_template()
        preamble, body = self._split_at_document(tex)

        inject = "\n%=== INJECTED DATA ===\n"

        # Scalar fields
        p = data.person
        inject += self._renewcommand("userFirstName", p.first_name)
        inject += self._renewcommand("userLastName", p.last_name)
        inject += self._renewcommand("userTagline", p.tagline)
        inject += self._renewcommand("userEmail", p.email)
        inject += self._renewcommand("userPhone", p.phone)
        inject += self._renewcommand("userLinkedIn", p.linkedin)
        inject += self._renewcommand("userGithub", p.github)
        inject += self._renewcommand("userLocation", p.location)
        if p.profile:
            inject += self._renewcommand("userBio", p.profile)

        # Skills buffer
        for skill in data.skills.flat:
            inject += f"\\skill{{{self.escape(skill)}}}\n"
        for cat in data.skills.categories:
            inject += f"\\skill{{{self.escape(cat.name)}: {self.escape(cat.items)}}}\n"

        # Education buffer
        for edu in data.education:
            items = self._items_block(edu.details)
            if edu.gpa:
                items = f"\\item GPA: {self.escape(edu.gpa)}\n" + items
            inject += f"\\education{{{self.escape(edu.degree)}}}{{{self.escape(edu.institution)}}}{{{self.escape(edu.dates)}}}{{{self.escape(edu.location)}}}{{{items}}}\n"

        # Experience buffer
        for exp in data.experiences:
            items = self._items_block(exp.bullets)
            inject += f"\\experience{{{self.escape(exp.title)}}}{{{self.escape(exp.company)}}}{{{self.escape(exp.dates)}}}{{{self.escape(exp.location)}}}{{{self.escape(exp.keywords)}}}{{{items}}}\n"

        # Other activities (map projects to this)
        for proj in data.projects:
            desc = "; ".join(proj.bullets) if proj.bullets else proj.context
            inject += f"\\otheractivity{{{self.escape(proj.title)}}}{{{self.escape(desc)}}}\n"

        # Awards buffer
        for award in data.awards:
            inject += f"\\award{{{self.escape(award.title)}}}{{{self.escape(award.description)}}}\n"

        # Languages buffer
        for lang in data.languages:
            inject += f"\\lang{{{self.escape(lang.name)}}}{{{self.escape(lang.level)}}}\n"

        return preamble + inject + "\n" + body
