import type { ResumeData } from "../types/resume";

interface GraphData {
  person: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
  };
  skills: Array<string | { name?: string }>;
  experiences: Array<{
    title: string;
    company: string;
    duration?: string;
    description?: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year?: string;
  }>;
}

export function asString(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    return (
      (obj.name as string) ||
      (obj.label as string) ||
      (obj.title as string) ||
      JSON.stringify(val)
    );
  }
  return String(val);
}

export function graphDataToResumeData(graphData: GraphData): ResumeData {
  const nameParts = (graphData.person.name || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");

  return {
    person: {
      first_name: firstName,
      last_name: lastName,
      email: graphData.person.email || "",
      phone: graphData.person.phone || "",
      location: graphData.person.location || "",
      website: "",
      website_display: "",
      linkedin: "",
      github: "",
      tagline: "",
      profile: graphData.person.summary || "",
      nationality: "",
    },
    education: (graphData.education || []).map((edu) => ({
      degree: asString(edu.degree),
      institution: asString(edu.institution),
      dates: asString(edu.year),
      location: "",
      gpa: "",
      details: [],
    })),
    experiences: (graphData.experiences || []).map((exp) => ({
      title: asString(exp.title),
      company: asString(exp.company),
      dates: asString(exp.duration),
      location: "",
      keywords: "",
      bullets: exp.description ? [asString(exp.description)] : [],
    })),
    skills: {
      categories: [],
      flat: (graphData.skills || []).map((s) => asString(s)).filter(Boolean),
    },
    projects: [],
    awards: [],
    leadership: [],
    certifications: [],
    languages: [],
    publications: [],
    coursework: { postgraduate: [], undergraduate: [] },
    references: [],
    summary: [],
    miscellaneous: [],
    extracurricular: [],
  };
}

export function createEmptyResumeData(): ResumeData {
  return {
    person: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      website_display: "",
      linkedin: "",
      github: "",
      tagline: "",
      profile: "",
      nationality: "",
    },
    education: [],
    experiences: [],
    skills: { categories: [], flat: [] },
    projects: [],
    awards: [],
    leadership: [],
    certifications: [],
    languages: [],
    publications: [],
    coursework: { postgraduate: [], undergraduate: [] },
    references: [],
    summary: [],
    miscellaneous: [],
    extracurricular: [],
  };
}
