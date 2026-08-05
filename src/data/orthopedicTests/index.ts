// src/data/orthopedicTests/index.ts
//
// Registry of orthopedic special tests by region. Analogue of romByRegion.ts.
// All EIGHT regions are authored: shoulder, cervical, thoracic, lumbar, hip,
// knee, elbow, ankle.

import type { OrthopedicTest, OrthopedicTestIndex } from '../../types/orthopedicTest';
import { SHOULDER_ORTHOPEDIC_TESTS } from './shoulder';
import { CERVICAL_ORTHOPEDIC_TESTS } from './cervical';
import { THORACIC_ORTHOPEDIC_TESTS } from './thoracic';
import { LUMBAR_ORTHOPEDIC_TESTS } from './lumbar';
import { KNEE_ORTHOPEDIC_TESTS } from './knee';
import { ELBOW_ORTHOPEDIC_TESTS } from './elbow';
import { HIP_ORTHOPEDIC_TESTS } from './hip';
import { ANKLE_ORTHOPEDIC_TESTS } from './ankle';

/** region id -> tests. Keys match regiones.ts / store.region. */
export const ORTHOPEDIC_TESTS_BY_REGION: OrthopedicTestIndex = {
  shoulder: SHOULDER_ORTHOPEDIC_TESTS,
  cervical: CERVICAL_ORTHOPEDIC_TESTS,
  thoracic: THORACIC_ORTHOPEDIC_TESTS,
  lumbar: LUMBAR_ORTHOPEDIC_TESTS,
  hip: HIP_ORTHOPEDIC_TESTS,
  knee: KNEE_ORTHOPEDIC_TESTS,
  elbow: ELBOW_ORTHOPEDIC_TESTS,
  ankle: ANKLE_ORTHOPEDIC_TESTS,
};

/** Tests for a region (empty array when none authored yet). */
export function testsForRegion(region: string | null): OrthopedicTest[] {
  if (region && ORTHOPEDIC_TESTS_BY_REGION[region]) {
    return ORTHOPEDIC_TESTS_BY_REGION[region];
  }
  return [];
}

/** True when a region has at least one authored test. */
export function hasTests(region: string | null): boolean {
  return testsForRegion(region).length > 0;
}
