"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LAST_RESUME_KEY,
  RESUME_UPDATED_EVENT,
  type StoredResume,
} from "@/lib/resumeLoader";

function read(): StoredResume | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.graph_data?.person) return parsed as StoredResume;
  } catch {
    /* noop */
  }
  return null;
}

/** Subscribe to the dashboard-wide active resume (whichever the Resume card
 *  has selected). Updates on careerlift:resume-updated and storage events. */
export function useActiveResume(): StoredResume | null {
  const [resume, setResume] = useState<StoredResume | null>(null);

  const refresh = useCallback(() => {
    setResume(read());
  }, []);

  useEffect(() => {
    refresh();
    const onUpdated = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_RESUME_KEY) refresh();
    };
    window.addEventListener(RESUME_UPDATED_EVENT, onUpdated as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(
        RESUME_UPDATED_EVENT,
        onUpdated as EventListener,
      );
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return resume;
}
