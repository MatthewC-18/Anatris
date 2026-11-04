// src/lib/__tests__/caseEvidence.test.ts
//
// QUE SE VIGILA AQUI. Un paso de caso clinico puede apuntar a una prueba
// ortopedica por su id (`showsTest`), y ese id es una cadena suelta: nada en el
// compilador impide escribir 'lachmann' o apuntar al test de otra region. El
// precio del fallo es silencioso -- el bloque de evidencia simplemente no se
// dibuja -- asi que no se notaria hasta que alguien abriese ese caso concreto.
//
// Tambien se comprueba que la prueba enlazada tenga algo que ENSEÑAR: numeros y
// cita. Enlazar una ficha vacia es peor que no enlazar nada, porque promete una
// evidencia que no esta.

import { describe, expect, it } from 'vitest';
import type { ClinicalCase } from '../../types/clinicalCase';
import type { OrthopedicTest } from '../../types/orthopedicTest';
import { SHOULDER_CASES } from '../../data/cases/shoulder';
import { ANKLE_CASES } from '../../data/cases/ankle';
import { CERVICAL_CASES } from '../../data/cases/cervical';
import { ELBOW_CASES } from '../../data/cases/elbow';
import { HIP_CASES } from '../../data/cases/hip';
import { KNEE_CASES } from '../../data/cases/knee';
import { LUMBAR_CASES } from '../../data/cases/lumbar';
import { THORACIC_CASES } from '../../data/cases/thoracic';
import { SHOULDER_ORTHOPEDIC_TESTS } from '../../data/orthopedicTests/shoulder';
import { ANKLE_ORTHOPEDIC_TESTS } from '../../data/orthopedicTests/ankle';
import { CERVICAL_ORTHOPEDIC_TESTS } from '../../data/orthopedicTests/cervical';
import { ELBOW_ORTHOPEDIC_TESTS } from '../../data/orthopedicTests/elbow';
import { HIP_ORTHOPEDIC_TESTS } from '../../data/orthopedicTests/hip';
import { KNEE_ORTHOPEDIC_TESTS } from '../../data/orthopedicTests/knee';
import { LUMBAR_ORTHOPEDIC_TESTS } from '../../data/orthopedicTests/lumbar';
import { THORACIC_ORTHOPEDIC_TESTS } from '../../data/orthopedicTests/thoracic';
import { REFERENCES } from '../../data/references';
import { labTestHref } from '../caseEvidence';

/**
 * Casos y pruebas de las OCHO regiones, importados directo del modulo de cada
 * region. No se usa `casesForRegion` / `testsForRegion` a proposito: esas dos
 * leen el contenido de pago del store que se llena en tiempo de ejecucion, y en
 * un test eso devolveria vacio y la comprobacion pasaria sin mirar nada.
 */
const CASES: Record<string, ClinicalCase[]> = {
  shoulder: SHOULDER_CASES,
  ankle: ANKLE_CASES,
  cervical: CERVICAL_CASES,
  elbow: ELBOW_CASES,
  hip: HIP_CASES,
  knee: KNEE_CASES,
  lumbar: LUMBAR_CASES,
  thoracic: THORACIC_CASES,
};

const TESTS: Record<string, OrthopedicTest[]> = {
  shoulder: SHOULDER_ORTHOPEDIC_TESTS,
  ankle: ANKLE_ORTHOPEDIC_TESTS,
  cervical: CERVICAL_ORTHOPEDIC_TESTS,
  elbow: ELBOW_ORTHOPEDIC_TESTS,
  hip: HIP_ORTHOPEDIC_TESTS,
  knee: KNEE_ORTHOPEDIC_TESTS,
  lumbar: LUMBAR_ORTHOPEDIC_TESTS,
  thoracic: THORACIC_ORTHOPEDIC_TESTS,
};

interface Link {
  region: string;
  caseId: string;
  stepId: string;
  testId: string;
}

const LINKS: Link[] = Object.entries(CASES).flatMap(([region, cases]) =>
  cases.flatMap((c) =>
    c.steps
      .filter((s) => s.showsTest)
      .map((s) => ({ region, caseId: c.id, stepId: s.id, testId: s.showsTest! })),
  ),
);

describe('casos clínicos → pruebas ortopédicas', () => {
  it('hay enlaces que comprobar (si no, este archivo no vigila nada)', () => {
    expect(LINKS.length).toBeGreaterThan(0);
  });

  it('cada showsTest nombra una prueba de SU MISMA región', () => {
    const rotos = LINKS.filter(
      (l) => !(TESTS[l.region] ?? []).some((t) => t.id === l.testId),
    );
    expect(
      rotos.map((l) => `${l.region}/${l.caseId}/${l.stepId} -> ${l.testId}`),
    ).toEqual([]);
  });

  it('la prueba enlazada trae cifras y cita, que es lo que se promete', () => {
    const vacias: string[] = [];
    for (const l of LINKS) {
      const t = (TESTS[l.region] ?? []).find((x) => x.id === l.testId);
      if (!t) continue;
      const sinCifra = t.metrics.sensitivity == null && t.metrics.specificity == null;
      const sinCita = t.cite.length === 0;
      if (sinCifra || sinCita)
        vacias.push(`${l.caseId}/${l.stepId} -> ${l.testId}${sinCifra ? ' (sin cifras)' : ''}${sinCita ? ' (sin cita)' : ''}`);
    }
    expect(vacias).toEqual([]);
  });

  it('cada cita de una prueba enlazada existe en la bibliografía', () => {
    const huerfanas: string[] = [];
    for (const l of LINKS) {
      const t = (TESTS[l.region] ?? []).find((x) => x.id === l.testId);
      for (const c of t?.cite ?? []) if (!REFERENCES[c.ref]) huerfanas.push(`${t!.id} -> ${c.ref}`);
    }
    expect(huerfanas).toEqual([]);
  });

  it('el enlace al laboratorio apunta a la región del caso', () => {
    expect(labTestHref('knee', 'lachman')).toBe('/rodilla/movimiento?prueba=lachman');
    expect(labTestHref('shoulder', 'empty-can')).toBe('/hombro/movimiento?prueba=empty-can');
  });
});
