// How far can the knee fold before the calf goes INTO the thigh?
//
// The lab caps knee flexion at 105 deg, and that cap is a MESH limit, not a
// clinical one: the real knee flexes ~135 deg (AAOS reference value) and up to
// ~160 passively, heel to buttock. The cap exists because the calf and the thigh
// are two solid, non-deformable skin surfaces -- real tissue squashes, a GLB does
// not -- so past some angle the calf simply passes through the thigh.
//
// 105 was chosen once, by eye. This measures it, so the number can be defended
// or raised: every degree recovered is a degree of the true range the app can
// show instead of print.
//
// Method: knee flexion rotates ONLY shin_flex (plus the patella), so the thigh
// does not move. Take the thigh's skin at rest as a stack of 2 cm horizontal
// slabs, each a circle fitted to its own skin; then pose the knee and ask how
// many CALF skin vertices land inside one of those circles, and how deep.
//
// Skinned meshes are measured with applyBoneTransform. Box3.setFromObject does
// NOT work here: an object's matrix does not change when its bones move.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/measure-knee-fold.mts
//      DEG=90,105,120,135 npx tsx ... scripts/measure-knee-fold.mts
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { materialIsSkin } from '../src/lib/materialColors.ts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, type Side } from './lib/rigPose.mts';

const DEGS = (process.env.DEG ?? '0,60,90,105,120,135,150').split(',').map(Number);
const SIDE = (process.env.SIDE ?? 'R') as Side;
/** Slab height for the thigh profile. */
const SLAB = 0.02;
/** A fold reads as clean while nothing sinks deeper than this. */
const TOLERANCE_M = 0.01;

const buf = readFileSync(rigGlbPath());
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder as never);
const gl = await ld.parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '',
);
const scene = gl.scene as THREE.Object3D;
scene.updateMatrixWorld(true);

const matNameOf = (m: THREE.Mesh): string => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};

// --- where is the knee, and which side is the limb on? --------------------
const legRoot = scene.getObjectByName(SIDE === 'R' ? 'Leg_Armature_R' : 'Leg_Armature_L');
if (!legRoot) {
  console.log('no hay Leg_Armature; nada que medir');
  process.exit(0);
}
const _v = new THREE.Vector3();
let kneeY = 0.45;
let signX = 1;
legRoot.traverse((o) => {
  if (/^shin_flex/.test(o.name)) kneeY = o.getWorldPosition(_v).y;
  if (/^femur/.test(o.name)) signX = Math.sign(o.getWorldPosition(new THREE.Vector3()).x) || 1;
});
const CROTCH_Y = 0.85;

// --- the THIGH at rest, as a stack of circles -----------------------------
const slabKey = (y: number) => Math.round(y / SLAB);
const acc = new Map<number, { sx: number; sz: number; n: number; pts: [number, number][] }>();
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh || !materialIsSkin(matNameOf(m))) return;
  const pos = m.geometry.getAttribute('position');
  if (!pos) return;
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    m.localToWorld(_v);
    if (_v.x * signX < 0.02) continue; // the moving limb only
    if (_v.y < kneeY + 0.04 || _v.y > CROTCH_Y) continue; // thigh only
    const k = slabKey(_v.y);
    const e = acc.get(k) ?? { sx: 0, sz: 0, n: 0, pts: [] };
    e.sx += _v.x; e.sz += _v.z; e.n++; e.pts.push([_v.x, _v.z]);
    acc.set(k, e);
  }
});
const slabs = new Map<number, { cx: number; cz: number; r: number }>();
for (const [k, e] of acc) {
  if (e.n < 30) continue;
  const cx = e.sx / e.n;
  const cz = e.sz / e.n;
  const d = e.pts.map(([x, z]) => Math.hypot(x - cx, z - cz)).sort((a, b) => a - b);
  // 90th percentile, so one stray vertex does not inflate the thigh.
  slabs.set(k, { cx, cz, r: d[Math.floor(d.length * 0.9)] });
}

// --- the CALF's skin, picked at rest by height ----------------------------
const calf: { mesh: THREE.SkinnedMesh; idx: number[] }[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh || !materialIsSkin(matNameOf(m))) return;
  const pos = m.geometry.getAttribute('position');
  if (!pos) return;
  const idx: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    m.localToWorld(_v);
    if (_v.x * signX > 0.02 && _v.y < kneeY - 0.04 && _v.y > 0.04) idx.push(i);
  }
  if (idx.length > 0) calf.push({ mesh: m, idx });
});

const nCalf = calf.reduce((a, l) => a + l.idx.length, 0);
console.log(
  `rodilla ${SIDE} a y=${kneeY.toFixed(3)} · muslo en ${slabs.size} rebanadas · ` +
    `${nCalf} vertices de piel en la pantorrilla\n`,
);

const poser = createRigPoser(scene, 'knee-flexion', SIDE, true);
console.log('  deg    dentro del muslo   mas profundo');
const clean: number[] = [];
for (const deg of DEGS) {
  poser.pose(deg);
  scene.updateMatrixWorld(true);
  let deepest = 0;
  let inside = 0;
  for (const { mesh, idx } of calf) {
    const pos = mesh.geometry.getAttribute('position');
    for (const i of idx) {
      _v.fromBufferAttribute(pos, i);
      mesh.applyBoneTransform(i, _v);
      mesh.localToWorld(_v);
      const s = slabs.get(slabKey(_v.y));
      if (!s) continue;
      const depth = s.r - Math.hypot(_v.x - s.cx, _v.z - s.cz);
      if (depth > 0) {
        inside++;
        if (depth > deepest) deepest = depth;
      }
    }
  }
  const pct = ((inside / nCalf) * 100).toFixed(1);
  const ok = deepest <= TOLERANCE_M;
  if (ok) clean.push(deg);
  console.log(
    `  ${String(deg).padStart(3)}   ${String(inside).padStart(6)} (${pct.padStart(4)}%)        ` +
      `${(deepest * 100).toFixed(1).padStart(5)} cm  ${ok ? '' : '<- se mete en el muslo'}`,
  );
}
poser.pose(0);
console.log(
  `\nmaximo limpio medido (hasta ${TOLERANCE_M * 100} cm): ` +
    `${clean.length > 0 ? Math.max(...clean) + ' deg' : 'ninguno'}\n`,
);
