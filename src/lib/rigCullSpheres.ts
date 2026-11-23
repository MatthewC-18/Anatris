// src/lib/rigCullSpheres.ts
//
// LAS ESFERAS DE RECORTE DE LAS MALLAS CON PIEL SIGUEN A LA POSE.
//
// three descarta antes de dibujar toda malla cuya esfera envolvente cae fuera
// del cuadro (`frustumCulled`). En un SkinnedMesh esa esfera se calcula UNA vez,
// la primera vez que hace falta (en la pose del primer render, el reposo), y no
// se vuelve a calcular al posar. Asi que una malla que la pose ha metido en
// cuadro pero cuya esfera de REPOSO cae fuera, no se dibuja.
//
// MEDIDO en el laboratorio (22 nov), con el banco de capturas: el Slump despues
// del Lasègue y del cruzado deja la camara cerca; en esa pose 261 mallas con
// piel (90 de piel, 94 de musculo, 77 de hueso) desaparecian aunque su pose
// estaba en cuadro: la coronilla salia abierta (se veian el ojo, el temporal y el
// hueso por dentro) y la pierna acababa en la rodilla. Con estas esferas, 0: las
// dos mallas que el banco aun marca tienen TODOS sus vertices dentro de la
// esfera nueva y esta fuera de cuadro, asi que de verdad no se ven. Es una causa
// de los "musculos que no llegan" y los "vacios" al acercar la camara a un
// miembro movido. El clic de disecar usa la misma esfera para descartar.
//
// Recalcular la esfera de cada malla en cada pose es una pasada por TODOS los
// vertices con su piel aplicada: demasiado para cada fotograma de un demo. Lo
// que se hace aqui es exacto y barato:
//
//   - al cargar, por cada malla y cada hueso que la mueve, la esfera de los
//     vertices que ese hueso influye, llevada al espacio de reposo del hueso;
//   - al posar, cada esfera viaja con la matriz de mundo de su hueso (una
//     multiplicacion por par malla-hueso) y la de la malla es la union.
//
// Es conservadora: un vertice con piel es una mezcla convexa (los pesos suman 1)
// de las posiciones que le darian sus huesos por separado, cada una dentro de la
// esfera de su hueso, asi que la mezcla cae dentro de la union. Nunca deja fuera
// nada que este en cuadro; a lo sumo dibuja alguna malla de mas.
//
// La cuenta es la de `SkinnedMesh.applyBoneTransform`: el vertice ligado `p`
// acaba, por el hueso `b`, en `BI * W_b * I_b * B * p` (B, BI: bindMatrix y su
// inversa; W_b la matriz de mundo del hueso; I_b su boneInverse). `I_b * B * c`
// no cambia con la pose y se guarda; en cada pose solo se multiplica por `W_b`,
// se une en mundo y se pasa al espacio de la malla con BI. Los huesos del rig
// giran y se trasladan, no escalan: el radio no se escala.

import * as THREE from 'three';

/** Las esferas por hueso de una malla. */
interface MeshSpheres {
  mesh: THREE.SkinnedMesh;
  /** El hueso de cada esfera (los objetos, para leer su matrixWorld). */
  bones: THREE.Object3D[];
  /**
   * La matriz de mundo de cada hueso, el ARRAY mismo (`matrixWorld.elements`).
   * three lo reescribe en sitio y nunca lo sustituye, asi que se guarda una vez
   * y la actualizacion no recorre `hueso.matrixWorld.elements` en cada par.
   */
  els: ArrayLike<number>[];
  /** x, y, z de `I_b * B * centro`: el centro en el espacio de reposo del hueso. */
  rest: Float64Array;
  radii: Float64Array;
}

/** Lo que hace falta para mantener al dia las esferas de un rig. */
export interface CullSphereTable {
  meshes: MeshSpheres[];
  /** Pares malla-hueso: lo que cuesta cada actualizacion. */
  pairs: number;
}

const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();

/**
 * Prepara la tabla. Se llama al FINAL de la carga, despues de todo lo que
 * reescribe geometria o pesos (recortes, horneados, costuras): una esfera
 * calculada con los pesos de antes podria no envolver los de despues.
 */
