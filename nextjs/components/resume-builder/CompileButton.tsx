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
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
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
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[13px] whitespace-pre-wrap max-h-48 overflow-y-auto">
          {error}
        </div>
      )}
    </div>
  );
}
