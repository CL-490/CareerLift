import type { FormEvent } from "react";

interface JobSearchFormProps {
  q: string;
  loc: string;
  loading: boolean;
  onQChange: (value: string) => void;
  onLocChange: (value: string) => void;
  onSubmit: (e?: FormEvent) => void;
}

export default function JobSearchForm({
  q,
  loc,
  loading,
  onQChange,
  onLocChange,
  onSubmit,
}: JobSearchFormProps) {
  return (
    <form onSubmit={onSubmit} className="mb-6 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          placeholder="Role or keyword (e.g., frontend, ML)"
          className="w-full rounded-2xl border border-[var(--border-color)] px-4 py-2 outline-none hover:opacity-80"
        />
        <input
          value={loc}
          onChange={(e) => onLocChange(e.target.value)}
          placeholder="Location (e.g., Remote, NYC)"
          className="w-full rounded-2xl border border-[var(--border-color)] px-4 py-2 outline-none hover:opacity-80"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="jf-btn jf-btn-primary px-4 py-2"
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>
    </form>
  );
}
