// src/lib/neuroPlate.ts
//
// GEOMETRY for the dermatome plate (DermatomeMap). Pure functions, no React.
//
// -----------------------------------------------------------------------------
// WHY THIS EXISTS
// -----------------------------------------------------------------------------
// The plate it replaces was twenty hand-typed rectangles: the arm was two boxes,
// the forearm three vertical bars, the fingers four sticks. Nothing about it
// followed a body, and every zone had to be re-typed by hand whenever the figure
// moved -- so the figure never moved.
//
// So the plate is DERIVED, the same way ShoulderRhythmArc derives its goniometer
// from the real bone positions instead of a guessed axis. One limb is described
// once, as an AXIS: a centre line with a half-width at each node. From that one
// description we generate BOTH
//
//   * the limb's silhouette (limbOutline), and
//   * every dermatome band drawn on it (bandPath),
//
// which is what makes them impossible to desynchronise. A band cannot drift off
// the arm, because the arm's edge and the band's edge are the same numbers.
//
// -----------------------------------------------------------------------------
// THE TWO COORDINATES
// -----------------------------------------------------------------------------
// A point on a limb is addressed as (t, c), which is how a clinician describes a
// territory in words -- "the lateral half of the forearm", "the distal third":
//
//   t  0..1  ALONG the limb by arc length. 0 = proximal (shoulder / hip),
//            1 = distal tip (fingertips / toes).
//   c -1..+1 ACROSS the limb. 0 = the centre line, +1 = LATERAL edge,
//            -1 = MEDIAL edge. Always, on both sides of the body: a mirrored
//            limb carries `flip`, which re-points the normal so that authoring a
//            dermatome never has to think about which arm it is on.
//
// A band is then a rectangle in (t, c) space -- t [0.38, 0.74] x c [0.12, 1] is
// "the lateral forearm" -- and the geometry wraps it onto the limb.
//
// -----------------------------------------------------------------------------
// TWO DELIBERATE CHOICES
// -----------------------------------------------------------------------------
// 1. BANDS OVERSHOOT, AND THE FIGURE CLIPS THEM. Band edges at c = +/-1 are
//    pushed past the silhouette (EDGE_OVERSHOOT) and the ends of a limb are
//    pushed past the tip (CAP_OVERSHOOT). The caller clips the whole band layer
//    to the body outline, so the band's visible edge IS the body's edge -- no
//    antialiasing seam between a band and the skin it sits on, which is the
//    detail that separates a plate from a diagram.
//
// 2. THE OUTLINE IS SMOOTHED, THE BANDS ARE NOT. The silhouette is one closed
//    loop, so a Catmull-Rom pass rounds it into a body with no cost. Bands are
//    NOT smoothed on purpose: rounding their corners would pull adjacent bands
//    apart at the level they share and open a lens-shaped gap between C6 and C7.
//    They are dense polylines instead, so their long edges follow the limb just
//    as smoothly while the shared boundary stays exact.
//
// ASCII source; the plate's Spanish strings live in the data layer.

/** One node of a limb's centre line. `w` is the HALF-width there. */
export interface AxisNode {
  x: number;
  y: number;
  w: number;
}

/** A limb, described once, in figure space (see PLATE_VIEWBOX). */
export interface LimbAxis {
  /** Stable id, e.g. "arm-r". ASCII. */
  id: string;
  /** Proximal to distal. At least two nodes. */
  nodes: AxisNode[];
  /**
   * Negate the cross normal, so `c = +1` still means LATERAL. Set on limbs
   * mirrored to the other side of the body: mirroring flips handedness, which
   * would otherwise silently swap medial and lateral.
   */
  flip?: boolean;
}

/** A resolved point on a limb: position, unit cross normal, half-width, arc t. */
export interface LimbSample {
  x: number;
  y: number;
  /** Unit normal across the limb, pointing LATERALLY (after `flip`). */
  nx: number;
  ny: number;
  w: number;
  t: number;
}

/** A dermatome band as a rectangle in (t, c) space. */
export interface BandRect {
  /** [t0, t1] along the limb, 0..1. */
  t: [number, number];
  /** [c0, c1] across the limb, -1..1. */
  c: [number, number];
  /**
   * Tilt of the band's TRANSVERSE boundaries, in t. The lateral edge is shifted
   * distally by `skew` and the medial edge proximally by the same amount, turning
   * the rectangle into a parallelogram.
   *
   * Not decoration: a real dermatome boundary crosses a limb obliquely, and a
   * plate drawn with perfectly level boundaries reads as a stack of bars -- which
   * is precisely how the figure this replaced looked. A boundary that sits ON the
   * end of the limb (t 0 or 1) is never tilted, or the tilt would open an
   * unpainted wedge at the shoulder or the fingertips.
   */
  skew?: number;
}

// How far past c = +/-1 a band edge is pushed, as a multiple of the half-width.
// The clip does the trimming, so this only has to be comfortably more than 1.
const EDGE_OVERSHOOT = 1.6;

