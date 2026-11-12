// src/components/PartFocusControls.tsx
//
// Shared origin/insertion focus control. Used both in the SelectionPanel (next
// to the attachment sections) and in the ViewToolbar (quick access over the
// 3D). Both read/write the same `partFocus` store state, so they stay in sync:
// activating "insertion" from the toolbar also lights up the panel button.
//
// Two visual variants:
//   - 'panel'  : a labelled button that sits under a section of the sheet.
//   - 'toolbar': compact text buttons for the stage toolbar.
//
// LAMINA: ninguno de los dos es ya una pastilla con relleno. El estado activo
// se dice con el color del resalte (el mismo verde con el que el modelo
// enciende la insercion, PART_HIGHLIGHT en AnatomyModel) y el peso de la letra.
//
// The controls are disabled (and dimmed) when no muscle is selected, since
// there is nothing to focus the attachments of.

import { useAnatomyStore } from '../store/anatomyStore';
import type { PartFocus } from '../store/anatomyStore';

type Variant = 'panel' | 'toolbar';
type Part = Exclude<PartFocus, null>;

interface PartFocusControlsProps {
  variant?: Variant;
  /**
   * Panel variant only: render the button for ONE attachment.
   *
   * La ficha ponia los DOS botones ("Ver origen" y "Ver insercion") debajo de
   * la seccion Origen y otra vez los dos debajo de Insercion: cuatro botones
   * para dos acciones, y bajo el texto del origen un boton que ensenaba la
   * insercion. Cada seccion lleva ahora solo el suyo. Sin `part` se pintan los
   * dos, que es lo que quiere quien lo use fuera de una seccion.
   */
  part?: Part;
}

const PARTS: Array<{ value: Part; label: string }> = [
  { value: 'origin', label: 'Origen' },
  { value: 'insertion', label: 'Inserción' },
];

export function PartFocusControls({ variant = 'panel', part }: PartFocusControlsProps) {
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  const partFocus = useAnatomyStore((s) => s.partFocus);
  const togglePartFocus = useAnatomyStore((s) => s.togglePartFocus);

  const disabled = selectedMuscleId == null;

  if (variant === 'toolbar') {
    return (
      // `contents` so these buttons become direct children of the toolbar's
      // scroll rail: nested inside a flex box of their own they were the one
      // group that could not be scrolled to on a narrow phone.
      <div className="flex shrink-0 items-center gap-1">
        {PARTS.map((p) => {
          const active = partFocus === p.value;
          return (
            <button
              key={p.value}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => togglePartFocus(p.value)}
              title={
                disabled
                  ? 'Selecciona un músculo primero'
                  : `Resaltar ${p.label.toLowerCase()} en el modelo`
              }
              className={[
                // 44px tall on touch, the same target as the view buttons next
                // to it; back to the tighter 36 from lg up.
                'btn btn-quiet h-11 shrink-0 px-3 text-xs disabled:cursor-not-allowed lg:h-9',
                active ? 'font-semibold text-clinical-soft' : '',
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
  const parts = part ? PARTS.filter((p) => p.value === part) : PARTS;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {parts.map((p) => {
        const active = partFocus === p.value;
        return (
          <button
            key={p.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => togglePartFocus(p.value)}
            title={disabled ? 'Selecciona un músculo primero' : undefined}
            className={[
              'btn btn-line btn-sm disabled:cursor-not-allowed',
              active ? 'font-semibold text-clinical-soft' : '',
            ].join(' ')}
          >
            {/* Un punto con el color del resalte mientras esta encendido: lo
                que se ve en el modelo y el boton que lo pide comparten senal. */}
            {active && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-clinical-soft" aria-hidden="true" />
            )}
            {active ? `Viendo ${p.label.toLowerCase()}` : `Ver ${p.label.toLowerCase()} en el modelo`}
          </button>
        );
      })}
    </div>
  );
}
