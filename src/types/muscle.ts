// src/types/muscle.ts
//
// Clinical data model for an individual muscle. This is the bridge between the
// 3D model (which only knows mesh names + materials) and the physiotherapy
// content (Latin nomenclature, attachments, innervation, biomechanics).
//
// Design notes
// ------------
// - A Muscle is identified by a stable `id` (e.g. "supraspinatus"), NOT by a
//   mesh name, because mesh names are duplicated across sides and split into
//   belly/origin/insertion pieces.
// - `meshBases` lists the parseMeshName() base name(s) that belong to this
//   muscle. The viewer resolves the actual meshes (both sides, all parts) by
//   matching each mesh's parsed base against this list. One clinical muscle can
//   span several bases when Z-Anatomy models it in parts (e.g. the deltoid has
//   clavicular / acromial / scapular-spinal parts).
// - All human-facing prose is Spanish (Hispanic American); anatomical terms keep
//   their Latin/standard form by convention.
//
// IMPORTANT: the clinical fields (origin, insertion, innervation, actions) are
// drafted from standard anatomy and MUST be verified against an authoritative
// source before publishing. They are starting points, not final copy.

import type { AnatomyLayer } from './anatomy';

/**
 * Functional movement groups used to organize muscles by action. A muscle can
 * belong to several (e.g. the deltoid abducts but its parts also flex/extend).
 * These mirror the action-named materials Z-Anatomy ships.
 */
export type FunctionalGroup =
  | 'rotator-cuff'
  | 'abductor'
  | 'adductor'
  | 'flexor'
  | 'extensor'
  | 'internal-rotator'
  | 'external-rotator'
  | 'elevator'
  | 'depressor'
  | 'protractor'
  | 'retractor';

/** Spanish display labels for the functional groups. */
export const FUNCTIONAL_GROUP_LABEL: Record<FunctionalGroup, string> = {
  'rotator-cuff': 'Manguito rotador',
  abductor: 'Abductores',
  adductor: 'Aductores',
  flexor: 'Flexores',
  extensor: 'Extensores',
  'internal-rotator': 'Rotadores internos',
  'external-rotator': 'Rotadores externos',
  elevator: 'Elevadores',
  depressor: 'Depresores',
  protractor: 'Protractores (abducción escapular)',
  retractor: 'Retractores (aducción escapular)',
};

/**
 * A single muscle action, expressed at a named joint. Kept structured (not free
 * text) so the app can later filter "show me everything that abducts the
 * glenohumeral joint".
 */
export interface MuscleAction {
  /** The joint where the action occurs, in Spanish (e.g. "Glenohumeral"). */
  joint: string;
  /** The movement produced, in Spanish (e.g. "Abducción"). */
  movement: string;
  /** Optional clinical nuance (range, synergy, when it's prime mover, etc.). */
  note?: string;
}

/**
 * Complete clinical record for one muscle, anchored to the 3D model via
 * `meshBases`.
 */
export interface Muscle {
  /** Stable slug id, lowercase kebab-case. Primary key. */
  id: string;

  /** Spanish common name (e.g. "Supraespinoso"). */
  name: string;
  /** Latin / Terminologia Anatomica name (e.g. "Musculus supraspinatus"). */
  latin: string;

  /**
   * parseMeshName() base names that belong to this muscle. The viewer matches
   * meshes (any side, any part) whose parsed base equals one of these.
   */
  meshBases: string[];

  /** Layer this muscle lives in (almost always 'muscles'). */
  layer: Extract<AnatomyLayer, 'muscles'>;

  /** Functional groups this muscle participates in. */
  groups: FunctionalGroup[];
/**
   * Anatomical depth, used to "isolate" a muscle in 3D: 1 = most superficial,
   * higher = deeper. When a muscle is selected, muscles with a SMALLER depth
   * (more superficial, i.e. physically in front of it) are turned into a
   * translucent ghost so you can see through them to the selected structure.
   * Camera-independent, unlike a geometric occlusion test.
   * Optional so muscles in other regions don't break until they're assigned.
   */
  depth?: number;
  /* ---- Clinical attachments (VERIFY before publishing) ---- */
  /** Proximal/origin attachment, Spanish prose. */
  origin: string;
  /** Distal/insertion attachment, Spanish prose. */
  insertion: string;

  /* ---- Innervation (VERIFY before publishing) ---- */
  /** Nerve name in Spanish (e.g. "Nervio supraescapular"). */
  innervation: string;
  /** Spinal nerve roots (e.g. ["C5", "C6"]). */
  roots: string[];

  /* ---- Biomechanics ---- */
  /** Structured list of actions at named joints. */
  actions: MuscleAction[];

  /* ---- Physiotherapy relevance (optional, VERIFY before publishing) ---- */
  /** Short clinical note: common pathology, palpation, testing, etc. */
  clinicalNote?: string;
}

/** A named region groups the muscles (and later, other structures) of a topic. */
export interface MuscleRegion {
  /** Region id (e.g. "shoulder"). */
  id: string;
  /** Spanish display name (e.g. "Hombro"). */
  name: string;
  /** Muscles belonging to this region. */
  muscles: Muscle[];
}
