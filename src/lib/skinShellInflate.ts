// src/lib/skinShellInflate.ts
//
// EL MOTEADO ROSA NO ERA MUSCULO MAL PUESTO: ERA LA PIEL, DEMASIADO PLANA.
//
// En las treinta y cuatro hojas de revision, y ya en el fotograma de REPOSO, el
// pecho, el abdomen, los brazos y la cara salen salpicados de esquirlas rosas.
// La primera lectura fue "hay musculo fuera del sobre de la piel", y se llego a
// hornear una tabla que metia 10.486 vertices de tejido hacia dentro. No
// funciono: el pecho quedo igual y el cuello empeoro.
//
// Ampliando una de las manchas se ve lo que son: TRIANGULOS SUELTOS, con el
// borde recto, del tamano de un triangulo de la malla. Y alrededor, las facetas
// de la piel, enormes y planas. La piel de este modelo esta muy decimada, de
// modo que donde el cuerpo es convexo la CUERDA de una faceta pasa por DEBAJO
// de la superficie real, y el musculo -- que si conserva su curvatura -- asoma
// por ella. No sobra musculo: falta flecha a la piel.
//
// La cuenta sale: para una faceta de 3 cm sobre un torax de unos 15 cm de
// radio, la flecha es L^2/(8R) = 0,75 mm; para una de 4 cm, 1,3 mm. Por eso lo
// que se ve son esquirlas de uno o dos milimetros y no musculos enteros.
//
// LO QUE SE HACE. Engordar la piel hacia fuera esa misma flecha. Dos
// milimetros sobre un cuerpo de 1,75 m no cambian la silueta -- es menos que el
// grosor de la propia piel real -- y tapan justo la clase de fallo que produce
// la decimacion.
//
// POR QUE NO SE ABREN COSTURAS. La piel son unas 250 teselas independientes que
// comparten vertices en sus bordes. Desplazar cada vertice por la normal de SU
// tesela separaria las teselas en los bordes, que es el fallo que
// `relaxSkinSeams` existe para evitar. Aqui se SUELDAN primero los vertices
// coincidentes y se promedia la normal del grupo, de modo que las dos copias de
// un mismo punto se mueven exactamente igual y el borde sigue cerrado.
//
// Va ANTES de cualquier pase de pesos y no toca ninguno: solo mueve posiciones
// en reposo, cuando todas las matrices de hueso son la identidad.

import * as THREE from 'three';
import { materialIsSkin } from './materialColors';

/**
 * Cuanto se engorda la piel, en metros.
 *
 * Tres milimetros es el OPTIMO MEDIDO, no una estimacion. Con el contador de
 * roturas del rasterizador (`BREAKS=1` en `scripts/render-pose.mts`, que cuenta
 * cuantos pixeles del cuerpo NO son piel) sobre la vista frontal en reposo:
 *
 *   sin engordar   1951 pixeles   1,467%
 *   2 mm            805           0,592%
 *   3 mm            692           0,504%   <- minimo
 *   4 mm            712           0,513%
 *   6 mm            811           0,572%
 *
 * La curva tiene fondo porque engordar de mas abre otros huecos (las cuencas de
 * los ojos, sobre todo) y empieza a notarse en las zonas finas. La flecha
 * teorica de una faceta de 3-4 cm sobre un torax de 15 cm de radio es de 0,75 a
 * 1,3 mm, asi que el optimo medido queda, como cabe esperar, algo por encima.
 */
export const SKIN_INFLATE_M = 0.003;

/** Dos vertices a menos de esto son el MISMO punto, duplicado entre teselas. */
const WELD_M = 0.0025;

/** Lo que hizo `inflateSkinShell`. */
export interface SkinInflateReport {
  /** Teselas de piel engordadas. */
  meshes: number;
  /** Vertices desplazados. */
  vertices: number;
  /** Grupos de vertices soldados (bordes compartidos entre teselas). */
  welds: number;
}

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();

/**
 * Engorda el sobre de la piel para que las facetas planas no se hundan bajo el
 * tejido que tapan.
 *
 * Idempotente: deja la marca en `mesh.userData.skinInflated`, asi que un
 * segundo montaje (React en modo estricto) no la engorda el doble.
 *
 * @param amount metros a desplazar, por defecto `SKIN_INFLATE_M`.
 */
