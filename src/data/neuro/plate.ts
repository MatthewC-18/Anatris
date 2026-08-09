// src/data/neuro/plate.ts
//
// THE ANATOMICAL PLATE the neuro panel draws on: one stylised human figure, its
// limb axes, and the dermatome territory of every root we teach, in ANTERIOR and
// POSTERIOR view.
//
// -----------------------------------------------------------------------------
// WHY TWO VIEWS
// -----------------------------------------------------------------------------
// Not for symmetry. The data itself demands it: S1's key point is the LATERAL
// HEEL and C7's territory is the POSTERIOR forearm, and a single-face figure can
// draw neither. The plate it replaces described posterior territory in prose and
// then drew it on a front view, which is a figure contradicting its own caption.
// Here S1's pin exists only on the back, which is the honest reason for the
// second view and also what teaches the anatomy.
//
// -----------------------------------------------------------------------------
// HOW A TERRITORY IS AUTHORED
// -----------------------------------------------------------------------------
// As a rectangle in the limb's own (t, c) space -- see src/lib/neuroPlate.ts.
// t runs proximal to distal, c runs medial (-1) to lateral (+1). So the lateral
// forearm is literally `{ t: [0.38, 0.74], c: [0.14, 1] }`, which is the sentence
// a clinician would say. The geometry wraps it onto the figure; nobody types
// coordinates.
//
// LEVELS ON THE ARM, measured from the axis below: upper arm t 0..0.38, forearm
// t 0.38..0.73, hand t 0.73..1. On the leg: thigh t 0..0.49, leg t 0.49..0.87,
// foot t 0.87..1. Adjacent bands OVERLAP by ~0.02 t on purpose -- two abutting
// polygons that share an exact edge can still show a hairline of background
// between them once the browser antialiases both.
//
// -----------------------------------------------------------------------------
// WHAT IS DELIBERATELY LEFT BLANK
// -----------------------------------------------------------------------------
// The posterior proximal thigh belongs to S2 and S3, and the upper shoulder cap
// to C4 -- roots this screen does not cover. They stay UNPAINTED and each view
// carries a note saying so. Painting them with a neighbouring root's colour to
// avoid a gap would be inventing anatomy to make a picture tidy.
//
// Dermatome boundaries vary between authors (Keegan vs. ASIA); these follow the
// ASIA/ISNCSCI key points, and the panel labels the whole plate as orientativo.
// ASCII source; Spanish strings are clinical text from the root data.

import {
  bandPath,
  limbOutline,
  mirrorLimb,
  pathXBounds,
  pointAt,
  sampleLimb,
  type BandRect,
  type LimbAxis,
} from '../../lib/neuroPlate';

export type PlateView = 'anterior' | 'posterior';
export type PlateFigure = 'upper-limb' | 'lower-limb';

/** Figure-space midline. Both views are drawn in the same 0..100 wide space. */
export const FIGURE_MID_X = 50;

// ---------------------------------------------------------------------------
// THE SILHOUETTE
//
// Head and torso are authored as paths (they are not tube-shaped, so the axis
// model buys nothing); the four limbs are axes, because they carry the bands.
// The body is the UNION of all of them -- the deltoid's width comes from the
// arm's proximal node, not from the torso outline, and the hip's width from the
// thigh's. That is why the torso can be a simple shape and still read as a body.
// ---------------------------------------------------------------------------

/** Cranium and jaw. */
export const HEAD_PATH =
  'M50,3 C58,3 64,10 64,19 C64,28 58,35 50,35 C42,35 36,28 36,19 C36,10 42,3 50,3 Z';

/**
 * Neck, thorax, abdomen and pelvis, down to the perineum.
 *
 * The trapezius slope is drawn OUT to where the arm's proximal node sits, not to
 * the edge of the ribcage. Stopping it short left a V-shaped notch at each
 * shoulder in the union -- the body looked like a torso with two sticks pinned to
 * it. The overlap is what turns arm plus torso into a shoulder.
 */
