// src/components/movement/LayerControls.tsx
//
// Layer peel panel for the movement lab. The rig ships a full-body skin envelope
// on top of muscle, bone and the joint-connecting connective tissue; this panel
// lets the user "quitar capas" -- toggle each tissue on/off to go from a dressed
// body down to the skeleton. It drives RigModel through layerChannel (the same
// DOM->canvas pub/sub pattern as rigChannel), so no ref crosses the <Canvas>.
//
// Independent toggles (not a single depth slider) so any combination is possible
// -- e.g. skin off + muscle off to inspect bone alone. Default is a dressed body
// (skin on) so the lab no longer "parece un esqueleto suelto".
//
// Per-muscle DISSECTION lives elsewhere (click a muscle on the model -> the
// DissectionPanel's "Diseccionar" peels it to reveal what's underneath). These
// toggles are the coarse whole-tissue control; the click-to-dissect is the fine,
// muscle-by-muscle one.
//
// UI strings Spanish LATAM; code/ids ASCII; no `any`.

import { useEffect, useState } from 'react';
import { layerChannel, type LayerState } from './RigModel';

/** The peelable layers, outer-to-inner, with their Spanish labels + swatch. */
const LAYERS: ReadonlyArray<{ key: keyof LayerState; label: string; swatch: string }> = [
  { key: 'skin', label: 'Piel', swatch: 'bg-[#d7a88f]' },
  { key: 'muscle', label: 'Músculo', swatch: 'bg-[#c23b3b]' },
  { key: 'bone', label: 'Hueso', swatch: 'bg-[#eae3d2]' },
  { key: 'connective', label: 'Tendones', swatch: 'bg-[#e6e9ee]' },
] as const;

export function LayerControls() {
  const [state, setState] = useState<LayerState>(() => layerChannel.get());
  // Collapsible so it doesn't cover the model on phones. Default collapsed on
  // small screens (where it otherwise overlaps the bottom control panel), open
  // on desktop where there is room in the right margin.
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(max-width: 639px)').matches;
  });

  // Stay in sync if anything else writes the channel.
  useEffect(() => layerChannel.subscribe(setState), []);

  const toggle = (key: keyof LayerState) => layerChannel.set({ [key]: !state[key] });

  return (
    <div className="pointer-events-auto w-44 overflow-hidden rounded-2xl border border-slate-800/70 bg-ink-950/90 shadow-2xl backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5"
      >
        <h3 className="font-display text-xs font-bold uppercase tracking-wide text-slate-300">
          Capas
        </h3>
        {/* Chevron only on phones — desktop stays open and looks unchanged. */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`text-slate-500 transition-transform sm:hidden ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <div className="flex flex-col gap-1.5">
            {LAYERS.map(({ key, label, swatch }) => {
              const on = state[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key)}
                  aria-pressed={on}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                    on
                      ? 'border-accent/40 bg-accent/15 text-slate-100'
                      : 'border-slate-700 bg-slate-900/60 text-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full border border-black/20 ${swatch} ${
                      on ? '' : 'opacity-40'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="flex-1">{label}</span>
                  <span
                    className={`text-[10px] font-semibold uppercase ${
                      on ? 'text-accent' : 'text-slate-600'
                    }`}
                  >
                    {on ? 'On' : 'Off'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 border-t border-slate-800/70 pt-2 text-[10px] leading-tight text-slate-500">
            Toca un músculo en el modelo para diseccionarlo.
          </p>
        </div>
      )}
    </div>
  );
}
