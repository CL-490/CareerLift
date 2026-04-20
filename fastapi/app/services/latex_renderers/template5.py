"""Renderer for Template 5 - Deedy Two-Column."""

from app.schemas.latex import ResumeData
from .base import BaseLatexRenderer


class Template5Renderer(BaseLatexRenderer):
    template_file = "template5.tex"

    def render(self, data: ResumeData) -> str:
        tex = self._read_template()
        # Fix \descript and \location: empty arg followed by \\ causes "no line to end"
        tex = tex.replace(
            r"\selectfont #1\\ \normalfont}",
            r"\selectfont \ifx\relax#1\relax\else#1\\\fi \normalfont}",
        )
        # Fix empty skill lines causing "no line to end" errors
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

        # Remove empty sections to save vertical space (prevents page overflow)
        # Left column: Objective
        if not data.person.profile:
            tex = tex.replace(
                "  % OBJECTIVE\n"
                "  \\section{Objective}\n"
                "  \\userObjective\n"
                "  \\sectionsep\n",
                "",
            )
        # Left column: Links (renderer never injects link data)
        tex = tex.replace(
            "\n  % LINKS\n"
            "  \\section{Links}\n"
            "  \\LinksList\n"
            "  \\sectionsep\n",
            "",
        )
        # Left column: Coursework (if no courses)
        if not data.coursework.postgraduate and not data.coursework.undergraduate:
            tex = tex.replace(
                "\n  % COURSEWORK\n"
                "  \\section{Coursework}\n"
                "  \\subsection{PostGraduate}\n"
                "  \\PGCourseworkList\n"
                "  \\sectionsep\n"
                "\n"
                "  \\subsection{Undergraduate}\n"
                "  \\UGCourseworkList\n"
                "  \\sectionsep\n",
                "",
            )
        elif not data.coursework.postgraduate:
            tex = tex.replace(
                "  \\subsection{PostGraduate}\n"
                "  \\PGCourseworkList\n"
                "  \\sectionsep\n"
                "\n",
                "",
            )
        elif not data.coursework.undergraduate:
            tex = tex.replace(
                "\n  \\subsection{Undergraduate}\n"
                "  \\UGCourseworkList\n"
                "  \\sectionsep\n",
                "\n",
            )
        # Left column: Education (if none)
        if not data.education:
            tex = tex.replace(
                "\n  % EDUCATION\n"
                "  \\section{Education}\n"
                "  \\EducationList\n",
                "",
            )
        # Left column: Skills (remove fully or trim empty subsections)
        cat_map = {c.name.lower(): c.items for c in data.skills.categories}
        prog = cat_map.get("programming", "")
        soft = cat_map.get("software", "")
        lang = cat_map.get("language", cat_map.get("languages", ""))
        if not prog and data.skills.flat:
            prog = ", ".join(data.skills.flat)
        if not prog and not soft and not lang:
            tex = tex.replace(
                "\n  % SKILLS\n"
                "  \\section{Skills}\n"
                "  \\subsection{Programming}\n"
                "  \\ProgSkillsLine\\\\\n"
                "  \\sectionsep\n"
                "\n"
                "  \\subsection{Software}\n"
                "  \\SoftwareSkillsLine\\\\\n"
                "  \\sectionsep\n"
                "\n"
                "  \\subsection{Language}\n"
                "  \\LanguageSkillsLine\\\\\n"
                "  \\sectionsep\n",
                "",
            )
        else:
            if not prog:
                tex = tex.replace(
                    "  \\subsection{Programming}\n"
                    "  \\ProgSkillsLine\\\\\n"
                    "  \\sectionsep\n"
                    "\n",
                    "",
                )
            if not soft:
                tex = tex.replace(
                    "  \\subsection{Software}\n"
                    "  \\SoftwareSkillsLine\\\\\n"
                    "  \\sectionsep\n"
                    "\n",
                    "",
                )
            if not lang:
                tex = tex.replace(
                    "  \\subsection{Language}\n"
                    "  \\LanguageSkillsLine\\\\\n"
                    "  \\sectionsep\n",
                    "",
                )
        # Right column: Experience (if none)
        if not data.experiences:
            tex = tex.replace(
                "\n  % EXPERIENCE\n"
                "  \\section{Experience}\n"
                "  \\ExperienceList\n",
                "",
            )
        # Right column: Projects (if none)
        if not data.projects:
            tex = tex.replace(
                "\n  % PROJECTS\n"
                "  \\section{Projects}\n"
                "  \\ProjectList\n",
                "",
            )
        # Right column: Training (renderer never injects training data)
        tex = tex.replace(
            "\n  % TRAINING\n"
            "  \\section{Training}\n"
            "  \\TrainingList\n",
            "",
        )
        # Right column: Publication (if none)
        if not data.publications:
            tex = tex.replace(
                "\n  % PUBLICATION\n"
                "  \\section{Publication}\n"
                "  \\PublicationList\n",
                "",
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
