// Does the TRUNK bend, or does it tip over in one piece?
//
// A physiotherapist reviewing the elevation arc said the spine "se mueve en
// bloque": only the top of the column moved and the rest stayed rigid. He was
// right and it was in the data -- the contralateral trunk lean at the top of the
// arc was placed on five upper thoracic vertebrae (T6..T2) and nowhere else, so
// everything below T6 was a plank and T6 was a hinge.
//
// The Universite Lyon anatomie3d sequence on the humero-escapulo-raquideo rhythm
// names both blocks that intervene in the trunk's displacement: "el raquis
// lumbar (RL)" and "el raquis toracico (RT)". This script measures whether they
// both do.
//
// Columns:
//   lat travel   how far the vertebra's body travels sideways from its rest
//                position, cm. A rigid block shows a straight line of near-zero
//                values and then a jump; a bending column shows a smooth ramp
//                from the sacrum upward.
//   seg deg      the vertebra's OWN rotation relative to its parent, degrees.
//                This is the per-level share -- zero means that level did not
//                participate at all.
//   cum deg      lean of this vertebra against the world, i.e. the sum of every
//                segment below it. The top value is the trunk's total lean.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/measure-trunk-lean.mts \
//        [movementId] [left] [angle]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, type Side } from './lib/rigPose.mts';

const args = process.argv.slice(2);
const MOVEMENT = args.find((a) => /[a-z]-[a-z]/.test(a)) ?? 'glenohumeral-abduction';
const SIDE: Side = args.includes('left') ? 'L' : 'R';
const ANGLES = (() => {
  const n = args.map(Number).filter((x) => !Number.isNaN(x) && x > 0);
  return n.length ? n : [150, 165, 180];
})();

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);

const poser = createRigPoser(scene, MOVEMENT, SIDE, true);

// Base -> apex, which is the order the lean accumulates in.
const CHAIN = [
  'vert_L5', 'vert_L4', 'vert_L3', 'vert_L2', 'vert_L1',
  'vert_T12', 'vert_T11', 'vert_T10', 'vert_T9', 'vert_T8', 'vert_T7',
  'vert_T6', 'vert_T5', 'vert_T4', 'vert_T3', 'vert_T2', 'vert_T1',
  'vert_C7', 'vert_C5', 'vert_C3', 'vert_C1',
];

const bones = new Map<string, THREE.Object3D>();
for (const n of CHAIN) {
  const b = poser.spineBones.get(n);
  if (b) bones.set(n, b);
  else console.warn(`missing spine bone: ${n}`);
}

/** World position of a bone's origin. */
const worldPos = (b: THREE.Object3D) =>
  new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);

/** The bone's own rotation relative to its parent, in degrees. */
const segDeg = (b: THREE.Object3D, rest: THREE.Quaternion) =>
  (2 * Math.acos(Math.min(1, Math.abs(b.quaternion.dot(rest))))) * (180 / Math.PI);

poser.pose(0);
scene.updateMatrixWorld(true);
const restPos = new Map<string, THREE.Vector3>();
const restQuat = new Map<string, THREE.Quaternion>();
const restWorldQ = new Map<string, THREE.Quaternion>();
for (const [n, b] of bones) {
  restPos.set(n, worldPos(b));
  restQuat.set(n, b.quaternion.clone());
  restWorldQ.set(n, b.getWorldQuaternion(new THREE.Quaternion()));
}

console.log(`movement: ${MOVEMENT}   side ${SIDE}`);
console.log('lat travel = sideways displacement of the vertebra body, cm');
console.log('seg deg    = the level\'s OWN rotation; cum deg = lean against the world\n');

for (const deg of ANGLES) {
  poser.pose(deg);
  scene.updateMatrixWorld(true);
  console.log(`--- elevation ${deg} deg ---`);
  console.log('  vertebra   lat travel   seg deg   cum deg');
  let moving = 0;
  for (const [n, b] of bones) {
    const p = worldPos(b);
    const r = restPos.get(n)!;
    const lat = Math.abs(p.x - r.x) * 100;
    const seg = segDeg(b, restQuat.get(n)!);
    const wq = b.getWorldQuaternion(new THREE.Quaternion());
    const cum = 2 * Math.acos(Math.min(1, Math.abs(wq.dot(restWorldQ.get(n)!)))) * (180 / Math.PI);
    if (seg > 0.05) moving++;
    console.log(
      `  ${n.padEnd(9)}  ${lat.toFixed(2).padStart(8)}   ${seg.toFixed(2).padStart(7)}   ${cum.toFixed(2).padStart(7)}`,
    );
  }
  console.log(`  levels participating: ${moving} / ${bones.size}\n`);
}
