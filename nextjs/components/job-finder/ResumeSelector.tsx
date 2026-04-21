import { useState } from "react";
import type { Resume } from "@/components/job-finder/types";
import { asString } from "@/lib/jobFinderApi";

interface ResumeSelectorProps {
  availableResumes: Resume[];
  selectedResume: Resume | null;
  onChange: (resumeId: string) => void;
  onDelete: (resumeId: string) => Promise<void>;
  onDeleteAll: () => Promise<void>;
}

export default function ResumeSelector({
  availableResumes,
  selectedResume,
  onChange,
  onDelete,
  onDeleteAll,
}: ResumeSelectorProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const handleDeleteClick = () => setConfirmingDelete(true);
  const handleCancelDelete = () => setConfirmingDelete(false);
  const handleConfirmDelete = async () => {
    if (!selectedResume) return;
    setDeleting(true);
    try {
      await onDelete(selectedResume.resume_id);
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const handleDeleteAllClick = () => setConfirmingDeleteAll(true);
  const handleCancelDeleteAll = () => setConfirmingDeleteAll(false);
  const handleConfirmDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await onDeleteAll();
    } finally {
      setDeletingAll(false);
      setConfirmingDeleteAll(false);
    }
  };
  return (
    <div className="surface-strong mb-6 rounded-2xl p-4">
      <label className="mb-2 block text-sm font-medium">
        Select Resume{" "}
        <span className="text-xs font-normal text-muted">
          (optional - for ATS scoring)
        </span>
        :
      </label>
      <div className="flex items-center gap-2">
        <select
          value={selectedResume?.resume_id ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-2xl border border-[var(--border-strong)] px-4 py-2"
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
        {availableResumes.length > 0 && (
          confirmingDeleteAll ? (
            <div className="flex shrink-0 items-center gap-2 text-xs">
              <span className="text-red-400 whitespace-nowrap">Remove all?</span>
              <button
                onClick={handleConfirmDeleteAll}
                disabled={deletingAll}
                className="rounded px-2 py-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
              >
                {deletingAll ? "Removing…" : "Yes, remove all"}
              </button>
              <button
                onClick={handleCancelDeleteAll}
                disabled={deletingAll}
                className="rounded px-2 py-1 bg-(--border-color) text-muted hover:opacity-80"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleDeleteAllClick}
              title="Remove all resumes"
              className="shrink-0 rounded px-3 py-1 text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:text-red-300 whitespace-nowrap"
            >
              Remove all
            </button>
          )
        )}
      </div>
      {selectedResume ? (
        <div className="panel-cyan mt-3 rounded-xl p-3">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-blue-300">
              Selected Resume: <strong>{selectedResume.resume_name}</strong>
            </p>
            {confirmingDelete ? (
              <div className="flex shrink-0 items-center gap-2 text-xs">
                <span className="text-red-400">Remove this resume?</span>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="rounded px-2 py-0.5 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Removing…" : "Yes, remove"}
                </button>
                <button
                  onClick={handleCancelDelete}
                  disabled={deleting}
                  className="rounded px-2 py-0.5 bg-(--border-color) text-muted hover:opacity-80"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleDeleteClick}
                title="Remove resume"
                className="shrink-0 rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                Remove
              </button>
            )}
          </div>
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
