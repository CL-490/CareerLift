"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import EditStep from "@/components/resume-lab/EditStep";
import GraphStep from "@/components/resume-lab/GraphStep";
import PreviewStep from "@/components/resume-lab/PreviewStep";
import ResumeLabHeader from "@/components/resume-lab/ResumeLabHeader";
import ResumeLabStepper from "@/components/resume-lab/ResumeLabStepper";
import UploadStep from "@/components/resume-lab/UploadStep";
import type {
  GraphData,
  ResumeLabStep,
  ResumeLabStepId,
  UploadResult,
} from "@/components/resume-lab/types";
import { useAutoCompile } from "@/hooks/useAutoCompile";
import { apiAxios } from "@/lib/apiClient";
import { deleteResume, listResumes } from "@/lib/jobFinderApi";
import {
  asString,
  createEmptyResumeData,
  graphDataToResumeData,
} from "@/lib/resumeDataMapper";
import {
  loadResumeById,
  persistEditedAt,
  persistStoredResume,
  toUploadResult,
} from "@/lib/resumeLoader";
import type { Resume } from "@/components/job-finder/types";
import type { ResumeData, TemplateInfo } from "@/types/resume";

const VALID_STEPS = ["upload", "edit", "preview", "graph"] as const;

function normalizeStepParam(value: string | null): ResumeLabStepId | null {
  if (!value) return null;
  return (VALID_STEPS as readonly string[]).includes(value)
    ? (value as ResumeLabStepId)
    : null;
}

