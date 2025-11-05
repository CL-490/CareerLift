"use client";

import React from "react";
import Link from "next/link";

type Person = {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
};

type GraphData = {
  person: Person;
  skills: string[];
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
};

type LastResume = {
  filename: string;
  text_length: number;
  graph_data: GraphData;
  storedAt: number; // epoch ms
};

function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentResumeCard() {
  const [resume, setResume] = React.useState<LastResume | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("careerlift:lastResume");
      if (!raw) return;
      const parsed: LastResume = JSON.parse(raw);
      // Basic validation
      if (parsed && parsed.graph_data && parsed.graph_data.person) {
        setResume(parsed);
      }
    } catch (_) {
      // ignore parse errors
    }
  }, []);

  if (!resume) {
    return (
      <div className="card hover-ring flex flex-col">
        <h2 className="card-header mb-3">Resume</h2>
        <p className="text-[13px] leading-5 text-muted">
          You haven’t uploaded a resume yet.
        </p>
        <div className="mt-auto pt-4">
          <Link
            href="/resume-lab"
            className="nav-item nav-item-active !px-4 !py-2 rounded-md border text-sm inline-flex"
          >
            Go to Resume Lab
          </Link>
        </div>
      </div>
    );
  }

  const { graph_data, filename, storedAt } = resume;
  const skillsCount = graph_data.skills?.length ?? 0;
  const expCount = graph_data.experiences?.length ?? 0;
  const eduCount = graph_data.education?.length ?? 0;

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.removeItem("careerlift:lastResume");
    } catch (_) {
      // ignore
    }
    setResume(null);
  };

  return (
    <Link href="/resume-lab" className="card hover-ring flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h2 className="card-header">Resume</h2>
        <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
          Updated {timeAgo(storedAt)}
        </span>
      </div>
      <p className="text-[14px] text-foreground font-medium mb-2">
        {graph_data.person?.name || "Unnamed"}
      </p>
      {graph_data.person?.email && (
        <p className="text-[13px] text-muted mb-4">{graph_data.person.email}</p>
      )}

      {graph_data.person?.summary && (
        <p className="text-[13px] text-[#9aa5b3] leading-relaxed mb-4 truncate" title={graph_data.person.summary}>
          {graph_data.person.summary}
        </p>
      )}

      <div className="grid grid-cols-3 gap-4 text-center mt-2 mb-4">
        <div className="rounded-md bg-[var(--background-alt)]/50 border border-[var(--border-color)] p-3 flex flex-col gap-1">
          <span className="text-[11px] tracking-wide uppercase text-muted">Skills</span>
          <span className="text-lg font-semibold text-foreground">{skillsCount}</span>
        </div>
        <div className="rounded-md bg-[var(--background-alt)]/50 border border-[var(--border-color)] p-3 flex flex-col gap-1">
          <span className="text-[11px] tracking-wide uppercase text-muted">Experience</span>
          <span className="text-lg font-semibold text-foreground">{expCount}</span>
        </div>
        <div className="rounded-md bg-[var(--background-alt)]/50 border border-[var(--border-color)] p-3 flex flex-col gap-1">
          <span className="text-[11px] tracking-wide uppercase text-muted">Education</span>
          <span className="text-lg font-semibold text-foreground">{eduCount}</span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-1">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[12px] text-muted truncate" title={filename}>
            {filename}
          </span>
          <button
            onClick={handleClear}
            className="text-[12px] text-muted hover:text-foreground underline-offset-2 hover:underline"
            title="Clear saved resume"
            type="button"
          >
            Clear
          </button>
        </div>
        <span className="text-[12px] text-accent">Open in Resume Lab →</span>
      </div>
    </Link>
  );
}
