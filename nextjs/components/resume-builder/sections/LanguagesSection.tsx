import React from "react";
import type { LanguageEntry } from "../../../types/resume";
import { inputClass, addBtnClass, removeBtnClass } from "./shared";

interface Props {
  data: LanguageEntry[];
  onChange: (data: LanguageEntry[]) => void;
}

export default function LanguagesSection({ data, onChange }: Props) {
  const update = (idx: number, field: keyof LanguageEntry, value: string) => {
    const next = [...data];
    next[idx] = { ...next[idx], [field]: value };
    onChange(next);
  };

  const add = () => onChange([...data, { name: "", level: "" }]);
  const remove = (idx: number) => onChange(data.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {data.map((l, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <input
            className={inputClass + " flex-1"}
            placeholder="Language"
            value={l.name}
            onChange={(e) => update(idx, "name", e.target.value)}
          />
          <input
            className={inputClass + " w-1/3"}
            placeholder="Level (e.g., Native, Fluent)"
            value={l.level}
            onChange={(e) => update(idx, "level", e.target.value)}
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
        + Add Language
      </button>
    </div>
  );
}
