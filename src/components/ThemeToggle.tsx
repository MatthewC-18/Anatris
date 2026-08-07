// src/components/ThemeToggle.tsx
//
// The public site's light / dark switch.
//
// Three segments rather than a two-state sun-moon flip, because 'Sistema' is a
// real preference and not a default that disappears on first use — see the note
// in src/lib/theme.ts.
//
// Icons are drawn here rather than pulled from a set, so they match the rest of
// the app's line weight (1.6, round caps) instead of arriving from a different
// drawing hand.

import { useEffect, useState } from 'react';
import {
  applyTheme,
  onSystemThemeChange,
  readPref,
  resolveTheme,
  writePref,
  type ThemePref,
} from '../lib/theme';

/**
 * Owns the theme preference and keeps <html> in sync with it. The initial class
 * is already on the document (inline script in index.html), so mounting this
 * never causes a flip; it only takes over from there.
 */
export function useThemePref(): [ThemePref, (p: ThemePref) => void] {
  const [pref, setPrefState] = useState<ThemePref>(() =>
    typeof window === 'undefined' ? 'system' : readPref(),
  );

  useEffect(() => {
    applyTheme(resolveTheme(pref));
    // Only 'system' tracks the OS; an explicit choice must stay put when the
    // machine flips to night mode.
    if (pref !== 'system') return;
    return onSystemThemeChange((theme) => applyTheme(theme));
  }, [pref]);

  const setPref = (next: ThemePref) => {
    writePref(next);
    setPrefState(next);
  };

  return [pref, setPref];
}

const OPTIONS: { value: ThemePref; label: string; Icon: () => JSX.Element }[] = [
  { value: 'system', label: 'Seguir al sistema', Icon: SystemIcon },
  { value: 'light', label: 'Tema claro', Icon: SunIcon },
  { value: 'dark', label: 'Tema oscuro', Icon: MoonIcon },
];

export function ThemeToggle({
  pref,
  setPref,
  className,
}: {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Apariencia"
      className={[
        'inline-flex items-center gap-0.5 rounded border border-line p-0.5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = pref === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            aria-label={label}
            onClick={() => setPref(value)}
            className={[
              'flex h-7 w-7 items-center justify-center rounded-sm transition-colors',
              active ? 'bg-brand-wash text-brand' : 'text-fg3 hover:text-fg',
            ].join(' ')}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Icons — 16px box, 1.6 stroke, round caps.
 * ------------------------------------------------------------------------ */

const base = {
  width: 15,
  height: 15,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** A display outline: "whatever this screen is set to". */
function SystemIcon() {
  return (
    <svg {...base}>
      <rect x="2.5" y="4" width="15" height="10" rx="1.5" />
      <path d="M7 17h6" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg {...base}>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.6v1.7M10 15.7v1.7M17.4 10h-1.7M4.3 10H2.6M15.2 4.8l-1.2 1.2M6 14l-1.2 1.2M15.2 15.2L14 14M6 6L4.8 4.8" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...base}>
      <path d="M16.2 12.3A6.8 6.8 0 0 1 7.7 3.8a6.8 6.8 0 1 0 8.5 8.5z" />
    </svg>
  );
}
