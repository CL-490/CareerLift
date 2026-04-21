import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import AdvancedToolsDrawer from "@/components/resume-lab/AdvancedToolsDrawer";
import ResumeLabStepPanel from "@/components/resume-lab/ResumeLabStepPanel";
import type { GraphData, UploadResult } from "@/components/resume-lab/types";

type KGProps = { graphData?: GraphData | null; personName?: string; apiUrl?: string };

const DynamicKnowledgeGraph = dynamic<KGProps>(
  () =>
    import("@/components/KnowledgeGraph").then(
      (mod) => mod.default as ComponentType<KGProps>
    ),
  { ssr: false }
);

interface GraphStepProps {
  result: UploadResult | null;
}

export default function GraphStep({ result }: GraphStepProps) {
  return (
    <ResumeLabStepPanel
      title="Graph"
      description="Explore the imported relationships visually once the resume content is in place. Advanced local graph tools stay tucked away below."
    >
      {!result && (
        <div className="card hover-ring lab-surface">
          <h3 className="text-[20px] font-medium text-foreground">
            Graph view unlocks after upload
          </h3>
          <p className="mt-2 text-[14px] text-muted">
            Upload a resume first so the workspace has people, skills,
            education, and job relationships to visualize.
          </p>
        </div>
      )}

      {result && (
        <>
          <div className="card hover-ring lab-panel-ai">
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-[20px] font-medium text-foreground">
                  Knowledge graph
                </h3>
                <p className="mt-2 text-[14px] text-muted">
                  Click any node to inspect extracted details in the graph side
                  panel.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="lab-panel-info rounded-lg p-4">
                  <p className="mb-1 text-[12px] uppercase tracking-[0.2em] text-muted">
                    Person
                  </p>
                  <p className="text-[14px] font-medium text-foreground">
                    {result.graph_data.person.name}
                  </p>
                </div>
                <div className="lab-panel-ai rounded-lg p-4">
                  <p className="mb-1 text-[12px] uppercase tracking-[0.2em] text-muted">
                    Nodes created
                  </p>
                  <p className="text-[14px] font-medium text-foreground">
                    {result.nodes_created}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--background-alt)]/40 p-4 lab-surface">
              <DynamicKnowledgeGraph graphData={result.graph_data} />
            </div>
          </div>

          <AdvancedToolsDrawer />
        </>
      )}
    </ResumeLabStepPanel>
  );
}
