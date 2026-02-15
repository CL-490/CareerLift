export interface PersonData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  website_display: string;
  linkedin: string;
  github: string;
  tagline: string;
  profile: string;
  nationality: string;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  dates: string;
  location: string;
  gpa: string;
  details: string[];
}

export interface ExperienceEntry {
  title: string;
  company: string;
  dates: string;
  location: string;
  keywords: string;
  bullets: string[];
}

export interface SkillCategory {
  name: string;
  items: string;
}

export interface SkillsData {
  categories: SkillCategory[];
  flat: string[];
}

export interface ProjectEntry {
  title: string;
  context: string;
  dates: string;
  url: string;
  bullets: string[];
}

export interface AwardEntry {
  title: string;
  description: string;
}

export interface LeadershipEntry {
  title: string;
  organization: string;
  dates: string;
  bullets: string[];
}

export interface CertificationEntry {
  name: string;
  institution: string;
  url: string;
}

export interface LanguageEntry {
  name: string;
  level: string;
}

export interface PublicationEntry {
  title: string;
  venue: string;
  authors: string;
}

export interface CourseworkData {
  postgraduate: string[];
  undergraduate: string[];
}

export interface ReferenceEntry {
  name: string;
  role: string;
  institution: string;
  email: string;
}

export interface MiscellaneousEntry {
  title: string;
  description: string;
}

export interface ResumeData {
  person: PersonData;
  education: EducationEntry[];
  experiences: ExperienceEntry[];
  skills: SkillsData;
  projects: ProjectEntry[];
  awards: AwardEntry[];
  leadership: LeadershipEntry[];
  certifications: CertificationEntry[];
  languages: LanguageEntry[];
  publications: PublicationEntry[];
  coursework: CourseworkData;
  references: ReferenceEntry[];
  summary: string[];
  miscellaneous: MiscellaneousEntry[];
  extracurricular: string[];
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  engine: string;
  supported_sections: string[];
}
