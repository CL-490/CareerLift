"""Renderer for Template 5 - Deedy Two-Column (xelatex)."""

from app.schemas.latex import ResumeData
from .base import BaseLatexRenderer


class Template5Renderer(BaseLatexRenderer):
    template_file = "template5.tex"

    def render(self, data: ResumeData) -> str:
        tex = self._read_template()
        # Replace Raleway with Lato (Raleway not available in Docker)
        tex = tex.replace(
            r"\setsansfont[Scale=MatchLowercase,Mapping=tex-text]{Raleway}",
            r"\setsansfont[Scale=MatchLowercase,Mapping=tex-text]{Lato}",
        )
        # Fix \descript and \location: empty arg followed by \\ causes "no line to end"
        tex = tex.replace(
            r"\selectfont #1\\ \normalfont}",
            r"\selectfont \ifx\relax#1\relax\else#1\\\fi \normalfont}",
        )
        # Fix empty skill lines causing "no line to end" errors
        # Replace "SkillsLine\\" with conditional that only adds \\ if non-empty
        for cmd in ["ProgSkillsLine", "SoftwareSkillsLine", "LanguageSkillsLine"]:
            tex = tex.replace(
                f"\\{cmd}\\\\",
                f"\\{cmd}",
            )
        # Fix \education: empty #4 or #5 followed by \\ causes "no line to end"
        tex = tex.replace(
            "    #4\\\\\n    #5\\\\",
            "    \\ifx\\relax#4\\relax\\else#4\\\\\\fi\n    \\ifx\\relax#5\\relax\\else#5\\\\\\fi",
        )
        # Fix \project and \training: empty #3 followed by \\ causes same error
        tex = tex.replace(
            "    #3\\\\\n    \\sectionsep",
            "    \\ifx\\relax#3\\relax\\else#3\\\\\\fi\n    \\sectionsep",
        )
        # Fix \publication: empty #2 followed by \\
        tex = tex.replace(
            "    #2\\\\\n    \\sectionsep",
            "    \\ifx\\relax#2\\relax\\else#2\\\\\\fi\n    \\sectionsep",
        )
        preamble, body = self._split_at_document(tex)

        inject = "\n%=== INJECTED DATA ===\n"

        # Scalar fields
        p = data.person
        inject += self._renewcommand("userFirstName", p.first_name)
        inject += self._renewcommand("userLastName", p.last_name)

        # Tagline: build from contact info if not provided
        tagline = p.tagline
        if not tagline:
            parts = []
            if p.email:
                parts.append(p.email)
            if p.phone:
                parts.append(p.phone)
            if p.website:
                parts.append(p.website)
            tagline = " | ".join(parts)
        inject += self._renewcommand("userTagline", tagline)

        if p.profile:
            inject += self._renewcommand("userObjective", p.profile)

        # Education (left column)
        for edu in data.education:
            detail1 = f"GPA: {self.escape(edu.gpa)}" if edu.gpa else ""
            detail2 = self.escape(edu.details[0]) if edu.details else ""
            inject += (
                f"\\education{{{self.escape(edu.institution)}}}"
                f"{{{self.escape(edu.degree)}}}"
                f"{{{self.escape(edu.location or edu.dates)}}}"
                f"{{{detail1}}}"
                f"{{{detail2}}}\n"
            )

        # Coursework
        for course in data.coursework.postgraduate:
            inject += f"\\pgcourse{{{self.escape(course)}}}\n"
        for course in data.coursework.undergraduate:
            inject += f"\\ugcourse{{{self.escape(course)}}}\n"

        # Skills
        cat_map = {c.name.lower(): c.items for c in data.skills.categories}
        prog = cat_map.get("programming", "")
        soft = cat_map.get("software", "")
        lang = cat_map.get("language", cat_map.get("languages", ""))
        if not prog and data.skills.flat:
            prog = ", ".join(data.skills.flat)
        inject += f"\\setprogskills{{{self.escape(prog)}}}\n"
        inject += f"\\setsoftskills{{{self.escape(soft)}}}\n"
        inject += f"\\setlangskills{{{self.escape(lang)}}}\n"

        # Experience (right column)
        for exp in data.experiences:
            items = self._items_block(exp.bullets)
            location = exp.location or exp.dates
            inject += (
                f"\\experience{{{self.escape(exp.company)}}}"
                f"{{{self.escape(exp.title)}}}"
                f"{{{self.escape(location)}}}"
                f"{{{items}}}\n"
            )

        # Projects (right column)
        for proj in data.projects:
            desc = " ".join(self.escape(b) for b in proj.bullets) if proj.bullets else self.escape(proj.context)
            inject += (
                f"\\project{{{self.escape(proj.title)}}}"
                f"{{{self.escape(proj.dates)}}}"
                f"{{{desc}}}\n"
            )

        # Publications
        for pub in data.publications:
            inject += (
                f"\\publication{{{self.escape(pub.title)}}}"
                f"{{{self.escape(pub.venue)}}}\n"
            )

        return preamble + inject + "\n" + body
