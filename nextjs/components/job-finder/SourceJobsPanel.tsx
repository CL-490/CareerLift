import type {
  Job,
  SourceLoadingState,
  SourceDefinition,
} from "@/components/job-finder/types";

interface SourceJobsPanelProps {
  source: SourceDefinition;
  jobs: Job[];
  loadingState?: SourceLoadingState;
  hasMoreJobs: boolean;
  sourceLimit: number;
  selectedResumeId: string | null;
  addedToGraph: Set<string>;
  addingToGraph: Set<string>;
  scoringJobs: Set<string>;
  onRefresh: (sourceKey: string) => void;
  onLoadMore: (sourceKey: string) => void;
  onCalculateAts: (sourceKey: string, jobIndex: number) => void;
  onAddToGraph: (job: Job) => void;
}

export default function SourceJobsPanel({
  source,
  jobs,
  loadingState,
  hasMoreJobs,
  sourceLimit,
  selectedResumeId,
  addedToGraph,
  addingToGraph,
  scoringJobs,
  onRefresh,
  onLoadMore,
  onCalculateAts,
  onAddToGraph,
}: SourceJobsPanelProps) {
  const isSourceLoading = loadingState?.isLoading || false;
  const progress = loadingState?.progress || 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] surface">
      <div className="border-b border-[var(--border-color)] bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4">
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

        <div className="flex gap-2">
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
        </div>
      </div>

      <div className="max-h-[600px] flex-1 overflow-y-auto">
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
          <ul className="divide-y divide-[var(--border-color)]">
            {jobs.map((job, idx) => {
              const jobKey = `${source.key}-${idx}`;
              const jobUrl = job.apply_url || job.source_url || "";
              const isAddedToGraph = addedToGraph.has(jobUrl);
              const isAddingToGraph = addingToGraph.has(jobUrl);
              const isScoring = scoringJobs.has(jobKey);

              return (
                <li
                  key={jobKey}
                  className="p-4 transition-colors hover:bg-[var(--background-alt)/10]"
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

                  <div className="flex flex-wrap items-center gap-2">
                    {jobUrl && (
                      <a
                        href={jobUrl}
                        className="jf-btn jf-btn-info px-2 py-1"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Apply
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
                    <button
                      onClick={() => onAddToGraph(job)}
                      disabled={isAddingToGraph || isAddedToGraph}
                      className={`px-2 py-1 ${
                        isAddedToGraph
                          ? "jf-btn jf-btn-success cursor-not-allowed"
                          : "jf-btn jf-btn-primary"
                      }`}
                    >
                      {isAddingToGraph
                        ? "Adding..."
                        : isAddedToGraph
                          ? "In Graph ✓"
                          : "Save to Knowledge Graph"}
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
}
