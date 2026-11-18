const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function UsersIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function AwardIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="6" />
      <path d="m9 13.5-1.5 7.5 4.5-2.5 4.5 2.5-1.5-7.5" />
    </svg>
  );
}

export function PlayCircleIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m10 8 6 4-6 4Z" />
    </svg>
  );
}

export function LandmarkIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M4 21V10" />
      <path d="M20 21V10" />
      <path d="M2 10 12 3l10 7" />
      <path d="M8 21v-7" />
      <path d="M16 21v-7" />
    </svg>
  );
}
