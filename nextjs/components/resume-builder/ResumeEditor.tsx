import React, { useState } from "react";
import type { ResumeData, TemplateInfo } from "../../types/resume";
import PersonSection from "./sections/PersonSection";
import EducationSection from "./sections/EducationSection";
import ExperienceSection from "./sections/ExperienceSection";
import SkillsSection from "./sections/SkillsSection";
import ProjectsSection from "./sections/ProjectsSection";
import AwardsSection from "./sections/AwardsSection";
import LeadershipSection from "./sections/LeadershipSection";
import CertificationsSection from "./sections/CertificationsSection";
import LanguagesSection from "./sections/LanguagesSection";
import CompileButton from "./CompileButton";

interface Props {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  onCompile: () => void;
  compiling: boolean;
  compileError: string | null;
  selectedTemplate: TemplateInfo | null;
  lastCompileTime?: number | null;
}

interface SectionConfig {
  key: string;
  label: string;
  render: () => React.ReactNode;
}

export default function ResumeEditor({
  data,
  onChange,
  onCompile,
  compiling,
  compileError,
  selectedTemplate,
  lastCompileTime,
}: Props) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["person", "education", "experiences", "skills"])
  );

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const supported = new Set(selectedTemplate?.supported_sections || []);
  const isSupported = (key: string) =>
    !selectedTemplate || supported.has(key) || key === "person";

  const sections: SectionConfig[] = [
    {
      key: "person",
      label: "Personal Info",
      render: () => (
        <PersonSection
          data={data.person}
          onChange={(person) => onChange({ ...data, person })}
        />
      ),
    },
    {
      key: "education",
      label: "Education",
      render: () => (
        <EducationSection
          data={data.education}
          onChange={(education) => onChange({ ...data, education })}
        />
      ),
    },
    {
      key: "experiences",
      label: "Experience",
      render: () => (
        <ExperienceSection
          data={data.experiences}
          onChange={(experiences) => onChange({ ...data, experiences })}
        />
      ),
    },
    {
      key: "skills",
      label: "Skills",
      render: () => (
        <SkillsSection
          data={data.skills}
          onChange={(skills) => onChange({ ...data, skills })}
        />
      ),
    },
    {
      key: "projects",
      label: "Projects",
      render: () => (
        <ProjectsSection
          data={data.projects}
          onChange={(projects) => onChange({ ...data, projects })}
        />
      ),
    },
    {
      key: "awards",
      label: "Awards",
      render: () => (
        <AwardsSection
          data={data.awards}
          onChange={(awards) => onChange({ ...data, awards })}
        />
      ),
    },
    {
      key: "leadership",
      label: "Leadership",
      render: () => (
        <LeadershipSection
          data={data.leadership}
          onChange={(leadership) => onChange({ ...data, leadership })}
        />
      ),
    },
    {
      key: "certifications",
      label: "Certifications",
      render: () => (
        <CertificationsSection
          data={data.certifications}
          onChange={(certifications) => onChange({ ...data, certifications })}
        />
      ),
    },
    {
      key: "languages",
      label: "Languages",
      render: () => (
        <LanguagesSection
          data={data.languages}
          onChange={(languages) => onChange({ ...data, languages })}
        />
      ),
    },
  ];

  return (
    <div className="card hover-ring card-hue mb-6">
      <h2 className="text-[20px] font-medium mb-4">Resume Editor</h2>

      <div className="space-y-2 mb-4">
        {sections.map((section) => {
          const active = isSupported(section.key);
          const open = openSections.has(section.key);

          return (
            <div
              key={section.key}
              className={`rounded-lg border transition-colors ${
                active
                  ? "border-[var(--border-color)]"
                  : "border-[var(--border-strong)] opacity-40"
              }`}
            >
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <span className="text-[14px] font-medium">
                  {section.label}
                  {!active && (
                    <span className="text-[11px] text-muted ml-2">
                      (not used by this template)
                    </span>
                  )}
                </span>
                <svg
                  className={`w-4 h-4 text-muted transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {open && <div className="px-3 pb-3">{section.render()}</div>}
            </div>
          );
        })}
      </div>

      <CompileButton
        onClick={onCompile}
        compiling={compiling}
        error={compileError}
        lastCompileTime={lastCompileTime}
      />
    </div>
  );
}
