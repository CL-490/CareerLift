import React from "react";
import type { SkillsData } from "../../../types/resume";
import { inputClass, addBtnClass, removeBtnClass } from "./shared";

interface Props {
  data: SkillsData;
  onChange: (data: SkillsData) => void;
}

export default function SkillsSection({ data, onChange }: Props) {
  const updateCat = (
    idx: number,
    field: "name" | "items",
    value: string
  ) => {
    const cats = [...data.categories];
    cats[idx] = { ...cats[idx], [field]: value };
    onChange({ ...data, categories: cats });
  };

  const addCat = () =>
    onChange({
      ...data,
      categories: [...data.categories, { name: "", items: "" }],
    });

  const removeCat = (idx: number) =>
    onChange({
      ...data,
      categories: data.categories.filter((_, i) => i !== idx),
    });

  const updateFlat = (value: string) =>
    onChange({
      ...data,
      flat: value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] text-muted mb-1 block">
          Flat skills (comma-separated, used when no categories)
        </label>
        <input
          className={inputClass}
          placeholder="Python, JavaScript, React, Docker..."
          value={data.flat.join(", ")}
          onChange={(e) => updateFlat(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <span className="text-[12px] text-muted">Skill Categories</span>
        {data.categories.map((cat, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <input
              className={inputClass + " w-1/3"}
              placeholder="Category name"
              value={cat.name}
              onChange={(e) => updateCat(idx, "name", e.target.value)}
            />
            <input
              className={inputClass + " flex-1"}
              placeholder="Skills (comma-separated)"
              value={cat.items}
              onChange={(e) => updateCat(idx, "items", e.target.value)}
            />
            <button
              onClick={() => removeCat(idx)}
              className={removeBtnClass + " self-center"}
            >
              x
            </button>
          </div>
        ))}
        <button onClick={addCat} className={addBtnClass}>
          + Add Category
        </button>
      </div>
    </div>
  );
}
