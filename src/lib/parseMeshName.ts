// src/lib/parseMeshName.ts
//
// Decodes a flattened Z-Anatomy runtime mesh name into structured anatomical
// data. When the GLB is loaded through Three.js, every node name is sanitized:
// dots are stripped and spaces become underscores. The original Z-Anatomy
// suffixes therefore collapse onto the end of the name, e.g.
//
//   "Supraspinatus muscle.o.l"   ->   "Supraspinatus_muscleol"
//
// The suffixes still carry their full meaning, just glued on:
//
//   trailing  l / r        side (.l / .r)        -> left / right
//   before it o / e        part (.o / .e)        -> origin / insertion ("end")
//   a digit after o/e      part index (.o1, .e7) -> multiple origins/insertions
//   trailing  _1           the muscle's tendon mesh (separate material)
//   trailing  _instance_N  duplicated instance (rare; kept for reference)
//
// A mesh with no o/e marker is the muscle BELLY (the contractile body).
//
// This parser is pure and side-effect free; it's validated against the real
// shoulder mesh names extracted from the model.

/** Which functional part of a muscle a mesh represents. */
export type MusclePart = 'belly' | 'origin' | 'insertion' | 'tendon';

/** Laterality decoded from the trailing l/r suffix. */
export type ParsedSide = 'left' | 'right' | 'center';

export interface ParsedMeshName {
  /** The raw original mesh name, unchanged. */
  raw: string;
  /**
   * The base name with all trailing technical suffixes removed. This is the
   * stable key that ties a muscle's belly, origins, insertions and tendon
   * together. Example: "Supraspinatus_muscle".
   */
  base: string;
  /** Which part of the muscle this mesh is. */
  part: MusclePart;
  /** For muscles with multiple origins/insertions (serratus, pectoralis). */
  partIndex: number | null;
  /** Decoded laterality. */
  side: ParsedSide;
  /** Instance number from _instance_N, if present (usually null). */
  instance: number | null;
}

// A name only carries an o/e *part* marker if what precedes it looks like the
// tail of an anatomical term. This guards against stripping a real trailing
// "e"/"o" that is part of a word (e.g. a name genuinely ending in "...ae").
// The observed muscle bases end in one of these tokens right before the marker.
const PART_PREDECESSOR_RE =
  /(muscle|brachii|scapulae|hyoid|minimi|hallucis|\))$/i;

/**
 * Parse a flattened runtime mesh name into structured parts.
 *
 * The order of operations matters and mirrors how the suffixes were glued on
 * (innermost last): instance -> side -> part -> tendon.
 */
export function parseMeshName(name: string): ParsedMeshName {
  let s = name;
  let instance: number | null = null;
  let part: MusclePart = 'belly';
  let partIndex: number | null = null;
  let side: ParsedSide = 'center';

  // 1. Instance suffix: "_instance_3"
  const instMatch = s.match(/_instance_(\d+)$/);
  if (instMatch) {
    instance = Number(instMatch[1]);
    s = s.slice(0, instMatch.index);
  }

  // 2. Tendon suffix: a bare "_1" on an otherwise belly-like name. In the
  //    model, "<Muscle>" is the belly and "<Muscle>_1" is its tendon, sharing
  //    the Tendon material. We fold the tendon onto the same base so it groups
  //    with its muscle, but tag the part as 'tendon'.
  const tendonMatch = s.match(/_(\d+)$/);
  let tendonPending = false;
  if (tendonMatch) {
    // Only treat as tendon if removing it leaves a plausible muscle base.
    const candidate = s.slice(0, tendonMatch.index);
    if (/muscle$|brachii$|scapulae$|hyoid$|\)$/i.test(candidate)) {
      tendonPending = true;
      s = candidate;
    }
  }

  // 3. Side: trailing l / r (from .l / .r). Require an alphanumeric before it
  //    so we don't strip the "l" of a word that legitimately ends in l.
  if (/[a-z0-9]l$/i.test(s)) {
    side = 'left';
    s = s.slice(0, -1);
  } else if (/[a-z0-9]r$/i.test(s)) {
    side = 'right';
    s = s.slice(0, -1);
  }

  // 4. Part: o / e (+ optional index) before the side, only if the preceding
  //    text looks like a muscle term tail.
  const partMatch = s.match(/(e|o)(\d*)$/i);
  if (partMatch && PART_PREDECESSOR_RE.test(s.slice(0, partMatch.index))) {
    part = partMatch[1].toLowerCase() === 'e' ? 'insertion' : 'origin';
    partIndex = partMatch[2] ? Number(partMatch[2]) : null;
    s = s.slice(0, partMatch.index);
  }

  // Tendon marker wins over belly (a "_1" mesh is the tendon, not the belly),
  // but a mesh that is explicitly an origin/insertion keeps that part.
  if (tendonPending && part === 'belly') {
    part = 'tendon';
  }

  return { raw: name, base: s, part, partIndex, side, instance };
}

/**
 * Convenience: does this parsed mesh belong to the muscle identified by the
 * given base name? Matching is case-insensitive and exact on the base.
 */
export function isPartOfBase(parsed: ParsedMeshName, base: string): boolean {
  return parsed.base.toLowerCase() === base.toLowerCase();
}
