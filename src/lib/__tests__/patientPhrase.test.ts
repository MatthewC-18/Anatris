// The patient-facing phrasing must produce a real, plain-language instruction for
// EVERY movement in EVERY region (the export card and Modo paciente both rely on
// it). Guards against a new region/movement slipping through with an empty or
// jargon-only phrase.

import { describe, it, expect } from 'vitest';
// Reads the FULL registry on purpose. The runtime `romByRegion` now carries
// only the free tier (premium regions are fetched behind an entitlement check),
// so iterating that one would silently shrink this test from 34 movements to 4
// and it would keep passing while covering almost nothing.
import { ALL_ROM_BY_REGION } from '../../data/fullContent';
import { REGIONS } from '../../data/regiones';
import { patientInstruction } from '../patientPhrase';

describe('patientInstruction', () => {
  it('returns a non-empty sentence for every movement of every region', () => {
    const bad: string[] = [];
    // Guard against the shrink above: if a future change drops regions from the
    // full registry, fail loudly instead of quietly testing less.
    expect(Object.keys(ALL_ROM_BY_REGION).length).toBeGreaterThanOrEqual(8);
    for (const [region, movements] of Object.entries(ALL_ROM_BY_REGION)) {
      const name = REGIONS[region]?.name ?? region;
      for (const mv of movements) {
        const s = patientInstruction(mv, name);
        if (s.trim().length < 12 || !s.trim().endsWith('.')) bad.push(`${mv.id}: "${s}"`);
      }
    }
    expect(bad).toEqual([]);
  });
});
