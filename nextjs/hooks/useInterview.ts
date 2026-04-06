"use client";

import { useEffect, useState, useRef } from "react";
import {
  startInterview,
  submitInterviewAnswer,
  getInterviewSession,
  InterviewResponse,
  SessionSummary,
  InterviewSession,
  InterviewEvaluation,
} from "@/lib/interviewApi";

const STORAGE_KEY = "careerlift:interview";

interface Message {
  question?: string;
  answer?: string;
  evaluation?: InterviewEvaluation;
}

interface PersistedState {
  sessionId?: string;
  resumeId?: string;
  jobApplyUrl?: string;
  resumeName?: string;
  roleLevel?: string;
  messages: Message[];
  summary?: SessionSummary;
}

function loadPersisted(): PersistedState {
  if (typeof window === "undefined") return { messages: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [] };
    return JSON.parse(raw) as PersistedState;
  } catch {
    return { messages: [] };
  }
}

function savePersisted(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useInterview() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string>("");
  const [jobApplyUrl, setJobApplyUrl] = useState<string>("");
  const [resumeName, setResumeName] = useState<string>("");
  const [roleLevel, setRoleLevel] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const p = loadPersisted();
    setSessionId(p.sessionId || null);
    if (p.resumeId) setResumeId(p.resumeId);
    if (p.jobApplyUrl) setJobApplyUrl(p.jobApplyUrl);
    if (p.resumeName) setResumeName(p.resumeName);
    if (p.roleLevel) setRoleLevel(p.roleLevel);
    setMessages(p.messages || []);
    if (p.summary) setSummary(p.summary);
  }, []);

  useEffect(() => {
    savePersisted({
      sessionId: sessionId || undefined,
      resumeId: resumeId || undefined,
      jobApplyUrl: jobApplyUrl || undefined,
      resumeName,
      roleLevel,
      messages,
      summary: summary || undefined,
    });
  }, [sessionId, resumeId, jobApplyUrl, resumeName, roleLevel, messages, summary]);

  const start = async (id: string, name: string, applyUrl: string, level: string) => {
    const resp: InterviewResponse = await startInterview(id, applyUrl, level);
    setSessionId(resp.session_id || null);
    setResumeId(id);
    setJobApplyUrl(applyUrl);
    setResumeName(name);
    setRoleLevel(level);
    const msg: Message = {};
    if (resp.next_question) msg.question = resp.next_question.text;
    setMessages([msg]);
    setSummary(null);
  };

  const answer = async (text: string) => {
    if (!sessionId) return;
    const resp: InterviewResponse = await submitInterviewAnswer(sessionId, text);
    setMessages((prev) => {
      const copies = [...prev];
      copies[copies.length - 1].answer = text;
      if (resp.evaluation) {
        copies[copies.length - 1].evaluation = resp.evaluation;
      }
      if (resp.next_question) {
        copies.push({ question: resp.next_question.text });
      }
      return copies;
    });
    if (resp.session_complete && sessionId) {
      const summaryData = await getInterviewSession(sessionId);
      setSummary(summaryData.summary ?? null);
    }
  };

  const loadSessionData = async (id: string) => {
    const data: InterviewSession = await getInterviewSession(id);
    setSummary(data.summary ?? null);
    setSessionId(id);
    setResumeId(data.resume_id);
    setJobApplyUrl(data.job_apply_url);
  };

  return {
    sessionId,
    resumeId,
    jobApplyUrl,
    resumeName,
    setResumeName,
    roleLevel,
    setRoleLevel,
    messages,
    summary,
    start,
    answer,
    loadSessionData,
  };
}
