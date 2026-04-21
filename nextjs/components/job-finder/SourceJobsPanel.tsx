import { useMemo } from "react";
import type {
  Job,
  Resume,
  SourceLoadingState,
  SourceDefinition,
} from "@/components/job-finder/types";
import { asString } from "@/lib/jobFinderApi";
import { formatResumeLabel } from "@/lib/resumeLoader";

interface SourceJobsPanelProps {
  source: SourceDefinition;
  jobs: Job[];
  loadingState?: SourceLoadingState;
  hasMoreJobs: boolean;
  sourceLimit: number;
  selectedResumeId: string | null;
  availableResumes: Resume[];
  addedToGraph: Set<string>;
  addedToGraphByResume: Record<string, string[]>;
  addingToGraph: Set<string>;
  removingFromGraph: Set<string>;
  scoringJobs: Set<string>;
  onRefresh: (sourceKey: string) => void;
  onLoadMore: (sourceKey: string) => void;
  onCalculateAts: (sourceKey: string, jobIndex: number) => void;
  onAddToGraph: (job: Job) => void;
  onUnsave: (job: Job) => void;
  onUnsaveAll: (sourceKey: string) => void;
  onSaveToApplications: (job: {
                        id: string;
                        title: string;
                        company: string;
                        salary?: string;
                        url?: string;
                        source: string;
                      }) => void;
                      isAlreadyApplied: (id: string) => boolean;
}

