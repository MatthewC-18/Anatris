// src/data/orthopedicTests/index.ts
//
// Registry of orthopedic special tests by region. Analogue of romByRegion.ts.
// All EIGHT regions are authored: shoulder, cervical, thoracic, lumbar, hip,
// knee, elbow, ankle.
//
// FREE content is bundled; PREMIUM content arrives at runtime from the
// entitlement-checked `content` edge function (see data/premiumStore.ts).
//
// NOTE: the special-tests PANEL is a premium capability in EVERY region,
// including the free one — but the shoulder's test DATA stays bundled, because
// it also backs the shoulder's "Evidencia" screen and it is the region we demo.
// The panel gate lives in entitlements.ts; this module only decides which data
// is present.

import type { OrthopedicTest, OrthopedicTestIndex } from '../../types/orthopedicTest';
import { SHOULDER_ORTHOPEDIC_TESTS } from './shoulder';
import { premiumTests } from '../premiumStore';

/**
 * The FREE regions' tests, statically bundled.
 *
 * Do NOT add a premium region here — that would put the paid library back into
 * the public bundle.
 */
export const ORTHOPEDIC_TESTS_BY_REGION: OrthopedicTestIndex = {
  shoulder: SHOULDER_ORTHOPEDIC_TESTS,
};

/** Tests for a region (empty array when none are available). */
export function testsForRegion(region: string | null): OrthopedicTest[] {
  if (!region) return [];
  return ORTHOPEDIC_TESTS_BY_REGION[region] ?? premiumTests(region) ?? [];
}

/** True when a region has at least one available test. */
export function hasTests(region: string | null): boolean {
  return testsForRegion(region).length > 0;
}
