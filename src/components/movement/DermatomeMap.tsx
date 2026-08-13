// src/components/movement/DermatomeMap.tsx
//
// THE DERMATOME PLATE: a stylised human figure, anterior and posterior, whose
// segmental territories are painted, selectable and pinned at the ASIA key point.
//
// -----------------------------------------------------------------------------
// WHAT THIS REPLACES, AND WHY IT IS BUILT THIS WAY
// -----------------------------------------------------------------------------
// The previous plate was twenty hand-typed rectangles -- the arm two boxes, the
// forearm three bars, the fingers four sticks -- drawn 224px tall in a 30%
// slate that was barely visible, on a single face, with the ASIA key point (the
// one landmark a physio actually palpates) nowhere on the figure. It was also
// read-only: the map could not select anything, so the only way in was the list.
//
// Four decisions carry the rebuild:
//
// 1. GEOMETRY IS DERIVED, NOT TYPED. The silhouette and the bands both come out
//    of the same limb axes (src/lib/neuroPlate.ts, src/data/neuro/plate.ts), so a
//    territory cannot drift off the limb it belongs to.
//
// 2. THE BAND LAYER IS CLIPPED TO THE BODY. Bands are authored overshooting the
//    silhouette and the clip trims them, so a territory's visible edge IS the
//    skin's edge. That is what removes the seam between a zone and the body and
//    what makes the figure read as painted rather than as boxes laid on top.
//
// 3. THE OUTLINE IS AN UNDERLAY, NOT A STROKE. The body is the UNION of six
//    overlapping shapes (head, torso, two arms, two legs). Stroking each one
//    would draw the seams where they overlap -- a line across every shoulder and
//    hip. So the shapes are drawn twice: once fattened in the outline colour,
//    once filled in the tissue colour on top. What survives is the union's
//    perimeter and nothing else.
//
// 4. COLOUR OBEYS THE LAB'S LAW. Territory colour is the segmental pigment ramp;
//    the cyan accent never fills a dermatome, because in this app cyan means
//    "you selected this". Selection is drawn as a cyan RIM around the whole
//    territory (a fattened underlay, so the internal boundaries between one
//    root's own bands stay invisible), never as a fill.
//
// The figure is deliberately labelled orientativo: dermatome maps differ between
// authors, and the rig carries no per-dermatome geometry to be exact against.
//
// UI Spanish LATAM; code and comments ASCII/English, as the rest of the lab.

import { useId, useMemo, useState } from 'react';
import {
  buildPlateGeometry,
  pigmentFor,
  type PlateFigure,
  type PlateView,
} from '../../data/neuro/plate';

const VIEWS: PlateView[] = ['anterior', 'posterior'];
const VIEW_LABEL: Record<PlateView, string> = {
  anterior: 'Cara anterior',
  posterior: 'Cara posterior',
};

// Tissue and rim. Both sit on the panel's frosted glass, so the tissue is nearly
// opaque (a translucent body would let the panel's own gradient show through and
// the figure would look like a hole) while the rim stays a hairline.
const RIM = 'rgba(148,163,184,0.42)';
const SHADE = '#03070f';
const TISSUE = 'rgba(24,34,54,0.94)';
const ACCENT = '#22d3ee';

// Territory fill opacity by state. `IDLE` is high enough that the plate is fully
// painted before anything is selected -- the old map dimmed to 20% and the figure
// vanished the moment you picked a root, which is the opposite of what a plate is
// for -- and `DIMMED` keeps a territory legible while another one is the subject.
const FILL_ACTIVE = 0.9;
const FILL_HOVER = 0.66;
const FILL_IDLE = 0.44;
const FILL_DIMMED = 0.2;

/** Front/back cues. Without them two identical silhouettes read as a duplicate. */
const SURFACE_MARKS: Record<PlateView, string[]> = {
  anterior: [
    'M46,47 C42,49 37,50 33,52', // clavicle, left
    'M54,47 C58,49 63,50 67,52', // clavicle, right
    'M50,52 L50,116', // sternum into the linea alba
    'M40,88 C44,94 50,95 50,95 C50,95 56,94 60,88', // costal arch
  ],
  posterior: [
    'M50,46 C50,72 50,102 50,134', // vertebral column
    'M44,58 L41,79', // scapula, medial border
    'M56,58 L59,79',
    'M34,124 C42,120 58,120 66,124', // iliac crests
    'M50,138 L50,149', // gluteal cleft
  ],
};