export const TORSO_PATH =
  'M45,29 C45,37 46,42 42,45 C35,46 29,49 26,57 C24,63 23,71 23,80 ' +
  'C23,88 25,94 27,101 C29,107 28,113 27,121 C26,131 28,139 31,146 ' +
  'C37,150 44,151 50,151 C56,151 63,150 69,146 C72,139 74,131 73,121 ' +
  'C72,113 71,107 73,101 C75,94 77,88 77,80 C77,71 76,63 73,57 ' +
  'C71,49 65,46 58,45 C54,42 55,37 55,29 Z';

/**
 * The arm, in anatomical position: hanging, slightly abducted, palm forward.
 *
 * Abducted on purpose -- an arm flat against the torso merges into it and the
 * medial territories (T1, C8) would have nowhere to be drawn -- but only just.
 * The first pass spread it far enough that the figure read as a scarecrow, and
 * ran the fingertips past the crotch; here the hand stops at mid-thigh height,
 * where a real one does.
 *
 * The hand is the one place the half-width does NOT taper monotonically: it
 * WIDENS at the palm and stays broad through the fingers, then ends blunt. A
 * hand that tapers to a point is a canoe paddle, which is what the first pass
 * drew.
 *
 * LEVELS (arc length, for authoring bands): upper arm t 0..0.395, forearm
 * t 0.395..0.765, hand t 0.765..1.
 */
export const ARM_AXIS: LimbAxis = {
  id: 'arm',
  nodes: [
    { x: 70, y: 50, w: 11.5 }, // acromion / deltoid
    { x: 76, y: 78, w: 8.4 }, // mid upper arm
    { x: 80, y: 103, w: 7 }, // elbow
    { x: 84, y: 127, w: 6 }, // mid forearm
    { x: 87, y: 150, w: 4.8 }, // wrist
    { x: 88.5, y: 161, w: 6.2 }, // palm
    { x: 90, y: 174, w: 5.6 }, // fingers
    { x: 90.5, y: 180, w: 4 }, // fingertips (blunt, not pointed)
  ],
};

/**
 * The leg, standing, feet slightly apart.
 *
 * The foot is SHORT and WIDE rather than long and tapered: seen from the front a
 * foot is foreshortened to a rounded stub, and drawing it at true length gave the
 * figure two cones for feet.
 *
 * LEVELS: thigh t 0..0.499, leg t 0.499..0.886, foot t 0.886..1.
 */
export const LEG_AXIS: LimbAxis = {
  id: 'leg',
  // A blunt toe edge instead of a rounded tip: the first pass rounded a 6-unit
  // half-width by the default 0.95 and the figure ended in two bulbs.
  tipCap: 0.3,
  nodes: [
    { x: 61.5, y: 132, w: 12 }, // proximal thigh (meets its pair at the midline)
    { x: 64, y: 162, w: 10.2 }, // mid thigh
    { x: 65.5, y: 194, w: 8 }, // knee
    { x: 67, y: 217, w: 7.4 }, // mid leg
    { x: 68.5, y: 240, w: 4.6 }, // ankle: the narrowest point of the whole limb
    { x: 69.5, y: 247, w: 6.2 }, // tarsus, flaring forward
    { x: 70.8, y: 253, w: 6.6 }, // forefoot: WIDEST at the toes, as a foot is
  ],
};

// ---------------------------------------------------------------------------
// DERMATOME BANDS
// ---------------------------------------------------------------------------

/** One painted territory: which root, on which limb, where. */
export interface PlateBand {
  root: string;
  limb: 'arm' | 'leg';
  rect: BandRect;
}

/**
 * UPPER LIMB, ANTERIOR. C5 lateral arm, T1 medial arm; then the forearm splits
 * three ways (C6 lateral, C7 middle, C8 medial) and the hand follows it into the
 * thumb / middle / little finger the ASIA key points name.
 */
