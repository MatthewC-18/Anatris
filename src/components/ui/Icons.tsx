// src/components/ui/Icons.tsx
//
// The app's icon set. One stroke weight, one geometry, one optical size, so every
// control in the lab reads as part of the same instrument. This replaces the text
// glyphs and emoji the panels used to render inline (play/pause arrows, chevrons,
// a person, a download arrow): those pick up the OS emoji font, jump the baseline
// and are the single clearest tell of a UI assembled without a design system.
//
// Every icon takes the same props and inherits `currentColor`, so a button styles
// its icon by styling itself.

interface IconProps {
  /** Square size in px. Defaults to the 14px control size used across the lab. */
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function Svg({
  size = 14,
  className = '',
  strokeWidth = 1.7,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function PlayIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function PauseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="7" y="5.5" width="3.6" height="13" rx="1.1" fill="currentColor" stroke="none" />
      <rect x="13.4" y="5.5" width="3.6" height="13" rx="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function StopIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Return-to-neutral: a needle snapping back to the zero mark. */
export function NeutralIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v8" />
      <path d="M4.5 18a8.5 8.5 0 0 1 15 0" />
      <circle cx="12" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function LoopIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 9h13a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H4" />
      <path d="M7 6L4 9l3 3" />
      <path d="M17 12l3 3-3 3" />
    </Svg>
  );
}

export function DownloadIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v10" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </Svg>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 9.5l6 6 6-6" />
    </Svg>
  );
}

export function ChevronLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.5 5l-7 7 7 7" />
    </Svg>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.5 5l7 7-7 7" />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  );
}

/** Patient mode: a person, seen from the front. */
export function PersonIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  );
}

/** Manual resistance: a hand pressing against a rising movement. */
export function ResistanceIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 20V9" />
      <path d="M8.5 12.5L12 9l3.5 3.5" />
      <path d="M5 5.5h14" />
    </Svg>
  );
}

/** Tissue layers, peeled. */
export function LayersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z" />
      <path d="M4 12.5l8 4.3 8-4.3" />
      <path d="M4 16.8l8 4.2 8-4.2" />
    </Svg>
  );
}

/** Side (left / right limb) selector glyph. */
export function BodySideIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5v17" />
      <circle cx="12" cy="6" r="2" />
      <path d="M6 10h12" />
    </Svg>
  );
}

/** Scalpel: the dissect action. Blade + handle, one continuous instrument. */
export function ScalpelIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13.8 3.6a1.9 1.9 0 012.7 2.7L9.7 13.1 6.2 14.3l1.2-3.5z" />
      <path d="M6.2 14.3L3.6 20.4" />
    </Svg>
  );
}

/** Isolate: one structure kept, the rest stepped back. */
export function IsolateIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 3.2v2.6M12 18.2v2.6M3.2 12h2.6M18.2 12h2.6" />
      <path d="M6 6l1.8 1.8M18 6l-1.8 1.8M6 18l1.8-1.8M18 18l-1.8-1.8" opacity="0.45" />
    </Svg>
  );
}

/** Undo the last action. */
export function UndoIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 9h9.5a5 5 0 010 10H8" />
      <path d="M7.5 5L4 9l3.5 4" />
    </Svg>
  );
}

/** Restore everything to the intact body. */
export function RestoreIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20.5 12a8.5 8.5 0 11-2.6-6.1" />
      <path d="M20.8 4.2v4.6h-4.6" />
    </Svg>
  );
}
