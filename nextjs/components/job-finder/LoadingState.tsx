import { SOURCES } from "@/components/job-finder/types";
import type { LoadingState as LoadingStateType } from "@/components/job-finder/types";

interface LoadingStateProps {
  loadingState: LoadingStateType;
}

export default function LoadingState({ loadingState }: LoadingStateProps) {
  return (
    <div className="py-12 text-center">
      <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
      <p className="mb-4 text-sm text-muted">Loading jobs from all sources...</p>
      <div className="mx-auto max-w-md space-y-2">
        {SOURCES.map(({ key, label }) => {
          const state = loadingState[key];
          const progress = state?.progress || 0;
          return (
            <div key={key} className="text-left">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-muted">{label}</span>
                <span className="text-xs font-medium text-blue-400">
                  {progress}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-700">
                <div
                  className="h-1.5 rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
