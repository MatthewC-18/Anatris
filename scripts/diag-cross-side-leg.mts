// scripts/diag-cross-side-leg.mts
//
// MOVER UNA PIERNA, ¿MUEVE LA OTRA?
//
// En el brazo pasaba: `findIndex` por nombre base de hueso cogia el humero del
// OTRO lado y mover un brazo arrancaba la piel del contrario (30,6 cm). La
// reparacion de la piel de la rodilla (`blendKneeSkin`) busca `femur_base` y
// `shin_flex` exactamente igual, asi que conviene comprobarlo con una medida y
// no de memoria.
//
// Uso: MOVE=knee-flexion DEG=135 SIDE=R npx tsx ... scripts/diag-cross-side-leg.mts

import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { createRigPoser, type Side } from './lib/rigPose.mts';
import { rigGlbPath } from './lib/rigPath.mts';

const MOVE = process.env.MOVE ?? 'knee-flexion';
const DEG = Number(process.env.DEG ?? 135);
const SIDE: Side = (process.env.SIDE as Side) ?? 'R';

const buf = readFileSync(rigGlbPath());
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  '',
);
const scene = gltf.scene;
const poser = createRigPoser(scene, MOVE, SIDE);

// `_R` esta en +x. El lado que se mueve es ese signo.
const posedSign = SIDE === 'R' ? 1 : -1;

const meshes: THREE.SkinnedMesh[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (m.isSkinnedMesh && m.visible) meshes.push(m);
});

function worldOf(m: THREE.SkinnedMesh): THREE.Vector3[] {
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

poser.pose(0);
scene.updateMatrixWorld(true);
const rest = meshes.map(worldOf);
poser.pose(DEG);
scene.updateMatrixWorld(true);
const now = meshes.map(worldOf);

interface Row { name: string; move: number; cx: number; verts: number }
const far: Row[] = [];
meshes.forEach((m, mi) => {
  let cx = 0;
  let worst = 0;
  let moved = 0;
  for (let i = 0; i < rest[mi].length; i++) {
    cx += rest[mi][i].x;
    const d = rest[mi][i].distanceTo(now[mi][i]);
    if (d > 0.001) moved++;
    if (d > worst) worst = d;
  }
  cx /= Math.max(1, rest[mi].length);
  // Solo lo que esta claramente en el lado CONTRARIO al que se mueve.
  if (cx * posedSign > -0.03) return;
  if (worst < 0.005) return;
  far.push({ name: m.name, move: worst, cx, verts: moved });
});

console.log(`\n${MOVE} a ${DEG} grados, lado clinico ${SIDE} (geometrico x${posedSign > 0 ? '+' : '-'})`);
console.log(`${meshes.length} mallas visibles\n`);
console.log('--- MALLAS DEL LADO CONTRARIO QUE SE MUEVEN ---');
if (!far.length) console.log('  ninguna. El otro lado se queda quieto.\n');
else {
  console.log('  viaje   verts   x medio   malla');
  far
    .sort((a, b) => b.move - a.move)
    .slice(0, 20)
    .forEach((r) =>
      console.log(
        `  ${(r.move * 100).toFixed(1).padStart(5)} cm ${String(r.verts).padStart(6)}   ` +
          `${r.cx.toFixed(3).padStart(7)}   ${r.name}`,
      ),
    );
  console.log(`\n  ${far.length} mallas en total.\n`);
}
