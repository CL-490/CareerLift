"""Renderer for Template 6 - Photo Resume."""

import re

from app.schemas.latex import ResumeData
from .base import BaseLatexRenderer


class Template6Renderer(BaseLatexRenderer):
    template_file = "template6.tex"

    def render(self, data: ResumeData) -> str:
        tex = self._read_template()
        # Fix csection: \hrule\\ causes "no line to end" in vertical mode
        tex = tex.replace(
            r"\hrule\\[-0.5cm]",
            r"\hrule\vspace{-0.5cm}",
        )
        # Fix: empty \userTagline followed by \\ causes "no line to end"
        tex = tex.replace(
            r"{\small \userTagline}\\[0.2em]",
            r"\ifthenelse{\equal{\userTagline}{}}{}{{\small \userTagline}\\[0.2em]}",
        )
        # Remove sections whose buffers are empty to avoid empty itemize
        empty_sections = []
        if not data.summary:
            empty_sections.append("Summary")
        if not data.education:
            empty_sections.append("EDUCATION")
        if not data.skills.categories and not data.skills.flat:
            empty_sections.append("SKILLS")
        if not data.projects:
            empty_sections.append("PROJECTS")
        if not data.leadership:
            empty_sections.append("Significant Roles")
        if not data.experiences:
            empty_sections.append("EXPERIENCE")
        if not data.certifications:
            empty_sections.append("Global Certifications")
        if not data.references:
            empty_sections.append("References")
        for section_name in empty_sections:
            # Remove the entire \csection{Name}{...itemize...} block
            pattern = (
                r"\\csection\{" + re.escape(section_name) + r"\}\{\\small\s*\n"
                r"\s*\\begin\{itemize\}\s*\n"
                r"\s*\\\w+\s*\n"
                r"\s*\\end\{itemize\}\s*\n"
                r"\}"
            )
            tex = re.sub(pattern, f"% {section_name} section removed (empty)\n", tex)
        preamble, body = self._split_at_document(tex)

        inject = "\n%=== INJECTED DATA ===\n"

        # Scalar fields
        p = data.person
        inject += self._renewcommand("userName", f"{p.first_name} {p.last_name}".strip())
        inject += self._renewcommand("userTagline", p.tagline)
        inject += self._renewcommand("userAddress", p.location)
        inject += self._renewcommand("userEmail", p.email)
        if p.phone:
            inject += self._renewcommand("userPhoneTelLink", f"tel:{p.phone}")
            inject += self._renewcommand("userPhoneLabel", p.phone)
        if p.website:
            inject += self._renewcommand("userPortfolioURL", p.website)
            inject += self._renewcommand("userPortfolioText", p.website_display or "Portfolio")
        if p.github:
            inject += self._renewcommand("userGithubURL", f"https://github.com/{p.github}" if not p.github.startswith("http") else p.github)
        if p.linkedin:
            inject += self._renewcommand("userLinkedInURL", f"https://linkedin.com/in/{p.linkedin}" if not p.linkedin.startswith("http") else p.linkedin)
        # Hide photo (no image available)
        inject += self._renewcommand("userPhotoPath", "")

        # Summary
        for item in data.summary:
            inject += f"\\summaryitem{{{self.escape(item)}}}\n"

        # Education
        for edu in data.education:
            inject += (
                f"\\education{{{self.escape(edu.degree)}}}"
                f"{{{self.escape(edu.institution)}}}"
                f"{{{self.escape(edu.gpa)}}}"
                f"{{{self.escape(edu.dates)}}}\n"
            )

        # Skills
        for cat in data.skills.categories:
            inject += f"\\skillcat{{{self.escape(cat.name)}}}{{{self.escape(cat.items)}}}\n"
        if data.skills.flat and not data.skills.categories:
            inject += f"\\skillcat{{Skills}}{{{self.escape(', '.join(data.skills.flat))}}}\n"

        # Projects
        for proj in data.projects:
            inject += (
                f"\\project{{{self.escape(proj.title)}}}"
                f"{{{self.escape(proj.context)}}}"
                f"{{{self.escape(proj.dates)}}}"
                f"{{{self.escape(proj.url)}}}"
                f"{{}}\n"
            )

        # Roles (map leadership)
        for lead in data.leadership:
            inject += (
                f"\\role{{{self.escape(lead.title)}}}"
                f"{{{self.escape(lead.organization)}}}"
                f"{{{self.escape(lead.dates)}}}\n"
            )

        # Experience
        for exp in data.experiences:
            items = self._items_block(exp.bullets)
            inject += (
                f"\\experience{{{self.escape(exp.title)}}}"
                f"{{{self.escape(exp.company)}}}"
                f"{{{self.escape(exp.dates)}}}"
                f"{{{items}}}\n"
            )

        # Certifications
        for cert in data.certifications:
            inject += (
                f"\\certification{{{self.escape(cert.name)}}}"
                f"{{{self.escape(cert.institution)}}}"
                f"{{}}\n"
            )

        # References
        for ref in data.references:
            contact = self.escape(ref.email) if ref.email else ""
            inject += (
                f"\\refitem{{{self.escape(ref.name)}}}"
                f"{{{self.escape(ref.role)}}}"
                f"{{{contact}}}\n"
            )

        return preamble + inject + "\n" + body
