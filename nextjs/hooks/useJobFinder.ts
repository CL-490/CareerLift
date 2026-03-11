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
  fetchResumeGraph,
  listResumes,
  loadJobsBySource,
  saveJobToResume,
} from "@/lib/jobFinderApi";

function stripAtsScores(jobsData: JobsBySource): JobsBySource {
  const next: JobsBySource = {};
  for (const [source, jobs] of Object.entries(jobsData)) {
    next[source] = jobs.map(({ ats_score, ats_details, ...rest }) => rest);
  }
  return next;
}

export function useJobFinder() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [jobsBySource, setJobsBySource] = useState<JobsBySource>({});
  const [sourceLimits, setSourceLimits] = useState<SourceLimits>(
    SOURCES.reduce((acc, { key }) => ({ ...acc, [key]: 100 }), {})
  );
  const [hasMoreJobs, setHasMoreJobs] = useState<Record<string, boolean>>(
    SOURCES.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
  );
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>({});
  const [scoringJobs, setScoringJobs] = useState<Set<string>>(new Set());
  const [availableResumes, setAvailableResumes] = useState<Resume[]>([]);
  const [addedToGraph, setAddedToGraph] = useState<Set<string>>(new Set());
  const [addingToGraph, setAddingToGraph] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<Notice | null>(null);

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

      setAddedToGraph((prev) => new Set(prev).add(jobUrl));

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

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const resumes = await listResumes();
        setAvailableResumes(resumes);
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

  useEffect(() => {
    search();
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
    setQ,
    setLoc,
    dismissNotice,
    search,
    handleResumeChange,
    refreshSource,
    loadMore,
    calculateAtsForSingleJob,
    handleAddToGraph,
  };
}
