from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional


SKILL_ALIASES: dict[str, list[str]] = {
    "python": ["python"],
    "javascript": ["javascript", "js"],
    "typescript": ["typescript", "ts"],
    "react": ["react", "reactjs", "react.js"],
    "next.js": ["next.js", "nextjs"],
    "node.js": ["node.js", "nodejs"],
    "fastapi": ["fastapi"],
    "django": ["django"],
    "flask": ["flask"],
    "java": ["java"],
    "c++": ["c++", "cpp"],
    "c#": ["c#", "dotnet", ".net"],
    "go": ["golang", "go"],
    "rust": ["rust"],
    "sql": ["sql"],
    "postgresql": ["postgres", "postgresql"],
    "mysql": ["mysql"],
    "mongodb": ["mongodb", "mongo"],
    "redis": ["redis"],
    "aws": ["aws", "amazon web services"],
    "gcp": ["gcp", "google cloud", "google cloud platform"],
    "azure": ["azure"],
    "docker": ["docker"],
    "kubernetes": ["kubernetes", "k8s"],
    "terraform": ["terraform"],
    "linux": ["linux"],
    "git": ["git"],
    "graphql": ["graphql"],
    "rest": ["rest", "restful", "rest api", "restful api"],
    "html": ["html"],
    "css": ["css"],
    "tailwind": ["tailwind", "tailwindcss"],
    "figma": ["figma"],
    "pandas": ["pandas"],
    "numpy": ["numpy"],
    "machine learning": [
        "machine learning",
        "ml",
        "supervised learning",
        "unsupervised learning",
        "classification",
        "regression",
        "predictive modeling",
        "statistical learning",
        "decision trees",
        "decision tree",
        "random forest",
        "random forests",
        "svm",
        "support vector machine",
        "support vector machines",
        "k-nn",
        "knn",
        "nearest neighbors",
        "naive bayes",
        "logistic regression",
        "linear regression",
    ],
    "deep learning": [
        "deep learning",
        "neural network",
        "neural networks",
        "artificial neural network",
        "anns",
    ],
    "reinforcement learning": [
        "reinforcement learning",
        "policy optimization",
        "proximal policy optimization",
        "ppo",
    ],
    "pytorch": ["pytorch", "torch"],
    "tensorflow": ["tensorflow", "tensor flow"],
    "keras": ["keras", "tensorflow/keras"],
    "stable-baselines3": ["stable-baselines3", "stable baselines3", "sb3"],
    "data analysis": ["data analysis", "analytics"],
    "spark": ["spark", "apache spark"],
    "airflow": ["airflow", "apache airflow"],
    "ci/cd": ["ci/cd", "cicd", "continuous integration", "continuous delivery"],
    "testing": ["testing", "unit testing", "integration testing", "pytest", "jest"],
    "agile": ["agile", "scrum"],
}

SKILL_IMPLICATIONS: dict[str, list[str]] = {
    "deep learning": ["machine learning"],
    "reinforcement learning": ["machine learning"],
    "pytorch": ["deep learning", "machine learning"],
    "tensorflow": ["deep learning", "machine learning"],
    "keras": ["deep learning", "machine learning"],
    "stable-baselines3": ["reinforcement learning", "machine learning"],
}

SENIORITY_ORDER = {
    "intern": 0,
    "junior": 1,
    "mid": 2,
    "senior": 3,
    "staff": 4,
    "principal": 5,
    "director": 6,
}

SENIORITY_KEYWORDS = {
    "intern": ["intern", "internship"],
    "junior": ["junior", "jr"],
    "mid": ["mid", "mid-level", "associate"],
    "senior": ["senior", "sr", "lead"],
    "staff": ["staff"],
    "principal": ["principal", "architect"],
    "director": ["director", "head of", "vp", "vice president", "manager"],
}

DEGREE_PATTERNS = {
    "phd": [r"\bphd\b", r"doctorate", r"doctoral"],
    "masters": [r"master'?s", r"\bms\b", r"\bmsc\b", r"\bma\b", r"\bmba\b"],
    "bachelors": [r"bachelor'?s", r"\bbs\b", r"\bba\b", r"\bbsc\b"],
}

