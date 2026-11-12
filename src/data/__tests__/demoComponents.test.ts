// UN COMPONENTE NO PUEDE REPETIR LO QUE LA POSTURA DE LA BASE YA HACE.
//
// "En los tests el atlas se comienza a salir: los huesos por donde no son." Las
// rotaciones de hombro se leen con el codo a 90: es su POSTURA de exploracion
// (`ELBOW_AT_90` en src/lib/boneMap.ts) y RigModel la aplica en cualquier angulo.
// Dos pruebas --press abdominal y retardo en rotacion externa-- tienen una
// rotacion como movimiento base y ademas declaraban un componente
// `elbow-flexion` a 90. El componente se COMPONE encima de la postura (mismo
// hueso, `forearm_flex`), asi que el codo acababa doblado dos veces.
//
// MEDIDO en el rig (angulo real entre brazo y antebrazo): la rotacion sola deja
// el codo en 106,8 grados; con el componente de mas, 156,3: el antebrazo
// plegado contra el brazo, atravesando el biceps, y la mano del press abdominal
// metida en el abdomen (`npm run audit-demo-path`: el 13,3% del antebrazo y la
// mano dentro del tronco en la posicion de la prueba).
//
// La regla: ningun componente puede mover un hueso que la postura de su
// movimiento base ya sostiene. Lo que la postura marca como CERO clinico
// (`zeroPoint`, como la pronosupinacion neutra) si se puede tocar: es el punto
// de partida del componente, no algo que se le sume.

import { describe, it, expect } from 'vitest';
import { ALL_TESTS_BY_REGION } from '../fullContent';
import { NEURO_BY_REGION } from '../neuro';
import { getBoneControl } from '../../lib/boneMap';

interface DemoLike {
  movementId: string;
  components?: { movementId: string; angleDeg: number }[];
}

function choques(d: DemoLike): string[] {
  const base = getBoneControl(d.movementId);
  if (!base || base.kind !== 'joint' || !base.posture?.length) return [];
  // Los huesos que la postura de lectura de la base deja SOSTENIDOS.
  const sostenidos = new Set(
    base.posture.filter((p) => !p.zeroPoint).map((p) => `${base.armatureBase}:${p.bone}`),
  );
  const out: string[] = [];
  for (const c of d.components ?? []) {
    const cc = getBoneControl(c.movementId);
    if (!cc || cc.kind !== 'joint') continue;
    if (sostenidos.has(`${cc.armatureBase}:${cc.bone}`)) {
      out.push(`${c.movementId}@${c.angleDeg} repite ${cc.bone}, que la postura de ${d.movementId} ya sostiene`);
    }
  }
  return out;
}

describe('los componentes de los demos no repiten la postura de su base', () => {
  for (const [region, tests] of Object.entries(ALL_TESTS_BY_REGION)) {
    for (const t of tests) {
      if (!t.demo?.components?.length) continue;
      it(`${region}/${t.id}`, () => {
        expect(choques(t.demo as DemoLike)).toEqual([]);
      });
    }
  }
  const vistos = new Set<string>();
  for (const set of Object.values(NEURO_BY_REGION)) {
    for (const r of set.roots) {
      if (!r.demo?.components?.length) continue;
      const k = `${set.id}:${r.id}`;
      if (vistos.has(k)) continue;
      vistos.add(k);
      it(`miotoma ${k}`, () => {
        expect(choques(r.demo as DemoLike)).toEqual([]);
      });
    }
  }
});

describe('la regla caza el caso que se escapo', () => {
  it('una rotacion de hombro con un codo a 90 de mas', () => {
    expect(
      choques({
        movementId: 'glenohumeral-internal-rotation',
        components: [{ movementId: 'elbow-flexion', angleDeg: 90 }],
      }),
    ).toHaveLength(1);
  });
  it('una flexion de hombro con el codo a 90 si vale: la flexion no lleva postura', () => {
    expect(
      choques({
        movementId: 'glenohumeral-flexion',
        components: [{ movementId: 'elbow-flexion', angleDeg: 90 }],
      }),
    ).toEqual([]);
  });
});
