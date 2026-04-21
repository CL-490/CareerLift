import React from "react";

interface Props {
  variant?: "compact" | "full";
  previewImageUrl: string | null;
  pageCount?: number;
  currentPage?: number;
  uploadedFileUrl?: string | null;
  showUploaded?: boolean;
  isRecompiling?: boolean;
  onDownloadPdf?: () => void;
  downloadingPdf?: boolean;
  onPageChange?: (page: number) => void;
}

function Spinner({ className }: { className: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function PdfViewer({
  variant = "full",
  previewImageUrl,
  pageCount = 0,
  currentPage = 0,
  uploadedFileUrl,
  showUploaded,
  isRecompiling,
  onDownloadPdf,
  downloadingPdf,
  onPageChange,
}: Props) {
  const hasMultiplePages = pageCount > 1;
  const canPrev = currentPage > 0;
  const canNext = currentPage < pageCount - 1;
  const titleClass = variant === "compact" ? "text-[18px]" : "text-[20px]";
  const frameHeight = variant === "compact" ? "560px" : "800px";
  const placeholderHeight =
    variant === "compact" ? "h-[320px]" : "h-[400px]";
  const buttonClass =
    variant === "compact"
      ? "px-3 py-1.5 text-[12px]"
      : "px-3 py-1.5 text-[13px]";

  if (showUploaded && uploadedFileUrl) {
    return (
      <div className="card hover-ring lab-surface">
        <h2 className={`${titleClass} mb-3 font-medium`}>PDF Preview</h2>
        <iframe
          src={uploadedFileUrl}
          className="w-full rounded-lg border border-[var(--border-color)]"
          style={{ height: frameHeight }}
          title="Uploaded PDF Preview"
        />
      </div>
    );
  }

  if (!previewImageUrl) {
    return (
      <div className="card hover-ring lab-surface">
        <h2 className={`${titleClass} mb-3 font-medium`}>PDF Preview</h2>
        <div
          className={`flex ${placeholderHeight} items-center justify-center rounded-lg border-2 border-dashed border-[var(--border-color)] text-[14px] text-muted`}
        >
          {isRecompiling ? (
            <div className="flex items-center gap-2">
              <Spinner className="h-5 w-5" />
              Compiling your resume...
            </div>
          ) : (
            "Select a template and compile to preview your resume"
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card hover-ring lab-surface">
      <div className="mb-3 flex items-center justify-between">
        <h2 className={`${titleClass} font-medium`}>PDF Preview</h2>
        {onDownloadPdf && (
          <button
            onClick={onDownloadPdf}
            disabled={downloadingPdf}
            className={`jf-btn jf-btn-primary ${buttonClass}`}
          >
            {downloadingPdf ? (
              <>
                <Spinner className="h-3.5 w-3.5" />
                Downloading...
              </>
            ) : (
              <>
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download PDF
              </>
            )}
          </button>
        )}
      </div>

      {hasMultiplePages && (
        <div className="mb-3 flex items-center justify-center gap-3">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={!canPrev || isRecompiling}
            className="rounded-lg border border-[var(--border-color)] p-1.5 transition-colors hover:bg-[var(--background-alt)/20] disabled:cursor-not-allowed disabled:opacity-30"
            title="Previous page"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-[13px] tabular-nums text-muted">
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={!canNext || isRecompiling}
            className="rounded-lg border border-[var(--border-color)] p-1.5 transition-colors hover:bg-[var(--background-alt)/20] disabled:cursor-not-allowed disabled:opacity-30"
            title="Next page"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      <div className="relative">
        {isRecompiling && (
          <div className="notice-banner notice-info absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium backdrop-blur-sm">
            <Spinner className="h-3.5 w-3.5" />
            Updating...
          </div>
        )}
        <div className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-white">
          <img
            src={previewImageUrl}
            alt={`Resume preview — page ${currentPage + 1}`}
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}
