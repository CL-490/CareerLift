"use client";
// themes and font size and subs and attached files added 

import React, { useMemo, useRef, useState } from "react";
import { usePreferences } from "@/components/PreferencesProvider";

type LocalFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  handle?: File;
};

export default function SettingsPage() {
  const { theme, fontSize, setTheme, setFontSize } = usePreferences();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<LocalFile[]>([]);

  const totalSize = useMemo(() => files.reduce((acc, f) => acc + f.size, 0), [files]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-[40px] font-semibold tracking-tight heading-gradient mb-6">Settings</h1>
        <p className="text-[13px] text-[var(--muted)] mt-1">Personalize the app, manage your plan, and review resume attachments.</p>
      </header>

      {/* UI Preferences */}
      <section className="card-3d rounded-xl border border-[var(--border-color)] bg-[var(--background-alt)]/50 p-5">
        <h2 className="text-lg font-medium mb-4">UI Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm text-[var(--muted)]">Theme</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTheme("dark")}
                className={`nav-item !px-3 !py-2 rounded-md border text-sm ${theme === "dark" ? "nav-item-active ring-1 ring-[var(--accent)]" : ""}`}
                aria-pressed={theme === "dark"}
              >
                Dark
              </button>
              <button
                onClick={() => setTheme("light")}
                className={`nav-item !px-3 !py-2 rounded-md border text-sm ${theme === "light" ? "nav-item-active ring-1 ring-[var(--accent)]" : ""}`}
                aria-pressed={theme === "light"}
              >
                Light
              </button>
            </div>
            <p className="text-[12px] text-[var(--muted)]">Saved locally. Applies instantly across the app.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[var(--muted)]">Base font size</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFontSize("sm")}
                className={`nav-item !px-3 !py-2 rounded-md border text-sm ${fontSize === "sm" ? "nav-item-active ring-1 ring-[var(--accent)]" : ""}`}
              >
                Small
              </button>
              <button
                onClick={() => setFontSize("md")}
                className={`nav-item !px-3 !py-2 rounded-md border text-sm ${fontSize === "md" ? "nav-item-active ring-1 ring-[var(--accent)]" : ""}`}
              >
                Medium
              </button>
              <button
                onClick={() => setFontSize("lg")}
                className={`nav-item !px-3 !py-2 rounded-md border text-sm ${fontSize === "lg" ? "nav-item-active ring-1 ring-[var(--accent)]" : ""}`}
              >
                Large
              </button>
            </div>
            <p className="text-[12px] text-[var(--muted)]">Scales rem units globally using <code>--font-scale</code>.</p>
          </div>
        </div>
      </section>

      {/* Subscription placeholder */}
      <section className="card-3d rounded-xl border border-[var(--border-color)] bg-[var(--background-alt)]/50 p-5">
        <h2 className="text-lg font-medium mb-4">Manage Subscription</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-[13px] text-[var(--muted)]">We're building billing & plan management. For now this is a polished placeholder.</p>
            <ul className="text-[13px] mt-2 list-disc ml-5">
              <li>Change plan (Free / Pro)</li>
              <li>Update payment method</li>
              <li>View invoices</li>
            </ul>
          </div>
          <button className="nav-item nav-item-active !px-4 !py-2 rounded-md border text-sm opacity-60 cursor-not-allowed" title="Coming soon">
            Upgrade to Pro
          </button>
        </div>
      </section>

      {/* user attachement (resume) placeholder, will be completed after working resume parser */}
      <section className="card-3d rounded-xl border border-[var(--border-color)] bg-[var(--background-alt)]/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Resume Attachments</h2>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                const mapped = list.map((f) => ({
                  id: `${f.name}-${f.size}-${crypto.randomUUID()}`,
                  name: f.name,
                  size: f.size,
                  type: f.type || "application/octet-stream",
                  handle: f,
                }));
                setFiles((prev) => [...mapped, ...prev]);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="hidden"
            />
            <button
              className="nav-item !px-3 !py-2 rounded-md border text-sm"
              onClick={() => inputRef.current?.click()}
            >
              Upload
            </button>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="text-[13px] text-[var(--muted)]">No files yet. Upload to preview; actions are client-side only until backend is ready.</div>
        ) : (
          <div className="space-y-3">
            <ul className="divide-y divide-[var(--border-color)] rounded-md border border-[var(--border-color)]">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.name}</div>
                    <div className="text-[12px] text-[var(--muted)]">{formatSize(f.size)} • {f.type || "file"}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="nav-item !px-3 !py-1.5 rounded-md border text-sm"
                      onClick={() => {
                        if (f.handle) {
                          const url = URL.createObjectURL(f.handle);
                          window.open(url, "_blank");
                          setTimeout(() => URL.revokeObjectURL(url), 10000);
                        } else {
                          alert("Preview available after upload only.");
                        }
                      }}
                    >
                      View
                    </button>
                    <button
                      className="nav-item !px-3 !py-1.5 rounded-md border text-sm"
                      onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="text-[12px] text-[var(--muted)] text-right">Total: {formatSize(totalSize)}</div>
          </div>
        )}
      </section>
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}
