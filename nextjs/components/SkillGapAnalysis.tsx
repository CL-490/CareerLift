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
          <div className="text-2xl">📊</div>
          <div>
            <p className="font-medium">No saved jobs to analyze</p>
            <p className="text-sm text-muted">
              Save some jobs from the Job Finder to see your skill gap analysis here.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="text-2xl">⚠️</div>
        <div>
          <p className="font-medium text-red-400">Unable to load analysis</p>
          <p className="text-sm text-red-300">{error}</p>
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
          <div className="text-2xl">📊</div>
          <div>
            <p className="font-medium">Not enough data for skill analysis</p>
            <p className="text-sm text-muted">
              Your saved jobs have brief descriptions without specific skill requirements.
              Save jobs with detailed descriptions (common in tech/engineering postings) for a meaningful analysis.
            </p>
          </div>
        </div>
        {data.recommendations.length > 0 && (
          <div className="rounded-lg border border-(--border-color) p-4">
            <h4 className="font-medium mb-2">General Recommendations</h4>
            <ul className="space-y-2 text-sm text-muted">
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
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      default:
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
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

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="panel-cyan rounded-lg border p-4">
          <p className="text-sm text-muted">Avg ATS Score</p>
          <p className="mt-2 flex items-baseline gap-1 text-3xl font-bold">
            <span className="text-[var(--tone-info-text)]">{data.summary.average_ats_score}</span>
            <span className="text-sm text-muted">/100</span>
          </p>
        </div>

        <div className="lab-panel-success rounded-lg p-4">
          <p className="text-sm text-muted">Analyzed Jobs</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {data.summary.total_saved_jobs}
          </p>
        </div>

        <div className="lab-panel-success rounded-lg p-4">
          <p className="text-sm text-muted">Matched Skills</p>
          <p className="mt-2 text-3xl font-bold text-green-400">
            {data.summary.matched_skills_count}
          </p>
        </div>

        <div className="card-tone-amber rounded-lg border p-4">
          <p className="text-sm text-muted">Skills to Learn</p>
          <p className="mt-2 text-3xl font-bold text-yellow-400">
            {data.summary.missing_required_skills_count}
          </p>
        </div>
      </div>

      {/* Matched Skills Section */}
      <div className="lab-panel-success rounded-lg">
        <button
          onClick={() => toggleSection("matched")}
          className="flex w-full items-center justify-between p-4 hover:bg-[var(--selection-hover-bg)]"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <h3 className="text-lg font-semibold text-green-400">
              Matched Skills ({data.summary.matched_skills_count})
            </h3>
          </div>
          {expandedSections.matched ? (
            <ChevronIcon isOpen={true} />
          ) : (
            <ChevronIcon isOpen={false} />
          )}
        </button>

        {expandedSections.matched && (
          <div className="border-t border-[var(--border-color)] p-4">
            {data.skill_analysis.matched_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.skill_analysis.matched_skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-300 border border-green-500/30"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted">No matched skills found</p>
            )}
          </div>
        )}
      </div>

      {/* Missing Required Skills Section */}
      <div className="card-tone-amber rounded-lg border">
        <button
          onClick={() => toggleSection("required")}
          className="flex w-full items-center justify-between p-4 hover:bg-[var(--selection-hover-bg)]"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <h3 className="text-lg font-semibold text-orange-400">
              Required Skills to Learn ({data.summary.missing_required_skills_count})
            </h3>
          </div>
          {expandedSections.required ? (
            <ChevronIcon isOpen={true} />
          ) : (
            <ChevronIcon isOpen={false} />
          )}
        </button>

        {expandedSections.required && (
          <div className="border-t border-[var(--border-color)] p-4">
            {data.skill_analysis.missing_required_skills.length > 0 ? (
              <div className="space-y-2">
                {data.skill_analysis.missing_required_skills.map((item) => (
                  <div
                    key={item.skill}
                    className={`flex items-center justify-between rounded-lg border p-3 ${getImportanceColor(
                      item.importance
                    )}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {getImportanceBadge(item.importance)}
                      </span>
                      <div>
                        <p className="font-medium">{item.skill}</p>
                        <p className="text-xs opacity-75">
                          Required by {item.frequency} of {data.skill_analysis.job_count} jobs
                          ({((item.frequency / data.skill_analysis.job_count) * 100).toFixed(0)}%)
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{item.frequency}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-green-400">Great! You have all required skills.</p>
            )}
          </div>
        )}
      </div>

      {/* Missing Preferred Skills Section */}
      <div className="panel-cyan rounded-lg border">
        <button
          onClick={() => toggleSection("preferred")}
          className="flex w-full items-center justify-between p-4 hover:bg-[var(--selection-hover-bg)]"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💡</span>
            <h3 className="text-lg font-semibold text-[var(--tone-info-text)]">
              Bonus Skills ({data.summary.missing_preferred_skills_count})
            </h3>
          </div>
          {expandedSections.preferred ? (
            <ChevronIcon isOpen={true} />
          ) : (
            <ChevronIcon isOpen={false} />
          )}
        </button>

        {expandedSections.preferred && (
          <div className="border-t border-[var(--border-color)] p-4">
            {data.skill_analysis.missing_preferred_skills.length > 0 ? (
              <div className="space-y-2">
                {data.skill_analysis.missing_preferred_skills
                  .slice(0, 10)
                  .map((item) => (
                    <div
                      key={item.skill}
                      className={`flex items-center justify-between rounded-lg border p-3 ${getImportanceColor(
                        item.importance
                      )}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {getImportanceBadge(item.importance)}
                        </span>
                        <div>
                          <p className="font-medium">{item.skill}</p>
                          <p className="text-xs opacity-75">
                            Preferred by {item.frequency} of {data.skill_analysis.job_count} jobs
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">{item.frequency}x</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-[var(--tone-info-text)]">
                No preferred skills identified - you're well-covered!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Recommendations Section */}
      <div className="lab-panel-ai rounded-lg">
        <button
          onClick={() => toggleSection("recommendations")}
          className="flex w-full items-center justify-between p-4 hover:bg-[var(--selection-hover-bg)]"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📈</span>
            <h3 className="text-lg font-semibold text-[color:color-mix(in_oklab,var(--foreground)_78%,#8c74bf)]">
              Learning Recommendations
            </h3>
          </div>
          {expandedSections.recommendations ? (
            <ChevronIcon isOpen={true} />
          ) : (
            <ChevronIcon isOpen={false} />
          )}
        </button>

        {expandedSections.recommendations && (
          <div className="border-t border-[var(--border-color)] p-4">
            {data.recommendations.length > 0 ? (
              <ul className="space-y-3">
                {data.recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="lab-panel-ai flex gap-3 rounded-lg p-3 text-sm text-foreground"
                  >
                    <span className="text-lg">💬</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No specific recommendations at this time.</p>
            )}
          </div>
        )}
      </div>

      {/* Critical Skills Callout */}
      {data.summary.critical_skills_to_learn.length > 0 && (
        <div className="rounded-lg border-2 border-red-500/50 bg-red-500/10 p-4">
          <h4 className="mb-2 flex items-center gap-2 font-semibold text-red-400">
            <span className="text-xl">🎯</span>
            Priority Skills to Master
          </h4>
          <p className="mb-3 text-sm text-red-300">
            These skills are essential for success in your target roles:
          </p>
          <div className="flex flex-wrap gap-2">
            {data.summary.critical_skills_to_learn.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-300 border border-red-500/50"
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
