// scripts/diag-deltoid-rotation.mts
//
// A 100 grados de rotacion interna el deltoides posterior sale por delante del
// hombro, atravesando la piel. Esto mide por que: reparto de pesos de cada una
// de las tres porciones del deltoides, y cuanto se desplaza su ORIGEN (la parte
// que deberia quedarse quieta sobre la escapula) al rotar el humero.
//
// Uso: npx tsx --tsconfig tsconfig.scripts.json scripts/diag-deltoid-rotation.mts [mov] [deg]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { createRigPoser, baseName } from './lib/rigPose.mts';
import { rigGlbPath } from './lib/rigPath.mts';

const MOVE = process.argv[2] ?? 'glenohumeral-internal-rotation';
const DEG = Number(process.argv[3] ?? 100);

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const buf = readFileSync(rigGlbPath());
const gltf = await loader.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  '',
);
const scene = gltf.scene;
const poser = createRigPoser(scene, MOVE, 'R');

const TARGET = /deltoid/i;
const meshes: THREE.SkinnedMesh[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isSkinnedMesh || !TARGET.test(m.name)) return;
  if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
  const c = m.geometry.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  if (c.x > 0) meshes.push(m);
});

// --- Reparto de pesos por malla ---
console.log('\n===== REPARTO DE PESOS (lado +x) =====');
for (const m of meshes) {
  const si = m.geometry.getAttribute('skinIndex');
  const sw = m.geometry.getAttribute('skinWeight');
  const tot = new Map<string, number>();
  for (let i = 0; i < si.count; i++) {
    for (const k of ['x', 'y', 'z', 'w'] as const) {
      const w = sw[`get${k.toUpperCase()}` as 'getX'](i);
      if (w <= 0) continue;
      const b = m.skeleton.bones[si[`get${k.toUpperCase()}` as 'getX'](i)];
      if (!b) continue;
      const n = baseName(b.name);
      tot.set(n, (tot.get(n) ?? 0) + w);
    }
  }
  const sum = [...tot.values()].reduce((a, b) => a + b, 0) || 1;
  const txt = [...tot.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([n, w]) => `${n} ${((w / sum) * 100).toFixed(0)}%`)
    .join('  ');
  console.log(`  ${m.name.padEnd(46)} ${si.count.toString().padStart(5)} v  ${txt}`);
}

// --- Desplazamiento del origen vs la insercion ---
// El ORIGEN de cada porcion es su extremo superior (y alto); la INSERCION, el
// inferior. Si el origen viaja tanto como la insercion, la porcion entera gira
// en bloque con el humero: eso es lo que atraviesa la piel.
function sample(m: THREE.SkinnedMesh): { origin: THREE.Vector3[]; insert: THREE.Vector3[] } {
  const pos = m.geometry.getAttribute('position');
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 400))) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    pts.push(skinned(m, i, v));
  }
  pts.sort((a, b) => b.y - a.y);
  const n = Math.max(2, Math.floor(pts.length * 0.15));
  return { origin: pts.slice(0, n), insert: pts.slice(-n) };
}

const _m = new THREE.Matrix4();
const _s = new THREE.Matrix4();
function skinned(m: THREE.SkinnedMesh, i: number, v: THREE.Vector3): THREE.Vector3 {
  const si = m.geometry.getAttribute('skinIndex');
  const sw = m.geometry.getAttribute('skinWeight');
  const out = new THREE.Vector3();
  const base = v.clone().applyMatrix4(m.bindMatrix);
  _s.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  for (const k of ['X', 'Y', 'Z', 'W'] as const) {
    const w = sw[`get${k}` as 'getX'](i);
    if (w <= 0) continue;
    const bi = si[`get${k}` as 'getX'](i);
    _m.multiplyMatrices(m.skeleton.bones[bi].matrixWorld, m.skeleton.boneInverses[bi]);
    for (let e = 0; e < 16; e++) _s.elements[e] += _m.elements[e] * w;
  }
  out.copy(base).applyMatrix4(_s).applyMatrix4(m.bindMatrixInverse).applyMatrix4(m.matrixWorld);
  return out;
}

const centro = (p: THREE.Vector3[]) =>
  p.reduce((a, b) => a.add(b), new THREE.Vector3()).divideScalar(p.length);

poser.pose(0);
scene.updateMatrixWorld(true);
const rest = meshes.map((m) => {
  const s = sample(m);
  return { origin: centro(s.origin), insert: centro(s.insert) };
});

poser.pose(DEG);
scene.updateMatrixWorld(true);
console.log(`\n===== DESPLAZAMIENTO A ${DEG} GRADOS DE ${MOVE} =====`);
console.log('  (origen = 15% mas alto de la malla; insercion = 15% mas bajo)\n');
meshes.forEach((m, i) => {
  const s = sample(m);
  const o = centro(s.origin).distanceTo(rest[i].origin) * 100;
  const n = centro(s.insert).distanceTo(rest[i].insert) * 100;
  const ratio = n > 0.01 ? (o / n) * 100 : 0;
  console.log(
    `  ${m.name.padEnd(46)} origen ${o.toFixed(1).padStart(5)} cm   insercion ${n
      .toFixed(1)
      .padStart(5)} cm   origen/insercion ${ratio.toFixed(0).padStart(3)}%`,
  );
});
console.log(
  '\n  Un origen que viaja tanto como la insercion (cerca del 100%) significa que\n' +
    '  la porcion gira ENTERA con el humero: su anclaje escapular no existe.\n',
);
