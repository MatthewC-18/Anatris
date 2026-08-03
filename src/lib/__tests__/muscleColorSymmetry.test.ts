// A muscle must be the SAME shade on both sides of the body.
//
// The lab jitters each muscle's red so neighbouring bellies separate. That jitter
// used to be keyed on the raw mesh name, and Z-Anatomy names the two sides
// separately ("...ol" / "...or"), so one muscle drew two unrelated shades: the
// supraspinatus came out crimson on the left and salmon on the right, and the
// body read as split down the midline. These are the real runtime mesh-name
// shapes, taken from the shipped rig.

import { describe, it, expect } from 'vitest';
import { colorForMaterialMesh } from '../materialColors';

// A real muscle material name from the rig: Z-Anatomy names its muscle
// materials by ACTION, not by tissue ("Flexion", "Abductor", "Trapezius"...).
const MUSCLE_MAT = 'Flexion';

describe('muscle color symmetry', () => {
  const pairs: [string, string][] = [
    ['Supraspinatus_musclel', 'Supraspinatus_muscler'],
    ['Biceps_brachii_musclel', 'Biceps_brachii_muscler'],
    ['Brachioradialis_musclel', 'Brachioradialis_muscler'],
    ['Anconeus_musclel', 'Anconeus_muscler'],
    ['Ulnar_head_of_flexor_carpi_ulnarisol', 'Ulnar_head_of_flexor_carpi_ulnarisor'],
    ['Pectoralis_major_muscleel', 'Pectoralis_major_muscleer'],
    ['Gluteus_maximus_musclel', 'Gluteus_maximus_muscler'],
    // Where Z-Anatomy forgot the l/r marker, the two sides are told apart only by
    // Blender's duplicate suffix. These are the real names of the abdominal and
    // pectoral sheets that had the body split down the midline.
    ['External_abdominal_oblique_muscle001', 'External_abdominal_oblique_muscle'],
    ['Sternocostal_head_of_pectoralis_major_muscle_2', 'Sternocostal_head_of_pectoralis_major_muscle'],
  ];
  for (const [left, right] of pairs) {
    it(`${left} and ${right} share a shade`, () => {
      const l = colorForMaterialMesh(MUSCLE_MAT, left);
      const r = colorForMaterialMesh(MUSCLE_MAT, right);
      expect(l).not.toBeNull();
      expect(l).toBe(r);
    });
  }

  it('a muscle keeps one shade across belly, origin and insertion', () => {
    const belly = colorForMaterialMesh(MUSCLE_MAT, 'Supraspinatus_musclel');
    const origin = colorForMaterialMesh(MUSCLE_MAT, 'Supraspinatus_muscleol');
    const insertion = colorForMaterialMesh(MUSCLE_MAT, 'Supraspinatus_muscleel');
    expect(origin).toBe(belly);
    expect(insertion).toBe(belly);
  });

  it('still separates DIFFERENT muscles', () => {
    const a = colorForMaterialMesh(MUSCLE_MAT, 'Supraspinatus_musclel');
    const b = colorForMaterialMesh(MUSCLE_MAT, 'Infraspinatus_musclel');
    const c = colorForMaterialMesh(MUSCLE_MAT, 'Teres_major_musclel');
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });
});
