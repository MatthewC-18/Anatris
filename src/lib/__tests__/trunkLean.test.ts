// The trunk bends. It does not tip over in one piece.
//
// A physiotherapist reviewing the elevation arc said the spine moves "en bloque"
// -- "solo se mueve la parte de arriba de la columna y no todo". The data agreed
// with him: the contralateral lean at the top of the arc was placed on five
// upper thoracic vertebrae (T6..T2) and nothing else, so eleven levels below T6
// were a rigid plank and T6 was a hinge. Measured on the shipped GLB with
// `npx tsx --tsconfig tsconfig.scripts.json scripts/measure-trunk-lean.mts 180`,
// the old model moved 5 of 21 levels and left the lumbar spine at 0.00 cm.
//
// The Universite Lyon anatomie3d sequence on the humero-escapulo-raquideo rhythm
// names both blocks that intervene in the trunk's displacement: "el raquis
// lumbar (RL)" and "el raquis toracico (RT)". These tests hold the model to that.

import { describe, it, expect } from 'vitest';
import { shoulderChain } from '../biomech/shoulderChain';
import { getBoneControl } from '../boneMap';

const DEG = Math.PI / 180;
const chainAt = (deg: number, side: 'R' | 'L' = 'R') => shoulderChain(deg, side);
/** Top of the arc, where the raquis is supposed to be doing its share. */
const p180 = chainAt(180);

