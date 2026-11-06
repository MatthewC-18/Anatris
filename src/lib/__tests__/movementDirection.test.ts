// A movement must go the way its NAME says.
//
// This is the defect class that got furthest into the product, and it got there
// three times, because nothing could catch it. A flipped sign is invisible to
// the type checker and to every audit that measures magnitude: the joint travels
// exactly the right number of degrees, just the other way. What shipped --
//
//   - hip flexion drove the knee 40,9 cm BACKWARDS at 90 deg;
//   - ankle inversion turned the sole OUTWARDS at 35 deg;
//   - wrist flexion closed the hand 5,4 cm BACKWARDS;
//   - and the fix for the first one flipped BOTH sides, so the defect simply
//     moved to the left leg and stayed there for three days.
//
// -- and all of it survived being looked at, because looking does not work
// here. In a lateral render the two legs project on top of each other, so the
// eye reads the stance limb as the moving one; in the frontal plane of the foot,
// a plain dorsiflexion raises both borders and looks like the same thing.
//
// `npm run audit-direction` settles it by CPU-skinning a distal landmark at
// 0 deg and at the clinical maximum, ON BOTH SIDES, and reporting which way it
// travelled, with anterior derived from the rest pose instead of assumed. That
// script needs the 50 MB rig, so it is not part of `npm test`. What IS part of
// `npm test` is this table: the sign map each movement had on the day its
// direction was measured, per side. Change a sign and this fails, naming the
// measurement it breaks -- so the next flip has to be deliberate, and has to
// re-run the audit.
//
// WHY THE SIDES ARE LISTED SEPARATELY. This file used to assert that the left
// always mirrors the right. It does not: the rig's five armatures were not
// built to one convention, and the audit measured which bones mirror and which
// do not. `femur_base` local X and `hand_flex` local X drive both limbs the
// SAME way; `shin_flex` local X and the longitudinal axes mirror. An invariant
// that reads well is not an invariant, and asserting that one hid a live defect
// on the left leg.
//
// Keep the two in step: if the audit's verdict changes, update the table and the
// displacement in the comment. Never update the table to make it green.

import { describe, it, expect } from 'vitest';
import { getBoneControl } from '../boneMap';

/** A direction confirmed by measurement, and the measurement that confirmed it. */
interface MeasuredDirection {
  move: string;
  /** Sign map at the time of measurement, per side. */
  signR: 1 | -1;
  signL: 1 | -1;
  /** What was measured, for the failure message. */
  evidence: string;
}

