export interface GraphData {
  person: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
  };
  skills: Array<string>;
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
  saved_jobs?: Array<{
    title?: unknown;
    company?: unknown;
    apply_url?: string;
    description?: unknown;
  }>;
  resumes?: Array<{
    id?: string;
    name?: unknown;
    resume_id?: string;
  }>;
}

export interface UploadResult {
  message: string;
  filename: string;
  text_length: number;
  nodes_created: number;
  graph_data: GraphData;
  person_name?: string;
  resume_name?: string;
  resume_id?: string;
}

export type ResumeLabStepId = "upload" | "edit" | "preview" | "graph";

export interface ResumeLabStep {
  id: ResumeLabStepId;
  label: string;
  description: string;
  enabled: boolean;
  complete: boolean;
}
