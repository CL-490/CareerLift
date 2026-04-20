import type { Notice } from "@/components/job-finder/types";

interface FeedbackBannerProps {
  notice: Notice | null;
  onDismiss: () => void;
}

const styles = {
  error: "notice-error",
  info: "notice-info",
  success: "notice-success",
};

export default function FeedbackBanner({
  notice,
  onDismiss,
}: FeedbackBannerProps) {
  if (!notice) return null;

  return (
    <div
      className={`notice-banner mb-4 flex items-start justify-between gap-4 px-4 py-3 text-sm ${styles[notice.type]}`}
    >
      <p>{notice.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs font-medium underline underline-offset-2"
      >
        Dismiss
      </button>
    </div>
  );
}
