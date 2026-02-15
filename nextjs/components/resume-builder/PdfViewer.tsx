import React from "react";

interface Props {
  previewImageUrl: string | null;
  pageCount?: number;
  uploadedFileUrl?: string | null;
  showUploaded?: boolean;
  isRecompiling?: boolean;
  onDownloadPdf?: () => void;
  downloadingPdf?: boolean;
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
  pageCount,
  uploadedFileUrl,
  showUploaded,
  isRecompiling,
  onDownloadPdf,
  downloadingPdf,
}: Props) {
  // Show uploaded PDF via iframe (unchanged fallback)
  if (showUploaded && uploadedFileUrl) {
    return (
      <div className="card hover-ring card-hue mb-6">
        <h2 className="text-[20px] font-medium mb-3">PDF Preview</h2>
        <iframe
          src={uploadedFileUrl}
          className="w-full rounded-lg border border-[rgba(255,255,255,0.14)]"
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
        <div className="flex items-center justify-center h-[400px] text-muted text-[14px] border-2 border-dashed border-[rgba(255,255,255,0.14)] rounded-lg">
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[20px] font-medium">
          PDF Preview
          {pageCount && pageCount > 1 && (
            <span className="text-[13px] text-muted font-normal ml-2">
              Page 1 of {pageCount}
            </span>
          )}
        </h2>
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
      <div className="relative">
        {isRecompiling && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-blue-600/90 text-white text-[12px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
            <Spinner className="w-3.5 h-3.5" />
            Updating...
          </div>
        )}
        <div className="bg-white rounded-lg border border-[rgba(255,255,255,0.14)] overflow-hidden">
          <img
            src={previewImageUrl}
            alt="Resume preview"
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}
