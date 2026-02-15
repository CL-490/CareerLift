import React from "react";
import type { CertificationEntry } from "../../../types/resume";
import { inputClass, addBtnClass, removeBtnClass } from "./shared";

interface Props {
  data: CertificationEntry[];
  onChange: (data: CertificationEntry[]) => void;
}

export default function CertificationsSection({ data, onChange }: Props) {
  const update = (
    idx: number,
    field: keyof CertificationEntry,
    value: string
  ) => {
    const next = [...data];
    next[idx] = { ...next[idx], [field]: value };
    onChange(next);
  };

  const add = () =>
    onChange([...data, { name: "", institution: "", url: "" }]);
  const remove = (idx: number) => onChange(data.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {data.map((c, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <input
            className={inputClass + " flex-1"}
            placeholder="Certification name"
            value={c.name}
            onChange={(e) => update(idx, "name", e.target.value)}
          />
          <input
            className={inputClass + " w-1/4"}
            placeholder="Institution"
            value={c.institution}
            onChange={(e) => update(idx, "institution", e.target.value)}
          />
          <input
            className={inputClass + " w-1/4"}
            placeholder="URL"
            value={c.url}
            onChange={(e) => update(idx, "url", e.target.value)}
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
        + Add Certification
      </button>
    </div>
  );
}
