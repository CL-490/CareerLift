import React from "react";
import type { LeadershipEntry } from "../../../types/resume";
import { inputClass, addBtnClass, removeBtnClass } from "./shared";

interface Props {
  data: LeadershipEntry[];
  onChange: (data: LeadershipEntry[]) => void;
}

const empty = (): LeadershipEntry => ({
  title: "",
  organization: "",
  dates: "",
  bullets: [],
});

export default function LeadershipSection({ data, onChange }: Props) {
  const update = (idx: number, field: keyof LeadershipEntry, value: string) => {
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
      {data.map((lead, idx) => (
        <div key={idx} className="panel-tinted p-3 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-muted">Entry {idx + 1}</span>
            <button onClick={() => remove(idx)} className={removeBtnClass}>
              Remove
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              className={inputClass}
              placeholder="Title / Role"
              value={lead.title}
              onChange={(e) => update(idx, "title", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Organization"
              value={lead.organization}
              onChange={(e) => update(idx, "organization", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Dates"
              value={lead.dates}
              onChange={(e) => update(idx, "dates", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-muted">Bullet points</span>
            {lead.bullets.map((b, bIdx) => (
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
        + Add Leadership
      </button>
    </div>
  );
}
