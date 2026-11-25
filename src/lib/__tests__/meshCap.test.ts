// EL TOPE DE LA MALLA: lo que el laboratorio recorre y lo que un demo posa no
// pasan del `clinicalRange.max` de su control, aunque la ficha ROM (o un
// contenido de pago viejo) diga mas.
//
// La rodilla es el caso que lo pidio ("en la parte de flexion los musculos se
// penetran ... y para extension igual empieza con los musculos muy metidos"):
// con la ficha a 135 el laboratorio llegaba a 135, donde la pantorrilla se mete
// 19 mm (110 cm3) en los isquiotibiales, y la extension ABRIA ahi. El tope de la
// malla es 105 (boneMap); la norma clinica, 135, se queda en la ficha y en el
// texto. Ver la cabecera de la rodilla en boneMap.

import { describe, it, expect } from 'vitest';
import { ALL_ROM_BY_REGION, ALL_TESTS_BY_REGION } from '../../data/fullContent';
import { CERVICAL_NEURO } from '../../data/neuro/cervical';
import { LUMBOSACRAL_NEURO } from '../../data/neuro/lumbosacral';
import { buildLabArc, phaseAtAngleIn } from '../romPhaseAtAngle';
import { demoWithinMesh, meshMaxDeg } from '../boneMap';
import type { RomMovement } from '../../types/rom';

const MOVIMIENTOS = Object.values(ALL_ROM_BY_REGION).flat();
const byId = (id: string): RomMovement => {
  const m = MOVIMIENTOS.find((x) => x.id === id);
  if (!m) throw new Error(`sin ficha ${id}`);
  return m;
};

describe('el arco del laboratorio acaba en el tope de la malla', () => {
  it('la flexion de rodilla llega a 105 aunque la ficha diga 135', () => {
    const m = byId('knee-flexion');
    // La norma sigue en la ficha: Explorar, la ficha del paciente y el texto.
    expect(m.totalRangeDeg.max).toBe(135);
    expect(meshMaxDeg('knee-flexion')).toBe(105);
    const arc = buildLabArc(m);
    expect(arc.max).toBe(105);
    expect(arc.startDeg).toBe(0);
    for (const p of arc.phases) expect(p.endDeg, p.label).toBeLessThanOrEqual(105);
    // La ultima fase ("Final", 90-135 en la ficha) acaba justo en el tope.
    const ultima = arc.phases[arc.phases.length - 1];
    expect([ultima.startDeg, ultima.endDeg]).toEqual([90, 105]);
    // Y la ficha no se toca: Explorar sigue pintando 90-135.
    expect(m.phases[m.phases.length - 1].endDeg).toBe(135);
    // Pasado el tope el paginador sigue en la ultima fase, la recortada.
    expect(phaseAtAngleIn(arc.phases, 120)?.phase.endDeg).toBe(105);
  });

  it('la extension de rodilla ABRE en 105, no en 135', () => {
    const m = byId('knee-extension');
    expect(m.totalRangeDeg.max).toBe(135);
    const arc = buildLabArc(m);
    expect(arc.max).toBe(105);
    expect(arc.startDeg).toBe(105);
    for (const p of arc.phases) expect(p.endDeg, p.label).toBeLessThanOrEqual(105);
    // La fase en la que abre es "Inicio", recortada a 90-105.
    const inicio = phaseAtAngleIn(arc.phases, arc.startDeg)!.phase;
    expect([inicio.startDeg, inicio.endDeg]).toEqual([90, 105]);
  });

  it('una fase que empieza en el tope o despues desaparece; la que lo cruza se recorta, en una copia', () => {
    const base = byId('knee-flexion');
    const [a, b, c] = base.phases;
    const m: RomMovement = {
      ...base,
      phases: [
        { ...a, startDeg: 0, endDeg: 90 },
        { ...b, startDeg: 90, endDeg: 120 },
        { ...c, startDeg: 120, endDeg: 135 },
      ],
    };
    const arc = buildLabArc(m);
    expect(arc.phases.map((p) => [p.startDeg, p.endDeg])).toEqual([
      [0, 90],
      [90, 105],
    ]);
    expect(m.phases[1].endDeg).toBe(120);
    // La que no cambia sigue siendo el mismo objeto.
    expect(arc.phases[0]).toBe(m.phases[0]);
  });

  it('un gesto cuyo tope no corta su ficha no cambia: ni el arco ni la identidad de sus fases', () => {
    let vistos = 0;
    for (const m of MOVIMIENTOS) {
      const tope = meshMaxDeg(m.id);
      if (tope !== undefined && tope < m.totalRangeDeg.max) continue;
      vistos++;
      const arc = buildLabArc(m);
      expect(arc.max, m.id).toBe(m.totalRangeDeg.max);
      // El margen compara las fases por identidad (PhaseStack): sin recorte, la
      // misma lista que trae la ficha.
      if (!m.labReverse) expect(arc.phases, m.id).toBe(m.phases);
    }
    expect(vistos).toBeGreaterThanOrEqual(30);
  });

  it('solo se recortan tres arcos: la flexion y la extension de rodilla y la rotacion interna del hombro', () => {
    const recortados = MOVIMIENTOS.filter((m) => buildLabArc(m).max < m.totalRangeDeg.max)
      .map((m) => m.id)
      .sort();
    expect(recortados).toEqual(['glenohumeral-internal-rotation', 'knee-extension', 'knee-flexion']);
    // El hombro: 100 en la ficha (con la mano por detras de la espalda) y 70 en
    // su control, con el codo a 90 y el brazo al costado. Ese 70 no tiene cifra
    // que lo defienda (ver la medida junto al control en boneMap), pero es el
    // tope que el mapa documenta y la regla es la misma para todos.
    const ri = buildLabArc(byId('glenohumeral-internal-rotation'));
    expect([ri.min, ri.max, ri.startDeg]).toEqual([-80, 70, 0]);
  });
});

