"use client";

import React, { useState } from "react";
import axios from "axios";

interface GraphData {
  person: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
  };
  skills: Array<string>;
  experiences: Array<{
    title: string;
    company: string;
    duration?: string;
    description?: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year?: string;
  }>;
}

interface UploadResult {
  message: string;
  filename: string;
  text_length: number;
  nodes_created: number;
  graph_data: GraphData;
}

export default function ResumeLabPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const allowedExtensions = [".txt", ".md", ".pdf", ".doc", ".docx"];
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Load the last uploaded resume (if any) so navigating back from dashboard shows data
  React.useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("careerlift:lastResume") : null;
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        filename: string;
        text_length: number;
        graph_data: GraphData;
        nodes_created?: number;
        storedAt?: number;
      };
      if (saved && saved.graph_data && saved.graph_data.person) {
        const reconstructed: UploadResult = {
          message: "Loaded from previous upload",
          filename: saved.filename,
          text_length: saved.text_length,
          nodes_created: saved.nodes_created ?? 0,
          graph_data: saved.graph_data,
        };
        setResult(reconstructed);
      }
    } catch (_) {
      // ignore parse errors
    }
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (selectedFile: File) => {
    const fileExt = "." + selectedFile.name.split(".").pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExt || "")) {
      setError(`Unsupported file type. Please upload: ${allowedExtensions.join(", ")}`);
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post<UploadResult>(
        `${API_URL}/api/resume/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(response.data);
      // Persist for dashboard quick view
      try {
        const payload = {
          filename: response.data.filename,
          text_length: response.data.text_length,
          graph_data: response.data.graph_data,
          nodes_created: response.data.nodes_created,
          storedAt: Date.now(),
        };
        if (typeof window !== "undefined") {
          localStorage.setItem("careerlift:lastResume", JSON.stringify(payload));
        }
      } catch (_) {
        // non-fatal
      }
      setFile(null);
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail;
      if (typeof errorDetail === 'object') {
        setError(errorDetail.message || errorDetail.error || "Failed to process resume. Please try again.");
      } else {
        setError(errorDetail || "Failed to process resume. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-4">
      <h1 className="text-[40px] font-semibold tracking-tight heading-gradient mb-6">
        Resume Lab
      </h1>

      {/* Upload Section */}
      <div className="card hover-ring mb-6 card-hue">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-medium">Upload Resume</h2>
          {result && (
            <button
              onClick={() => {
                try {
                  localStorage.removeItem("careerlift:lastResume");
                } catch (_) {}
                setResult(null);
                setFile(null);
                setError(null);
              }}
              className="text-[13px] text-muted hover:text-foreground underline-offset-2 hover:underline"
              type="button"
              title="Clear saved resume"
            >
              Clear resume
            </button>
          )}
        </div>
        <p className="text-muted text-[14px] mb-4">
          Upload your resume to extract and visualize your career information as a knowledge graph.
        </p>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-500/10"
              : "border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.24)]"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <svg
              className="w-12 h-12 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>

            <div>
              <label className="cursor-pointer">
                <span className="text-blue-400 hover:text-blue-300 font-medium">
                  Click to upload
                </span>
                <span className="text-muted"> or drag and drop</span>
                <input
                  type="file"
                  className="hidden"
                  accept={allowedExtensions.join(",")}
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
              </label>
            </div>

            <p className="text-[13px] text-muted">
              Supported formats: TXT, MD, PDF, DOC, DOCX
            </p>

            {file && (
              <div className="mt-2 text-[14px] text-green-400">
                Selected: {file.name}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[14px]">
            {error}
          </div>
        )}

        {file && !uploading && (
          <button
            onClick={handleUpload}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Process Resume
          </button>
        )}

        {uploading && (
          <div className="mt-4 text-center text-muted text-[14px]">
            Processing your resume...
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="card hover-ring card-hue">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] font-medium">Processing Results</h2>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem("careerlift:lastResume");
                } catch (_) {}
                setResult(null);
                setFile(null);
                setError(null);
              }}
              className="text-[13px] text-muted hover:text-foreground underline-offset-2 hover:underline"
              type="button"
              title="Clear saved resume"
            >
              Clear resume
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="panel-tinted p-4 rounded-lg">
                <p className="text-[13px] text-muted mb-1">File</p>
                <p className="text-[15px] font-medium">{result.filename}</p>
              </div>
              <div className="panel-tinted p-4 rounded-lg">
                <p className="text-[13px] text-muted mb-1">Text Extracted</p>
                <p className="text-[15px] font-medium">{result.text_length.toLocaleString()} characters</p>
              </div>
              <div className="panel-tinted p-4 rounded-lg">
                <p className="text-[13px] text-muted mb-1">Nodes Created</p>
                <p className="text-[15px] font-medium">{result.nodes_created}</p>
              </div>
              <div className="panel-tinted p-4 rounded-lg">
                <p className="text-[13px] text-muted mb-1">Status</p>
                <p className="text-[15px] font-medium text-green-400">✓ Success</p>
              </div>
            </div>

            {/* Person Info */}
            <div className="mt-6">
              <h3 className="text-[16px] font-medium mb-3">Person</h3>
              <div className="panel-tinted p-4 rounded-lg">
                <p className="text-[18px] font-semibold mb-2">{result.graph_data.person.name}</p>
                {result.graph_data.person.email && (
                  <p className="text-[14px] text-muted">Email: {result.graph_data.person.email}</p>
                )}
                {result.graph_data.person.phone && (
                  <p className="text-[14px] text-muted">Phone: {result.graph_data.person.phone}</p>
                )}
                {result.graph_data.person.location && (
                  <p className="text-[14px] text-muted">Location: {result.graph_data.person.location}</p>
                )}
                {result.graph_data.person.summary && (
                  <p className="text-[14px] text-muted mt-2">{result.graph_data.person.summary}</p>
                )}
              </div>
            </div>

            {/* Skills */}
            {result.graph_data.skills.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[16px] font-medium mb-3">Skills ({result.graph_data.skills.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {result.graph_data.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-[13px]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {result.graph_data.experiences.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[16px] font-medium mb-3">Experience ({result.graph_data.experiences.length})</h3>
                <div className="space-y-3">
                  {result.graph_data.experiences.map((exp, idx) => (
                    <div key={idx} className="panel-tinted p-4 rounded-lg">
                      <p className="text-[15px] font-medium">{exp.title}</p>
                      <p className="text-[14px] text-blue-400">{exp.company}</p>
                      {exp.duration && (
                        <p className="text-[13px] text-muted mt-1">
                          {exp.duration}
                        </p>
                      )}
                      {exp.description && (
                        <p className="text-[13px] text-muted mt-2">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {result.graph_data.education.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[16px] font-medium mb-3">Education ({result.graph_data.education.length})</h3>
                <div className="space-y-3">
                  {result.graph_data.education.map((edu, idx) => (
                    <div key={idx} className="panel-tinted p-4 rounded-lg">
                      <p className="text-[15px] font-medium">{edu.degree}</p>
                      <p className="text-[14px] text-blue-400">{edu.institution}</p>
                      {edu.year && (
                        <p className="text-[13px] text-muted mt-1">{edu.year}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-[14px]">
              ✓ Knowledge graph created successfully. View it in Neo4j Browser at{" "}
              <a
                href="http://localhost:7474"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-green-300"
              >
                localhost:7474
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
