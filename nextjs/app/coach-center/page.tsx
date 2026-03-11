"use client";

import MockInterviewSetup from "@/components/MockInterviewSetup";
import MockInterview from "@/components/MockInterview";
import { useState } from "react";
import { SessionSummary } from "@/lib/interviewApi";

interface InterviewSession {
  resumeName: string;
  roleTitle: string;
  roleLevel: string;
}

export default function CoachCenterPage() {
  const [interviewSession, setInterviewSession] = useState<InterviewSession | null>(null);
  const [completedSummary, setCompletedSummary] = useState<SessionSummary | null>(null);

  const handleStartInterview = (resumeName: string, roleTitle: string, level: string) => {
    setInterviewSession({ resumeName, roleTitle, roleLevel: level });
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
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-8">
        <h1 className="mb-6 text-[40px] font-semibold tracking-tight heading-gradient">
          Coach Center
        </h1>
        <p className="text-sm text-muted">
          Interactive AI career coach: interview prep, skill gap analysis, and tailored growth plans.
        </p>
      </header>
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
 

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-2xl">
            {/* Interview Simulator Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-800 mb-2">Mock Interview</h2>
                <p className="text-slate-600 text-sm">
                  Practice for a specific job role with AI-powered feedback
                </p>
              </div>
              {!interviewSession ? (
                <MockInterviewSetup onStartInterview={handleStartInterview} />
              ) : (
                <MockInterview
                  resumeName={interviewSession.resumeName}
                  roleTitle={interviewSession.roleTitle}
                  roleLevel={interviewSession.roleLevel}
                  onComplete={handleInterviewComplete}
                  onReset={handleResetInterview}
                />
              )}
            </div>

            {/* Placeholder for Future Features */}
            <div className="space-y-4">
              <div className="bg-slate-100 rounded-lg p-6 opacity-50">
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Skill Gap Analysis</h3>
                <p className="text-slate-600 text-sm">Coming soon...</p>
              </div>
              <div className="bg-slate-100 rounded-lg p-6 opacity-50">
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Growth Plans</h3>
                <p className="text-slate-600 text-sm">Coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
