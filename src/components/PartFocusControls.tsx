// src/components/PartFocusControls.tsx
//
// Shared origin/insertion focus control. Used both in the SelectionPanel (next
// to the attachment sections) and in the ViewToolbar (quick access over the
// 3D). Both read/write the same `partFocus` store state, so they stay in sync:
// activating "insertion" from the toolbar also lights up the panel button.
//
// Two visual variants:
//   - 'panel'  : full-width labelled buttons that sit under a section heading.
//   - 'toolbar': compact icon+label pills for the floating glass toolbar.
//
// The controls are disabled (and dimmed) when no muscle is selected, since
// there is nothing to focus the attachments of.

import { useAnatomyStore } from '../store/anatomyStore';
import type { PartFocus } from '../store/anatomyStore';

type Variant = 'panel' | 'toolbar';

interface PartFocusControlsProps {
  variant?: Variant;
}

const PARTS: Array<{ value: Exclude<PartFocus, null>; label: string }> = [
  { value: 'origin', label: 'Origen' },
  { value: 'insertion', label: 'Inserción' },
];

export function PartFocusControls({ variant = 'panel' }: PartFocusControlsProps) {
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  const partFocus = useAnatomyStore((s) => s.partFocus);
  const togglePartFocus = useAnatomyStore((s) => s.togglePartFocus);

  const disabled = selectedMuscleId == null;

  if (variant === 'toolbar') {
    return (
      <div className="flex items-center gap-1">
        {PARTS.map((p) => {
          const active = partFocus === p.value;
          return (
            <button
              key={p.value}
              type="button"
              disabled={disabled}
              onClick={() => togglePartFocus(p.value)}
              title={
                disabled
                  ? 'Selecciona un músculo primero'
                  : `Resaltar ${p.label.toLowerCase()} en el modelo`
              }
              className={[
                'rounded-xl px-3 py-2 text-xs font-medium transition-all active:scale-95',
                disabled
                  ? 'cursor-not-allowed text-slate-600'
                  : active
                    ? 'bg-emerald-400/15 text-emerald-300'
                    : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200',
              ].join(' ')}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    );
  }

  // 'panel' variant
  return (
    <div className="mt-2 flex gap-1.5">
      {PARTS.map((p) => {
        const active = partFocus === p.value;
        return (
          <button
            key={p.value}
            type="button"
            disabled={disabled}
            onClick={() => togglePartFocus(p.value)}
            className={[
              'flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
              disabled
                ? 'cursor-not-allowed border-slate-800/60 text-slate-600'
                : active
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                  : 'border-slate-700/60 bg-slate-800/40 text-slate-300 hover:border-slate-600 hover:text-slate-100',
            ].join(' ')}
          >
            {active ? `Viendo ${p.label.toLowerCase()}` : `Ver ${p.label.toLowerCase()}`}
          </button>
        );
      })}
    </div>
  );
}
