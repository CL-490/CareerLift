"use client";

import { ReactNode, useEffect, useState } from "react";

type Job = {
  ats_score: ReactNode;
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

async function loadJobsWithATS(personName: string): Promise<Job[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/resume/score/${personName}`);
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  const data = await res.json();
  return data.jobs || [];
}

/*async function loadJobs(q?: string, location?: string): Promise<Job[]> {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (location) qs.set("location", location);
  const base = getApiBase();
  if (!base) return [];
  const res = await fetch(`${base}/jobs?${qs.toString()}`, { method: "GET" });
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  return res.json();
}*/

export default function JobFinderPage() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [personName, setPersonName] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableResumes, setAvailableResumes] = useState<string[]>([]);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!personName) {
        setError("No resume selected");
        setJobs([]);
        return;
      }
      const data = await loadJobsWithATS(personName);
      setJobs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  if (personName) search();
  const fetchResumes = async () => {
    const base = getApiBase();
    const res = await fetch(`${base}/api/resume/list`);
    const data = await res.json();
    setAvailableResumes(data.resumes || []);
  };
  fetchResumes();
}, [personName]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-[40px] font-semibold tracking-tight heading-gradient mb-6">Job Finder</h1>
        <p className="text-sm text-muted">
          Search your ingested postings (backend: <code>/jobs</code>).
        </p>
      </header>

      <div className="mb-4">
        <label className="text-sm font-medium mr-2">Select Resume:</label>
        <select
          value={personName ?? ""}
          onChange={(e) => setPersonName(e.target.value)}
          className="rounded-2xl border px-3 py-2"
        >
          <option value="" disabled>
            -- Choose Resume -- 
          </option>
          {availableResumes.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>


      <form onSubmit={search} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <button
          type="submit"
          className="nav-item nav-item-active !px-4 !py-2 hover:opacity-80"
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-2xl border border-[var(--border-color)] border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {jobs.length === 0 && !loading ? (
        <div className="rounded-2xl border border-[var(--border-color)] px-6 py-8 text-center surface">
          <p className="mb-2 font-medium">No results yet.</p>
          <p className="text-sm text-muted">
            Try different keywords—or populate via <code>POST /jobs/ingest</code>.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {jobs.map((j, idx) => {
            const key = j.apply_url || j.source_url || String(idx);
            return (
              <li key={key} className="rounded-2xl border border-[var(--border-color)] p-5 card-3d panel-tinted">
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
                  {typeof j.remote === "boolean" && <span> • {j.remote ? "Remote" : "On-site"}</span>}
                </div>

                {j.description && (
                  <p className="mt-3 text-sm text-foreground">
                    {j.description.length > 300 ? j.description.slice(0, 300) + "…" : j.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex gap-3">
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
                    {j.source_url && (
                      <a
                        href={j.source_url}
                        className="nav-item !px-3 !py-1 text-sm"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Source
                      </a>
                    )}
                  </div>
                  {typeof j.ats_score === "number" && (
                  <div className="text-sm font-medium text-green-700 bg-green-100 px-3 py-1 rounded-xl">
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
