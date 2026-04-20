"""Renderer for Template 7 - IIT-Style."""

import re

from app.schemas.latex import ResumeData
from .base import BaseLatexRenderer


class Template7Renderer(BaseLatexRenderer):
    template_file = "template7.tex"

    def render(self, data: ResumeData) -> str:
        tex = self._read_template()
        # Template uses \href but only loads url package; add hyperref
        tex = tex.replace(
            r"\usepackage{url}",
            r"\usepackage{url}" + "\n" + r"\usepackage[hidelinks]{hyperref}",
        )
        # Remove the logo conditional block (no image file available)
        tex = tex.replace(
            "    \\if\\relax\\detokenize{\\userLogoPath}\\relax\\else\n"
            "      \\includegraphics[height =1in]{\\userLogoPath}\n"
            "    \\fi",
            "    % logo removed",
        )
        # Remove empty sections to avoid "missing \item" errors
        awards = [award for award in data.awards if award.title or award.description]
        education = [edu for edu in data.education if edu.degree or edu.institution or edu.dates or edu.gpa]
        experiences = [
            exp
            for exp in data.experiences
            if exp.title or exp.company or exp.dates or any(b for b in exp.bullets)
        ]
        skill_categories = [cat for cat in data.skills.categories if cat.name or cat.items]
        flat_skills = [skill for skill in data.skills.flat if skill]
        projects = [
            proj
            for proj in data.projects
            if proj.title or proj.context or proj.dates or proj.url or any(b for b in proj.bullets)
        ]
        leadership = [
            lead
            for lead in data.leadership
            if lead.title or lead.organization or lead.dates or any(b for b in lead.bullets)
        ]
        extracurricular = [item for item in data.extracurricular if item]

        empty_sections = []
        if not awards:
            empty_sections.append("AchievementsList")
        if not education:
            tex = re.sub(
                r"% Education table\s*.*?\\end\{table\}\s*",
                "",
                tex,
                flags=re.MULTILINE | re.DOTALL,
            )
        if not experiences:
            empty_sections.append("ExperienceList")
        if not skill_categories and not flat_skills:
            empty_sections.append("SkillsList")
        if not projects:
            empty_sections.append("ProjectsList")
        # CoursesList is not populated by the renderer
        empty_sections.append("CoursesList")
        if not leadership:
            empty_sections.append("PositionsList")
        if not extracurricular:
            empty_sections.append("ExtracurricularList")
        for buf_name in empty_sections:
            # Match: % comment + \noindent + \resheading{...} + \begin{itemize} + \BufferName + \end{itemize}
            # Use [^\n]+ for the resheading line to avoid nested brace issues
            pattern = (
                r"% [^\n]+\n"
                r"\\noindent\n"
                r"[^\n]+\n"  # \resheading line (may have nested braces)
                r"(?:\\vspace\{[^}]+\}\n)?"
                r"\\begin\{itemize\}[^\n]*\n"
                r"(?:\s*\\setlength\\itemsep\{[^}]+\}\n)?"
                r"\s*\\" + re.escape(buf_name) + r"\s*\n"
                r"\\end\{itemize\}"
            )
            tex = re.sub(pattern, f"% {buf_name} section removed (empty)", tex)
        preamble, body = self._split_at_document(tex)

        inject = "\n%=== INJECTED DATA ===\n"

        # Scalar fields
        p = data.person
        inject += self._renewcommand("userName", f"{p.first_name} {p.last_name}".strip())
        inject += self._renewcommand("userPhone", p.phone)
        inject += self._renewcommand("userEmail", p.email)
        # Hide logo (no image available)
        inject += self._renewcommand("userLogoPath", "")

        # Use first education entry for header fields
        if education:
            edu0 = education[0]
            inject += self._renewcommand("userDegree", edu0.degree)
            inject += self._renewcommand("userInstitution", edu0.institution)

        # Education table rows
        for edu in education:
            inject += (
                f"\\educationrow{{{self.escape(edu.degree)}}}"
                f"{{{self.escape(edu.institution)}}}"
                f"{{{self.escape(edu.dates)}}}"
                f"{{{self.escape(edu.gpa)}}}\n"
            )

        # Achievements (map awards)
        for award in awards:
            inject += f"\\achievement{{{self.escape(award.title)}: {self.escape(award.description)}}}{{}}\n"

        # Experience
        for exp in experiences:
            title_org = f"{exp.title} | {exp.company}" if exp.company else exp.title
            items = self._items_block(exp.bullets)
            inject += (
                f"\\experience{{{self.escape(title_org)}}}"
                f"{{{self.escape(exp.dates)}}}"
                f"{{{items}}}\n"
            )

        # Skills
        for cat in skill_categories:
            inject += f"\\skillcat{{{self.escape(cat.name)}}}{{{self.escape(cat.items)}}}\n"
        if flat_skills and not skill_categories:
            inject += f"\\skillcat{{Technical Skills}}{{{self.escape(', '.join(flat_skills))}}}\n"

        # Projects
        for proj in projects:
            title_ctx = f"{proj.title} | {proj.context}" if proj.context else proj.title
            items = self._items_block(proj.bullets)
            inject += (
                f"\\project{{{self.escape(title_ctx)}}}"
                f"{{{self.escape(proj.dates)}}}"
                f"{{{self.escape(proj.url)}}}"
                f"{{}}"
                f"{{{items}}}\n"
            )

        # Positions (map leadership)
        for lead in leadership:
            title_org = f"{lead.title} | {lead.organization}" if lead.organization else lead.title
            items = self._items_block(lead.bullets)
            inject += (
                f"\\position{{{self.escape(title_org)}}}"
                f"{{{self.escape(lead.dates)}}}"
                f"{{{items}}}\n"
            )

        # Extracurricular
        for item in extracurricular:
            inject += f"\\extra{{{self.escape(item)}}}\n"

        return preamble + inject + "\n" + body
