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
import { LUMBOSACRAL_NEURO } from '../neuro/lumbosacral';
import { getBoneControl } from '../../lib/boneMap';
import type { NerveRoot } from '../../types/neuro';

const roots = CERVICAL_NEURO.roots;
const byId = (id: string) => roots.find((r) => r.id === id)!;

// LOS DOS CONJUNTOS, NO SOLO EL CERVICAL.
//
// Este fichero auditaba el miembro superior y dejaba el lumbosacro sin mirar,
// que es exactamente donde estaba el defecto siguiente: su cabecera decia que
// cadera y tobillo "are not riggable" y de ahi salian tres textos negando un
// movimiento que el rig SI conduce. Las reglas generales corren sobre ambos.
const ALL_SETS = [CERVICAL_NEURO, LUMBOSACRAL_NEURO];
const ALL_ROOTS: { set: string; root: NerveRoot }[] = ALL_SETS.flatMap((s) =>
  s.roots.map((root) => ({ set: s.id, root })),
);

describe('cervical myotome demos', () => {
  it('either demonstrates a root or says why it cannot', () => {
    // The honesty pattern the file was built on: no silent gaps.
    for (const { set, root: r } of ALL_ROOTS) {
      const hasDemo = !!r.demo;
      const hasNote = !!r.demoNote && r.demoNote.length > 20;
      expect(hasDemo || hasNote, `${set}/${r.id} must demo or explain`).toBe(true);
    }
  });

  it('only names movements the rig can actually drive', () => {
    for (const { set, root: r } of ALL_ROOTS) {
      if (!r.demo) continue;
      const ctrl = getBoneControl(r.demo.movementId);
      expect(ctrl, `${set}/${r.id}: unknown movement ${r.demo.movementId}`).toBeDefined();
      expect(ctrl?.kind, `${set}/${r.id}: ${r.demo.movementId}`).not.toBe('unsupported');
      for (const c of r.demo.components ?? []) {
        const cc = getBoneControl(c.movementId);
        expect(cc?.kind, `${set}/${r.id}: component ${c.movementId} must be a joint`).toBe(
          'joint',
        );
      }
    }
  });

  // ---------------------------------------------------------------------------
  // EL GUARDIAN QUE FALTABA: una nota no puede NEGAR lo que el rig si hace.
  // ---------------------------------------------------------------------------
  // El fichero vigilaba que un demo no prometiera de mas. No vigilaba lo
  // contrario, y por ahi se colo el defecto mayor del panel: la cabecera de
  // `lumbosacral.ts` se escribio cuando cadera y tobillo todavia no eran
  // regiones completas, y dejo tres raices de cinco sin demo con un motivo
  // FALSO. En pantalla se leia "la flexión de cadera no se puede reproducir
  // aquí" a un fisio que acababa de usar el laboratorio de Cadera, donde esa
  // misma flexión se mueve. Medido el dia del arreglo (`npm run audit-direction`
  // y `npm run audit-angles`, los dos lados): hip-flexion 90 grados, la rodilla
  // avanza 42,2 cm; ankle-dorsiflexion 20 grados, la punta del pie sube 6,1 cm;
  // ankle-plantarflexion 50 grados, baja 10,6 cm.
  //
  // La regla es sobre la CAPACIDAD del modelo, no sobre lo que un demo concreto
  // elige ensenar: "la flexión de muñeca, secundaria en C7, no se muestra aquí"
  // es cierto y legitimo. Lo prohibido es decir que NO SE PUEDE.
  const SPANISH_MOVEMENT: [RegExp, string][] = [
    [/flexión de cadera/i, 'hip-flexion'],
    [/extensión de cadera/i, 'hip-extension'],
    [/abducción de cadera/i, 'hip-abduction'],
    [/dorsiflexión( de tobillo)?/i, 'ankle-dorsiflexion'],
    [/flexión plantar/i, 'ankle-plantarflexion'],
    [/inversión( del pie)?/i, 'ankle-inversion'],
    [/eversión( del pie)?/i, 'ankle-eversion'],
    [/flexión de rodilla/i, 'knee-flexion'],
    [/extensión de rodilla/i, 'knee-extension'],
    [/flexión de codo/i, 'elbow-flexion'],
    [/extensión de codo/i, 'elbow-extension'],
    [/extensión de muñeca/i, 'wrist-extension'],
    [/flexión de muñeca/i, 'wrist-flexion'],
    [/abducción (de|del) hombro/i, 'glenohumeral-abduction'],
  ];
  /** Decir que el MODELO no puede, no que este demo no lo ensene. */
  const DENIES = /no (se )?pued[ae]n? (reproducir|mostrar|hacer|moverse)/i;

  it('ninguna nota niega un movimiento que el rig SI conduce', () => {
    const mentiras: string[] = [];
    for (const { set, root: r } of ALL_ROOTS) {
      const texts = [r.demoNote, r.demo?.note].filter((t): t is string => !!t);
      for (const text of texts) {
        // Frase a frase: una nota puede negar un gesto y nombrar otro que si se
        // ensena, y juntarlas en un solo texto inventaria un fallo.
        for (const sentence of text.split(/(?<=[.;])\s+/)) {
          if (!DENIES.test(sentence)) continue;
          for (const [re, movementId] of SPANISH_MOVEMENT) {
            if (!re.test(sentence)) continue;
            const ctrl = getBoneControl(movementId);
            if (ctrl && ctrl.kind !== 'unsupported') {
              mentiras.push(`${set}/${r.id}: niega "${movementId}", que boneMap SI conduce`);
            }
          }
        }
      }
    }
    expect(
      mentiras,
      'una nota dice que el modelo no puede hacer un movimiento que getBoneControl conduce',
    ).toEqual([]);
  });

  it('las tres raíces lumbosacras recuperadas demuestran su miotoma', () => {
    // El arreglo concreto, por si alguien vuelve a quitar el demo: L2 es el
    // iliopsoas (músculo clave ISNCSCI), L4 el tibial anterior y S1 el tríceps
    // sural, que es lo que ASIA puntúa en esa raíz.
    const lumbo = (id: string) => LUMBOSACRAL_NEURO.roots.find((r) => r.id === id)!;
    expect(lumbo('L2').demo?.movementId).toBe('hip-flexion');
    expect(lumbo('L4').demo?.movementId).toBe('ankle-dorsiflexion');
    expect(lumbo('S1').demo?.movementId).toBe('ankle-plantarflexion');
    // Y ninguna de las tres conserva el demoNote que las dejaba sin demo.
    for (const id of ['L2', 'L4', 'S1']) {
      expect(lumbo(id).demoNote, `${id} ya no necesita excusa`).toBeUndefined();
    }
    // L5 sí: el rig no tiene ningún hueso de los dedos del pie.
    expect(lumbo('L5').demo).toBeUndefined();
    expect(lumbo('L5').demoNote).toBeTruthy();
  });

  it('cada demo se queda dentro del arco que boneMap publica', () => {
    // Un demo que pide más grados de los que el hueso recorre enseña un tope,
    // no el movimiento: se vería la articulación parada bajo una cifra mayor.
    for (const { set, root: r } of ALL_ROOTS) {
      if (!r.demo) continue;
      const ctrl = getBoneControl(r.demo.movementId);
      if (ctrl?.kind !== 'joint') continue;
      expect(
        r.demo.angleDeg,
        `${set}/${r.id}: ${r.demo.movementId} llega a ${ctrl.clinicalRange.max} grados`,
      ).toBeLessThanOrEqual(ctrl.clinicalRange.max);
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
      // SIGN CORRECTED 2026-11-06, and the old measurement here is why it
      // lasted: it was taken in HAND-LOCAL space ("the palm faces local +Z, so
      // +40 on X carries the fingertips toward the dorsum") and the local frame
      // was read backwards. Measured in WORLD space, which is the space the
      // user sees:
      //   - the palm faces the way the body faces (+z): palmar aponeurosis at
      //     z=+5,9 cm, flexor retinaculum at +2,6 against the extensor
      //     retinaculum at +0,6, lumbricals at +5,4;
      //   - driving this bone with sign +1 carries the hand 4,4 cm FORWARD,
      //     which is flexion, so extension is -1.
      // Unsigned between sides: hand_flex local X is not mirrored.
      expect(ctrl.axis).toBe('x');
      expect(ctrl.sign.R).toBe(-1);
      expect(ctrl.sign.L).toBe(-1);
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
