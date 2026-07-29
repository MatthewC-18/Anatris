// src/data/hipMuscleContent.ts
//
// Hip MuscleContentIndex, DERIVED from the structured hip muscle records
// (muscles/hip.ts) via the muscleToContent adapter. This gives the hip's
// pedagogical phases (anatomy / biomechanics / palpation) real, region-correct
// content instead of falling back to another region's index.
//
// The derived content covers origin / insertion / innervation / actions /
// clinical note. Palpation, functional positions and synergist/antagonist prose
// are intentionally absent until an expert authors them; the renderer skips
// missing fields. All derived citations stay pageVerified:false (draft).

import { contentIndexFromMuscles } from '../lib/muscleToContent';
import { hipMuscles } from './muscles/hip';
import type { MuscleContentIndex } from '../types/muscleContent';

export const HIP_MUSCLES: MuscleContentIndex = contentIndexFromMuscles(hipMuscles);
