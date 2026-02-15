"""Renderer for Template 3 - Tabular Academic."""

import re

from app.schemas.latex import ResumeData
from .base import BaseLatexRenderer


class Template3Renderer(BaseLatexRenderer):
    template_file = "template3.tex"

    def render(self, data: ResumeData) -> str:
        tex = self._read_template()
        # Remove logo include (no image file available)
        tex = tex.replace(
            r"\includegraphics[width=2cm,clip]{\userLogoPath}",
            "% logo removed",
        )
        # Remove empty sections to avoid "missing \item" errors
        empty_removals = []
        if not data.experiences:
            empty_removals.append(("Experience", "ExperienceList", "resumeSubHeadingList"))
        if not data.projects:
            empty_removals.append(("Projects", "ProjectsList", "resumeSubHeadingList"))
        if not data.skills.categories and not data.skills.flat:
            empty_removals.append(("Technical Skills", "TechSkillsList", "resumeHeadingSkill"))
        if not data.coursework.postgraduate and not data.coursework.undergraduate:
            empty_removals.append(("Key courses taken", "KeyCoursesList", "resumeHeadingSkill"))
        if not data.certifications:
            empty_removals.append(("Certifications", "CertificationsList", "resumeItemList"))
        if not data.leadership:
            empty_removals.append(("Positions of Responsibility", "PositionsList", "resumeSubHeadingList"))
        if not data.miscellaneous:
            empty_removals.append(("Miscellaneous", "MiscList", "resumeSubHeadingList"))
        for section_title, buf_name, env_prefix in empty_removals:
            pattern = (
                r"\\section\{\\textbf\{" + re.escape(section_title) + r"\}\}\s*\n"
                r"(?:\\vspace\{[^}]+\}\s*\n)?"
                r"\\" + re.escape(env_prefix) + r"Start\s*\n"
                r"\s*\\" + re.escape(buf_name) + r"\s*\n"
                r"\\" + re.escape(env_prefix) + r"End"
            )
            tex = re.sub(pattern, f"% {section_title} removed (empty)", tex)
        preamble, body = self._split_at_document(tex)

        inject = "\n%=== INJECTED DATA ===\n"

        # Scalar fields
        p = data.person
        inject += self._renewcommand("userName", f"{p.first_name} {p.last_name}".strip())
        inject += self._renewcommand("userPhone", p.phone)
        inject += self._renewcommand("userEmailA", p.email)
        inject += self._renewcommand("userEmailB", p.email)
        inject += self._renewcommand("userGithub", p.github)
        inject += self._renewcommand("userLinkedIn", p.linkedin)
        if p.location:
            inject += self._renewcommand("userUniversityLine", p.location)
        # Hide logo by default (no image file available)
        inject += self._renewcommand("userLogoPath", "")

        # Education (first entry for course line, all as table rows)
        if data.education:
            inject += self._renewcommand("userCourse", data.education[0].degree)

        for edu in data.education:
            inject += (
                f"\\education{{{self.escape(edu.dates)}}}"
                f"{{{self.escape(edu.degree)}}}"
                f"{{{self.escape(edu.institution)}}}"
                f"{{{self.escape(edu.gpa)}}}\n"
            )

        # Experience buffer
        for exp in data.experiences:
            items = self._items_block(exp.bullets)
            inject += (
                f"\\experience{{{self.escape(exp.company)}}}"
                f"{{{self.escape(exp.location)}}}"
                f"{{{self.escape(exp.title)}}}"
                f"{{{self.escape(exp.dates)}}}"
                f"{{{items}}}\n"
            )

        # Projects buffer
        for proj in data.projects:
            items = self._items_block(proj.bullets)
            inject += (
                f"\\project{{{self.escape(proj.title)}}}"
                f"{{{self.escape(proj.context)}}}"
                f"{{{self.escape(proj.dates)}}}"
                f"{{{self.escape(proj.url)}}}"
                f"{{{items}}}\n"
            )

        # Skills
        for cat in data.skills.categories:
            inject += f"\\techskill{{{self.escape(cat.name)}}}{{{self.escape(cat.items)}}}\n"
        if data.skills.flat and not data.skills.categories:
            inject += f"\\techskill{{Skills}}{{{self.escape(', '.join(data.skills.flat))}}}\n"

        # Key courses
        if data.coursework.postgraduate:
            inject += f"\\keycourses{{Postgraduate}}{{{self.escape(', '.join(data.coursework.postgraduate))}}}\n"
        if data.coursework.undergraduate:
            inject += f"\\keycourses{{Undergraduate}}{{{self.escape(', '.join(data.coursework.undergraduate))}}}\n"

        # Certifications
        for cert in data.certifications:
            inject += (
                f"\\certification{{{self.escape(cert.url)}}}"
                f"{{{self.escape(cert.name)}}}"
                f"{{{self.escape(cert.institution)}}}\n"
            )

        # Positions (map leadership entries)
        for lead in data.leadership:
            inject += (
                f"\\position{{{self.escape(lead.title)}}}"
                f"{{{self.escape(lead.organization)}}}"
                f"{{{self.escape(lead.dates)}}}\n"
            )

        # Miscellaneous
        for misc in data.miscellaneous:
            inject += (
                f"\\miscitem{{{self.escape(misc.title)}}}"
                f"{{{self.escape(misc.description)}}}"
                f"{{}}\n"
            )

        return preamble + inject + "\n" + body
