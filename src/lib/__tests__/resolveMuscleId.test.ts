// Clicking a hip/ankle muscle mesh in Explorar must resolve to the right clinical
// card. These are the exact runtime mesh-name shapes (flattened Z-Anatomy: side
// l/r, origin/insertion o/e markers) the viewer passes in.

import { describe, it, expect } from 'vitest';
import { resolveMuscleId } from '../resolveMuscleId';

describe('resolveMuscleId (hip + ankle)', () => {
  const cases: [string, string][] = [
    ['Gluteus_maximus_musclel', 'gluteus-maximus'],
    ['Gluteus_medius_muscleor', 'gluteus-medius'],
    ['Psoas_major', 'psoas-major'],
    ['Adductor_longusol', 'adductor-longus'],
    ['Piriformis_muscler', 'piriformis'],
    ['Quadratus_femoris_muscleel', 'quadratus-femoris'],
    ['Tibialis_anterior_muscleel', 'tibialis-anterior'],
    ['Tibialis_posterior_muscleor', 'tibialis-posterior'],
    ['Fibularis_longus_muscleor', 'fibularis-longus'],
    ['Fibularis_brevis_muscleel', 'fibularis-brevis'],
  ];
  for (const [mesh, id] of cases) {
    it(`${mesh} -> ${id}`, () => {
      expect(resolveMuscleId(mesh)).toBe(id);
    });
  }
});
