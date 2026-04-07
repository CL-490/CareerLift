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
  } = useJobFinder();

  return (
    <main className="mx-auto max-w-400">
      <h1 className="text-[40px] font-semibold tracking-tight heading-gradient mb-2">
        Job Finder
      </h1>
      <p className="text-[15px] text-muted mb-6">
        Browse job postings from multiple sources with ATS scoring based on
        your selected resume.
      </p>

      <ResumeSelector
        availableResumes={availableResumes}
        selectedResume={selectedResume}
        onChange={handleResumeChange}
        onDelete={handleResumeDelete}
        onDeleteAll={handleDeleteAllResumes}
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
              removingFromGraph={removingFromGraph}
              scoringJobs={scoringJobs}
              onRefresh={refreshSource}
              onLoadMore={loadMore}
              onCalculateAts={calculateAtsForSingleJob}
              onAddToGraph={handleAddToGraph}
              onUnsave={handleUnsaveJob}
              onUnsaveAll={handleUnsaveAllInSource}
            />
          ))}
        </div>
      )}
    </main>
  );
}
