// src/lib/muscleToContent.ts
//
// Adapter: project a lightweight `Muscle` (src/types/muscle.ts) into the richer
// `MuscleContent` (src/types/muscleContent.ts) that the pedagogical PhaseTrack
// and SelectionPanel consume.
//
// WHY THIS EXISTS
// ---------------
// The shoulder / elbow / knee regions ship HAND-AUTHORED MuscleContent indices
// (shoulderMuscles.ts, ...) with fully sourced prose (palpation, biomechanics,
// synergists, ...). Newer regions (hip, ankle) start from the structured
// `Muscle` records, which already carry origin / insertion / innervation /
// actions / clinicalNote. This adapter surfaces THAT data as MuscleContent so a
// new region has real, non-empty anatomy/biomechanics phases from day one,
// instead of falling back to the wrong region's content. The richer fields
// (palpation, functionalPositions, synergists) are simply omitted until an
// expert authors them; the PhaseTrack renderer skips missing fields cleanly.
//
// HONESTY: every derived SourcedText carries a generic pageVerified:false
// citation, matching the rest of the app's "source next to the claim, unverified
// until checked" discipline. This is DRAFT content, clearly not page-exact.

import type { Muscle } from '../types/muscle';
import type {
  MuscleContent,
  MuscleContentIndex,
  SourcedText,
} from '../types/muscleContent';
import type { Citation } from '../types/muscleContent';

/** Generic unverified citation used for adapter-derived prose. */
const DRAFT_CITE: Citation[] = [
  { ref: 'neumann', pageVerified: false },
  { ref: 'kapandji', pageVerified: false },
];

function sourced(text: string): SourcedText {
  return { text, cite: DRAFT_CITE };
}

/** Project one Muscle into a MuscleContent record. */
export function muscleToContent(m: Muscle): MuscleContent {
  return {
    id: m.id,
    nameEs: m.name,
    nameLat: m.latin,
    origin: sourced(m.origin),
    insertion: sourced(m.insertion),
    innervation: {
      nerve: sourced(m.innervation),
      roots: m.roots.length ? sourced(m.roots.join('-')) : undefined,
    },
    actions: m.actions.map((a, i) => ({
      role: i === 0 ? 'primary' : 'accessory',
      text: a.note
        ? `${a.joint} - ${a.movement}: ${a.note}`
        : `${a.joint} - ${a.movement}`,
      cite: DRAFT_CITE,
    })),
    clinicalNotes: m.clinicalNote ? [sourced(m.clinicalNote)] : undefined,
  };
}

/** Build a MuscleContentIndex from a flat muscle list (keyed by id). */
export function contentIndexFromMuscles(muscles: Muscle[]): MuscleContentIndex {
  const index: MuscleContentIndex = {};
  for (const m of muscles) index[m.id] = muscleToContent(m);
  return index;
}
