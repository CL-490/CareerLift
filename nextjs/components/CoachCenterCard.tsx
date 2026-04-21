"use client";

import React from "react";
import Link from "next/link";
import SkillGapAnalysisComponent from "@/components/SkillGapAnalysis";
import { useActiveResume } from "@/hooks/useActiveResume";

export default function CoachCenterCard() {
  const activeResume = useActiveResume();

  return (
    <div className="card hover-ring flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="card-header">Skill Gap Analysis</h2>
        <Link
          href="/coach-center"
          className="text-xs text-muted hover:text-white transition-colors shrink-0"
        >
          Coach Center →
        </Link>
      </div>

      {!activeResume ? (
        <p className="text-sm text-muted">
          Select a resume in the Resume card above to see its skill gap
          analysis.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted mb-3 truncate" title={activeResume.resume_name}>
            Analyzing{" "}
            <span className="text-foreground font-medium">
              {activeResume.resume_name || activeResume.filename}
            </span>
          </p>
          <div className="flex-1 overflow-y-auto">
            <SkillGapAnalysisComponent resumeId={activeResume.resume_id} />
          </div>
        </>
      )}
    </div>
  );
}
