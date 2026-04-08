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
    <main className="mx-auto max-w-400">
      <h1 className="text-[40px] font-semibold tracking-tight heading-gradient mb-2">
        Coach Center
      </h1>
      <p className="text-[15px] text-muted mb-6">
        Interactive AI career coach: interview prep, skill gap analysis, and tailored growth plans.
      </p>
       

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Interview Simulator Section */}
            <div className="card hover-ring mb-6 card-hue">
              <div className="mb-6">
                <h2 className="text-[20px] font-medium">Mock Interview</h2>
                <h3 className="text-lg font-semibold text-slate-400 mb-2">Practice for a specific job role with AI-powered feedback</h3>
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
            <div className="card hover-ring mb-6 card-hue">
              <div className="mb-6">
                <h2 className="text-[20px] font-medium">Skill Gap Analysis</h2>
                <h3 className="text-lg font-semibold text-slate-400 mb-4">Identify gaps between your skills and saved job requirements</h3>
              </div>
              
              {!selectedResumeForGap ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-400">Select a resume to analyze skill gaps across your saved jobs:</p>
                  <ResumeSelector onSelectResume={setSelectedResumeForGap} />
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setSelectedResumeForGap(null)}
                    className="mb-4 px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-300 transition-colors"
                  >
                    ← Change Resume
                  </button>
                  <SkillGapAnalysisComponent resumeId={selectedResumeForGap} />
                </div>
              )}
            </div>

            {/* Placeholder for Future Features */}
            <div className="space-y-4">
              <div className="card hover-ring mb-6 card-hue">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[20px] font-medium">Growth Plans</h2>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">Coming soon ...</h3>
                </div>
              </div>
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
    return <div className="text-slate-400">Loading resumes...</div>;
  }

  if (error) {
    return <div className="text-red-400">Error: {error}</div>;
  }

  if (resumes.length === 0) {
    return (
      <div className="rounded-lg bg-blue-500/10 p-4 border border-blue-500/30 text-blue-300">
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
          className="text-left rounded-lg border border-slate-700 bg-slate-800/50 p-4 hover:bg-slate-700 transition-colors"
        >
          <p className="font-medium text-white">{resume.resume_name}</p>
          <p className="text-sm text-slate-400">{resume.person_name}</p>
        </button>
      ))}
    </div>
  );
}
