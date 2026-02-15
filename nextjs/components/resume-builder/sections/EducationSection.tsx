import React from "react";
import type { EducationEntry } from "../../../types/resume";
import { inputClass, addBtnClass, removeBtnClass } from "./shared";

interface Props {
  data: EducationEntry[];
  onChange: (data: EducationEntry[]) => void;
}

const empty = (): EducationEntry => ({
  degree: "",
  institution: "",
  dates: "",
  location: "",
  gpa: "",
  details: [],
});

export default function EducationSection({ data, onChange }: Props) {
  const update = (idx: number, field: keyof EducationEntry, value: string) => {
    const next = [...data];
    next[idx] = { ...next[idx], [field]: value };
    onChange(next);
  };

  const add = () => onChange([...data, empty()]);
  const remove = (idx: number) => onChange(data.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {data.map((edu, idx) => (
        <div
          key={idx}
          className="panel-tinted p-3 rounded-lg space-y-2"
        >
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-muted">Entry {idx + 1}</span>
            <button onClick={() => remove(idx)} className={removeBtnClass}>
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className={inputClass}
              placeholder="Degree"
              value={edu.degree}
              onChange={(e) => update(idx, "degree", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Institution"
              value={edu.institution}
              onChange={(e) => update(idx, "institution", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Dates (e.g., 2020 -- 2024)"
              value={edu.dates}
              onChange={(e) => update(idx, "dates", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="GPA"
              value={edu.gpa}
              onChange={(e) => update(idx, "gpa", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Location"
              value={edu.location}
              onChange={(e) => update(idx, "location", e.target.value)}
            />
          </div>
        </div>
      ))}
      <button onClick={add} className={addBtnClass}>
        + Add Education
      </button>
    </div>
  );
}
