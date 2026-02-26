import React from "react";

interface Props {
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
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function PdfViewer({
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

  // Show uploaded PDF via iframe (unchanged fallback)
  if (showUploaded && uploadedFileUrl) {
    return (
      <div className="card hover-ring card-hue mb-6">
        <h2 className="text-[20px] font-medium mb-3">PDF Preview</h2>
        <iframe
          src={uploadedFileUrl}
          className="w-full rounded-lg border border-[var(--border-color)]"
          style={{ height: "800px" }}
          title="Uploaded PDF Preview"
        />
      </div>
    );
  }

  if (!previewImageUrl) {
    return (
      <div className="card hover-ring card-hue mb-6">
        <h2 className="text-[20px] font-medium mb-3">PDF Preview</h2>
        <div className="flex items-center justify-center h-[400px] text-muted text-[14px] border-2 border-dashed border-[var(--border-color)] rounded-lg">
          {isRecompiling ? (
            <div className="flex items-center gap-2">
              <Spinner className="w-5 h-5" />
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
    <div className="card hover-ring card-hue mb-6">
      {/* Header: title + page nav + download */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[20px] font-medium">PDF Preview</h2>
        {onDownloadPdf && (
          <button
            onClick={onDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
          >
            {downloadingPdf ? (
              <>
                <Spinner className="w-3.5 h-3.5" />
                Downloading...
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5"
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

      {/* Page navigation bar */}
      {hasMultiplePages && (
        <div className="flex items-center justify-center gap-3 mb-3">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={!canPrev || isRecompiling}
            className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--background-alt)/20] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-[13px] text-muted tabular-nums">
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={!canNext || isRecompiling}
            className="p-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--background-alt)/20] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Preview image */}
      <div className="relative">
        {isRecompiling && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-blue-600/90 text-white text-[12px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
            <Spinner className="w-3.5 h-3.5" />
            Updating...
          </div>
        )}
        <div className="bg-white rounded-lg border border-[var(--border-color)] overflow-hidden">
          <img
            src={previewImageUrl}
            alt={`Resume preview — page ${currentPage + 1}`}
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}
