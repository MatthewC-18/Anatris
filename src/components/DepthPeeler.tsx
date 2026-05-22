// src/components/DepthPeeler.tsx
//
// A vertical "dissection" depth slider. Dragging down peels the body from the
// skin inward toward the skeleton. It does not own any state of its own: the
// current level is DERIVED from the store's active layers (so it can never
// disagree with the layer checkboxes), and moving it writes back into those
// same layers via setLayer. One source of truth.

import { useAnatomyStore } from '../store/anatomyStore';
import {
  PEEL_MAX,
  PEEL_LEVEL_LABELS,
  inferPeelLevel,
  layersForPeelLevel,
} from '../lib/peelOrder';

export function DepthPeeler() {
  const activeLayers = useAnatomyStore((s) => s.activeLayers);
  const setLayer = useAnatomyStore((s) => s.setLayer);

  // Position is derived, not stored — manual checkbox edits keep it honest.
  const level = inferPeelLevel(activeLayers);

  const applyLevel = (next: number) => {
    for (const [layer, on] of layersForPeelLevel(next)) {
      setLayer(layer, on);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
          Profundidad
        </p>
        <span className="font-mono text-[11px] text-accent">
          {level}/{PEEL_MAX}
        </span>
      </div>

      <div className="rounded-xl bg-slate-900/60 p-3">
        <input
          type="range"
          min={0}
          max={PEEL_MAX}
          step={1}
          value={level}
          onChange={(e) => applyLevel(Number(e.target.value))}
          aria-label="Profundidad de disección"
          className="peel-range w-full"
        />
        <p className="mt-2 text-center text-sm text-slate-300">
          {PEEL_LEVEL_LABELS[level]}
        </p>
      </div>

      <div className="mt-2 flex justify-between gap-1">
        <button
          type="button"
          onClick={() => applyLevel(Math.max(0, level - 1))}
          disabled={level === 0}
          className="flex-1 rounded-lg bg-slate-800/60 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ↑ Vestir
        </button>
        <button
          type="button"
          onClick={() => applyLevel(Math.min(PEEL_MAX, level + 1))}
          disabled={level === PEEL_MAX}
          className="flex-1 rounded-lg bg-slate-800/60 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ↓ Pelar
        </button>
      </div>
    </div>
  );
}