const MEASURED: MeasuredDirection[] = [
  { move: 'ankle-dorsiflexion', signR: 1, signL: -1, evidence: 'a 20 deg la punta del pie sube 6,1 cm en los dos lados' },
  { move: 'ankle-plantarflexion', signR: -1, signL: 1, evidence: 'a 50 deg la punta del pie baja 10,6 cm en los dos lados' },
  { move: 'ankle-inversion', signR: -1, signL: 1, evidence: 'a 35 deg el 1er metatarsiano queda 2,4 cm por ENCIMA del 5o' },
  { move: 'ankle-eversion', signR: 1, signL: -1, evidence: 'a 15 deg el 1er metatarsiano queda 1,2 cm por DEBAJO del 5o' },
  { move: 'knee-flexion', signR: -1, signL: 1, evidence: 'a 90 deg el talon sube 40,1 cm hacia el gluteo en los dos lados' },
  { move: 'knee-extension', signR: -1, signL: 1, evidence: 'de 120 a 0 deg el talon baja 60,0 cm' },
  { move: 'knee-internal-rotation', signR: 1, signL: -1, evidence: 'a 25 deg la punta del pie gira 6,7 cm hacia DENTRO' },
  { move: 'knee-external-rotation', signR: -1, signL: 1, evidence: 'a 25 deg la punta del pie gira 6,6 cm hacia FUERA' },
  // Both sides the SAME: femur_base local X does not mirror. Measured.
  { move: 'hip-flexion', signR: -1, signL: -1, evidence: 'a 90 deg la rodilla avanza 42,2 cm en los dos lados (anterior = +z)' },
  { move: 'hip-extension', signR: 1, signL: 1, evidence: 'a 20 deg la rodilla retrocede 14,2 cm en los dos lados' },
  { move: 'hip-abduction', signR: -1, signL: 1, evidence: 'a 45 deg la rodilla se separa 29,0 cm de la linea media' },
  { move: 'hip-adduction', signR: 1, signL: -1, evidence: 'a 20 deg la rodilla cruza 11,9 cm hacia la linea media' },
  { move: 'hip-internal-rotation', signR: 1, signL: -1, evidence: 'con la rodilla a 90, a 35 deg el talon se abre 22,5 cm hacia fuera' },
  { move: 'hip-external-rotation', signR: -1, signL: 1, evidence: 'con la rodilla a 90, a 40 deg el talon cruza 25,9 cm hacia dentro' },
  { move: 'elbow-flexion', signR: 1, signL: -1, evidence: 'a 140 deg la mano sube 46,9 cm hacia el hombro' },
  { move: 'elbow-extension', signR: 1, signL: -1, evidence: 'de 140 a 0 deg la mano baja 46,9 cm' },
  { move: 'elbow-pronation', signR: 1, signL: -1, evidence: 'desde neutro, a 80 deg el pulgar cruza 5,3 cm hacia dentro' },
  { move: 'elbow-supination', signR: -1, signL: 1, evidence: 'desde neutro, a 85 deg el pulgar se abre 6,7 cm hacia fuera' },
  // Both sides the SAME, like the hip's sagittal pair: hand_flex local X does
  // not mirror either.
  { move: 'wrist-flexion', signR: 1, signL: 1, evidence: 'a 70 deg la mano se cierra 4,4 cm HACIA DELANTE (el antebrazo en reposo esta supinado)' },
  { move: 'wrist-extension', signR: -1, signL: -1, evidence: 'a 60 deg el dorso se cierra 4,9 cm hacia atras' },
  { move: 'glenohumeral-internal-rotation', signR: 1, signL: -1, evidence: 'con el codo a 90, a 60 deg la mano cruza 22,5 cm hacia el vientre' },
  { move: 'glenohumeral-external-rotation', signR: -1, signL: 1, evidence: 'con el codo a 90, a 70 deg la mano se abre 18,5 cm' },
];

