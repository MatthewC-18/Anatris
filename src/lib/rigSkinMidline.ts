// src/lib/rigSkinMidline.ts
//
// LA PIEL DE LA CABEZA, CERRADA POR LA LINEA MEDIA.
//
// La piel del rig son unas 250 teselas, y en la linea media de la cabeza la
// izquierda y la derecha no siempre se tocan. Medido en el navegador con el rig
// en reposo (aristas de borde de cada tesela cuyo vertice no tiene a menos de
// 0,8 mm ningun vertice de OTRA tesela):
//
//   coronilla  `Parietal_region` / `_3`   un rombo de 9,4 x 10,8 mm: cada
//              tesela se aparta hasta 4,72 mm del plano medio entre dos
//              vertices que si estan en el (x = -0,06). Por ahi se ve el
//              craneo, y en el laboratorio cervical, que abre de perfil, es una
//              muesca negra en lo alto de la cabeza.
//   nariz      punta, `Nasal_region_1` / `_3` a +-0,86 mm (grieta de 1,72);
//              dorso, un vertice a 1,02 mm frente a otro en el plano.
//   labio      tuberculo del labio superior a +-0,57 mm (1,14 mm). Por ahi se
//              veian los dientes y el orbicular, una raya roja y blanca.
//   coronilla  delante, +-0,43 mm.
//
// Dos reglas, y las dos solo acercan vertices AL PLANO MEDIO en x (y y z no se
// tocan, asi que ninguna abertura de verdad cambia de forma):
//
//   1. GRIETA FINA. Un vertice de borde abierto a 1,2 mm o menos del plano se
//      lleva a x = 0. Lo mueve de lado como mucho 1,2 mm: si era una abertura de
//      verdad (el borde del labio en la linea media), sigue abierta.
//   2. AGUJERO ENTRE TESELAS. Un tramo de borde abierto cuyos vecinos COSIDOS,
//      a los dos lados, estan en el plano medio, y que no se aparta de el mas de
//      6 mm, es el hueco entre dos teselas que deberian tocarse: se lleva entero
//      a x = 0. Una narina no cumple: su borde no empieza ni acaba en el plano
//      medio (la columela esta en medio). La boca tampoco: su borde llega a la
//      comisura, a 25 mm.
//
// SOLO LA CABEZA (y >= 1,40 en reposo). Es lo medido, y ahi toda la piel va
// atada en rigido a la cabeza (`vert_C1`, y el labio a C1/C2 con la misma
// mezcla en las dos mitades): soldar la posicion basta para que no se abra al
// moverse. Mas abajo, dos mitades con pesos distintos se volverian a separar.
//
// Va DESPUES de `inflateSkinShell`, que es el otro pase que mueve posiciones, y
// antes de los pases de pesos. No toca normales: las del GLB son Int8 y
// `computeVertexNormals()` sin borrar el atributo deja la malla negra.

import * as THREE from 'three';

/** Grieta fina: a esta distancia del plano medio (m) o menos, el vertice va a x = 0. */
export const MIDLINE_SNAP_M = 0.0012;
/** Agujero entre teselas: hasta esta distancia del plano medio (m). */
export const MIDLINE_HOLE_M = 0.006;
/** Solo la cabeza: altura minima en reposo (m). */
export const MIDLINE_BAND_Y = 1.4;
/** Un vertice de borde con otro de OTRA tesela a menos de esto esta cosido. */
const JOINED_M = 0.0008;
/**
 * Cuantizacion para reconocer copias del mismo vertice dentro de una tesela.
 * Las copias de una costura UV son identicas bit a bit; 0,1 mm sobra.
 */
const SAME_M = 1e-4;
/** Celda de la rejilla de busqueda. */
const CELL_M = 0.002;

// Claves NUMERICAS, no cadenas: con cadenas este pase costaba 105 ms en frio
// sobre el GLB real, dentro de una preparacion que ya bloquea el hilo.
/** Clave de posicion cuantizada a SAME_M (cabe en 2^53 para |x|,|z| < 0,5 m e y < 2,5 m). */
const posKey = (x: number, y: number, z: number) =>
  (Math.round(x / SAME_M) + 5000) * 1e9 + (Math.round(y / SAME_M) + 5000) * 1e4 + (Math.round(z / SAME_M) + 5000);
/** Clave de celda de la rejilla. */
const cellKeyOf = (cx: number, cy: number, cz: number) => (cx + 1000) * 4e6 + (cy + 1000) * 2e3 + (cz + 1000);

