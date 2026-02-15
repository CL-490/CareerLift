import React from "react";
import type { AwardEntry } from "../../../types/resume";
import { inputClass, addBtnClass, removeBtnClass } from "./shared";

interface Props {
  data: AwardEntry[];
  onChange: (data: AwardEntry[]) => void;
}

export default function AwardsSection({ data, onChange }: Props) {
  const update = (idx: number, field: keyof AwardEntry, value: string) => {
    const next = [...data];
    next[idx] = { ...next[idx], [field]: value };
    onChange(next);
  };

  const add = () => onChange([...data, { title: "", description: "" }]);
  const remove = (idx: number) => onChange(data.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {data.map((a, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <input
            className={inputClass + " w-1/3"}
            placeholder="Award title"
            value={a.title}
            onChange={(e) => update(idx, "title", e.target.value)}
          />
          <input
            className={inputClass + " flex-1"}
            placeholder="Description"
            value={a.description}
            onChange={(e) => update(idx, "description", e.target.value)}
          />
          <button
            onClick={() => remove(idx)}
            className={removeBtnClass + " self-center"}
          >
            x
          </button>
        </div>
      ))}
      <button onClick={add} className={addBtnClass}>
        + Add Award
      </button>
    </div>
  );
}
