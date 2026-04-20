import type { ReactNode } from "react";

interface ResumeLabStepPanelProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function ResumeLabStepPanel({
  title,
  description,
  children,
}: ResumeLabStepPanelProps) {
  return (
    <section className="fade-in space-y-6">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-muted">
          Current Step
        </p>
        <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-6 text-muted">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}
