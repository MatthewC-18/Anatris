// src/lib/biomech/scapulaWrap.ts
//
// SCAPULOTHORACIC WRAP.
//
// The scapula does not just upwardly rotate during elevation -- it also tilts
// posteriorly and rotates externally, and those two are what keep the blade
// WRAPPED on a curved ribcage. The rig drives upward rotation alone, so without
// help the blade swings off the thorax like a flat plate on a hinge: measured on
// the shipped GLB, the inferior angle ended up 8.6 cm clear of the ribs at 140
// deg, standing 5 cm proud of the muscle over it. That is the bone a user
// reported coming out of the back. No pivot fixes it -- a rigid body turning
// about ONE axis cannot follow a curved surface, which an offline pivot search
// confirmed (best case still 9.9 cm).
//
// So the runtime drives the two companion rotations too. The values below are
// SOLVED, not guessed, by scripts/solve-scapula-wrap.mts: it poses the REAL
// girdle chain at each clinical angle and searches the local-Y and local-Z
// rotations that best preserve every scapular vertex's rest distance to the
// ribcage, penalising drifting off it AND sinking into it.
//
// RE-SOLVED when the clavicle was given its share of the movement. The previous
// table came from scripts/solve-scapula-tilt.mts, which rotated the scapula BONE
// alone -- correct while the clavicle was welded to the spine, wrong once the
// blade started arriving at a given upward rotation already carried up and
// medially by its clavicle. Against the current chain the old table let the blade
// drift up to 5.1 cm; this one holds it to 2.2 cm across the whole arc, and
// 1.4 cm at 180.
//
//   ángulo   rot.asc.   peor SIN acompañantes   peor CON esta tabla
//      90      23.4              3.7 cm                1.4 cm
//     120      39.0              6.2 cm                2.0 cm
//     150      52.2              9.5 cm                2.2 cm
//     180      60.6             13.2 cm                1.4 cm
//
// Table is [upwardRotationDeg, localY, localZ], linearly interpolated. It is keyed
// on SCAPULOTHORACIC upward rotation (the blade against the thorax), not on the
// acromioclavicular share the scapula bone itself receives.
//
// Lives here rather than inside RigModel so the component and the offline harness
// share ONE table and cannot drift apart.

export type WrapSide = 'R' | 'L';

const SCAPULA_WRAP: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [3.6, 0, -1.9],
  [13.5, 5.3, -6.3],
  [23.4, 15.9, -16.3],
  [39.0, 25.3, -24.7],
  [52.2, 33.4, -31.9],
  [60.6, 31.6, -37.8],
];

/** Mirrored armatures: the companion axes flip on the left (see the apply site). */
export const SCAPULA_WRAP_SIGN: Record<WrapSide, 1 | -1> = { R: 1, L: -1 };

/** Companion [localY, localZ] rotations in DEGREES for a given upward rotation. */
export function scapulaWrap(upDeg: number): [number, number] {
  const u = Math.abs(upDeg);
  const last = SCAPULA_WRAP[SCAPULA_WRAP.length - 1];
  if (u >= last[0]) return [last[1], last[2]];
  for (let i = 1; i < SCAPULA_WRAP.length; i++) {
    const [u1, y1, z1] = SCAPULA_WRAP[i];
    if (u > u1) continue;
    const [u0, y0, z0] = SCAPULA_WRAP[i - 1];
    const t = u1 - u0 <= 1e-6 ? 0 : (u - u0) / (u1 - u0);
    return [y0 + (y1 - y0) * t, z0 + (z1 - z0) * t];
  }
  return [0, 0];
}
