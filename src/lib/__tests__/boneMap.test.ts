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

  // A physio reviewing the lab wrote "Rot int y ext mal". Two separate faults,
  // and the second hid the first: the rotations were shown with the elbow
  // STRAIGHT, where a humerus turning about its own axis looks like nothing
  // happening -- so nobody could see that the two directions were swapped.
  describe('shoulder rotations', () => {
    const ER = 'glenohumeral-external-rotation';
    const IR = 'glenohumeral-internal-rotation';

    it('are examined with the elbow at 90, on both sides', () => {
      for (const id of [ER, IR]) {
        const ctrl = BONE_MAP[id];
        expect(ctrl?.kind, id).toBe('joint');
        if (ctrl?.kind !== 'joint') continue;
        expect(ctrl.posture, `${id} needs an examination posture`).toBeDefined();
        const elbow = ctrl.posture!.find((p) => p.bone === 'forearm_flex');
        expect(elbow, `${id} must hold the elbow`).toBeDefined();
        expect(elbow!.deg, `${id} elbow angle`).toBe(90);
        // Same sign convention as elbow-flexion, or one elbow hyperextends.
        const flexion = BONE_MAP['elbow-flexion'];
        if (flexion?.kind === 'joint') {
          expect(elbow!.sign.R, `${id} elbow sign R`).toBe(flexion.sign.R);
          expect(elbow!.sign.L, `${id} elbow sign L`).toBe(flexion.sign.L);
          expect(elbow!.axis, `${id} elbow axis`).toBe(flexion.axis);
        }
        expect(elbow!.reason.length, `${id} must explain the posture`).toBeGreaterThan(20);
      }
    });

    it('turn opposite ways, and mirror between sides', () => {
      const er = BONE_MAP[ER];
      const ir = BONE_MAP[IR];
      if (er?.kind !== 'joint' || ir?.kind !== 'joint') throw new Error('not joints');
      expect(er.axis, 'both rotations share the humeral long axis').toBe(ir.axis);
      expect(er.bone).toBe(ir.bone);
      // Opposite directions on the same axis.
      expect(er.sign.R).toBe(-ir.sign.R);
      expect(er.sign.L).toBe(-ir.sign.L);
      // Mirrored armatures: the same clinical movement is opposite in local space.
      expect(er.sign.R).toBe(-er.sign.L);
      expect(ir.sign.R).toBe(-ir.sign.L);
    });

    it('drive the hand OUT in external rotation and ACROSS in internal', () => {
      // Measured on the rig with the elbow at 90 (forearm elbow->wrist vector,
      // lateral component, both sides): external ends at +0.91, internal at -0.77.
      // Before the fix those were -0.87 and +0.92 -- exactly swapped. The signs
      // below are what produce the measured directions; flipping either one
      // silently teaches the wrong movement.
      const er = BONE_MAP[ER];
      const ir = BONE_MAP[IR];
      if (er?.kind !== 'joint' || ir?.kind !== 'joint') throw new Error('not joints');
      expect(er.sign.R, 'external rotation, right arm').toBe(-1);
      expect(ir.sign.R, 'internal rotation, right arm').toBe(1);
    });

    it('keep internal rotation inside what the trunk allows in this position', () => {
      // 100 deg is the range with the hand travelling BEHIND the back, which
      // shoulderRom teaches. With the elbow at 90 at the side, the forearm meets
      // the belly at ~70 and anything more sweeps it through the abdomen.
      const ir = BONE_MAP[IR];
      if (ir?.kind !== 'joint') throw new Error('not a joint');
      expect(ir.clinicalRange.max).toBeLessThanOrEqual(70);
    });

    it('make elevation rotate the humerus the SAME way as external rotation', () => {
      // The obligatory external rotation of elevation exists to turn the greater
      // tuberosity out from under the acromion. While the two rotations were
      // swapped this was driving the humerus INTERNALLY, i.e. the opposite of what
      // it is for. It must always share external rotation's sign.
      const er = BONE_MAP[ER];
      if (er?.kind !== 'joint') throw new Error('not a joint');
      for (const id of ['glenohumeral-abduction', 'glenohumeral-flexion']) {
        const ctrl = BONE_MAP[id];
        if (ctrl?.kind !== 'chain') continue;
        for (const side of ['R', 'L'] as const) {
          // Past 90 deg, where the obligatory rotation has engaged.
          const humeralER = ctrl.decompose(140, side).humeralER;
          expect(Math.abs(humeralER), `${id} ${side} must rotate at 140`).toBeGreaterThan(0);
          expect(Math.sign(humeralER), `${id} ${side} vs external rotation`)
            .toBe(er.sign[side]);
        }
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
