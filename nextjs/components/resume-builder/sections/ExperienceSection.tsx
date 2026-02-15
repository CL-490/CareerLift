import React from "react";
import type { ExperienceEntry } from "../../../types/resume";
import { inputClass, addBtnClass, removeBtnClass } from "./shared";

interface Props {
  data: ExperienceEntry[];
  onChange: (data: ExperienceEntry[]) => void;
}

const empty = (): ExperienceEntry => ({
  title: "",
  company: "",
  dates: "",
  location: "",
  keywords: "",
  bullets: [],
});

export default function ExperienceSection({ data, onChange }: Props) {
  const update = (idx: number, field: keyof ExperienceEntry, value: string) => {
    const next = [...data];
    next[idx] = { ...next[idx], [field]: value };
    onChange(next);
  };

  const updateBullet = (idx: number, bIdx: number, value: string) => {
    const next = [...data];
    const bullets = [...next[idx].bullets];
    bullets[bIdx] = value;
    next[idx] = { ...next[idx], bullets };
    onChange(next);
  };

  const addBullet = (idx: number) => {
    const next = [...data];
    next[idx] = { ...next[idx], bullets: [...next[idx].bullets, ""] };
    onChange(next);
  };

  const removeBullet = (idx: number, bIdx: number) => {
    const next = [...data];
    next[idx] = {
      ...next[idx],
      bullets: next[idx].bullets.filter((_, i) => i !== bIdx),
    };
    onChange(next);
  };

  const add = () => onChange([...data, empty()]);
  const remove = (idx: number) => onChange(data.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {data.map((exp, idx) => (
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
              placeholder="Job Title"
              value={exp.title}
              onChange={(e) => update(idx, "title", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Company"
              value={exp.company}
              onChange={(e) => update(idx, "company", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Dates"
              value={exp.dates}
              onChange={(e) => update(idx, "dates", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Location"
              value={exp.location}
              onChange={(e) => update(idx, "location", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-muted">Bullet points</span>
            {exp.bullets.map((b, bIdx) => (
              <div key={bIdx} className="flex gap-2">
                <input
                  className={inputClass + " flex-1"}
                  placeholder="Bullet point"
                  value={b}
                  onChange={(e) => updateBullet(idx, bIdx, e.target.value)}
                />
                <button
                  onClick={() => removeBullet(idx, bIdx)}
                  className={removeBtnClass + " self-center"}
                >
                  x
                </button>
              </div>
            ))}
            <button onClick={() => addBullet(idx)} className={addBtnClass}>
              + Add bullet
            </button>
          </div>
        </div>
      ))}
      <button onClick={add} className={addBtnClass}>
        + Add Experience
      </button>
    </div>
  );
}
