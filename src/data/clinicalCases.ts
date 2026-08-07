// src/data/clinicalCases.ts
//
// Registry of interactive clinical cases by region. Cases are AUTHORED content
// (clinical reasoning can't be auto-generated from the muscle table), drafted
// from standard physiotherapy teaching as a starting point — verify before any
// professional use.
//
// The case prose now lives one file per region under `data/cases/`, because
// FREE content is bundled while PREMIUM content arrives at runtime from the
// entitlement-checked `content` edge function (see data/premiumStore.ts). A
// single shared file would have shipped every paid region's reasoning to every
// visitor, which is exactly the leak that change closes.
//
// Adding a case = append to the right region file under `data/cases/`.
// Authoring rules unchanged: prose in Latin American Spanish, ids/keys ASCII.

import type { ClinicalCase } from '../types/clinicalCase';
import { SHOULDER_CASES } from './cases/shoulder';
import { premiumCases } from './premiumStore';

/**
 * The FREE regions' cases, statically bundled.
 *
 * Do NOT add a premium region here — that would put the paid library back into
 * the public bundle.
 */
export const CLINICAL_CASES: Record<string, ClinicalCase[]> = {
  shoulder: SHOULDER_CASES,
};

/** Cases for a region (empty array when none are available). */
export function casesForRegion(region: string | null): ClinicalCase[] {
  if (!region) return [];
  return CLINICAL_CASES[region] ?? premiumCases(region) ?? [];
}
