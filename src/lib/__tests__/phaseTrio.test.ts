// LOS TRES MUSCULOS DE CADA FASE, SOBRE LOS 34 GESTOS.

import { describe, it, expect } from 'vitest';
import { ALL_ROM_BY_REGION } from '../../data/fullContent';
import { buildLabArc } from '../romPhaseAtAngle';
import { activeMusclesAt } from '../romActivation';
import { phaseCenter, phaseTrio, phaseWhyNote } from '../phaseTrio';
import type { RomMovement, RomPhase } from '../../types/rom';

const MOVIMIENTOS = Object.values(ALL_ROM_BY_REGION)
  .flat()
  .filter((m) => (m.activations?.length ?? 0) > 0);

describe('el trio de una fase', () => {
  it('hay gestos con envolventes que recorrer', () => {
    expect(MOVIMIENTOS.length).toBeGreaterThanOrEqual(30);
  });

  it('son tres como mucho, sin repetidos, y todos del gesto', () => {
    for (const m of MOVIMIENTOS) {
      const arc = buildLabArc(m);
      const ids = new Set(m.activations!.map((a) => a.muscleId));
      for (const p of arc.phases) {
        const t = phaseTrio(m, p, arc);
        expect(t.length, `${m.id} · ${p.label}`).toBeLessThanOrEqual(3);
        expect(new Set(t).size).toBe(t.length);
        for (const id of t) expect(ids.has(id), `${m.id}: ${id}`).toBe(true);
      }
    }
  });

  it('siempre incluye al protagonista que el escenario destaca en el centro de la fase', () => {
    for (const m of MOVIMIENTOS) {
      const arc = buildLabArc(m);
      for (const p of arc.phases) {
        const live = activeMusclesAt(m, phaseCenter(p, arc.min, arc.max));
        const h =
          live.find((x) => x.role === 'prime-mover' || x.role === 'eccentric-control') ?? live[0];
        if (!h) continue;
        expect(phaseTrio(m, p, arc), `${m.id} · ${p.label}`).toContain(h.muscleId);
      }
    }
  });

  it('la primera fila es un motor que la FASE nombra, si nombra alguno que trabaje en su tramo', () => {
    const fuera: string[] = [];
    for (const m of MOVIMIENTOS) {
      const arc = buildLabArc(m);
      for (const p of arc.phases) {
        const t = phaseTrio(m, p, arc);
        const motores = p.muscles.filter((x) => x.role === 'prime-mover').map((x) => x.muscleId);
        const enTrio = motores.filter((id) => t.includes(id));
        if (enTrio.length > 0 && !enTrio.includes(t[0])) fuera.push(`${m.id} · ${p.label}`);
      }
    }
    expect(fuera).toEqual([]);
  });

  it('la abduccion del hombro, medida en la maqueta corregida', () => {
    const abd = MOVIMIENTOS.find((m) => m.id === 'glenohumeral-abduction')!;
    const arc = buildLabArc(abd);
    const elevacion = arc.phases.find((p) => p.startDeg === 120)!;
    expect(phaseTrio(abd, elevacion, arc)).toEqual(['serratus-anterior', 'trapezius', 'deltoid']);
  });
});

describe('la nota del "Por que"', () => {
  const fase = (muscles: RomPhase['muscles']): RomPhase => ({
    startDeg: 0,
    endDeg: 30,
    label: 'Prueba',
    description: '',
    muscles,
    cite: [],
  });
  const mov = (note?: string): RomMovement =>
    ({
      id: 'x',
      activations: [{ muscleId: 'a', role: 'prime-mover', curve: [{ deg: 0, level: 1 }], note }],
    }) as unknown as RomMovement;

  it('la de la fase si se escribio para el mismo papel que se pinta', () => {
    const p = fase([{ muscleId: 'a', role: 'prime-mover', note: 'de la fase' }]);
    expect(phaseWhyNote(mov('de la curva'), p, 'a', 'prime-mover')).toBe('de la fase');
  });

  it('la de la fase si es de asistente: cuenta un aporte y no contradice al motor', () => {
    const p = fase([{ muscleId: 'a', role: 'assistant', note: 'ayuda' }]);
    expect(phaseWhyNote(mov('de la curva'), p, 'a', 'prime-mover')).toBe('ayuda');
  });

  it('si la fase la escribio para OTRO papel, la de la curva', () => {
    const p = fase([{ muscleId: 'a', role: 'stabilizer', note: 'sujeta' }]);
    expect(phaseWhyNote(mov('de la curva'), p, 'a', 'prime-mover')).toBe('de la curva');
    // Sin nota en la curva, la de la fase aunque sea de otro papel.
    expect(phaseWhyNote(mov(), p, 'a', 'prime-mover')).toBe('sujeta');
  });

  it('sin ninguna, null', () => {
    expect(phaseWhyNote(mov(), fase([]), 'a', 'prime-mover')).toBeNull();
  });
});
