"use client";

import { useState } from "react";

type IngestResult = { ingested: number; seeds: string[] };

function getApiBase() {
  if (typeof window !== "undefined") {
    const fallback = `${window.location.protocol}//${window.location.hostname}:8000`;
    return process.env.NEXT_PUBLIC_API_BASE || fallback;
  }
  return process.env.NEXT_PUBLIC_API_BASE || "";
}

export default function IngestJobsAdminPage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const runIngest = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const base = getApiBase();
      if (!base) throw new Error("API base URL is not set.");
      const res = await fetch(`${base}/jobs/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Convention: empty array => backend uses COMMON_SOURCES
        body: JSON.stringify([]),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = (await res.json()) as IngestResult;
      const sourceText =
        data.seeds.length === 0 ? "COMMON_SOURCES" : `${data.seeds.length} seed(s)`;
      setMsg(`Ingested ${data.ingested} from ${sourceText}.`);
    } catch (e: any) {
      setMsg(`Failed: ${e?.message || "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-4 text-2xl font-semibold">Jobs Ingestion Admin</h1>
      <p className="mb-6 text-sm text-gray-600">
        Calls <code>POST /jobs/ingest</code> with backend defaults.
      </p>

      <button
        onClick={runIngest}
        disabled={busy}
        className="rounded-2xl border bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Ingesting…" : "Run Ingest"}
      </button>

      {msg && <div className="mt-4 rounded-2xl border px-4 py-3 text-sm">{msg}</div>}

      <div className="mt-6">
        <a href="/job-finder" className="rounded-2xl border px-3 py-1 text-sm hover:bg-gray-50">
          Open Job Finder
        </a>
      </div>
    </main>
  );
}
