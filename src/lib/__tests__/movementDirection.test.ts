// A movement must go the way its NAME says.
//
// This is the defect class that got furthest into the product, twice, because
// nothing could catch it. A flipped sign is invisible to the type checker and
// to every audit that measures magnitude: the joint travels exactly the right
// number of degrees, just the other way. Two of them shipped --
//
//   - hip flexion drove the knee 40,9 cm BACKWARDS at 90 deg;
//   - ankle inversion turned the sole OUTWARDS at 35 deg.
//
// -- and both survived being looked at, because looking does not work here. In
// a lateral render the two legs project on top of each other, so the eye reads
// the stance limb as the moving one; in the frontal plane of the foot, a plain
// dorsiflexion raises both borders and looks like the same thing.
//
// `npm run audit-direction` settles it by CPU-skinning a distal landmark at
// 0 deg and at the clinical maximum and reporting which way it travelled, with
// anterior derived from the rest pose instead of assumed. That script needs the
// 50 MB rig, so it is not part of `npm test`. What IS part of `npm test` is
// this table: the sign map each movement had on the day its direction was
// measured. Change a sign and this fails, naming the measurement it breaks --
// so the next flip has to be deliberate, and has to re-run the audit.
//
// Keep the two in step: if the audit's verdict changes, update the table and
// the displacement in the comment. Never update the table to make it green.

import { describe, it, expect } from 'vitest';
import { getBoneControl } from '../boneMap';

/** A direction confirmed by measurement, and the measurement that confirmed it. */
interface MeasuredDirection {
  move: string;
  /** Sign map for the right side at the time of measurement. */
  signR: 1 | -1;
  /** What was measured, for the failure message. */
  evidence: string;
}

const MEASURED: MeasuredDirection[] = [
  { move: 'ankle-dorsiflexion', signR: 1, evidence: 'a 20 deg la punta del pie sube 6,1 cm' },
  { move: 'ankle-plantarflexion', signR: -1, evidence: 'a 50 deg la punta del pie baja 10,6 cm' },
  { move: 'ankle-inversion', signR: -1, evidence: 'a 35 deg el 1er metatarsiano queda 2,4 cm por ENCIMA del 5o' },
  { move: 'ankle-eversion', signR: 1, evidence: 'a 15 deg el 1er metatarsiano queda 1,2 cm por DEBAJO del 5o' },
  { move: 'knee-flexion', signR: -1, evidence: 'a 90 deg el talon sube 40,1 cm hacia el gluteo' },
  { move: 'hip-flexion', signR: -1, evidence: 'a 90 deg la rodilla avanza 42,2 cm (anterior = +z)' },
  { move: 'hip-extension', signR: 1, evidence: 'a 20 deg la rodilla retrocede 14,2 cm' },
  { move: 'elbow-flexion', signR: 1, evidence: 'a 140 deg la mano sube 46,9 cm hacia el hombro' },
];

describe('the direction of a movement is the one its name claims', () => {
  for (const m of MEASURED) {
    it(`${m.move} keeps the sign that was measured`, () => {
      const bc = getBoneControl(m.move);
      expect(bc, `${m.move} must still exist in the bone map`).toBeDefined();
      expect(bc?.kind, `${m.move} must still be a joint`).toBe('joint');
      if (bc?.kind !== 'joint') return;
      expect(
        bc.sign.R,
        `${m.move} changed direction. The measurement that fixed it: ${m.evidence}. ` +
          'Re-run `npm run audit-direction` before touching this.',
      ).toBe(m.signR);
    });
  }

  it('a movement and its opposite point opposite ways', () => {
    const pairs: [string, string][] = [
      ['ankle-dorsiflexion', 'ankle-plantarflexion'],
      ['ankle-inversion', 'ankle-eversion'],
      ['hip-flexion', 'hip-extension'],
    ];
    for (const [a, b] of pairs) {
      const ca = getBoneControl(a);
      const cb = getBoneControl(b);
      if (ca?.kind !== 'joint' || cb?.kind !== 'joint') continue;
      expect(ca.bone, `${a} and ${b} must share a bone`).toBe(cb.bone);
      expect(ca.axis, `${a} and ${b} must share an axis`).toBe(cb.axis);
      expect(ca.sign.R, `${a} and ${b} must oppose each other`).toBe(-cb.sign.R);
    }
  });

  it('left mirrors right on every one of them', () => {
    for (const m of MEASURED) {
      const bc = getBoneControl(m.move);
      if (bc?.kind !== 'joint') continue;
      expect(bc.sign.L, `${m.move} must mirror`).toBe(-bc.sign.R);
    }
  });

  it('nothing is still waiting for a visual check', () => {
    // The flag meant "the axis is right, the +/- is a guess". Both guesses that
    // outlived it were wrong, so the flag is not a TODO any more -- it is a
    // defect. Anything new that needs one needs a measurement instead.
    const pending = MEASURED.map((m) => m.move).filter((id) => {
      const bc = getBoneControl(id);
      return bc?.kind === 'joint' && bc.needsVisualCheck === true;
    });
    expect(pending, 'measure the direction instead of flagging it').toEqual([]);
  });
});
