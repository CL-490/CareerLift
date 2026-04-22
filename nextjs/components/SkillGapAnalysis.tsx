"use client";

import { useState, useEffect } from "react";
import { getSkillGapAnalysis } from "@/lib/jobFinderApi";

interface SkillGapItem {
  skill: string;
  frequency: number;
  importance: string;
}

interface SkillAnalysis {
  matched_skills: string[];
  missing_required_skills: SkillGapItem[];
  missing_preferred_skills: SkillGapItem[];
  all_job_skills: string[];
  average_ats_score: number;
  job_count: number;
}

interface SkillGapData {
  resume_id: string;
  resume_name: string;
  skill_analysis: SkillAnalysis;
  recommendations: string[];
  summary: {
    total_saved_jobs: number;
    average_ats_score: number;
    matched_skills_count: number;
    missing_required_skills_count: number;
    missing_preferred_skills_count: number;
    critical_skills_to_learn: string[];
  };
}

interface SkillGapAnalysisProps {
  resumeId: string;
}

export default function SkillGapAnalysisComponent({ resumeId }: SkillGapAnalysisProps) {
  const [data, setData] = useState<SkillGapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    matched: true,
    required: true,
    preferred: true,
    recommendations: true,
  });

  useEffect(() => {
    const fetchSkillGapAnalysis = async () => {
      try {
        setLoading(true);
        const analysisData: SkillGapData = await getSkillGapAnalysis(resumeId);
        setData(analysisData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    if (resumeId) {
      fetchSkillGapAnalysis();
    }
  }, [resumeId]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
    <span className="text-muted">{isOpen ? "▼" : "►"}</span>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-32 rounded bg-[var(--panel-bg)]"></div>
          <div className="h-4 w-full rounded bg-[var(--panel-bg)]"></div>
          <div className="h-4 w-3/4 rounded bg-[var(--panel-bg)]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    const isNoJobs = error.toLowerCase().includes("no saved jobs") || error.includes("400");
    if (isNoJobs) {
      return (
        <div className="flex items-center gap-3 rounded-lg border border-(--border-color) p-4">
          <div className="text-xl">📊</div>
          <div>
            <p className="text-sm font-medium">No saved jobs to analyze</p>
            <p className="text-xs text-muted">
              Save some jobs from the Job Finder to see your skill gap analysis here.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="text-xl">⚠️</div>
        <div>
          <p className="text-sm font-medium text-red-400">Unable to load analysis</p>
          <p className="text-xs text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const noSkillsExtracted =
    data.skill_analysis.matched_skills.length === 0 &&
    data.skill_analysis.missing_required_skills.length === 0 &&
    data.skill_analysis.missing_preferred_skills.length === 0 &&
    data.skill_analysis.all_job_skills.length === 0;

  if (noSkillsExtracted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-(--border-color) p-4">
          <div className="text-xl">📊</div>
          <div>
            <p className="text-sm font-medium">Not enough data for skill analysis</p>
            <p className="text-xs text-muted">
              Your saved jobs have brief descriptions without specific skill requirements.
              Save jobs with detailed descriptions (common in tech/engineering postings) for a meaningful analysis.
            </p>
          </div>
        </div>
        {data.recommendations.length > 0 && (
          <div className="rounded-lg border border-(--border-color) p-4">
            <h4 className="text-sm font-semibold mb-2">General Recommendations</h4>
            <ul className="space-y-2 text-xs text-muted">
              {data.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "critical":
        return "bg-red-500/15 text-red-300 border-red-500/30";
      case "high":
        return "bg-orange-500/15 text-orange-300 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
      default:
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    }
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case "critical":
        return "🔴";
      case "high":
        return "🟠";
      case "medium":
        return "🟡";
      default:
        return "🔵";
    }
  };

  const getRequiredImportanceColor = (importance: string) => {
    switch (importance) {
      case "critical":
        return "bg-red-500/15 text-red-300 border-red-500/30";
      case "high":
      case "medium":
        return "bg-orange-500/15 text-orange-300 border-orange-500/30";
      default:
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    }
  };

  const getRequiredImportanceBadge = (importance: string) => {
    switch (importance) {
      case "critical":
        return "🔴";
      case "high":
      case "medium":
        return "🟠";
      default:
        return "🔵";
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-lg border border-(--border-color) px-2 py-2 text-center">
          <p className="text-lg font-bold tabular-nums">
            {data.summary.average_ats_score}
          </p>
          <p className="text-[10px] uppercase leading-tight tracking-wide text-muted">
            Avg ATS
          </p>
        </div>
        <div className="rounded-lg border border-(--border-color) px-2 py-2 text-center">
          <p className="text-lg font-bold tabular-nums">
            {data.summary.total_saved_jobs}
          </p>
          <p className="text-[10px] uppercase leading-tight tracking-wide text-muted">
            Jobs
          </p>
        </div>
        <div className="rounded-lg border border-(--border-color) px-2 py-2 text-center">
          <p className="text-lg font-bold tabular-nums">
            {data.summary.matched_skills_count}
          </p>
          <p className="text-[10px] uppercase leading-tight tracking-wide text-muted">
            Matched
          </p>
        </div>
        <div className="rounded-lg border border-(--border-color) px-2 py-2 text-center">
          <p className="text-lg font-bold tabular-nums">
            {data.summary.missing_required_skills_count}
          </p>
          <p className="text-[10px] uppercase leading-tight tracking-wide text-muted">
            To Learn
          </p>
        </div>
      </div>

      {/* Matched Skills Section */}
      <div className="rounded-lg border border-(--border-color)">
        <button
          type="button"
          onClick={() => toggleSection("matched")}
          className="flex w-full items-center justify-between p-3"
        >
          <div className="flex items-center gap-2">
            <span>✅</span>
            <h3 className="text-sm font-semibold">
              Matched Skills ({data.summary.matched_skills_count})
            </h3>
          </div>
          <ChevronIcon isOpen={expandedSections.matched} />
        </button>

        {expandedSections.matched && (
          <div className="border-t border-(--border-color) p-3">
            {data.skill_analysis.matched_skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {data.skill_analysis.matched_skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md border border-green-500/30 bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">No matched skills found</p>
            )}
          </div>
        )}
      </div>

      {/* Missing Required Skills Section */}
      <div className="rounded-lg border border-(--border-color)">
        <button
          type="button"
          onClick={() => toggleSection("required")}
          className="flex w-full items-center justify-between p-3"
        >
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <h3 className="text-sm font-semibold">
              Required Skills to Learn ({data.summary.missing_required_skills_count})
            </h3>
          </div>
          <ChevronIcon isOpen={expandedSections.required} />
        </button>

        {expandedSections.required && (
          <div className="border-t border-(--border-color) p-3">
            {data.skill_analysis.missing_required_skills.length > 0 ? (
              <ul className="space-y-1.5">
                {data.skill_analysis.missing_required_skills.map((item) => (
                  <li
                    key={item.skill}
                    className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 ${getRequiredImportanceColor(
                      item.importance
                    )}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="text-xs">
                        {getRequiredImportanceBadge(item.importance)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{item.skill}</p>
                        <p className="text-[11px] opacity-75">
                          Required by {item.frequency} of {data.skill_analysis.job_count} jobs (
                          {((item.frequency / data.skill_analysis.job_count) * 100).toFixed(0)}%)
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold">{item.frequency}x</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-green-400">Great! You have all required skills.</p>
            )}
          </div>
        )}
      </div>

      {/* Missing Preferred Skills Section */}
      <div className="rounded-lg border border-(--border-color)">
        <button
          type="button"
          onClick={() => toggleSection("preferred")}
          className="flex w-full items-center justify-between p-3"
        >
          <div className="flex items-center gap-2">
            <span>💡</span>
            <h3 className="text-sm font-semibold">
              Bonus Skills ({data.summary.missing_preferred_skills_count})
            </h3>
          </div>
          <ChevronIcon isOpen={expandedSections.preferred} />
        </button>

        {expandedSections.preferred && (
          <div className="border-t border-(--border-color) p-3">
            {data.skill_analysis.missing_preferred_skills.length > 0 ? (
              <ul className="space-y-1.5">
                {data.skill_analysis.missing_preferred_skills
                  .slice(0, 10)
                  .map((item) => (
                    <li
                      key={item.skill}
                      className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 ${getImportanceColor(
                        item.importance
                      )}`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-xs">
                          {getImportanceBadge(item.importance)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{item.skill}</p>
                          <p className="text-[11px] opacity-75">
                            Preferred by {item.frequency} of {data.skill_analysis.job_count} jobs
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold">{item.frequency}x</span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">
                No preferred skills identified — you&rsquo;re well-covered!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Recommendations Section */}
      <div className="rounded-lg border border-(--border-color)">
        <button
          type="button"
          onClick={() => toggleSection("recommendations")}
          className="flex w-full items-center justify-between p-3"
        >
          <div className="flex items-center gap-2">
            <span>📈</span>
            <h3 className="text-sm font-semibold">Learning Recommendations</h3>
          </div>
          <ChevronIcon isOpen={expandedSections.recommendations} />
        </button>

        {expandedSections.recommendations && (
          <div className="border-t border-(--border-color) p-3">
            {data.recommendations.length > 0 ? (
              <ul className="space-y-2">
                {data.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-2 text-xs text-foreground">
                    <span>💬</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">No specific recommendations at this time.</p>
            )}
          </div>
        )}
      </div>

      {/* Critical Skills Callout */}
      {data.summary.critical_skills_to_learn.length > 0 && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-300">
            <span>🎯</span>
            Priority Skills to Master
          </h4>
          <p className="mb-2 text-xs text-red-300/80">
            These skills are essential for success in your target roles:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.summary.critical_skills_to_learn.map((skill) => (
              <span
                key={skill}
                className="rounded-md border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
