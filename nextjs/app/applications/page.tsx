"use client";
 
import { useState } from "react";
import { useApplications, ApplicationStatus } from "@/hooks/useApplications";
 
const STATUS_OPTIONS: ApplicationStatus[] = ["Applied", "Interview", "Offer", "Rejected"];
 
const STATUS_COLORS: Record<ApplicationStatus, string> = {
  Applied: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Interview: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Offer: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Rejected: "bg-red-500/20 text-red-300 border-red-500/30",
};
 
const TAB_ACTIVE_COLORS: Record<ApplicationStatus, string> = {
  Applied: "border-blue-400 text-blue-300",
  Interview: "border-yellow-400 text-yellow-300",
  Offer: "border-emerald-400 text-emerald-300",
  Rejected: "border-red-400 text-red-300",
};
 
const TAB_HOVER_COLORS: Record<Tab, string> = {
  All: "hover:border-teal-400/50 hover:text-teal-300/80 hover:drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]",
  Applied: "hover:border-blue-400/50 hover:text-blue-300/80 hover:drop-shadow-[0_0_8px_rgba(147,197,253,0.5)]",
  Interview: "hover:border-yellow-400/50 hover:text-yellow-300/80 hover:drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]",
  Offer: "hover:border-emerald-400/50 hover:text-emerald-300/80 hover:drop-shadow-[0_0_8px_rgba(110,231,183,0.5)]",
  Rejected: "hover:border-red-400/50 hover:text-red-300/80 hover:drop-shadow-[0_0_8px_rgba(252,165,165,0.5)]",
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
          <h2 className="font-semibold text-white text-lg leading-tight">
            {app.title}
          </h2>
          <p className="text-sm text-muted mt-0.5">
            {app.company} · {app.source} · Applied {app.dateApplied}
          </p>
          {app.salary && (
            <p className="text-xs text-green-500 mt-0.5">{app.salary}</p>
          )}
        </div>
        <button
          onClick={() => removeApplication(app.id)}
          className="text-red-400 hover:text-red-300 text-xs border border-red-500/30 hover:bg-red-500/10 rounded px-2 py-1 transition-colors shrink-0"
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
            className="text-xs text-teal-400 hover:underline"
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
                  : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
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
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="mb-2 text-[40px] font-semibold tracking-tight heading-gradient">
          Applications
        </h1>
        <p className="text-sm text-muted">
          Track every application milestone.
        </p>
      </header>
 
      {/* Tabs */}
      <div className="flex gap-0 border-b border-(--border-color) mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          const count = countFor(tab);
          const activeColor =
            tab === "All"
              ? "border-teal-400 text-teal-300"
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
                      ? "bg-teal-500/20 text-teal-300"
                      : STATUS_COLORS[tab as ApplicationStatus]
                    : "bg-white/5 text-white/30"
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
            Hit <span className="text-teal-400 font-medium">Save to Applications</span> on any job listing to start tracking.
          </p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-xl border border-(--border-color) surface p-12 text-center">
          <p className="text-lg mb-1">No {activeTab} applications.</p>
          <p className="text-sm text-muted">
            Update an application's status to <span className="text-white/70 font-medium">{activeTab}</span> to see it here.
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
 