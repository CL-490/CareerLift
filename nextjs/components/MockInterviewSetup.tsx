"use client";

import { useEffect, useState } from "react";
import { listResumes, getSavedJobs, SavedJobInfo, asString } from "@/lib/jobFinderApi";
import type { Resume } from "@/components/job-finder/types";

const ROLE_LEVELS = ["entry", "mid", "senior"];

interface MockInterviewSetupProps {
  onStartInterview?: (resumeName: string, roleTitle: string, level: string) => void;
}

export default function MockInterviewSetup({ onStartInterview }: MockInterviewSetupProps) {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJobInfo[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>("entry");
  const [selectedJob, setSelectedJob] = useState<SavedJobInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Load resumes on mount
  useEffect(() => {
    const loadResumes = async () => {
      try {
        const data = await listResumes();
        setResumes(data);
        if (data.length > 0) {
          setSelectedResume(data[0]);
        }
      } catch (error) {
        console.error("Failed to load resumes:", error);
      } finally {
        setLoading(false);
      }
    };
    loadResumes();
  }, []);

  // Load saved jobs when selected resume changes
  useEffect(() => {
    if (!selectedResume) return;

    const loadJobs = async () => {
      setJobsLoading(true);
      try {
        const data = await getSavedJobs(selectedResume.resume_id);
        setSavedJobs(data.jobs);
        if (data.jobs.length > 0) {
          setSelectedJob(data.jobs[0]);
        } else {
          setSelectedJob(null);
        }
      } catch (error) {
        console.error("Failed to load saved jobs:", error);
        setSavedJobs([]);
      } finally {
        setJobsLoading(false);
      }
    };

    loadJobs();
  }, [selectedResume]);

  const handleStartInterview = () => {
    if (!selectedResume || !selectedJob) {
      alert("Please select a resume and a job role");
      return;
    }
    onStartInterview?.(selectedResume.resume_name, selectedJob.job_title, selectedLevel);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-400">Loading resumes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resume Selection */}
      <div>
        <label className="block text-sm font-semibold text-slate-400 mb-3">
          Select Resume
        </label>
        {resumes.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            No resumes found. Please create a resume first.
          </div>
        ) : (
          <select
            value={selectedResume?.resume_id ?? ""}
            onChange={(e) => {
              const resumeId = e.target.value;
              const resume = resumes.find((r) => r.resume_id === resumeId);
              setSelectedResume(resume || null);
            }}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 bg-white text-slate-800 outline-none hover:opacity-80 focus:border-blue-500 transition-colors"
          >
            <option value="">-- Select a resume --</option>
            {resumes.map((resume) => (
              <option key={resume.resume_id} value={resume.resume_id}>
                {resume.resume_name} ({asString(resume.person_name)})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Role Level Selection */}
      <div>
        <label className="block text-sm font-semibold text-slate-400 mb-3">
          Target Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ROLE_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className="p-3 border-2 rounded-lg font-medium transition-all capitalize text-sm"
              style={{
                borderColor: selectedLevel === level ? "#3b82f6" : "#e2e8f0",
                backgroundColor: selectedLevel === level ? "#3b82f6" : "white",
                color: selectedLevel === level ? "white" : "#1e293b",
              }}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Job Role Selection */}
      <div>
        <label className="block text-sm font-semibold text-slate-400 mb-3">
          Select Job Role
        </label>
        {jobsLoading ? (
          <div className="p-4 text-center text-slate-400 text-sm">
            Loading saved jobs...
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
            No saved jobs. Save a job from the Job Finder to practice interviewing for specific roles.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {savedJobs.map((job, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedJob(job)}
                className="w-full text-left p-4 border-2 rounded-lg transition-all"
                style={{
                  borderColor: selectedJob === job ? "#3b82f6" : "#e2e8f0",
                  backgroundColor: selectedJob === job ? "#eff6ff" : "white",
                }}
              >
                <div className="font-medium text-slate-400">{job.job_title}</div>
                <div className="text-sm text-slate-400">
                  {job.company && <span>{job.company}</span>}
                  {job.company && job.location && <span> • </span>}
                  {job.location && <span>{job.location}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Start Interview Button */}
      <button
        onClick={handleStartInterview}
        disabled={!selectedResume || !selectedJob}
        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Start Interview
      </button>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-2">💡 Interview Tips:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Select a resume you want to practice with</li>
          <li>Choose the level you're targeting for this role</li>
          <li>Pick a saved job to practice interviewing for</li>
          <li>Answer questions authentically to get accurate feedback</li>
        </ul>
      </div>
    </div>
  );
}