const UPPER_ANTERIOR: PlateBand[] = [
  { root: 'C5', limb: 'arm', rect: { t: [0, 0.41], c: [0.05, 1], skew: 0.035 } },
  { root: 'T1', limb: 'arm', rect: { t: [0, 0.41], c: [-1, 0.05], skew: 0.035 } },
  { root: 'C6', limb: 'arm', rect: { t: [0.39, 0.78], c: [0.16, 1], skew: 0.03 } },
  { root: 'C7', limb: 'arm', rect: { t: [0.39, 0.78], c: [-0.2, 0.16], skew: 0.03 } },
  { root: 'C8', limb: 'arm', rect: { t: [0.39, 0.78], c: [-1, -0.2], skew: 0.03 } },
  { root: 'C6', limb: 'arm', rect: { t: [0.76, 1], c: [0.3, 1] } },
  { root: 'C7', limb: 'arm', rect: { t: [0.76, 1], c: [-0.22, 0.3] } },
  { root: 'C8', limb: 'arm', rect: { t: [0.76, 1], c: [-1, -0.22] } },
];

/** UPPER LIMB, POSTERIOR. C7 owns the posterior forearm midline into the dorsum. */
const UPPER_POSTERIOR: PlateBand[] = [
  { root: 'C5', limb: 'arm', rect: { t: [0, 0.41], c: [0.08, 1], skew: 0.035 } },
  { root: 'T1', limb: 'arm', rect: { t: [0, 0.41], c: [-1, 0.08], skew: 0.035 } },
  { root: 'C6', limb: 'arm', rect: { t: [0.39, 0.78], c: [0.22, 1], skew: 0.03 } },
  { root: 'C7', limb: 'arm', rect: { t: [0.39, 0.78], c: [-0.22, 0.22], skew: 0.03 } },
  { root: 'C8', limb: 'arm', rect: { t: [0.39, 0.78], c: [-1, -0.22], skew: 0.03 } },
  { root: 'C6', limb: 'arm', rect: { t: [0.76, 1], c: [0.32, 1] } },
  { root: 'C7', limb: 'arm', rect: { t: [0.76, 1], c: [-0.2, 0.32] } },
  { root: 'C8', limb: 'arm', rect: { t: [0.76, 1], c: [-1, -0.2] } },
];

/**
 * LOWER LIMB, ANTERIOR. The thigh bands run ACROSS the limb (L2 proximal, L3
 * distal) because lumbar dermatomes descend the thigh in transverse bands; below
 * the knee they turn longitudinal (L4 medial to the medial malleolus, L5 lateral
 * into the dorsum), which is exactly the switch that makes L4 and L5 separable.
 */
const LOWER_ANTERIOR: PlateBand[] = [
  // t0 is 0.01 rather than 0 ON PURPOSE. At t = 0 the band extends past the
  // limb's root to cover its cap, and the thigh's root is buried in the pelvis:
  // the clip includes the torso, so L2 spilled across the hips as one broad
  // rectangle. Starting a hair inside the thigh keeps the inguinal region (L1,
  // not screened here) unpainted, which is also the honest answer.
  { root: 'L2', limb: 'leg', rect: { t: [0.01, 0.28], c: [-1, 1], skew: 0.045 } },
  { root: 'L3', limb: 'leg', rect: { t: [0.26, 0.52], c: [-1, 1], skew: 0.045 } },
  { root: 'L4', limb: 'leg', rect: { t: [0.5, 0.9], c: [-1, -0.02], skew: 0.02 } },
  { root: 'L5', limb: 'leg', rect: { t: [0.5, 0.9], c: [-0.02, 1], skew: 0.02 } },
  { root: 'L5', limb: 'leg', rect: { t: [0.88, 1], c: [-1, 0.5] } },
  { root: 'S1', limb: 'leg', rect: { t: [0.88, 1], c: [0.5, 1] } },
];

