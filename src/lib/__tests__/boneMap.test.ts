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

  // The two elevation chains each cost a long measuring session to get right.
  // These lock in what was learned, because every one of them fails silently:
  // the arm just stops short, or the trunk tips the wrong way, and it reads as
  // "the 3D is a bit off" rather than as a bug.
  describe('shoulder elevation chains', () => {
    const ELEVATION = ['glenohumeral-abduction', 'glenohumeral-flexion'] as const;

    it('aim the arm in the plane the clinical angle is read in', () => {
      // Without aimPlane the humeral axis sweeps a cone and the arm lands short:
      // measured -9.7 deg at 180 in abduction and -53.1 in flexion.
      for (const id of ELEVATION) {
        const ctrl = BONE_MAP[id];
        expect(ctrl?.kind, id).toBe('chain');
        if (ctrl?.kind !== 'chain') continue;
        expect(ctrl.aimPlane, `${id} must aim`).toBeDefined();
      }
      const abduction = BONE_MAP['glenohumeral-abduction'];
      const flexion = BONE_MAP['glenohumeral-flexion'];
      if (abduction?.kind === 'chain') expect(abduction.aimPlane).toBe('z'); // frontal
      if (flexion?.kind === 'chain') expect(flexion.aimPlane).toBe('x'); // sagittal
    });

    it('lean the trunk only in abduction, and only contralaterally', () => {
      const flexion = BONE_MAP['glenohumeral-flexion'];
      if (flexion?.kind === 'chain') {
        // A frontal side-bend has no business in a sagittal elevation.
        expect(flexion.targets.some((t) => t.key === 'thoracic')).toBe(false);
      }
      const abduction = BONE_MAP['glenohumeral-abduction'];
      if (abduction?.kind !== 'chain') return;
      expect(abduction.targets.some((t) => t.key === 'thoracic')).toBe(true);
      // Below the phase-3 threshold the trunk stays put; above it, it must bend
      // AWAY from the rising arm. The sign is flipped inside decompose because
      // the rig's vertebra local-Z runs opposite the clinical convention, and
      // getting it backwards pushes the arm back down (measured 149.5 -> 143.5).
      expect(abduction.decompose(120, 'R').thoracic ?? 0).toBe(0);
      const right = abduction.decompose(180, 'R').thoracic;
      const left = abduction.decompose(180, 'L').thoracic;
      expect(right).not.toBe(0);
      expect(Math.sign(right), 'R and L must lean opposite ways').toBe(-Math.sign(left));
    });

    it('keep the scapula rotating, so the rhythm stays visible', () => {
      // The aim corrects the humerus only. If the scapular share ever went to
      // zero the arm would still land on the right angle while the shoulder
      // girdle sat frozen, which is exactly the thing the lab exists to show.
      for (const id of ELEVATION) {
        const ctrl = BONE_MAP[id];
        if (ctrl?.kind !== 'chain') continue;
        const at150 = ctrl.decompose(150, 'R').scapula;
        expect(Math.abs(at150), `${id} scapula at 150`).toBeGreaterThan(0.1);
        expect(Math.abs(ctrl.decompose(150, 'R').scapula), id)
          .toBeGreaterThan(Math.abs(ctrl.decompose(60, 'R').scapula));
      }
    });
  });

  // Left and right must always show the SAME movement. On this rig that is not
  // the same thing as "opposite signs": femur_base rests with an identical world
  // frame on both sides (unlike shin_flex, which is mirrored), so the sagittal
  // hip signs have to MATCH or the right leg runs the arc backwards -- which is
  // exactly how it shipped, kicking 75 cm behind the body when asked for 90 deg
  // of flexion. Measured by scripts/audit-limb-symmetry.mts against the GLB;
  // locked here because the "obvious" edit is to mirror the sign back.
  describe('hip left/right symmetry', () => {
    const sign = (id: string) => {
      const c = BONE_MAP[id];
      if (c?.kind !== 'joint') throw new Error(`${id} is not a joint control`);
      return c.sign;
    };

    it('drives the sagittal hip with the SAME sign on both sides', () => {
      for (const id of ['hip-flexion', 'hip-extension']) {
        const s = sign(id);
        expect(s.L, `${id}: the femurs are not mirrored`).toBe(s.R);
      }
      // ...and flexion must go the opposite way to extension.
      expect(sign('hip-flexion').R).toBe(-sign('hip-extension').R);
    });

    it('drives the frontal and transverse hip with OPPOSITE signs per side', () => {
      // These movements ARE mirror-opposite in world terms (the right leg abducts
      // toward +x, the left toward -x), so on a shared axis they need to differ.
      for (const id of [
        'hip-abduction',
        'hip-adduction',
        'hip-internal-rotation',
        'hip-external-rotation',
      ]) {
        const s = sign(id);
        expect(s.L, id).toBe(-s.R);
      }
    });
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
