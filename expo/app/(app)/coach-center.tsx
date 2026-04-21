import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { MockInterviewSetupCard } from "@/components/coach-center/MockInterviewSetupCard";
import { SkillGapAnalysisCard } from "@/components/coach-center/SkillGapAnalysisCard";
import { AppShell } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";
import { ResumePickerCard } from "@/components/ui/ResumePickerCard";
import { getSavedJobs, listResumes } from "@/lib/api/jobFinder";
import { getSkillGapAnalysis } from "@/lib/api/dashboard";
import { useAppTheme } from "@/lib/theme";
import type { ResumeSummary, SavedJobInfo, SkillGapData } from "@/lib/types";

export default function CoachCenterScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [resumes, setResumes] = React.useState<ResumeSummary[]>([]);
  const [selectedResume, setSelectedResume] = React.useState<ResumeSummary | null>(null);
  const [jobs, setJobs] = React.useState<SavedJobInfo[]>([]);
  const [selectedJob, setSelectedJob] = React.useState<SavedJobInfo | null>(null);
  const [selectedLevel, setSelectedLevel] = React.useState("entry");
  const [loadingResumes, setLoadingResumes] = React.useState(true);
  const [loadingJobs, setLoadingJobs] = React.useState(false);
  const [resumeError, setResumeError] = React.useState<string | null>(null);
  const [jobsError, setJobsError] = React.useState<string | null>(null);

  const [selectedResumeForGap, setSelectedResumeForGap] = React.useState<string | null>(null);
  const [skillGapData, setSkillGapData] = React.useState<SkillGapData | null>(null);
  const [skillGapLoading, setSkillGapLoading] = React.useState(false);
  const [skillGapError, setSkillGapError] = React.useState<string | null>(null);

  const loadResumes = React.useCallback(async () => {
    try {
      setLoadingResumes(true);
      setResumeError(null);
      const data = await listResumes();
      setResumes(data);
      if (data.length > 0) {
        setSelectedResume((current) => current ?? data[0]);
      }
    } catch (error) {
      setResumeError(error instanceof Error ? error.message : "Failed to load resumes.");
    } finally {
      setLoadingResumes(false);
    }
  }, []);

  React.useEffect(() => {
    void loadResumes();
  }, [loadResumes]);

  React.useEffect(() => {
    if (!selectedResume) {
      setJobs([]);
      return;
    }

    async function loadJobs() {
      const activeResume = selectedResume;
      if (!activeResume) return;
      setLoadingJobs(true);
      setJobsError(null);
      try {
        const data = await getSavedJobs(activeResume.resume_id);
        setJobs(data.jobs);
        setSelectedJob(data.jobs[0] ?? null);
      } catch (error) {
        setJobs([]);
        setJobsError(error instanceof Error ? error.message : "Failed to load saved jobs.");
      } finally {
        setLoadingJobs(false);
      }
    }

    void loadJobs();
  }, [selectedResume]);

  const loadSkillGap = React.useCallback(async (resumeId: string) => {
    setSkillGapLoading(true);
    setSkillGapError(null);
    try {
      const data = await getSkillGapAnalysis(resumeId);
      setSkillGapData(data);
    } catch (error) {
      setSkillGapData(null);
      setSkillGapError(error instanceof Error ? error.message : "Failed to load analysis.");
    } finally {
      setSkillGapLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!selectedResumeForGap) {
      setSkillGapData(null);
      setSkillGapError(null);
      return;
    }
    void loadSkillGap(selectedResumeForGap);
  }, [loadSkillGap, selectedResumeForGap]);

  function handleStartInterview() {
    if (!selectedResume || !selectedJob) return;
    router.push({
      pathname: "/coach-interview",
      params: {
        resumeId: selectedResume.resume_id,
        resumeName: selectedResume.resume_name,
        jobApplyUrl: selectedJob.apply_url,
        roleTitle: selectedJob.job_title,
        roleLevel: selectedLevel,
      },
    });
  }

  return (
    <AppShell
      title="Coach Center"
      subtitle="Interactive AI coaching for mock interviews and skill-gap analysis."
    >
      <Card delay={40}>
        <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(18) }}>Mock Interview</Text>
        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), lineHeight: theme.text.size(20) }}>
          Practice for a specific role with AI-powered feedback and a five-question structured interview flow.
        </Text>
        <MockInterviewSetupCard
          resumes={resumes}
          selectedResume={selectedResume}
          jobs={jobs}
          selectedLevel={selectedLevel}
          selectedJob={selectedJob}
          loadingResumes={loadingResumes}
          loadingJobs={loadingJobs}
          resumeError={resumeError}
          jobsError={jobsError}
          onResumeChange={(resumeId) => {
            const match = resumes.find((resume) => resume.resume_id === resumeId) ?? null;
            setSelectedResume(match);
          }}
          onStartInterview={handleStartInterview}
          onSelectLevel={setSelectedLevel}
          onSelectJob={setSelectedJob}
        />
      </Card>

      <Card delay={80}>
        <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(18) }}>Skill Gap Analysis</Text>
        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), lineHeight: theme.text.size(20) }}>
          Identify the gap between your current skills and the requirements showing up in your saved jobs.
        </Text>
        {!selectedResumeForGap ? (
          <ResumePickerCard
            availableResumes={resumes}
            selectedResume={resumes.find((resume) => resume.resume_id === selectedResumeForGap) ?? null}
            label="Select Resume"
            helper="Choose a resume to analyze against your saved jobs."
            onChange={(resumeId) => setSelectedResumeForGap(resumeId)}
          />
        ) : (
          <View style={styles.gap}>
            <Pressable onPress={() => setSelectedResumeForGap(null)}>
              <Text style={{ color: theme.palette.accent, fontWeight: "700" }}>Change Resume</Text>
            </Pressable>
            <SkillGapAnalysisCard
              data={skillGapData}
              loading={skillGapLoading}
              error={skillGapError}
              onRetry={() => void loadSkillGap(selectedResumeForGap)}
            />
          </View>
        )}
      </Card>

    </AppShell>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: 12,
  },
});
