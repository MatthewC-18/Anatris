// src/data/fullContent.ts
//
// ============================================================================
// BUILD / TEST ONLY. THE APP MUST NEVER IMPORT THIS MODULE.
// ============================================================================
//
// The complete clinical library, every region statically imported, in the shape
// the runtime registries used to have before premium content was moved behind a
// server-side entitlement check.
//
// WHY IT EXISTS: two consumers legitimately need ALL regions at once, and
// neither runs in the browser:
//
//   1. `scripts/build-premium-content.mts` — serialises the premium regions
//      into the payloads the edge function serves.
//   2. `src/lib/clinicalAudit.ts` — the consistency + verification audit, run
//      by `npm run audit-data` and by the regression test.
//
// WHY THE APP MUST NOT: importing this from any component or runtime lib would
// statically pull the paid clinical library back into the public bundle, which
// is exactly the leak this whole change closes. `fullContent.test.ts` fails the
// build if an app file imports it, so this rule is enforced, not just written.
//
// The per-region composition logic (thoracic borrowing the abdominal wall from
// lumbar, the whole-spine lookup universe) lives HERE and in the extraction
// script, so the runtime never needs the other regions' arrays to build one
// region's data.

import type { Muscle } from '../types/muscle';
import type { MuscleContentIndex } from '../types/muscleContent';
import type { RomMovement } from '../types/rom';
import type { RegionTrack } from '../types/pedagogy';
import type { OrthopedicTest } from '../types/orthopedicTest';
import type { ClinicalCase } from '../types/clinicalCase';

// -- muscle lists ------------------------------------------------------------
import { shoulderMuscles } from './muscles/shoulder';
import { elbowMuscles } from './muscles/elbow';
import { hipMuscles } from './muscles/hip';
import { kneeMuscles } from './muscles/knee';
import { ankleMuscles } from './muscles/ankle';
import { cervicalMuscles, thoracicMuscles, lumbarMuscles } from './muscles/spine';

// -- rich clinical content ---------------------------------------------------
import { SHOULDER_MUSCLES } from './shoulderMuscles';
import { ELBOW_MUSCLES } from './elbowMuscles';
import { HIP_MUSCLES } from './hipMuscleContent';
import { KNEE_MUSCLES } from './kneeMuscles';
import { ANKLE_MUSCLES } from './ankleMuscleContent';
import {
  CERVICAL_MUSCLES,
  THORACIC_MUSCLES,
  LUMBAR_MUSCLES,
} from './spineMuscleContent';

// -- ROM ---------------------------------------------------------------------
import { SHOULDER_ROM_LIST } from './shoulderRom';
import { ELBOW_ROM_LIST } from './elbowRom';
import { HIP_ROM_LIST } from './hipRom';
import { KNEE_ROM_LIST } from './kneeRom';
import { ANKLE_ROM_LIST } from './ankleRom';
import { THORACIC_ROM_LIST } from './thoracicRom';
import { CERVICAL_ROM_LIST } from './cervicalRom';
import { LUMBAR_ROM_LIST } from './lumbarRom';

// -- pedagogical tracks ------------------------------------------------------
import { SHOULDER_TRACK } from './shoulderPhases';
import { ELBOW_TRACK } from './elbowPhases';
import { CERVICAL_TRACK } from './cervicalPhases';
import { THORACIC_TRACK } from './thoracicPhases';
import { LUMBAR_TRACK } from './lumbarPhases';
import { HIP_TRACK } from './hipPhases';
import { KNEE_TRACK } from './kneePhases';
import { ANKLE_TRACK } from './anklePhases';

// -- orthopedic tests --------------------------------------------------------
import { SHOULDER_ORTHOPEDIC_TESTS } from './orthopedicTests/shoulder';
import { CERVICAL_ORTHOPEDIC_TESTS } from './orthopedicTests/cervical';
import { THORACIC_ORTHOPEDIC_TESTS } from './orthopedicTests/thoracic';
import { LUMBAR_ORTHOPEDIC_TESTS } from './orthopedicTests/lumbar';
import { KNEE_ORTHOPEDIC_TESTS } from './orthopedicTests/knee';
import { ELBOW_ORTHOPEDIC_TESTS } from './orthopedicTests/elbow';
import { HIP_ORTHOPEDIC_TESTS } from './orthopedicTests/hip';
import { ANKLE_ORTHOPEDIC_TESTS } from './orthopedicTests/ankle';

// -- clinical cases ----------------------------------------------------------
import { SHOULDER_CASES } from './cases/shoulder';
import { ELBOW_CASES } from './cases/elbow';
import { KNEE_CASES } from './cases/knee';
import { CERVICAL_CASES } from './cases/cervical';
import { THORACIC_CASES } from './cases/thoracic';
import { LUMBAR_CASES } from './cases/lumbar';
import { HIP_CASES } from './cases/hip';
import { ANKLE_CASES } from './cases/ankle';

// -- pathological presets ----------------------------------------------------
import type { MovementPathology } from './pathologies';
import { SHOULDER_PATHOLOGIES } from './pathology/shoulder';
import { KNEE_PATHOLOGIES } from './pathology/knee';
import { ELBOW_PATHOLOGIES } from './pathology/elbow';
import { CERVICAL_PATHOLOGIES } from './pathology/cervical';
import { THORACIC_PATHOLOGIES } from './pathology/thoracic';
import { LUMBAR_PATHOLOGIES } from './pathology/lumbar';
import { HIP_PATHOLOGIES } from './pathology/hip';
import { ANKLE_PATHOLOGIES } from './pathology/ankle';

