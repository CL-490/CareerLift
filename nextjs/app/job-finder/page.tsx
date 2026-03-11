"use client";

import FeedbackBanner from "@/components/job-finder/FeedbackBanner";
import JobSearchForm from "@/components/job-finder/JobSearchForm";
import LoadingState from "@/components/job-finder/LoadingState";
import ResumeSelector from "@/components/job-finder/ResumeSelector";
import SourceJobsPanel from "@/components/job-finder/SourceJobsPanel";
import { SOURCES } from "@/components/job-finder/types";
import { useJobFinder } from "@/hooks/useJobFinder";

export default function JobFinderPage() {
  const {
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
  } = useJobFinder();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="mb-6 text-[40px] font-semibold tracking-tight heading-gradient">
          Job Finder
        </h1>
        <p className="text-sm text-muted">
          Browse job postings from multiple sources with ATS scoring based on
          your selected resume.
        </p>
      </header>

      <ResumeSelector
        availableResumes={availableResumes}
        selectedResume={selectedResume}
        onChange={handleResumeChange}
      />

      <JobSearchForm
        q={q}
        loc={loc}
        loading={loading}
        onQChange={setQ}
        onLocChange={setLoc}
        onSubmit={search}
      />

      <FeedbackBanner notice={notice} onDismiss={dismissNotice} />

      {!loading && totalJobs > 0 && (
        <div className="mb-4 text-sm text-muted">
          Found {totalJobs} jobs across {Object.keys(jobsBySource).length} sources
        </div>
      )}

      {loading ? (
        <LoadingState loadingState={loadingState} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {SOURCES.map((source) => (
            <SourceJobsPanel
              key={source.key}
              source={source}
              jobs={jobsBySource[source.key] || []}
              loadingState={loadingState[source.key]}
              hasMoreJobs={hasMoreJobs[source.key]}
              sourceLimit={sourceLimits[source.key]}
              selectedResumeId={selectedResume?.resume_id ?? null}
              addedToGraph={addedToGraph}
              addingToGraph={addingToGraph}
              scoringJobs={scoringJobs}
              onRefresh={refreshSource}
              onLoadMore={loadMore}
              onCalculateAts={calculateAtsForSingleJob}
              onAddToGraph={handleAddToGraph}
            />
          ))}
        </div>
      )}
    </main>
  );
}
