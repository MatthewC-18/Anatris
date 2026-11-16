// EL PLANO DE RESPALDO DE LA CAMARA.
//
// `boneMap.MOVEMENT_PLANE` existe porque un demo puede mover una region cuyo
// contenido no ha llegado: en la lumbar, el Lasègue, el Lasègue cruzado y la
// tension del nervio femoral mueven cadera y rodilla, y sin plano la camara se
// giraba de frente (capturas del 15 nov, perfil nuevo que solo abre la lumbar).
// Una tabla escrita a mano se queda desfasada; esta no puede, porque aqui se
// exige que de la MISMA vista que el dato de cada RomMovement.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_ROM_BY_REGION, ALL_TESTS_BY_REGION } from '../../data/fullContent';
import { MOVEMENT_PLANE } from '../boneMap';
import { readingAngleFor } from '../labCamera';

describe('el plano de respaldo de la cámara', () => {
  it('da la misma vista que el plano de cada RomMovement, por los dos lados', () => {
    let n = 0;
    for (const lista of Object.values(ALL_ROM_BY_REGION)) {
      for (const m of lista) {
        if (!m.plane) continue;
        n++;
        for (const side of ['R', 'L'] as const) {
          // Se compara la VISTA y no el texto: conviven 'Transversal' y 'Transverso'.
          expect(readingAngleFor(MOVEMENT_PLANE[m.id], side), `${m.id} ${side}`).toEqual(
            readingAngleFor(m.plane, side),
          );
        }
      }
    }
    expect(n).toBeGreaterThanOrEqual(34);
  });

  it('cubre el gesto base de todos los demos de pruebas', () => {
    const sinPlano: string[] = [];
    for (const tests of Object.values(ALL_TESTS_BY_REGION)) {
      for (const t of tests) {
        if (t.demo && !MOVEMENT_PLANE[t.demo.movementId]) sinPlano.push(`${t.id}: ${t.demo.movementId}`);
      }
    }
    expect(sinPlano).toEqual([]);
  });

  it('la camara y el guardian lo usan cuando el gesto no esta cargado', () => {
    const overlays = readFileSync('src/components/movement/RigOverlays.tsx', 'utf8');
    expect(overlays).toMatch(/movementById\(cmd\.movementId\)\?\.plane \?\? MOVEMENT_PLANE\[/);
    // El mismo gesto con el otro lado tambien gira la camara.
    expect(overlays).toMatch(/const key = `\$\{cmd\.movementId\}\|\$\{cmd\.side\}`/);
    const viewer = readFileSync('src/components/movement/RigViewer.tsx', 'utf8');
    expect(viewer).toMatch(/cmd\.demo && \(ctl\?\.kind === 'joint' \|\| ctl\?\.kind === 'chain'\)/);
  });
});
