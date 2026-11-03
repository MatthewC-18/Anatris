// Measure the world box each REGION needs so its movement stays in frame.
//
// The lab's camera frames the WHOLE skinned body, always. Choosing "Hombro" and
// getting a 1,75 m figure means the joint under study is a few percent of the
// canvas and every user zooms by hand before they can read anything. To frame
// the region instead, we need to know how much room each region's movement
// actually sweeps -- measured, not guessed.
//
// For every drivable movement of a region this poses the rig across its full
// clinical arc (both sides) and unions the world positions of that region's
// bones. The result is the smallest box that never lets the moving segment
// leave the frame.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/measure-region-frame.mts
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, type Side } from './lib/rigPose.mts';
import { getBoneControl } from '../src/lib/boneMap.ts';
import { REGION_FRAME_BONES } from '../src/lib/labFraming.ts';

const MOVES: Record<string, string[]> = {
  shoulder: ['glenohumeral-abduction', 'glenohumeral-flexion', 'glenohumeral-external-rotation', 'glenohumeral-internal-rotation'],
  elbow: ['elbow-flexion', 'elbow-pronation', 'elbow-supination'],
  hip: ['hip-flexion', 'hip-extension', 'hip-abduction', 'hip-adduction', 'hip-internal-rotation', 'hip-external-rotation'],
  knee: ['knee-flexion', 'knee-internal-rotation', 'knee-external-rotation'],
  ankle: ['ankle-dorsiflexion', 'ankle-plantarflexion', 'ankle-inversion', 'ankle-eversion'],
  cervical: [], thoracic: [], lumbar: [],
};

const buf = readFileSync(rigGlbPath());
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder as never);
const gltf = await loader.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '',
);
const scene = gltf.scene as THREE.Object3D;

function boneBox(names: Set<string>, into: THREE.Box3): void {
  const p = new THREE.Vector3();
  scene.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    if (!names.has(o.name.replace(/_\d+$/, ''))) return;
    o.getWorldPosition(p);
    if (isFinite(p.x)) into.expandByPoint(p);
  });
}

console.log('\nregión      x:min..max        y:min..max        z:min..max        ancho×alto');
for (const [region, names] of Object.entries(REGION_FRAME_BONES)) {
  const set = new Set(names as readonly string[]);
  const box = new THREE.Box3();
  scene.updateMatrixWorld(true);
  boneBox(set, box);                       // rest pose
  for (const id of MOVES[region] ?? []) {
    const ctl = getBoneControl(id);
    if (!ctl || (ctl.kind !== 'chain' && ctl.kind !== 'joint')) continue;
    for (const side of ['R', 'L'] as Side[]) {
      let poser;
      try { poser = createRigPoser(scene, id, side); } catch { continue; }
      const { min, max } = ctl.clinicalRange;
      for (let i = 0; i <= 8; i++) {
        poser.pose(min + ((max - min) * i) / 8);
        scene.updateMatrixWorld(true);
        boneBox(set, box);
      }
      poser.pose(0);
      scene.updateMatrixWorld(true);
    }
  }
  if (box.isEmpty()) { console.log(`${region.padEnd(11)} SIN HUESOS`); continue; }
  const f = (n: number) => n.toFixed(2).padStart(6);
  console.log(
    `${region.padEnd(11)} ${f(box.min.x)}..${f(box.max.x)}   ${f(box.min.y)}..${f(box.max.y)}   ` +
    `${f(box.min.z)}..${f(box.max.z)}   ${(box.max.x - box.min.x).toFixed(2)}×${(box.max.y - box.min.y).toFixed(2)}`,
  );
}
