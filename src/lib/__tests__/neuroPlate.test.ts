// src/lib/__tests__/neuroPlate.test.ts
//
// The plate is generated, so what needs guarding is not a pixel but the CONTRACT
// the generator relies on. Three things can break it silently and none of them
// throws:
//
//  * a mirrored limb that quietly swaps medial and lateral, so every C8 band ends
//    up on the thumb side of the left arm;
//  * a band whose (t, c) rectangle references a root that is not in the figure's
//    colour ramp, which paints it in the fallback grey and reads as a bug;
//  * a key point pin that lands outside the limb it names.
//
// These are cheap to state and impossible to eyeball on a 150px figure.

import { describe, expect, it } from 'vitest';
import {
  bandPath,
  limbOutline,
  mirrorLimb,
  pointAt,
  sampleLimb,
  type LimbAxis,
} from '../neuroPlate';
import {
  ARM_AXIS,
  FIGURE_MID_X,
  LEG_AXIS,
  PLATES,
  SEGMENT_PIGMENTS,
  pigmentFor,
  type PlateFigure,
  type PlateView,
} from '../../data/neuro/plate';
import { CERVICAL_NEURO } from '../../data/neuro/cervical';
import { LUMBOSACRAL_NEURO } from '../../data/neuro/lumbosacral';

const VIEWS: PlateView[] = ['anterior', 'posterior'];
const AXES: Record<'arm' | 'leg', LimbAxis> = { arm: ARM_AXIS, leg: LEG_AXIS };

/** Every number in a path string, so a path can be range-checked. */
function numbersIn(d: string): number[] {
  return (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

describe('limb sampling', () => {
  it('runs t from 0 to 1 monotonically', () => {
    const s = sampleLimb(ARM_AXIS);
    expect(s.length).toBeGreaterThan(20);
    expect(s[0].t).toBe(0);
    expect(s[s.length - 1].t).toBeCloseTo(1, 6);
    for (let i = 1; i < s.length; i++) expect(s[i].t).toBeGreaterThanOrEqual(s[i - 1].t);
  });

  it('emits unit cross normals', () => {
    for (const axis of [ARM_AXIS, LEG_AXIS]) {
      for (const p of sampleLimb(axis)) {
        expect(Math.hypot(p.nx, p.ny)).toBeCloseTo(1, 6);
      }
    }
  });

  it('points c = +1 AWAY from the midline on both sides of the body', () => {
    // The whole reason `flip` exists: a dermatome is authored once as "lateral"
    // and must land laterally on the left limb too.
    for (const axis of [ARM_AXIS, LEG_AXIS]) {
      const mirrored = mirrorLimb(axis, FIGURE_MID_X, `${axis.id}-l`);
      for (const [a, tag] of [
        [axis, 'authored'],
        [mirrored, 'mirrored'],
      ] as const) {
        // Sample mid-limb, where the limb is unambiguously to one side.
        const [lx] = pointAt(sampleLimb(a), 0.5, 1);
        const [mx] = pointAt(sampleLimb(a), 0.5, -1);
        const centre = pointAt(sampleLimb(a), 0.5, 0)[0];
        const outward = centre > FIGURE_MID_X ? 1 : -1;
        expect((lx - centre) * outward, `${a.id} ${tag} lateral`).toBeGreaterThan(0);
        expect((mx - centre) * outward, `${a.id} ${tag} medial`).toBeLessThan(0);
      }
    }
  });
});

describe('generated paths', () => {
  it('closes every silhouette and band', () => {
    for (const axis of [ARM_AXIS, LEG_AXIS]) {
      expect(limbOutline(axis).endsWith('Z')).toBe(true);
    }
    for (const figure of Object.keys(PLATES) as PlateFigure[]) {
      for (const view of VIEWS) {
        for (const band of PLATES[figure].bands[view]) {
          const d = bandPath(AXES[band.limb], band.rect);
          expect(d.startsWith('M')).toBe(true);
          expect(d.endsWith('Z')).toBe(true);
          expect(numbersIn(d).every(Number.isFinite)).toBe(true);
        }
      }
    }
  });

  it('keeps geometry inside a sane figure box', () => {
    // Bands deliberately overshoot the silhouette (the caller clips them), but a
    // sign error would send one hundreds of units away, off any viewBox.
    for (const figure of Object.keys(PLATES) as PlateFigure[]) {
      for (const view of VIEWS) {
        for (const band of PLATES[figure].bands[view]) {
          for (const n of numbersIn(bandPath(AXES[band.limb], band.rect))) {
            expect(n).toBeGreaterThan(-40);
            expect(n).toBeLessThan(320);
          }
        }
      }
    }
  });
});

describe('plate covers the clinical data', () => {
  const sets = [
    { set: CERVICAL_NEURO, figure: 'upper-limb' as PlateFigure },
    { set: LUMBOSACRAL_NEURO, figure: 'lower-limb' as PlateFigure },
  ];

  it('paints a territory for every root, in both views', () => {
    for (const { set, figure } of sets) {
      for (const view of VIEWS) {
        const painted = new Set(PLATES[figure].bands[view].map((b) => b.root));
        const missing = set.roots.map((r) => r.id).filter((id) => !painted.has(id));
        // Posterior is allowed to omit roots with no posterior territory; anterior
        // must cover every root the panel lists, or a row selects nothing.
        if (view === 'anterior') {
          expect(missing, `${figure} ${view}`).toEqual([]);
        }
      }
    }
  });

  it('gives every painted root a pigment of its own', () => {
    for (const { set, figure } of sets) {
      const order = PLATES[figure].order;
      expect([...order].sort()).toEqual(set.roots.map((r) => r.id).sort());
      const pigments = order.map((r) => pigmentFor(figure, r));
      expect(new Set(pigments).size).toBe(order.length);
      expect(pigments.every((p) => SEGMENT_PIGMENTS.includes(p as never))).toBe(true);
    }
  });

  it('pins every root at a key point, and only at roots that exist', () => {
    for (const { set, figure } of sets) {
      const ids = new Set(set.roots.map((r) => r.id));
      const pins = PLATES[figure].pins;
      expect(pins.map((p) => p.root).sort()).toEqual([...ids].sort());
      for (const p of pins) {
        expect(p.t).toBeGreaterThanOrEqual(0);
        expect(p.t).toBeLessThanOrEqual(1);
        expect(Math.abs(p.c)).toBeLessThanOrEqual(1);
        // A pin must sit ON its limb, so its resolved point has to fall inside
        // the limb's own bounding box.
        const s = sampleLimb(AXES[p.limb]);
        const [x, y] = pointAt(s, p.t, p.c);
        const xs = s.map((q) => q.x);
        const ys = s.map((q) => q.y);
        const pad = 14;
        expect(x).toBeGreaterThan(Math.min(...xs) - pad);
        expect(x).toBeLessThan(Math.max(...xs) + pad);
        expect(y).toBeGreaterThan(Math.min(...ys) - pad);
        expect(y).toBeLessThan(Math.max(...ys) + pad);
      }
    }
  });

  it('carries a short key point for every pin caption', () => {
    for (const { set } of sets) {
      for (const r of set.roots) {
        expect(r.dermatome.keyPointShort, `${r.id} keyPointShort`).toBeTruthy();
        // The caption is one line beside a dot, not a sentence.
        expect(r.dermatome.keyPointShort!.length).toBeLessThan(46);
      }
    }
  });
});