export default function SourceJobsPanel({
  source,
  jobs,
  loadingState,
  hasMoreJobs,
  sourceLimit,
  selectedResumeId,
  availableResumes,
  addedToGraph,
  addedToGraphByResume,
  addingToGraph,
  removingFromGraph,
  scoringJobs,
  onRefresh,
  onLoadMore,
  onCalculateAts,
  onAddToGraph,
  onUnsave,
  onUnsaveAll,
  onSaveToApplications,
  isAlreadyApplied,
}: SourceJobsPanelProps) {
  // url -> resumes (across the user's entire library) that have saved it
  const linkedByUrl = useMemo(() => {
    const map = new Map<string, Resume[]>();
    for (const r of availableResumes) {
      const urls = addedToGraphByResume[r.resume_id] ?? [];
      for (const url of urls) {
        if (!url) continue;
        const existing = map.get(url) ?? [];
        if (!existing.some((e) => e.resume_id === r.resume_id)) {
          map.set(url, [...existing, r]);
        }
      }
    }
    return map;
  }, [availableResumes, addedToGraphByResume]);
  const savedJobsInSource = jobs.filter(
    (j) => addedToGraph.has(j.apply_url || j.source_url || "")
  ).length;
  const isSourceLoading = loadingState?.isLoading || false;
  const progress = loadingState?.progress || 0;

  return (
    <div className="surface-strong flex flex-col overflow-hidden rounded-2xl">
      <div className="border-b border-[var(--border-strong)] bg-linear-to-r from-blue-500/10 to-purple-500/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <span>{source.emoji}</span>
            <span>{source.label}</span>
          </h2>
          <span className="text-sm text-muted">{jobs.length} jobs</span>
        </div>

        {isSourceLoading && (
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-purple-300">Loading...</span>
              <span className="text-xs font-medium text-purple-300">
                {progress}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-purple-900/30">
              <div
                className="h-1.5 rounded-full bg-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onRefresh(source.key)}
            disabled={isSourceLoading}
            className="jf-btn jf-btn-accent px-3 py-1"
          >
            {isSourceLoading ? "Refreshing..." : "Refresh"}
          </button>
          {jobs.length > 0 && hasMoreJobs && sourceLimit < 1000 && (
            <button
              onClick={() => onLoadMore(source.key)}
              disabled={isSourceLoading}
              className="jf-btn jf-btn-info px-3 py-1"
            >
              {isSourceLoading ? "Loading..." : "Load More (+100)"}
            </button>
          )}
          {savedJobsInSource > 0 && (
            <button
              onClick={() => onUnsaveAll(source.key)}
              className="jf-btn px-3 py-1 text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              Unsave All ({savedJobsInSource})
            </button>
          )}
        </div>
      </div>

      <div className="max-h-150 flex-1 overflow-y-auto">
        {jobs.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted">
            <p className="mb-2">No jobs found from {source.label}</p>
            <button
              onClick={() => onRefresh(source.key)}
              disabled={isSourceLoading}
              className="jf-btn jf-btn-accent px-3 py-1"
            >
              {isSourceLoading ? "Fetching..." : "Fetch Jobs"}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-strong)]">
            {jobs.map((job, idx) => {
              const jobKey = `${source.key}-${idx}`;
              const jobUrl = job.apply_url || job.source_url || "";
              const isAddedToGraph = addedToGraph.has(jobUrl);
              const isAddingToGraph = addingToGraph.has(jobUrl);
              const isRemovingFromGraph = removingFromGraph.has(jobUrl);
              const isScoring = scoringJobs.has(jobKey);
              const jobId = job.source_job_id ?? `${job.title}-${job.company}`;
              // A job is "saved" if ANY resume in the user's library has it.
              // Backend cross-resume hydration drives this, with localStorage
              // as a fallback for legacy entries.
              const linkedResumes = linkedByUrl.get(jobUrl) ?? [];
              const isSavedAnywhere =
                linkedResumes.length > 0 || isAddedToGraph || isAlreadyApplied(jobId);
              // The unsave action only removes the job from the currently-
              // selected resume; show it only if the selected resume actually
              // has this job saved.
              const isSavedUnderCurrent = isAddedToGraph;
              return (
                <li
                  key={jobKey}
                  className="border-l-2 border-transparent p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--selection-hover-bg)]"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-semibold">
                      {job.title}
                    </h3>
                    {typeof job.ats_score === "number" && (
                      <div
                        className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${
                          job.ats_score >= 70
                            ? "bg-green-100 text-green-700"
                            : job.ats_score >= 50
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {job.ats_score}%
                      </div>
                    )}
                  </div>

                  <div className="mb-2 text-xs text-muted-strong">
                    {job.company && <span>{job.company}</span>}
                    {job.company && (job.location || job.employment_type) && (
                      <span> • </span>
                    )}
                    {job.location && <span>{job.location}</span>}
                    {job.location && job.employment_type && <span> • </span>}
                    {job.employment_type && <span>{job.employment_type}</span>}
                    {typeof job.remote === "boolean" && (
                      <span> • {job.remote ? "Remote" : "On-site"}</span>
                    )}
                  </div>

                  {job.salary_text && (
                    <div className="mb-2 text-xs text-green-600">
                      {job.salary_text}
                    </div>
                  )}

                  {job.ats_details && (
                    <div className="mb-3 space-y-1 text-xs">
                      {job.ats_details.missing.required_skills.length > 0 && (
                        <p className="text-red-700">
                          Missing: {job.ats_details.missing.required_skills.slice(0, 3).join(", ")}
                        </p>
                      )}
                      {job.ats_details.matched.required_skills.length > 0 && (
                        <p className="text-green-700">
                          Matched: {job.ats_details.matched.required_skills.slice(0, 3).join(", ")}
                        </p>
                      )}
                      {job.ats_details.reasoning[0] && (
                        <p className="text-muted-strong">{job.ats_details.reasoning[0]}</p>
                      )}
                    </div>
                  )}

                  {/* Saved-state pill + linked resumes */}
                  {isSavedAnywhere && (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">
                        ✓ Saved
                      </span>
                      {linkedResumes.length > 0 && (
                        <span className="text-muted">on</span>
                      )}
                      {linkedResumes.map((r) => {
                        const label = formatResumeLabel(r);
                        const person = asString(r.person_name);
                        return (
                          <span
                            key={r.resume_id}
                            title={person ? `${label} (${person})` : label}
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2 py-0.5 text-[var(--accent)]"
                          >
                            <span>{label}</span>
                            {person && (
                              <span className="text-[10px] opacity-80">· {person}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {jobUrl && (
                      <a
                        href={jobUrl}
                        className="jf-btn jf-btn-info px-2 py-1"
                        target="_blank"
                        rel="noreferrer"
                        title={jobUrl}
                      >
                        URL ↗
                      </a>
                    )}
                    <button
                      onClick={() => onCalculateAts(source.key, idx)}
                      disabled={isScoring}
                      className="jf-btn jf-btn-accent px-2 py-1"
                      title={
                        !selectedResumeId
                          ? "Select a resume first"
                          : "Calculate ATS score for this job"
                      }
                    >
                      {isScoring ? "Scoring..." : "Calculate ATS"}
                    </button>

                    {isSavedUnderCurrent ? (
                      <button
                        onClick={() => onUnsave(job)}
                        disabled={isRemovingFromGraph}
                        className="jf-btn px-2 py-1 border border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                        title={
                          selectedResumeId
                            ? "Remove this job from the currently selected resume"
                            : ""
                        }
                      >
                        {isRemovingFromGraph ? "Unsaving..." : "Unsave from current ✕"}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onAddToGraph(job);
                          onSaveToApplications({
                            id: jobId,
                            title: job.title,
                            company: job.company ?? "",
                            salary: job.salary_text ?? undefined,
                            url: jobUrl,
                            source: source.key,
                          });
                        }}
                        disabled={isAddingToGraph || !selectedResumeId}
                        className="jf-btn jf-btn-primary px-2 py-1"
                        title={
                          !selectedResumeId
                            ? "Select a resume first to save this job"
                            : isSavedAnywhere
                              ? "Also save under the currently selected resume"
                              : "Save this job to the selected resume"
                        }
                      >
                        {isAddingToGraph
                          ? "Adding..."
                          : isSavedAnywhere
                            ? "Save under current"
                            : "Save to Applications"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
