import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

import type { TemplateInfo, ResumeData } from "../../types/resume";
import { apiAxios } from "@/lib/apiClient";

interface Props {
  templates: TemplateInfo[];
  selected: string | null;
  onSelect: (id: string) => void;
  hasUploadedFile?: boolean;
  resumeData?: ResumeData | null;
}

const ENGINE_BADGE: Record<string, string> = {
  pdflatex: "pdfLaTeX",
  xelatex: "XeLaTeX",
};

const SAMPLE_RESUME: ResumeData = {
  person: {
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@example.com",
    phone: "(555) 123-4567",
    location: "San Francisco, CA",
    website: "https://janedoe.dev/",
    website_display: "janedoe.dev",
    linkedin: "linkedin.com/in/janedoe",
    github: "github.com/janedoe",
    tagline: "Software Engineer",
    profile: "Experienced software engineer with expertise in full-stack development.",
    nationality: "",
  },
  education: [
    { degree: "B.S. Computer Science", institution: "Stanford University", dates: "2016 - 2020", location: "Stanford, CA", gpa: "3.8", details: ["Dean's List"] },
  ],
  experiences: [
    { title: "Software Engineer", company: "Acme Corp", dates: "2020 - Present", location: "San Francisco, CA", keywords: "React, Python", bullets: ["Built scalable APIs serving 1M+ requests/day", "Led migration from monolith to microservices"] },
  ],
  skills: { categories: [{ name: "Languages", items: "Python, TypeScript, Go" }], flat: ["Python", "TypeScript", "Go", "React", "Docker"] },
  projects: [{ title: "Open Source CLI", context: "Personal", dates: "2023", url: "github.com/janedoe/cli", bullets: ["Built a developer productivity tool with 500+ stars"] }],
  awards: [{ title: "Hackathon Winner", description: "1st place, 2023" }],
  leadership: [],
  certifications: [{ name: "AWS Solutions Architect", institution: "Amazon", url: "" }],
  languages: [{ name: "English", level: "Native" }],
  publications: [],
  coursework: { postgraduate: [], undergraduate: [] },
  references: [],
  summary: [],
  miscellaneous: [],
  extracurricular: [],
};

const API_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/";

export default function TemplateSelector({
  templates,
  selected,
  onSelect,
  hasUploadedFile,
  resumeData,
}: Props) {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errored, setErrored] = useState<Record<string, boolean>>({});
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Use user's resume data if available, otherwise sample data
    const data = resumeData && resumeData.person.first_name ? resumeData : SAMPLE_RESUME;

    templates.forEach((t) => {
      if (fetchedRef.current.has(t.id)) return;
      fetchedRef.current.add(t.id);

      setLoading((prev) => ({ ...prev, [t.id]: true }));

      apiAxios
        .post(
          `${API_URL}/api/latex/compile/preview?dpi=72`,
          { template_id: t.id, resume_data: data },
          { responseType: "blob" },
        )
        .then((res) => {
          const url = URL.createObjectURL(res.data as Blob);
          setPreviews((prev) => ({ ...prev, [t.id]: url }));
        })
        .catch(() => {
          setErrored((prev) => ({ ...prev, [t.id]: true }));
        })
        .finally(() => {
          setLoading((prev) => ({ ...prev, [t.id]: false }));
        });
    });
  }, [templates, resumeData]);

  // Refresh previews when resumeData changes meaningfully
  const prevDataRef = useRef<string>("");
  useEffect(() => {
    if (!resumeData || !resumeData.person.first_name) return;
    const key = JSON.stringify(resumeData.person);
    if (key === prevDataRef.current) return;
    prevDataRef.current = key;

    // Re-fetch all previews with updated data
    fetchedRef.current.clear();
    // Revoke old blob URLs
    Object.values(previews).forEach((url) => URL.revokeObjectURL(url));
    setPreviews({});
    setErrored({});

    templates.forEach((t) => {
      fetchedRef.current.add(t.id);
      setLoading((prev) => ({ ...prev, [t.id]: true }));

      apiAxios
        .post(
          `${API_URL}/api/latex/compile/preview?dpi=72`,
          { template_id: t.id, resume_data: resumeData },
          { responseType: "blob" },
        )
        .then((res) => {
          const url = URL.createObjectURL(res.data as Blob);
          setPreviews((prev) => ({ ...prev, [t.id]: url }));
        })
        .catch(() => {
          setErrored((prev) => ({ ...prev, [t.id]: true }));
        })
        .finally(() => {
          setLoading((prev) => ({ ...prev, [t.id]: false }));
        });
    });
  }, [resumeData, templates]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <div className="card hover-ring lab-surface mb-6">
      <h2 className="text-[20px] font-medium mb-3">Select Template</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 styled-scrollbar">
        {hasUploadedFile && (
          <button
            onClick={() => onSelect("uploaded")}
            className={`flex-shrink-0 w-32 h-44 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-all ${
              selected === "uploaded"
                ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-lg"
                : "border-[var(--border-color)] hover:border-[var(--accent)]"
            }`}
          >
            <svg
              className="w-8 h-8 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-[12px] font-medium text-center px-1">
              Uploaded File
            </span>
          </button>
        )}
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`flex-shrink-0 w-32 h-44 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-all ${
              selected === t.id
                ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-lg"
                : "border-[var(--border-color)] hover:border-[var(--accent)]"
            }`}
          >
           <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded">
              {loading[t.id] ? (
                <div className="h-full w-full animate-pulse rounded bg-[var(--background-alt)]/60" />
              ) : previews[t.id] ? (
                <img
                  src={previews[t.id]}
                  alt={t.name}
                  className="w-full h-full object-cover object-top rounded"
                />
              ) : (
                <div className="flex h-20 w-16 items-center justify-center rounded bg-[var(--background-alt)]/60">
                  <span className="text-[24px] font-bold text-muted">
                    {t.id.replace("template", "")}
                  </span>
                </div>
              )}
            </div>
            <div className="text-center py-1 shrink-0">
              <span className="text-[11px] font-medium block leading-tight">
                {t.name}
              </span>
              <span className="text-[9px] text-muted">
                {ENGINE_BADGE[t.engine] || t.engine}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
