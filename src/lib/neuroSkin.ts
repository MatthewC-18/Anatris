// src/lib/neuroSkin.ts
//
// Resolving the rig's SKIN PATCHES to nerve roots. Pure functions, no three.js and
// no React, so the mapping can be proved against a snapshot of the real rig in a
// unit test instead of being trusted.
//
// The rig gives us, per patch, an anatomical region name and a position. What the
// mapping in src/data/neuro/skinRegions.ts is written against is not a position but
// a PAIR OF FRACTIONS -- how lateral this patch is within its region, and how
// proximal -- because that is how a dermatome is described ("the lateral half of the
// forearm") and because fractions survive a re-exported rig with a different patch
// count. Turning positions into those fractions is what this module does.
//
// See NeuroSkinLayer.tsx for how it is applied to the scene, and skinRegions.ts for
// the mapping itself and where its vocabulary came from.

import { SKIN_BY_ROOT, canonicalRegion, type SkinRule } from '../data/neuro/skinRegions';
import type { PlateFigure } from '../data/neuro/plate';

/** One skin patch as read off the rig. */
export interface PatchInput {
  /** Mesh name, canonical or not: `resolvePatches` canonicalises it. */
  name: string;
  /** World x at rest. Only its SIGN and MAGNITUDE are used (see below). */
  x: number;
  /** World y at rest. Up is proximal on both limbs of a standing body. */
  y: number;
}

/** A patch with its position turned into the fractions the mapping speaks. */
export interface ResolvedPatch<T = unknown> {
  ref: T;
  region: string;
  /** Which side of the body, from the SIGN of x. Laterality here is geometric:
   *  the rig names patches ".l", ".r", ".001" and unsuffixed, inconsistently, and
   *  "Palm.r" sits at negative x. */
  side: 1 | -1;
  /** 0 = most medial patch of its region+side group, 1 = most lateral. */
  lateral: number;
  /** 0 = most distal patch of its group, 1 = most proximal. */
  level: number;
}

/**
 * Group patches by region and side, then place each one within its group.
 *
 * Grouped by region AND SIDE: measuring a left forearm's patches against a range
 * that also contains the right forearm would collapse every fraction toward the
 * middle, and no window would ever separate anything.
 *
 * A group with no spread on an axis sits at 0.5 on it. That is the single-patch
 * region case ("Dorsum of hand"), and it is why a rule meant to take a whole region
 * must simply omit the window rather than write [0, 1].
 */
export function resolvePatches<T>(
  patches: (PatchInput & { ref: T })[],
): ResolvedPatch<T>[] {
  const groups = new Map<string, (PatchInput & { ref: T; region: string; side: 1 | -1 })[]>();
  for (const p of patches) {
    const region = canonicalRegion(p.name);
    const side: 1 | -1 = p.x >= 0 ? 1 : -1;
    const key = `${region}|${side}`;
    const entry = { ...p, region, side };
    const g = groups.get(key);
    if (g) g.push(entry);
    else groups.set(key, [entry]);
  }

  const out: ResolvedPatch<T>[] = [];
  for (const g of groups.values()) {
    // Distance from the midline IS lateralness on a body in anatomical position.
    // The shipped rig confirms it end to end: the thumb ("Radial foveola") sits at
    // x 0.299 with the palm's outer edge at 0.308.
    const xs = g.map((p) => Math.abs(p.x));
    const ys = g.map((p) => p.y);
    const xLo = Math.min(...xs);
    const xHi = Math.max(...xs);
    const yLo = Math.min(...ys);
    const yHi = Math.max(...ys);
    g.forEach((p, i) => {
      out.push({
        ref: p.ref,
        region: p.region,
        side: p.side,
        lateral: xHi - xLo > 1e-4 ? (xs[i] - xLo) / (xHi - xLo) : 0.5,
        level: yHi - yLo > 1e-4 ? (ys[i] - yLo) / (yHi - yLo) : 0.5,
      });
    });
  }
  return out;
}

/**
 * Is `value` inside the window?
 *
 * HALF-OPEN at the top -- [lo, hi) -- unless hi is 1, which is inclusive so the far
 * end of a region is never orphaned. That is what lets two roots tile one region
 * with neither a gap nor a double claim: C5 takes [0.5, 1] of the arm and T1 takes
 * [0, 0.5], and a patch landing exactly on 0.5 goes to the UPPER window -- C5 --
 * alone. With closed windows it would match both and the winner would come down to
 * iteration order.
 */
export function inWindow(value: number, [lo, hi]: [number, number]): boolean {
  if (value < lo) return false;
  return hi >= 1 ? value <= hi : value < hi;
}

/** Does this patch fall inside the rule? */
export function matchesRule(
  patch: Pick<ResolvedPatch, 'region' | 'lateral' | 'level'>,
  rule: SkinRule,
): boolean {
  if (patch.region !== rule.region) return false;
  if (rule.lateral && !inWindow(patch.lateral, rule.lateral)) return false;
  if (rule.level && !inWindow(patch.level, rule.level)) return false;
  return true;
}

/** The patches a root owns, on both sides of the body. */
export function patchesForRoot<T>(
  patches: ResolvedPatch<T>[],
  figure: PlateFigure,
  root: string,
): ResolvedPatch<T>[] {
  const rules = SKIN_BY_ROOT[figure]?.[root];
  if (!rules) return [];
  return patches.filter((p) => rules.some((r) => matchesRule(p, r)));
}

/**
 * Which root claims this patch, or null. Used by the coverage tests rather than by
 * the renderer, which walks root by root so a root's own patches stay grouped.
 */
export function rootForPatch(
  patch: Pick<ResolvedPatch, 'region' | 'lateral' | 'level'>,
  figure: PlateFigure,
): string | null {
  const byRoot = SKIN_BY_ROOT[figure];
  for (const root of Object.keys(byRoot)) {
    if (byRoot[root].some((r) => matchesRule(patch, r))) return root;
  }
  return null;
}

/** Every root claiming this patch. More than one is an authoring bug. */
export function rootsForPatch(
  patch: Pick<ResolvedPatch, 'region' | 'lateral' | 'level'>,
  figure: PlateFigure,
): string[] {
  const byRoot = SKIN_BY_ROOT[figure];
  return Object.keys(byRoot).filter((root) =>
    byRoot[root].some((r) => matchesRule(patch, r)),
  );
}
