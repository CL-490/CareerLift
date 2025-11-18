from __future__ import annotations
import re
from typing import List, Dict
from difflib import SequenceMatcher

class ATSScoringService:

    def extract_keywords(self, text: str) -> List[str]:
        words = re.findall(r"[a-zA-Z0-9\-+.#]+", text.lower())
        return [w for w in words if len(w) > 2]

    def similarity(self, a: str, b: str) -> float:
        return SequenceMatcher(None, a.lower(), b.lower()).ratio()

    def score_resume_to_job(self, resume_skills: List[str], resume_text: str, job: Dict) -> float:
        job_text = " ".join([
            job.get("title", ""),
            job.get("company", ""),
            job.get("location", ""),
            job.get("description", "")
        ]).lower()

        job_keywords = self.extract_keywords(job_text)
        resume_keywords = resume_skills + self.extract_keywords(resume_text)

        matches = 0
        for jk in job_keywords:
            for rk in resume_keywords:
                if rk == jk or self.similarity(rk, jk) > 0.75:
                    matches += 1
                    break

        if not job_keywords:
            return 0

        return round((matches / len(job_keywords)) * 100, 2)

# Global service instance
ats_service = ATSScoringService()
