const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Cloud({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4-1.8A4.5 4.5 0 0 0 6.5 19h11Z" />
    </svg>
  );
}

function InfinityLoop({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M9.5 8c-2.5 0-4.5 2-4.5 4s2 4 4.5 4c2.5 0 4.5-6 8.5-6 2.5 0 4.5 2 4.5 4s-2 4-4.5 4c-4 0-6-6-8.5-6" />
    </svg>
  );
}

function Shield({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.4 3 7.7 7 9 4-1.3 7-4.6 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function Network({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <circle cx="12" cy="5" r="2.2" />
      <circle cx="5" cy="18" r="2.2" />
      <circle cx="19" cy="18" r="2.2" />
      <path d="M10.5 6.8 6.3 16M13.5 6.8 17.7 16M7 18h10" />
    </svg>
  );
}

function Terminal({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </svg>
  );
}

function Hexagon({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5Z" />
    </svg>
  );
}

function Helm({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5Z" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 4v3M12 17v3M5.5 8l2.6 1.5M15.9 14.5 18.5 16M18.5 8l-2.6 1.5M8.1 14.5 5.5 16" />
    </svg>
  );
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M12 3c.6 4 2 5.4 6 6-4 .6-5.4 2-6 6-.6-4-2-5.4-6-6 4-.6 5.4-2 6-6Z" />
      <path d="M18 14c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5Z" />
    </svg>
  );
}

function Roadmap({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M6 20 6 9c0-2.8 2.7-5 6-5s6 2.2 6 5v11" />
      <path d="M9 20v-6M15 20v-6M6 13h12" />
      <circle cx="12" cy="9" r="1.4" />
    </svg>
  );
}

function QA({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M4 5h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3.5 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <path d="M19 9h1a1 1 0 0 1 1 1v8l-2.5-2H12" />
    </svg>
  );
}

function CheatSheet({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5M8.5 12h7M8.5 15.5h7M8.5 19h4" />
    </svg>
  );
}

function Book({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className} aria-hidden="true">
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5v-13Z" />
      <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5v-13Z" />
    </svg>
  );
}

export const trackIcons = {
  qa: QA,
  cheatsheet: CheatSheet,
  ebook: Book,
  aws: Cloud,
  devops: InfinityLoop,
  devsecops: Shield,
  networking: Network,
  linux: Terminal,
  azure: Hexagon,
  kubernetes: Helm,
  genai: Sparkle,
  roadmap: Roadmap,
} as const;

export type TrackIconName = keyof typeof trackIcons;