export function prepareCullSpheres(root: THREE.Object3D): CullSphereTable {
  const meshes: MeshSpheres[] = [];
  let pairs = 0;
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
    const geo = mesh.geometry;
    const pos = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
    const si = geo.getAttribute('skinIndex') as THREE.BufferAttribute | undefined;
    const sw = geo.getAttribute('skinWeight') as THREE.BufferAttribute | undefined;
    if (!pos || !si || !sw) return;
    const nb = mesh.skeleton.bones.length;
    // Caja por hueso en el espacio ligado de la malla: min (0..2) y max (3..5).
    const box = new Float64Array(nb * 6);
    for (let b = 0; b < nb; b++) {
      box[b * 6] = box[b * 6 + 1] = box[b * 6 + 2] = Infinity;
      box[b * 6 + 3] = box[b * 6 + 4] = box[b * 6 + 5] = -Infinity;
    }
    const used = new Uint8Array(nb);
    const n = pos.count;
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      for (let k = 0; k < 4; k++) {
        if (sw.getComponent(i, k) <= 0) continue;
        const b = si.getComponent(i, k);
        if (b >= nb) continue;
        used[b] = 1;
        const o6 = b * 6;
        if (x < box[o6]) box[o6] = x;
        if (y < box[o6 + 1]) box[o6 + 1] = y;
        if (z < box[o6 + 2]) box[o6 + 2] = z;
        if (x > box[o6 + 3]) box[o6 + 3] = x;
        if (y > box[o6 + 4]) box[o6 + 4] = y;
        if (z > box[o6 + 5]) box[o6 + 5] = z;
      }
    }
    const slot = new Int32Array(nb).fill(-1);
    const boneIdx: number[] = [];
    for (let b = 0; b < nb; b++) if (used[b]) {
      slot[b] = boneIdx.length;
      boneIdx.push(b);
    }
    if (boneIdx.length === 0) return;
    const m = boneIdx.length;
    const centers = new Float64Array(m * 3);
    boneIdx.forEach((b, j) => {
      centers[j * 3] = (box[b * 6] + box[b * 6 + 3]) / 2;
      centers[j * 3 + 1] = (box[b * 6 + 1] + box[b * 6 + 4]) / 2;
      centers[j * 3 + 2] = (box[b * 6 + 2] + box[b * 6 + 5]) / 2;
    });
    const r2 = new Float64Array(m);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      for (let k = 0; k < 4; k++) {
        if (sw.getComponent(i, k) <= 0) continue;
        const b = si.getComponent(i, k);
        if (b >= nb) continue;
        const j = slot[b];
        const dx = x - centers[j * 3];
        const dy = y - centers[j * 3 + 1];
        const dz = z - centers[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > r2[j]) r2[j] = d2;
      }
    }
    // El centro, llevado al espacio de reposo de su hueso: I_b * B * c.
    const rest = new Float64Array(m * 3);
    const radii = new Float64Array(m);
    const bones: THREE.Object3D[] = [];
    for (let j = 0; j < m; j++) {
      const b = boneIdx[j];
      const bone = mesh.skeleton.bones[b];
      const inv = mesh.skeleton.boneInverses[b];
      if (!bone || !inv) continue;
      _m.multiplyMatrices(inv, mesh.bindMatrix);
      _v.set(centers[j * 3], centers[j * 3 + 1], centers[j * 3 + 2]).applyMatrix4(_m);
      const k = bones.length;
      rest[k * 3] = _v.x;
      rest[k * 3 + 1] = _v.y;
      rest[k * 3 + 2] = _v.z;
      radii[k] = Math.sqrt(r2[j]);
      bones.push(bone);
    }
    if (!bones.length) return;
    meshes.push({
      mesh,
      bones,
      els: bones.map((b) => b.matrixWorld.elements),
      rest: rest.subarray(0, bones.length * 3),
      radii: radii.subarray(0, bones.length),
    });
    pairs += bones.length;
  });
  return { meshes, pairs };
}

/**
 * Pone al dia `boundingSphere` de cada malla con la pose ACTUAL de sus huesos.
 * Exige las matrices de mundo de los huesos al dia (`updateMatrixWorld`).
 */
export function refreshCullSpheres(table: CullSphereTable | null | undefined): void {
  if (!table) return;
  for (const e of table.meshes) {
    const { mesh, els, rest, radii } = e;
    // Union en MUNDO, sin objetos intermedios.
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let r = -1;
    for (let j = 0; j < els.length; j++) {
      const w = els[j];
      const x = rest[j * 3];
      const y = rest[j * 3 + 1];
      const z = rest[j * 3 + 2];
      const px = w[0] * x + w[4] * y + w[8] * z + w[12];
      const py = w[1] * x + w[5] * y + w[9] * z + w[13];
      const pz = w[2] * x + w[6] * y + w[10] * z + w[14];
      const pr = radii[j];
      if (r < 0) {
        cx = px;
        cy = py;
        cz = pz;
        r = pr;
        continue;
      }
      const dx = px - cx;
      const dy = py - cy;
      const dz = pz - cz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d + pr <= r) continue; // la nueva cabe dentro
      if (d + r <= pr) {
        // la acumulada cabe dentro de la nueva
        cx = px;
        cy = py;
        cz = pz;
        r = pr;
        continue;
      }
      const nr = (d + r + pr) / 2;
      const t = (nr - r) / d;
      cx += dx * t;
      cy += dy * t;
      cz += dz * t;
      r = nr;
    }
    if (r < 0) continue;
    // Del mundo al espacio de la malla, que es donde three la quiere: BI.
    const bi = mesh.bindMatrixInverse.elements;
    let out = mesh.boundingSphere;
    if (!out) {
      out = new THREE.Sphere();
      mesh.boundingSphere = out;
    }
    out.center.set(
      bi[0] * cx + bi[4] * cy + bi[8] * cz + bi[12],
      bi[1] * cx + bi[5] * cy + bi[9] * cz + bi[13],
      bi[2] * cx + bi[6] * cy + bi[10] * cz + bi[14],
    );
    // El radio tambien pasa por BI: si el nodo de la malla tuviera escala, three
    // la vuelve a aplicar al probar el cuadro (matrixWorld).
    const s = Math.sqrt(
      Math.max(
        bi[0] * bi[0] + bi[1] * bi[1] + bi[2] * bi[2],
        bi[4] * bi[4] + bi[5] * bi[5] + bi[6] * bi[6],
        bi[8] * bi[8] + bi[9] * bi[9] + bi[10] * bi[10],
      ),
    );
    out.radius = r * s;
  }
}