/**
 * LOWER LIMB, POSTERIOR. S1 takes the posterior calf and the heel -- which is
 * where its key point and its reflex both live, and neither is visible from the
 * front. The proximal posterior thigh is left blank (S2/S3, see the view note).
 */
const LOWER_POSTERIOR: PlateBand[] = [
  { root: 'L3', limb: 'leg', rect: { t: [0.12, 0.52], c: [-1, -0.32], skew: 0.04 } },
  { root: 'L4', limb: 'leg', rect: { t: [0.5, 0.9], c: [-1, -0.28], skew: 0.02 } },
  { root: 'L5', limb: 'leg', rect: { t: [0.5, 0.92], c: [0.32, 1], skew: 0.02 } },
  { root: 'S1', limb: 'leg', rect: { t: [0.5, 1], c: [-0.28, 0.32] } },
  { root: 'S1', limb: 'leg', rect: { t: [0.88, 1], c: [-1, 1] } },
];

// ---------------------------------------------------------------------------
// ASIA KEY POINTS
//
// Addressed in (t, c) like everything else, so a pin is fixed to the same
// geometry as the band beneath it: the thumb pin cannot end up off the thumb.
// Only ONE pin per root, on the figure's own right limb, and only shown while
// its root is selected -- five pins at once is a legend, not a landmark.
// ---------------------------------------------------------------------------

export interface PlatePin {
  root: string;
  limb: 'arm' | 'leg';
  view: PlateView;
  t: number;
  c: number;
}

const UPPER_PINS: PlatePin[] = [
  { root: 'C5', limb: 'arm', view: 'anterior', t: 0.4, c: 0.5 }, // antecubital, lateral
  { root: 'C6', limb: 'arm', view: 'anterior', t: 0.9, c: 0.78 }, // thumb
  { root: 'C7', limb: 'arm', view: 'anterior', t: 0.97, c: 0.05 }, // middle finger
  { root: 'C8', limb: 'arm', view: 'anterior', t: 0.9, c: -0.78 }, // little finger
  { root: 'T1', limb: 'arm', view: 'anterior', t: 0.41, c: -0.55 }, // antecubital, medial
];

const LOWER_PINS: PlatePin[] = [
  { root: 'L2', limb: 'leg', view: 'anterior', t: 0.14, c: 0 }, // mid anterior thigh
  { root: 'L3', limb: 'leg', view: 'anterior', t: 0.5, c: -0.6 }, // medial femoral condyle
  { root: 'L4', limb: 'leg', view: 'anterior', t: 0.88, c: -0.68 }, // medial malleolus
  { root: 'L5', limb: 'leg', view: 'anterior', t: 0.94, c: 0.1 }, // dorsum, 3rd MTP
  // The only key point on the back, and the reason the plate has two views.
  { root: 'S1', limb: 'leg', view: 'posterior', t: 0.91, c: 0.6 }, // lateral heel
];

// ---------------------------------------------------------------------------
// FIGURES
// ---------------------------------------------------------------------------

export interface PlateSpec {
  /**
   * SVG viewBox, CROPPED to the region. An uncropped standing figure inside a
   * 24rem column leaves a forearm band about two pixels wide. Cropping keeps the
   * anatomical context that orients the reader (head and shoulders above an arm,
   * pelvis above a leg) and spends the pixels on the limb carrying the data.
   */
  viewBox: string;
  /**
   * Which limbs the SILHOUETTE draws -- not which ones are painted (that follows
   * from `bands`).
   *
   * The upper plate keeps the legs: cropped mid-thigh by the frame they read as a
   * body continuing past the edge, and without them the torso ends in a rounded
   * pelvis that looks like a vase. The lower plate drops the arms, whose hands
   * fell exactly in its top corners and read as two diagonal slivers of debris.
   */
  drawLimbs: ('arm' | 'leg')[];
  /** Order proximal to distal. Drives the segmental colour ramp. */
  order: string[];
  bands: Record<PlateView, PlateBand[]>;
  pins: PlatePin[];
  /** What this view does not cover, stated on the plate. Spanish. */
  notes: Record<PlateView, string | null>;
}

