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
        <div>
          <label htmlFor="job-search-keyword" className="form-label">
            Role or keyword
          </label>
          <input
            id="job-search-keyword"
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder="Frontend engineer, ML, design systems"
            aria-describedby="job-search-keyword-help"
            className="form-control rounded-2xl px-4 py-2"
          />
          <p id="job-search-keyword-help" className="form-helper">
            Search by title, skill, or specialty.
          </p>
        </div>
        <div>
          <label htmlFor="job-search-location" className="form-label">
            Location
          </label>
          <input
            id="job-search-location"
            value={loc}
            onChange={(e) => onLocChange(e.target.value)}
            placeholder="Remote, New York, Berlin"
            aria-describedby="job-search-location-help"
            className="form-control rounded-2xl px-4 py-2"
          />
          <p id="job-search-location-help" className="form-helper">
            Use a city, region, or remote preference.
          </p>
        </div>
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
