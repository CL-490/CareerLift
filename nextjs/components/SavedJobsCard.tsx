"use client";

import React from "react";
import Link from "next/link";
import { getSavedJobs, type SavedJobInfo } from "@/lib/jobFinderApi";
import { useActiveResume } from "@/hooks/useActiveResume";

function AtsBadge({ score }: { score: number }) {
  const colorClass =
    score >= 70
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : score >= 50
        ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
        : "bg-red-500/15 text-red-400 border-red-500/30";
  return (
    <span
      className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${colorClass}`}
    >
      {Math.round(score)}%
    </span>
  );
}

export default function SavedJobsCard() {
  const activeResume = useActiveResume();
  const activeResumeId = activeResume?.resume_id ?? null;
  const [jobs, setJobs] = React.useState<SavedJobInfo[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeResumeId) {
      setJobs(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getSavedJobs(activeResumeId)
      .then((data) => {
        if (cancelled) return;
        const sorted = [...data.jobs].sort(
          (a, b) => (b.ats_score ?? -1) - (a.ats_score ?? -1),
        );
        setJobs(sorted);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load saved jobs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeResumeId]);

  return (
    <div className="card hover-ring card-tone-cyan flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="card-header">Saved Jobs</h2>
        <Link
          href="/job-finder"
          className="text-xs text-muted hover:text-(--accent) transition-colors"
        >
          Open Job Finder →
        </Link>
      </div>

      {!activeResumeId ? (
        <p className="text-[13px] text-muted">
          Select a resume in the Resume card above to see its saved jobs ranked
          by ATS score.
        </p>
      ) : loading ? (
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-(--accent) border-t-transparent" />
            Scoring saved jobs…
          </div>
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : jobs === null ? null : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted">No saved jobs for this resume yet.</p>
          <Link
            href="/job-finder"
            className="mt-3 text-xs text-(--accent) hover:underline"
          >
            Browse jobs and save some →
          </Link>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-(--border-color) overflow-y-auto max-h-120 styled-scrollbar">
          {jobs.map((job, idx) => (
            <li key={`${job.apply_url}-${idx}`} className="py-3 first:pt-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-snug">
                    {idx + 1}. {job.job_title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {[job.company, job.location].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {typeof job.ats_score === "number" && (
                  <AtsBadge score={job.ats_score} />
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <a
                  href={job.apply_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-(--accent) hover:underline"
                >
                  Apply →
                </a>
                {job.source && (
                  <span className="text-xs text-muted capitalize">{job.source}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