export const PLATES: Record<PlateFigure, PlateSpec> = {
  'upper-limb': {
    viewBox: '-4 -3 108 191',
    drawLimbs: ['arm', 'leg'],
    order: ['C5', 'C6', 'C7', 'C8', 'T1'],
    bands: { anterior: UPPER_ANTERIOR, posterior: UPPER_POSTERIOR },
    pins: UPPER_PINS,
    notes: {
      anterior: null,
      posterior: 'El casquete del hombro corresponde a C4, fuera de este tamizaje.',
    },
  },
  'lower-limb': {
    viewBox: '18 118 64 143',
    drawLimbs: ['leg'],
    order: ['L2', 'L3', 'L4', 'L5', 'S1'],
    bands: { anterior: LOWER_ANTERIOR, posterior: LOWER_POSTERIOR },
    pins: LOWER_PINS,
    notes: {
      anterior: 'La región inguinal corresponde a L1, fuera de este tamizaje.',
      posterior: 'El muslo posterior proximal corresponde a S2 y S3, fuera de este tamizaje.',
    },
  },
};

/**
 * SEGMENTAL COLOUR RAMP, proximal to distal.
 *
 * Muted atlas pigments -- teal, sage, ochre, terracotta, mauve -- not a
 * saturated data palette. Two reasons, both structural:
 *
 *  1. The lab's cyan accent means INTERACTIVE STATE and is never allowed to
 *     carry data (see the design rules atop OrthopedicTestsPanel). A dermatome
 *     painted cyan would be claiming to be a selection. Selection on this plate
 *     is a cyan RING around a territory; the fill is always the root's pigment.
 *  2. Amber, sky and violet are already spoken for by the muscle-role code, and
 *     emerald/sky by the tests panel's two-axis code. Borrowing any of them here
 *     would make a dermatome look like a prime mover or a rule-in test.
 *
 * Ordered rather than arbitrary, so a physio reads "descending the limb" off the
 * plate before reading a single label.
 */
export const SEGMENT_PIGMENTS = [
  '#3d7f91', // teal
  '#62956a', // sage
  '#b5964a', // ochre, deliberately the LIGHTEST of the five
  '#a85a4c', // terracotta
  '#7f63a2', // violet
] as const;

/** Pigment for a root within its figure, or a neutral when it is not on the plate. */
export function pigmentFor(figure: PlateFigure, root: string): string {
  const i = PLATES[figure].order.indexOf(root);
  return i >= 0 ? SEGMENT_PIGMENTS[i % SEGMENT_PIGMENTS.length] : '#5b6577';
}

// ---------------------------------------------------------------------------
// RESOLVED GEOMETRY
// ---------------------------------------------------------------------------

/**
 * One band path, tied to the single limb it may be drawn on.
 *
 * The tie matters. Bands overshoot sideways so the clip can supply their edge,
 * and clipping them to the union of BOTH limbs of a pair let the right thigh's
 * medial overshoot cross the midline into the left thigh, where the two overlaps
 * doubled their alpha and painted a bright butterfly across the perineum. A band
 * exists on one limb; that limb is what trims it.
 */
export interface PlateBandPath {
  d: string;
  /** Index into PlateGeometry.limbShapes. */
  limbIndex: number;
}

