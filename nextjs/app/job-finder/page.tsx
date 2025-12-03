"use client";

import { ReactNode, useEffect, useState, useRef } from "react";

type Resume = {
  resume_id: string;
  resume_name: string;
  person_name: any;
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

type JobsBySource = {
  [source: string]: Job[];
};

type LoadingState = {
  [source: string]: {
    isLoading: boolean;
    progress: number;
  };
};

type SourceLimits = {
  [source: string]: number;
};

const SOURCES = [
  { key: "usajobs", label: "USAJOBS", emoji: "🏛️" },
  { key: "adzuna", label: "Adzuna", emoji: "🔍" },
  { key: "remotive", label: "Remotive", emoji: "🌍" },
  { key: "weworkremotely", label: "WeWorkRemotely", emoji: "💻" }
];

function getApiBase() {
  if (typeof window !== "undefined") {
    const fallback = `${window.location.protocol}//${window.location.hostname}:8000`;
    return process.env.NEXT_PUBLIC_API_BASE || fallback;
  }
  return process.env.NEXT_PUBLIC_API_BASE || "";
}

async function loadJobsBySource(
  source: string,
  limit: number,
  q?: string,
  location?: string
): Promise<Job[]> {
  const qs = new URLSearchParams();
  if (q) qs.set("keyword", q);
  if (location) qs.set("location", location);
  qs.set("limit", limit.toString());

  const base = getApiBase();
  if (!base) return [];
  const res = await fetch(`${base}/jobs/fetch-live/${source}?${qs.toString()}`, { method: "GET" });
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  const data = await res.json();
  return data.jobs || [];
}

async function calculateAtsScores(jobs: Job[], resumeId: string): Promise<Job[]> {
  const base = getApiBase();
  const res = await fetch(`${base}/jobs/calculate-ats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobs, resume_id: resumeId }),
  });
  if (!res.ok) throw new Error(`Failed to calculate ATS: ${res.status}`);
  return res.json();
}

async function refreshJobsFromSource(source: string, limit: number) {
  const base = getApiBase();
  const res = await fetch(`${base}/jobs/refresh?limit_per_source=${limit}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to refresh: ${res.status}`);
  return res.json();
}

async function addJobToGraph(job: Job) {
  const base = getApiBase();
  const res = await fetch(`${base}/jobs/add-to-graph`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  if (!res.ok) throw new Error(`Failed to add job to graph: ${res.status}`);
  return res.json();
}

export default function JobFinderPage() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [jobsBySource, setJobsBySource] = useState<JobsBySource>({});
  const [sourceLimits, setSourceLimits] = useState<SourceLimits>(
    SOURCES.reduce((acc, { key }) => ({ ...acc, [key]: 100 }), {})
  );
  const [hasMoreJobs, setHasMoreJobs] = useState<{ [key: string]: boolean }>(
    SOURCES.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
  );
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({});
  const [calculatingAts, setCalculatingAts] = useState(false);
  const [atsProgress, setAtsProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [availableResumes, setAvailableResumes] = useState<Resume[]>([]);
  const [addedToGraph, setAddedToGraph] = useState<Set<string>>(new Set());
  const [addingToGraph, setAddingToGraph] = useState<Set<string>>(new Set());
  const asString = (val: any) => {
    if (val == null) return "";
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') {
      return val.name || val.label || val.title || JSON.stringify(val);
    }
    return String(val);
  };

  const progressIntervalsRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const clearProgressInterval = (sourceKey: string) => {
    if (progressIntervalsRef.current[sourceKey]) {
      clearInterval(progressIntervalsRef.current[sourceKey]);
      delete progressIntervalsRef.current[sourceKey];
    }
  };

  const clearAllProgressIntervals = () => {
    Object.keys(progressIntervalsRef.current).forEach(clearProgressInterval);
  };

  useEffect(() => {
    return () => clearAllProgressIntervals();
  }, []);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);

    // Initialize loading state for all sources
    const initialLoadingState: LoadingState = {};
    SOURCES.forEach(({ key }) => {
      initialLoadingState[key] = { isLoading: true, progress: 0 };
    });
    setLoadingState(initialLoadingState);

    // Reset hasMoreJobs to true for all sources on new search
    setHasMoreJobs(SOURCES.reduce((acc, { key }) => ({ ...acc, [key]: true }), {}));

    try {
      const results: JobsBySource = {};

      // Load jobs from each source with progress tracking
      for (let i = 0; i < SOURCES.length; i++) {
        const { key } = SOURCES[i];

        // Update progress to show we're working on this source
        setLoadingState(prev => ({
          ...prev,
          [key]: { isLoading: true, progress: 50 }
        }));

        const jobs = await loadJobsBySource(
          key,
          sourceLimits[key],
          q || undefined,
          loc || undefined
        );

        results[key] = jobs;

        // Complete progress for this source
        setLoadingState(prev => ({
          ...prev,
          [key]: { isLoading: false, progress: 100 }
        }));
      }

      setJobsBySource(results);

      // Calculate ATS scores if resume is selected
      if (selectedResume) {
        await calculateAtsForAllJobs(results, selectedResume.resume_id);
      }

      // If no jobs found at all
      const total = Object.values(results).reduce((sum, jobs) => sum + jobs.length, 0);
      if (total === 0) {
        setError("No jobs found from any source. Try adjusting your search filters.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Failed to load jobs");
      setJobsBySource({});
    } finally {
      setLoading(false);
      setLoadingState({});
    }
  };

  const calculateAtsForAllJobs = async (jobsData: JobsBySource, resumeId: string) => {
    setCalculatingAts(true);
    setAtsProgress(0);

    try {
      // Calculate total jobs across all sources
      const totalJobs = Object.values(jobsData).reduce((sum, jobs) => sum + jobs.length, 0);
      if (totalJobs === 0) {
        setCalculatingAts(false);
        return;
      }

      let processedJobs = 0;
      const updatedJobsBySource: JobsBySource = {};

      for (const [source, jobs] of Object.entries(jobsData)) {
        if (jobs.length > 0) {
          const scoredJobs = await calculateAtsScores(jobs, resumeId);
          updatedJobsBySource[source] = scoredJobs;
          processedJobs += jobs.length;
        } else {
          updatedJobsBySource[source] = jobs;
        }

        // Update progress based on actual job count
        const progressPercent = Math.round((processedJobs / totalJobs) * 100);
        setAtsProgress(progressPercent);
      }

      setJobsBySource(updatedJobsBySource);
    } catch (err: any) {
      setError(`Failed to calculate ATS scores: ${err?.message}`);
    } finally {
      setCalculatingAts(false);
      setAtsProgress(0);
    }
  };

  const refreshSource = async (sourceKey: string) => {
    clearProgressInterval(sourceKey);
    setError(null);

    // Reset limit to 100 and mark as having more jobs
    setSourceLimits(prev => ({ ...prev, [sourceKey]: 100 }));
    setHasMoreJobs(prev => ({ ...prev, [sourceKey]: true }));

    setLoadingState(prev => ({
      ...prev,
      [sourceKey]: { isLoading: true, progress: 0 }
    }));

    try {
      // Simulate progress during API call
      let currentProgress = 0;
      progressIntervalsRef.current[sourceKey] = setInterval(() => {
        currentProgress = Math.min(currentProgress + 10, 90);
        setLoadingState(prev => ({
          ...prev,
          [sourceKey]: { isLoading: true, progress: currentProgress }
        }));
      }, 300);

      // Reload jobs for this source with limit of 100
      const jobs = await loadJobsBySource(
        sourceKey,
        100,
        q || undefined,
        loc || undefined
      );

      clearProgressInterval(sourceKey);
      setLoadingState(prev => ({
        ...prev,
        [sourceKey]: { isLoading: true, progress: 95 }
      }));

      // Calculate ATS if resume selected
      let finalJobs = jobs;
      if (selectedResume && jobs.length > 0) {
        finalJobs = await calculateAtsScores(jobs, selectedResume.resume_id);
      }

      setLoadingState(prev => ({
        ...prev,
        [sourceKey]: { isLoading: true, progress: 100 }
      }));

      setJobsBySource(prev => ({ ...prev, [sourceKey]: finalJobs }));
    } catch (err: any) {
      setError(`Failed to refresh ${sourceKey}: ${err?.message}`);
    } finally {
      clearProgressInterval(sourceKey);
      setLoadingState(prev => {
        const newState = { ...prev };
        delete newState[sourceKey];
        return newState;
      });
    }
  };

  const loadMore = async (sourceKey: string) => {
    clearProgressInterval(sourceKey);
    setError(null);

    const currentLimit = sourceLimits[sourceKey];
    const newLimit = Math.min(currentLimit + 100, 1000);

    // If already at max, don't load more
    if (currentLimit >= 1000) {
      return;
    }

    const previousJobCount = jobsBySource[sourceKey]?.length || 0;

    setSourceLimits(prev => ({ ...prev, [sourceKey]: newLimit }));

    setLoadingState(prev => ({
      ...prev,
      [sourceKey]: { isLoading: true, progress: 0 }
    }));

    try {
      // Simulate progress
      let currentProgress = 0;
      progressIntervalsRef.current[sourceKey] = setInterval(() => {
        currentProgress = Math.min(currentProgress + 15, 90);
        setLoadingState(prev => ({
          ...prev,
          [sourceKey]: { isLoading: true, progress: currentProgress }
        }));
      }, 200);

      const jobs = await loadJobsBySource(
        sourceKey,
        newLimit,
        q || undefined,
        loc || undefined
      );

      clearProgressInterval(sourceKey);
      setLoadingState(prev => ({
        ...prev,
        [sourceKey]: { isLoading: true, progress: 95 }
      }));

      // Calculate ATS if resume selected
      let finalJobs = jobs;
      if (selectedResume && jobs.length > 0) {
        finalJobs = await calculateAtsScores(jobs, selectedResume.resume_id);
      }

      setLoadingState(prev => ({
        ...prev,
        [sourceKey]: { isLoading: true, progress: 100 }
      }));

      // Check if we got new jobs - if not, mark as no more available
      if (finalJobs.length <= previousJobCount) {
        setHasMoreJobs(prev => ({ ...prev, [sourceKey]: false }));
      }

      setJobsBySource(prev => ({ ...prev, [sourceKey]: finalJobs }));
    } catch (err: any) {
      setError(`Failed to load more from ${sourceKey}: ${err?.message}`);
    } finally {
      clearProgressInterval(sourceKey);
      setLoadingState(prev => {
        const newState = { ...prev };
        delete newState[sourceKey];
        return newState;
      });
    }
  };

  const handleResumeChange = async (resumeId: string) => {
    const resume = availableResumes.find((r) => r.resume_id === resumeId);
    setSelectedResume(resume || null);

    // Calculate ATS scores for existing jobs
    if (resume && Object.keys(jobsBySource).length > 0) {
      await calculateAtsForAllJobs(jobsBySource, resume.resume_id);
    }
  };

  const handleAddToGraph = async (job: Job) => {
    const jobUrl = job.apply_url || job.source_url || "";
    if (!jobUrl) {
      alert("Job must have an apply URL");
      return;
    }

    setAddingToGraph((prev) => new Set(prev).add(jobUrl));
    try {
      const result = await addJobToGraph(job);
      if (result.success) {
        setAddedToGraph((prev) => new Set(prev).add(jobUrl));
        // If a resume is selected, save this job to that resume too
        if (selectedResume) {
          try {
            const base = getApiBase();
            const res = await fetch(`${base}/api/resume/save-job`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ resume_id: selectedResume.resume_id, job_apply_url: jobUrl, notes: "" }),
            });
              if (res.ok) {
                // Refresh the resume graph for the selected resume and store it in localStorage
                try {
                  const personNameForFetch = typeof selectedResume.person_name === 'string' ? selectedResume.person_name : (selectedResume.person_name?.name || String(selectedResume.person_name));
                  const graphRes = await fetch(`${base}/api/resume/graph/${encodeURIComponent(personNameForFetch)}`);
                if (graphRes.ok) {
                  const graphJson = await graphRes.json();
                  const payload = {
                    filename: selectedResume.resume_name,
                    text_length: 0,
                    graph_data: graphJson,
                    nodes_created: 0,
                    person_name: selectedResume.person_name,
                    resume_name: selectedResume.resume_name,
                    storedAt: Date.now(),
                  };
                  localStorage.setItem("careerlift:lastResume", JSON.stringify(payload));
                  // Trigger an update event for other tabs/components to refresh
                  localStorage.setItem("careerlift:resume-updated", String(Date.now()));
                  window.dispatchEvent(new Event("careerlift:resume-updated"));
                }
              } catch (e) {
                // ignore errors
              }
            }
          } catch (err) {
            // ignore save-job error for now
          }
        }
      } else {
        alert(result.message || "Failed to add job to knowledge graph");
      }
    } catch (err: any) {
      alert(err?.message ?? "Failed to add job to knowledge graph");
    } finally {
      setAddingToGraph((prev) => {
        const next = new Set(prev);
        next.delete(jobUrl);
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

    // Load jobs on initial page load (100 per source by default)
    search();
  }, []);

  const totalJobs = Object.values(jobsBySource).reduce((sum, jobs) => sum + jobs.length, 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-[40px] font-semibold tracking-tight heading-gradient mb-6">
          Job Finder
        </h1>
        <p className="text-sm text-muted">
          Browse job postings from multiple sources with ATS scoring based on your selected resume.
        </p>
      </header>

      <div className="mb-6 rounded-2xl border border-[var(--border-color)] p-4 surface">
        <label className="text-sm font-medium mb-2 block">
          Select Resume <span className="text-xs text-muted font-normal">(optional - for ATS scoring)</span>:
        </label>
        <select
          value={selectedResume?.resume_id ?? ""}
          onChange={(e) => handleResumeChange(e.target.value)}
          className="w-full rounded-2xl border px-4 py-2"
          disabled={calculatingAts}
        >
          <option value="">
            {availableResumes.length === 0
              ? "No resumes uploaded yet"
              : "None (browse all jobs)"}
          </option>
          {availableResumes.map((resume) => (
            <option key={resume.resume_id} value={resume.resume_id}>
              {resume.resume_name} ({asString(resume.person_name)})
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
                👤 {asString(selectedResume.person_name)}
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

        {calculatingAts && (
          <div className="mt-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-purple-300">Calculating ATS Scores...</span>
              <span className="text-sm font-medium text-purple-300">{atsProgress}%</span>
            </div>
            <div className="w-full bg-purple-900/30 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${atsProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={search} className="mb-6 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="nav-item nav-item-active !px-4 !py-2 hover:opacity-80"
            disabled={loading || calculatingAts}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {error}
        </div>
      )}

      {!loading && totalJobs > 0 && (
        <div className="mb-4 text-sm text-muted">
          Found {totalJobs} jobs across {Object.keys(jobsBySource).length} sources
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-sm text-muted mb-4">Loading jobs from all sources...</p>
          <div className="max-w-md mx-auto space-y-2">
            {SOURCES.map(({ key, label }) => {
              const state = loadingState[key];
              const progress = state?.progress || 0;
              return (
                <div key={key} className="text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted">{label}</span>
                    <span className="text-xs font-medium text-blue-400">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {SOURCES.map(({ key, label, emoji }) => {
            const jobs = jobsBySource[key] || [];
            const state = loadingState[key];
            const isSourceLoading = state?.isLoading || false;
            const progress = state?.progress || 0;

            return (
              <div key={key} className="rounded-2xl border border-[var(--border-color)] surface overflow-hidden flex flex-col">
                <div className="p-4 border-b border-[var(--border-color)] bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <span>{emoji}</span>
                      <span>{label}</span>
                    </h2>
                    <span className="text-sm text-muted">
                      {jobs.length} jobs
                    </span>
                  </div>

                  {isSourceLoading && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-purple-300">Loading...</span>
                        <span className="text-xs font-medium text-purple-300">{progress}%</span>
                      </div>
                      <div className="w-full bg-purple-900/30 rounded-full h-1.5">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => refreshSource(key)}
                      disabled={isSourceLoading}
                      className="text-xs px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSourceLoading ? "⏳" : "🔄"} Refresh
                    </button>
                    {jobs.length > 0 && hasMoreJobs[key] && sourceLimits[key] < 1000 && (
                      <button
                        onClick={() => loadMore(key)}
                        disabled={isSourceLoading}
                        className="text-xs px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSourceLoading ? "Loading..." : `Load More (+100)`}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 max-h-[600px] overflow-y-auto">
                  {jobs.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted">
                      <p className="mb-2">No jobs found from {label}</p>
                      <button
                        onClick={() => refreshSource(key)}
                        disabled={isSourceLoading}
                        className="text-xs px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50"
                      >
                        {isSourceLoading ? "Fetching..." : "Fetch Jobs"}
                      </button>
                    </div>
                  ) : (
                    <ul className="divide-y divide-[var(--border-color)]">
                      {jobs.map((j, idx) => {
                        // Use source + index for guaranteed unique key
                        const jobKey = `${key}-${idx}`;
                        const jobUrl = j.apply_url || j.source_url || "";
                        const isAddedToGraph = addedToGraph.has(jobUrl);
                        const isAddingToGraph = addingToGraph.has(jobUrl);

                        return (
                          <li key={jobKey} className="p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="text-sm font-semibold line-clamp-2">{j.title}</h3>
                              {typeof j.ats_score === "number" && (
                                <div
                                  className={`text-xs font-medium px-2 py-1 rounded-lg shrink-0 ${
                                    j.ats_score >= 70
                                      ? "text-green-700 bg-green-100"
                                      : j.ats_score >= 50
                                      ? "text-yellow-700 bg-yellow-100"
                                      : "text-red-700 bg-red-100"
                                  }`}
                                >
                                  {j.ats_score}%
                                </div>
                              )}
                            </div>

                            <div className="text-xs text-muted-strong mb-2">
                              {j.company && <span>{j.company}</span>}
                              {j.company && (j.location || j.employment_type) && <span> • </span>}
                              {j.location && <span>{j.location}</span>}
                              {j.location && j.employment_type && <span> • </span>}
                              {j.employment_type && <span>{j.employment_type}</span>}
                              {typeof j.remote === "boolean" && (
                                <span> • {j.remote ? "Remote" : "On-site"}</span>
                              )}
                            </div>

                            {j.salary_text && (
                              <div className="text-xs text-green-600 mb-2">{j.salary_text}</div>
                            )}

                            <div className="flex gap-2 items-center flex-wrap">
                              {jobUrl && (
                                <a
                                  href={jobUrl}
                                  className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Apply
                                </a>
                              )}
                              <button
                                onClick={() => handleAddToGraph(j)}
                                disabled={isAddingToGraph || isAddedToGraph}
                                className={`text-xs px-2 py-1 rounded-lg ${
                                  isAddedToGraph
                                    ? "bg-green-100 text-green-700 cursor-not-allowed"
                                    : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                                }`}
                              >
                                {isAddingToGraph ? "Adding..." : isAddedToGraph ? "In Graph ✓" : "Save to Knowledge Graph"}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
