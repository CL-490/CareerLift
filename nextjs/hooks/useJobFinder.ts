"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import type {
  Job,
  JobsBySource,
  LoadingState,
  Notice,
  Resume,
  SourceLimits,
} from "@/components/job-finder/types";
import { SOURCES } from "@/components/job-finder/types";
import {
  addJobToGraph,
  calculateAtsScores,
  deleteResume,
  fetchResumeGraph,
  listResumes,
  loadJobsBySource,
  removeJobFromResume,
  saveJobToResume,
} from "@/lib/jobFinderApi";

const JF_STORAGE_KEY = "careerlift:jobfinder";

interface PersistedJobFinderState {
  q: string;
  loc: string;
  selectedResumeId: string | null;
  jobsBySource: JobsBySource;
  /** Saved-to-graph job URLs keyed by resume_id (empty string = no resume selected). */
  addedToGraphByResume: Record<string, string[]>;
  sourceLimits: SourceLimits;
  hasMoreJobs: Record<string, boolean>;
}

function loadPersistedJobFinderState(): PersistedJobFinderState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(JF_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedJobFinderState;
  } catch {
    return null;
  }
}

function savePersistedJobFinderState(state: PersistedJobFinderState): void {
  try {
    localStorage.setItem(JF_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota or serialization errors
  }
}

function stripAtsScores(jobsData: JobsBySource): JobsBySource {
  const next: JobsBySource = {};
  for (const [source, jobs] of Object.entries(jobsData)) {
    next[source] = jobs.map(({ ats_score, ats_details, ...rest }) => rest);
  }
  return next;
}

export function useJobFinder() {
  // Load persisted state once during initialisation
  const [initialState] = useState<PersistedJobFinderState | null>(
    () => loadPersistedJobFinderState()
  );

  const [q, setQ] = useState(initialState?.q ?? "");
  const [loc, setLoc] = useState(initialState?.loc ?? "");
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [jobsBySource, setJobsBySource] = useState<JobsBySource>(
    initialState?.jobsBySource ?? {}
  );
  const [sourceLimits, setSourceLimits] = useState<SourceLimits>(
    initialState?.sourceLimits ??
      SOURCES.reduce((acc, { key }) => ({ ...acc, [key]: 100 }), {})
  );
  const [hasMoreJobs, setHasMoreJobs] = useState<Record<string, boolean>>(
    initialState?.hasMoreJobs ??
      SOURCES.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
  );
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({});
  const [scoringJobs, setScoringJobs] = useState<Set<string>>(new Set());
  const [availableResumes, setAvailableResumes] = useState<Resume[]>([]);
  // Saved-to-graph URLs stored per resume_id ("" = no resume selected).
  const [addedToGraphByResume, setAddedToGraphByResume] = useState<Record<string, string[]>>(
    initialState?.addedToGraphByResume ?? {}
  );
  const [addingToGraph, setAddingToGraph] = useState<Set<string>>(new Set());
  const [removingFromGraph, setRemovingFromGraph] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<Notice | null>(null);

  // Derived: only jobs saved under the currently selected resume appear as "In Graph".
  const addedToGraph = new Set<string>(
    addedToGraphByResume[selectedResume?.resume_id ?? ""] ?? []
  );

  // Remember which resume was selected so we can restore it once the resume
  // list has been fetched.
  const persistedResumeIdRef = useRef<string | null>(
    initialState?.selectedResumeId ?? null
  );

  const progressIntervalsRef = useRef<
    Record<string, ReturnType<typeof setInterval>>
  >({});

  const clearProgressInterval = (sourceKey: string) => {
    if (progressIntervalsRef.current[sourceKey]) {
      clearInterval(progressIntervalsRef.current[sourceKey]);
      delete progressIntervalsRef.current[sourceKey];
    }
  };

  const clearAllProgressIntervals = () => {
    Object.keys(progressIntervalsRef.current).forEach(clearProgressInterval);
  };

  useEffect(() => () => clearAllProgressIntervals(), []);

  const dismissNotice = () => setNotice(null);

  const search = async (e?: FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setNotice(null);

    const initialLoadingState: LoadingState = {};
    SOURCES.forEach(({ key }) => {
      initialLoadingState[key] = { isLoading: true, progress: 0 };
    });
    setLoadingState(initialLoadingState);
    setHasMoreJobs(SOURCES.reduce((acc, { key }) => ({ ...acc, [key]: true }), {}));

    try {
      const results: JobsBySource = {};

      for (const { key } of SOURCES) {
        setLoadingState((prev) => ({
          ...prev,
          [key]: { isLoading: true, progress: 50 },
        }));

        const jobs = await loadJobsBySource(
          key,
          sourceLimits[key],
          q || undefined,
          loc || undefined
        );

        results[key] = jobs;

        setLoadingState((prev) => ({
          ...prev,
          [key]: { isLoading: false, progress: 100 },
        }));
      }

      setJobsBySource(results);

      const total = Object.values(results).reduce((sum, jobs) => sum + jobs.length, 0);
      if (total === 0) {
        setNotice({
          type: "info",
          message: "No jobs found from any source. Try adjusting your search filters.",
        });
      }
    } catch (err: unknown) {
      setJobsBySource({});
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load jobs",
      });
    } finally {
      setLoading(false);
      setLoadingState({});
    }
  };

  const calculateAtsForSingleJob = async (sourceKey: string, jobIndex: number) => {
    if (!selectedResume) {
      setNotice({
        type: "info",
        message: "Select a resume before calculating ATS scores.",
      });
      return;
    }

    const job = jobsBySource[sourceKey]?.[jobIndex];
    if (!job) return;

    const scoreKey = `${sourceKey}-${jobIndex}`;
    setScoringJobs((prev) => new Set(prev).add(scoreKey));

    try {
      const scoredJobs = await calculateAtsScores([job], selectedResume.resume_id);
      const scoredJob = scoredJobs[0];
      if (!scoredJob) return;

      setJobsBySource((prev) => {
        const sourceJobs = [...(prev[sourceKey] || [])];
        if (!sourceJobs[jobIndex]) return prev;
        sourceJobs[jobIndex] = scoredJob;
        return { ...prev, [sourceKey]: sourceJobs };
      });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to calculate ATS score",
      });
    } finally {
      setScoringJobs((prev) => {
        const next = new Set(prev);
        next.delete(scoreKey);
        return next;
      });
    }
  };

  const refreshSource = async (sourceKey: string) => {
    clearProgressInterval(sourceKey);
    setNotice(null);
    setSourceLimits((prev) => ({ ...prev, [sourceKey]: 100 }));
    setHasMoreJobs((prev) => ({ ...prev, [sourceKey]: true }));
    setLoadingState((prev) => ({
      ...prev,
      [sourceKey]: { isLoading: true, progress: 0 },
    }));

    try {
      let currentProgress = 0;
      progressIntervalsRef.current[sourceKey] = setInterval(() => {
        currentProgress = Math.min(currentProgress + 10, 90);
        setLoadingState((prev) => ({
          ...prev,
          [sourceKey]: { isLoading: true, progress: currentProgress },
        }));
      }, 300);

      const jobs = await loadJobsBySource(
        sourceKey,
        100,
        q || undefined,
        loc || undefined
      );

      clearProgressInterval(sourceKey);
      setLoadingState((prev) => ({
        ...prev,
        [sourceKey]: { isLoading: true, progress: 100 },
      }));
      setJobsBySource((prev) => ({ ...prev, [sourceKey]: jobs }));
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? `Failed to refresh ${sourceKey}: ${err.message}`
            : `Failed to refresh ${sourceKey}`,
      });
    } finally {
      clearProgressInterval(sourceKey);
      setLoadingState((prev) => {
        const newState = { ...prev };
        delete newState[sourceKey];
        return newState;
      });
    }
  };

  const loadMore = async (sourceKey: string) => {
    clearProgressInterval(sourceKey);
    setNotice(null);

    const currentLimit = sourceLimits[sourceKey];
    const newLimit = Math.min(currentLimit + 100, 1000);
    if (currentLimit >= 1000) return;

    const previousJobCount = jobsBySource[sourceKey]?.length || 0;

    setSourceLimits((prev) => ({ ...prev, [sourceKey]: newLimit }));
    setLoadingState((prev) => ({
      ...prev,
      [sourceKey]: { isLoading: true, progress: 0 },
    }));

    try {
      let currentProgress = 0;
      progressIntervalsRef.current[sourceKey] = setInterval(() => {
        currentProgress = Math.min(currentProgress + 15, 90);
        setLoadingState((prev) => ({
          ...prev,
          [sourceKey]: { isLoading: true, progress: currentProgress },
        }));
      }, 200);

      const jobs = await loadJobsBySource(
        sourceKey,
        newLimit,
        q || undefined,
        loc || undefined
      );

      clearProgressInterval(sourceKey);
      setLoadingState((prev) => ({
        ...prev,
        [sourceKey]: { isLoading: true, progress: 100 },
      }));

      if (jobs.length <= previousJobCount) {
        setHasMoreJobs((prev) => ({ ...prev, [sourceKey]: false }));
      }

      setJobsBySource((prev) => ({ ...prev, [sourceKey]: jobs }));
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? `Failed to load more from ${sourceKey}: ${err.message}`
            : `Failed to load more from ${sourceKey}`,
      });
    } finally {
      clearProgressInterval(sourceKey);
      setLoadingState((prev) => {
        const newState = { ...prev };
        delete newState[sourceKey];
        return newState;
      });
    }
  };

  const handleResumeChange = (resumeId: string) => {
    const resume = availableResumes.find((item) => item.resume_id === resumeId);
    setSelectedResume(resume || null);
    setJobsBySource((prev) => stripAtsScores(prev));
  };

  const handleResumeDelete = async (resumeId: string) => {
    try {
      await deleteResume(resumeId);
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to remove resume",
      });
      return;
    }
    // Deselect if the deleted resume was selected, and remove it from the list.
    setSelectedResume((prev) =>
      prev?.resume_id === resumeId ? null : prev
    );
    setAvailableResumes((prev) =>
      prev.filter((r) => r.resume_id !== resumeId)
    );
    // Clear saved-to-graph entries for the deleted resume.
    setAddedToGraphByResume((prev) => {
      const next = { ...prev };
      delete next[resumeId];
      return next;
    });
    setNotice({ type: "success", message: "Resume removed." });
  };

  const handleDeleteAllResumes = async () => {
    const ids = availableResumes.map((r) => r.resume_id);
    const errors: string[] = [];
    for (const id of ids) {
      try {
        await deleteResume(id);
      } catch (err: unknown) {
        errors.push(err instanceof Error ? err.message : id);
      }
    }
    setSelectedResume(null);
    setAvailableResumes([]);
    setAddedToGraphByResume({});
    if (errors.length > 0) {
      setNotice({ type: "error", message: `Some resumes could not be removed: ${errors.join(", ")}` });
    } else {
      setNotice({ type: "success", message: "All resumes removed." });
    }
  };

  const handleUnsaveJob = async (job: Job) => {
    const jobUrl = job.apply_url || job.source_url || "";
    if (!jobUrl) return;
    const key = selectedResume?.resume_id ?? "";
    setRemovingFromGraph((prev) => new Set(prev).add(jobUrl));
    try {
      if (selectedResume) {
        await removeJobFromResume(selectedResume.resume_id, jobUrl);
      }
      setAddedToGraphByResume((prev) => ({
        ...prev,
        [key]: (prev[key] ?? []).filter((u) => u !== jobUrl),
      }));
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to unsave job",
      });
    } finally {
      setRemovingFromGraph((prev) => {
        const next = new Set(prev);
        next.delete(jobUrl);
        return next;
      });
    }
  };

  const handleUnsaveAllInSource = async (sourceKey: string) => {
    const key = selectedResume?.resume_id ?? "";
    const savedUrls = new Set(addedToGraphByResume[key] ?? []);
    const toUnsave = (jobsBySource[sourceKey] ?? [])
      .map((j) => j.apply_url || j.source_url || "")
      .filter((url) => url && savedUrls.has(url));
    if (toUnsave.length === 0) return;
    toUnsave.forEach((url) =>
      setRemovingFromGraph((prev) => new Set(prev).add(url))
    );
    const errors: string[] = [];
    if (selectedResume) {
      for (const url of toUnsave) {
        try {
          await removeJobFromResume(selectedResume.resume_id, url);
        } catch (err: unknown) {
          errors.push(err instanceof Error ? err.message : url);
        }
      }
    }
    // Remove successfully unsaved URLs from local state
    const failed = new Set(errors);
    setAddedToGraphByResume((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).filter(
        (u) => !toUnsave.includes(u) || failed.has(u)
      ),
    }));
    toUnsave.forEach((url) =>
      setRemovingFromGraph((prev) => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      })
    );
    if (errors.length > 0) {
      setNotice({
        type: "error",
        message: `Some jobs could not be unsaved: ${errors.slice(0, 3).join(", ")}`,
      });
    }
  };

  const handleAddToGraph = async (job: Job) => {
    const jobUrl = job.apply_url || job.source_url || "";
    if (!jobUrl) {
      setNotice({
        type: "error",
        message: "This job cannot be saved because it does not include an application URL.",
      });
      return;
    }

    if (!selectedResume) {
      setNotice({
        type: "info",
        message:
          "Saving without a selected resume will add the job to the graph, but it will not appear under a resume.",
      });
    }

    setAddingToGraph((prev) => new Set(prev).add(jobUrl));

    try {
      const result = await addJobToGraph(job);
      if (!result.success) {
        throw new Error(result.message || "Failed to add job to knowledge graph");
      }

      setAddedToGraphByResume((prev) => {
        const key = selectedResume?.resume_id ?? "";
        const existing = prev[key] ?? [];
        if (existing.includes(jobUrl)) return prev;
        return { ...prev, [key]: [...existing, jobUrl] };
      });

      if (selectedResume) {
        await saveJobToResume(selectedResume.resume_id, jobUrl);
        const graphJson = await fetchResumeGraph(selectedResume.person_name);
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
        localStorage.setItem("careerlift:resume-updated", String(Date.now()));
        window.dispatchEvent(new Event("careerlift:resume-updated"));
      }

      setNotice({
        type: "success",
        message: selectedResume
          ? "Job saved to the knowledge graph and linked to the selected resume."
          : "Job saved to the knowledge graph.",
      });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to add job to knowledge graph",
      });
    } finally {
      setAddingToGraph((prev) => {
        const next = new Set(prev);
        next.delete(jobUrl);
        return next;
      });
    }
  };

  // Persist relevant state to localStorage whenever it changes so it survives
  // navigation away from the Job Finder page.
  useEffect(() => {
    savePersistedJobFinderState({
      q,
      loc,
      selectedResumeId: selectedResume?.resume_id ?? null,
      jobsBySource,
      addedToGraphByResume,
      sourceLimits,
      hasMoreJobs,
    });
  }, [q, loc, selectedResume, jobsBySource, addedToGraphByResume, sourceLimits, hasMoreJobs]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const resumes = await listResumes();
        setAvailableResumes(resumes);

        // Restore the previously selected resume if one was persisted.
        if (persistedResumeIdRef.current) {
          const resume = resumes.find(
            (r) => r.resume_id === persistedResumeIdRef.current
          );
          if (resume) setSelectedResume(resume);
        }
      } catch (err: unknown) {
        setNotice({
          type: "error",
          message:
            err instanceof Error ? err.message : "Failed to load resumes",
        });
      }
    };

    bootstrap();
  }, []);

  // Only auto-search on first visit (no persisted jobs). Subsequent visits
  // restore the previous state; the user can refresh manually.
  useEffect(() => {
    const persistedJobCount = Object.values(
      initialState?.jobsBySource ?? {}
    ).reduce((sum, jobs) => sum + jobs.length, 0);
    if (persistedJobCount === 0) {
      search();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalJobs = Object.values(jobsBySource).reduce(
    (sum, jobs) => sum + jobs.length,
    0
  );

  return {
    q,
    loc,
    loading,
    loadingState,
    notice,
    availableResumes,
    selectedResume,
    jobsBySource,
    totalJobs,
    hasMoreJobs,
    sourceLimits,
    scoringJobs,
    addedToGraph,
    addingToGraph,
    removingFromGraph,
    setQ,
    setLoc,
    dismissNotice,
    search,
    handleResumeChange,
    handleResumeDelete,
    handleDeleteAllResumes,
    refreshSource,
    loadMore,
    calculateAtsForSingleJob,
    handleAddToGraph,
    handleUnsaveJob,
    handleUnsaveAllInSource,
  };
}
