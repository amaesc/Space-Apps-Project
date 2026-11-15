// Íconos SVG mínimos (sin librerías) para la barra y la caja de herramientas.
type P = { className?: string };
const base = (className = "h-5 w-5") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const MapIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></svg>
);
export const DataIcon = ({ className }: P) => (
  <svg {...base(className)}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></svg>
);
export const InfoIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>
);
export const FeatherIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M20 4c-7 0-13 5-13 12v4" /><path d="M7 16c5 0 9-2 11-6" /><path d="M4 20l3-4" /></svg>
);
export const LayersIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
);
export const LocateIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>
);
export const CalendarIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const DownloadIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 4v11M7 10l5 5 5-5" /><path d="M4 20h16" /></svg>
);
export const HelpIcon = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17v.5" /></svg>
);
export const ResetIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8" /><path d="M4 4v4h4" /></svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const WarnIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17v.5" /></svg>
);
export const FlameIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-.5-3 0-6 1-8.5Z" /></svg>
);
export const CloudIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9Z" /></svg>
);
export const SelectAreaIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
    <rect x="8" y="8" width="8" height="8" strokeDasharray="2 2" />
  </svg>
);
