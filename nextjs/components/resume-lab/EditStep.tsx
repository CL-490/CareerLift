import TemplateSelector from "@/components/resume-builder/TemplateSelector";
import PdfViewer from "@/components/resume-builder/PdfViewer";
import ResumeEditor from "@/components/resume-builder/ResumeEditor";
import ResumeLabStepPanel from "@/components/resume-lab/ResumeLabStepPanel";
import type { UploadResult } from "@/components/resume-lab/types";
import type { ResumeData, TemplateInfo } from "@/types/resume";

interface EditStepProps {
  result: UploadResult | null;
  resumeData: ResumeData | null;
  templates: TemplateInfo[];
  selectedTemplate: string | null;
  selectedTemplateInfo: TemplateInfo | null;
  uploadedFileUrl: string | null;
  previewImageUrl: string | null;
  pageCount: number;
  currentPage: number;
  compiling: boolean;
  compileError: string | null;
  isRecompiling: boolean;
  lastCompileTime: number | null;
  downloadingPdf: boolean;
  onTemplateSelect: (id: string) => void;
  onResumeChange: (data: ResumeData) => void;
  onCompile: () => void;
  onDownloadPdf: () => void;
  onPageChange: (page: number) => void;
}

function EditStatusBar({
  result,
  selectedTemplate,
  selectedTemplateInfo,
  lastCompileTime,
}: {
  result: UploadResult | null;
  selectedTemplate: string | null;
  selectedTemplateInfo: TemplateInfo | null;
  lastCompileTime: number | null;
}) {
  const templateLabel =
    selectedTemplate === "uploaded"
      ? "Uploaded file"
      : selectedTemplateInfo?.name || "Choose a template";

  return (
    <div className="card-3d lab-surface p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="lab-panel-info rounded-lg p-4">
          <p className="mb-1 text-[12px] uppercase tracking-[0.2em] text-muted">
            Imported resume
          </p>
          <p className="text-[15px] font-medium text-foreground">
            {result?.resume_name || result?.graph_data.person.name || result?.filename || "Untitled"}
          </p>
        </div>
        <div className="lab-panel-ai rounded-lg p-4">
          <p className="mb-1 text-[12px] uppercase tracking-[0.2em] text-muted">
            Template
          </p>
          <p className="text-[15px] font-medium text-foreground">
            {templateLabel}
          </p>
        </div>
        <div className="lab-panel-success rounded-lg p-4">
          <p className="mb-1 text-[12px] uppercase tracking-[0.2em] text-muted">
            Preview status
          </p>
          <p className="text-[15px] font-medium text-foreground">
            {lastCompileTime ? "Auto-preview is live" : "Ready when you are"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EditStep({
  result,
  resumeData,
  templates,
  selectedTemplate,
  selectedTemplateInfo,
  uploadedFileUrl,
  previewImageUrl,
  pageCount,
  currentPage,
  compiling,
  compileError,
  isRecompiling,
  lastCompileTime,
  downloadingPdf,
  onTemplateSelect,
  onResumeChange,
  onCompile,
  onDownloadPdf,
  onPageChange,
}: EditStepProps) {
  const hasLatexTemplate =
    !!resumeData && !!selectedTemplate && selectedTemplate !== "uploaded";
  const hasUploadedPreview = selectedTemplate === "uploaded" && !!uploadedFileUrl;

  return (
    <ResumeLabStepPanel
      title="Edit"
      description="Choose a template, refine the extracted content, and keep a live compact preview visible while you work."
    >
      <EditStatusBar
        result={result}
        selectedTemplate={selectedTemplate}
        selectedTemplateInfo={selectedTemplateInfo}
        lastCompileTime={lastCompileTime}
      />

      {templates.length > 0 && (
        <TemplateSelector
          templates={templates}
          selected={selectedTemplate}
          onSelect={onTemplateSelect}
          hasUploadedFile={!!uploadedFileUrl}
          resumeData={resumeData}
        />
      )}

      {!selectedTemplate && (
        <div className="card hover-ring lab-surface">
          <h3 className="text-[20px] font-medium text-foreground">
            Start by choosing a template
          </h3>
          <p className="mt-2 max-w-2xl text-[14px] text-muted">
            Pick either the original uploaded file or one of the editable
            resume templates above. Once selected, this step becomes your main
            editing workspace.
          </p>
        </div>
      )}

      {hasUploadedPreview && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div className="card hover-ring lab-panel-info">
            <h3 className="text-[20px] font-medium text-foreground">
              Uploaded file selected
            </h3>
            <p className="mt-2 text-[14px] text-muted">
              You are reviewing the original PDF instead of an editable LaTeX
              template. Switch back to the template strip at any time if you
              want to edit structured resume sections.
            </p>
          </div>

          <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
            <PdfViewer
              variant="compact"
              previewImageUrl={null}
              uploadedFileUrl={uploadedFileUrl}
              showUploaded={true}
            />
          </div>
        </div>
      )}

      {hasLatexTemplate && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <div className="min-w-0">
            <ResumeEditor
              data={resumeData!}
              onChange={onResumeChange}
              onCompile={onCompile}
              compiling={compiling}
              compileError={compileError}
              selectedTemplate={selectedTemplateInfo}
              lastCompileTime={lastCompileTime}
            />
          </div>

          <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
            <PdfViewer
              variant="compact"
              previewImageUrl={previewImageUrl}
              pageCount={pageCount}
              currentPage={currentPage}
              uploadedFileUrl={uploadedFileUrl}
              showUploaded={false}
              isRecompiling={isRecompiling}
              onDownloadPdf={onDownloadPdf}
              downloadingPdf={downloadingPdf}
              onPageChange={onPageChange}
            />
          </div>
        </div>
      )}
    </ResumeLabStepPanel>
  );
}
