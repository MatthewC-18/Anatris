// EL NOMBRE DE LA FASE DURANTE UN DEMO DE PRUEBA.
//
// Las fases de los datos nombran el motor del gesto activo de pie. Medido en las
// capturas de los demos (15 nov): la extension lumbar pasiva salia como
// "Inicio-medio (erector lumbar)" y "Rango final (multífidos y límite
// facetario)", el Slump con "motor abdominal" y la aprension anterior a 90
// grados con "(deltoides motor)". En una prueba no resistida ese motor no es el
// de la prueba.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nombreDeFase, sinRango } from '../phaseLabel';
import { ALL_ROM_BY_REGION, ALL_TESTS_BY_REGION } from '../../data/fullContent';

describe('nombreDeFase', () => {
  it('quita el motor en un demo de prueba pasivo o sin fuerza declarada', () => {
    expect(nombreDeFase('Inicio-medio (erector lumbar)', 'test:passive-lumbar-extension', {})).toBe('Inicio-medio');
    expect(nombreDeFase('Rango medio (deltoides motor)', 'test:apprehension', { examinerForce: 'applies' })).toBe('Rango medio');
    expect(nombreDeFase('Rango final (multífidos y límite facetario)', 'test:x', null)).toBe('Rango final');
  });

  it('lo deja en una prueba resistida: alli el paciente si contrae', () => {
    expect(nombreDeFase('Rango medio (deltoides motor)', 'test:empty-can', { examinerForce: 'resists' })).toBe(
      'Rango medio (deltoides motor)',
    );
  });

  it('fuera de un demo de prueba es la regla de siempre: solo cae el tramo de grados', () => {
    for (const id of [null, 'neuro:C5']) {
      expect(nombreDeFase('Inicio-medio (erector lumbar)', id, null)).toBe('Inicio-medio (erector lumbar)');
      expect(nombreDeFase('Fase de ajuste (0-30°)', id, null)).toBe('Fase de ajuste');
    }
  });

  it('nunca deja un nombre vacio', () => {
    expect(nombreDeFase('(erector)', 'test:x', null)).toBe('(erector)');
  });

  it('ningun demo de prueba no resistido rotula un parentesis, en ninguna fase del gesto que mueve', () => {
    const fases = new Map<string, string[]>();
    for (const lista of Object.values(ALL_ROM_BY_REGION)) {
      for (const m of lista) fases.set(m.id, (m.phases ?? []).map((p) => p.label));
    }
    const conParentesis: string[] = [];
    for (const tests of Object.values(ALL_TESTS_BY_REGION)) {
      for (const t of tests) {
        if (!t.demo || t.demo.examinerForce === 'resists') continue;
        for (const label of fases.get(t.demo.movementId) ?? []) {
          const visto = nombreDeFase(label, `test:${t.id}`, t.demo);
          if (/\)\s*$/.test(visto)) conParentesis.push(`${t.id}: ${visto}`);
        }
      }
    }
    expect(conParentesis).toEqual([]);
  });

  it('la lectura y la regla del escenario la usan las dos', () => {
    const src = readFileSync('src/components/movement/StageReadout.tsx', 'utf8');
    expect(src.match(/nombreDeFase\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    // Y ninguna escribe ya la fase a pelo con sinRango.
    expect(src).not.toMatch(/\{sinRango\(/);
    expect(sinRango('Fase (0-30°)')).toBe('Fase');
  });
});
