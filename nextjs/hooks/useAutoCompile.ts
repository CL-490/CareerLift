import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import type { ResumeData } from "../types/resume";

interface UseAutoCompileOptions {
  resumeData: ResumeData | null;
  selectedTemplate: string | null;
  apiUrl: string;
  debounceMs?: number;
}

interface UseAutoCompileResult {
  previewImageUrl: string | null;
  pageCount: number;
  compiling: boolean;
  compileError: string | null;
  isRecompiling: boolean;
  triggerCompile: () => void;
  lastCompileTime: number | null;
}

export function useAutoCompile({
  resumeData,
  selectedTemplate,
  apiUrl,
  debounceMs = 1500,
}: UseAutoCompileOptions): UseAutoCompileResult {
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [compiling, setCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [lastCompileTime, setLastCompileTime] = useState<number | null>(null);

  const resumeDataRef = useRef(resumeData);
  const selectedTemplateRef = useRef(selectedTemplate);
  const hasPreviewRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const prevBlobUrlRef = useRef<string | null>(null);

  // Keep refs in sync
  resumeDataRef.current = resumeData;
  selectedTemplateRef.current = selectedTemplate;

  const doCompile = useCallback(async () => {
    const data = resumeDataRef.current;
    const template = selectedTemplateRef.current;

    if (!data || !template || template === "uploaded") return;

    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;

    setCompiling(true);
    setCompileError(null);

    try {
      const response = await axios.post(
        `${apiUrl}/api/latex/compile/preview`,
        {
          template_id: template,
          resume_data: data,
        },
        {
          responseType: "blob",
          signal: controller.signal,
        }
      );

      // Discard stale responses
      if (seq !== seqRef.current) return;

      // Revoke previous blob URL to prevent memory leaks
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }

      const blob = response.data as Blob;
      const url = URL.createObjectURL(blob);
      prevBlobUrlRef.current = url;

      const isFirst = !hasPreviewRef.current;
      setPreviewImageUrl(url);
      hasPreviewRef.current = true;
      setLastCompileTime(Date.now());

      // Parse page count from header
      const pc = parseInt(response.headers["x-page-count"] || "1", 10);
      setPageCount(pc);

      // Auto-collapse sidebar on first successful compile
      if (isFirst) {
        window.dispatchEvent(new Event("careerlift:sidebar-collapse"));
      }
    } catch (err: any) {
      // Ignore aborted requests
      if (axios.isCancel(err) || err.name === "AbortError") return;
      if (seq !== seqRef.current) return;

      if (err.response?.data) {
        try {
          // Error response is a blob, read it as text
          const text = await (err.response.data as Blob).text();
          const json = JSON.parse(text);
          setCompileError(json.detail || "Compilation failed");
        } catch {
          setCompileError("Compilation failed");
        }
      } else {
        setCompileError(err.message || "Compilation failed");
      }
    } finally {
      if (seq === seqRef.current) {
        setCompiling(false);
      }
    }
  }, [apiUrl]);

  // Immediate compile (bypasses debounce)
  const triggerCompile = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    doCompile();
  }, [doCompile]);

  // Debounced auto-compile on data/template changes
  useEffect(() => {
    if (!resumeData || !selectedTemplate || selectedTemplate === "uploaded")
      return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      doCompile();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [resumeData, selectedTemplate, debounceMs, doCompile]);

  // Clear preview when template switches to "uploaded" or is deselected
  useEffect(() => {
    if (!selectedTemplate || selectedTemplate === "uploaded") {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
      setPreviewImageUrl(null);
      hasPreviewRef.current = false;
      setPageCount(0);
      setCompileError(null);
      setLastCompileTime(null);
    }
  }, [selectedTemplate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
    };
  }, []);

  return {
    previewImageUrl,
    pageCount,
    compiling,
    compileError,
    isRecompiling: compiling && previewImageUrl !== null,
    triggerCompile,
    lastCompileTime,
  };
}
