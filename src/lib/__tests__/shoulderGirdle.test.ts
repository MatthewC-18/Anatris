// The shoulder GIRDLE: how elevation is shared between the sternoclavicular and
// acromioclavicular joints, and how that reaches the rig.
//
// A physiotherapist reviewing the lab wrote: "el mov de los huesos se atraviesa,
// no se mueve en conjunto". The cause was that the clavicle took no part in the
// movement at all -- the scapula rotated its full ~60 deg on a strut bolted to the
// spine. Every invariant below fails silently if it regresses: the arm still
// lands on the asked angle, and only the girdle looks wrong.

import { describe, it, expect } from 'vitest';
import { shoulderChain, SCAPULAR_PLANE_EFFICIENCY } from '../biomech/shoulderChain';
import { scapulaWrap, SCAPULA_WRAP_SIGN } from '../biomech/scapulaWrap';
import { BONE_MAP } from '../boneMap';

const R2D = 180 / Math.PI;
const ELEVATION = ['glenohumeral-abduction', 'glenohumeral-flexion'] as const;

describe('shoulder girdle', () => {
  describe('the two joints of the girdle share the rotation', () => {
    it('SC + AC always add up to the scapulothoracic total', () => {
      // The scapula bone is a CHILD of the clavicle bone, so the rig adds these
      // two by itself. If they ever stop summing to the total, the blade silently
      // over- or under-rotates against the thorax.
      for (let deg = 0; deg <= 180; deg += 10) {
        const p = shoulderChain(deg, 'R');
        expect(
          p.clavicleElevation + p.scapulaUpwardRot,
          `${deg} deg: SC + AC must equal scapulothoracic`,
        ).toBeCloseTo(p.scapulothoracicUpwardRot, 10);
      }
    });

    it('lands both joints on their textbook totals at full elevation', () => {
      // Inman 1944 / Ludewig 2009 / Neumann: ~30 deg of clavicular elevation at
      // the SC joint, ~30 deg of scapular rotation at the AC, ~60 deg of
      // scapulothoracic upward rotation between them.
      const p = shoulderChain(180, 'R');
      expect(p.scapulothoracicUpwardRot * R2D).toBeGreaterThan(55);
      expect(p.scapulothoracicUpwardRot * R2D).toBeLessThan(65);
      expect(p.clavicleElevation * R2D).toBeGreaterThan(25);
      expect(p.clavicleElevation * R2D).toBeLessThan(35);
      expect(p.scapulaUpwardRot * R2D).toBeGreaterThan(28);
      expect(p.scapulaUpwardRot * R2D).toBeLessThan(38);
    });

    it('spends the clavicle EARLY and the acromioclavicular joint LATE', () => {
      // Inman's description, and the reason this is a phased split rather than a
      // flat fraction: the girdle rises on its clavicle first, then the blade
      // keeps turning on a clavicle that has run out of elevation.
      const early = shoulderChain(60, 'R');
      const late = shoulderChain(180, 'R');
      const earlyShare = early.clavicleElevation / early.scapulothoracicUpwardRot;
      const lateShare = late.clavicleElevation / late.scapulothoracicUpwardRot;
      expect(earlyShare).toBeGreaterThan(0.6); // clavicle leads early
      expect(lateShare).toBeLessThan(0.55); // and has handed over by the top
      expect(earlyShare).toBeGreaterThan(lateShare);
      // More than half the clavicle's whole travel is spent by 100 deg.
      const atHundred = shoulderChain(100, 'R').clavicleElevation;
      expect(atHundred / late.clavicleElevation).toBeGreaterThan(0.5);
    });

    it('never runs the girdle backwards', () => {
      let prevClav = -Infinity;
      let prevTotal = -Infinity;
      for (let deg = 0; deg <= 180; deg += 5) {
        const p = shoulderChain(deg, 'R');
        expect(p.clavicleElevation, `${deg} deg clavicle`).toBeGreaterThanOrEqual(prevClav);
        expect(p.scapulothoracicUpwardRot, `${deg} deg total`).toBeGreaterThanOrEqual(prevTotal);
        expect(p.scapulaUpwardRot, `${deg} deg AC must not go negative`).toBeGreaterThanOrEqual(0);
        prevClav = p.clavicleElevation;
        prevTotal = p.scapulothoracicUpwardRot;
      }
    });

    it('does not ELEVATE the girdle below neutral (adduction / extension)', () => {
      // Nothing rises on the negative arc: no clavicular elevation, no upward
      // rotation of the blade.
      for (const deg of [-10, -30, -60]) {
        const p = shoulderChain(deg, 'R');
        expect(p.clavicleElevation, `${deg} deg`).toBe(0);
        expect(p.scapulaUpwardRot, `${deg} deg`).toBe(0);
      }
    });

    it('PROTRACTS on the horizontal plane below neutral, and retracts above it', () => {
      // The girdle is not idle down there, it just goes the other way: crossing
      // the body is a protraction (see CLAV_PROTRACTION_MAX), which is why the
      // position tests protraction in the clinic. Same axis, opposite sign, so
      // one number carries both.
      expect(shoulderChain(0, 'R').clavicleRetraction).toBe(0);
      expect(shoulderChain(-30, 'R').clavicleRetraction).toBeLessThan(0);
      expect(shoulderChain(90, 'R').clavicleRetraction).toBeGreaterThan(0);
    });

    it('keeps the readout reporting the scapulothoracic total, not the AC share', () => {
      // What a physio measures on a patient is the blade against the thorax. The
      // readout must not start quoting the smaller acromioclavicular number.
      for (const deg of [60, 120, 180]) {
        const p = shoulderChain(deg, 'R');
        expect(p.readout.scapulaDeg, `${deg} deg`).toBeGreaterThan(p.scapulaUpwardRot * R2D);
      }
    });
  });

  // LAS DOS CIFRAS QUE EL PANEL PUBLICABA Y EL HUESO NO HACIA.
  //
  // Las encontro `npm run audit-angles`, midiendo hueso por hueso: el brazo
  // llegaba a su angulo exacto en todo el arco, pero el REPARTO anunciado no era
  // el que el 3D ejecutaba. Un reparto equivocado no se ve — el brazo sube
  // igual —, y es justo lo que un alumno lee del panel.
  describe('el reparto publicado es el que el hueso hace', () => {
    it('proyecta la aportacion de la cintura sobre el plano en que se mide', () => {
      // La paleta gira sobre la perpendicular a SU plano, inclinado 32,8 grados
      // (medido en el GLB). Cada grado de rotacion ascendente eleva el brazo
      // cos(32,8) = 0,84 grados, no uno. La cuenta vieja (`gh = E - escapula`)
      // atribuia a la cintura grados que no entregaba y el 3D los hacia con la
      // glenohumeral: a 90 grados el hueso giraba 71,7 y el panel decia 66,6.
      for (const deg of [30, 60, 90, 120, 150]) {
        const p = shoulderChain(deg, 'R');
        const st = p.scapulothoracicUpwardRot * R2D;
        expect(p.readout.scapulaDeg, `${deg} deg: proyectada, no entera`).toBeLessThan(st);
        expect(p.readout.scapulaDeg, `${deg} deg`).toBeCloseTo(st * SCAPULAR_PLANE_EFFICIENCY, 6);
        // Y la rotacion ascendente en su propio plano se sigue publicando: es la
        // cifra de los libros y la que conduce el rig.
        expect(p.readout.scapulaPlaneDeg, `${deg} deg`).toBeCloseTo(st, 6);
      }
    });

    it('las tres partes siguen sumando el angulo pedido', () => {
      for (const deg of [30, 90, 150, 180]) {
        const p = shoulderChain(deg, 'R');
        const sum = p.readout.ghDeg + p.readout.scapulaDeg + p.readout.trunkDeg;
        expect(sum, `${deg} deg`).toBeCloseTo(deg, 6);
      }
    });

    it('no atribuye al tronco una inclinacion que la flexion no hace', () => {
      // El raquis presta una inclinacion contralateral a la ABDUCCION para acabar
      // de llevar el brazo a la vertical. En la flexion no: ahi seria una
      // extension, y la inclinacion frontal sacaria el cuerpo del plano — por eso
      // `glenohumeral-flexion` no tiene objetivos en el raquis. Pero el reparto
      // publicado le seguia atribuyendo sus 26 grados y se los quitaba a las dos
      // articulaciones (medido a 180: la cintura llevaba el brazo 46,9 grados y el
      // panel anunciaba 70,3).
      const abd = shoulderChain(180, 'R');
      const flex = shoulderChain(180, 'R', undefined, { trunkLean: false });
      expect(abd.readout.trunkDeg).toBeGreaterThan(20);
      expect(flex.readout.trunkDeg).toBe(0);
      expect(flex.thoracicLatFlexPerVert).toBe(0);
      expect(flex.lumbarLatFlexPerVert).toBe(0);
      // Lo que el tronco no pone, lo ponen las articulaciones: el total no cambia.
      expect(flex.readout.ghDeg + flex.readout.scapulaDeg).toBeCloseTo(180, 6);
      expect(flex.readout.ghDeg).toBeGreaterThan(abd.readout.ghDeg);
    });

    it('cada elevacion pide el tronco solo si su control mueve el raquis', () => {
      // La regla que usan el panel y el banco de medida, leida del mapa en vez de
      // nombrar el movimiento: anadir una elevacion nueva no puede volver a
      // desincronizar el reparto publicado de lo que el hueso hace.
      for (const id of ELEVATION) {
        const ctrl = BONE_MAP[id];
        if (ctrl?.kind !== 'chain') continue;
        const movesSpine = ctrl.targets.some((t) => t.target.armature === 'spine');
        const p = shoulderChain(180, 'R', undefined, { trunkLean: movesSpine });
        expect(p.readout.trunkDeg > 0, `${id}: tronco ${movesSpine ? 'si' : 'no'}`).toBe(movesSpine);
      }
      // Y de hecho hoy son una de cada.
      const abd = BONE_MAP['glenohumeral-abduction'];
      const flex = BONE_MAP['glenohumeral-flexion'];
      if (abd?.kind === 'chain') {
        expect(abd.targets.some((t) => t.target.armature === 'spine')).toBe(true);
      }
      if (flex?.kind === 'chain') {
        expect(flex.targets.some((t) => t.target.armature === 'spine')).toBe(false);
      }
    });
  });

  describe('what reaches the rig', () => {
    it('drives the clavicle on both elevation movements', () => {
      for (const id of ELEVATION) {
        const ctrl = BONE_MAP[id];
        expect(ctrl?.kind, id).toBe('chain');
        if (ctrl?.kind !== 'chain') continue;
        const clavTargets = ctrl.targets.filter((t) => t.target.bones.includes('clavicle'));
        expect(clavTargets.length, `${id} must drive the clavicle`).toBe(2);
        // Elevation is the primary rotation and must be composed first.
        expect(clavTargets[0].target.axis, `${id} clavicle elevation axis`).toBe('x');
        expect(clavTargets[1].target.axis, `${id} clavicle retraction axis`).toBe('z');
      }
    });

    it('elevates the clavicle the SAME way on both sides, and retracts it mirrored', () => {
      // Measured on the rig: +20 deg on clavicle local X raises the scapula 5.2 cm
      // on EACH side, so elevation is unsigned. Retraction is in the horizontal
      // plane, where the two mirrored armatures do flip.
      for (const id of ELEVATION) {
        const ctrl = BONE_MAP[id];
        if (ctrl?.kind !== 'chain') continue;
        const r = ctrl.decompose(120, 'R');
        const l = ctrl.decompose(120, 'L');
        expect(l.clavicle, `${id} elevation is unsigned`).toBeCloseTo(r.clavicle, 10);
        expect(l.clavicleRetraction, `${id} retraction is mirrored`)
          .toBeCloseTo(-r.clavicleRetraction, 10);
        expect(Math.abs(r.clavicleRetraction), `${id} retraction must be non-zero`)
          .toBeGreaterThan(0);
      }
    });

    it('publishes the scapulothoracic total WITHOUT making it a rig target', () => {
      // The wrap table is keyed on it, but applying it as a rotation would double
      // the blade's travel. It must be in the outputs and absent from the targets.
      for (const id of ELEVATION) {
        const ctrl = BONE_MAP[id];
        if (ctrl?.kind !== 'chain') continue;
        const outputs = ctrl.decompose(120, 'R');
        expect(outputs.scapulaTotal, `${id} publishes the total`).toBeGreaterThan(0);
        expect(
          ctrl.targets.some((t) => t.key === 'scapulaTotal'),
          `${id} must NOT place scapulaTotal on a bone`,
        ).toBe(false);
        // And it is genuinely bigger than the AC share the scapula bone gets.
        expect(outputs.scapulaTotal).toBeGreaterThan(outputs.scapula);
      }
    });

    it('feeds the wrap table the range it was solved over', () => {
      // Solved against scapulothoracic upward rotation, which tops out ~60.6 deg.
      // If the chain ever fed it the AC share instead, the blade would under-wrap
      // and lift off the ribs -- the exact regression this table was re-solved for.
      const top = shoulderChain(180, 'R').scapulothoracicUpwardRot * R2D;
      const [yTop, zTop] = scapulaWrap(top);
      expect(yTop).toBeGreaterThan(25);
      expect(zTop).toBeLessThan(-30);
      // Monotone and continuous through the arc: a jump here is a visible snap.
      let prevZ = 1;
      for (let up = 0; up <= 65; up += 2.5) {
        const [, z] = scapulaWrap(up);
        expect(z, `${up} deg`).toBeLessThanOrEqual(prevZ + 1e-9);
        prevZ = z;
      }
      expect(scapulaWrap(0)).toEqual([0, 0]);
      expect(SCAPULA_WRAP_SIGN.R).toBe(1);
      expect(SCAPULA_WRAP_SIGN.L).toBe(-1);
    });
  });

  describe('pathology presets still work through the split', () => {
    it('scapular dyskinesis reduces BOTH joints, not just the blade', () => {
      // The preset scales the scapulothoracic contribution; both shares must fall
      // with it, or a dyskinetic shoulder would show a normal-looking clavicle.
      const normal = shoulderChain(120, 'R');
      const dyskinetic = shoulderChain(120, 'R', { scapulaGainMul: 0.6 });
      expect(dyskinetic.scapulothoracicUpwardRot).toBeLessThan(normal.scapulothoracicUpwardRot);
      expect(dyskinetic.clavicleElevation).toBeLessThan(normal.clavicleElevation);
      expect(dyskinetic.scapulaUpwardRot).toBeLessThan(normal.scapulaUpwardRot);
      expect(dyskinetic.clavicleElevation + dyskinetic.scapulaUpwardRot)
        .toBeCloseTo(dyskinetic.scapulothoracicUpwardRot, 10);
    });

    it('a frozen shoulder freezes the girdle at its cap', () => {
      const capped = shoulderChain(180, 'R', { elevationCapDeg: 90 });
      const atCap = shoulderChain(90, 'R');
      expect(capped.clavicleElevation).toBeCloseTo(atCap.clavicleElevation, 10);
      expect(capped.scapulaUpwardRot).toBeCloseTo(atCap.scapulaUpwardRot, 10);
    });
  });
});
