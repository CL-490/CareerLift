"""Pydantic schemas for LaTeX resume builder."""

from pydantic import BaseModel
from typing import Optional, List


class PersonData(BaseModel):
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    website: str = ""
    website_display: str = ""
    linkedin: str = ""
    github: str = ""
    tagline: str = ""
    profile: str = ""
    nationality: str = ""


class EducationEntry(BaseModel):
    degree: str = ""
    institution: str = ""
    dates: str = ""
    location: str = ""
    gpa: str = ""
    details: List[str] = []


class ExperienceEntry(BaseModel):
    title: str = ""
    company: str = ""
    dates: str = ""
    location: str = ""
    keywords: str = ""
    bullets: List[str] = []


class SkillCategory(BaseModel):
    name: str = ""
    items: str = ""


class SkillsData(BaseModel):
    categories: List[SkillCategory] = []
    flat: List[str] = []


class ProjectEntry(BaseModel):
    title: str = ""
    context: str = ""
    dates: str = ""
    url: str = ""
    bullets: List[str] = []


class AwardEntry(BaseModel):
    title: str = ""
    description: str = ""


class LeadershipEntry(BaseModel):
    title: str = ""
    organization: str = ""
    dates: str = ""
    bullets: List[str] = []


class CertificationEntry(BaseModel):
    name: str = ""
    institution: str = ""
    url: str = ""


class LanguageEntry(BaseModel):
    name: str = ""
    level: str = ""


class PublicationEntry(BaseModel):
    title: str = ""
    venue: str = ""
    authors: str = ""


class CourseworkData(BaseModel):
    postgraduate: List[str] = []
    undergraduate: List[str] = []


class ReferenceEntry(BaseModel):
    name: str = ""
    role: str = ""
    institution: str = ""
    email: str = ""


class MiscellaneousEntry(BaseModel):
    title: str = ""
    description: str = ""


class ResumeData(BaseModel):
    person: PersonData = PersonData()
    education: List[EducationEntry] = []
    experiences: List[ExperienceEntry] = []
    skills: SkillsData = SkillsData()
    projects: List[ProjectEntry] = []
    awards: List[AwardEntry] = []
    leadership: List[LeadershipEntry] = []
    certifications: List[CertificationEntry] = []
    languages: List[LanguageEntry] = []
    publications: List[PublicationEntry] = []
    coursework: CourseworkData = CourseworkData()
    references: List[ReferenceEntry] = []
    summary: List[str] = []
    miscellaneous: List[MiscellaneousEntry] = []
    extracurricular: List[str] = []


class CompileRequest(BaseModel):
    template_id: str
    resume_data: ResumeData


class TemplateInfo(BaseModel):
    id: str
    name: str
    description: str
    engine: str
    supported_sections: List[str]
