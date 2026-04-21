"use client";

import MockInterviewSetup from "@/components/MockInterviewSetup";
import MockInterview from "@/components/MockInterview";
import SkillGapAnalysisComponent from "@/components/SkillGapAnalysis";
import { listResumes } from "@/lib/jobFinderApi";
import { useState, useEffect } from "react";
import { SessionSummary } from "@/lib/interviewApi";

interface InterviewSession {
  resumeId: string;
  resumeName: string;
  jobApplyUrl: string;
  roleTitle: string;
  roleLevel: string;
}

export default function CoachCenterPage() {
  const [interviewSession, setInterviewSession] = useState<InterviewSession | null>(null);
  const [completedSummary, setCompletedSummary] = useState<SessionSummary | null>(null);
  const [selectedResumeForGap, setSelectedResumeForGap] = useState<string | null>(null);

  const handleStartInterview = (
    resumeId: string,
    resumeName: string,
    jobApplyUrl: string,
    roleTitle: string,
    level: string
  ) => {
    setInterviewSession({ resumeId, resumeName, jobApplyUrl, roleTitle, roleLevel: level });
    setCompletedSummary(null);
  };

  const handleInterviewComplete = (summary: SessionSummary) => {
    setCompletedSummary(summary);
  };

  const handleResetInterview = () => {
    setInterviewSession(null);
    setCompletedSummary(null);
  };

  return (
    <main className="mx-auto max-w-300">
      <h1 className="mb-2 text-[30px] font-semibold tracking-tight heading-gradient sm:text-[32px]">
        Coach Center
      </h1>
      <p className="text-[15px] text-muted mb-6">
        Interactive AI career coach: interview prep and skill gap analysis.
      </p>
       

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* Interview Simulator Section */}
            <div className="card hover-ring mb-6 mock-shell">
              <div className="mb-6">
                <h2 className="text-[20px] font-medium">Mock Interview</h2>
                <h3 className="mb-2 text-lg font-semibold text-muted">Practice for a specific job role with AI-powered feedback</h3>
              </div>
              {!interviewSession ? (
                <MockInterviewSetup onStartInterview={handleStartInterview} />
              ) : (
                <MockInterview
                  resumeId={interviewSession.resumeId}
                  resumeName={interviewSession.resumeName}
                  jobApplyUrl={interviewSession.jobApplyUrl}
                  roleTitle={interviewSession.roleTitle}
                  roleLevel={interviewSession.roleLevel}
                  onComplete={handleInterviewComplete}
                  onReset={handleResetInterview}
                />
                
              )}
            </div>

            {/* Skill Gap Analysis Section */}
            <div className="card hover-ring mb-6 card-tone-amber">
              <div className="mb-6">
                <h2 className="text-[20px] font-medium">Skill Gap Analysis</h2>
                <h3 className="mb-4 text-lg font-semibold text-muted">Identify gaps between your skills and saved job requirements</h3>
              </div>
              
              {!selectedResumeForGap ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted">Select a resume to analyze skill gaps across your saved jobs:</p>
                  <ResumeSelector onSelectResume={setSelectedResumeForGap} />
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setSelectedResumeForGap(null)}
                    className="jf-btn mb-4 px-3 py-1 text-sm"
                  >
                    ← Change Resume
                  </button>
                  <SkillGapAnalysisComponent resumeId={selectedResumeForGap} />
                </div>
              )}
            </div>

          </div>
        </div>

      
    </main>
  );
}

interface ResumeSelectorProps {
  onSelectResume: (resumeId: string) => void;
}

function ResumeSelector({ onSelectResume }: ResumeSelectorProps) {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch resumes on mount
  useEffect(() => {
    const fetchResumes = async () => {
      try {
        setLoading(true);
        const data = await listResumes();
        setResumes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, []);

  if (loading) {
    return <div className="text-muted">Loading resumes...</div>;
  }

  if (error) {
    return <div className="text-red-400">Error: {error}</div>;
  }

  if (resumes.length === 0) {
    return (
      <div className="notice-banner notice-info p-4">
        No resumes found. Upload a resume first to analyze skill gaps.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {resumes.map((resume) => (
        <button
          key={resume.resume_id}
          onClick={() => onSelectResume(resume.resume_id)}
          className="selection-card text-left p-4"
        >
          <p className="font-medium text-foreground">{resume.resume_name}</p>
          <p className="text-sm text-muted">{resume.person_name}</p>
        </button>
      ))}
    </div>
  );
}