describe('the direction of a movement is the one its name claims', () => {
  for (const m of MEASURED) {
    it(`${m.move} keeps the signs that were measured`, () => {
      const bc = getBoneControl(m.move);
      expect(bc, `${m.move} must still exist in the bone map`).toBeDefined();
      expect(bc?.kind, `${m.move} must still be a joint`).toBe('joint');
      if (bc?.kind !== 'joint') return;
      const why =
        `${m.move} changed direction. The measurement that fixed it: ${m.evidence}. ` +
        'Re-run `npm run audit-direction` before touching this.';
      expect(bc.sign.R, why).toBe(m.signR);
      expect(bc.sign.L, why).toBe(m.signL);
    });
  }

  it('a movement and its opposite point opposite ways', () => {
    const pairs: [string, string][] = [
      ['ankle-dorsiflexion', 'ankle-plantarflexion'],
      ['ankle-inversion', 'ankle-eversion'],
      ['hip-flexion', 'hip-extension'],
      ['hip-abduction', 'hip-adduction'],
      ['hip-internal-rotation', 'hip-external-rotation'],
      ['knee-internal-rotation', 'knee-external-rotation'],
      ['elbow-pronation', 'elbow-supination'],
      ['wrist-flexion', 'wrist-extension'],
      ['glenohumeral-internal-rotation', 'glenohumeral-external-rotation'],
    ];
    for (const [a, b] of pairs) {
      const ca = getBoneControl(a);
      const cb = getBoneControl(b);
      if (ca?.kind !== 'joint' || cb?.kind !== 'joint') continue;
      expect(ca.bone, `${a} and ${b} must share a bone`).toBe(cb.bone);
      expect(ca.axis, `${a} and ${b} must share an axis`).toBe(cb.axis);
      expect(ca.sign.R, `${a} and ${b} must oppose each other on the right`).toBe(-cb.sign.R);
      expect(ca.sign.L, `${a} and ${b} must oppose each other on the left`).toBe(-cb.sign.L);
    }
  });

  it('the knee and the elbow only ever RETURN to zero', () => {
    // Their extension shares one physical arc with their flexion -- 0 deg is the
    // straight joint -- so it carries the SAME sign and is driven from the bent
    // end. A sign opposite to flexion here would mean a backwards
    // hyperextension nobody has.
    for (const [flex, ext] of [
      ['knee-flexion', 'knee-extension'],
      ['elbow-flexion', 'elbow-extension'],
    ] as [string, string][]) {
      const cf = getBoneControl(flex);
      const ce = getBoneControl(ext);
      if (cf?.kind !== 'joint' || ce?.kind !== 'joint') continue;
      expect(ce.sign.R, `${ext} must share ${flex}'s sign`).toBe(cf.sign.R);
      expect(ce.sign.L, `${ext} must share ${flex}'s sign`).toBe(cf.sign.L);
      expect(ce.arcFrom, `${ext} must start from the bent end`).toBe('max');
    }
  });

  it('which axes mirror and which do not is recorded, not assumed', () => {
    // The whole left-leg defect came from assuming this. These three bones were
    // measured by driving both sides; the entry that disagrees with its
    // neighbours on the same bone and axis is the bug.
    const sameOnBothSides = ['hip-flexion', 'hip-extension', 'wrist-flexion', 'wrist-extension'];
    const mirrored = [
      'knee-flexion', 'knee-extension', 'ankle-dorsiflexion', 'ankle-plantarflexion',
      'hip-abduction', 'hip-adduction', 'elbow-flexion', 'elbow-pronation',
    ];
    for (const id of sameOnBothSides) {
      const bc = getBoneControl(id);
      if (bc?.kind !== 'joint') continue;
      expect(bc.sign.L, `${id} drives both limbs the same way (measured)`).toBe(bc.sign.R);
    }
    for (const id of mirrored) {
      const bc = getBoneControl(id);
      if (bc?.kind !== 'joint') continue;
      expect(bc.sign.L, `${id} mirrors (measured)`).toBe(-bc.sign.R);
    }
  });

  it('nothing is still waiting for a visual check', () => {
    // The flag meant "the axis is right, the +/- is a guess". Every guess that
    // outlived it was wrong, so the flag is not a TODO any more -- it is a
    // defect. Anything new that needs one needs a measurement instead.
    const pending = MEASURED.map((m) => m.move).filter((id) => {
      const bc = getBoneControl(id);
      return bc?.kind === 'joint' && bc.needsVisualCheck === true;
    });
    expect(pending, 'measure the direction instead of flagging it').toEqual([]);
  });

  it('covers every joint the rig can drive', () => {
    // An audit that quietly checks a third of the movements reads as a clean
    // bill of health. The table used to hold 8 of 24 drivable joints.
    const ids = new Set(MEASURED.map((m) => m.move));
    const uncovered: string[] = [];
    for (const id of [
      'ankle-dorsiflexion', 'ankle-plantarflexion', 'ankle-inversion', 'ankle-eversion',
      'knee-flexion', 'knee-extension', 'knee-internal-rotation', 'knee-external-rotation',
      'hip-flexion', 'hip-extension', 'hip-abduction', 'hip-adduction',
      'hip-internal-rotation', 'hip-external-rotation',
      'elbow-flexion', 'elbow-extension', 'elbow-pronation', 'elbow-supination',
      'wrist-flexion', 'wrist-extension',
      'glenohumeral-internal-rotation', 'glenohumeral-external-rotation',
    ]) {
      if (!ids.has(id)) uncovered.push(id);
    }
    expect(uncovered, 'measure it with `npm run audit-direction` and add it here').toEqual([]);
  });
});