export interface MidlineReport {
  /** Teselas tocadas. */
  meshes: number;
  /** Vertices movidos (contando las copias de costura UV). */
  vertices: number;
  /** Tramos cerrados por la regla 2 (agujeros entre teselas). */
  holes: number;
  /** El mayor desplazamiento, en metros. */
  maxMove: number;
}

interface Patch {
  mesh: THREE.Mesh;
  /** Posicion de mundo de cada vertice (x, y, z seguidos). */
  world: Float64Array;
  /** Indice de vertice -> id de posicion (las copias de costura UV comparten id). */
  canon: Int32Array;
  /** id -> indices de vertice que lo comparten. */
  members: number[][];
  /** id -> vecinos por arista de BORDE (usada por un solo triangulo). */
  border: Map<number, number[]>;
}

const cellKey = (x: number, y: number, z: number) =>
  cellKeyOf(Math.floor(x / CELL_M), Math.floor(y / CELL_M), Math.floor(z / CELL_M));

function buildPatch(mesh: THREE.Mesh): Patch | null {
  const geo = mesh.geometry;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
  const index = geo.getIndex();
  if (!pos || !index) return null;
  // Casi toda la piel esta por debajo de la cabeza. Se descarta con la altura
  // de mundo de cada vertice (una fila de la matriz, sin objetos), no con la
  // esfera envolvente: `inflateSkinShell` las deja a null y recalcularlas para
  // las 486 teselas de piel era la mitad del coste de este pase.
  const n = pos.count;
  const e = mesh.matrixWorld.elements;
  let top = -Infinity;
  for (let i = 0; i < n; i++) {
    const y = e[1] * pos.getX(i) + e[5] * pos.getY(i) + e[9] * pos.getZ(i) + e[13];
    if (y > top) top = y;
  }
  if (top < MIDLINE_BAND_Y) return null;
  const world = new Float64Array(n * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    world[i * 3] = v.x;
    world[i * 3 + 1] = v.y;
    world[i * 3 + 2] = v.z;
  }

  // Las copias de un mismo vertice (costura UV) cuentan como uno: si no, cada
  // costura de textura pareceria un borde abierto.
  const canon = new Int32Array(n);
  const members: number[][] = [];
  const byPos = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const k = posKey(world[i * 3], world[i * 3 + 1], world[i * 3 + 2]);
    let id = byPos.get(k);
    if (id === undefined) {
      id = members.length;
      byPos.set(k, id);
      members.push([]);
    }
    canon[i] = id;
    members[id].push(i);
  }

  const edges = new Map<number, number>();
  const ids = members.length;
  const tri = index.array;
  const count = (a: number, b: number) => {
    const p = canon[a];
    const q = canon[b];
    if (p === q) return;
    const key = p < q ? p * ids + q : q * ids + p;
    edges.set(key, (edges.get(key) ?? 0) + 1);
  };
  for (let t = 0; t + 2 < tri.length; t += 3) {
    count(tri[t], tri[t + 1]);
    count(tri[t + 1], tri[t + 2]);
    count(tri[t + 2], tri[t]);
  }
  const border = new Map<number, number[]>();
  for (const [key, count] of edges) {
    if (count !== 1) continue;
    const p = Math.floor(key / ids);
    const q = key % ids;
    (border.get(p) ?? border.set(p, []).get(p)!).push(q);
    (border.get(q) ?? border.set(q, []).get(q)!).push(p);
  }
  return { mesh, world, canon, members, border };
}

/**
 * Cierra la piel de la cabeza por la linea media (ver la cabecera).
 *
 * @param classify dice que malla es piel (como los demas pases de RigModel).
 */
