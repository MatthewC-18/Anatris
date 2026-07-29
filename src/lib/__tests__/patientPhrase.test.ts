// The patient-facing phrasing must produce a real, plain-language instruction for
// EVERY movement in EVERY region (the export card and Modo paciente both rely on
// it). Guards against a new region/movement slipping through with an empty or
// jargon-only phrase.

import { describe, it, expect } from 'vitest';
import { ROM_BY_REGION } from '../../data/romByRegion';
import { REGIONS } from '../../data/regiones';
import { patientInstruction } from '../patientPhrase';

describe('patientInstruction', () => {
  it('returns a non-empty sentence for every movement of every region', () => {
    const bad: string[] = [];
    for (const [region, movements] of Object.entries(ROM_BY_REGION)) {
      const name = REGIONS[region]?.name ?? region;
      for (const mv of movements) {
        const s = patientInstruction(mv, name);
        if (s.trim().length < 12 || !s.trim().endsWith('.')) bad.push(`${mv.id}: "${s}"`);
      }
    }
    expect(bad).toEqual([]);
  });
});
