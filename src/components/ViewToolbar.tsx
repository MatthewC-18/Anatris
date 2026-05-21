// src/components/ViewToolbar.tsx
//
// Floating glass toolbar anchored bottom-center of the viewer. Exposes the
// six predefined camera views (with keyboard shortcuts 1-6) plus a reset.
// Icons are inline SVG to avoid an icon dependency.

import { useEffect } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { VIEW_META, VIEW_ORDER } from '../lib/anatomyMeta';
import type { CameraView } from '../types/anatomy';

/** Minimal inline icon per view; purely decorative orientation cues. */
function ViewIcon({ view }: { view: CameraView }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (view) {
    case 'anterior':
      return (
        <svg {...common}>
          <circle cx="12" cy="7" r="3" />
          <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
        </svg>
      );
    case 'posterior':
      return (
        <svg {...common}>
          <circle cx="12" cy="7" r="3" />
          <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
          <path d="M9 12h6" />
        </svg>
      );
    case 'lateral-right':
      return (
        <svg {...common}>
          <path d="M9 4c0 4 3 5 3 8s-3 4-3 8" />
          <circle cx="9" cy="4.5" r="2" />
        </svg>
      );
    case 'lateral-left':
      return (
        <svg {...common} style={{ transform: 'scaleX(-1)' }}>
          <path d="M9 4c0 4 3 5 3 8s-3 4-3 8" />
          <circle cx="9" cy="4.5" r="2" />
        </svg>
      );
    case 'superior':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      );
    case 'three-quarter':
      return (
        <svg {...common}>
          <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
          <path d="M3 8l9 5 9-5M12 13v8" />
        </svg>
      );
  }
}

export function ViewToolbar() {
  const requestView = useAnatomyStore((s) => s.requestView);
  const paletteOpen = useAnatomyStore((s) => s.paletteOpen);

  // Keyboard shortcuts 1-6 (ignored while typing or palette open).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (paletteOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const found = VIEW_ORDER.find((v) => VIEW_META[v].key === e.key);
      if (found) {
        e.preventDefault();
        requestView(found);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestView, paletteOpen]);

  const primary = VIEW_ORDER.slice(0, 4);
  const secondary = VIEW_ORDER.slice(4);

  return (
    <div className="pointer-events-auto absolute bottom-6 left-1/2 z-20 -translate-x-1/2 animate-slide-up">
      <div className="glass-strong flex items-center gap-1 rounded-2xl px-2 py-2">
        {primary.map((view) => (
          <ToolbarButton key={view} view={view} onClick={() => requestView(view)} />
        ))}
        <div className="mx-1 h-7 w-px bg-slate-600/40" />
        {secondary.map((view) => (
          <ToolbarButton key={view} view={view} onClick={() => requestView(view)} />
        ))}
      </div>
    </div>
  );
}

function ToolbarButton({
  view,
  onClick,
}: {
  view: CameraView;
  onClick: () => void;
}) {
  const meta = VIEW_META[view];
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${meta.label}  ·  tecla ${meta.key}`}
      className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-accent/10 hover:text-accent active:scale-95"
    >
      <ViewIcon view={view} />
      <span className="kbd absolute -bottom-1 -right-1 scale-90 opacity-0 transition-opacity group-hover:opacity-100">
        {meta.key}
      </span>
    </button>
  );
}
