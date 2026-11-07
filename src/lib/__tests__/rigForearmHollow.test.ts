// EL ULTIMO CUARTO DEL ANTEBRAZO NO TIENE CARNE, Y SE VEIA EL HUESO.
//
// El dato trae seis musculos superficiales por brazo tumbados ATRAVESANDO el
// antebrazo (discos de 1,4-2,7 cm de largo y 11,8-14,9 cm de radio), rotos en
// los dos brazos, asi que el recorte medido los oculta y no hay gemelo bueno
// del que copiar. Lo que queda, medido con `npm run audit-forearm-fill`:
//
//     t 0,0-0,7   100% del musculo en pantalla
//     t 0,7-0,8    72%
//     t 0,8-0,9    32%
//     t 0,9-1,0    22%
//
// La piel del cuerpo se vuelve fantasma para ENSENAR EL MUSCULO de debajo. En
// ese ultimo tramo no hay musculo que ensenar: solo el radio y el cubito, al
// lado de una mano opaca. De ahi el "la piel del brazo va hasta abajo y deja
// descubierto el hueso del antebrazo".
//
// Mientras el dato no se arregle en Blender, ese tramo lleva piel SOLIDA, como
// la mano. Lo que se fija aqui es el limite -- que sale del propio rig y no de
// una altura escrita a mano -- y que el laboratorio lo use.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { forearmHollowTop, inForearmHollow, ARM_COLUMN_X } from '../rigLimbTrim';
import type { ArmHeights } from '../rigArmRebind';

/** Las alturas del rig servido (medidas con `npm run audit-forearm-fill`). */
const H: ArmHeights = { elbowY: 1.101, wristY: 0.864, upperArmY: 1.181 };

describe('el tramo hueco del antebrazo', () => {
  it('es el cuarto distal, leido del propio rig', () => {
    const top = forearmHollowTop(H);
    expect(top).toBeCloseTo(0.923, 3);
    // Entre la muneca y el codo, y mas cerca de la muneca: es un CUARTO.
    expect(top).toBeGreaterThan(H.wristY);
    expect(top).toBeLessThan(H.elbowY);
    expect(top - H.wristY).toBeLessThan(H.elbowY - top);
  });

  it('se mueve con el rig en vez de ser una altura escrita a mano', () => {
    // Una reexportacion que baje el codo baja el limite con el. Si fuese una
    // constante, el manguito solido empezaria a tapar antebrazo sano sin que
    // nada fallara.
    const bajo: ArmHeights = { elbowY: 1.051, wristY: 0.834, upperArmY: 1.131 };
    expect(forearmHollowTop(bajo)).toBeLessThan(forearmHollowTop(H));
  });

  it('coge el antebrazo distal y NO el carnoso, el tronco ni la mano', () => {
    const x = ARM_COLUMN_X + 0.08; // columna lateral del brazo
    // Los dos tramos que el banco mide huecos (32% y 22%).
    expect(inForearmHollow(new THREE.Vector3(x, 0.9, 0), H)).toBe(true);
    expect(inForearmHollow(new THREE.Vector3(x, 0.876, 0), H)).toBe(true);
    expect(inForearmHollow(new THREE.Vector3(-x, 0.9, 0), H)).toBe(true);
    // El antebrazo que SI tiene musculo se queda con la piel fantasma.
    expect(inForearmHollow(new THREE.Vector3(x, 0.947, 0), H)).toBe(false);
    expect(inForearmHollow(new THREE.Vector3(x, 1.05, 0), H)).toBe(false);
    // El tronco esta a la misma altura que el antebrazo con los brazos caidos:
    // sin el filtro de columna lateral, el abdomen entraria por la regla.
    expect(inForearmHollow(new THREE.Vector3(0.05, 0.9, 0), H)).toBe(false);
    // Por debajo de la muneca manda el casquete de la mano, no esta regla.
    expect(inForearmHollow(new THREE.Vector3(x, 0.78, 0), H)).toBe(false);
  });

  it('el laboratorio da piel solida a ese tramo', () => {
    // El guardian de la regresion: si vuelve a caer en `bodySkinMat`, el
    // fantasma vuelve a ensenar el radio y el cubito pelados.
    const src = readFileSync(
      resolve(__dirname, '../../components/movement/RigModel.tsx'),
      'utf8',
    );
    expect(src).toMatch(/inForearmHollow\(center, ARM_H\)/);
    const i = src.indexOf('inForearmHollow(center, ARM_H)');
    const bloque = src.slice(i, i + 260);
    expect(bloque).toMatch(/swap\(mesh, skinMat\)/);
    expect(bloque).toMatch(/rigDistalCap = true/);
  });
});
