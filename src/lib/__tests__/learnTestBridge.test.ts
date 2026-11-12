// EL PUENTE DEL PASO "TESTS CLINICOS" AL LABORATORIO.
//
// El paso 4 de Aprender enlaza cada prueba con su ficha y su demostracion en el
// panel de pruebas. Las dos listas se escribieron por separado (ids y nombres
// distintos para la misma maniobra), asi que el enlace depende de una
// resolucion en tres pasos y de una tabla de equivalencias escrita a mano. Lo
// que se fija aqui:
//   - cada equivalencia sale de una prueba que existe en la ruta y apunta a una
//     que EXISTE en el laboratorio de su region (si alguien renombra un id, el
//     enlace no puede quedarse apuntando a la nada: el panel ignora en silencio
//     un id que no conoce);
//   - ninguna equivalencia sobra (si la ruta y el panel llegan a compartir id o
//     nombre, la entrada esconde un cambio de datos y hay que quitarla);
//   - todo lo que el puente enlaza existe;
//   - el orden de la resolucion, con datos sinteticos para no depender de un
//     contenido que se sigue editando.
// La cuenta medida al escribirlo (33 de las 43 pruebas de la ruta con pareja)
// esta en src/lib/learnTestBridge.ts; no se fija aqui a proposito: anadir una
// prueba al laboratorio no debe romper esta bateria.

import { describe, expect, it } from 'vitest';
import { ALL_TESTS_BY_REGION, ALL_TRACK_BY_REGION } from '../../data/fullContent';
import { LEARN_TO_LAB_ALIAS, labTestForLearn, normalizeTestName } from '../learnTestBridge';
import type { OrthopedicTest } from '../../types/orthopedicTest';

const REGIONS = Object.keys(ALL_TRACK_BY_REGION);

/** Una prueba de laboratorio minima: el puente solo lee id y nombre. */
function lab(id: string, name: string): OrthopedicTest {
  return { id, name } as unknown as OrthopedicTest;
}

describe('el puente de la ruta de Aprender al panel de pruebas', () => {
  it('cada equivalencia sale de una prueba de la ruta y llega a una del laboratorio', () => {
    for (const [region, aliases] of Object.entries(LEARN_TO_LAB_ALIAS)) {
      const learnIds = new Set(ALL_TRACK_BY_REGION[region].phases.tests.tests.map((t) => t.id));
      const labIds = new Set((ALL_TESTS_BY_REGION[region] ?? []).map((t) => t.id));
      for (const [learnId, labId] of Object.entries(aliases)) {
        expect(learnIds.has(learnId), `${region}: ${learnId} no esta en la ruta`).toBe(true);
        expect(labIds.has(labId), `${region}: ${labId} no esta en el laboratorio`).toBe(true);
      }
    }
  });

  it('una equivalencia solo existe cuando ni el id ni el nombre bastan', () => {
    for (const [region, aliases] of Object.entries(LEARN_TO_LAB_ALIAS)) {
      const labTests = ALL_TESTS_BY_REGION[region] ?? [];
      for (const learnId of Object.keys(aliases)) {
        const learn = ALL_TRACK_BY_REGION[region].phases.tests.tests.find((t) => t.id === learnId);
        if (!learn) continue; // lo vigila el caso anterior
        const direct =
          labTests.find((t) => t.id === learn.id) ??
          labTests.find((t) => normalizeTestName(t.name) === normalizeTestName(learn.name));
        expect(direct, `${region}: ${learnId} ya se resuelve sin la tabla`).toBeUndefined();
      }
    }
  });

  it('todo lo que enlaza existe en el laboratorio de su region', () => {
    let linked = 0;
    for (const region of REGIONS) {
      const labTests = ALL_TESTS_BY_REGION[region] ?? [];
      for (const t of ALL_TRACK_BY_REGION[region].phases.tests.tests) {
        const found = labTestForLearn(region, t, labTests);
        if (!found) continue;
        linked += 1;
        expect(labTests.some((x) => x.id === found.id)).toBe(true);
      }
    }
    expect(linked).toBeGreaterThan(0);
  });

  it('resuelve por id, despues por nombre normalizado y al final por la tabla', () => {
    const tests = [
      lab('neer', 'Test de Neer'),
      lab('hip-faber', 'FABER (Patrick)'),
      lab('empty-can', 'Lata vacía (Jobe)'),
    ];
    expect(labTestForLearn('shoulder', { id: 'neer', name: 'Prueba de Neer' }, tests)?.id).toBe(
      'neer',
    );
    // El laboratorio prefija el id con la region; el nombre es el mismo salvo
    // mayusculas y signos.
    expect(labTestForLearn('hip', { id: 'faber-patrick', name: 'Faber, patrick' }, tests)?.id).toBe(
      'hip-faber',
    );
    expect(
      labTestForLearn('shoulder', { id: 'jobe', name: 'Prueba de Jobe (lata vacia)' }, tests)?.id,
    ).toBe('empty-can');
  });

  it('no enlaza lo que no reconoce, aunque se parezca', () => {
    const tests = [lab('elbow-flexion-pressure', 'Flexión-compresión del codo')];
    // Flexion del codo (muneca en extension, 1 a 3 min) no es la
    // flexion-compresion del panel (presion sobre el nervio, 60 s).
    expect(
      labTestForLearn(
        'elbow',
        { id: 'elbow-flexion-test', name: 'Test de flexión del codo (túnel cubital)' },
        tests,
      ),
    ).toBeNull();
  });
});
