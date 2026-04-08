"use client";
// themes and font size and subs and attached files added 

import React from "react";
import { usePreferences } from "@/components/PreferencesProvider";

export default function SettingsPage() {
  const { theme, fontSize, setTheme, setFontSize } = usePreferences();

  return (
    <div className="max-w-400 mx-auto space-y-8">
      <div>
        <h1 className="text-[40px] font-semibold tracking-tight heading-gradient mb-2">Settings</h1>
        <p className="text-[15px] text-muted mb-6">Personalize the app and manage your plan.</p>
      </div>

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

    </div>
  );
}
