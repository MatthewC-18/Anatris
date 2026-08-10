// src/components/ui/Controls.tsx
//
// The lab's control primitives. Three shapes cover every setting in the panels:
//
//   Switch     a labelled on/off row (replaces the native checkbox + "On/Off" text)
//   Segmented  2..4 mutually exclusive options in one track (replaces small selects)
//   IconButton a square action, icon only, with an accessible name
//
// They render as ROWS inside an .instrument surface, never as bordered cards, and
// they carry the whole control's hit area so a tap anywhere on the row works.

import type { ReactNode } from 'react';
import { LockGlyph } from '../account/PremiumGate';

/* ---------------------------------------------------------------------------
 * Switch
 * ------------------------------------------------------------------------ */
export function Switch({
  checked,
  onChange,
  label,
  icon,
  hint,
  tone = 'accent',
  locked = false,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  icon?: ReactNode;
  /** Optional second line under the label. */
  hint?: string;
  /** Track color when on. */
  tone?: 'accent' | 'amber';
  /** Shows a lock instead of the track; onChange still fires (opens pricing). */
  locked?: boolean;
  disabled?: boolean;
}) {
  const on = checked && !locked;
  const trackOn =
    tone === 'amber'
      ? 'bg-[#ff8c1a]/70 border-[#ff8c1a]/60'
      : 'bg-accent/60 border-accent/50';
  return (
    <button
      type="button"
      role={locked ? undefined : 'switch'}
      aria-checked={locked ? undefined : checked}
      onClick={onChange}
      disabled={disabled}
      className="group flex w-full items-center gap-2.5 py-1.5 text-left transition-opacity disabled:opacity-40"
    >
      {icon && (
        <span className={on ? 'text-accent' : 'text-slate-500 group-hover:text-slate-300'}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-xs font-medium ${
            locked ? 'text-amber-200/90' : on ? 'text-slate-100' : 'text-slate-400'
          }`}
        >
          {label}
        </span>
        {hint && <span className="mt-0.5 block truncate text-[10px] text-slate-500">{hint}</span>}
      </span>
      {locked ? (
        <span className="text-amber-300/80">
          <LockGlyph />
        </span>
      ) : (
        <span
          className={`relative h-[18px] w-[32px] shrink-0 rounded-full border transition-colors duration-200 ${
            on ? trackOn : 'border-slate-700 bg-slate-800/80'
          }`}
        >
          <span
            className={`absolute top-[2px] h-3 w-3 rounded-full bg-slate-100 shadow transition-all duration-200 ${
              on ? 'left-[15px]' : 'left-[2px] bg-slate-400'
            }`}
          />
        </span>
      )}
    </button>
  );
}

/* ---------------------------------------------------------------------------
 * Segmented
 * ------------------------------------------------------------------------ */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'sm',
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'xs';
}) {
  // `tap-target` sets the accessible floor (24px, 40px on a coarse pointer);
  // the padding here only controls the horizontal breathing room and the type
  // size, so the segmented control stays visually compact on a laptop while
  // still being thumb-sized on a tablet. See the note in index.css.
  const pad = size === 'xs' ? 'px-2 text-[10px]' : 'px-2.5 text-[11px]';
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-slate-700/70 bg-slate-900/70 p-[2px]"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`tap-target inline-flex items-center justify-center rounded-[6px] font-medium transition-colors ${pad} ${
              active
                ? 'bg-slate-200/95 text-ink-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * IconButton
 * ------------------------------------------------------------------------ */
export function IconButton({
  onClick,
  label,
  children,
  variant = 'ghost',
  disabled = false,
  className = '',
}: {
  onClick: () => void;
  /** Accessible name; also the tooltip. */
  label: string;
  children: ReactNode;
  variant?: 'ghost' | 'primary';
  disabled?: boolean;
  className?: string;
}) {
  const skin =
    variant === 'primary'
      ? 'bg-accent text-ink-950 hover:bg-accent-soft shadow-[0_0_16px_-4px_rgba(34,211,238,0.6)]'
      : 'text-slate-300 hover:bg-slate-100/[0.07] hover:text-slate-100';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      // h-8 clears the 24px AA floor on a mouse; `tap-target` lifts it to 40px
      // on a touch screen, where these are the transport controls (play, pause,
      // neutral, loop) a physio drives with a thumb.
      className={`tap-target flex h-8 w-8 min-w-[24px] items-center justify-center rounded-lg transition-colors disabled:opacity-40 [@media(pointer:coarse)]:w-10 ${skin} ${className}`}
    >
      {children}
    </button>
  );
}
