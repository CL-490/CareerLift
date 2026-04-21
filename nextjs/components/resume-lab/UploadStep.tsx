"use client";

import type { DragEvent } from "react";
import ImportedDetailsDrawer from "@/components/resume-lab/ImportedDetailsDrawer";
import ResumeLabStepPanel from "@/components/resume-lab/ResumeLabStepPanel";
import ResumeCarousel from "@/components/ResumeCarousel";
import type { UploadResult } from "@/components/resume-lab/types";
import type { Resume } from "@/components/job-finder/types";

interface UploadStepProps {
  file: File | null;
  uploading: boolean;
  error: string | null;
  result: UploadResult | null;
  dragActive: boolean;
  allowedExtensions: string[];
  personNameInput: string;
  resumeNameInput: string;
  existingResumes: Resume[];
  loadingExisting: boolean;
  selectingExistingId: string | null;
  existingError: string | null;
  onPersonNameChange: (value: string) => void;
  onResumeNameChange: (value: string) => void;
  onDrag: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFileSelect: (file: File) => void;
  onUpload: () => void;
  onContinue: () => void;
  onSelectExisting: (resumeId: string) => void;
}

export default function UploadStep({
  file,
  uploading,
  error,
  result,
  dragActive,
  allowedExtensions,
  personNameInput,
  resumeNameInput,
  existingResumes,
  loadingExisting,
  selectingExistingId,
  existingError,
  onPersonNameChange,
  onResumeNameChange,
  onDrag,
  onDrop,
  onFileSelect,
  onUpload,
  onContinue,
  onSelectExisting,
}: UploadStepProps) {
  const importedName =
    result?.graph_data.person.name ||
    result?.resume_name ||
    resumeNameInput ||
    "your resume";
  const detailCounts = result
    ? [
        { label: "Skills", value: result.graph_data.skills.length },
        { label: "Experience", value: result.graph_data.experiences.length },
        { label: "Education", value: result.graph_data.education.length },
        {
          label: "Saved Jobs",
          value: result.graph_data.saved_jobs?.length ?? 0,
        },
      ]
    : [];

  return (
    <ResumeLabStepPanel
      title="Select"
      description="Pick one of your existing resumes or upload a new file. Either path leads to the same edit, preview, and graph steps."
    >
      <div className="card hover-ring lab-surface mb-4">
        <div className="mb-4">
          <h3 className="text-[20px] font-medium">Use an Existing Resume</h3>
          <p className="mt-2 text-[14px] text-muted">
            Pick one of the resumes already imported into your library. Click a
            card to load it straight into the editor.
          </p>
        </div>

        {loadingExisting ? (
          <p className="text-[14px] text-muted">Loading your resumes…</p>
        ) : existingResumes.length === 0 ? (
          <p className="text-[14px] text-muted">
            No existing resumes yet — upload one below to get started.
          </p>
        ) : (
          <ResumeCarousel
            resumes={existingResumes}
            selectedResumeId={selectingExistingId}
            onSelect={onSelectExisting}
            busyResumeId={selectingExistingId}
          />
        )}

        {existingError && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-[14px] text-red-400">
            {existingError}
          </div>
        )}
      </div>

      <div className="card hover-ring lab-surface">
        <div className="mb-4">
          <h3 className="text-[20px] font-medium">Upload a New Resume</h3>
          <p className="mt-2 text-[14px] text-muted">
            Import a fresh resume file to extract career details and prepare it
            for editing, previewing, and graph analysis.
          </p>
        </div>

        <div
          className={`dropzone rounded-lg border-2 p-8 ${
            dragActive ? "border-[var(--accent)] bg-[var(--accent)]/10" : ""
          }`}
          onDragEnter={onDrag}
          onDragLeave={onDrag}
          onDragOver={onDrag}
          onDrop={onDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <svg
              className="h-12 w-12 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>

            <div>
              <label className="cursor-pointer">
                <span className="font-medium text-accent hover:text-foreground">
                  Click to upload
                </span>
                <span className="text-muted"> or drag and drop</span>
                <input
                  type="file"
                  className="hidden"
                  accept={allowedExtensions.join(",")}
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) onFileSelect(selected);
                  }}
                />
              </label>
            </div>

            <div className="mt-2 w-full">
              <label
                htmlFor="resume-lab-person-name"
                className="form-label text-left"
              >
                Person name
              </label>
              <input
                id="resume-lab-person-name"
                type="text"
                className="form-control w-full rounded-lg p-2"
                placeholder="Optional, leave blank to use the extracted name"
                aria-describedby="resume-lab-person-name-help"
                value={personNameInput}
                onChange={(e) => onPersonNameChange(e.target.value)}
              />
              <p
                id="resume-lab-person-name-help"
                className="form-helper text-left"
              >
                Override the extracted person name only if the upload got it
                wrong.
              </p>

              <label
                htmlFor="resume-lab-resume-name"
                className="form-label mt-3 text-left"
              >
                Resume name <span className="text-red-400">*</span>
              </label>
              <input
                id="resume-lab-resume-name"
                type="text"
                required
                className={`form-control w-full rounded-lg p-2 ${
                  file && !resumeNameInput.trim()
                    ? "border border-red-500/40"
                    : ""
                }`}
                placeholder="Spring 2026 software engineering resume"
                aria-describedby="resume-lab-resume-name-help"
                value={resumeNameInput}
                onChange={(e) => onResumeNameChange(e.target.value)}
              />
              <p
                id="resume-lab-resume-name-help"
                className={`form-helper text-left ${
                  file && !resumeNameInput.trim() ? "text-red-400" : ""
                }`}
              >
                {file && !resumeNameInput.trim()
                  ? "A resume name is required before processing."
                  : "Give this version a clear label so it is easier to find later."}
              </p>
            </div>

            <p className="text-[13px] text-muted">
              Supported formats: TXT, MD, PDF, DOC, DOCX
            </p>

            {file && (
              <div className="mt-2 text-[14px] text-[var(--tone-success-text)]">
                Selected: {file.name}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-[14px] text-red-400">
            {error}
          </div>
        )}

        {file && !uploading && (
          <button
            type="button"
            onClick={onUpload}
            disabled={!resumeNameInput.trim()}
            className="jf-btn jf-btn-primary mt-4 w-full px-4 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resumeNameInput.trim() ? "Process Resume" : "Add a resume name to continue"}
          </button>
        )}

        {uploading && (
          <div className="mt-4 text-center text-[14px] text-muted">
            Processing your resume...
          </div>
        )}
      </div>

      {result && (
        <div className="card-3d lab-panel-success p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-[var(--tone-success-text)]">
                Import complete
              </p>
              <h3 className="mt-2 text-[22px] font-semibold text-foreground">
                {importedName}
              </h3>
              <p className="mt-2 max-w-2xl text-[14px] text-muted">
                Your upload is ready for editing. Parsed details stay available
                below when you want to inspect the raw import.
              </p>

              {detailCounts.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {detailCounts.map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex rounded-full border border-[var(--tone-success-border)] bg-[var(--tone-success-bg)] px-3 py-1 text-[12px] font-medium text-foreground"
                    >
                      {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onContinue}
              className="jf-btn jf-btn-primary px-4 py-2"
            >
              Continue to Edit
            </button>
          </div>
        </div>
      )}

      {result && <ImportedDetailsDrawer result={result} />}
    </ResumeLabStepPanel>
  );
}
