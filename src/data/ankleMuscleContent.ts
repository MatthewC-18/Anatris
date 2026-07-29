// src/data/ankleMuscleContent.ts
//
// Ankle MuscleContentIndex, DERIVED from the structured ankle muscle records
// (muscles/ankle.ts) via the muscleToContent adapter, so the ankle's pedagogical
// phases show real, region-correct content. Palpation / functional-position
// prose is authored later; the renderer skips missing fields. All derived
// citations stay pageVerified:false (draft).

import { contentIndexFromMuscles } from '../lib/muscleToContent';
import { ankleMuscles } from './muscles/ankle';
import type { MuscleContentIndex } from '../types/muscleContent';

export const ANKLE_MUSCLES: MuscleContentIndex = contentIndexFromMuscles(ankleMuscles);
