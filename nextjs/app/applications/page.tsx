"use client";
 
import { useState } from "react";
import { useApplications, ApplicationStatus } from "@/hooks/useApplications";
 
const STATUS_OPTIONS: ApplicationStatus[] = ["Applied", "Interview", "Offer", "Rejected"];
 
const STATUS_COLORS: Record<ApplicationStatus, string> = {
  Applied: "notice-info",
  Interview: "notice-warning",
  Offer: "notice-success",
  Rejected: "notice-error",
};
 
const TAB_ACTIVE_COLORS: Record<ApplicationStatus, string> = {
  Applied: "border-[var(--tone-info-border)] text-[var(--tone-info-text)]",
  Interview: "border-[var(--tone-warning-border)] text-[var(--tone-warning-text)]",
  Offer: "border-[var(--tone-success-border)] text-[var(--tone-success-text)]",
  Rejected: "border-[var(--tone-danger-border)] text-[var(--tone-danger-text)]",
};
 
const TAB_HOVER_COLORS: Record<Tab, string> = {
  All: "hover:border-[var(--accent)]/50 hover:text-foreground",
  Applied: "hover:border-[var(--tone-info-border)] hover:text-[var(--tone-info-text)]",
  Interview: "hover:border-[var(--tone-warning-border)] hover:text-[var(--tone-warning-text)]",
  Offer: "hover:border-[var(--tone-success-border)] hover:text-[var(--tone-success-text)]",
  Rejected: "hover:border-[var(--tone-danger-border)] hover:text-[var(--tone-danger-text)]",
};
 
type Tab = "All" | ApplicationStatus;
const TABS: Tab[] = ["All", ...STATUS_OPTIONS];
 
function ApplicationCard({
  app,
  updateStatus,
  removeApplication,
}: {
  app: ReturnType<typeof useApplications>["applications"][number];
  updateStatus: (id: string, status: ApplicationStatus) => void;
  removeApplication: (id: string) => void;
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
  const { applications, updateStatus, removeApplication } = useApplications();
  const [activeTab, setActiveTab] = useState<Tab>("All");
 
  const filteredApplications =
    activeTab === "All"
      ? applications
      : applications.filter((app) => app.status === activeTab);
 
  const countFor = (tab: Tab) =>
    tab === "All"
      ? applications.length
      : applications.filter((app) => app.status === tab).length;
 
  return (
    <main className="mx-auto max-w-400">
      <h1 className="text-[40px] font-semibold tracking-tight heading-gradient mb-2">
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
              updateStatus={updateStatus}
              removeApplication={removeApplication}
            />
          ))}
        </div>
      )}
    </main>
  );
}
 
