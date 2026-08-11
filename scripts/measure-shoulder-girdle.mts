// What the SHOULDER GIRDLE does through an elevation arc, measured on the shipped
// GLB with the app's own chain replayed on the CPU.
//
// sweep-shoulder-arc.mts answers "does the arm land on the asked angle" and "does
// the blade come off the ribs". It cannot answer the complaint that the bones
// cross each other, because that happens INSIDE the girdle: the scapula rotates,
// and if the clavicle it hangs from does not move with it, the acromioclavicular
// joint pulls apart or drives through itself while the skin over it hides the
// whole thing.
//
// Columns (all in cm, all as CHANGE from the rest pose unless said otherwise):
//   clav lat     how far the clavicle's LATERAL end (the acromial end) travels.
//                A real clavicle elevates and retracts through the arc; a static
//                one reads ~0.0 here, which is the bug this script was written for.
//   AC gap       change in the distance from the acromion to that lateral end.
//                The AC joint is a joint, not a hinge in mid-air: this should stay
//                near 0. Positive = the joint pulled APART, negative = the two
//                bones drove INTO each other.
//   AC pen       deepest acromion vertex INSIDE the clavicle mesh (0 = no
//                interpenetration). This is "los huesos se atraviesan", measured.
//   AH dist      acromiohumeral distance: humeral head to the underside of the
//                acromion. Absolute, not a delta. In a real shoulder the head
//                stays centred and the tuberosity clears the arch; a head that
//                climbs into the acromion reads as a shrinking number here.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/measure-shoulder-girdle.mts \
//        [movementId] [left]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { layerForMaterial } from '../src/lib/materialColors.ts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, type Side } from './lib/rigPose.mts';

const MOVEMENT = process.argv[2] && process.argv[2] !== 'left'
  ? process.argv[2]
  : 'glenohumeral-abduction';
const SIDE: Side = process.argv.includes('left') ? 'L' : 'R';

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);

const poser = createRigPoser(scene, MOVEMENT, SIDE, true);
const sideSign = SIDE === 'R' ? 1 : -1;

// --- collect the girdle's bone meshes on the driven side ---
interface BoneMesh { mesh: THREE.SkinnedMesh; name: string }
const clavicleM: BoneMesh[] = [];
const scapulaM: BoneMesh[] = [];
const humerusM: BoneMesh[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  const first = Array.isArray(m.material) ? m.material[0] : m.material;
  if (layerForMaterial((first as any)?.name ?? '') !== 'bone') return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  // Driven side only, and only the girdle's height band.
  if (c.x * sideSign <= 0 || c.y < 1.1 || c.y > 1.6) return;
  if (/clavic/i.test(m.name)) clavicleM.push({ mesh: m, name: m.name });
  else if (/scapul/i.test(m.name)) scapulaM.push({ mesh: m, name: m.name });
  else if (/humer/i.test(m.name)) humerusM.push({ mesh: m, name: m.name });
});

/** Every posed world vertex of a mesh (no subsampling: these are small bones). */
function verts(bm: BoneMesh): THREE.Vector3[] {
  bm.mesh.skeleton.update();
  const pos = bm.mesh.geometry.getAttribute('position');
  const out: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    bm.mesh.applyBoneTransform(i, v);
    bm.mesh.localToWorld(v);
    out.push(v.clone());
  }
  return out;
}
const allVerts = (ms: BoneMesh[]) => ms.flatMap(verts);

/** The clavicle's lateral (acromial) end: its most lateral vertex. */
const lateralEnd = (vs: THREE.Vector3[]) =>
  vs.reduce((a, b) => (b.x * sideSign > a.x * sideSign ? b : a));

/** The acromion: the scapula's most lateral-and-superior vertices. */
function acromion(vs: THREE.Vector3[]): THREE.Vector3[] {
  const scored = vs.map((v) => ({ v, s: v.x * sideSign + v.y }));
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, Math.max(8, Math.floor(vs.length * 0.02))).map((e) => e.v);
}

/** Approximate "is p inside this point cloud" by a convex-hull-free proxy: the
 *  cloud's local density shell. Cheap and good enough to separate "touching" from
 *  "driven through", which is the only distinction this script has to make. */
function deepestInside(probes: THREE.Vector3[], cloud: THREE.Vector3[]): number {
  if (!cloud.length) return 0;
  const c = cloud.reduce((a, b) => a.add(b.clone()), new THREE.Vector3()).divideScalar(cloud.length);
  // Radius of the cloud in the direction of each probe, sampled from the cloud.
  let worst = 0;
  for (const p of probes) {
    const dir = p.clone().sub(c);
    const d = dir.length();
    if (d < 1e-6) continue;
    dir.divideScalar(d);
    let radius = 0;
    for (const q of cloud) {
      const proj = q.clone().sub(c).dot(dir);
      if (proj > radius) {
        // Only count points that are actually near this ray, or a long thin bone
        // reports its own length as a radius in every direction.
        const off = q.clone().sub(c).addScaledVector(dir, -proj).length();
        if (off < 0.012) radius = proj;
      }
    }
    if (radius > 0 && d < radius) worst = Math.max(worst, radius - d);
  }
  return worst;
}

const nearestPair = (a: THREE.Vector3[], b: THREE.Vector3[]) => {
  let best = Infinity;
  for (const p of a) for (const q of b) best = Math.min(best, p.distanceToSquared(q));
  return Math.sqrt(best);
};

const range = (poser.control as any).clinicalRange as { min: number; max: number };
const angles = [0, 15, 30, 45, 60, 90, 120, 150, 180].filter(
  (a) => a >= range.min && a <= range.max,
);

poser.pose(0);
const clavRest = lateralEnd(allVerts(clavicleM)).clone();
const acrRest = acromion(allVerts(scapulaM));
const acGapRest = nearestPair(acrRest, allVerts(clavicleM));

console.log(`movimiento: ${MOVEMENT}   lado ${SIDE}`);
console.log(
  `mallas: ${clavicleM.length} clavícula, ${scapulaM.length} escápula, ` +
  `${humerusM.length} húmero`,
);
console.log(`separación AC en reposo: ${(acGapRest * 100).toFixed(2)} cm\n`);
console.log(' ángulo   clav lat   AC gap   AC pen   AH dist');
for (const deg of angles) {
  poser.pose(deg);
  const clavV = allVerts(clavicleM);
  const scapV = allVerts(scapulaM);
  const humV = allVerts(humerusM);
  const clavTravel = lateralEnd(clavV).distanceTo(clavRest);
  const acr = acromion(scapV);
  const acGap = nearestPair(acr, clavV) - acGapRest;
  const acPen = deepestInside(acr, clavV);
  const ahDist = humV.length ? nearestPair(acr, humV) : NaN;
  console.log(
    `${String(deg).padStart(6)}   ` +
    `${(clavTravel * 100).toFixed(2).padStart(7)}   ` +
    `${(acGap * 100 >= 0 ? '+' : '')}${(acGap * 100).toFixed(2).padStart(5)}   ` +
    `${(acPen * 100).toFixed(2).padStart(6)}   ` +
    `${(ahDist * 100).toFixed(2).padStart(6)}`,
  );
}