/** Everything a renderer needs, with every (t, c) address already resolved. */
export interface PlateGeometry {
  spec: PlateSpec;
  /** The overlapping shapes whose UNION is the body. Clips nothing but itself. */
  bodyShapes: string[];
  /**
   * Horizontal extent of each body shape, for the shading gradient laid across
   * it (dark at the two long edges, clear down the middle -- what gives a limb
   * the look of a tube instead of a flat vector fill).
   *
   * A gradient rather than a fattened inner stroke, which was the first attempt:
   * stroking each shape drew the UNION'S INTERNAL SEAMS too, so the arcs where the
   * thighs enter the pelvis appeared on the front view as a pair of buttocks. A
   * gradient has no edges of its own, so there is nothing to leak.
   */
  shapeXBounds: [number, number][];
  /**
   * The band-carrying limbs, ONE SHAPE EACH, indexed by PlateBandPath.limbIndex.
   *
   * Bands are clipped to one of these, never to the body. Clipping them to the
   * whole silhouette let a band's lateral overshoot spill off its limb and onto
   * the trunk: L2's overshoot painted the hips as one broad slab, and C5's crept
   * over the shoulder girdle.
   */
  limbShapes: string[];
  /** view -> root -> its band paths across both limbs of the pair. */
  byView: Record<PlateView, Map<string, PlateBandPath[]>>;
  /** Key points in figure space. */
  pins: { root: string; view: PlateView; x: number; y: number }[];
}

/**
 * Resolve a figure once.
 *
 * Lives here rather than in the component because the plate has TWO renderers:
 * DermatomeMap in the app, and scripts/render-neuro-plate.mts, which rasterises
 * it to a PNG so the figure can be judged without booting a browser (the lab's
 * WebGL canvas does not paint in the review preview, which is exactly how the
 * previous plate stayed unlooked-at for so long). One builder, so the preview
 * cannot flatter a figure the app draws differently.
 */
export function buildPlateGeometry(figure: PlateFigure): PlateGeometry {
  const spec = PLATES[figure];
  const limbs: Record<'arm' | 'leg', LimbAxis[]> = {
    arm: [ARM_AXIS, mirrorLimb(ARM_AXIS, FIGURE_MID_X, 'arm-l')],
    leg: [LEG_AXIS, mirrorLimb(LEG_AXIS, FIGURE_MID_X, 'leg-l')],
  };

  const bodyShapes = [
    HEAD_PATH,
    TORSO_PATH,
    ...spec.drawLimbs.flatMap((kind) => limbs[kind].map(limbOutline)),
  ];

  // Derived from the bands themselves, so a new band on a new limb cannot be
  // clipped away by a list someone forgot to update.
  const bandLimbKinds = [
    ...new Set(
      (['anterior', 'posterior'] as PlateView[]).flatMap((v) =>
        spec.bands[v].map((b) => b.limb),
      ),
    ),
  ];
  // Flat list of individual limbs, plus the lookup a band uses to find its own.
  const bandLimbs = bandLimbKinds.flatMap((kind) =>
    limbs[kind].map((axis) => ({ kind, axis })),
  );
  const limbShapes = bandLimbs.map((l) => limbOutline(l.axis));

  // Grouped BY ROOT, so one root is one interactive object. The plate this
  // replaced emitted a flat list in which C6 appeared four times with no shared
  // identity, so nothing could hover or focus "the C6 territory".
  const views: PlateView[] = ['anterior', 'posterior'];
  const byView = {} as Record<PlateView, Map<string, PlateBandPath[]>>;
  for (const view of views) {
    const map = new Map<string, PlateBandPath[]>();
    for (const band of spec.bands[view]) {
      const paths = map.get(band.root) ?? [];
      bandLimbs.forEach((limb, limbIndex) => {
        if (limb.kind !== band.limb) return;
        paths.push({ d: bandPath(limb.axis, band.rect), limbIndex });
      });
      map.set(band.root, paths);
    }
    byView[view] = map;
  }

  const samples = { arm: sampleLimb(ARM_AXIS), leg: sampleLimb(LEG_AXIS) };
  const pins = spec.pins.map((p) => {
    const [x, y] = pointAt(samples[p.limb], p.t, p.c);
    return { root: p.root, view: p.view, x, y };
  });

  return {
    spec,
    bodyShapes,
    shapeXBounds: bodyShapes.map(pathXBounds),
    limbShapes,
    byView,
    pins,
  };
}
