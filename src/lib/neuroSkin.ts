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
  /**
   * How wide the patch is across the body, in world units.
   *
   * This is what separates a patch that is HALF of a region from one that is
   * nearly all of it, and the rig is full of the latter: one shell of "Anterior
   * region of forearm" spans 68% of the whole region's width. Without this, a
   * window that means "the lateral half" quietly swallowed the entire forearm and
   * the 3D map taught a boundary that does not exist.
   */
  span?: number;
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
  /**
   * The patch's width as a fraction of its whole region's width, 0..1.
   *
   * 1 means this single shell IS the region, so it cannot honestly be called its
   * lateral or medial half. Used to decide how CONFIDENTLY a territory is drawn
   * (see confidenceFor), not whether it is drawn at all: dropping these patches
   * would empty half the limb, and drawing them at full strength taught a wrong
   * edge. A wash says "this region, broadly", which is the truth.
   */
  spread: number;
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
    // The region's true width: the outermost EDGES, not the outermost centres. A
    // single shell can be wider than the spread of every centre in its group.
    const spans = g.map((p) => p.span ?? 0);
    const regionWidth = Math.max(xHi - xLo + Math.max(...spans), 1e-6);
    g.forEach((p, i) => {
      out.push({
        ref: p.ref,
        region: p.region,
        side: p.side,
        lateral: xHi - xLo > 1e-4 ? (xs[i] - xLo) / (xHi - xLo) : 0.5,
        level: yHi - yLo > 1e-4 ? (ys[i] - yLo) / (yHi - yLo) : 0.5,
        spread: Math.min(1, spans[i] / regionWidth),
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

/**
 * How much of a region a single shell may cover and still be called a part of it.
 *
 * Measured, not guessed: on the shipped rig the genuine halves come in at 0.15 to
 * 0.45 of their region's width, while the offenders -- the shells that made C6 and
 * C8 each look like the whole forearm -- sit at 0.54 and 0.68.
 */
const PART_OF_REGION = 0.5;

/**
 * How confidently a territory can be drawn on this patch.
 *
 * 'sure' when the rig is genuinely precise here, OR when the rule is a LANDMARK the
 * student has to be able to see whatever the geometry can manage. Precise means
 * either the rule takes a whole NAMED region ("Medial malleolus", "Heel region",
 * "Radial foveola" -- the name IS the precision, and several of these are the ASIA
 * key points themselves), or the patch is small enough to really be the half the
 * window asks for.
 *
 * 'broad' otherwise: a shell covering most of its region, claimed by a window that
 * wanted half of it. Still drawn, because leaving it out empties the limb -- but
 * drawn as a wash, so the eye reads "this region, broadly" instead of a boundary
 * the geometry cannot support.
 */
export type PatchConfidence = 'sure' | 'broad';

export function confidenceFor(
  patch: Pick<ResolvedPatch, 'spread'>,
  rule: SkinRule,
): PatchConfidence {
  if (rule.landmark) return 'sure';
  const windowed = Boolean(rule.lateral || rule.level);
  if (!windowed) return 'sure';
  return patch.spread <= PART_OF_REGION ? 'sure' : 'broad';
}

/** The patches a root owns, with how confidently each one can be drawn. */
export function ownedPatches<T>(
  patches: ResolvedPatch<T>[],
  figure: PlateFigure,
  root: string,
): { patch: ResolvedPatch<T>; confidence: PatchConfidence }[] {
  const rules = SKIN_BY_ROOT[figure]?.[root];
  if (!rules) return [];
  const out: { patch: ResolvedPatch<T>; confidence: PatchConfidence }[] = [];
  for (const patch of patches) {
    const hit = rules.find((r) => matchesRule(patch, r));
    if (!hit) continue;
    out.push({ patch, confidence: confidenceFor(patch, hit) });
  }
  return out;
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
