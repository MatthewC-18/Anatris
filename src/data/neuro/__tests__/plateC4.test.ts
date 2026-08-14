// C4 has to be PAINTED, not merely listed.
//
// The rule this file exists to keep is the one that made C4 wait: a root that
// appears in the panel and colours nothing is worse than a root that is honestly
// absent. Adding C4 meant three pieces -- the data, the territory on the 2D plate
// and the skin region on the 3D body -- and the failure mode is shipping one.
//
// The skin region is guarded in src/lib/__tests__/neuroSkin.test.ts. This guards
// the plate.

import { describe, it, expect } from 'vitest';
import { PLATES, SEGMENT_PIGMENTS, pigmentFor } from '../plate';

describe('C4 on the upper-limb plate', () => {
  const upper = PLATES['upper-limb'];

  it('is in the reading order, at the proximal end', () => {
    expect(upper.order[0]).toBe('C4');
    expect(upper.order).toEqual(['C4', 'C5', 'C6', 'C7', 'C8', 'T1']);
  });

  it('has a band on BOTH views, not just the one that was easy', () => {
    for (const view of ['anterior', 'posterior'] as const) {
      const bands = upper.bands[view].filter((b) => b.root === 'C4');
      expect(bands.length, `C4 must be painted on the ${view} view`).toBeGreaterThan(0);
    }
  });

  it('takes the cape and leaves the arm to C5', () => {
    // t runs 0 at the shoulder to 1 at the fingertips.
    for (const view of ['anterior', 'posterior'] as const) {
      const c4 = upper.bands[view].filter((b) => b.root === 'C4');
      for (const b of c4) {
        expect(b.rect.t[0]).toBe(0);
        expect(b.rect.t[1], 'C4 must not run down the arm').toBeLessThan(0.2);
      }
      // ...and C5 must have moved down to make room, or the two overlap and the
      // cap is drawn in whichever colour happens to be painted last.
      const c5 = upper.bands[view].filter((b) => b.root === 'C5');
      expect(c5.length).toBeGreaterThan(0);
      for (const b of c5) expect(b.rect.t[0]).toBeGreaterThan(0);
    }
  });

  it('marks the acromioclavicular joint, its ASIA key point', () => {
    expect(upper.pins.some((p) => p.root === 'C4')).toBe(true);
  });

  it('gets a pigment of its own instead of wrapping onto another root’s', () => {
    // The ramp is indexed modulo its length, so a sixth root without a sixth
    // colour comes out the same green as the first.
    expect(SEGMENT_PIGMENTS.length).toBeGreaterThanOrEqual(upper.order.length);
    const used = upper.order.map((r) => pigmentFor('upper-limb', r));
    expect(new Set(used).size, 'every root on the plate needs its own colour').toBe(
      upper.order.length,
    );
  });

  it('no longer tells the reader the cap is out of scope', () => {
    const note = upper.notes.posterior ?? '';
    expect(note).not.toMatch(/fuera de este tamizaje/i);
  });
});