REQUIRED_MARKERS = [
    "required",
    "must have",
    "minimum qualifications",
    "basic qualifications",
    "requirements",
]

PREFERRED_MARKERS = [
    "preferred",
    "nice to have",
    "bonus",
    "plus",
    "preferred qualifications",
]

RESPONSIBILITY_MARKERS = [
    "responsibilities",
    "what you'll do",
    "you will",
    "in this role",
]

STOPWORDS = {
    "and", "the", "for", "with", "that", "this", "from", "your", "will", "our",
    "you", "are", "has", "have", "using", "use", "into", "across", "build",
    "team", "teams", "work", "role", "years", "year", "experience", "including",
    "about", "their", "they", "them", "who", "how", "what", "when", "where",
}


@dataclass
class ResumeATSProfile:
    skills: list[str]
    experience_text: str
    experience_titles: list[str]
    education: list[str]
    resume_text: str = ""


class ATSScoringService:
    def expand_skill_hierarchy(self, skills: Iterable[str]) -> set[str]:
        expanded = set(skills)
        changed = True
        while changed:
            changed = False
            for skill in list(expanded):
                implied = SKILL_IMPLICATIONS.get(skill, [])
                for parent in implied:
                    if parent not in expanded:
                        expanded.add(parent)
                        changed = True
        return expanded

    def build_resume_profile(
        self,
        *,
        skills: Iterable[str],
        experiences: Iterable[str],
        experience_titles: Iterable[str],
        education: Iterable[str],
        resume_text: str = "",
    ) -> ResumeATSProfile:
        normalized_skills = self.expand_skill_hierarchy({
            skill
            for raw_skill in skills
            for skill in self.extract_known_skills(str(raw_skill))
        })

        experience_chunks = [str(item).strip() for item in experiences if str(item).strip()]
        title_chunks = [str(item).strip() for item in experience_titles if str(item).strip()]
        education_chunks = [str(item).strip() for item in education if str(item).strip()]

        experience_skill_signals = self.expand_skill_hierarchy(
            self.extract_known_skills(" ".join(experience_chunks + title_chunks + [resume_text]))
        )

        return ResumeATSProfile(
            skills=sorted(set(normalized_skills) | set(experience_skill_signals)),
            experience_text=" ".join(experience_chunks),
            experience_titles=title_chunks,
            education=education_chunks,
            resume_text=resume_text or " ".join(experience_chunks),
        )

    def extract_known_skills(self, text: str) -> list[str]:
        haystack = text.lower()
        matches: list[str] = []
        for canonical, aliases in SKILL_ALIASES.items():
            if any(
                re.search(rf"(?<!\w){re.escape(alias.lower())}(?!\w)", haystack)
                for alias in aliases
            ):
                matches.append(canonical)
        return sorted(set(matches))

    def extract_keywords(self, text: str) -> list[str]:
        words = re.findall(r"[a-zA-Z0-9\-+.#]+", text.lower())
        return [
            word for word in words
            if len(word) > 2 and word not in STOPWORDS and not word.isdigit()
        ]

    def extract_years_requirement(self, text: str) -> Optional[int]:
        matches = re.findall(r"(\d+)\+?\s*(?:years|yrs)", text.lower())
        if not matches:
            return None
        return max(int(value) for value in matches)

    def infer_years_from_resume(self, profile: ResumeATSProfile) -> int:
        matches = re.findall(r"(\d+)\+?\s*(?:years|yrs)", profile.resume_text.lower())
        if matches:
            return max(int(value) for value in matches)
        return min(len(profile.experience_titles) * 2, 12)

    def extract_seniority(self, text: str) -> Optional[str]:
        text = text.lower()
        for level, keywords in SENIORITY_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                return level
        return None

    def normalize_title_tokens(self, title: str) -> set[str]:
        tokens = self.extract_keywords(title)
        return {
            token for token in tokens
            if token not in {"engineer", "developer", "manager", "specialist"}
        }

    def extract_degree_requirement(self, text: str) -> Optional[str]:
        text = text.lower()
        for degree, patterns in DEGREE_PATTERNS.items():
            if any(re.search(pattern, text) for pattern in patterns):
                return degree
        return None

    def detect_resume_degree(self, profile: ResumeATSProfile) -> Optional[str]:
        combined = " ".join(profile.education).lower()
        for degree, patterns in DEGREE_PATTERNS.items():
            if any(re.search(pattern, combined) for pattern in patterns):
                return degree
        return None

    def extract_sentence_bucket_skills(self, text: str, markers: list[str]) -> list[str]:
        skills: set[str] = set()
        for sentence in re.split(r"[\n\.\;\•\-]+", text.lower()):
            if any(marker in sentence for marker in markers):
                skills.update(self.extract_known_skills(sentence))
        return sorted(skills)

    def extract_domain_keywords(self, text: str, excluded_skills: set[str]) -> list[str]:
        keywords = self.extract_keywords(text)
        filtered = [
            keyword for keyword in keywords
            if keyword not in excluded_skills and len(keyword) > 3
        ]
        return sorted(set(filtered))[:15]

    def overlap_ratio(self, expected: Iterable[str], actual: Iterable[str]) -> float:
        expected_set = {item for item in expected if item}
        actual_set = {item for item in actual if item}
        if not expected_set:
            return 1.0
        if not actual_set:
            return 0.0
        return len(expected_set & actual_set) / len(expected_set)

    def partial_overlap_ratio(self, expected: Iterable[str], actual_text: str) -> float:
        expected_set = {item for item in expected if item}
        if not expected_set:
            return 1.0
        text = actual_text.lower()
        matches = 0
        for item in expected_set:
            if item in text:
                matches += 1
        return matches / len(expected_set)

    def extract_job_requirements(self, job: Dict[str, Any]) -> dict[str, Any]:
        job_text = " ".join([
            str(job.get("title", "")),
            str(job.get("company", "")),
            str(job.get("location", "")),
            str(job.get("description", "")),
        ])
        lower_text = job_text.lower()

        all_skills = sorted(self.expand_skill_hierarchy(self.extract_known_skills(job_text)))
        required_skills = sorted(self.expand_skill_hierarchy(
            self.extract_sentence_bucket_skills(lower_text, REQUIRED_MARKERS)
        ))
        preferred_skills = sorted(self.expand_skill_hierarchy(
            self.extract_sentence_bucket_skills(lower_text, PREFERRED_MARKERS)
        ))

        if not required_skills:
            required_skills = all_skills[: min(len(all_skills), 8)]

        responsibility_keywords = self.extract_domain_keywords(
            lower_text,
            set(all_skills),
        )

        return {
            "all_skills": all_skills,
            "required_skills": required_skills,
            "preferred_skills": [skill for skill in preferred_skills if skill not in required_skills],
            "seniority": self.extract_seniority(str(job.get("title", "")) + " " + str(job.get("description", ""))),
            "years_required": self.extract_years_requirement(lower_text),
            "degree_required": self.extract_degree_requirement(lower_text),
            "responsibility_keywords": responsibility_keywords,
        }

    def score_resume_to_job(
        self,
        profile: ResumeATSProfile,
        job: Dict[str, Any],
    ) -> dict[str, Any]:
        requirements = self.extract_job_requirements(job)

        required_skills = set(requirements["required_skills"])
        preferred_skills = set(requirements["preferred_skills"])
        resume_skills = set(profile.skills)

        matched_required = sorted(required_skills & resume_skills)
        missing_required = sorted(required_skills - resume_skills)
        matched_preferred = sorted(preferred_skills & resume_skills)
        missing_preferred = sorted(preferred_skills - resume_skills)

        required_ratio = self.overlap_ratio(required_skills, resume_skills)
        preferred_ratio = self.overlap_ratio(preferred_skills, resume_skills)
        hard_skills_score = round((required_ratio * 0.75 + preferred_ratio * 0.25) * 35, 2)

        resume_title_tokens = set().union(*[
            self.normalize_title_tokens(title) for title in profile.experience_titles
        ]) if profile.experience_titles else set()
        job_title_tokens = self.normalize_title_tokens(str(job.get("title", "")))
        title_ratio = self.overlap_ratio(job_title_tokens, resume_title_tokens)

        job_seniority = requirements["seniority"]
        resume_seniority = self.extract_seniority(" ".join(profile.experience_titles))
        seniority_score = 0.0
        if job_seniority and resume_seniority:
            diff = SENIORITY_ORDER.get(resume_seniority, 0) - SENIORITY_ORDER.get(job_seniority, 0)
            if diff >= 0:
                seniority_score = 1.0
            elif diff == -1:
                seniority_score = 0.55
            else:
                seniority_score = 0.2
        elif job_seniority:
            seniority_score = 0.5
        else:
            seniority_score = 1.0
        title_seniority_score = round((title_ratio * 0.45 + seniority_score * 0.55) * 15, 2)

        responsibility_ratio = self.partial_overlap_ratio(
            requirements["responsibility_keywords"],
            f"{profile.experience_text} {profile.resume_text}".lower(),
        )
        years_required = requirements["years_required"]
        years_have = self.infer_years_from_resume(profile)
        years_ratio = 1.0
        if years_required:
            years_ratio = min(years_have / years_required, 1.0)
        experience_relevance_score = round((responsibility_ratio * 0.6 + years_ratio * 0.4) * 25, 2)

        degree_required = requirements["degree_required"]
        resume_degree = self.detect_resume_degree(profile)
        education_ratio = 1.0
        if degree_required:
            if resume_degree == degree_required:
                education_ratio = 1.0
            elif resume_degree:
                degree_rank = {"bachelors": 1, "masters": 2, "phd": 3}
                education_ratio = 0.8 if degree_rank.get(resume_degree, 0) > degree_rank.get(degree_required, 0) else 0.0
            else:
                education_ratio = 0.0
        education_certs_score = round(education_ratio * 10, 2)

        domain_ratio = self.partial_overlap_ratio(
            requirements["responsibility_keywords"],
            " ".join(profile.skills + profile.experience_titles).lower(),
        )
        keyword_domain_score = round(domain_ratio * 10, 2)

        penalties = 0.0
        if missing_required:
            penalties += min(len(missing_required) * 1.5, 5.0)
        if len(profile.skills) < 3:
            penalties += 1.0
        if not re.search(r"\d", profile.resume_text):
            penalties += 1.0
        penalties = round(min(penalties, 5.0), 2)

        total_score = round(
            hard_skills_score
            + experience_relevance_score
            + title_seniority_score
            + education_certs_score
            + keyword_domain_score
            - penalties,
            2,
        )
        total_score = max(0.0, min(100.0, total_score))

        reasoning: list[str] = []
        if matched_required:
            reasoning.append(
                f"Matched {len(matched_required)} required skills: {', '.join(matched_required[:4])}."
            )
        if missing_required:
            reasoning.append(
                f"Missing required skills: {', '.join(missing_required[:4])}."
            )
        if years_required:
            reasoning.append(
                f"Role asks for about {years_required}+ years; inferred resume experience is {years_have} years."
            )
        if job_seniority:
            reasoning.append(
                f"Job seniority target is {job_seniority}; resume appears {resume_seniority or 'unspecified'}."
            )

        evidence_points = len(required_skills) + len(preferred_skills) + len(requirements["responsibility_keywords"])
        confidence = "high" if evidence_points >= 10 else "medium" if evidence_points >= 5 else "low"

        return {
            "ats_score": total_score,
            "ats_details": {
                "category_scores": {
                    "hard_skills": hard_skills_score,
                    "experience_relevance": experience_relevance_score,
                    "title_seniority": title_seniority_score,
                    "education_certs": education_certs_score,
                    "keywords_domain": keyword_domain_score,
                    "penalties": -penalties,
                },
                "matched": {
                    "required_skills": matched_required,
                    "preferred_skills": matched_preferred,
                },
                "missing": {
                    "required_skills": missing_required,
                    "preferred_skills": missing_preferred,
                },
                "reasoning": reasoning,
                "confidence": confidence,
                "job_requirements": {
                    "required_skills": sorted(required_skills),
                    "preferred_skills": sorted(preferred_skills),
                    "seniority": job_seniority,
                    "years_required": years_required,
                    "degree_required": degree_required,
                },
            },
        }


# Global service instance
ats_service = ATSScoringService()
