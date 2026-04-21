"use client";

import { useEffect, useState, type ReactNode } from "react";
import { asString } from "@/lib/resumeDataMapper";
import type { UploadResult } from "@/components/resume-lab/types";

interface ImportedDetailsDrawerProps {
  result: UploadResult;
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-[16px] font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function formatImportedText(value: unknown): string {
  const raw = asString(value).trim();
  if (!raw) return "";

  if (!/[<&]/.test(raw)) {
    return raw.replace(/\s+/g, " ").trim();
  }

  if (typeof window !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "text/html");

    doc.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
    doc.querySelectorAll("li").forEach((node) => {
      node.insertBefore(doc.createTextNode("• "), node.firstChild);
      node.appendChild(doc.createTextNode("\n"));
    });
    doc.querySelectorAll("p, div, ul, ol").forEach((node) => {
      node.appendChild(doc.createTextNode("\n"));
    });

    return (doc.body.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export default function ImportedDetailsDrawer({
  result,
}: ImportedDetailsDrawerProps) {
  const [open, setOpen] = useState(true);
  const savedJobs = result.graph_data.saved_jobs ?? [];

  useEffect(() => {
    setOpen(true);
  }, [result.resume_id, result.filename]);

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
            Imported details
          </span>
          <span className="mt-1 block text-[13px] text-muted">
            Person, skills, experience, education, and saved jobs all live
            here, and this section stays open after upload so the full import
            is easy to review.
          </span>
        </span>

        <span className="flex items-center gap-3">
          <span className="hidden text-[12px] text-muted sm:inline">
            {open ? "Hide" : "Show"}
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
        </span>
      </button>

      {open && (
        <div className="border-t border-[var(--border-color)] px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="lab-panel-info rounded-lg p-4">
              <p className="mb-1 text-[13px] text-muted">File</p>
              <p className="text-[15px] font-medium text-foreground">
                {result.filename}
              </p>
            </div>
            <div className="lab-panel-info rounded-lg p-4">
              <p className="mb-1 text-[13px] text-muted">Text Extracted</p>
              <p className="text-[15px] font-medium text-foreground">
                {result.text_length.toLocaleString()} characters
              </p>
            </div>
            <div className="lab-panel-ai rounded-lg p-4">
              <p className="mb-1 text-[13px] text-muted">Nodes Created</p>
              <p className="text-[15px] font-medium text-foreground">
                {result.nodes_created}
              </p>
            </div>
            <div className="lab-panel-success rounded-lg p-4">
              <p className="mb-1 text-[13px] text-muted">Status</p>
              <p className="text-[15px] font-medium text-green-400">Success</p>
            </div>
          </div>

          <DetailSection title="Person">
            <div className="lab-panel-ai rounded-lg p-4">
              <p className="mb-2 text-[18px] font-semibold text-foreground">
                {result.graph_data.person.name}
              </p>
              {result.graph_data.person.email && (
                <p className="text-[14px] text-muted">
                  Email: {result.graph_data.person.email}
                </p>
              )}
              {result.graph_data.person.phone && (
                <p className="text-[14px] text-muted">
                  Phone: {result.graph_data.person.phone}
                </p>
              )}
              {result.graph_data.person.location && (
                <p className="text-[14px] text-muted">
                  Location: {result.graph_data.person.location}
                </p>
              )}
              {result.graph_data.person.summary && (
                <p className="mt-2 text-[14px] text-muted">
                  {result.graph_data.person.summary}
                </p>
              )}
            </div>
          </DetailSection>

          {result.graph_data.skills.length > 0 && (
            <DetailSection
              title={`Skills (${result.graph_data.skills.length})`}
            >
              <div className="flex flex-wrap gap-2">
                {result.graph_data.skills.map((skill, idx) => (
                  <span
                    key={`${asString(skill)}-${idx}`}
                    className="inline-flex rounded-full border border-[var(--panel-border)] bg-[var(--accent)]/10 px-3 py-1 text-[13px] text-foreground"
                  >
                    {asString(skill)}
                  </span>
                ))}
              </div>
            </DetailSection>
          )}

          {result.graph_data.experiences.length > 0 && (
            <DetailSection
              title={`Experience (${result.graph_data.experiences.length})`}
            >
              <div className="space-y-3">
                {result.graph_data.experiences.map((exp, idx) => (
                  <div key={idx} className="lab-panel-info rounded-lg p-4">
                    <p className="text-[15px] font-medium text-foreground">
                      {asString(exp.title)}
                    </p>
                    <p className="text-[14px] text-[#8fc1f5]">
                      {asString(exp.company)}
                    </p>
                    {exp.duration && (
                      <p className="mt-1 text-[13px] text-muted">
                        {exp.duration}
                      </p>
                    )}
                    {exp.description && (
                      <p className="mt-2 text-[13px] text-muted">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {result.graph_data.education.length > 0 && (
            <DetailSection
              title={`Education (${result.graph_data.education.length})`}
            >
              <div className="space-y-3">
                {result.graph_data.education.map((edu, idx) => (
                  <div key={idx} className="lab-panel-info rounded-lg p-4">
                    <p className="text-[15px] font-medium text-foreground">
                      {asString(edu.degree)}
                    </p>
                    <p className="text-[14px] text-[#8fc1f5]">
                      {asString(edu.institution)}
                    </p>
                    {edu.year && (
                      <p className="mt-1 text-[13px] text-muted">{edu.year}</p>
                    )}
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {savedJobs.length > 0 && (
            <DetailSection title={`Saved Jobs (${savedJobs.length})`}>
              <div className="space-y-3">
                {savedJobs.map((job, idx) => {
                  const formattedDescription = formatImportedText(
                    job.description,
                  );

                  return (
                    <div key={idx} className="lab-panel-ai rounded-lg p-4">
                      <p className="text-[15px] font-medium text-foreground">
                        {asString(job.title) || asString(job.company) || "Job"}
                      </p>
                      {Boolean(job.company) && (
                        <p className="text-[14px] text-[var(--tone-info-text)]">
                          {asString(job.company)}
                        </p>
                      )}
                      {job.apply_url && (
                        <a
                          className="mt-1 inline-flex text-[13px] text-muted transition-colors hover:text-foreground"
                          href={asString(job.apply_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open job
                        </a>
                      )}
                      {formattedDescription && (
                        <p className="mt-2 whitespace-pre-line text-[13px] text-muted">
                          {formattedDescription}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </DetailSection>
          )}
        </div>
      )}
    </div>
  );
}