export function inflateSkinShell(
  scene: THREE.Object3D,
  amount: number = SKIN_INFLATE_M,
): SkinInflateReport {
  const report: SkinInflateReport = { meshes: 0, vertices: 0, welds: 0 };
  if (amount <= 0) return report;
  scene.updateMatrixWorld(true);

  interface Patch {
    mesh: THREE.Mesh;
    world: THREE.Vector3[];
    normal: THREE.Vector3[];
  }
  const patches: Patch[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.userData.skinInflated) return;
    const first = Array.isArray(m.material) ? m.material[0] : m.material;
    if (!materialIsSkin((first as THREE.Material | undefined)?.name ?? '')) return;
    const pos = m.geometry.getAttribute('position');
    if (!pos) return;
    patches.push(geometryInWorld(m));
  });
  if (!patches.length) return report;

  // --- soldadura: un grupo por punto fisico, con la normal promediada --------
  const CELL = WELD_M * 2;
  const cells = new Map<string, number[]>();
  const groupNormal: THREE.Vector3[] = [];
  const groupPos: THREE.Vector3[] = [];
  const groupOf: number[][] = patches.map((p) => new Array(p.world.length).fill(-1));

  for (let pi = 0; pi < patches.length; pi++) {
    const p = patches[pi];
    for (let vi = 0; vi < p.world.length; vi++) {
      const w = p.world[vi];
      const cx = Math.floor(w.x / CELL);
      const cy = Math.floor(w.y / CELL);
      const cz = Math.floor(w.z / CELL);
      let found = -1;
      for (let i = -1; i <= 1 && found < 0; i++) {
        for (let j = -1; j <= 1 && found < 0; j++) {
          for (let k = -1; k <= 1 && found < 0; k++) {
            for (const g of cells.get(`${cx + i}|${cy + j}|${cz + k}`) ?? []) {
              if (groupPos[g].distanceTo(w) <= WELD_M) {
                found = g;
                break;
              }
            }
          }
        }
      }
      if (found < 0) {
        found = groupPos.length;
        groupPos.push(w.clone());
        groupNormal.push(new THREE.Vector3());
        const key = `${cx}|${cy}|${cz}`;
        const bucket = cells.get(key);
        if (bucket) bucket.push(found);
        else cells.set(key, [found]);
      } else {
        report.welds++;
      }
      groupOf[pi][vi] = found;
      groupNormal[found].add(p.normal[vi]);
    }
  }
  for (const n of groupNormal) if (n.lengthSq() > 1e-20) n.normalize();

  // --- desplazamiento --------------------------------------------------------
  for (let pi = 0; pi < patches.length; pi++) {
    const p = patches[pi];
    const pos = p.mesh.geometry.getAttribute('position');
    // El desplazamiento se calcula en mundo y se lleva al espacio local de la
    // malla, que es donde vive `position`. La matriz puede tener escala.
    const inv = new THREE.Matrix4().copy(p.mesh.matrixWorld).invert();
    let touched = false;
    for (let vi = 0; vi < p.world.length; vi++) {
      const g = groupOf[pi][vi];
      if (g < 0) continue;
      _n.copy(groupNormal[g]);
      if (_n.lengthSq() < 1e-12) continue;
      _v.copy(p.world[vi]).addScaledVector(_n, amount).applyMatrix4(inv);
      pos.setXYZ(vi, _v.x, _v.y, _v.z);
      report.vertices++;
      touched = true;
    }
    if (touched) {
      pos.needsUpdate = true;
      // Las normales guardadas son Int8 CUANTIZADAS: recalcularlas sin borrar
      // antes el atributo las deja a cero y la malla sale NEGRA. Un
      // desplazamiento uniforme de 2 mm no cambia la orientacion de la
      // superficie, asi que no hay nada que recalcular.
      p.mesh.geometry.boundingSphere = null;
      p.mesh.geometry.boundingBox = null;
      p.mesh.userData.skinInflated = true;
      report.meshes++;
    }
  }
  return report;
}

/** Posiciones de mundo y normales por vertice, de los propios triangulos. */
function geometryInWorld(m: THREE.Mesh): {
  mesh: THREE.Mesh;
  world: THREE.Vector3[];
  normal: THREE.Vector3[];
} {
  const pos = m.geometry.getAttribute('position');
  const world: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    m.localToWorld(v);
    world.push(v.clone());
  }
  const normal = world.map(() => new THREE.Vector3());
  const idx = m.geometry.getIndex();
  const tri = idx ? (idx.array as ArrayLike<number>) : null;
  const count = tri ? tri.length : pos.count;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i + 2 < count; i += 3) {
    const i0 = tri ? tri[i] : i;
    const i1 = tri ? tri[i + 1] : i + 1;
    const i2 = tri ? tri[i + 2] : i + 2;
    a.subVectors(world[i1], world[i0]);
    b.subVectors(world[i2], world[i0]);
    c.crossVectors(a, b);
    normal[i0].add(c);
    normal[i1].add(c);
    normal[i2].add(c);
  }
  // HACIA FUERA. El centro de una tesela de piel esta por dentro del cuerpo, de
  // modo que la normal correcta es la que se aleja de el. Se vota sobre toda la
  // tesela porque una malla espejada trae el bobinado invertido y una sola
  // muestra podria mentir.
  const centre = new THREE.Vector3();
  for (const w of world) centre.add(w);
  centre.multiplyScalar(1 / Math.max(1, world.length));
  let vote = 0;
  const d = new THREE.Vector3();
  for (let i = 0; i < world.length; i++) {
    if (normal[i].lengthSq() < 1e-20) continue;
    d.subVectors(world[i], centre);
    if (d.lengthSq() < 1e-12) continue;
    vote += d.normalize().dot(normal[i]) > 0 ? 1 : -1;
  }
  if (vote < 0) for (const n of normal) n.negate();
  for (const n of normal) if (n.lengthSq() > 1e-20) n.normalize();
  return { mesh: m, world, normal };
}
