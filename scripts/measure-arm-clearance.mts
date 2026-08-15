// Does the arm pass IN FRONT of the trunk, or through it?
//
// Cross-body adduction is the one place on the shoulder arcs where the limb and
// the thorax compete for the same space. Eyeballing it does not settle anything:
// seen from the front an arm correctly carried in front of the belly and an arm
// buried inside it draw the same silhouette. This measures the difference.
//
// METHOD. The trunk's FRONT SURFACE is sampled from the REST pose -- clean,
// because at rest the arms hang outside the torso column -- as a grid over
// (x, y) holding the frontmost skin z in each cell. The arm is then posed and
// every forearm/hand vertex that lands over the trunk is compared against that
// surface: z behind it means inside the body. The rest pose is a fair reference
// here because this arc places no lean on the spine below 150 deg.
//
// Run: MOVE=glenohumeral-abduction DEG=-30,-20,-10,0 SIDE=R \
//      npx tsx --tsconfig tsconfig.scripts.json scripts/measure-arm-clearance.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { materialIsSkin } from '../src/lib/materialColors.ts';
import { applyMirrorRepair } from './lib/mirrorRepair.mts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, type Side } from './lib/rigPose.mts';

const MOVE = process.env.MOVE ?? 'glenohumeral-abduction';
const DEGS = (process.env.DEG ?? '-30,-20,-10,0').split(',').map(Number);
const SIDE = (process.env.SIDE ?? 'R') as Side;

/** Grid cell for the trunk surface, metres. */
const CELL = 0.02;
/** Half-width of the trunk column: outside this a skin vertex is arm, not torso. */
const TRUNK_X = 0.16;
/** Vertical window the torso occupies. */
const TRUNK_Y_LO = 0.85;
const TRUNK_Y_HI = 1.50;
// The test window is DELIBERATELY narrower than the surface that feeds it. A
// limb vertex only counts as "over the trunk" well inside the torso column and
// between the pelvis and the chest, so at 0 deg -- arm hanging at the side, ~18
// cm out -- the count is zero and any number above it means the arm really has
// travelled across the body.
const OVER_TRUNK_X = 0.13;
const OVER_TRUNK_Y_LO = 1.00;
const OVER_TRUNK_Y_HI = 1.35;
/** At rest, everything below this is forearm + hand. */
const ELBOW_Y = 1.10;

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);
applyMirrorRepair(scene);

const matNameOf = (m: THREE.Mesh): string => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};

const poser = createRigPoser(scene, MOVE, SIDE, true);

// --- the trunk's front surface, sampled once from the rest pose --------------
const key = (x: number, y: number) => `${Math.round(x / CELL)}|${Math.round(y / CELL)}`;
const front = new Map<string, number>();
const _v = new THREE.Vector3();
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh || !materialIsSkin(matNameOf(m))) return;
  const pos = m.geometry.getAttribute('position');
  if (!pos) return;
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    m.localToWorld(_v);
    if (Math.abs(_v.x) > TRUNK_X || _v.y < TRUNK_Y_LO || _v.y > TRUNK_Y_HI) continue;
    const k = key(_v.x, _v.y);
    const z = front.get(k);
    if (z === undefined || _v.z > z) front.set(k, _v.z);
  }
});

// --- forearm + hand of the moving side, identified at rest -------------------
// Which way is this side in world x? The armature name is not enough -- the rig's
// two shoulder armatures are named R/L but the halves are mirrored, so ask the
// bone. Everything laterally beyond the trunk column on that side, below the
// elbow, is forearm and hand.
//
// Selecting them GEOMETRICALLY rather than by skeleton membership matters: the
// shoulder skeletons in this GLB also carry the vertebrae, so "is bound to the
// shoulder armature" catches most of the torso and buries the signal.
const armature = scene.getObjectByName(
  SIDE === 'R' ? 'Shoulder_Armature_R' : 'Shoulder_Armature_L',
);
let signX = 1;
armature?.traverse((o) => {
  if (/^humerus_gh/.test(o.name)) signX = Math.sign(o.getWorldPosition(new THREE.Vector3()).x) || 1;
});
const limb: { mesh: THREE.Mesh; idx: number[] }[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh || !m.skeleton) return;
  const pos = m.geometry.getAttribute('position');
  if (!pos) return;
  const idx: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    m.localToWorld(_v);
    // The elbow joint itself sits right on ELBOW_Y, so the cut carries a little
    // above it. It must NOT reach up the arm: near the shoulder the limb is part
    // of the body's own silhouette, and "behind the front of the chest" is where
    // an arm root belongs -- measured from there, a perfectly placed arm reads as
    // 11 cm inside.
    if (_v.x * signX > TRUNK_X && _v.y < ELBOW_Y + 0.03 && _v.y > 0.6) idx.push(i);
  }
  if (idx.length > 0) limb.push({ mesh: m, idx });
});
const limbVerts = limb.reduce((a, l) => a + l.idx.length, 0);
console.log(
  `${MOVE} ${SIDE}: trunk surface ${front.size} cells, forearm/hand ${limbVerts} vertices\n`,
);
console.log(
  '  deg   deepest inside   vertices inside   limb centre z vs trunk front   deepest at',
);
for (const deg of DEGS) {
  poser.pose(deg);
  let deepest = 0;
  let inside = 0;
  let handZ = 0;
  let handN = 0;
  let handFront = 0;
  let where = '';
  let whereY = 0;
  for (const { mesh, idx } of limb) {
    const pos = mesh.geometry.getAttribute('position');
    for (const i of idx) {
      _v.fromBufferAttribute(pos, i);
      (mesh as THREE.SkinnedMesh).applyBoneTransform(i, _v);
      mesh.localToWorld(_v);
      if (
        Math.abs(_v.x) > OVER_TRUNK_X ||
        _v.y < OVER_TRUNK_Y_LO ||
        _v.y > OVER_TRUNK_Y_HI
      ) continue;
      const z = front.get(key(_v.x, _v.y));
      if (z === undefined) continue;
      handZ += _v.z;
      handFront += z;
      handN++;
      const depth = z - _v.z;
      if (depth > 0) {
        inside++;
        if (depth > deepest) {
          deepest = depth;
          where = mesh.name;
          whereY = _v.y;
        }
      }
    }
  }
  const gap = handN > 0 ? (handZ - handFront) / handN : NaN;
  console.log(
    `${String(deg).padStart(5)}   ${(deepest * 100).toFixed(1).padStart(9)} cm   ` +
      `${String(inside).padStart(9)} / ${handN}   ` +
      `${(handN > 0 ? `${(gap * 100).toFixed(1)} cm` : 'no overlap').padStart(20)}   ` +
      `${where ? `${where.slice(0, 34)} @ y=${whereY.toFixed(2)}` : '-'}`,
  );
}