export function DermatomeMap({
  figure,
  activeRoots,
  onSelectRoot,
  keyPointFor,
}: {
  figure: PlateFigure;
  /** Selected roots. Two entries when the panel is comparing neighbours. */
  activeRoots: string[];
  /** Selecting from the figure itself -- the plate is an input, not a picture. */
  onSelectRoot?: (root: string) => void;
  /** Short ASIA key point for a root, for the caption under the plate. */
  keyPointFor?: (root: string) => string | undefined;
}) {
  const plate = useMemo(() => buildPlateGeometry(figure), [figure]);
  const [hovered, setHovered] = useState<string | null>(null);
  // ENLARGED PLATE. The two views sit side by side in a narrow rail, so each
  // figure gets half of it and the forearm bands end up a few pixels wide -- "muy
  // pequeño espacio de dermatomas y miotomas". Raising the cap was tried before
  // and pushes the root list off a laptop screen, so instead the plate can be
  // opened: one column, full width, and the panel scrolls. The compact default is
  // unchanged.
  const [enlarged, setEnlarged] = useState(false);
  // Unique per instance: the panel mounts on desktop and inside the mobile sheet,
  // and two SVGs sharing a clipPath id would clip to whichever mounted last.
  const uid = useId().replace(/:/g, '');

  const active = new Set(activeRoots);
  const hasSelection = active.size > 0;

  const fillOpacity = (root: string): number => {
    if (active.has(root)) return FILL_ACTIVE;
    if (hovered === root) return FILL_HOVER;
    return hasSelection ? FILL_DIMMED : FILL_IDLE;
  };

  // Which key points are on show, in the plate's own proximal-to-distal order so
  // the caption never reorders itself as roots are picked.
  const shownPins = plate.spec.order
    .filter((root) => active.has(root))
    .map((root) => ({ root, keyPoint: keyPointFor?.(root) }))
    .filter((p): p is { root: string; keyPoint: string } => Boolean(p.keyPoint));

  return (
    <div>
      <div className="mb-1.5 flex justify-end">
        <button
          type="button"
          onClick={() => setEnlarged((v) => !v)}
          aria-pressed={enlarged}
          title={
            enlarged
              ? 'Volver a las dos vistas lado a lado'
              : 'Ver la lámina a lo ancho del panel, una vista debajo de la otra'
          }
          className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${
            enlarged
              ? 'border-accent/50 bg-accent/10 text-accent'
              : 'border-slate-700 text-slate-500 hover:text-slate-300'
          }`}
        >
          {enlarged ? 'Reducir' : 'Ampliar'}
        </button>
      </div>
      <div className={enlarged ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-2.5'}>
        {VIEWS.map((view) => (
          <figure key={view} className="m-0">
            <svg
              viewBox={plate.spec.viewBox}
              className="mx-auto block h-auto w-full"
              // Capped rather than sized: the plate shares a fixed header with the
              // red flags and everything below it scrolls, so a plate at its natural
              // height would push the roots off a laptop screen. The cap was tighter
              // still for a while and the figures came out about 110px wide, with
              // forearm bands too thin to read -- the expanded root row is where the
              // scrolling actually came from, and once that was cut the height could
              // come back here, where it buys legibility.
              // Enlarged, the figure gets the whole rail and a much taller cap;
              // the panel scrolls, which is the trade the compact default exists
              // to avoid but the right one when the plate is what you came for.
              style={{ maxHeight: enlarged ? 'min(72vh, 34rem)' : 'min(38vh, 19rem)' }}
              // NOT role="img" when the territories are selectable: role="img"
              // makes an element's whole subtree presentational, which would hide
              // every one of the root buttons below from assistive tech.
              role={onSelectRoot ? 'group' : 'img'}
              aria-label={`Dermatomas, ${VIEW_LABEL[view].toLowerCase()}${
                activeRoots.length ? `. Raíz resaltada: ${activeRoots.join(', ')}` : ''
              }`}
            >
              <defs>
                {/* One clip per LIMB, because a band belongs to one limb -- see
                    PlateBandPath. Landmarks and shading clip to the whole body
                    instead, so those are two different unions. */}
                {plate.limbShapes.map((d, i) => (
                  <clipPath key={i} id={`${uid}-limb${i}`}>
                    <path d={d} />
                  </clipPath>
                ))}
                <clipPath id={`${uid}-body`}>
                  {plate.bodyShapes.map((d, i) => (
                    <path key={i} d={d} />
                  ))}
                </clipPath>
                {/* One shading gradient per shape, laid ACROSS it in user space:
                    dark at the two long edges, clear down the middle. */}
                {plate.shapeXBounds.map(([x0, x1], i) => (
                  <linearGradient
                    key={i}
                    id={`${uid}-vol${i}`}
                    gradientUnits="userSpaceOnUse"
                    x1={x0}
                    y1={0}
                    x2={x1}
                    y2={0}
                  >
                    <stop offset="0" stopColor={SHADE} stopOpacity={0.5} />
                    <stop offset="0.3" stopColor={SHADE} stopOpacity={0} />
                    <stop offset="0.68" stopColor={SHADE} stopOpacity={0} />
                    <stop offset="1" stopColor={SHADE} stopOpacity={0.42} />
                  </linearGradient>
                ))}
              </defs>

              {/* 1. Rim underlay: the union's perimeter, with no internal seams. */}
              <g fill={RIM} stroke={RIM} strokeWidth={1.4} strokeLinejoin="round">
                {plate.bodyShapes.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>
              {/* 2. Tissue, covering the underlay and leaving it as a hairline. */}
              <g fill={TISSUE}>
                {plate.bodyShapes.map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>

              {/* 3. Territories, each trimmed to its own limb. */}
              <g>
                {plate.spec.order.map((root) => {
                  const paths = plate.byView[view].get(root);
                  if (!paths) return null;
                  const pigment = pigmentFor(figure, root);
                  const isActive = active.has(root);
                  return (
                    <g
                      key={root}
                      role={onSelectRoot ? 'button' : undefined}
                      tabIndex={onSelectRoot ? 0 : undefined}
                      aria-label={`Dermatoma ${root}, ${VIEW_LABEL[view].toLowerCase()}`}
                      aria-pressed={onSelectRoot ? isActive : undefined}
                      className={onSelectRoot ? 'cursor-pointer' : undefined}
                      onClick={() => onSelectRoot?.(root)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectRoot?.(root);
                        }
                      }}
                      onPointerEnter={() => setHovered(root)}
                      onPointerLeave={() => setHovered((cur) => (cur === root ? null : cur))}
                    >
                      {/* Selection rim: fattened underlay, so only the OUTER edge
                          of the whole territory shows cyan. Stroking each band
                          would draw the boundaries between a root's own bands. */}
                      {isActive && (
                        <g
                          fill="none"
                          stroke={ACCENT}
                          strokeWidth={2.6}
                          strokeLinejoin="round"
                          opacity={0.95}
                        >
                          {paths.map((p, i) => (
                            <path key={i} d={p.d} clipPath={`url(#${uid}-limb${p.limbIndex})`} />
                          ))}
                        </g>
                      )}
                      <g
                        fill={pigment}
                        fillOpacity={fillOpacity(root)}
                        stroke={pigment}
                        strokeWidth={0.5}
                        strokeOpacity={hasSelection && !isActive ? 0.35 : 0.7}
                      >
                        {paths.map((p, i) => (
                          <path key={i} d={p.d} clipPath={`url(#${uid}-limb${p.limbIndex})`} />
                        ))}
                      </g>
                    </g>
                  );
                })}
              </g>

              {/* 4. VOLUME. Each shape refilled with its own cross-gradient, so
                  a limb darkens toward both long edges and reads as a tube rather
                  than a flat vector fill. Drawn OVER the bands, so the paint is
                  shaded with the skin.

                  Two earlier attempts are worth not repeating. A fattened inner
                  STROKE per shape drew the union's internal seams as well, which
                  put a pair of buttocks across the front view where the thighs
                  enter the pelvis. And at 6 units it swallowed the whole arm: a
                  limb here is about fourteen units across. A gradient has no edge
                  of its own, so there is nothing to leak. */}
              <g>
                {plate.bodyShapes.map((d, i) => (
                  <path key={i} d={d} fill={`url(#${uid}-vol${i})`} />
                ))}
              </g>

              {/* 5. Surface landmarks, over the paint: they are what separates a
                  front view from a back view once both are painted. */}
              <g
                clipPath={`url(#${uid}-body)`}
                fill="none"
                stroke="rgba(203,213,225,0.3)"
                strokeWidth={0.7}
                strokeLinecap="round"
              >
                {SURFACE_MARKS[view].map((d, i) => (
                  <path key={i} d={d} />
                ))}
              </g>

              {/* 6. ASIA key points. Only for selected roots: five pins at once is
                  a legend, one pin is a landmark. Same ring-and-core vocabulary as
                  the atlas leaders in Explorar. */}
              {plate.pins
                .filter((p) => p.view === view && active.has(p.root))
                .map((p) => (
                  <g key={p.root}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={4.4}
                      fill="none"
                      stroke={pigmentFor(figure, p.root)}
                      strokeWidth={1.6}
                    />
                    <circle cx={p.x} cy={p.y} r={2.6} fill="none" stroke={ACCENT} strokeWidth={1} />
                    <circle cx={p.x} cy={p.y} r={1.1} fill="#f8fafc" />
                  </g>
                ))}
            </svg>

            <figcaption className="mt-1.5 text-center text-[11px] uppercase tracking-[0.08em] text-slate-500">
              {VIEW_LABEL[view]}
            </figcaption>
          </figure>
        ))}
      </div>

      {/* What the plate does NOT cover, once, under both figures. Hanging each
          view's note under its own figure gave the two columns different heights and
          the plate looked lopsided -- and the note is about the anatomy, not about
          one drawing of it. */}
      {VIEWS.some((v) => plate.spec.notes[v]) && (
        <p className="mt-2 text-[11px] leading-snug text-slate-600">
          {VIEWS.filter((v) => plate.spec.notes[v])
            .map((v) => plate.spec.notes[v])
            .join(' ')}
        </p>
      )}

      {/* The pin's meaning, in type rather than in 9px SVG labels. */}
      {shownPins.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {shownPins.map((p) => (
            <p key={p.root} className="flex items-baseline gap-2 text-[11px] leading-snug">
              <span
                className="mt-[3px] h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: pigmentFor(figure, p.root) }}
                aria-hidden="true"
              />
              <span className="text-slate-400">
                <span className="font-mono font-semibold text-slate-200">{p.root}</span>{' '}
                punto clave · {p.keyPoint}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
