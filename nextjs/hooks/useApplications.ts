
"use client";

import { useState, useEffect } from "react";

export type ApplicationStatus = "Applied" | "Interview" | "Offer" | "Rejected";

export interface SavedApplication {
  id: string;
  title: string;
  company: string;
  salary?: string;
  url?: string;
  source: string;
  dateApplied: string;
  status: ApplicationStatus;
}

const STORAGE_KEY = "careerlift_applications";

export function useApplications() {
  const [applications, setApplications] = useState<SavedApplication[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setApplications(JSON.parse(stored));
  }, []);

  const saveApplication = (job: Omit<SavedApplication, "dateApplied" | "status">) => {
    setApplications((prev) => {
      const already = prev.find((a) => a.id === job.id);
      if (already) return prev;
      const updated = [
        ...prev,
        {
          ...job,
          dateApplied: new Date().toLocaleDateString(),
          status: "Applied" as ApplicationStatus,
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const updateStatus = (id: string, status: ApplicationStatus) => {
    setApplications((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, status } : a));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeApplication = (id: string) => {
    setApplications((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const isApplied = (id: string) => applications.some((a) => a.id === id);

  return { applications, saveApplication, updateStatus, removeApplication, isApplied };
}