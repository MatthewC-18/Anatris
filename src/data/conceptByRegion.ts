// src/data/conceptByRegion.ts
//
// Central registry mapping a region id (store.region) to a CONCEPTUAL track,
// parallel to trackByRegion.ts but for non-anatomical modules (Fundamentos).
// The phase renderer asks isConceptModule(region) first: if true it renders the
// ConceptTrack with the concept renderer; otherwise it falls through to the
// anatomical RegionTrack from trackByRegion.ts.
//
// Adding a new conceptual module = import its ConceptTrack + one entry here.

import type { ConceptTrack } from '../types/concept';
import { FUNDAMENTOS_TRACK } from './fundamentosConcept';

/** region id -> conceptual track. Keys match the module ids used in TopBar. */
export const CONCEPT_BY_REGION: Record<string, ConceptTrack> = {
  fundamentos: FUNDAMENTOS_TRACK,
};

/** True if the active id is a conceptual module (not an anatomical region). */
export function isConceptModule(region: string | null): boolean {
  return !!region && region in CONCEPT_BY_REGION;
}

/** Resolve the conceptual track for the active id, or null if not conceptual. */
export function conceptForRegion(region: string | null): ConceptTrack | null {
  if (region && CONCEPT_BY_REGION[region]) {
    return CONCEPT_BY_REGION[region];
  }
  return null;
}
