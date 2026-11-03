// Which foot meshes actually follow foot_flex?
//
// Rendering ankle dorsi/plantarflexion shows the foot SPLITTING: one slab of
// forefoot rotates with the bone while the rest stays put, leaving a gap across
// the midfoot. audit-arc-tears cannot see this -- it measures how much a single
// mesh GROWS, and a mesh that is simply left behind keeps its size exactly.
//
// So measure travel instead: pose the ankle and report, for every mesh that
// sits in the foot at rest, how far its centroid moved. A mesh bound to
// foot_flex travels centimetres; one still bound to the shin (or to nothing)
// travels ~0.
//
// CENTROIDS ARE COMPUTED BY SKINNING THE VERTICES ON THE CPU
// (`applyBoneTransform`), never with Box3.setFromObject. A skinned mesh's
// object matrix does not change when its BONES move, so setFromObject reports
// zero travel for every mesh in the body and the whole rig looks dead. An
// earlier draft of this script did exactly that and "found" that all 267 meshes
// below the knee were unbound, which was an artefact, not a defect.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-foot-binding.mts
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser } from './lib/rigPose.mts';

const MOVE = process.env.MOVE ?? 'ankle-plantarflexion';
const DEG = Number(process.env.DEG ?? 25);
/** Everything below this world height is foot. Ankle joint sits near 0.10 m. */
const FOOT_Y = Number(process.env.FOOT_Y ?? 0.12);

const buf = readFileSync(rigGlbPath());
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder as never);
const gltf = await loader.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '',
);
const scene = gltf.scene as THREE.Object3D;

const poser = createRigPoser(scene, MOVE, 'R');
poser.pose(0);
scene.updateMatrixWorld(true);

interface Row { name: string; y: number; moved: number }
/** Mean of the skinned, world-space vertices. Sampled for speed on dense meshes. */
function centroid(m: THREE.SkinnedMesh): THREE.Vector3 | null {
  const pos = m.geometry.attributes.position;
  if (!pos || pos.count === 0) return null;
  const step = Math.max(1, Math.floor(pos.count / 200));
  const v = new THREE.Vector3();
  const acc = new THREE.Vector3();
  let n = 0;
  for (let i = 0; i < pos.count; i += step) {
    v.fromBufferAttribute(pos, i);
    m.applyBoneTransform(i, v);
    m.localToWorld(v);
    if (!isFinite(v.x)) continue;
    acc.add(v);
    n++;
  }
  return n > 0 ? acc.divideScalar(n) : null;
}

const rest = new Map<THREE.SkinnedMesh, THREE.Vector3>();
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isSkinnedMesh) return;
  const c = centroid(m);
  if (!c) return;
  // Right side only: x > 0 is the driven side.
  if (c.y > FOOT_Y || c.x < 0) return;
  rest.set(m, c);
});

poser.pose(DEG);
scene.updateMatrixWorld(true);

const rows: Row[] = [];
for (const [m, c0] of rest) {
  const c1 = centroid(m);
  if (!c1) continue;
  rows.push({ name: m.name, y: c0.y, moved: c0.distanceTo(c1) * 100 });
}
rows.sort((a, b) => a.moved - b.moved);

const still = rows.filter((r) => r.moved < 0.3);
console.log(`\n${MOVE} a ${DEG} grados — ${rows.length} mallas en el pie derecho\n`);
console.log(`  SE QUEDAN QUIETAS (< 0,3 cm): ${still.length}`);
for (const r of still.slice(0, 25)) {
  console.log(`    ${r.moved.toFixed(2).padStart(5)} cm  y=${r.y.toFixed(3)}  ${r.name}`);
}
const moving = rows.filter((r) => r.moved >= 0.3);
console.log(`\n  SIGUEN AL HUESO (>= 0,3 cm): ${moving.length}`);
for (const r of moving.slice(-8)) {
  console.log(`    ${r.moved.toFixed(2).padStart(5)} cm  y=${r.y.toFixed(3)}  ${r.name}`);
}
