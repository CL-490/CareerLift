import React from "react";
import type { TemplateInfo } from "../../types/resume";

interface Props {
  templates: TemplateInfo[];
  selected: string | null;
  onSelect: (id: string) => void;
  hasUploadedFile?: boolean;
}

const ENGINE_BADGE: Record<string, string> = {
  pdflatex: "pdfLaTeX",
  xelatex: "XeLaTeX",
};

export default function TemplateSelector({
  templates,
  selected,
  onSelect,
  hasUploadedFile,
}: Props) {
  return (
    <div className="card hover-ring card-hue mb-6">
      <h2 className="text-[20px] font-medium mb-3">Select Template</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 styled-scrollbar">
        {hasUploadedFile && (
          <button
            onClick={() => onSelect("uploaded")}
            className={`flex-shrink-0 w-32 h-44 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-all ${
              selected === "uploaded"
                ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                : "border-[var(--border-color)] hover:border-[var(--accent)]"
            }`}
          >
            <svg
              className="w-8 h-8 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="text-[12px] font-medium text-center px-1">
              Uploaded File
            </span>
          </button>
        )}
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`flex-shrink-0 w-32 h-44 rounded-lg border-2 flex flex-col items-center justify-between p-3 transition-all ${
              selected === t.id
                ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                : "border-[var(--border-color)] hover:border-[var(--accent)]"
            }`}
          >
            <div className="flex-1 flex flex-col items-center justify-center gap-1">
              <div className="w-16 h-20 bg-white/5 rounded flex items-center justify-center">
                <span className="text-[24px] font-bold text-muted">
                  {t.id.replace("template", "")}
                </span>
              </div>
            </div>
            <div className="text-center">
              <span className="text-[11px] font-medium block leading-tight">
                {t.name}
              </span>
              <span className="text-[9px] text-muted">
                {ENGINE_BADGE[t.engine] || t.engine}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
