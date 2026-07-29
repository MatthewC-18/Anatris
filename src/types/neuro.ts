// src/types/neuro.ts
//
// Data model for the NEURO layer of the movement lab: dermatomes, myotomes and
// deep tendon reflexes organised by SPINAL NERVE ROOT. This is the segmental
// reasoning most apps skip — tying a skin territory, a key movement and a reflex
// to one root, and (where the rig allows) DEMONSTRATING the myotome as a real
// resisted movement on the 3D model.
//
// ENCODING (as the rest of the data layer): user-facing strings in Latin
// American Spanish with accents; ids/keys ASCII kebab/UPPER. House style: no
// em-dashes or hyphen-joined word pairs in visible Spanish (middot "·" is fine).
//
// HONESTY: dermatome maps and reflex roots vary between sources (Keegan vs.
// ASIA). Every root carries citations with `verified: false` until checked
// against the primary source, mirroring the orthopedic-tests convention.

import type { StudyCitation } from './orthopedicTest';

/** Skin territory of a single root: what to test and the memorable landmark. */
export interface Dermatome {
  /** Plain-language territory, Spanish (e.g. "Cara lateral del brazo"). */
  area: string;
  /** The single key point tested (ASIA key point), Spanish. */
  keyPoint: string;
}

/** Myotome: the key movement a root drives, and how to grade it. */
export interface Myotome {
  /** Key movement, Spanish (e.g. "Abducción del hombro"). */
  action: string;
  /** Muscles chiefly responsible, Spanish. */
  muscles: string;
}

/** A deep tendon reflex tied to a root (not every root has one). */
export interface Reflex {
  /** Reflex name, Spanish (e.g. "Bicipital"). */
  name: string;
  /** How to elicit it, Spanish. */
  elicitation: string;
}

/**
 * How to reproduce the myotome's resisted movement on the 3D rig. Same shape as
 * the orthopedic tests' TestDemo: a drivable movementId + target angle + side.
 * Roots whose key movement the rig cannot reproduce (wrist, hand, foot) omit
 * this and set `demoNote` instead.
 */
export interface MyotomeDemo {
  movementId: string;
  angleDeg: number;
  side?: 'R' | 'L';
  highlightMuscleId?: string;
  /** What the rig approximation leaves out (shown as a caveat). */
  note?: string;
}

export interface NerveRoot {
  /** Root id, e.g. "C5", "L4". Stable, ASCII. */
  id: string;
  /** Display label, Spanish (usually same as id). */
  label: string;
  dermatome: Dermatome;
  myotome: Myotome;
  /** Deep tendon reflex, when the root has a testable one. */
  reflex?: Reflex;
  /** Rig demo of the myotome (optional). */
  demo?: MyotomeDemo;
  /** Why the rig cannot demo this myotome (when `demo` is absent). */
  demoNote?: string;
  /** Optional teaching pearl (red flags, overlap, confounders). */
  pearl?: string;
  /** Supporting citations (verified=false until checked). */
  cite: StudyCitation[];
}

/** A named group of roots for one body area (cervical/upper vs lumbosacral). */
export interface NeuroSegmentSet {
  /** Set id, e.g. "cervical". */
  id: string;
  /** Title shown in the panel, Spanish. */
  title: string;
  /** One-line scope, Spanish. */
  subtitle: string;
  /** Which body figure the dermatome map should draw. */
  figure: 'upper-limb' | 'lower-limb';
  roots: NerveRoot[];
}

/** region id -> neuro set. */
export type NeuroIndex = Record<string, NeuroSegmentSet>;
