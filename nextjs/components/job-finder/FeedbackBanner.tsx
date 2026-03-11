import type { Notice } from "@/components/job-finder/types";

interface FeedbackBannerProps {
  notice: Notice | null;
  onDismiss: () => void;
}

const styles = {
  error: "border-red-300 bg-red-50 text-red-800",
  info: "border-blue-300 bg-blue-50 text-blue-800",
  success: "border-green-300 bg-green-50 text-green-800",
};

export default function FeedbackBanner({
  notice,
  onDismiss,
}: FeedbackBannerProps) {
  if (!notice) return null;

  return (
    <div
      className={`mb-4 flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ${styles[notice.type]}`}
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