// How far past t = 0 / t = 1 a band is extended, in figure units, so it covers
// the limb's rounded cap instead of stopping short of the fingertips.
//
// The two ends need different amounts. The DISTAL cap is free -- past the
// fingertips there is nothing to spill onto. The PROXIMAL one is not: a limb's
// root is buried in the torso, and the body clip includes the torso, so an
// over-generous root extension paints the trapezius or the groin with a limb
// dermatome. Small enough to cover the deltoid cap, not the shoulder girdle.
const CAP_OVERSHOOT_DISTAL = 9;
const CAP_OVERSHOOT_PROXIMAL = 4;

// Samples generated per authored node interval. The limb is short (a few dozen
// figure units per interval), so 10 puts a vertex every ~2.5 units: past the
// point where a straight segment is visible at any size this plate is drawn at.
const SAMPLES_PER_INTERVAL = 10;

/** Round to 0.01 so the emitted path strings stay short and diffable. */
function r(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/**
 * Resample a limb into a dense polyline carrying a normal, a half-width and a
 * normalised arc position at every vertex.
 *
 * The normal comes from a CENTRAL difference over the sampled polyline, not from
 * the authored node it happens to sit on: at a joint the incoming and outgoing
 * directions differ (the elbow bends the arm outward), and taking one side's
 * tangent there would kink every band edge that crosses the joint.
 */
export function sampleLimb(axis: LimbAxis): LimbSample[] {
  const n = axis.nodes.length;
  if (n < 2) throw new Error(`Limb "${axis.id}" needs at least 2 nodes`);

  // 1. Densify by linear interpolation between authored nodes.
  const pts: AxisNode[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = axis.nodes[i];
    const b = axis.nodes[i + 1];
    for (let s = 0; s < SAMPLES_PER_INTERVAL; s++) {
      const u = s / SAMPLES_PER_INTERVAL;
      pts.push({
        x: a.x + (b.x - a.x) * u,
        y: a.y + (b.y - a.y) * u,
        w: a.w + (b.w - a.w) * u,
      });
    }
  }
  pts.push(axis.nodes[n - 1]);

  // 2. Cumulative arc length -> t.
  const len: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    len.push(len[i - 1] + Math.hypot(dx, dy));
  }
  const total = len[len.length - 1] || 1;

  // 3. Central-difference tangent -> laterally pointing normal.
  const sign = axis.flip ? -1 : 1;
  return pts.map((p, i) => {
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const m = Math.hypot(tx, ty) || 1;
    tx /= m;
    ty /= m;
    // Rotate the tangent by -90deg. In SVG space (y down) this points to the
    // side the limb was authored on, which is why a mirrored limb sets `flip`.
    return {
      x: p.x,
      y: p.y,
      nx: ty * sign,
      ny: -tx * sign,
      w: p.w,
      t: len[i] / total,
    };
  });
}

/** Mirror a limb about the figure's midline, keeping `c = +1` lateral. */
export function mirrorLimb(axis: LimbAxis, midX: number, id: string): LimbAxis {
  return {
    id,
    nodes: axis.nodes.map((p) => ({ x: 2 * midX - p.x, y: p.y, w: p.w })),
    flip: !axis.flip,
  };
}

/** Offset a sample across the limb by `c` (in -1..1), returning [x, y]. */
function offset(s: LimbSample, c: number): [number, number] {
  return [s.x + s.nx * s.w * c, s.y + s.ny * s.w * c];
}

/**
 * Resolve a (t, c) address to a point in figure space. Used for the ASIA key
 * point pins, so a pin is pinned to the same geometry as the band under it and
 * cannot drift off the finger it names.
 */
export function pointAt(samples: LimbSample[], t: number, c: number): [number, number] {
  return offset(sampleAtT(samples, t), c);
}

/** Linear interpolation of a sample at an arbitrary t (clamped to the limb). */
function sampleAtT(samples: LimbSample[], t: number): LimbSample {
  const tt = Math.min(1, Math.max(0, t));
  let i = 1;
  while (i < samples.length - 1 && samples[i].t < tt) i++;
  const a = samples[i - 1];
  const b = samples[i];
  const span = b.t - a.t;
  const u = span > 1e-6 ? (tt - a.t) / span : 0;
  return {
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    nx: a.nx + (b.nx - a.nx) * u,
    ny: a.ny + (b.ny - a.ny) * u,
    w: a.w + (b.w - a.w) * u,
    t: tt,
  };
}

/**
 * The limb's silhouette, as a closed smoothed path.
 *
 * Walks the lateral edge distally, rounds the tip, walks the medial edge back.
 * The tip is rounded by pushing one extra vertex past the last sample along the
 * limb's own direction: the Catmull-Rom pass then turns that single point into a
 * fingertip instead of a chopped-off square end.
 */
