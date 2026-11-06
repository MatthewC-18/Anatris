// QUE SE VIGILA AQUI. Que ningun paso de caso clinico se pueda responder
// mirando solo de que parte del cuerpo es cada opcion.
//
// El motivo largo esta en src/lib/caseDistractors.ts. El corto: el paso C6 de
// cervical preguntaba que prueba cierra el foramen y ofrecia Spurling, Thomas
// (cadera), McMurray (rodilla) y Jobe (hombro). El estudiante esta mirando un
// cuello; una opcion es cervical y tres no. No hay nada que razonar, y la
// explicacion se iba en decir de que parte del cuerpo eran las otras tres.
//
// Es el mismo defecto que la opcion correcta siempre en la `a` (ver
// caseOptions.test.ts), y es igual de invisible mirando la pantalla: cada
// pregunta, por separado, parece perfectamente bien escrita.
//
// Los casos se importan de su modulo de region, no por `casesForRegion`: esa
// lee el contenido de pago del store que se llena en tiempo de ejecucion, y en
// un test devolveria vacio y la comprobacion pasaria sin mirar nada.

import { describe, expect, it } from 'vitest';
import { buildTestNeedles, normalizeLabel, readStepDistractors } from '../caseDistractors';
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

const namedTestsIn = buildTestNeedles(TESTS);

describe('la deteccion de pruebas en el texto de una opcion', () => {
  it('reconoce el eponimo aunque el rotulo no coincida palabra por palabra', () => {
    // La opcion escribe "Test de Thomas"; el dato dice "Prueba de Thomas".
    expect(namedTestsIn('Test de Thomas').map((n) => n.region)).toEqual(['hip']);
    expect(namedTestsIn('Maniobra de Jobe').map((n) => n.region)).toEqual(['shoulder']);
    expect(namedTestsIn('Elevación de la pierna recta (Lasègue / SLR)').map((n) => n.region))
      .toEqual(['lumbar']);
  });

  it('no inventa pruebas donde solo hay anatomia', () => {
    // La primera version usaba cualquier palabra de cuatro letras o mas, y
    // "ligamento" apuntaba a la biblioteca cervical: el "Ligamento cruzado
    // anterior" del caso de rodilla salia como prueba cervical.
    expect(namedTestsIn('Ligamento cruzado anterior (LCA)')).toEqual([]);
    expect(namedTestsIn('Tendón rotuliano')).toEqual([]);
    expect(namedTestsIn('Dormir con una almohada entre las rodillas')).toEqual([]);
  });

  it('descarta el rotulo que dos regiones comparten', () => {
    // "Valgus stress" es el alias de la prueba de rodilla Y de la de codo, asi
    // que no dice nada sobre la region y no debe contarse como si lo dijera.
    expect(namedTestsIn('Valgus stress')).toEqual([]);
  });

  it('cuando un rotulo contiene a otro, gana el largo', () => {
    // El codo tiene "Estrés en valgo del codo" y la rodilla "Estrés en valgo",
    // que es su prefijo. Sin desempatar, la opcion del codo salia como prueba
    // de las dos regiones a la vez.
    expect(namedTestsIn('Estrés en valgo').map((n) => n.region)).toEqual(['knee']);
    expect(namedTestsIn('Estrés en valgo del codo').map((n) => n.region)).toEqual(['elbow']);
  });

  it('normaliza tildes y puntuacion', () => {
    expect(normalizeLabel('Lata vacía (Jobe)')).toBe('lata vacia jobe');
  });
});

describe('ningun paso se responde solo por la region de las opciones', () => {
  const offenders: string[] = [];
  let asking = 0;
  for (const [region, list] of Object.entries(CASES)) {
    for (const c of list) {
      for (const s of c.steps) {
        const r = readStepDistractors(s, region, namedTestsIn);
        if (!r.asksForATest) continue;
        asking++;
        if (r.answerableByRegionAlone) {
          offenders.push(
            `${region}/${c.id}/${s.id}: la correcta es la unica opcion de ${region} ` +
              `(${r.options.map((o) => `${o.correct ? '*' : ''}${o.named.map((n) => n.region).join('+') || '-'}`).join(' ')})`,
          );
        }
      }
    }
  }

  it('hay pasos que preguntan por una prueba', () => {
    // Si esto baja a 0, alguien borro los pasos en vez de arreglarlos y la
    // comprobacion de abajo pasaria sin mirar nada.
    expect(asking).toBeGreaterThanOrEqual(7);
  });

  it('en todos hay mas de una prueba de la region', () => {
    expect(
      offenders,
      'usa como distractores otras pruebas de la MISMA region, incorrectas para ESTA presentacion',
    ).toEqual([]);
  });
});
