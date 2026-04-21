import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";

import { AppShell } from "@/components/shell/AppShell";
import { KnowledgeGraphCard } from "@/components/resume-lab/KnowledgeGraphCard";
import { PreviewCard } from "@/components/resume-lab/PreviewCard";
import { ResultsCard } from "@/components/resume-lab/ResultsCard";
import { ResumeEditorCard } from "@/components/resume-lab/ResumeEditorCard";
import { TemplateCarousel } from "@/components/resume-lab/TemplateCarousel";
import { UploadCard } from "@/components/resume-lab/UploadCard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { deleteResume, listTemplates, uploadResume } from "@/lib/api/resumeLab";
import { fetchResumeGraph, listResumes } from "@/lib/api/dashboard";
import { useResumeCompilePreview } from "@/hooks/useResumeCompilePreview";
import { createEmptyResumeData, createRecentResumeFromUpload, getGraphCounts, graphDataToResumeData } from "@/lib/resumeData";
import { clearRecentResume, makeRecentResumeFallback, setRecentResume } from "@/lib/storage/recentResume";
import { clearResumeLabSession, getResumeLabSession, setResumeLabSession } from "@/lib/storage/resumeLab";
import { useAppTheme } from "@/lib/theme";
import type { ResumeData, ResumeGraphResponse, ResumeSummary, ResumeUploadResult, TemplateInfo, UploadedDocument } from "@/lib/types";
import { asString, stripHtmlToText } from "@/lib/utils";

const allowedExtensions = [".txt", ".md", ".pdf", ".doc", ".docx"];

