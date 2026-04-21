"use client";

import React from "react";
import Link from "next/link";
import { listResumes } from "@/lib/jobFinderApi";
import type { Resume } from "@/components/job-finder/types";
import ResumeCarousel from "@/components/ResumeCarousel";
import {
  LAST_RESUME_KEY,
  RESUME_UPDATED_EVENT,
  clearStoredResume,
  loadResumeById,
  persistStoredResume,
  type StoredResume,
} from "@/lib/resumeLoader";

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

function readStored(): StoredResume | null {
  try {
    const raw = localStorage.getItem(LAST_RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.graph_data?.person) return parsed as StoredResume;
  } catch {
    /* noop */
  }
  return null;
}

export default function RecentResumeCard() {
  const [resume, setResume] = React.useState<StoredResume | null>(null);
  const [availableResumes, setAvailableResumes] = React.useState<Resume[]>([]);
  const [switchingId, setSwitchingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refreshFromStorage = React.useCallback(() => {
    setResume(readStored());
  }, []);

  React.useEffect(() => {
    refreshFromStorage();

    const onUpdated = () => refreshFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_RESUME_KEY) refreshFromStorage();
    };
    window.addEventListener(RESUME_UPDATED_EVENT, onUpdated as EventListener);
    window.addEventListener("storage", onStorage);

    listResumes()
      .then((list) => {
        setAvailableResumes(list);
        const cached = readStored();
        const stillValid =
          cached &&
          list.some(
            (r) =>
              r.resume_id === cached.resume_id ||
              r.person_name === cached.graph_data.person.name,
          );
        if (!stillValid && cached) {
          clearStoredResume();
          setResume(null);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener(RESUME_UPDATED_EVENT, onUpdated as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshFromStorage]);

  const handleSelect = async (resumeId: string) => {
    if (!resumeId || resumeId === resume?.resume_id) return;
    setSwitchingId(resumeId);
    setError(null);
    try {
      const loaded = await loadResumeById(resumeId, availableResumes);
      persistStoredResume(loaded);
      setResume(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resume");
    } finally {
      setSwitchingId(null);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearStoredResume();
    setResume(null);
  };

  const uploadLink = (
    <Link
      href="/resume-lab?step=upload"
      className="text-[12px] text-accent hover:underline underline-offset-2"
    >
      Upload a new resume →
    </Link>
  );

  // No resume cached yet
  if (!resume) {
    if (availableResumes.length === 0) {
      return (
        <div className="card hover-ring card-tone-plum flex flex-col">
          <h2 className="card-header mb-3">Resume</h2>
          <p className="text-[13px] leading-5 text-muted">
            You haven&rsquo;t uploaded a resume yet.
          </p>
          <div className="mt-auto pt-4 flex items-center gap-4">
            <Link
              href="/resume-lab?step=upload"
              className="nav-item nav-item-active !px-4 !py-2 rounded-md border text-sm inline-flex"
            >
              Go to Resume Lab
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="card hover-ring card-tone-plum flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="card-header">Resume</h2>
          {uploadLink}
        </div>
        <p className="text-[13px] leading-5 text-muted mb-3">
          Pick one of your existing resumes to display, or upload a new one.
        </p>
        <ResumeCarousel
          resumes={availableResumes}
          selectedResumeId={null}
          onSelect={handleSelect}
          size="compact"
          busyResumeId={switchingId}
        />
        {error && (
          <p className="text-[12px] text-red-400 mt-2" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const { graph_data, filename, storedAt } = resume;
  const skillsCount = graph_data.skills?.length ?? 0;
  const expCount = graph_data.experiences?.length ?? 0;
  const eduCount = graph_data.education?.length ?? 0;

  return (
    <div className="card hover-ring card-tone-plum flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <h2 className="card-header">Resume</h2>
        <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
          Updated {timeAgo(storedAt)}
        </span>
      </div>

      {availableResumes.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="form-label text-[11px] uppercase tracking-wider !m-0">
              Active resume
            </span>
            {uploadLink}
          </div>
          <ResumeCarousel
            resumes={availableResumes}
            selectedResumeId={resume.resume_id}
            onSelect={handleSelect}
            size="compact"
            busyResumeId={switchingId}
          />
          {error && (
            <p className="text-[12px] text-red-400 mt-2" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      <Link href="/resume-lab" className="flex flex-col flex-1">
        <p className="text-[14px] text-foreground font-medium mb-2">
          {graph_data.person?.name || "Unnamed"}
        </p>
        {graph_data.person?.email && (
          <p className="text-[13px] text-muted mb-4">{graph_data.person.email}</p>
        )}

        {graph_data.person?.summary && (
          <p
            className="text-[13px] text-[#9aa5b3] leading-relaxed mb-4 truncate"
            title={graph_data.person.summary}
          >
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
    </div>
  );
}
