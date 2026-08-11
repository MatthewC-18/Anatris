// Corrections to Z-Anatomy's origin/insertion suffixes.
//
// A physio reviewing the shoulder wrote "Inserción se repite (pectoral) ✗ está
// mal puesta". Both halves were true and both came from the model's own labels:
// the pectoralis major shipped eight insertion markers instead of two, six of
// them on the sternum, and the trapezius had its two attachments inverted.
//
// The expectations below encode what the app's OWN clinical content says, so a
// future edit that "simplifies" the table has to argue with shoulderMuscles.ts
// rather than with a preference.

import { describe, it, expect } from 'vitest';
import {
  resolveAttachmentPart,
  hasAttachmentFix,
  mergeNearbyMarkers,
} from '../attachmentParts';

describe('resolveAttachmentPart', () => {
  it('leaves alone every muscle the model gets right', () => {
    // Measured on the shipped model: deltoid, biceps, triceps and supraspinatus
    // each carry exactly two insertion markers on the muscle's own base, with the
    // origins spread over the heads. Nothing to correct, and correcting anyway
    // would break them.
    for (const id of ['deltoid', 'biceps-brachii', 'triceps-brachii', 'supraspinatus']) {
      expect(hasAttachmentFix(id), id).toBe(false);
      expect(resolveAttachmentPart(id, 'Deltoid_muscleer', 'insertion')).toBe('insertion');
      expect(resolveAttachmentPart(id, 'Clavicular_part_of_deltoid_muscleor', 'origin'))
        .toBe('origin');
    }
  });

  it('sends the pectoralis sternocostal head back to the origin', () => {
    // shoulderMuscles.ts: "Cabeza esternocostal: esternón y cartílagos costales
    // de las seis primeras costillas" -- an ORIGIN. Its markers sit on the
    // breastbone, and the app was labelling them "Inserción: cresta del troquíter".
    for (const mesh of [
      'Sternocostal_head_of_pectoralis_major_musclee1r',
      'Sternocostal_head_of_pectoralis_major_musclee2r',
      'Sternocostal_head_of_pectoralis_major_muscleer',
    ]) {
      expect(resolveAttachmentPart('pectoralis-major', mesh, 'insertion'), mesh)
        .toBe('origin');
    }
  });

  it('keeps the pectoralis its ONE real insertion', () => {
    // The muscle's own marker, out on the humerus. A converging muscle has many
    // origins and one insertion; this is it.
    expect(resolveAttachmentPart('pectoralis-major', 'Pectoralis_major_muscleer', 'insertion'))
      .toBe('insertion');
    expect(resolveAttachmentPart('pectoralis-major', 'Pectoralis_major_muscleor', 'origin'))
      .toBe('origin');
  });

  it('does not touch the pectoralis abdominal part, which is already an origin', () => {
    expect(
      resolveAttachmentPart(
        'pectoralis-major',
        '(Abdominal_part_of_pectoralis_major_muscle)or',
        'origin',
      ),
    ).toBe('origin');
  });

  it('swaps the trapezius, whose two attachments ship inverted', () => {
    // shoulderMuscles.ts gives the origin as the occiput / nuchal ligament /
    // C7-T12 spinous processes and the insertion as the lateral clavicle,
    // acromion and scapular spine. The mesh suffixes say the opposite: the "e"
    // marker sits at the nape and the "o" markers out on the shoulder.
    expect(resolveAttachmentPart('trapezius', 'Ascending_part_of_trapezius_muscleer', 'insertion'))
      .toBe('origin');
    expect(resolveAttachmentPart('trapezius', 'Ascending_part_of_trapezius_muscleor', 'origin'))
      .toBe('insertion');
    expect(resolveAttachmentPart('trapezius', 'Descending_part_of_trapezius_muscleor', 'origin'))
      .toBe('insertion');
  });

  it('never touches parts that are not attachments', () => {
    expect(resolveAttachmentPart('trapezius', 'Trapezius_muscle', 'belly')).toBe('belly');
    expect(resolveAttachmentPart('pectoralis-major', 'Pectoralis_major_tendon', 'tendon'))
      .toBe('tendon');
  });
});

describe('mergeNearbyMarkers', () => {
  const at = (x: number, y: number, z: number, id = '') => ({ position: { x, y, z }, id });

  it('merges point-meshes that mark the SAME landmark', () => {
    const merged = mergeNearbyMarkers([
      at(0.1, 1.4, 0, 'a'),
      at(0.105, 1.402, 0.001, 'b'),
      at(0.108, 1.404, 0, 'c'),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('a');
  });

  it('keeps landmarks that are genuinely distinct', () => {
    // The deltoid really does arise from the clavicle, the acromion AND the
    // scapular spine: three pins, several centimetres apart, all correct.
    const merged = mergeNearbyMarkers([
      at(-0.120, 1.414, -0.011),
      at(-0.166, 1.411, -0.042),
      at(-0.134, 1.390, -0.079),
    ]);
    expect(merged).toHaveLength(3);
  });

  it('is stable and order-preserving', () => {
    const input = [at(0, 0, 0, 'first'), at(1, 0, 0, 'second')];
    expect(mergeNearbyMarkers(input).map((m) => m.id)).toEqual(['first', 'second']);
  });

  it('handles an empty set', () => {
    expect(mergeNearbyMarkers([])).toEqual([]);
  });
});
