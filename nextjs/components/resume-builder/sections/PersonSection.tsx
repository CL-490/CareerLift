import React from "react";
import type { PersonData } from "../../../types/resume";
import { inputClass } from "./shared";

interface Props {
  data: PersonData;
  onChange: (data: PersonData) => void;
}

const FIELDS: { key: keyof PersonData; label: string; placeholder: string }[] =
  [
    { key: "first_name", label: "First Name", placeholder: "John" },
    { key: "last_name", label: "Last Name", placeholder: "Doe" },
    { key: "email", label: "Email", placeholder: "john@example.com" },
    { key: "phone", label: "Phone", placeholder: "+1-555-000-0000" },
    { key: "location", label: "Location", placeholder: "City, State" },
    { key: "website", label: "Website", placeholder: "https://example.com" },
    { key: "linkedin", label: "LinkedIn", placeholder: "linkedin-username" },
    { key: "github", label: "GitHub", placeholder: "github-username" },
    { key: "tagline", label: "Tagline", placeholder: "Software Engineer" },
    {
      key: "profile",
      label: "Profile / Summary",
      placeholder: "Brief professional summary...",
    },
  ];

export default function PersonSection({ data, onChange }: Props) {
  const update = (key: keyof PersonData, value: string) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map(({ key, label, placeholder }) =>
          key === "profile" ? null : (
            <div key={key}>
              <label className="text-[11px] text-muted mb-0.5 block">
                {label}
              </label>
              <input
                className={inputClass}
                placeholder={placeholder}
                value={data[key]}
                onChange={(e) => update(key, e.target.value)}
              />
            </div>
          )
        )}
      </div>
      <div>
        <label className="text-[11px] text-muted mb-0.5 block">
          Profile / Summary
        </label>
        <textarea
          className={inputClass + " resize-y min-h-[60px]"}
          placeholder="Brief professional summary..."
          value={data.profile}
          onChange={(e) => update("profile", e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
