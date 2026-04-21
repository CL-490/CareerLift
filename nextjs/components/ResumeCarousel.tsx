"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

import type { Resume } from "@/components/job-finder/types";
import { asString, fetchResumeGraph, getApiBase } from "@/lib/jobFinderApi";
import { normalizeGraphData } from "@/lib/resumeLoader";
import { graphDataToResumeData } from "@/lib/resumeDataMapper";
import type { TemplateInfo } from "@/types/resume";

interface ResumeCarouselProps {
  resumes: Resume[];
  selectedResumeId: string | null;
  onSelect: (resumeId: string) => void;
  size?: "compact" | "regular";
  className?: string;
  busyResumeId?: string | null;
  /**
   * Template ID to render previews with. Defaults to the first available
   * template fetched from /api/latex/templates.
   */
  templateId?: string | null;
}

interface CardState {
  previewUrl?: string;
  loading: boolean;
  errored: boolean;
}

export default function ResumeCarousel({
  resumes,
  selectedResumeId,
  onSelect,
  size = "regular",
  className,
  busyResumeId,
  templateId,
}: ResumeCarouselProps) {
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [resolvedTemplateId, setResolvedTemplateId] = useState<string | null>(
    templateId ?? null,
  );
  const fetchedRef = useRef<Set<string>>(new Set());
  const urlsRef = useRef<Set<string>>(new Set());

  const dimensions =
    size === "compact"
      ? { card: "w-32 h-44", preview: "h-28", label: "text-[11px]" }
      : { card: "w-40 h-56", preview: "h-36", label: "text-[12px]" };

  // Resolve template id if not supplied: pick the first one returned by the
  // backend.
  useEffect(() => {
    if (templateId) {
      setResolvedTemplateId(templateId);
      return;
    }
    if (resolvedTemplateId) return;
    const base = getApiBase();
    axios
      .get<TemplateInfo[]>(`${base}/api/latex/templates`)
      .then((res) => {
        const first = res.data?.[0]?.id;
        if (first) setResolvedTemplateId(first);
      })
      .catch(() => {});
  }, [templateId, resolvedTemplateId]);

  // Lazy compile a preview per resume whenever we have a template id and
  // haven't yet attempted that resume.
  useEffect(() => {
    if (!resolvedTemplateId) return;
    const base = getApiBase();

    resumes.forEach((resume) => {
      const key = resume.resume_id;
      if (fetchedRef.current.has(key)) return;
      fetchedRef.current.add(key);

      setCards((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), loading: true, errored: false },
      }));

      (async () => {
        try {
          const rawGraph = await fetchResumeGraph(resume.person_name);
          const graph = normalizeGraphData(rawGraph);
          const resumeData = graphDataToResumeData(graph);
          const response = await axios.post(
            `${base}/api/latex/compile/preview?dpi=72`,
            { template_id: resolvedTemplateId, resume_data: resumeData },
            { responseType: "blob" },
          );
          const url = URL.createObjectURL(response.data as Blob);
          urlsRef.current.add(url);
          setCards((prev) => ({
            ...prev,
            [key]: { previewUrl: url, loading: false, errored: false },
          }));
        } catch {
          setCards((prev) => ({
            ...prev,
            [key]: { ...(prev[key] || {}), loading: false, errored: true },
          }));
        }
      })();
    });
  }, [resumes, resolvedTemplateId]);

  // Revoke blob URLs on unmount.
  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  if (resumes.length === 0) return null;

  return (
    <div
      className={`flex gap-3 overflow-x-auto pb-2 styled-scrollbar ${className || ""}`}
    >
      {resumes.map((resume) => {
        const state = cards[resume.resume_id];
        const isSelected = selectedResumeId === resume.resume_id;
        const isBusy = busyResumeId === resume.resume_id;
        return (
          <button
            key={resume.resume_id}
            type="button"
            onClick={() => onSelect(resume.resume_id)}
            disabled={busyResumeId !== null && busyResumeId !== resume.resume_id}
            className={`flex-shrink-0 ${dimensions.card} rounded-lg border-2 flex flex-col transition-all overflow-hidden text-left ${
              isSelected
                ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                : "border-[var(--border-color)] hover:border-[var(--accent)]"
            } ${busyResumeId && !isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div
              className={`w-full ${dimensions.preview} bg-white/5 flex items-center justify-center overflow-hidden`}
            >
              {!state || state.loading ? (
                <div className="w-full h-full animate-pulse bg-white/10" />
              ) : state.previewUrl ? (
                <img
                  src={state.previewUrl}
                  alt={asString(resume.resume_name)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="text-muted text-[28px] font-semibold">
                  {(asString(resume.person_name) || asString(resume.resume_name) || "R")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 p-2 flex flex-col justify-between">
              <div className="min-w-0">
                <p
                  className={`${dimensions.label} font-semibold text-foreground truncate`}
                  title={asString(resume.resume_name)}
                >
                  {asString(resume.resume_name) || resume.resume_id}
                </p>
                <p
                  className="text-[10px] text-muted truncate"
                  title={asString(resume.person_name)}
                >
                  {asString(resume.person_name) || "—"}
                </p>
              </div>
              {isBusy && (
                <p className="text-[10px] text-accent mt-1">Loading…</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
