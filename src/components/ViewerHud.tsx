// src/components/ViewerHud.tsx
//
// In-canvas annotations for the "Explorar" viewer. Two pieces of ambient,
// pointer-events-none chrome:
//
//   - Top-left stage note: the active region, written on the stage the way a
//     plate carries its caption. Only where the left margin is not on screen.
//   - Top-center hover label: names the structure under the cursor (with its
//     layer colour), appearing and disappearing as the pointer moves.
//
// It is purely presentational: it reads hoveredMeshName / region from the
// store and the mesh index, and never mutates state, so it cannot interfere
// with picking, camera or highlight logic.
//
// LAMINA: la placa del modulo era una tarjeta de cristal con un punto latiendo
// ("Explorando / Hombro") a 16 px del margen izquierdo, que ya dice "MODULO /
// Hombro": el mismo dato dos veces, una de ellas encima del modelo. Ahora es
// una anotacion tipografica sin fondo (`.stage-note`) y solo aparece por debajo
// de lg, que es donde el margen se convierte en cajon y el escenario se queda
// sin rotulo. La etiqueta de hover si flota de verdad (es un tooltip), asi que
// conserva una superficie, pero opaca y de 6 px, sin pastilla dentro.

import { useAnatomyStore } from '../store/anatomyStore';
import { LAYER_META, SIDE_META } from '../lib/anatomyMeta';
import { formatShortName } from '../lib/formatName';
import { trackForRegion } from '../data/trackByRegion';
import { isConceptModule } from '../data/conceptByRegion';
import type { AnatomyEntry } from '../types/anatomy';
import type { MuscleResolution } from '../lib/muscleResolver';

interface ViewerHudProps {
  byMesh: Map<string, AnatomyEntry>;
  /** Lets the hover chip name a muscle the way the rest of the app names it. */
  resolution: MuscleResolution;
}

export function ViewerHud({ byMesh, resolution }: ViewerHudProps) {
  const hoveredMeshName = useAnatomyStore((s) => s.hoveredMeshName);
  const region = useAnatomyStore((s) => s.region);

  // Conceptual modules (Fundamentos) show the whole body as a canvas for the
  // planes/axes overlay — there is no per-structure study or region identity to
  // surface, so the exploration HUD stays out of the way there.
  if (isConceptModule(region)) return null;

  const entry = hoveredMeshName ? byMesh.get(hoveredMeshName) : undefined;
  const track = trackForRegion(region);
  // Prefer the clinical record's Spanish name. Falling back to the raw
  // Z-Anatomy name and word-substituting it produced spanglish on screen —
  // "Short cabeza de biceps brachii" — because only some of the words have
  // entries in the term table. Whenever the mesh belongs to a muscle we already
  // teach, that muscle's own name is the right answer.
  const muscle = hoveredMeshName
    ? resolution.muscleByMeshName.get(hoveredMeshName)
    : undefined;

  return (
    <>
      {/* Stage note. Hidden on phones (the region already shows in the TopBar
          dropdown, and it would collide with the centred hover label in the
          narrow top row) and from lg up (the left margin carries it). */}
      <p className="stage-note pointer-events-none absolute left-4 top-4 z-20 hidden sm:block lg:hidden">
        Explorando · {track.regionName}
      </p>

      {/* Top-center hover label — names the structure under the cursor. */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
        {entry && <HoverLabel entry={entry} muscleName={muscle?.name} />}
      </div>
    </>
  );
}

function HoverLabel({
  entry,
  muscleName,
}: {
  entry: AnatomyEntry;
  muscleName?: string;
}) {
  const layer = LAYER_META[entry.layer];
  // EL LADO SE DECIA DOS VECES, Y UNA EN MASCULINO. El titulo llevaba el lado
  // pegado ("Escapula, derecho") y la ficha de al lado lo repetia ("Huesos ·
  // Derecho"). El nombre va ahora limpio y el lado se dice UNA vez, como "lado
  // derecho", que concuerda con cualquier estructura.
  const title = muscleName ?? formatShortName(entry.canonicalName);
  const side =
    entry.side === 'center' ? null : `Lado ${SIDE_META[entry.side].label.toLowerCase()}`;

  return (
    <div className="instrument flex max-w-full items-center gap-2.5 px-3 py-1.5 animate-scale-in sm:max-w-[70%]">
      <span className={`h-2 w-2 shrink-0 rounded-full ${layer.dot}`} />
      <span className="truncate font-display text-sm font-medium text-fg">{title}</span>
      {/* En el telefono solo cabe el lado, que es lo que el nombre ya no dice;
          la capa la da el punto de color. */}
      <span className="tag shrink-0">
        <span className="hidden sm:inline">
          {layer.label}
          {side ? ' · ' : ''}
        </span>
        {side}
      </span>
    </div>
  );
}
