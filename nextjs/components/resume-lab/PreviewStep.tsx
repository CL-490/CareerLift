import PdfViewer from "@/components/resume-builder/PdfViewer";
import ResumeLabStepPanel from "@/components/resume-lab/ResumeLabStepPanel";
import type { UploadResult } from "@/components/resume-lab/types";
import type { TemplateInfo } from "@/types/resume";

interface PreviewStepProps {
  result: UploadResult | null;
  selectedTemplate: string | null;
  selectedTemplateInfo: TemplateInfo | null;
  previewImageUrl: string | null;
  pageCount: number;
  currentPage: number;
  uploadedFileUrl: string | null;
  isRecompiling: boolean;
  downloadingPdf: boolean;
  onDownloadPdf: () => void;
  onPageChange: (page: number) => void;
}

function PreviewToolbar({
  result,
  selectedTemplate,
  selectedTemplateInfo,
}: {
  result: UploadResult | null;
  selectedTemplate: string | null;
  selectedTemplateInfo: TemplateInfo | null;
}) {
  const templateLabel =
    selectedTemplate === "uploaded"
      ? "Uploaded file"
      : selectedTemplateInfo?.name || "Not selected";

  return (
    <div className="card-3d lab-surface p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-[20px] font-medium text-foreground">
            Final preview
          </h3>
          <p className="mt-2 text-[14px] text-muted">
            Review the output at full size before downloading or moving into
            the graph view.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="lab-panel-info rounded-lg p-4">
            <p className="mb-1 text-[12px] uppercase tracking-[0.2em] text-muted">
              Resume
            </p>
            <p className="text-[14px] font-medium text-foreground">
              {result?.resume_name || result?.graph_data.person.name || result?.filename || "Untitled"}
            </p>
          </div>
          <div className="lab-panel-ai rounded-lg p-4">
            <p className="mb-1 text-[12px] uppercase tracking-[0.2em] text-muted">
              Template
            </p>
            <p className="text-[14px] font-medium text-foreground">
              {templateLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreviewStep({
  result,
  selectedTemplate,
  selectedTemplateInfo,
  previewImageUrl,
  pageCount,
  currentPage,
  uploadedFileUrl,
  isRecompiling,
  downloadingPdf,
  onDownloadPdf,
  onPageChange,
}: PreviewStepProps) {
  const hasUploadedPreview = selectedTemplate === "uploaded" && !!uploadedFileUrl;
  const hasLatexPreview = selectedTemplate !== "uploaded" && !!previewImageUrl;

  return (
    <ResumeLabStepPanel
      title="Preview"
      description="Focus on the finished output only. This view is intentionally quiet so you can proofread layout, pagination, and polish."
    >
      <PreviewToolbar
        result={result}
        selectedTemplate={selectedTemplate}
        selectedTemplateInfo={selectedTemplateInfo}
      />

      {!hasUploadedPreview && !hasLatexPreview && (
        <div className="card hover-ring lab-surface">
          <h3 className="text-[20px] font-medium text-foreground">
            Preview will appear here
          </h3>
          <p className="mt-2 text-[14px] text-muted">
            Choose a template in the Edit step first. Once you have either a
            compiled preview or the uploaded file selected, this step becomes
            available for full-size review.
          </p>
        </div>
      )}

      {hasUploadedPreview && (
        <PdfViewer
          variant="full"
          previewImageUrl={null}
          uploadedFileUrl={uploadedFileUrl}
          showUploaded={true}
        />
      )}

      {hasLatexPreview && (
        <PdfViewer
          variant="full"
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
      )}
    </ResumeLabStepPanel>
  );
}
