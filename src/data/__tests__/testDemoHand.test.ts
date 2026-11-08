// EL CERO CLINICO DEL COMPONENTE, Y LA MANO QUE DEPENDE DE EL.
//
// Tres pruebas de hombro se distinguen por la ORIENTACION DE LA MANO y no por el
// angulo del brazo: la lata vacia (Jobe) va con el pulgar hacia abajo, la
// primera fase de O'Brien tambien, y Speed va con la palma arriba. Eso dependia
// de dos cosas que estaban mal:
//
//  1. El GLB reposa SUPINADO. Una pronacion de 80 grados aplicada desde ahi
//     dejaba el antebrazo a mitad de camino, asi que "pulgar abajo" nunca
//     llegaba a verse. `ExamPosture.zeroPoint` marca la postura que es el CERO
//     clinico del movimiento (no una postura de lectura como el codo a 90) y
//     RigModel la aplica antes del angulo del componente.
//  2. Con el cero puesto, la pronacion de la lata vacia DUPLICABA la rotacion
//     interna del hombro: medido, el pulgar salia +5,6 cm ARRIBA. Jobe se
//     quedo solo con la rotacion interna y volvio a -7,2 cm.
//
// `npm run audit-demo-hand` mide esto en el rig de verdad. Esta prueba guarda
// el DATO, que es lo que se rompe al editar: sin el cero clinico, o con la
// pronacion de vuelta, el modelo vuelve a ensenar la mano al contrario de lo
// que dice el texto de la maniobra.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ALL_TESTS_BY_REGION } from '../fullContent';
import { getBoneControl } from '../../lib/boneMap';

const test = (id: string) =>
  Object.values(ALL_TESTS_BY_REGION)
    .flat()
    .find((t) => t.id === id);

describe('la mano de los demos resistidos', () => {
  it('la pronosupinacion declara su cero clinico', () => {
    for (const id of ['elbow-pronation', 'elbow-supination']) {
      const c = getBoneControl(id);
      expect(c, id).toBeTruthy();
      const zero = (c?.posture ?? []).filter((p) => p.zeroPoint);
      expect(zero.length, `${id} necesita un cero clinico`).toBeGreaterThan(0);
      // Y ese cero es la posicion NEUTRA del antebrazo, no el codo a 90, que es
      // solo la postura de lectura del goniometro.
      expect(zero.some((p) => p.bone === 'forearm_rot'), id).toBe(true);
    }
  });

  it('el codo a 90 NO es un cero clinico', () => {
    // Si lo fuera, cualquier demo que use la pronacion como componente doblaria
    // el codo por su cuenta y cambiaria la maniobra que se esta ensenando.
    const c = getBoneControl('elbow-flexion');
    const zero = (c?.posture ?? []).filter((p) => p.zeroPoint);
    expect(zero.length).toBe(0);
  });

  it('la lata vacia no duplica la rotacion interna con una pronacion', () => {
    const d = test('empty-can')?.demo;
    expect(d).toBeTruthy();
    const ids = (d?.components ?? []).map((c) => c.movementId);
    expect(ids).toContain('glenohumeral-internal-rotation');
    // Medido: con la pronacion el pulgar sale ARRIBA (+5,6 cm), al contrario de
    // la maniobra. En abduccion los dos ejes se suman, no se componen.
    expect(ids).not.toContain('elbow-pronation');
  });

  it('O’Brien y Speed conservan el antebrazo que los distingue', () => {
    const ob = (test('obrien')?.demo?.components ?? []).map((c) => c.movementId);
    expect(ob).toContain('elbow-pronation');
    const sp = (test('speed')?.demo?.components ?? []).map((c) => c.movementId);
    expect(sp).toContain('elbow-supination');
  });

  it('existe el banco que vigila la orientacion de la mano', () => {
    // El comentario de shoulder.ts cita `npm run audit-demo-hand` como la
    // medida que justifica haber quitado la pronacion. Una cita a un script que
    // no existe es peor que no citar nada.
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['audit-demo-hand']).toContain('scripts/audit-demo-hand.mts');
  });
});