describe('trunk lean at the top of the elevation arc', () => {
  it('reaches both blocks of the raquis, thoracic AND lumbar', () => {
    const p = chainAt(180);
    expect(Math.abs(p.thoracicLatFlexPerVert), 'thoracic levels must bend').toBeGreaterThan(0);
    expect(Math.abs(p.lumbarLatFlexPerVert), 'lumbar levels must bend').toBeGreaterThan(0);
  });

  it('runs the thoracic block down to T12, not just its top five levels', () => {
    // The whole ribcage participates; the old T6..T2 list is what made everything
    // below T6 a plank.
    expect(p180.thoracicVerts).toContain('vert_T12');
    expect(p180.thoracicVerts).toContain('vert_T1');
    expect(p180.thoracicVerts.length).toBe(12);
  });

  it('spans the whole lumbar spine, L5 to L1', () => {
    expect(p180.lumbarVerts).toEqual([
      'vert_L5', 'vert_L4', 'vert_L3', 'vert_L2', 'vert_L1',
    ]);
  });

  it('bends 17 levels, where it used to bend 5', () => {
    expect(p180.thoracicVerts.length + p180.lumbarVerts.length).toBe(17);
  });

  it('gives a lumbar level about twice the bend of a thoracic one', () => {
    // Regional lateral-flexion capacity: ~25 deg over 5 lumbar levels against
    // ~30 deg over 12 thoracic ones, i.e. roughly 5 deg vs 2.5 deg per level.
    // A FLAT per-vertebra angle would be the same "en bloque" error in a subtler
    // form: it would bend the stiff mid-thorax as hard as the mobile lumbar.
    const ratio = Math.abs(p180.lumbarLatFlexPerVert / p180.thoracicLatFlexPerVert);
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.2);
  });

  it('keeps each level small enough to be a bend and not a kink', () => {
    // Nothing may take a share bigger than the level's own clinical capacity.
    expect(Math.abs(p180.thoracicLatFlexPerVert) / DEG).toBeLessThan(2.5);
    expect(Math.abs(p180.lumbarLatFlexPerVert) / DEG).toBeLessThan(5);
  });

  it('still totals the ~27 deg the readout is partitioned against', () => {
    // The trunk share is carved OUT of the goniometric angle, so changing the
    // total would move the humero/escapula/tronco readout. Redistributing it
    // must not.
    const total =
      (Math.abs(p180.thoracicLatFlexPerVert) * p180.thoracicVerts.length +
        Math.abs(p180.lumbarLatFlexPerVert) * p180.lumbarVerts.length) /
      DEG;
    expect(total).toBeGreaterThan(25);
    expect(total).toBeLessThan(29);
    expect(p180.readout.trunkDeg).toBeCloseTo(total, 5);
  });

  it('leaves the trunk alone below 150 deg', () => {
    for (const deg of [0, 45, 90, 120, 149]) {
      const p = chainAt(deg);
      // `toBe(0)` would trip on the -0 the contralateral sign produces.
      expect(p.thoracicLatFlexPerVert, `${deg} deg`).toBeCloseTo(0, 12);
      expect(p.lumbarLatFlexPerVert, `${deg} deg`).toBeCloseTo(0, 12);
      expect(p.readout.trunkDeg, `${deg} deg`).toBeCloseTo(0, 12);
    }
  });

  it('ramps in rather than switching on', () => {
    const a = chainAt(160).readout.trunkDeg;
    const b = chainAt(170).readout.trunkDeg;
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(p180.readout.trunkDeg).toBeGreaterThan(b);
  });

  it('leans CONTRALATERALLY, and both blocks the same way', () => {
    // The trunk bends AWAY from the rising arm -- that is what lets the arm
    // finish vertical. If the two blocks disagreed in sign the spine would fold
    // into an S instead of a curve.
    const r = chainAt(180, 'R');
    const l = chainAt(180, 'L');
    expect(Math.sign(r.thoracicLatFlexPerVert)).toBe(Math.sign(r.lumbarLatFlexPerVert));
    expect(Math.sign(l.thoracicLatFlexPerVert)).toBe(Math.sign(l.lumbarLatFlexPerVert));
    expect(Math.sign(r.thoracicLatFlexPerVert)).toBe(-Math.sign(l.thoracicLatFlexPerVert));
  });

  it('places both blocks on the rig, on the same axis', () => {
    // A computed lean that never reaches a bone is the state this whole note
    // started from.
    const ctrl = getBoneControl('glenohumeral-abduction');
    expect(ctrl?.kind).toBe('chain');
    if (ctrl?.kind !== 'chain') return;
    const th = ctrl.targets.find((t) => t.key === 'thoracic');
    const lu = ctrl.targets.find((t) => t.key === 'lumbar');
    expect(th, 'thoracic target').toBeDefined();
    expect(lu, 'lumbar target').toBeDefined();
    expect(th!.target.bones).toContain('vert_T12');
    expect(lu!.target.bones).toContain('vert_L5');
    expect(th!.target.axis).toBe(lu!.target.axis);
    expect(th!.target.armature).toBe('spine');
    expect(lu!.target.armature).toBe('spine');
  });

  it('sends the rig a value for every vertebra it lists', () => {
    const ctrl = getBoneControl('glenohumeral-abduction');
    if (ctrl?.kind !== 'chain') throw new Error('not a chain');
    const out = ctrl.decompose(180, 'R');
    expect(out.thoracic).toBeDefined();
    expect(out.lumbar).toBeDefined();
    expect(out.thoracic).not.toBe(0);
    expect(out.lumbar).not.toBe(0);
    // Same direction on the rig, or the column folds.
    expect(Math.sign(out.thoracic!)).toBe(Math.sign(out.lumbar!));
  });

  it('never lists a vertebra the chain does not drive, or vice versa', () => {
    const ctrl = getBoneControl('glenohumeral-abduction');
    if (ctrl?.kind !== 'chain') throw new Error('not a chain');
    const th = ctrl.targets.find((t) => t.key === 'thoracic')!;
    const lu = ctrl.targets.find((t) => t.key === 'lumbar')!;
    // The per-vertebra angle is sized by the list length, so the two must agree.
    expect([...th.target.bones]).toEqual([...p180.thoracicVerts]);
    expect([...lu.target.bones]).toEqual([...p180.lumbarVerts]);
  });
});
