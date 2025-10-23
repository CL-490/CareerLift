import React from "react";
import Link from "next/link";

interface ComingSoonProps {
  title: string;
  blurb?: string;
  backHref?: string;
}

export function ComingSoon({ title, blurb = "This feature is under active development.", backHref = "/" }: ComingSoonProps) {
  return (
    <div className="max-w-3xl mx-auto pt-4">
      <h1 className="text-[40px] font-semibold tracking-tight heading-gradient mb-6">
        {title}
      </h1>
      <div className="card hover-ring mb-10 card-hue">
        <div className="flex flex-col gap-5">
          <p className="text-muted text-[15px] leading-relaxed">
            {blurb}
          </p>
          <div className="rounded-md border card-3d border-dashed border-[rgba(255,255,255,0.14)] p-6 text-sm text-[#7e8a98] bg-[#121c27]/40 panel-tinted">
            <p className="mb-2 font-medium text-muted">Coming Soon</p>
            <ul className="list-disc ml-5 space-y-1 text-[13px]">
              <li>Core interactions and API wiring</li>
              <li>Real data + analytics layer</li>
              <li>Refined UX and accessibility polish</li>
            </ul>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <Link href={backHref} className="nav-item nav-item-active !px-4 !py-2 !text-[13px]">← Back to Dashboard</Link>
            <span className="text-[11px] tracking-wider uppercase text-muted">Placeholder</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComingSoon;