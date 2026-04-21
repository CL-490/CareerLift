"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApplications, ApplicationStatus } from "@/hooks/useApplications";
import { getSavedJobs, listResumes } from "@/lib/jobFinderApi";
import {
  formatResumeLabel,
  loadResumeById,
  persistStoredResume,
} from "@/lib/resumeLoader";
import type { Resume } from "@/components/job-finder/types";

const STATUS_OPTIONS: ApplicationStatus[] = ["Pending", "Applied", "Interview", "Offer", "Rejected"];

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  Pending: "border border-slate-500/30 bg-slate-500/15 text-slate-300",
  Applied: "notice-info",
  Interview: "notice-warning",
  Offer: "notice-success",
  Rejected: "notice-error",
};

const TAB_ACTIVE_COLORS: Record<ApplicationStatus, string> = {
  Pending: "border-slate-500/40 text-slate-300",
  Applied: "border-[var(--tone-info-border)] text-[var(--tone-info-text)]",
  Interview: "border-[var(--tone-warning-border)] text-[var(--tone-warning-text)]",
  Offer: "border-[var(--tone-success-border)] text-[var(--tone-success-text)]",
  Rejected: "border-[var(--tone-danger-border)] text-[var(--tone-danger-text)]",
};

const TAB_HOVER_COLORS: Record<Tab, string> = {
  All: "hover:border-[var(--accent)]/50 hover:text-foreground",
  Pending: "hover:border-slate-500/40 hover:text-slate-300",
  Applied: "hover:border-[var(--tone-info-border)] hover:text-[var(--tone-info-text)]",
  Interview: "hover:border-[var(--tone-warning-border)] hover:text-[var(--tone-warning-text)]",
  Offer: "hover:border-[var(--tone-success-border)] hover:text-[var(--tone-success-text)]",
  Rejected: "hover:border-[var(--tone-danger-border)] hover:text-[var(--tone-danger-text)]",
};

type Tab = "All" | ApplicationStatus;
const TABS: Tab[] = ["All", ...STATUS_OPTIONS];

interface LinkedResume {
  resume_id: string;
  resume_name: string;
  person_name: string;
}

