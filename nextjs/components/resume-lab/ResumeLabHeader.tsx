interface ResumeLabHeaderProps {
  canClear: boolean;
  onClear: () => void;
}

export default function ResumeLabHeader({
  canClear,
  onClear,
}: ResumeLabHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[30px] font-semibold tracking-tight heading-gradient sm:text-[32px]">
          Resume Lab
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Upload, refine, preview, and map your resume in a calmer guided
          workspace.
        </p>
      </div>

      {canClear && (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-lg border border-[var(--border-color)] px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:border-[var(--accent)] hover:text-foreground"
          title="Clear saved resume"
        >
          Clear resume
        </button>
      )}
    </div>
  );
}
