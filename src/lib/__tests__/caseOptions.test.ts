// El fallo que estas pruebas vigilan no se veia en pantalla: cada pregunta de
// un caso clinico, por separado, estaba perfectamente bien. Lo que estaba mal
// era el CONJUNTO -- la respuesta correcta era la opcion `a` en los 38 pasos de
// los 15 casos, asi que el ejercicio se aprobaba pulsando la primera sin leer.

import { describe, expect, it } from 'vitest';
import { optionLetter, shuffledCaseOptions } from '../caseOptions';
import { ALL_CASES_BY_REGION } from '../../data/fullContent';
import type { CaseStep, ClinicalCase } from '../../types/clinicalCase';

const allSteps = (): { caseId: string; step: CaseStep }[] => {
  const out: { caseId: string; step: CaseStep }[] = [];
  for (const list of Object.values(ALL_CASES_BY_REGION as Record<string, ClinicalCase[]>))
    for (const c of list) for (const step of c.steps) out.push({ caseId: c.id, step });
  return out;
};

describe('opciones de un caso clinico', () => {
  it('cada paso tiene exactamente una opcion correcta', () => {
    for (const { caseId, step } of allSteps()) {
      const n = step.options.filter((o) => o.correct).length;
      expect(n, `${caseId}/${step.id}`).toBe(1);
    }
  });

  it('el desorden conserva todas las opciones y solo una correcta', () => {
    for (const { caseId, step } of allSteps()) {
      const shuffled = shuffledCaseOptions(step);
      expect(shuffled.length, `${caseId}/${step.id}`).toBe(step.options.length);
      expect(new Set(shuffled.map((o) => o.id))).toEqual(new Set(step.options.map((o) => o.id)));
      expect(shuffled.filter((o) => o.correct).length).toBe(1);
      // No muta el contenido autoral.
      expect(step.options[0].id).toBe('a');
    }
  });

  it('la correcta no cae siempre en la misma posicion', () => {
    // El fallo original, expresado como prueba. Con un paso de 4 opciones y 300
    // intentos, que la correcta salga siempre en la misma casilla es imposible
    // salvo que nadie este desordenando.
    const step = allSteps().find((s) => s.step.options.length >= 4)?.step;
    expect(step, 'ningun paso con 4 opciones').toBeDefined();
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) {
      seen.add(shuffledCaseOptions(step!).findIndex((o) => o.correct));
    }
    expect(seen.size).toBeGreaterThanOrEqual(step!.options.length);
  });

  it('la letra que se muestra viene de la posicion, no del id', () => {
    expect(optionLetter(0)).toBe('a');
    expect(optionLetter(3)).toBe('d');
  });
});
