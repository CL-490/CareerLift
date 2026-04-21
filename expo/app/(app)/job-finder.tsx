import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { SourceJobsPanelMobile } from "@/components/job-finder/SourceJobsPanelMobile";
import { AppShell } from "@/components/shell/AppShell";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import { ResumePickerCard } from "@/components/ui/ResumePickerCard";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useJobFinderMobile } from "@/hooks/useJobFinderMobile";
import { SOURCES } from "@/lib/api/jobFinder";
import { useAppTheme } from "@/lib/theme";

export default function JobFinderScreen() {
  const { theme } = useAppTheme();
  const {
    q,
    loc,
    selectedSource,
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
    setSelectedSource,
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
    handleSaveToApplications,
    isAlreadyApplied,
  } = useJobFinderMobile();

  const activeSource = SOURCES.find((source) => source.key === selectedSource) ?? SOURCES[0];
  const sourceLabels = Object.fromEntries(
    SOURCES.map((source) => [source.key, `${source.emoji} ${source.label}`])
  ) as Record<string, string>;

  return (
    <AppShell
      title="Job Finder"
      subtitle="Browse jobs across live sources, score them against your resume, and save strong matches into your pipeline."
    >
      <ResumePickerCard
        availableResumes={availableResumes}
        selectedResume={selectedResume}
        allowEmpty
        label="Select Resume"
        helper="Optional, but selecting a resume unlocks ATS scoring and resume-linked saved jobs."
        onChange={handleResumeChange}
        onDelete={handleResumeDelete}
        onDeleteAll={handleDeleteAllResumes}
      />

      <View style={[styles.searchCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
        <View style={styles.fieldGap}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Role or keyword (e.g. frontend, ML)"
            placeholderTextColor={theme.palette.muted}
            style={[styles.input, { color: theme.palette.foreground, borderColor: theme.palette.divider, backgroundColor: theme.palette.surface }]}
          />
          <TextInput
            value={loc}
            onChangeText={setLoc}
            placeholder="Location (e.g. Remote, NYC)"
            placeholderTextColor={theme.palette.muted}
            style={[styles.input, { color: theme.palette.foreground, borderColor: theme.palette.divider, backgroundColor: theme.palette.surface }]}
          />
        </View>
        <Pressable onPress={() => void search()} disabled={loading} style={[styles.primaryButton, { backgroundColor: theme.palette.accentStrong, opacity: loading ? 0.7 : 1 }]}>
          <Text style={styles.primaryText}>{loading ? "Searching…" : "Search"}</Text>
        </Pressable>
      </View>

      <NoticeBanner notice={notice} onDismiss={dismissNotice} />

      {!loading && totalJobs > 0 ? (
        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13) }}>
          Found {totalJobs} jobs across {Object.keys(jobsBySource).length} sources
        </Text>
      ) : null}

      <SegmentedTabs
        tabs={SOURCES.map((source) => source.key)}
        value={selectedSource}
        onChange={setSelectedSource}
        counts={Object.fromEntries(SOURCES.map((source) => [source.key, (jobsBySource[source.key] || []).length]))}
        labels={sourceLabels}
      />

      <SourceJobsPanelMobile
        source={activeSource}
        jobs={jobsBySource[activeSource.key] || []}
        loadingState={loadingState[activeSource.key]}
        hasMoreJobs={hasMoreJobs[activeSource.key]}
        sourceLimit={sourceLimits[activeSource.key]}
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
        onSaveToApplications={handleSaveToApplications}
        isAlreadyApplied={isAlreadyApplied}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  searchCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  fieldGap: {
    gap: 10,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});
