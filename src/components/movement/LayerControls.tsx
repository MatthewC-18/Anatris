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
// SHAPE: switch rows on one surface, ordered outer tissue to inner, each with its
// tissue swatch. The rows used to be four bordered buttons stacked inside a
// bordered panel with "On/Off" spelled out; a switch already says its own state.
//
// Per-muscle DISSECTION lives elsewhere (click a muscle on the model -> the
// DissectionPanel's "Diseccionar" peels it to reveal what's underneath). These
// toggles are the coarse whole-tissue control; the click-to-dissect is the fine,
// muscle-by-muscle one.
//
// UI strings Spanish LATAM; code/ids ASCII; no `any`.

import { useEffect, useState } from 'react';
import { layerChannel, type LayerState } from './RigModel';
import { ChevronDownIcon, LayersIcon } from '../ui/Icons';

/** The peelable layers, outer-to-inner, with their Spanish labels + swatch. */
const LAYERS: ReadonlyArray<{ key: keyof LayerState; label: string; swatch: string }> = [
  { key: 'skin', label: 'Piel', swatch: '#d7a88f' },
  { key: 'muscle', label: 'Músculo', swatch: '#c23b3b' },
  { key: 'bone', label: 'Hueso', swatch: '#eae3d2' },
  { key: 'connective', label: 'Tendones', swatch: '#e6e9ee' },
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
    <div className="instrument pointer-events-auto w-[11.5rem] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3.5 py-3 text-slate-300 transition-colors hover:text-slate-100"
      >
        <LayersIcon size={14} className="text-slate-500" />
        <h3 className="kicker flex-1 text-left">Capas</h3>
        {/* Chevron only on phones: desktop stays open. */}
        <ChevronDownIcon
          size={12}
          className={`text-slate-600 transition-transform sm:hidden ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <>
          <div className="hairline" />
          <div className="px-3.5 py-1.5">
            {LAYERS.map(({ key, label, swatch }) => {
              const on = state[key];
              return (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => toggle(key)}
                  className="group flex w-full items-center gap-2.5 py-2 text-left"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/30 transition-opacity"
                    style={{ backgroundColor: swatch, opacity: on ? 1 : 0.28 }}
                    aria-hidden="true"
                  />
                  <span
                    className={`flex-1 text-xs font-medium transition-colors ${
                      on ? 'text-slate-100' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  >
                    {label}
                  </span>
                  <span
                    className={`relative h-[16px] w-[28px] shrink-0 rounded-full border transition-colors duration-200 ${
                      on ? 'border-accent/50 bg-accent/60' : 'border-slate-700 bg-slate-800/80'
                    }`}
                  >
                    <span
                      className={`absolute top-[2px] h-[10px] w-[10px] rounded-full shadow transition-all duration-200 ${
                        on ? 'left-[14px] bg-slate-100' : 'left-[2px] bg-slate-400'
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="hairline" />
          <p className="px-3.5 py-2.5 text-[10px] leading-snug text-slate-500">
            Toca un músculo del modelo para diseccionarlo o aislarlo, lado por lado.
          </p>
        </>
      )}
    </div>
  );
}
