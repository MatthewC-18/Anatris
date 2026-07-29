// src/components/movement/DermatomeMap.tsx
//
// A SCHEMATIC dermatome figure for the neuro panel: a stylised limb whose zones
// light up for the selected nerve root. It is deliberately labelled "orientativo"
// — the rig GLB carries no per-dermatome geometry, so this 2D map is the honest
// way to show the skin territory next to the rig-driven myotome demo.
//
// Each figure is a list of ZONES (root id + polygon). Selecting a root highlights
// its zones (accent) and dims the rest. Colours come from CSS (currentColor /
// accent) so it themes with the app.

type Figure = 'upper-limb' | 'lower-limb';

interface Zone {
  root: string;
  /** SVG polygon points. */
  points: string;
}

// Upper limb (arm hanging, palm forward). Lateral = left as drawn.
const UPPER_ZONES: Zone[] = [
  // upper arm: lateral C5 / medial T1
  { root: 'C5', points: '78,44 104,44 103,128 82,128' },
  { root: 'T1', points: '104,44 130,44 126,128 103,128' },
  // forearm split into three longitudinal bands
  { root: 'C6', points: '82,128 96,128 93,214 87,214' },
  { root: 'C7', points: '96,128 112,128 109,214 93,214' },
  { root: 'C8', points: '112,128 126,128 121,214 109,214' },
  // hand palm bands
  { root: 'C6', points: '87,214 96,214 94,246 88,246' },
  { root: 'C7', points: '96,214 110,214 110,246 94,246' },
  { root: 'C8', points: '110,214 121,214 120,246 110,246' },
  // thumb (lateral stub) C6
  { root: 'C6', points: '72,206 86,214 84,230 70,224' },
  // fingers (index C6, middle C7, ring+little C8)
  { root: 'C6', points: '88,246 95,246 95,272 89,272' },
  { root: 'C7', points: '96,246 104,246 104,274 97,274' },
  { root: 'C8', points: '105,246 112,246 112,272 106,272' },
  { root: 'C8', points: '113,246 120,246 119,268 113,268' },
];

// Lower limb (leg, anterior). Medial = right as drawn.
const LOWER_ZONES: Zone[] = [
  // thigh: upper L2 / lower L3
  { root: 'L2', points: '84,40 136,40 134,96 86,96' },
  { root: 'L3', points: '86,96 134,96 130,150 90,150' },
  // leg below knee: lateral L5 / medial L4
  { root: 'L5', points: '90,150 110,150 106,250 96,250' },
  { root: 'L4', points: '110,150 130,150 122,250 106,250' },
  // foot dorsum L5, lateral foot + heel S1
  { root: 'L5', points: '96,250 118,250 120,272 98,272' },
  { root: 'S1', points: '118,252 150,258 150,276 120,272' },
  { root: 'S1', points: '96,272 118,272 118,282 96,282' },
];

const LABELS_UPPER: { root: string; x: number; y: number }[] = [
  { root: 'C5', x: 60, y: 80 },
  { root: 'T1', x: 140, y: 80 },
  { root: 'C6', x: 58, y: 176 },
  { root: 'C7', x: 102, y: 130 },
  { root: 'C8', x: 140, y: 176 },
];
const LABELS_LOWER: { root: string; x: number; y: number }[] = [
  { root: 'L2', x: 150, y: 66 },
  { root: 'L3', x: 150, y: 124 },
  { root: 'L5', x: 62, y: 200 },
  { root: 'L4', x: 150, y: 200 },
  { root: 'S1', x: 162, y: 268 },
];

export function DermatomeMap({
  figure,
  activeRoot,
}: {
  figure: Figure;
  activeRoot: string | null;
}) {
  const zones = figure === 'upper-limb' ? UPPER_ZONES : LOWER_ZONES;
  const labels = figure === 'upper-limb' ? LABELS_UPPER : LABELS_LOWER;
  const viewBox = figure === 'upper-limb' ? '0 0 200 290' : '0 0 210 300';

  return (
    <figure className="m-0">
      <svg
        viewBox={viewBox}
        className="mx-auto h-56 w-auto"
        role="img"
        aria-label={`Esquema de dermatomas, ${
          figure === 'upper-limb' ? 'miembro superior' : 'miembro inferior'
        }${activeRoot ? `, raíz ${activeRoot} resaltada` : ''}`}
      >
        {zones.map((z, i) => {
          const active = activeRoot != null && z.root === activeRoot;
          const dim = activeRoot != null && !active;
          return (
            <polygon
              key={i}
              points={z.points}
              className={
                active
                  ? 'fill-accent/70 stroke-accent'
                  : dim
                    ? 'fill-slate-700/20 stroke-slate-700/50'
                    : 'fill-slate-600/30 stroke-slate-600/60'
              }
              strokeWidth={1}
            />
          );
        })}
        {labels.map((l) => {
          const active = activeRoot != null && l.root === activeRoot;
          return (
            <text
              key={l.root}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              className={`text-[9px] font-semibold ${
                active ? 'fill-accent' : 'fill-slate-500'
              }`}
            >
              {l.root}
            </text>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-center text-[10px] text-slate-500">
        Esquema orientativo de dermatomas · resalta la raíz seleccionada
      </figcaption>
    </figure>
  );
}
