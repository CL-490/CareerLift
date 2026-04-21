import type { ReactNode } from "react";

export function CLLogo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="CareerLift"
      className={className}
    >
      <defs>
        <linearGradient id="cl-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#37303f" stopOpacity="0.88" />
          <stop offset="54%" stopColor="#211d28" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#12151b" stopOpacity="0.78" />
        </linearGradient>
        <radialGradient id="cl-logo-gloss" cx="28%" cy="22%" r="64%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="46%" stopColor="#d9c7f6" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cl-logo-edge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#c4b0e6" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#cl-logo-bg)" />
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#cl-logo-gloss)" />
      <rect x="2.5" y="2.5" width="59" height="59" rx="13.5" fill="none" stroke="url(#cl-logo-edge)" />
      <path
        d="M 32 18 a 14 14 0 1 0 0 28"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M 38 18 v 26 h 12 l 0 -3"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandWordmark({
  size = "text-[18px]",
  subtitle,
  className = "",
}: {
  size?: string;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <CLLogo size={28} />
      <div className="min-w-0">
        <div className={`brand select-none ${size}`}>CareerLift</div>
        {subtitle ? <div className="mt-1 text-sm text-muted">{subtitle}</div> : null}
      </div>
    </div>
  );
}
