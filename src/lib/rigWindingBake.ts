// src/lib/rigWindingBake.ts
//
// LOS TRIANGULOS SUELTOS DEL MUSCULO Y DEL HUESO, HORNEADOS.
//
// Dentro de una malla hay triangulos que giran contra la normal de sus vertices,
// y con DoubleSide cada uno sale NEGRO desde las dos caras (ver
// faceWinding.agreeTriangleWinding, que ya los arregla en la piel). Medido en el
// navegador, con la piel ya arreglada:
//
//   musculo     2.988 de 626.610 triangulos   (intercostales, oblicuos,
//                                              transverso; la fascia antebraquial
//                                              123 de 1.784 en cada brazo)
//   conectivo   1.352      cartilago 14       hueso 269 de 219.771
//
// Buscarlos en la carga cuesta recorrer casi un millon de triangulos: 553 ms en
// el navegador, dentro de una preparacion que ya bloquea el hilo. Pero el GLB es
// fijo y la respuesta siempre es la misma, asi que se guarda (como los pesos de
// rigSkinWeightBake.ts): por malla, QUE triangulos hay que invertir.
//
// Y SE COMPRUEBA CADA UNO ANTES DE TOCARLO. La tabla dice donde mirar; el giro
// solo se invierte si de verdad va contra sus normales. Una tabla vieja (otro
// GLB, otro orden de pases) no puede estropear nada: lo que no cuadra se cuenta
// como `stale` y `npm run audit-winding-bake` lo caza.
//
// DONDE: justo despues de `repairFaceWinding` (que invierte mallas ENTERAS) y
// antes del recorte del antebrazo, que quita triangulos y renumeraria las
// posiciones. scripts/build-winding-bake.mts corre la misma cadena hasta ahi.

import * as THREE from 'three';
import { flipTriangle, triangleWindsAgainst } from './faceWinding';
import { RIG_WINDING_BAKE, type WindingRow } from '../data/rigWindingBake';

/** Posiciones de triangulo ordenadas -> diferencias en base 36, separadas por puntos. */
export function encodeTriangles(tris: readonly number[]): string {
  const sorted = [...tris].sort((a, b) => a - b);
  let prev = 0;
  const parts: string[] = [];
  for (const t of sorted) {
    parts.push((t - prev).toString(36));
    prev = t;
  }
  return parts.join('.');
}

export function decodeTriangles(s: string): number[] {
  if (!s) return [];
  const out: number[] = [];
  let acc = 0;
  for (const p of s.split('.')) {
    acc += parseInt(p, 36);
    out.push(acc);
  }
  return out;
}

export interface WindingBakeReport {
  /** Mallas con algun triangulo invertido. */
  meshes: number;
  /** Triangulos invertidos. */
  flipped: number;
  /** Entradas que no cuadraron: fuera de rango o ya de acuerdo con su normal. */
  stale: number;
  /** Mallas de la tabla que la escena no tiene (o sin indice/normales). */
  missing: string[];
}

/**
 * Aplica la tabla: invierte cada triangulo listado que de verdad gire contra sus
 * normales. Idempotente.
 */
export function applyBakedWinding(
  scene: THREE.Object3D,
  table: readonly WindingRow[] = RIG_WINDING_BAKE,
): WindingBakeReport {
  const report: WindingBakeReport = { meshes: 0, flipped: 0, stale: 0, missing: [] };
  if (table.length === 0) return report;
  const byName = new Map<string, THREE.Mesh>();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !byName.has(m.name)) byName.set(m.name, m);
  });
  for (const row of table) {
    const mesh = byName.get(row.n);
    const geom = mesh?.geometry;
    const pos = geom?.getAttribute('position');
    const nor = geom?.getAttribute('normal');
    const index = geom?.getIndex();
    if (!mesh || !pos || !nor || !index) {
      report.missing.push(row.n);
      continue;
    }
    const arr = index.array as Uint16Array | Uint32Array;
    let here = 0;
    for (const t of decodeTriangles(row.t)) {
      const i = t * 3;
      if (i + 2 >= arr.length || !triangleWindsAgainst(pos, nor, arr, i)) {
        report.stale++;
        continue;
      }
      flipTriangle(arr, i);
      here++;
    }
    if (here > 0) {
      index.needsUpdate = true;
      report.meshes++;
      report.flipped += here;
    }
  }
  return report;
}
