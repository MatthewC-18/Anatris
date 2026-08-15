// The arm crosses in FRONT of the body, not through it.
//
// Below neutral the abduction arc is cross-body adduction, and the model drove it
// as a pure frontal sweep: the humerus simply kept rotating on the same axis,
// which points it straight at the thorax. On screen the forearm and the hand
// ended up inside the abdomen, seen through the skin -- reported from the lab as
// "el brazo esta por dentro del cuerpo al inicio del movimiento".
//
// Kapandji is explicit that this position does not exist on its own: adduction
// from the reference position is mechanically impossible in the frontal plane,
// and becomes possible only combined with a flexion of 30 to 45 deg (carrying
// the limb in front of the trunk) or with a slight extension (behind it). The
// arc runs into the flexion one, so that combination is now part of the model.
//
// Measured with `npx tsx --tsconfig tsconfig.scripts.json
// scripts/measure-arm-clearance.mts`, deepest penetration of forearm/hand into
// the trunk at -30 deg: 19.4 cm before, 0.3 cm after.

import { describe, it, expect } from 'vitest';
import { shoulderChain } from '../biomech/shoulderChain';
import { getBoneControl } from '../boneMap';

const DEG = Math.PI / 180;
const deg = (rad: number) => rad / DEG;

describe('cross-body adduction borrows the flexion that makes it possible', () => {
  it('is exactly zero at neutral and above, so the whole positive arc is untouched', () => {
    for (const d of [0, 1, 30, 90, 150, 180]) {
      expect(shoulderChain(d).crossBodyFlex, `${d} deg must not flex`).toBe(0);
    }
  });

  it('lands inside Kapandji 30-45 deg band at the end of the arc', () => {
    const f = deg(shoulderChain(-30).crossBodyFlex);
    expect(f).toBeGreaterThanOrEqual(30);
    expect(f).toBeLessThanOrEqual(45);
  });

  it('ramps in with the adduction rather than switching on', () => {
    const seq = [-5, -10, -20, -30].map((d) => shoulderChain(d).crossBodyFlex);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i], 'more adduction must mean more flexion').toBeGreaterThan(seq[i - 1]);
    }
  });

  it('LEADS the adduction instead of tracking it', () => {
    // Proportional was the first shape and it made the MIDDLE of the arc the
    // worst place on it: the trunk is in the way from the first degree of
    // crossing, so the room has to be made early. Half way down the arc the
    // flexion must already be well past half its final value.
    const half = shoulderChain(-15).crossBodyFlex;
    const full = shoulderChain(-30).crossBodyFlex;
    expect(half / full).toBeGreaterThan(0.6);
  });

  it('brings the girdle with it: the clavicle PROTRACTS', () => {
    // The borrowed flexion rotates the limb about the shoulder, which buys the
    // hand far more clearance than the elbow half way along the lever. The
    // protraction translates the whole limb forward, elbow included.
    expect(shoulderChain(-30).clavicleRetraction).toBeLessThan(0);
    expect(shoulderChain(-15).clavicleRetraction).toBeLessThan(0);
    expect(shoulderChain(0).clavicleRetraction).toBe(0);
  });

  it('is the same on both sides -- the trunk is in the way either way', () => {
    expect(shoulderChain(-30, 'R').crossBodyFlex).toBeCloseTo(
      shoulderChain(-30, 'L').crossBodyFlex,
      12,
    );
  });

  it('reaches the rig through the abduction chain, and only that one', () => {
    const abd = getBoneControl('glenohumeral-abduction');
    expect(abd?.kind).toBe('chain');
    if (abd?.kind !== 'chain') return;
    const out = abd.decompose(-30, 'R');
    expect(out.crossBodyFlex, 'abduction must publish it').toBeGreaterThan(0);
    // The sagittal arc's negative branch is EXTENSION, which clears the trunk by
    // going behind it, so it must not borrow this.
    const flx = getBoneControl('glenohumeral-flexion');
    if (flx?.kind === 'chain') {
      expect(flx.decompose(-30, 'R').crossBodyFlex).toBeUndefined();
    }
  });

  it('the HIP has the same problem, and the same answer', () => {
    // The other leg is what stops frontal adduction there. Measured with
    // scripts/measure-limb-collision.mts before the coupling: 8.2 cm of moving
    // thigh inside the stance thigh at 15 deg of a 20 deg arc; 0.0 cm after.
    const hip = getBoneControl('hip-adduction');
    expect(hip?.kind).toBe('joint');
    if (hip?.kind !== 'joint') return;
    const cross = hip.couplings?.find((c) => c.bone === 'femur_base' && c.axis === 'x');
    expect(cross, 'the femur must take a cross-over flexion').toBeDefined();
    if (!cross) return;

    const D = Math.PI / 180;
    expect(cross.follow(0), 'nothing at neutral').toBe(0);
    // Ramps, leads, and tops out inside a sane flexion for a cross-over step.
    const half = Math.abs(cross.follow(10 * D * hip.sign.R));
    const full = Math.abs(cross.follow(20 * D * hip.sign.R));
    expect(full / D).toBeGreaterThan(15);
    expect(full / D).toBeLessThanOrEqual(30);
    expect(half / full).toBeGreaterThan(0.6);
    // FORWARD on both sides. hip-flexion and hip-adduction share a sign map, so
    // a coupling proportional to the signed adduction is already a flexion.
    expect(Math.sign(cross.follow(20 * D * hip.sign.R))).toBe(hip.sign.R);
    expect(Math.sign(cross.follow(20 * D * hip.sign.L))).toBe(hip.sign.L);
    const flexion = getBoneControl('hip-flexion');
    if (flexion?.kind === 'joint') {
      expect(flexion.bone, 'same bone').toBe('femur_base');
      expect(flexion.axis, 'same axis').toBe('x');
      expect(flexion.sign).toEqual(hip.sign);
    }
  });

  it('is NOT placed on a bone: the aim owns it', () => {
    // aimPlane rebuilds the humeral shaft from the REST pose and keeps its
    // out-of-plane component, so a flexion written to humerus_gh here would be
    // aimed straight back out. The runtime reads the published value instead.
    const abd = getBoneControl('glenohumeral-abduction');
    if (abd?.kind !== 'chain') return;
    expect(abd.targets.some((t) => t.key === 'crossBodyFlex')).toBe(false);
    expect(abd.aimPlane).toBe('z');
  });
});
