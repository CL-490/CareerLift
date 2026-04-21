import React from "react";

interface Props {
  onClick: () => void;
  compiling: boolean;
  error: string | null;
  lastCompileTime?: number | null;
}

export default function CompileButton({ onClick, compiling, error, lastCompileTime }: Props) {
  return (
    <div>
      <button
        onClick={onClick}
        disabled={compiling}
        className="jf-btn jf-btn-primary w-full py-3 px-4 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {compiling ? (
          <>
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
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
            Compiling...
          </>
        ) : (
          "Recompile Now"
        )}
      </button>
      {!compiling && lastCompileTime && (
        <p className="text-[12px] text-muted text-center mt-1.5">
          Auto-preview is on
        </p>
      )}
      {error && (
        <div className="notice-banner notice-error mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap p-3 text-[13px]">
          {error}
        </div>
      )}
    </div>
  );
}
