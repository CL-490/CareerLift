"use client";

import { ReactNode, useEffect, useState } from "react";

type Resume = {
  resume_id: string;
  resume_name: string;
  person_name: string;
  created_at?: string;
  updated_at?: string;
};

type Job = {
  ats_score?: number;
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
};

// NOTE: We read NEXT_PUBLIC_API_BASE if present, otherwise fall back to http://<host>:8000.
// This keeps things working in Docker or local dev without separate .env files.
function getApiBase() {
  if (typeof window !== "undefined") {
    const fallback = `${window.location.protocol}//${window.location.hostname}:8000`;
    return process.env.NEXT_PUBLIC_API_BASE || fallback;
  }
  return process.env.NEXT_PUBLIC_API_BASE || "";
}

async function loadJobs(
  q?: string,
  location?: string,
  resumeId?: string,
  remoteOnly?: boolean,
  source?: string
): Promise<Job[]> {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (location) qs.set("location", location);
  if (resumeId) qs.set("resume_id", resumeId);
  if (remoteOnly) qs.set("remote_only", "true");
  if (source) qs.set("source", source);

  const base = getApiBase();
  if (!base) return [];
  const res = await fetch(`${base}/jobs?${qs.toString()}`, { method: "GET" });
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  return res.json();
}

async function saveJobToResume(resumeId: string, jobApplyUrl: string, notes?: string) {
  const base = getApiBase();
  const res = await fetch(`${base}/api/resume/save-job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume_id: resumeId,
      job_apply_url: jobApplyUrl,
      notes: notes || "",
    }),
  });
  if (!res.ok) throw new Error(`Failed to save job: ${res.status}`);
  return res.json();
}

export default function JobFinderPage() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [source, setSource] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableResumes, setAvailableResumes] = useState<Resume[]>([]);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [savingJobs, setSavingJobs] = useState<Set<string>>(new Set());

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await loadJobs(
        q || undefined,
        loc || undefined,
        selectedResume?.resume_id,
        remoteOnly,
        source || undefined
      );
      setJobs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJob = async (jobApplyUrl: string) => {
    if (!selectedResume) {
      alert("Please select a resume first");
      return;
    }

    setSavingJobs((prev) => new Set(prev).add(jobApplyUrl));
    try {
      await saveJobToResume(selectedResume.resume_id, jobApplyUrl);
      setSavedJobs((prev) => new Set(prev).add(jobApplyUrl));
      alert("Job saved successfully!");
    } catch (err: any) {
      alert(err?.message ?? "Failed to save job");
    } finally {
      setSavingJobs((prev) => {
        const next = new Set(prev);
        next.delete(jobApplyUrl);
        return next;
      });
    }
  };

  useEffect(() => {
    const fetchResumes = async () => {
      const base = getApiBase();
      const res = await fetch(`${base}/api/resume/list`);
      const data = await res.json();
      setAvailableResumes(data.resumes || []);
    };
    fetchResumes();

    // Load jobs on initial page load
    search();
  }, []);

  useEffect(() => {
    if (selectedResume) {
      search();
    }
  }, [selectedResume]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-[40px] font-semibold tracking-tight heading-gradient mb-6">
          Job Finder
        </h1>
        <p className="text-sm text-muted">
          Search job postings with ATS scoring based on your selected resume.
        </p>
      </header>

      <div className="mb-6 rounded-2xl border border-[var(--border-color)] p-4 surface">
        <label className="text-sm font-medium mb-2 block">
          Select Resume <span className="text-xs text-muted font-normal">(optional - for ATS scoring)</span>:
        </label>
        <select
          value={selectedResume?.resume_id ?? ""}
          onChange={(e) => {
            const resume = availableResumes.find((r) => r.resume_id === e.target.value);
            setSelectedResume(resume || null);
          }}
          className="w-full rounded-2xl border px-4 py-2"
        >
          <option value="">
            {availableResumes.length === 0
              ? "No resumes uploaded yet"
              : "None (browse all jobs)"}
          </option>
          {availableResumes.map((resume) => (
            <option key={resume.resume_id} value={resume.resume_id}>
              {resume.resume_name} ({resume.person_name})
            </option>
          ))}
        </select>
        {selectedResume ? (
          <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm font-medium text-blue-300 mb-1">
              Selected Resume: <strong>{selectedResume.resume_name}</strong>
            </p>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span>
                👤 {selectedResume.person_name}
              </span>
              {selectedResume.created_at && (
                <span>
                  📅 Added: {new Date(selectedResume.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Select a resume to see ATS scores for each job posting
          </p>
        )}
      </div>

      <form onSubmit={search} className="mb-6 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Role or keyword (e.g., frontend, ML)"
            className="w-full rounded-2xl border border-[var(--border-color)] px-4 py-2 outline-none hover:opacity-80"
          />
          <input
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            placeholder="Location (e.g., Remote, NYC)"
            className="w-full rounded-2xl border border-[var(--border-color)] px-4 py-2 outline-none hover:opacity-80"
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full rounded-2xl border border-[var(--border-color)] px-4 py-2 outline-none hover:opacity-80"
          >
            <option value="">All Sources</option>
            <option value="usajobs">USAJOBS (Federal)</option>
            <option value="adzuna">Adzuna</option>
            <option value="remotive">Remotive (Remote)</option>
            <option value="weworkremotely">WeWorkRemotely</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 px-2">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
            />
            <span className="text-sm">Remote only</span>
          </label>
          <button
            type="submit"
            className="nav-item nav-item-active !px-4 !py-2 hover:opacity-80"
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {jobs.length === 0 && !loading ? (
        <div className="rounded-2xl border border-[var(--border-color)] px-6 py-8 text-center surface">
          <p className="mb-2 font-medium">No job postings found.</p>
          <p className="text-sm text-muted mb-4">
            {selectedResume
              ? "Try different keywords or filters."
              : "Please select a resume to enable ATS scoring."}
          </p>
          <p className="text-xs text-muted">
            Need jobs? Visit the{" "}
            <a href="/admin/ingest-jobs" className="text-blue-600 hover:underline">
              Admin Panel
            </a>{" "}
            to fetch job postings from USAJOBS, Adzuna, Remotive, and WeWorkRemotely.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {jobs.map((j, idx) => {
            const key = j.apply_url || j.source_url || String(idx);
            const isSaved = savedJobs.has(j.apply_url || "");
            const isSaving = savingJobs.has(j.apply_url || "");

            return (
              <li
                key={key}
                className="rounded-2xl border border-[var(--border-color)] p-5 card-3d panel-tinted"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h2 className="text-lg font-semibold">{j.title}</h2>
                  {j.salary_text ? (
                    <span className="text-sm text-muted-strong">{j.salary_text}</span>
                  ) : null}
                </div>

                <div className="mt-1 text-sm text-muted-strong">
                  {j.company && <span>{j.company}</span>}
                  {j.company && (j.location || j.employment_type) && <span> • </span>}
                  {j.location && <span>{j.location}</span>}
                  {j.location && j.employment_type && <span> • </span>}
                  {j.employment_type && <span>{j.employment_type}</span>}
                  {typeof j.remote === "boolean" && (
                    <span> • {j.remote ? "Remote" : "On-site"}</span>
                  )}
                  {j.source && <span> • Source: {j.source}</span>}
                </div>

                {j.description && (
                  <p className="mt-3 text-sm text-foreground line-clamp-3">
                    {j.description.length > 300
                      ? j.description.slice(0, 300) + "…"
                      : j.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex gap-3 items-center">
                    {j.apply_url && (
                      <a
                        href={j.apply_url}
                        className="nav-item !px-3 !py-1 text-sm"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Apply
                      </a>
                    )}
                    {j.source_url && j.source_url !== j.apply_url && (
                      <a
                        href={j.source_url}
                        className="nav-item !px-3 !py-1 text-sm"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Source
                      </a>
                    )}
                    {selectedResume && j.apply_url && (
                      <button
                        onClick={() => handleSaveJob(j.apply_url!)}
                        disabled={isSaving || isSaved}
                        className={`nav-item !px-3 !py-1 text-sm ${
                          isSaved
                            ? "!bg-green-100 !text-green-700 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isSaving ? "Saving..." : isSaved ? "Saved ✓" : "Save Job"}
                      </button>
                    )}
                  </div>
                  {typeof j.ats_score === "number" && (
                    <div
                      className={`text-sm font-medium px-3 py-1 rounded-xl ${
                        j.ats_score >= 70
                          ? "text-green-700 bg-green-100"
                          : j.ats_score >= 50
                          ? "text-yellow-700 bg-yellow-100"
                          : "text-red-700 bg-red-100"
                      }`}
                    >
                      ATS Score: {j.ats_score}%
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
