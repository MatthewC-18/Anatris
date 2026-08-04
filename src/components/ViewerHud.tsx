// src/components/ViewerHud.tsx
//
// Premium in-canvas HUD for the "Explorar" viewer. Two pieces of ambient,
// pointer-events-none chrome that make the raw 3D canvas feel like an
// instrument instead of a bare model:
//
//   - Top-left "module" plate: the active region name + a live count of the
//     structure under the cursor, so the user always knows where they are.
//   - Top-center hover label: a glass chip naming the structure under the
//     cursor (with its layer color), fading in/out as the pointer moves.
//
// It is purely presentational: it reads hoveredMeshName / region from the
// store and the mesh index, and never mutates state, so it cannot interfere
// with picking, camera or highlight logic.

import { useAnatomyStore } from '../store/anatomyStore';
import { LAYER_META, SIDE_META } from '../lib/anatomyMeta';
import { formatCanonicalName } from '../lib/formatName';
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
      {/* Top-left module plate — gives the canvas an instrument-panel identity.
          Hidden on phones (the region already shows in the TopBar dropdown) so it
          never collides with the centered hover chip in the narrow top row. */}
      <div className="pointer-events-none absolute left-4 top-4 z-20 hidden animate-fade-in sm:block">
        <div className="glass flex items-center gap-2.5 rounded-xl px-3 py-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <div className="leading-tight">
            <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-slate-500">
              Explorando
            </p>
            <p className="font-display text-sm font-semibold text-slate-100">
              {track.regionName}
            </p>
          </div>
        </div>
      </div>

      {/* Top-center hover label — names the structure under the cursor. */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center">
        {entry && <HoverChip entry={entry} muscleName={muscle?.name} />}
      </div>
    </>
  );
}

function HoverChip({
  entry,
  muscleName,
}: {
  entry: AnatomyEntry;
  muscleName?: string;
}) {
  const layer = LAYER_META[entry.layer];
  const sideLabel = SIDE_META[entry.side].label;
  const side = SIDE_META[entry.side].label.toLowerCase();
  const title = muscleName
    ? entry.side === 'center'
      ? muscleName
      : `${muscleName}, ${side}`
    : formatCanonicalName(entry.canonicalName, entry.side);

  return (
    <div className="glass-strong flex max-w-[70%] items-center gap-2.5 rounded-full px-4 py-2 shadow-accent-glow animate-scale-in">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${layer.dot}`} />
      <span className="truncate font-display text-sm font-medium text-slate-100">
        {title}
      </span>
      <span className="hidden shrink-0 rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:inline">
        {entry.side !== 'center' ? `${layer.label} · ${sideLabel}` : layer.label}
      </span>
    </div>
  );
}
