import type { ResumeLabStep, ResumeLabStepId } from "@/components/resume-lab/types";

interface ResumeLabStepperProps {
  steps: ResumeLabStep[];
  activeStep: ResumeLabStepId;
  onStepChange: (step: ResumeLabStepId) => void;
}

export default function ResumeLabStepper({
  steps,
  activeStep,
  onStepChange,
}: ResumeLabStepperProps) {
  return (
    <nav aria-label="Resume Lab steps" className="mb-8">
      <div className="card-3d lab-surface overflow-hidden p-2">
        <div className="flex gap-2 overflow-x-auto pb-1 styled-scrollbar">
          {steps.map((step, index) => {
            const isActive = step.id === activeStep;
            const marker = step.complete ? "✓" : String(index + 1);

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepChange(step.id)}
                disabled={!step.enabled}
                aria-current={isActive ? "step" : undefined}
                className={`min-w-[200px] rounded-xl border px-4 py-3 text-left transition-all ${
                  isActive
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-foreground shadow-[var(--shadow-2)]"
                    : step.enabled
                      ? "border-[var(--border-color)] bg-[var(--panel-bg)] text-foreground hover:border-[var(--accent)]/70 hover:bg-[var(--selection-hover-bg)]"
                      : "cursor-not-allowed border-[var(--border-strong)] bg-[var(--background-alt)]/30 text-muted opacity-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-semibold ${
                      isActive || step.complete
                        ? "border-[var(--accent)] bg-[var(--accent)]/15 text-foreground"
                        : "border-[var(--border-strong)] text-muted"
                    }`}
                  >
                    {marker}
                  </span>

                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold">
                      {step.label}
                    </span>
                    <span className="mt-1 block text-[12px] text-muted">
                      {step.description}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
