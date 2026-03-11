import type { Resume } from "@/components/job-finder/types";
import { asString } from "@/lib/jobFinderApi";

interface ResumeSelectorProps {
  availableResumes: Resume[];
  selectedResume: Resume | null;
  onChange: (resumeId: string) => void;
}

export default function ResumeSelector({
  availableResumes,
  selectedResume,
  onChange,
}: ResumeSelectorProps) {
  return (
    <div className="mb-6 rounded-2xl border border-[var(--border-color)] p-4 surface">
      <label className="mb-2 block text-sm font-medium">
        Select Resume{" "}
        <span className="text-xs font-normal text-muted">
          (optional - for ATS scoring)
        </span>
        :
      </label>
      <select
        value={selectedResume?.resume_id ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border px-4 py-2"
      >
        <option value="">
          {availableResumes.length === 0
            ? "No resumes uploaded yet"
            : "None (browse all jobs)"}
        </option>
        {availableResumes.map((resume) => (
          <option key={resume.resume_id} value={resume.resume_id}>
            {resume.resume_name} ({asString(resume.person_name)})
          </option>
        ))}
      </select>
      {selectedResume ? (
        <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
          <p className="mb-1 text-sm font-medium text-blue-300">
            Selected Resume: <strong>{selectedResume.resume_name}</strong>
          </p>
          <div className="flex items-center gap-4 text-xs text-muted">
            <span>{asString(selectedResume.person_name)}</span>
            {selectedResume.created_at && (
              <span>
                Added:{" "}
                {new Date(selectedResume.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">
          Select a resume to see ATS scores for each job posting
        </p>
      )}
    </div>
  );
}