/**
 * The anterolateral abdominal wall + quadratus lumborum flex / side-bend /
 * rotate the WHOLE trunk, so the THORACIC ROM cites them as movers. They are
 * authored once in `lumbarMuscles`; the thoracic region borrows those exact
 * records so its highlights and markers resolve. (Without this the thoracic ROM
 * referenced muscle ids absent from the thoracic list and the highlight
 * silently no-oped — a bug the clinical audit caught once already.)
 */
const THORACIC_SHARED_TRUNK = new Set([
  'rectus-abdominis',
  'external-oblique',
  'internal-oblique',
  'quadratus-lumborum',
]);

const thoracicSharedTrunkMuscles = lumbarMuscles.filter((m) =>
  THORACIC_SHARED_TRUNK.has(m.id),
);

/** Every region's muscle list, composition already applied. */
export const ALL_MUSCLES_BY_REGION: Record<string, Muscle[]> = {
  shoulder: shoulderMuscles,
  elbow: elbowMuscles,
  hip: hipMuscles,
  knee: kneeMuscles,
  ankle: ankleMuscles,
  cervical: cervicalMuscles,
  thoracic: [...thoracicMuscles, ...thoracicSharedTrunkMuscles],
  lumbar: lumbarMuscles,
};

/** The three spine sub-regions, which together form one continuous chain. */
export const SPINE_REGION_IDS = new Set(['cervical', 'thoracic', 'lumbar']);

/** Every muscle of the whole spine, across all three sub-regions. */
const ALL_SPINE_MUSCLES: Muscle[] = [
  ...cervicalMuscles,
  ...thoracicMuscles,
  ...lumbarMuscles,
];

/**
 * Muscle universe for resolving the NAMES of muscles participating in a ROM
 * movement, as opposed to a region's anatomical muscle LIST. They differ for
 * the spine: a thoracic rotation legitimately recruits the abdominal wall,
 * which lives in the lumbar sub-region, and those "guest" muscles must still
 * light up and show their Spanish name.
 */
export const ALL_ROM_LOOKUP_BY_REGION: Record<string, Muscle[]> = {
  ...ALL_MUSCLES_BY_REGION,
  cervical: ALL_SPINE_MUSCLES,
  thoracic: ALL_SPINE_MUSCLES,
  lumbar: ALL_SPINE_MUSCLES,
};

export const ALL_MUSCLE_CONTENT_BY_REGION: Record<string, MuscleContentIndex> = {
  shoulder: SHOULDER_MUSCLES,
  elbow: ELBOW_MUSCLES,
  hip: HIP_MUSCLES,
  knee: KNEE_MUSCLES,
  ankle: ANKLE_MUSCLES,
  cervical: CERVICAL_MUSCLES,
  thoracic: THORACIC_MUSCLES,
  lumbar: LUMBAR_MUSCLES,
};

export const ALL_ROM_BY_REGION: Record<string, RomMovement[]> = {
  shoulder: SHOULDER_ROM_LIST,
  elbow: ELBOW_ROM_LIST,
  hip: HIP_ROM_LIST,
  knee: KNEE_ROM_LIST,
  ankle: ANKLE_ROM_LIST,
  thoracic: THORACIC_ROM_LIST,
  cervical: CERVICAL_ROM_LIST,
  lumbar: LUMBAR_ROM_LIST,
};

export const ALL_TRACK_BY_REGION: Record<string, RegionTrack> = {
  shoulder: SHOULDER_TRACK,
  elbow: ELBOW_TRACK,
  cervical: CERVICAL_TRACK,
  thoracic: THORACIC_TRACK,
  lumbar: LUMBAR_TRACK,
  hip: HIP_TRACK,
  knee: KNEE_TRACK,
  ankle: ANKLE_TRACK,
};

export const ALL_TESTS_BY_REGION: Record<string, OrthopedicTest[]> = {
  shoulder: SHOULDER_ORTHOPEDIC_TESTS,
  cervical: CERVICAL_ORTHOPEDIC_TESTS,
  thoracic: THORACIC_ORTHOPEDIC_TESTS,
  lumbar: LUMBAR_ORTHOPEDIC_TESTS,
  hip: HIP_ORTHOPEDIC_TESTS,
  knee: KNEE_ORTHOPEDIC_TESTS,
  elbow: ELBOW_ORTHOPEDIC_TESTS,
  ankle: ANKLE_ORTHOPEDIC_TESTS,
};

export const ALL_CASES_BY_REGION: Record<string, ClinicalCase[]> = {
  shoulder: SHOULDER_CASES,
  elbow: ELBOW_CASES,
  knee: KNEE_CASES,
  cervical: CERVICAL_CASES,
  thoracic: THORACIC_CASES,
  lumbar: LUMBAR_CASES,
  hip: HIP_CASES,
  ankle: ANKLE_CASES,
};

export const ALL_PATHOLOGIES_BY_REGION: Record<string, MovementPathology[]> = {
  shoulder: SHOULDER_PATHOLOGIES,
  knee: KNEE_PATHOLOGIES,
  elbow: ELBOW_PATHOLOGIES,
  cervical: CERVICAL_PATHOLOGIES,
  thoracic: THORACIC_PATHOLOGIES,
  lumbar: LUMBAR_PATHOLOGIES,
  hip: HIP_PATHOLOGIES,
  ankle: ANKLE_PATHOLOGIES,
};

/** Every pathology preset, across regions (the audit checks them all). */
export const ALL_PATHOLOGIES: MovementPathology[] = Object.values(
  ALL_PATHOLOGIES_BY_REGION,
).flat();

/** Every region id the clinical library covers. */
export const ALL_REGION_IDS: string[] = Object.keys(ALL_MUSCLES_BY_REGION);
