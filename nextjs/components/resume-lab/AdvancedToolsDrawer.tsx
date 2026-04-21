"use client";

import { useState } from "react";

export default function AdvancedToolsDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="card-3d lab-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block text-[16px] font-semibold text-foreground">
            Advanced tools
          </span>
          <span className="mt-1 block text-[13px] text-muted">
            Local Neo4j access and expert-only utilities live here instead of
            the main success flow.
          </span>
        </span>

        <svg
          className={`h-4 w-4 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[var(--border-color)] px-5 py-5">
          <div className="lab-panel-info rounded-lg p-4">
            <h3 className="text-[16px] font-medium text-foreground">
              Neo4j Browser
            </h3>
            <p className="mt-2 text-[14px] text-muted">
              Open the local graph database browser when you want a deeper
              inspection of the extracted nodes and relationships.
            </p>
            <a
              href="http://localhost:7474"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex rounded-lg border border-[var(--border-color)] px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-[var(--accent)] hover:bg-[var(--background-alt)]"
            >
              Open Neo4j Browser
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
