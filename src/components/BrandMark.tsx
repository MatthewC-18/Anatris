// src/components/BrandMark.tsx
//
// The Anatris brand mark and a small clinical-color legend.
//
// The mark is a physiotherapy-first glyph: a joint pivot with a fixed limb
// segment, a moving segment, and a sweeping range-of-motion (ROM) arc. It reads
// as "movement around a joint" — the core of what the app teaches — rather than
// a generic anatomy/medical cross. The bones use `currentColor` so the mark
// adopts the surrounding text color; the ROM arc is always the cyan accent so
// the "movement" idea stays legible on any surface.

interface BrandMarkProps {
  className?: string;
  /** Title for assistive tech. Omit to render purely decorative (aria-hidden). */
  title?: string;
}

export function BrandMark({ className, title }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {/* Fixed limb segment (reference position). */}
      <path
        d="M6 19V6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Moving limb segment (rotated through the range). */}
      <path
        d="M6 19L17.5 11.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Range-of-motion arc swept between the two segments. */}
      <path
        d="M6 7.4A11 11 0 0 1 16.4 11"
        stroke="#22d3ee"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      {/* Pivot / joint. */}
      <circle cx="6" cy="19" r="2.4" fill="#22d3ee" />
    </svg>
  );
}

/**
 * The muscle-role color legend. The role colors are the app's clinical shorthand
 * for "who does what" in a movement; surfacing them as a legend teaches the
 * vocabulary at a glance — a small but distinctly physiotherapy touch.
 */
const ROLE_LEGEND: { label: string; dot: string }[] = [
  { label: 'Agonista', dot: 'bg-role-prime' },
  { label: 'Asistente', dot: 'bg-role-assist' },
  { label: 'Estabilizador', dot: 'bg-role-stabilize' },
];

export function RoleLegend({ className }: { className?: string }) {
  return (
    <div className={['flex flex-wrap items-center gap-x-4 gap-y-2', className].join(' ')}>
      {ROLE_LEGEND.map((r) => (
        <span key={r.label} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <span className={`h-2 w-2 rounded-full ${r.dot}`} />
          {r.label}
        </span>
      ))}
    </div>
  );
}