export default function ResumeLabPage() {
  const searchParams = useSearchParams();
  const initialStepParam = normalizeStepParam(searchParams.get("step"));

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [personNameInput, setPersonNameInput] = useState("");
  const [resumeNameInput, setResumeNameInput] = useState("");
  const [activeStep, setActiveStep] = useState<ResumeLabStepId>(
    initialStepParam ?? "upload"
  );

  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [existingResumes, setExistingResumes] = useState<Resume[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [selectingExistingId, setSelectingExistingId] = useState<string | null>(
    null
  );
  const [existingError, setExistingError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // If an explicit `?step=` is provided, honor it and skip the auto-advance
  // that would normally jump to "edit" when a cached resume exists.
  const seededInitialStepRef = useRef(initialStepParam !== null);

  const allowedExtensions = [".txt", ".md", ".pdf", ".doc", ".docx"];
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const {
    previewImageUrl,
    pageCount,
    currentPage,
    compiling,
    compileError,
    isRecompiling,
    triggerCompile,
    goToPage,
    lastCompileTime,
  } = useAutoCompile({
    resumeData,
    selectedTemplate,
    apiUrl: API_URL,
    debounceMs: 1500,
  });

  useEffect(() => {
    apiAxios
      .get<TemplateInfo[]>(`${API_URL}/api/latex/templates`)
      .then((res) => setTemplates(res.data))
      .catch(() => {});
  }, [API_URL]);

  const refreshExistingResumes = async () => {
    setLoadingExisting(true);
    try {
      const list = await listResumes();
      setExistingResumes(list);
    } catch {
      /* non-fatal — upload path still works */
    } finally {
      setLoadingExisting(false);
    }
  };

  useEffect(() => {
    refreshExistingResumes();
  }, []);

  useEffect(() => {
    type SavedResume = {
      filename: string;
      text_length: number;
      graph_data: GraphData;
      nodes_created?: number;
      person_name?: string;
      resume_name?: string;
      resume_id?: string;
      storedAt?: number;
    };

    let saved: SavedResume | null = null;
    try {
      const raw = localStorage.getItem("careerlift:lastResume");
      if (raw) {
        const parsed = JSON.parse(raw) as SavedResume;
        if (parsed?.graph_data?.person) {
          saved = parsed;
          setResult({
            message: "Loaded from previous upload",
            filename: parsed.filename,
            text_length: parsed.text_length,
            nodes_created: parsed.nodes_created ?? 0,
            graph_data: parsed.graph_data,
            resume_id: parsed.resume_id,
          });
          if (parsed.person_name) setPersonNameInput(asString(parsed.person_name));
          if (parsed.resume_name) setResumeNameInput(asString(parsed.resume_name));
        }
      }
    } catch (_) {}

    try {
      const builderRaw = localStorage.getItem("careerlift:resumeBuilder");
      if (builderRaw) {
        const parsed = JSON.parse(builderRaw) as ResumeData;
        if (parsed?.person) setResumeData(parsed);
      } else if (saved) {
        setResumeData(graphDataToResumeData(saved.graph_data));
      }
    } catch (_) {}

    if (saved) {
      const snapshot = saved;
      listResumes()
        .then((backendResumes) => {
          const exists = backendResumes.some(
            (resume) =>
              resume.resume_id === snapshot.resume_id ||
              resume.person_name === snapshot.graph_data.person.name
          );

          if (!exists) {
            localStorage.removeItem("careerlift:lastResume");
            localStorage.removeItem("careerlift:resumeBuilder");
            setResult(null);
            setResumeData(null);
            setPersonNameInput("");
            setResumeNameInput("");
            seededInitialStepRef.current = false;
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!resumeData) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem("careerlift:resumeBuilder", JSON.stringify(resumeData));
      } catch (_) {}
    }, 500);
  }, [resumeData]);

  useEffect(() => {
    if (!seededInitialStepRef.current && (result || resumeData)) {
      setActiveStep("edit");
      seededInitialStepRef.current = true;
    }

    if (!result && !resumeData) {
      setActiveStep("upload");
    }
  }, [result, resumeData]);

  useEffect(() => {
    return () => {
      if (uploadedFileUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
    };
  }, [uploadedFileUrl]);

  useEffect(() => {
    const onResumeUpdated = async () => {
      try {
        const raw = localStorage.getItem("careerlift:lastResume");
        if (!raw) return;

        const saved = JSON.parse(raw) as {
          filename: string;
          text_length: number;
          graph_data: GraphData;
          nodes_created?: number;
          person_name?: string;
          resume_name?: string;
        };

        if (saved?.graph_data?.person) {
          setResult({
            message: "Loaded from previous upload",
            filename: saved.filename,
            text_length: saved.text_length,
            nodes_created: saved.nodes_created ?? 0,
            graph_data: saved.graph_data,
            person_name: asString(saved.person_name),
            resume_name: asString(saved.resume_name),
          });
          setResumeData((current) => current ?? graphDataToResumeData(saved.graph_data));
        }
      } catch (_) {}
    };

    const storageHandler = (e: StorageEvent) => {
      if (
        e.key === "careerlift:resume-updated" ||
        e.key === "careerlift:lastResume"
      ) {
        onResumeUpdated();
      }
    };

    window.addEventListener("storage", storageHandler);
    window.addEventListener(
      "careerlift:resume-updated",
      onResumeUpdated as EventListener
    );

    return () => {
      window.removeEventListener(
        "careerlift:resume-updated",
        onResumeUpdated as EventListener
      );
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (selectedFile: File) => {
    const fileExt = `.${selectedFile.name.split(".").pop()?.toLowerCase()}`;

    if (!allowedExtensions.includes(fileExt || "")) {
      setError(
        `Unsupported file type. Please upload: ${allowedExtensions.join(", ")}`
      );
      setFile(null);
      return;
    }

    if (uploadedFileUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(uploadedFileUrl);
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);

    if (fileExt === ".pdf") {
      setUploadedFileUrl(URL.createObjectURL(selectedFile));
    } else {
      setUploadedFileUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    if (personNameInput.trim().length > 0) {
      formData.append("person_name", personNameInput.trim());
    }
    if (resumeNameInput.trim().length > 0) {
      formData.append("resume_name", resumeNameInput.trim());
    }

    try {
      const response = await apiAxios.post<UploadResult>(
        `${API_URL}/api/resume/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(response.data);

      if (
        (!personNameInput || personNameInput.trim().length === 0) &&
        response.data.graph_data?.person?.name
      ) {
        setPersonNameInput(response.data.graph_data.person.name);
      }

      if (
        (!resumeNameInput || resumeNameInput.trim().length === 0) &&
        response.data.resume_name
      ) {
        setResumeNameInput(response.data.resume_name);
      }

      try {
        const payload = {
          filename: response.data.filename,
          text_length: response.data.text_length,
          graph_data: response.data.graph_data,
          nodes_created: response.data.nodes_created,
          person_name:
            personNameInput || response.data.graph_data.person?.name || "",
          resume_name: resumeNameInput || response.data.filename,
          resume_id: response.data.resume_id,
          storedAt: Date.now(),
        };

        localStorage.setItem("careerlift:lastResume", JSON.stringify(payload));
      } catch (_) {}

      setResumeData(graphDataToResumeData(response.data.graph_data));
      setFile(null);
      setActiveStep("edit");
      seededInitialStepRef.current = true;
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail;
      if (typeof errorDetail === "object") {
        setError(
          errorDetail.message ||
            errorDetail.error ||
            "Failed to process resume. Please try again."
        );
      } else {
        setError(errorDetail || "Failed to process resume. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSelectExisting = async (resumeId: string) => {
    setSelectingExistingId(resumeId);
    setExistingError(null);
    try {
      const stored = await loadResumeById(resumeId, existingResumes);
      persistStoredResume(stored);
      const uploadResult = toUploadResult(stored);
      setResult(uploadResult);
      setPersonNameInput(stored.person_name);
      setResumeNameInput(stored.resume_name || "Default Resume");
      setResumeData(graphDataToResumeData(stored.graph_data));
      setFile(null);
      if (uploadedFileUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
      setUploadedFileUrl(null);
      setError(null);
      setActiveStep("edit");
      seededInitialStepRef.current = true;
    } catch (err) {
      setExistingError(
        err instanceof Error ? err.message : "Failed to load the selected resume"
      );
    } finally {
      setSelectingExistingId(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!resumeData || !selectedTemplate || selectedTemplate === "uploaded") {
      return;
    }

    setDownloadingPdf(true);
    try {
      const response = await apiAxios.post<Blob>(
        `${API_URL}/api/latex/compile`,
        { template_id: selectedTemplate, resume_data: resumeData },
        { responseType: "blob" }
      );

      const blob = new Blob([response.data as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_) {
      // Silently fail and let the user retry.
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);

    if (!resumeData && id !== "uploaded") {
      setResumeData(createEmptyResumeData());
    }

    if (id !== "uploaded") {
      setTimeout(() => triggerCompile(), 0);
    }
  };

  const clearResume = async () => {
    const resumeId = result?.resume_id;
    if (resumeId) {
      try {
        await deleteResume(resumeId);
      } catch (_) {}
    }

    try {
      localStorage.removeItem("careerlift:lastResume");
      localStorage.removeItem("careerlift:resumeBuilder");
    } catch (_) {}

    if (uploadedFileUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(uploadedFileUrl);
    }

    setResult(null);
    setFile(null);
    setError(null);
    setResumeData(null);
    setSelectedTemplate(null);
    setUploadedFileUrl(null);
    setPersonNameInput("");
    setResumeNameInput("");
    setActiveStep("upload");
    seededInitialStepRef.current = false;
  };

  const selectedTemplateInfo =
    templates.find((template) => template.id === selectedTemplate) || null;

  const previewEnabled = Boolean(
    previewImageUrl || (selectedTemplate === "uploaded" && uploadedFileUrl)
  );
  const editEnabled = Boolean(result || resumeData);
  const graphEnabled = Boolean(result);

  const steps: ResumeLabStep[] = [
    {
      id: "upload",
      label: "Select",
      description: "Pick an existing resume or upload a new one to start the flow.",
      enabled: true,
      complete: Boolean(result || resumeData),
    },
    {
      id: "edit",
      label: "Edit",
      description: "Choose a template and refine content with a compact preview.",
      enabled: editEnabled,
      complete: Boolean(selectedTemplate),
    },
    {
      id: "preview",
      label: "Preview",
      description: "Review the output at full size before downloading.",
      enabled: previewEnabled,
      complete: previewEnabled,
    },
    {
      id: "graph",
      label: "Graph",
      description: "Inspect the relationship map without crowding the editor.",
      enabled: graphEnabled,
      complete: graphEnabled,
    },
  ];

  const handleStepChange = (step: ResumeLabStepId) => {
    const targetStep = steps.find((item) => item.id === step);
    if (targetStep?.enabled) {
      setActiveStep(step);
    }
  };

  return (
    <div className="mx-auto max-w-300">
      <ResumeLabHeader
        canClear={Boolean(result || resumeData)}
        onClear={clearResume}
      />

      <ResumeLabStepper
        steps={steps}
        activeStep={activeStep}
        onStepChange={handleStepChange}
      />

      {activeStep === "upload" && (
        <UploadStep
          file={file}
          uploading={uploading}
          error={error}
          result={result}
          dragActive={dragActive}
          allowedExtensions={allowedExtensions}
          personNameInput={personNameInput}
          resumeNameInput={resumeNameInput}
          existingResumes={existingResumes}
          loadingExisting={loadingExisting}
          selectingExistingId={selectingExistingId}
          existingError={existingError}
          onPersonNameChange={setPersonNameInput}
          onResumeNameChange={setResumeNameInput}
          onDrag={handleDrag}
          onDrop={handleDrop}
          onFileSelect={handleFileChange}
          onUpload={handleUpload}
          onContinue={() => setActiveStep("edit")}
          onSelectExisting={handleSelectExisting}
        />
      )}

      {activeStep === "edit" && (
        <EditStep
          result={result}
          resumeData={resumeData}
          templates={templates}
          selectedTemplate={selectedTemplate}
          selectedTemplateInfo={selectedTemplateInfo}
          uploadedFileUrl={uploadedFileUrl}
          previewImageUrl={previewImageUrl}
          pageCount={pageCount}
          currentPage={currentPage}
          compiling={compiling}
          compileError={compileError}
          isRecompiling={isRecompiling}
          lastCompileTime={lastCompileTime}
          downloadingPdf={downloadingPdf}
          onTemplateSelect={handleTemplateSelect}
          onResumeChange={(data) => {
            setResumeData(data);
            // User edited a field — bump the dashboard's "Updated X ago"
            // for the active resume. Programmatic loads (initial mount,
            // switching resumes) go through setResumeData directly and
            // don't bump the timestamp.
            persistEditedAt();
          }}
          onCompile={triggerCompile}
          onDownloadPdf={handleDownloadPdf}
          onPageChange={goToPage}
        />
      )}

      {activeStep === "preview" && (
        <PreviewStep
          result={result}
          selectedTemplate={selectedTemplate}
          selectedTemplateInfo={selectedTemplateInfo}
          previewImageUrl={previewImageUrl}
          pageCount={pageCount}
          currentPage={currentPage}
          uploadedFileUrl={uploadedFileUrl}
          isRecompiling={isRecompiling}
          downloadingPdf={downloadingPdf}
          onDownloadPdf={handleDownloadPdf}
          onPageChange={goToPage}
        />
      )}

      {activeStep === "graph" && <GraphStep result={result} />}
    </div>
  );
}