describe('los demos se posan dentro del tope de la malla', () => {
  const DEMOS = [
    ...Object.values(ALL_TESTS_BY_REGION)
      .flat()
      .filter((t) => t.demo)
      .map((t) => ({ id: t.id, demo: t.demo! })),
    ...[CERVICAL_NEURO, LUMBOSACRAL_NEURO].flatMap((s) =>
      s.roots.filter((r) => r.demo).map((r) => ({ id: `miotoma ${r.id}`, demo: r.demo! })),
    ),
  ];

  it('un McMurray de un contenido de pago viejo, a 135, se posa en 105 con su rotacion intacta', () => {
    const viejo = {
      movementId: 'knee-flexion',
      angleDeg: 135,
      components: [{ movementId: 'knee-external-rotation', angleDeg: 30 }],
    };
    const p = demoWithinMesh(viejo);
    expect(p.angleDeg).toBe(105);
    expect(p.components).toEqual([{ movementId: 'knee-external-rotation', angleDeg: 30 }]);
    // El dato de entrada no se toca.
    expect(viejo.angleDeg).toBe(135);
  });

  it('un componente por encima de su tope tambien se recorta', () => {
    const p = demoWithinMesh({
      movementId: 'hip-flexion',
      angleDeg: 90,
      components: [{ movementId: 'knee-flexion', angleDeg: 135 }],
    });
    expect(p.angleDeg).toBe(90);
    expect(p.components).toEqual([{ movementId: 'knee-flexion', angleDeg: 105 }]);
  });

  it('solo por arriba: un angulo negativo o un gesto que el rig no conduce no se tocan', () => {
    expect(demoWithinMesh({ movementId: 'glenohumeral-flexion', angleDeg: -40 }).angleDeg).toBe(-40);
    expect(demoWithinMesh({ movementId: 'no-existe', angleDeg: 500 }).angleDeg).toBe(500);
    expect(demoWithinMesh({ movementId: 'knee-flexion', angleDeg: 90 }).components).toBeUndefined();
  });

  it('ningun demo actual cambia de pose (pruebas de las 8 regiones y miotomas)', () => {
    expect(DEMOS.length).toBeGreaterThanOrEqual(60);
    for (const { id, demo } of DEMOS) {
      const p = demoWithinMesh(demo);
      expect(p.angleDeg, id).toBe(demo.angleDeg);
      expect(p.components ?? [], id).toEqual(demo.components ?? []);
    }
  });
});
