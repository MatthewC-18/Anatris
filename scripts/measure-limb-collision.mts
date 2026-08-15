// Does the moving leg go THROUGH the standing one?
//
// Cross-body adduction has the same problem at the hip that it has at the
// shoulder: in the pure frontal plane the limb is stopped by the body -- here by
// the other leg, which in the clinic is moved out of the way (or the movement is
// examined supine, with the limb crossing OVER it). A rig that just keeps
// rotating drives one thigh into the other.
//
// The standing leg is modelled from the REST pose as a stack of 2 cm slabs, each
// a circle fitted to its skin; a moving-leg vertex inside that circle, at that
// height, is inside the other leg. The rest pose is the right reference because
// the standing leg does not move in these arcs.
//
// Run: MOVE=hip-adduction DEG=0,10,20 \
//      npx tsx --tsconfig tsconfig.scripts.json scripts/measure-limb-collision.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { materialIsSkin } from '../src/lib/materialColors.ts';
import { applyMirrorRepair } from './lib/mirrorRepair.mts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, type Side } from './lib/rigPose.mts';

const MOVE = process.env.MOVE ?? 'hip-adduction';
const DEGS = (process.env.DEG ?? '0,5,10,15,20').split(',').map(Number);
const SIDE = (process.env.SIDE ?? 'R') as Side;

/** Height of a slab through the standing leg. */
const SLAB = 0.02;
/** Only below the crotch: above it the two limbs share the pelvis. */
const Y_HI = 0.85;
const Y_LO = 0.05;

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

// Which way is the moving limb in world x?
const legRoot = scene.getObjectByName(SIDE === 'R' ? 'Leg_Armature_R' : 'Leg_Armature_L');
let signX = 1;
legRoot?.traverse((o) => {
  if (/^femur/.test(o.name)) signX = Math.sign(o.getWorldPosition(new THREE.Vector3()).x) || 1;
});
if (!legRoot) {
  console.log(`${MOVE}: no hay Leg_Armature; nada que medir`);
  process.exit(0);
}

// --- the STANDING leg, as a stack of circles taken at rest ----------------
const slabKey = (y: number) => Math.round(y / SLAB);
const acc = new Map<number, { sx: number; sz: number; n: number; pts: [number, number][] }>();
const _v = new THREE.Vector3();
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh || !materialIsSkin(matNameOf(m))) return;
  const pos = m.geometry.getAttribute('position');
  if (!pos) return;
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    m.localToWorld(_v);
    if (_v.y < Y_LO || _v.y > Y_HI) continue;
    if (_v.x * signX > -0.02) continue; // the OTHER leg only
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
  // 90th percentile, so a stray vertex does not inflate the limb.
  slabs.set(k, { cx, cz, r: d[Math.floor(d.length * 0.9)] });
}

// --- the MOVING leg's skin ------------------------------------------------
const limb: { mesh: THREE.SkinnedMesh; idx: number[] }[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh || !materialIsSkin(matNameOf(m))) return;
  const pos = m.geometry.getAttribute('position');
  if (!pos) return;
  const idx: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    m.localToWorld(_v);
    if (_v.y >= Y_LO && _v.y <= Y_HI && _v.x * signX > 0.02) idx.push(i);
  }
  if (idx.length > 0) limb.push({ mesh: m, idx });
});

console.log(
  `${MOVE} ${SIDE}: pierna de apoyo en ${slabs.size} rebanadas, ` +
    `${limb.reduce((a, l) => a + l.idx.length, 0)} vertices de piel en la que se mueve\n`,
);
console.log('  deg   dentro de la otra pierna   vertices');
for (const deg of DEGS) {
  poser.pose(deg);
  let deepest = 0;
  let inside = 0;
  for (const { mesh, idx } of limb) {
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
  console.log(
    `${String(deg).padStart(5)}   ${(deepest * 100).toFixed(1).padStart(18)} cm   ${inside}`,
  );
}
