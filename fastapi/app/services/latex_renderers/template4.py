"""Renderer for Template 4 - Research Professional."""

from app.schemas.latex import ResumeData
from .base import BaseLatexRenderer


class Template4Renderer(BaseLatexRenderer):
    template_file = "template4.tex"

    def render(self, data: ResumeData) -> str:
        tex = self._read_template()
        preamble, body = self._split_at_document(tex)

        inject = "\n%=== INJECTED DATA ===\n"

        # Scalar fields
        p = data.person
        inject += self._renewcommand("userName", f"{p.first_name} {p.last_name}".strip())
        inject += self._renewcommand("userCityCountry", p.location)
        inject += self._renewcommand("userPhone", p.phone)
        inject += self._renewcommand("userEmail", p.email)
        inject += self._renewcommand("userLinkedIn", p.linkedin)
        inject += self._renewcommand("userGithub", p.github)
        inject += self._renewcommand("userNationality", p.nationality)
        if p.profile:
            inject += self._renewcommand("userProfile", p.profile)

        # Education
        for edu in data.education:
            details = " \\\\ ".join(self.escape(d) for d in edu.details) if edu.details else ""
            if edu.gpa:
                gpa_line = f"GPA: {self.escape(edu.gpa)}"
                details = f"{gpa_line} \\\\ {details}" if details else gpa_line
            inject += (
                f"\\education{{{self.escape(edu.dates)}}}"
                f"{{{self.escape(edu.degree)}}}"
                f"{{{self.escape(edu.institution)}}}"
                f"{{{self.escape(edu.location)}}}"
                f"{{{details}}}\n"
            )

        # Experience
        for exp in data.experiences:
            items = self._items_block(exp.bullets)
            inject += (
                f"\\experience{{{self.escape(exp.dates)}}}"
                f"{{{self.escape(exp.title)}}}"
                f"{{{self.escape(exp.company)}}}"
                f"{{{self.escape(exp.location)}}}"
                f"{{{items}}}\n"
            )

        # Publications
        for pub in data.publications:
            inject += (
                f"\\publication{{{self.escape(pub.title)}}}"
                f"{{{self.escape(pub.venue)}}}"
                f"{{{self.escape(pub.authors)}}}\n"
            )

        # Projects
        for proj in data.projects:
            items = self._items_block(proj.bullets)
            inject += (
                f"\\project{{{self.escape(proj.title)}}}"
                f"{{{self.escape(proj.context)}}}"
                f"{{{items}}}\n"
            )

        # Skills (single line)
        skills_parts = []
        for cat in data.skills.categories:
            skills_parts.append(f"\\textbf{{{self.escape(cat.name)}}}: {self.escape(cat.items)}")
        if data.skills.flat:
            skills_parts.append(", ".join(self.escape(s) for s in data.skills.flat))
        if skills_parts:
            inject += self._renewcommand_raw("SkillsLine", " \\\\ ".join(skills_parts))

        # Languages (single line)
        if data.languages:
            lang_parts = [f"{self.escape(l.name)} ({self.escape(l.level)})" if l.level else self.escape(l.name) for l in data.languages]
            inject += self._renewcommand_raw("LanguagesLine", ", ".join(lang_parts))

        # References
        refs = data.references[:2]  # Left and right
        if len(refs) >= 1:
            r = refs[0]
            inject += (
                f"\\refleft{{{self.escape(r.name)}}}"
                f"{{{self.escape(r.role)}}}"
                f"{{}}"
                f"{{{self.escape(r.institution)}}}"
                f"{{{self.escape(r.email)}}}\n"
            )
        if len(refs) >= 2:
            r = refs[1]
            inject += (
                f"\\refright{{{self.escape(r.name)}}}"
                f"{{{self.escape(r.role)}}}"
                f"{{}}"
                f"{{{self.escape(r.institution)}}}"
                f"{{{self.escape(r.email)}}}\n"
            )

        return preamble + inject + "\n" + body