export default function ResumeLabScreen() {
  const { theme } = useAppTheme();
  const [bootstrapping, setBootstrapping] = React.useState(true);
  const [templates, setTemplates] = React.useState<TemplateInfo[]>([]);
  const [existingResumes, setExistingResumes] = React.useState<ResumeSummary[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null);
  const [uploadedDocument, setUploadedDocument] = React.useState<UploadedDocument | null>(null);
  const [personNameInput, setPersonNameInput] = React.useState("");
  const [resumeNameInput, setResumeNameInput] = React.useState("Default Resume");
  const [resumeData, setResumeData] = React.useState<ResumeData | null>(null);
  const [result, setResult] = React.useState<ResumeUploadResult | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [loadingExistingId, setLoadingExistingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedTemplateInfo = templates.find((template) => template.id === selectedTemplate) || null;

  const { previewImageUri, pageCount, currentPage, compiling, compileError, isRecompiling, triggerCompile, goToPage, lastCompileTime } =
    useResumeCompilePreview({ resumeData, selectedTemplate, debounceMs: 1500 });

  const refreshExistingResumes = React.useCallback(async () => {
    const resumes = await listResumes();
    setExistingResumes(resumes);
    return resumes;
  }, []);

  React.useEffect(() => {
    async function loadState() {
      try {
        const [templateList, savedSession, backendResumes] = await Promise.all([
          listTemplates(),
          getResumeLabSession(),
          refreshExistingResumes().catch(() => []),
        ]);

        setTemplates(templateList);

        if (savedSession) {
          const stillExists = !savedSession.result?.resume_id
            ? true
            : backendResumes.some((resume) => resume.resume_id === savedSession.result?.resume_id);

          if (stillExists) {
            setResult(savedSession.result);
            setResumeData(savedSession.resumeData);
            setSelectedTemplate(savedSession.selectedTemplate);
            setPersonNameInput(savedSession.personNameInput);
            setResumeNameInput(savedSession.resumeNameInput);
            setUploadedDocument(savedSession.uploadedDocument);
          } else {
            await clearResumeLabSession();
          }
        }
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to load Resume Lab.");
      } finally {
        setBootstrapping(false);
      }
    }

    void loadState();
  }, [refreshExistingResumes]);

  React.useEffect(() => {
    if (bootstrapping) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void setResumeLabSession({
        result,
        resumeData,
        selectedTemplate,
        personNameInput,
        resumeNameInput,
        uploadedDocument,
      });
    }, 300);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [bootstrapping, personNameInput, result, resumeData, resumeNameInput, selectedTemplate, uploadedDocument]);

  async function handlePickDocument() {
    setError(null);

    const picked = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (picked.canceled) return;

    const asset = picked.assets[0];
    const extension = asset.name ? `.${asset.name.split(".").pop()?.toLowerCase()}` : "";

    if (!allowedExtensions.includes(extension)) {
      setError(`Unsupported file type. Please upload: ${allowedExtensions.join(", ")}`);
      return;
    }

    const nextDocument: UploadedDocument = {
      name: asset.name,
      uri: asset.uri,
      mimeType: asset.mimeType,
      size: asset.size,
      extension,
      isPdf: extension === ".pdf",
    };

    setUploadedDocument(nextDocument);
    if (nextDocument.isPdf) {
      setSelectedTemplate((current) => current || "uploaded");
    }
  }

  async function handleUpload() {
    if (!uploadedDocument) return;
    setUploading(true);
    setError(null);

    try {
      const response = await uploadResume(uploadedDocument, personNameInput, resumeNameInput);
      setResult(response);
      setResumeData(graphDataToResumeData(response.graph_data));
      setPersonNameInput((current) => current || response.graph_data.person.name || "");
      setResumeNameInput((current) => current || response.resume_name || uploadedDocument.name);
      await setRecentResume(createRecentResumeFromUpload(response));
      await refreshExistingResumes();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to process resume.");
    } finally {
      setUploading(false);
    }
  }

  async function handleLoadExistingResume(resume: ResumeSummary) {
    setLoadingExistingId(resume.resume_id);
    setError(null);

    try {
      const graph = await fetchResumeGraph(asString(resume.person_name));
      const hydratedResult = hydrateResultFromExistingResume(resume, graph);

      setResult(hydratedResult);
      setResumeData(graphDataToResumeData(hydratedResult.graph_data));
      setUploadedDocument(null);
      setSelectedTemplate((current) => (current === "uploaded" ? null : current));
      setPersonNameInput(hydratedResult.person_name || hydratedResult.graph_data.person.name || "");
      setResumeNameInput(hydratedResult.resume_name || resume.resume_name);
      await setRecentResume({
        ...makeRecentResumeFallback(resume),
        filename: hydratedResult.filename,
        summary: hydratedResult.graph_data.person.summary,
        email: hydratedResult.graph_data.person.email,
        counts: getGraphCounts(hydratedResult.graph_data),
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to load existing resume.");
    } finally {
      setLoadingExistingId(null);
    }
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);
    if (!resumeData && templateId !== "uploaded") {
      setResumeData(createEmptyResumeData());
    }
  }

  async function clearResume() {
    const resumeId = result?.resume_id;
    if (resumeId) {
      try {
        await deleteResume(resumeId);
      } catch {
        // keep clearing local state even if backend cleanup fails
      }
    }

    await Promise.all([clearResumeLabSession(), clearRecentResume()]);
    setResult(null);
    setResumeData(null);
    setSelectedTemplate(null);
    setUploadedDocument(null);
    setPersonNameInput("");
    setResumeNameInput("Default Resume");
    setError(null);
    await refreshExistingResumes();
  }

  if (bootstrapping) {
    return (
      <AppShell title="Resume Lab" subtitle="Loading your mobile resume workspace…" scroll={false}>
        <LoadingState label="Loading Resume Lab…" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Resume Lab"
      subtitle="Upload, edit, preview, export, and inspect your resume graph from one native mobile workspace."
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.stack}>
        <UploadCard
          file={uploadedDocument}
          uploading={uploading}
          error={error}
          personNameInput={personNameInput}
          resumeNameInput={resumeNameInput}
          onPersonNameChange={setPersonNameInput}
          onResumeNameChange={setResumeNameInput}
          onPickDocument={() => void handlePickDocument()}
          onUpload={() => void handleUpload()}
          hasResult={!!result}
          onClearResume={() => void clearResume()}
        />

        <ExistingResumesCard
          resumes={existingResumes}
          currentResumeId={result?.resume_id ?? null}
          loadingResumeId={loadingExistingId}
          onSelectResume={handleLoadExistingResume}
          onRefresh={() => void refreshExistingResumes()}
        />

        {templates.length > 0 ? (
          <TemplateCarousel
            templates={templates}
            selectedTemplate={selectedTemplate}
            hasUploadedFile={!!uploadedDocument?.isPdf}
            resumeData={resumeData}
            onSelectTemplate={handleTemplateSelect}
          />
        ) : null}

        {resumeData ? (
          <ResumeEditorCard
            data={resumeData}
            onChange={setResumeData}
            onCompile={triggerCompile}
            compiling={compiling}
            compileError={compileError}
            selectedTemplate={selectedTemplateInfo}
            lastCompileTime={lastCompileTime}
          />
        ) : (
          <EmptyState
            title="Editor activates after import"
            message="Process a resume or select a LaTeX template to start editing structured sections on mobile."
          />
        )}

        <PreviewCard
          previewImageUri={previewImageUri}
          pageCount={pageCount}
          currentPage={currentPage}
          compiling={compiling}
          isRecompiling={isRecompiling}
          selectedTemplate={selectedTemplate}
          resumeData={resumeData}
          uploadedDocument={uploadedDocument}
          onPageChange={goToPage}
        />

        {result ? <ResultsCard result={result} onClear={() => void clearResume()} /> : null}

        {result?.graph_data ? <KnowledgeGraphCard graphData={result.graph_data} /> : null}

        {!result ? (
          <View style={[styles.footerNote, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
            <Text style={{ color: theme.palette.muted, lineHeight: theme.text.size(20) }}>
              Once you process a resume, the full results summary and interactive graph will appear here and persist across app restarts.
            </Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 20,
  },
  footerNote: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  existingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  existingTitle: {
    flex: 1,
    gap: 6,
  },
  existingList: {
    gap: 10,
  },
  existingRow: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  existingRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  existingMeta: {
    flex: 1,
    gap: 4,
  },
  existingActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currentBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
});

function hydrateResultFromExistingResume(resume: ResumeSummary, graph: ResumeGraphResponse): ResumeUploadResult {
  return {
    message: "Loaded from existing resume",
    filename: asString(graph.resumes?.[0]?.filename) || resume.resume_name,
    text_length: asString(graph.resumes?.[0]?.text || "").length,
    nodes_created: graph.skills.length + graph.experiences.length + graph.education.length + 1,
    graph_data: {
      person: {
        name: graph.person?.name || asString(resume.person_name),
        email: graph.person?.email,
        phone: graph.person?.phone,
        location: graph.person?.location,
        summary: graph.person?.summary,
      },
      skills: graph.skills,
      experiences: graph.experiences.map((item) => ({
        title: asString(item.title),
        company: asString(item.company),
        duration: asString(item.duration),
        description: asString(item.description),
      })),
      education: graph.education.map((item) => ({
        degree: asString(item.degree),
        institution: asString(item.institution),
        year: asString(item.year),
      })),
      saved_jobs: graph.saved_jobs.map((item) => ({
        ...item,
        description: stripHtmlToText(item.description),
      })),
      resumes: graph.resumes,
    },
    person_name: graph.person?.name || asString(resume.person_name),
    resume_name: resume.resume_name,
    resume_id: resume.resume_id,
  };
}

function ExistingResumesCard({
  resumes,
  currentResumeId,
  loadingResumeId,
  onSelectResume,
  onRefresh,
}: {
  resumes: ResumeSummary[];
  currentResumeId: string | null;
  loadingResumeId: string | null;
  onSelectResume: (resume: ResumeSummary) => void;
  onRefresh: () => void;
}) {
  const { theme } = useAppTheme();

  return (
    <Card delay={40}>
      <View style={styles.existingHeader}>
        <View style={styles.existingTitle}>
          <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(18), fontWeight: "700" }}>Existing Resumes</Text>
          <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), lineHeight: theme.text.size(20) }}>
            Pick from previously processed resumes, just like the web flow. Choosing one hydrates the editor, results, and preview context.
          </Text>
        </View>
        <Pressable onPress={onRefresh}>
          <Text style={{ color: theme.palette.accent, fontWeight: "700" }}>Refresh</Text>
        </Pressable>
      </View>

      {resumes.length === 0 ? (
        <EmptyState
          title="No processed resumes yet"
          message="Once a resume has been processed, it will show up here for quick reopening in Resume Lab."
        />
      ) : (
        <View style={styles.existingList}>
          {resumes.map((resume) => {
            const isCurrent = currentResumeId === resume.resume_id;
            const isLoading = loadingResumeId === resume.resume_id;

            return (
              <View
                key={resume.resume_id}
                style={[
                  styles.existingRow,
                  {
                    borderColor: isCurrent ? theme.palette.accentStrong : theme.palette.divider,
                    backgroundColor: isCurrent ? theme.palette.accentSoft : theme.palette.surfaceMuted,
                  },
                ]}
              >
                <View style={styles.existingRowTop}>
                  <View style={styles.existingMeta}>
                    <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(15), fontWeight: "700" }}>
                      {resume.resume_name}
                    </Text>
                    <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13) }}>
                      {asString(resume.person_name)}
                    </Text>
                    {resume.updated_at ? (
                      <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>
                        Updated {resume.updated_at}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.existingActions}>
                    {isCurrent ? (
                      <View style={[styles.currentBadge, { backgroundColor: theme.palette.surface }]}>
                        <Text style={{ color: theme.palette.accent, fontWeight: "700", fontSize: theme.text.size(11) }}>Current</Text>
                      </View>
                    ) : null}
                    <Pressable
                      onPress={() => onSelectResume(resume)}
                      disabled={isLoading}
                      style={[
                        styles.actionChip,
                        {
                          borderColor: theme.palette.divider,
                          backgroundColor: theme.palette.surface,
                          opacity: isLoading ? 0.65 : 1,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(12) }}>
                        {isLoading ? "Loading…" : "Open"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}
