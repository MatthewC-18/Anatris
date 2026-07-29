// Structural invariants of the rig bone map + the ROM -> rig contract. Guards the
// fragile "every movement the lab lists must actually drive a bone" edge that has
// broken before when a region was added without its bone controls.

import { describe, it, expect } from 'vitest';
import { ROM_BY_REGION } from '../../data/romByRegion';
import { BONE_MAP, isDrivable } from '../boneMap';

describe('boneMap', () => {
  it('every ROM movement has a bone control (nothing lists in the lab without driving)', () => {
    const missing: string[] = [];
    for (const movements of Object.values(ROM_BY_REGION)) {
      for (const mv of movements) {
        if (!(mv.id in BONE_MAP)) missing.push(mv.id);
      }
    }
    expect(missing).toEqual([]);
  });

  it('joint controls have a valid axis, per-side signs and a sane range', () => {
    for (const [id, ctrl] of Object.entries(BONE_MAP)) {
      if (ctrl.kind === 'joint') {
        expect(['x', 'y', 'z'], id).toContain(ctrl.axis);
        expect([1, -1], `${id}.sign.R`).toContain(ctrl.sign.R);
        expect([1, -1], `${id}.sign.L`).toContain(ctrl.sign.L);
        expect(ctrl.clinicalRange.max, id).toBeGreaterThanOrEqual(ctrl.clinicalRange.min);
      }
    }
  });

  it('the hip and ankle joints added for Priority 1 are drivable', () => {
    for (const id of [
      'hip-flexion',
      'hip-abduction',
      'hip-internal-rotation',
      'ankle-dorsiflexion',
      'ankle-inversion',
    ]) {
      expect(isDrivable(id), id).toBe(true);
    }
  });
});