function ApplicationCard({
  app,
  linkedResumes,
  resumesById,
  switchingId,
  updateStatus,
  removeApplication,
  onOpenResume,
}: {
  app: ReturnType<typeof useApplications>["applications"][number];
  linkedResumes: LinkedResume[];
  resumesById: Map<string, Resume>;
  switchingId: string | null;
  updateStatus: (id: string, status: ApplicationStatus) => void;
  removeApplication: (id: string) => void;
  onOpenResume: (resumeId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-(--border-color) surface p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold leading-tight text-foreground">
            {app.title}
          </h2>
          <p className="text-sm text-muted mt-0.5">
            {app.company} · {app.source} · Applied {app.dateApplied}
          </p>
          {app.salary && (
            <p className="mt-0.5 text-xs text-[var(--tone-success-text)]">{app.salary}</p>
          )}
        </div>
        <button
          onClick={() => removeApplication(app.id)}
          className="notice-error rounded px-2 py-1 text-xs transition-colors shrink-0 hover:opacity-85"
        >
          Remove
        </button>
      </div>

      {/* Linked resumes */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-muted">Linked resume{linkedResumes.length === 1 ? "" : "s"}:</span>
        {linkedResumes.length === 0 ? (
          <span className="text-muted italic">none</span>
        ) : (
          linkedResumes.map((r) => {
            const full = resumesById.get(r.resume_id);
            const label = formatResumeLabel(full ?? {
              resume_id: r.resume_id,
              resume_name: r.resume_name,
            });
            const isSwitching = switchingId === r.resume_id;
            return (
              <button
                key={r.resume_id}
                type="button"
                onClick={() => onOpenResume(r.resume_id)}
                disabled={switchingId !== null}
                title={r.person_name ? `${label} (${r.person_name})` : label}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2 py-0.5 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSwitching ? (
                  "Loading…"
                ) : (
                  <>
                    <span>{label}</span>
                    {r.person_name && (
                      <span className="text-[10px] opacity-80">· {r.person_name}</span>
                    )}
                  </>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {app.url && (
          <a
            href={app.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-[var(--accent)] hover:underline"
          >
            View Posting ↗
          </a>
        )}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(app.id, s)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                app.status === s
                  ? STATUS_COLORS[s]
                  : "border-[var(--border-color)] text-muted hover:text-foreground hover:border-[var(--border-strong)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const router = useRouter();
  const { applications, updateStatus, removeApplication } = useApplications();
  const [activeTab, setActiveTab] = useState<Tab>("All");

  // url -> resumes that have saved this URL
  const [linkedByUrl, setLinkedByUrl] = useState<Map<string, LinkedResume[]>>(
    new Map(),
  );
  const [resumesById, setResumesById] = useState<Map<string, Resume>>(new Map());
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // Build the url -> [resumes] index across every resume the user owns.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resumes = await listResumes();
        if (cancelled) return;
        setResumesById(new Map(resumes.map((r) => [r.resume_id, r])));

        const map = new Map<string, LinkedResume[]>();
        const results = await Promise.allSettled(
          resumes.map((r) => getSavedJobs(r.resume_id)),
        );
        results.forEach((res, i) => {
          if (res.status !== "fulfilled") return;
          const r = resumes[i];
          for (const job of res.value.jobs) {
            const url = job.apply_url;
            if (!url) continue;
            const entry: LinkedResume = {
              resume_id: r.resume_id,
              resume_name: String(r.resume_name || ""),
              person_name: String(r.person_name || ""),
            };
            const existing = map.get(url) ?? [];
            if (!existing.some((e) => e.resume_id === r.resume_id)) {
              map.set(url, [...existing, entry]);
            }
          }
        });
        if (!cancelled) setLinkedByUrl(map);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenResume = async (resumeId: string) => {
    setSwitchingId(resumeId);
    try {
      const stored = await loadResumeById(
        resumeId,
        Array.from(resumesById.values()),
      );
      persistStoredResume(stored);
      router.push("/resume-lab");
    } catch {
      setSwitchingId(null);
    }
  };

  const filteredApplications =
    activeTab === "All"
      ? applications
      : applications.filter((app) => app.status === activeTab);

  const countFor = (tab: Tab) =>
    tab === "All"
      ? applications.length
      : applications.filter((app) => app.status === tab).length;

  const linkedResumesFor = useMemo(() => {
    const lookup = new Map<string, LinkedResume[]>();
    for (const app of applications) {
      if (!app.url) continue;
      const linked = linkedByUrl.get(app.url) ?? [];
      lookup.set(app.id, linked);
    }
    return lookup;
  }, [applications, linkedByUrl]);

  return (
    <main className="mx-auto max-w-300">
      <h1 className="mb-2 text-[30px] font-semibold tracking-tight heading-gradient sm:text-[32px]">
        Applications
      </h1>
      <p className="text-[15px] text-muted mb-6">
        Track every application milestone.
      </p>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-(--border-color) mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          const count = countFor(tab);
          const activeColor =
            tab === "All"
              ? "border-[var(--accent)] text-foreground"
              : TAB_ACTIVE_COLORS[tab as ApplicationStatus];

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 -mb-px ${
                isActive
                  ? `${activeColor}`
                  : `border-transparent text-muted ${TAB_HOVER_COLORS[tab]}`
              }`}
            >
              {tab}
              <span
                className={`text-xs rounded-full px-1.5 py-0.5 font-mono leading-none ${
                  isActive
                    ? tab === "All"
                      ? "bg-[color:color-mix(in_oklab,var(--accent)_24%,transparent)] text-foreground"
                      : STATUS_COLORS[tab as ApplicationStatus]
                    : "bg-[color:color-mix(in_oklab,var(--background-alt)_88%,transparent)] text-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {applications.length === 0 ? (
        <div className="rounded-xl border border-(--border-color) surface p-12 text-center">
          <p className="text-lg mb-1">No saved applications yet.</p>
          <p className="text-sm text-muted">
            Hit <span className="font-medium text-[var(--accent)]">Save to Applications</span> on any job listing to start tracking.
          </p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-xl border border-(--border-color) surface p-12 text-center">
          <p className="text-lg mb-1">No {activeTab} applications.</p>
          <p className="text-sm text-muted">
            Update an application's status to <span className="font-medium text-foreground">{activeTab}</span> to see it here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredApplications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              linkedResumes={linkedResumesFor.get(app.id) ?? []}
              resumesById={resumesById}
              switchingId={switchingId}
              updateStatus={updateStatus}
              removeApplication={removeApplication}
              onOpenResume={handleOpenResume}
            />
          ))}
        </div>
      )}
    </main>
  );
}
