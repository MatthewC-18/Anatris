// EL DEMO DE MIOTOMA QUE NO ENCENDIA NADA.
//
// El panel neuro ofrece un play por raiz: el cuerpo se vuelve translucido y la
// articulacion recorre el movimiento del miotoma. El brillo del musculo sale
// SOLO de `highlight`, y `highlight` salia SOLO de `highlightMuscleId` del
// dato. Ese campo aparecia UNA vez en todo `src/data/neuro`: C5.
//
// Asi que en C6, C7, L3 y S1 el usuario pulsaba el play, el codo se estiraba o
// la rodilla se doblaba, y no se iluminaba nada: ni el triceps en C7, ni el
// cuadriceps en L3, ni los isquiotibiales en S1. Encima el lector retira la
// tarjeta "Musculo protagonista" durante todo demo --dando por hecho que el
// modelo si lo enciende--, asi que el musculo no se veia NI se nombraba.
//
// Esta prueba exige que todo demo encienda algo, y que lo que nombre exista de
// verdad en el catalogo. Lo que NO puede comprobar aqui (el GLB no se carga en
// node) es que esos ids resuelvan mallas: de eso se encarga `npm run audit-glow`.

import { describe, expect, it } from 'vitest';
import { CERVICAL_NEURO } from '../../data/neuro/cervical';
import { LUMBOSACRAL_NEURO } from '../../data/neuro/lumbosacral';
import { shoulderMuscles } from '../../data/muscles/shoulder';
import { elbowMuscles } from '../../data/muscles/elbow';
import { kneeMuscles } from '../../data/muscles/knee';
import { hipMuscles } from '../../data/muscles/hip';
import { ankleMuscles } from '../../data/muscles/ankle';
import { spineMuscles } from '../../data/muscles/spine';
import type { NeuroSegmentSet } from '../../types/neuro';

const SETS: NeuroSegmentSet[] = [CERVICAL_NEURO, LUMBOSACRAL_NEURO];
const CATALOG = new Set(
  [
    ...shoulderMuscles,
    ...elbowMuscles,
    ...kneeMuscles,
    ...hipMuscles,
    ...ankleMuscles,
    ...spineMuscles,
  ].map((m) => m.id),
);

const withDemo = SETS.flatMap((s) => s.roots)
  .filter((r) => r.demo)
  .map((r) => ({ id: r.id, demo: r.demo! }));

describe('los demos de miotoma', () => {
  it('hay demos que comprobar', () => {
    expect(withDemo.length).toBeGreaterThanOrEqual(5);
  });

  it('TODOS encienden al menos un musculo', () => {
    const mudos = withDemo.filter((r) => (r.demo.highlightMuscleIds ?? []).length === 0);
    expect(mudos.map((r) => r.id), 'raices cuyo play no ilumina nada').toEqual([]);
  });

  it('y el musculo que nombran existe en el catalogo', () => {
    const malos: string[] = [];
    for (const r of withDemo) {
      for (const id of r.demo.highlightMuscleIds ?? []) {
        if (!CATALOG.has(id)) malos.push(`${r.id} -> ${id}`);
      }
    }
    expect(malos).toEqual([]);
  });

  it('el panel mapea la LISTA, no un solo id', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(
      resolve(__dirname, '../../components/movement/NeuroPanel.tsx'),
      'utf8',
    );
    expect(src).toMatch(/highlightMuscleIds/);
    expect(src).not.toMatch(/d\.highlightMuscleId\b(?!s)/);
  });

  it('con movimiento reducido, un arco compartido acaba ESTIRADO', async () => {
    // C7 es `elbow-extension` con target 120 y L3 `knee-extension` con 90: los
    // dos son arcos compartidos (`arcFrom: 'max'`), donde 0 ES la articulacion
    // estirada. La rama de movimiento reducido hacia `push(target)` y ensenaba
    // el codo doblado 120 grados bajo el rotulo "Extension de codo".
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(
      resolve(__dirname, '../../components/movement/NeuroPanel.tsx'),
      'utf8',
    );
    expect(src).toMatch(/push\(fromMax \? 0 : target\)/);
  });

  it('y el demo se para al cerrar el panel', async () => {
    // Cerrar con la X no desmonta el panel en escritorio, asi que el bucle
    // seguia conduciendo el rig sin ningun boton para pararlo.
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    for (const f of ['NeuroPanel.tsx', 'OrthopedicTestsPanel.tsx']) {
      const src = readFileSync(
        resolve(__dirname, '../../components/movement/' + f),
        'utf8',
      );
      expect(src, f).toMatch(/if \(!open && !bare\) \{\s*\n\s*demoChannel\.stop\(/);
      expect(src, `${f}: el efecto debe depender de open/bare`).toMatch(
        /\}, \[demoId, byId, open, bare\]\)/,
      );
    }
  });
});
