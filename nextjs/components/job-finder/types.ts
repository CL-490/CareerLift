export type AtsDetails = {
  category_scores: {
    hard_skills: number;
    experience_relevance: number;
    title_seniority: number;
    education_certs: number;
    keywords_domain: number;
    penalties: number;
  };
  matched: {
    required_skills: string[];
    preferred_skills: string[];
  };
  missing: {
    required_skills: string[];
    preferred_skills: string[];
  };
  reasoning: string[];
  confidence: "low" | "medium" | "high";
  job_requirements: {
    required_skills: string[];
    preferred_skills: string[];
    seniority: string | null;
    years_required: number | null;
    degree_required: string | null;
  };
};

export type Resume = {
  resume_id: string;
  resume_name: string;
  person_name: unknown;
  created_at?: string;
  updated_at?: string;
};

export type Job = {
  ats_score?: number;
  ats_details?: AtsDetails;
  title: string;
  company?: string | null;
  location?: string | null;
  employment_type?: string | null;
  remote?: boolean | null;
  salary_text?: string | null;
  posted_at?: string | null;
  apply_url?: string | null;
  source_url?: string | null;
  description?: string | null;
  source?: string | null;
  source_job_id?: string | null;
};

export type JobsBySource = Record<string, Job[]>;

export type LoadingState = Record<
  string,
  {
    isLoading: boolean;
    progress: number;
  }
>;

export type SourceLoadingState = {
  isLoading: boolean;
  progress: number;
};

export type SourceLimits = Record<string, number>;

export type Notice = {
  type: "error" | "info" | "success";
  message: string;
};

export type SourceDefinition = {
  key: string;
  label: string;
  emoji: string;
};

export const SOURCES: SourceDefinition[] = [
  { key: "usajobs", label: "USAJOBS", emoji: "🏛️" },
  { key: "adzuna", label: "Adzuna", emoji: "🔍" },
  { key: "remotive", label: "Remotive", emoji: "🌍" },
  { key: "weworkremotely", label: "WeWorkRemotely", emoji: "💻" },
];
