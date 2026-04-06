export type InterviewQuestion = {
  text: string;
  topic?: string | null;
  difficulty?: string | null;
};

export type InterviewEvaluation = {
  score?: number | null;
  feedback?: string | null;
  rubric?: {
    relevance?: number | null;
    clarity?: number | null;
    technical_depth?: number | null;
    evidence?: number | null;
    communication?: number | null;
  };
  strengths?: string[];
  improvements?: string[];
};

export type InterviewResponse = {
  next_question?: InterviewQuestion;
  evaluation?: InterviewEvaluation;
  session_complete: boolean;
  session_id?: string;
};

export type InterviewSession = {
  session_id: string;
  resume_id: string;
  resume_name: string;
  job_apply_url: string;
  job_title?: string | null;
  job_company?: string | null;
  job_requirements?: string[];
  job_responsibilities?: string[];
  role_level: string;
  started_at: string;
  completed_at?: string | null;
  summary?: SessionSummary | null;
};

export type InterviewStep = {
  question: InterviewQuestion;
  answer?: string | null;
  evaluation?: InterviewEvaluation;
  timestamp: string;
};

export type SessionSummary = {
  total_score?: number | null;
  overall_feedback?: string | null;
  steps: InterviewStep[];
};

import { getApiBase } from "./jobFinderApi";

export async function startInterview(
  resumeId: string,
  jobApplyUrl: string,
  roleLevel: string
): Promise<InterviewResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/interview/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume_id: resumeId,
      job_apply_url: jobApplyUrl,
      role_level: roleLevel,
    }),
  });
  if (!res.ok) throw new Error(`Failed to start interview: ${res.status}`);
  return res.json();
}

export async function submitInterviewAnswer(
  sessionId: string,
  answer: string
): Promise<InterviewResponse> {
  const base = getApiBase();
  const url = new URL(`${base}/api/interview/respond`);
  url.searchParams.set("session_id", sessionId);
  url.searchParams.set("answer", answer);

  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) throw new Error(`Failed to submit answer: ${res.status}`);
  return res.json();
}

export async function getInterviewSession(sessionId: string): Promise<InterviewSession> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/interview/session/${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`Failed to fetch session: ${res.status}`);
  return res.json();
}
