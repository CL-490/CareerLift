"""Renderer for Template 1 - Classic Academic."""

from app.schemas.latex import ResumeData
from .base import BaseLatexRenderer


class Template1Renderer(BaseLatexRenderer):
    template_file = "template1.tex"

    def render(self, data: ResumeData) -> str:
        tex = self._read_template()
        # Template1 uses \g@addto@macro which requires @ to be a letter
        tex = tex.replace(
            r"\documentclass[a4paper,10pt]{article}",
            r"\documentclass[a4paper,10pt]{article}" + "\n\\makeatletter",
        )
        # Tectonic uses XeTeX: expansion=true is not supported
        tex = tex.replace(
            r"\microtypesetup{protrusion=true,expansion=true}",
            r"\microtypesetup{protrusion=true}",
        )
        # Fix \ifx\BufferName\empty checks: \newcommand creates \long macros
        # which never match \empty. Use \def so empty buffers are detected.
        for buf in ("AwardsList", "ExperienceList", "ProjectsList", "LeadershipList"):
            tex = tex.replace(
                f"\\newcommand{{\\{buf}}}{{}}",
                f"\\def\\{buf}{{}}"
            )
        preamble, body = self._split_at_document(tex)

        inject = "\n%=== INJECTED DATA ===\n"

        # Scalar fields
        p = data.person
        inject += self._renewcommand("userName", f"{p.first_name} {p.last_name}".strip())
        inject += self._renewcommand("userEmail", p.email)
        inject += self._renewcommand("userPhone", p.phone)
        inject += self._renewcommand("userLocation", p.location)
        if p.website:
            inject += self._renewcommand("userWebsite", p.website)
            display = p.website_display or p.website.replace("https://", "").replace("http://", "")
            inject += self._renewcommand("userWebsiteDisplay", display)

        # Education (first entry used for scalar fields)
        if data.education:
            edu = data.education[0]
            inject += self._renewcommand("eduInstitution", edu.institution)
            inject += self._renewcommand("eduDates", edu.dates)
            inject += self._renewcommand("eduDegree", edu.degree)
            inject += self._renewcommand("eduGPA", edu.gpa)

        # Skills (map categories to the 6 named slots, or use flat skills)
        cat_map = {c.name.lower(): c.items for c in data.skills.categories}
        slots = [
            ("skillsProgramming", "programming"),
            ("skillsAIML", "ai/ml"),
            ("skillsFrameworks", "frameworks"),
            ("skillsData", "data/infra"),
            ("skillsTools", "tools"),
            ("skillsLanguages", "languages"),
        ]
        for cmd, key in slots:
            if key in cat_map:
                inject += self._renewcommand(cmd, cat_map[key])

        # If only flat skills and no categories, put them all in Programming
        if data.skills.flat and not data.skills.categories:
            inject += self._renewcommand("skillsProgramming", ", ".join(data.skills.flat))

        # Awards buffer
        for award in data.awards:
            inject += f"\\award{{{self.escape(award.title)}}}{{{self.escape(award.description)}}}\n"

        # Experience buffer
        for exp in data.experiences:
            inject += f"\\experience{{{self.escape(exp.title)}}}{{{self.escape(exp.company)}}}{{{self.escape(exp.dates)}}}\n"
            bullets = [b for b in exp.bullets if b]
            if bullets:
                for bullet in bullets:
                    inject += f"\\experienceBullet{{{self.escape(bullet)}}}\n"
            else:
                inject += "\\experienceBullet{~}\n"
            inject += "\\experienceEnd\n"

        # Projects buffer
        for proj in data.projects:
            inject += f"\\project{{{self.escape(proj.title)}}}{{{self.escape(proj.url)}}}\n"
            bullets = [b for b in proj.bullets if b]
            if bullets:
                for bullet in bullets:
                    inject += f"\\projectBullet{{{self.escape(bullet)}}}\n"
            else:
                inject += "\\projectBullet{~}\n"
            inject += "\\projectEnd\n"

        # Leadership buffer
        for lead in data.leadership:
            inject += f"\\leadership{{{self.escape(lead.title)}}}{{{self.escape(lead.dates)}}}\n"
            bullets = [b for b in lead.bullets if b]
            if bullets:
                for bullet in bullets:
                    inject += f"\\leadershipBullet{{{self.escape(bullet)}}}\n"
            else:
                inject += "\\leadershipBullet{~}\n"
            inject += "\\leadershipEnd\n"

        inject += "\\makeatother\n"
        return preamble + inject + "\n" + body
