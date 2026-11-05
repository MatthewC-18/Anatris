// scripts/diag-mesh-spikes.mts
//
// PICOS: VERTICES QUE SE SALEN DE SU PROPIA MALLA.
//
// Despues de engordar el sobre de la piel 2 mm, lo que queda del moteado rosa
// ya no esta repartido: son grupos concretos y con forma de pua. Ampliado, el
// del costado izquierdo es `External_abdominal_oblique_muscle001`, y lo que
// asoma no es el musculo entero sino unas cuantas puntas.
//
// La hipotesis que mide este script es que no se trata de un musculo mal
// colocado sino de un defecto de la MALLA: vertices que se alejan de donde los
// dejarian sus propios vecinos. Eso se mide sin mirar la piel para nada: la
// distancia de cada vertice al centroide de su anillo de vecinos, comparada con
// el tamano tipico de sus aristas.
//
// Uso:
//   npx tsx --tsconfig tsconfig.scripts.json scripts/diag-mesh-spikes.mts
//   ONLY=oblique   filtra por nombre de malla
//   RATIO=1.5      cuantas veces la arista media hay que sobresalir

import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { createRigPoser } from './lib/rigPose.mts';
import { rigGlbPath } from './lib/rigPath.mts';
import { layerForMaterial } from '../src/lib/materialColors.ts';

const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;
const RATIO = Number(process.env.RATIO ?? 1.5);

const buf = readFileSync(rigGlbPath());
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  '',
);
const scene = gltf.scene;
createRigPoser(scene, 'glenohumeral-abduction', 'R');
scene.updateMatrixWorld(true);

interface Row {
  mesh: string;
  spikes: number;
  worstMm: number;
  verts: number;
}
const rows: Row[] = [];

scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh || !m.visible) return;
  if (ONLY && !ONLY.test(m.name)) return;
  const first = Array.isArray(m.material) ? m.material[0] : m.material;
  const layer = layerForMaterial((first as THREE.Material | undefined)?.name ?? '');
  if (layer !== 'muscle' && layer !== 'connective') return;
  const pos = m.geometry.getAttribute('position');
  const idx = m.geometry.getIndex();
  if (!pos || !idx) return;

  const arr = idx.array as ArrayLike<number>;
  const adj: Set<number>[] = Array.from({ length: pos.count }, () => new Set<number>());
  for (let i = 0; i + 2 < arr.length; i += 3) {
    const t = [arr[i], arr[i + 1], arr[i + 2]];
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) if (a !== b) adj[t[a]].add(t[b]);
    }
  }

  const v = new THREE.Vector3();
  const w = new THREE.Vector3();
  const c = new THREE.Vector3();
  let spikes = 0;
  let worst = 0;
  for (let i = 0; i < pos.count; i++) {
    const ns = adj[i];
    if (ns.size < 3) continue;
    v.fromBufferAttribute(pos, i);
    c.set(0, 0, 0);
    let edge = 0;
    for (const n of ns) {
      w.fromBufferAttribute(pos, n);
      c.add(w);
      edge += v.distanceTo(w);
    }
    c.multiplyScalar(1 / ns.size);
    edge /= ns.size;
    const out = v.distanceTo(c);
    if (edge > 1e-9 && out > RATIO * edge) {
      spikes++;
      if (out > worst) worst = out;
    }
  }
  if (spikes) rows.push({ mesh: m.name, spikes, worstMm: worst * 1000, verts: pos.count });
});

rows.sort((a, b) => b.worstMm - a.worstMm);
console.log(`\n--- PICOS DE MALLA (vertice a mas de ${RATIO}x su arista media del centroide) ---`);
console.log('  pico   picos / vertices   malla');
for (const r of rows.slice(0, 25)) {
  console.log(
    `  ${r.worstMm.toFixed(1).padStart(5)} mm  ${String(r.spikes).padStart(5)} / ${String(
      r.verts,
    ).padStart(6)}   ${r.mesh}`,
  );
}
const tot = rows.reduce((a, r) => a + r.spikes, 0);
console.log(`\n  ${rows.length} mallas con picos, ${tot} vertices en total.\n`);
