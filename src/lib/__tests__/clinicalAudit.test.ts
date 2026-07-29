// Regression guard for the clinical data layer. Runs the SAME consistency audit
// as `npm run audit-data` and fails on any ERROR, so a muscleId typo, a broken
// citation ref, or a test demo pointing at a non-existent movement can never land
// silently. The failure message lists exactly what drifted.

import { describe, it, expect } from 'vitest';
import { runClinicalAudit } from '../clinicalAudit';

describe('clinical data consistency', () => {
  const { issues } = runClinicalAudit();
  const errors = issues.filter((i) => i.level === 'ERROR');

  it('has zero consistency ERRORS (ROM / tests / muscles / citations)', () => {
    expect(errors.map((e) => `${e.where} :: ${e.msg}`)).toEqual([]);
  });
});