export function limbOutline(axis: LimbAxis): string {
  const s = sampleLimb(axis);
  const last = s[s.length - 1];
  const first = s[0];
  // Limb direction at each end (perpendicular to the cross normal).
  const tipDir: [number, number] = [-last.ny, last.nx];
  const rootDir: [number, number] = [first.ny, -first.nx];
  const flip = axis.flip ? -1 : 1;

  const loop: [number, number][] = [];
  for (const p of s) loop.push(offset(p, 1));
  loop.push([
    last.x + tipDir[0] * last.w * 0.95 * flip,
    last.y + tipDir[1] * last.w * 0.95 * flip,
  ]);
  for (let i = s.length - 1; i >= 0; i--) loop.push(offset(s[i], -1));
  // The proximal end is buried in the torso, so it only needs to not be hollow.
  loop.push([
    first.x + rootDir[0] * first.w * 0.5 * flip,
    first.y + rootDir[1] * first.w * 0.5 * flip,
  ]);

  return smoothClosedPath(loop);
}

/**
 * One dermatome band, as a closed polyline clipped by the caller to the body.
 *
 * Deliberately unsmoothed -- see the header note: rounded corners would open a
 * gap between two bands at the level they share.
 */
export function bandPath(axis: LimbAxis, rect: BandRect): string {
  const s = sampleLimb(axis);
  const [t0, t1] = rect.t;
  const [c0, c1] = rect.c;
  const skew = rect.skew ?? 0;
  // Push edges that sit ON the silhouette past it, so the clip supplies the edge.
  const outer = c1 >= 1 ? EDGE_OVERSHOOT : c1;
  const inner = c0 <= -1 ? -EDGE_OVERSHOOT : c0;

  // A boundary that IS the end of the limb stays put; only interior boundaries
  // tilt (see BandRect.skew).
  const shift = (t: number, by: number) => (t <= 0 || t >= 1 ? t : t + by);
  const lat: [number, number] = [shift(t0, skew), shift(t1, skew)];
  const med: [number, number] = [shift(t0, -skew), shift(t1, -skew)];

  // Each long edge walks its own t range, bracketed by exact interpolated ends so
  // that a boundary shared by two bands is the same line for both.
  const edge = (range: [number, number], c: number): [number, number][] => {
    const mid = s.filter((p) => p.t > range[0] && p.t < range[1]);
    const span = [sampleAtT(s, range[0]), ...mid, sampleAtT(s, range[1])];
    return span.map((p) => offset(p, c));
  };

  const lateral = edge(lat, outer);
  const medial = edge(med, inner);
  const pts: [number, number][] = [...lateral, ...medial.reverse()];

  // Extend past the limb's own ends so the band covers the rounded cap.
  if (t1 >= 1) {
    extendAt(pts, sampleAtT(s, 1), lateral.length - 1, CAP_OVERSHOOT_DISTAL, axis, 1);
    extendAt(pts, sampleAtT(s, 1), lateral.length, CAP_OVERSHOOT_DISTAL, axis, 1);
  }
  if (t0 <= 0) {
    extendAt(pts, sampleAtT(s, 0), 0, CAP_OVERSHOOT_PROXIMAL, axis, -1);
    extendAt(pts, sampleAtT(s, 0), pts.length - 1, CAP_OVERSHOOT_PROXIMAL, axis, -1);
  }

  return polygonPath(pts);
}

/**
 * Slide one corner of a band along the limb's own direction, so a band that runs
 * to an end of the limb covers its rounded cap. `dir` is +1 distal, -1 proximal.
 */
function extendAt(
  pts: [number, number][],
  end: LimbSample,
  idx: number,
  by: number,
  axis: LimbAxis,
  dir: 1 | -1,
): void {
  if (idx < 0 || idx >= pts.length) return;
  const flip = axis.flip ? -1 : 1;
  pts[idx][0] += -end.ny * flip * by * dir;
  pts[idx][1] += end.nx * flip * by * dir;
}

/** A closed straight-edged polygon. */
function polygonPath(pts: [number, number][]): string {
  if (pts.length === 0) return '';
  const head = `M${r(pts[0][0])},${r(pts[0][1])}`;
  const rest = pts.slice(1).map((p) => `L${r(p[0])},${r(p[1])}`);
  return `${head}${rest.join('')}Z`;
}

/**
 * Horizontal extent of a path, from its coordinates (control points included, so
 * it is a slight overestimate -- the safe direction when it is used to place a
 * shading gradient across a shape).
 *
 * Every path this module and the plate data emit writes coordinates as x,y pairs
 * (M, L and C only), which is what makes the pairing below valid.
 */
export function pathXBounds(d: string): [number, number] {
  const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    if (nums[i] < lo) lo = nums[i];
    if (nums[i] > hi) hi = nums[i];
  }
  return [lo, hi];
}

/**
 * A closed path through `pts` with no corners, via Catmull-Rom converted to
 * cubic Beziers (tension 1/6, the standard uniform form). Used for silhouettes,
 * where the whole point is that the body has no straight edges.
 */
export function smoothClosedPath(pts: [number, number][]): string {
  const n = pts.length;
  if (n < 3) return polygonPath(pts);
  const at = (i: number) => pts[((i % n) + n) % n];
  let d = `M${r(pts[0][0])},${r(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${r(c1x)},${r(c1y)} ${r(c2x)},${r(c2y)} ${r(p2[0])},${r(p2[1])}`;
  }
  return `${d}Z`;
}
