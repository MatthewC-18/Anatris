// scripts/diag-axilla-seam.mts
//
// POR QUE LA COSTURA DE LA AXILA SIGUE ABIERTA.
//
// `measure-skin-split` dice que entre `Lateral_region_of_thorax` y
// `Posterior_region_of_arm_2` hay vertices que eran el MISMO punto en reposo y
// que a 100 grados de rotacion interna acaban a 7 cm uno del otro. Si estuvieran
// soldados y con los mismos pesos, la separacion seria exactamente cero.
//
// Esto saca los pesos de las dos copias, hueso por hueso, para ver cual de las
// tres cosas falla: no se sueldan, no se marcan como discrepantes, o se marcan
// pero se escriben distinto en cada malla.

import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { createRigPoser, type Side } from './lib/rigPose.mts';
import { rigGlbPath } from './lib/rigPath.mts';
import { layerForMaterial } from '../src/lib/materialColors.ts';

const MOVEMENT = process.env.MOVE ?? 'glenohumeral-internal-rotation';
const DEG = Number(process.env.DEG ?? 100);
const SIDE: Side = (process.env.SIDE as Side) ?? 'R';
const A = process.env.A ?? 'Lateral_region_of_thorax';
const B = process.env.B ?? 'Posterior_region_of_arm_2';

const buf = readFileSync(rigGlbPath());
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  '',
);
const scene = gltf.scene;
const poser = createRigPoser(scene, MOVEMENT, SIDE);

function find(name: string): THREE.SkinnedMesh {
  let out: THREE.SkinnedMesh | null = null;
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!out && m.isSkinnedMesh && m.name === name) out = m;
  });
  if (!out) throw new Error(`no existe ${name}`);
  return out;
}
const ma = find(A);
const mb = find(B);

const base = (n: string) => n.replace(/_\d+$/, '');

function worldRest(m: THREE.SkinnedMesh): THREE.Vector3[] {
  const pos = m.geometry.getAttribute('position');
  const out: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    m.localToWorld(v);
    out.push(v.clone());
  }
  return out;
}
function worldPosed(m: THREE.SkinnedMesh): THREE.Vector3[] {
  const pos = m.geometry.getAttribute('position');
  const out: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  m.skeleton.update();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    m.applyBoneTransform(i, v);
    m.localToWorld(v);
    out.push(v.clone());
  }
  return out;
}
function weights(m: THREE.SkinnedMesh, vi: number): [string, number][] {
  const si = m.geometry.getAttribute('skinIndex');
  const sw = m.geometry.getAttribute('skinWeight');
  const out: [string, number][] = [];
  for (let k = 0; k < 4; k++) {
    const w = sw.getComponent(vi, k);
    if (w <= 0) continue;
    out.push([base(m.skeleton.bones[si.getComponent(vi, k)]?.name ?? '???'), w]);
  }
  return out.sort((x, y) => y[1] - x[1]);
}

poser.pose(0);
scene.updateMatrixWorld(true);
const ra = worldRest(ma);
const rb = worldRest(mb);

poser.pose(DEG);
scene.updateMatrixWorld(true);
const pa = worldPosed(ma);
const pb = worldPosed(mb);

// Pares que eran el mismo punto en reposo (1 mm) y que mas se separan ahora.
interface Hit { ia: number; ib: number; rest: number; now: number }
const hits: Hit[] = [];
for (let i = 0; i < ra.length; i++) {
  for (let j = 0; j < rb.length; j++) {
    const d0 = ra[i].distanceTo(rb[j]);
    if (d0 > 0.001) continue;
    hits.push({ ia: i, ib: j, rest: d0, now: pa[i].distanceTo(pb[j]) });
  }
}
hits.sort((x, y) => y.now - x.now);

console.log(`\n${MOVEMENT} a ${DEG} grados, lado ${SIDE}`);
console.log(`${A}: ${ra.length} vertices   ${B}: ${rb.length} vertices`);
console.log(`esqueletos: ${ma.skeleton === mb.skeleton ? 'EL MISMO' : 'DISTINTOS'}`);
console.log(`pares coincidentes en reposo: ${hits.length}\n`);

for (const h of hits.slice(0, 6)) {
  console.log(
    `--- par  reposo ${(h.rest * 1000).toFixed(2)} mm  ->  posado ${(h.now * 100).toFixed(1)} cm`,
  );
  console.log(`    en ${ra[h.ia].toArray().map((n) => n.toFixed(3)).join(', ')}`);
  console.log(`    ${A}[${h.ia}]  ${weights(ma, h.ia).map(([n, w]) => `${n}=${w.toFixed(3)}`).join('  ')}`);
  console.log(`    ${B}[${h.ib}]  ${weights(mb, h.ib).map(([n, w]) => `${n}=${w.toFixed(3)}`).join('  ')}`);
}
console.log('');