export function closeSkinMidline(
  scene: THREE.Object3D,
  classify: (mesh: THREE.Mesh) => 'skin' | 'other',
): MidlineReport {
  const report: MidlineReport = { meshes: 0, vertices: 0, holes: 0, maxMove: 0 };
  scene.updateMatrixWorld(true);

  const patches: Patch[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || classify(m) !== 'skin') return;
    const p = buildPatch(m);
    if (p) patches.push(p);
  });
  if (patches.length === 0) return report;

  // Rejilla con TODOS los vertices de piel de la franja, para saber si un
  // vertice de borde tiene a otra tesela pegada.
  const grid = new Map<number, { patch: number; x: number; y: number; z: number }[]>();
  patches.forEach((p, pi) => {
    for (let id = 0; id < p.members.length; id++) {
      const i = p.members[id][0];
      const x = p.world[i * 3];
      const y = p.world[i * 3 + 1];
      const z = p.world[i * 3 + 2];
      if (y < MIDLINE_BAND_Y - CELL_M) continue;
      const k = cellKey(x, y, z);
      (grid.get(k) ?? grid.set(k, []).get(k)!).push({ patch: pi, x, y, z });
    }
  });
  const JOINED_SQ = JOINED_M * JOINED_M;
  const joined = (pi: number, x: number, y: number, z: number): boolean => {
    const cx = Math.floor(x / CELL_M);
    const cy = Math.floor(y / CELL_M);
    const cz = Math.floor(z / CELL_M);
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++)
        for (let c = -1; c <= 1; c++) {
          const cell = grid.get(cellKeyOf(cx + a, cy + b, cz + c));
          if (!cell) continue;
          for (const q of cell) {
            if (q.patch === pi) continue;
            const dx = q.x - x;
            const dy = q.y - y;
            const dz = q.z - z;
            if (dx * dx + dy * dy + dz * dz < JOINED_SQ) return true;
          }
        }
    return false;
  };

  const inv = new THREE.Matrix4();
  const v = new THREE.Vector3();
  patches.forEach((p, pi) => {
    const at = (id: number) => {
      const i = p.members[id][0];
      return [p.world[i * 3], p.world[i * 3 + 1], p.world[i * 3 + 2]] as const;
    };
    // Vertices de borde de la franja, y cuales estan abiertos.
    const open = new Set<number>();
    for (const id of p.border.keys()) {
      const [x, y, z] = at(id);
      if (y < MIDLINE_BAND_Y) continue;
      if (!joined(pi, x, y, z)) open.add(id);
    }
    if (open.size === 0) return;

    const snap = new Set<number>();
    // 1. Grieta fina.
    for (const id of open) {
      const x = at(id)[0];
      if (Math.abs(x) <= MIDLINE_SNAP_M && Math.abs(x) > 1e-7) snap.add(id);
    }
    // 2. Agujero entre teselas: cada tramo de borde abierto, con sus vecinos
    // cosidos a los dos lados en el plano medio.
    const seen = new Set<number>();
    for (const start of open) {
      if (seen.has(start)) continue;
      const run: number[] = [];
      const ends = new Set<number>();
      const stack = [start];
      seen.add(start);
      while (stack.length) {
        const id = stack.pop()!;
        run.push(id);
        for (const nb of p.border.get(id) ?? []) {
          if (open.has(nb)) {
            if (!seen.has(nb)) {
              seen.add(nb);
              stack.push(nb);
            }
          } else {
            ends.add(nb);
          }
        }
      }
      // Un lazo cerrado (sin vecinos cosidos) es una abertura de verdad.
      if (ends.size < 2) continue;
      const endsOnMidline = [...ends].every((id) => Math.abs(at(id)[0]) <= MIDLINE_SNAP_M);
      const narrow = run.every((id) => Math.abs(at(id)[0]) <= MIDLINE_HOLE_M);
      if (!endsOnMidline || !narrow) continue;
      if (run.some((id) => Math.abs(at(id)[0]) > MIDLINE_SNAP_M)) report.holes++;
      for (const id of run) if (Math.abs(at(id)[0]) > 1e-7) snap.add(id);
    }
    if (snap.size === 0) return;

    // Mover: en mundo x = 0, y vuelta a las coordenadas de la malla. En reposo
    // el skinning es la identidad, asi que esto es la posicion de enlace.
    const pos = p.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    inv.copy(p.mesh.matrixWorld).invert();
    for (const id of snap) {
      for (const i of p.members[id]) {
        const x = p.world[i * 3];
        report.maxMove = Math.max(report.maxMove, Math.abs(x));
        v.set(0, p.world[i * 3 + 1], p.world[i * 3 + 2]).applyMatrix4(inv);
        pos.setXYZ(i, v.x, v.y, v.z);
        p.world[i * 3] = 0;
        report.vertices++;
      }
    }
    pos.needsUpdate = true;
    if (p.mesh.geometry.boundingSphere) p.mesh.geometry.computeBoundingSphere();
    if (p.mesh.geometry.boundingBox) p.mesh.geometry.computeBoundingBox();
    report.meshes++;
  });
  return report;
}
