// src/lib/phaseTrio.ts
//
// LOS TRES MUSCULOS QUE CUENTAN UNA FASE.
//
// El margen enseñaba la lista entera del gesto (hasta 11 filas con su barra) y
// nadie la leia. El rediseño pone TRES por fase, cada uno con la curva de todo
// el arco; los demas, detras de "Ver los N". Reglas, tras dos revisiones
// adversariales de la maqueta:
//
//   QUIENES. Los tres de mayor activacion MEDIA en el tramo de la fase (grado a
//   grado, de su inicio a su fin), no los de este grado: asi el trio no cambia
//   DENTRO de una fase y las filas no saltan mientras el brazo sube. Y el
//   protagonista de la fase (el que el escenario destaca: el primer motor o
//   freno de su centro) entra siempre: si no esta entre los tres, ocupa el
//   tercer sitio.
//
//   EN QUE ORDEN. Primero por el papel que la FASE le da en su texto (motor,
//   freno, asistente, estabilizador; los que la fase no nombra, al final) y
//   luego por la media. Asi la primera fila es la que la frase de la fase
//   nombra, aunque otro musculo tenga mas porcentaje en un grado concreto.
//
//   CON QUE ROTULO Y QUE CIFRA. Los de la ENVOLVENTE en el grado actual, con el
//   papel segun el signo (`activeMusclesAt`): son los mismos que pintan el
//   contorno del modelo y las etiquetas del escenario. El margen y el cuerpo no
//   pueden decir dos cosas distintas del mismo musculo en el mismo fotograma.

import type { RomMovement, RomPhase, RomMuscleRole } from '../types/rom';
import { ACTIVE_EPS, activationFor, activeMusclesAt, levelAt } from './romActivation';
import { ROLE_ORDER } from './romRolePalette';

/** El protagonista entre los que trabajan: el primer motor o freno, o el primero. */
function protagonist<T extends { role: RomMuscleRole }>(live: readonly T[]): T | null {
  return live.find((m) => m.role === 'prime-mover' || m.role === 'eccentric-control') ?? live[0] ?? null;
}

/** El grado central de la parte de la fase que el arco permite. */
export function phaseCenter(phase: Pick<RomPhase, 'startDeg' | 'endDeg'>, min: number, max: number): number {
  return Math.round((Math.max(phase.startDeg, min) + Math.min(phase.endDeg, max)) / 2);
}

/** Activacion media de cada musculo del gesto en el tramo de la fase, grado a grado. */
export function meanLevelsIn(movement: RomMovement, phase: Pick<RomPhase, 'startDeg' | 'endDeg'>): Map<string, number> {
  const out = new Map<string, number>();
  for (const a of movement.activations ?? []) {
    let s = 0;
    let n = 0;
    for (let d = phase.startDeg; d <= phase.endDeg; d++) {
      s += levelAt(a.curve, d);
      n++;
    }
    out.set(a.muscleId, n > 0 ? s / n : 0);
  }
  return out;
}

/**
 * Los tres musculos de una fase, ya ordenados (ver la cabecera). Vacio si el
 * gesto no trae envolventes: entonces el margen pinta la lista de la fase.
 */
export function phaseTrio(
  movement: RomMovement,
  phase: RomPhase,
  arc: { min: number; max: number },
): string[] {
  if (!movement.activations?.length) return [];
  const mean = meanLevelsIn(movement, phase);
  const ids = [...mean.entries()]
    .filter(([, m]) => m > ACTIVE_EPS)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 3)
    .map(([id]) => id);
  const h = protagonist(activeMusclesAt(movement, phaseCenter(phase, arc.min, arc.max)));
  if (h && !ids.includes(h.muscleId)) ids[Math.min(2, ids.length)] = h.muscleId;
  const phaseRole = (id: string) => {
    const pm = phase.muscles.find((x) => x.muscleId === id);
    return pm ? ROLE_ORDER.indexOf(pm.role) : ROLE_ORDER.length;
  };
  return ids.sort(
    (a, b) => phaseRole(a) - phaseRole(b) || (mean.get(b) ?? 0) - (mean.get(a) ?? 0),
  );
}

/**
 * La nota del "Por que" de un musculo del trio.
 *
 * La de la FASE si se escribio para el mismo papel que se pinta, o para un
 * asistente (una nota de asistente cuenta un aporte, no un liderazgo, y no
 * contradice a un rotulo de motor). Si no, la de la ENVOLVENTE. Si no, la de la
 * fase aunque sea de otro papel. Si no hay ninguna, null: el margen dice que el
 * dato no trae nota y deja el papel.
 */
export function phaseWhyNote(
  movement: RomMovement,
  phase: RomPhase,
  muscleId: string,
  roleNow: RomMuscleRole,
): string | null {
  const pm = phase.muscles.find((x) => x.muscleId === muscleId);
  if (pm?.note && (pm.role === roleNow || pm.role === 'assistant')) return pm.note;
  const env = activationFor(movement, muscleId);
  if (env?.note) return env.note;
  return pm?.note ?? null;
}
