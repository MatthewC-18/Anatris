// src/lib/muscleBand.ts
//
// Pure geometry helpers for the 3D muscle-band proxies used in the movement
// lab. Instead of deforming the (unrigged) detailed muscle mesh, we draw a tube
// from the muscle's ORIGIN (fixed on the scapula) to its INSERTION (which
// travels with the rotating humerus). As the joint moves, the band shortens and
// thickens — a volume-preserving cue that the muscle is contracting.

import * as THREE from 'three';

/**
 * Rotate a point about an arbitrary axis through a pivot. Used to place a
 * muscle's humeral insertion where it ends up after the arm abducts by
 * `angleRad`, reusing the rig's exact pivot + axis.
 */
export function rotateAboutPivot(
  point: THREE.Vector3,
  pivot: THREE.Vector3,
  axis: THREE.Vector3,
  angleRad: number,
): THREE.Vector3 {
  const q = new THREE.Quaternion().setFromAxisAngle(axis, angleRad);
  return point.clone().sub(pivot).applyQuaternion(q).add(pivot);
}

/**
 * Tube radius for a contracting muscle, approximately preserving volume: a
 * cylinder of fixed volume has radius proportional to 1/sqrt(length), so as the
 * band shortens it thickens. Clamped to keep it readable (never a needle, never
 * a balloon).
 */
export function bandRadius(
  restLength: number,
  currentLength: number,
  base: number,
  min: number,
  max: number,
): number {
  if (currentLength <= 1e-6) return max;
  const r = base * Math.sqrt(restLength / currentLength);
  return THREE.MathUtils.clamp(r, min, max);
}

/**
 * A gentle outward bulge offset for the band's midpoint, growing as the muscle
 * shortens so a contracted muscle looks fuller. `dir` should be a unit vector
 * pointing away from the joint center.
 */
export function bulgeOffset(
  restLength: number,
  currentLength: number,
  dir: THREE.Vector3,
  baseBulge: number,
  gain: number,
): THREE.Vector3 {
  const shortened = Math.max(0, restLength - currentLength);
  return dir.clone().multiplyScalar(baseBulge + shortened * gain);
}
