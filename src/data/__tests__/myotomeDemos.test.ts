// Myotome demos have to SHOW the myotome they name.
//
// A physiotherapist checked the cervical roots one by one and wrote three lines:
// "C5 no hay flexión de codo", "C6 no hace extensión de muñeca", "C7 no hay
// extensión de codo". All three were true, and none was a data error -- the text
// listed the right movements. What failed was the demo:
//
//   C5 posed shoulder abduction alone, though the myotome is deltoid AND biceps.
//   C6 posed elbow flexion with a note saying the wrist could not be reproduced;
//      the wrist bone was in the rig all along and had simply never been mapped.
//   C7 posed `elbow-extension` at 120 deg and HELD there -- and because 0 deg is
//      the straight elbow, holding at 120 shows a bent one under the label
//      "extensión de codo".

import { describe, it, expect } from 'vitest';
import { CERVICAL_NEURO } from '../neuro/cervical';
import { getBoneControl } from '../../lib/boneMap';

const roots = CERVICAL_NEURO.roots;
const byId = (id: string) => roots.find((r) => r.id === id)!;

describe('cervical myotome demos', () => {
  it('either demonstrates a root or says why it cannot', () => {
    // The honesty pattern the file was built on: no silent gaps.
    for (const r of roots) {
      const hasDemo = !!r.demo;
      const hasNote = !!r.demoNote && r.demoNote.length > 20;
      expect(hasDemo || hasNote, `${r.id} must demo or explain`).toBe(true);
    }
  });

  it('only names movements the rig can actually drive', () => {
    for (const r of roots) {
      if (!r.demo) continue;
      const ctrl = getBoneControl(r.demo.movementId);
      expect(ctrl, `${r.id}: unknown movement ${r.demo.movementId}`).toBeDefined();
      expect(ctrl?.kind, `${r.id}: ${r.demo.movementId}`).not.toBe('unsupported');
      for (const c of r.demo.components ?? []) {
        const cc = getBoneControl(c.movementId);
        expect(cc?.kind, `${r.id}: component ${c.movementId} must be a joint`).toBe('joint');
      }
    }
  });

  it('carries C4, and is honest that it has no key muscle', () => {
    // The physio's note was "no estan todos los dermas y mios". C4 was missing
    // because the ASIA MOTOR screen starts at C5 -- it assigns C4 no key muscle --
    // but that is an argument about myotomes, and C4 has a sensory key point that
    // matters in a shoulder module: the acromioclavicular joint. It is here as a
    // SENSORY root, and the motor gap is stated rather than filled with a demo
    // that would be inventing a myotome.
    const c4 = byId('C4');
    expect(c4, 'C4 must exist').toBeDefined();
    expect(c4.dermatome.keyPoint).toMatch(/acromioclavicular/i);
    expect(c4.demo, 'C4 must not fake a motor demo').toBeUndefined();
    expect(c4.demoNote ?? '').toMatch(/ASIA/);
    expect(c4.reflex, 'C4 has no deep tendon reflex of its own').toBeUndefined();
    // And it must come FIRST: the roots are read as a descent down the limb.
    expect(roots[0].id).toBe('C4');
  });

  it('C5 shows the elbow flexing, not only the shoulder abducting', () => {
    // The myotome is "abducción del hombro y flexión de codo" -- both key muscles
    // of the root. Abduction alone is half a myotome.
    const c5 = byId('C5');
    expect(c5.myotome.action).toMatch(/flexión de codo/i);
    const comps = (c5.demo?.components ?? []).map((c) => c.movementId);
    expect(comps, 'C5 must hold the elbow flexed').toContain('elbow-flexion');
  });

  it('C6 demonstrates WRIST EXTENSION, its key movement', () => {
    // The ASIA key muscle group for C6 is the wrist extensors, and the demo used
    // to show elbow flexion instead -- which is C5's, shared.
    const c6 = byId('C6');
    expect(c6.myotome.action).toMatch(/extensión de muñeca/i);
    expect(c6.demo?.movementId).toBe('wrist-extension');
    const ctrl = getBoneControl('wrist-extension');
    expect(ctrl?.kind).toBe('joint');
    if (ctrl?.kind === 'joint') {
      expect(ctrl.bone).toBe('hand_flex');
      // MEASURED on the shipped GLB: the palm faces hand-local +Z (palmar
      // structures at z=+1.8 cm, dorsal at 0), and +40 deg on X carries the
      // fingertips 5 cm toward the dorsum. Unsigned between sides.
      expect(ctrl.axis).toBe('x');
      expect(ctrl.sign.R).toBe(1);
      expect(ctrl.sign.L).toBe(1);
    }
  });

  it('C6 keeps the hand in view while the wrist moves', () => {
    // A wrist extending at the end of a hanging arm is the same invisibility that
    // made the shoulder rotations unreadable.
    const comps = (byId('C6').demo?.components ?? []).map((c) => c.movementId);
    expect(comps).toContain('elbow-flexion');
  });

  it('C7 ends with the elbow STRAIGHT, because that is what extension is', () => {
    const c7 = byId('C7');
    expect(c7.demo?.movementId).toBe('elbow-extension');
    const ctrl = getBoneControl('elbow-extension');
    expect(ctrl?.kind).toBe('joint');
    if (ctrl?.kind === 'joint') {
      // Without this the sweep runs 0 -> target and holds at the target, i.e. it
      // holds a BENT elbow while naming extension.
      expect(ctrl.arcFrom, 'elbow extension must start from the flexed end').toBe('max');
    }
  });

  it('gives the same treatment to knee extension, which shares its arc too', () => {
    const knee = getBoneControl('knee-extension');
    expect(knee?.kind).toBe('joint');
    if (knee?.kind === 'joint') expect(knee.arcFrom).toBe('max');
  });

  it('does not mark a normal movement as starting from its far end', () => {
    for (const id of ['elbow-flexion', 'knee-flexion', 'wrist-extension', 'wrist-flexion']) {
      const c = getBoneControl(id);
      if (c?.kind === 'joint') expect(c.arcFrom, id).toBeUndefined();
    }
  });

  it('drives the wrist in opposite directions for flexion and extension', () => {
    const ext = getBoneControl('wrist-extension');
    const flex = getBoneControl('wrist-flexion');
    if (ext?.kind !== 'joint' || flex?.kind !== 'joint') throw new Error('not joints');
    expect(ext.bone).toBe(flex.bone);
    expect(ext.axis).toBe(flex.axis);
    expect(ext.sign.R).toBe(-flex.sign.R);
    expect(ext.sign.L).toBe(-flex.sign.L);
  });
});
