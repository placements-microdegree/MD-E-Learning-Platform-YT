const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CloudIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4-1.8A4.5 4.5 0 0 0 6.5 19h11Z" />
    </svg>
  );
}

export function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m8.5 8.5-2-2M17.5 17.5l-2-2M15.5 8.5l2-2M6.5 17.5l2-2" />
    </svg>
  );
}

export function InfinityIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M9.5 8c-2.5 0 -4.5 2 -4.5 4c0 2 2 4 4.5 4c2.5 0 4.5 -6 8.5 -6c2.5 0 4.5 2 4.5 4c0 2 -2 4 -4.5 4c-4 0 -6 -6 -8.5 -6" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
