// src/components/movement/DissectionPanel.tsx
//
// The click-to-dissect card for the movement lab (Complete-Anatomy-style). It
// reads dissectChannel: when the user clicks a muscle on the rig, the selection
// appears here with its clinical name + a "Diseccionar" button that peels it away
// to reveal the structures beneath. A slim tray below tracks what's been removed,
// with "Deshacer" (undo the last) and "Restaurar" (bring everything back).
//
// Pure DOM + pub/sub -- no ref crosses the <Canvas>. UI strings Spanish LATAM.
// Styling uses the app design tokens (ink/accent/glass) for a premium finish.

import { useEffect, useState } from 'react';
import { dissectChannel, type DissectState } from './dissectChannel';

/** Plane badge tint (superficial -> deep), dot + text. */
const PLANE_STYLE: Record<string, { wrap: string; dot: string }> = {
  Superficial: { wrap: 'border-[#e06a6a]/40 text-[#f2b0b0]', dot: 'bg-[#e06a6a]' },
  Intermedio: { wrap: 'border-amber-500/40 text-amber-300', dot: 'bg-amber-400' },
  Profundo: { wrap: 'border-[#9d3436]/50 text-[#eba6a6]', dot: 'bg-[#9d3436]' },
};

export function DissectionPanel() {
  const [state, setState] = useState<DissectState>(() => dissectChannel.get());
  useEffect(() => dissectChannel.subscribe(setState), []);

  const { selection, hidden } = state;
  if (!selection && hidden.length === 0) return null;

  const plane = selection?.planeLabel ? PLANE_STYLE[selection.planeLabel] : undefined;

  return (
    <div className="pointer-events-none flex w-[min(92vw,27rem)] flex-col items-center gap-2.5">
      {selection && (
        <div className="pointer-events-auto w-full overflow-hidden rounded-2xl border border-accent/25 bg-ink-900/95 shadow-glass-lg backdrop-blur-xl animate-slide-up">
          {/* Accent hairline across the top for a premium finish. */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
          <div className="p-4">
            <div className="mb-2.5 flex items-center gap-2">
              {selection.planeLabel && plane && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${plane.wrap}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${plane.dot}`} aria-hidden="true" />
                  {selection.planeLabel}
                </span>
              )}
              {selection.sideLabel && (
                <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  {selection.sideLabel}
                </span>
              )}
              <button
                type="button"
                onClick={() => dissectChannel.setSelection(null)}
                className="ml-auto rounded-md p-0.5 text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-200"
                aria-label="Cerrar selección"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <h3 className="font-display text-lg font-bold leading-tight text-slate-50">
              {selection.label}
            </h3>
            {selection.latin && (
              <p className="mt-0.5 text-xs italic text-slate-500">{selection.latin}</p>
            )}
            {selection.note && (
              <p className="mt-2.5 rounded-lg border border-slate-800/80 bg-ink-950/60 px-3 py-2 text-[11px] leading-snug text-slate-400">
                {selection.note}
              </p>
            )}

            <div className="mt-3.5">
              {selection.dissectable ? (
                <button
                  type="button"
                  onClick={() => dissectChannel.dissectSelected()}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-accent to-accent-deep px-3 py-2.5 text-sm font-semibold text-ink-950 shadow-lg shadow-accent/25 transition-all hover:shadow-accent-glow active:scale-[0.985]"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:-rotate-6" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M14.5 3.5c1 1 1 2.2 0 3.2L7.4 13.8 4 16l2.2-3.4 7.1-7.1c1-1 2.2-1 3.2 0z" strokeLinejoin="round" transform="translate(-1 0)" />
                    <path d="M4 16l1.6-1.6" strokeLinecap="round" />
                  </svg>
                  Diseccionar
                  <span className="ml-1 text-[11px] font-medium text-ink-950/70">
                    revela lo profundo
                  </span>
                </button>
              ) : (
                <span className="flex w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-center text-xs text-slate-500">
                  Estructura de soporte · no se disecciona
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {hidden.length > 0 && (
        <div className="pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-slate-800/70 bg-ink-900/90 px-3 py-2 shadow-glass backdrop-blur-xl animate-fade-in">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-accent/80" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 10c2-3.5 5-5 7-5s5 1.5 7 5c-2 3.5-5 5-7 5s-5-1.5-7-5z" />
              <path d="M8.5 10a1.5 1.5 0 013 0" />
              <path d="M4 4l12 12" strokeLinecap="round" />
            </svg>
            {hidden.length} {hidden.length === 1 ? 'retirada' : 'retiradas'}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => dissectChannel.restoreLast()}
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
            >
              Deshacer
            </button>
            <button
              type="button"
              onClick={() => dissectChannel.restoreAll()}
              className="rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/25"
            >
              Restaurar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
