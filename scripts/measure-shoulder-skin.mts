// Does the skin of the ANTERIOR SHOULDER hold together through an elevation arc?
//
// sweep-shoulder-arc.mts deliberately excludes the arm and deltoid skin from its
// seam metric, because that skin rests against the flank at zero and MUST
// separate when the arm leaves the body. That exclusion also hides a real
// failure: the STRIP between the chest and the deltoid -- the deltopectoral
// triangle and the infraclavicular fossa -- is supposed to STRETCH across the
// moving shoulder, not to stay behind and open a hole in it.
//
// It stays behind because both strips ship skinned 100% to a thoracic vertebra
// (deltopectoral -> vert_T3, infraclavicular -> vert_T2), exactly like the
// clavicle shipped skinned to vert_T1. So when the arm flexes forward the deltoid
// skin travels with the humerus, the strip does not, and the shoulder opens.
//
// This measures only the seams that TOUCH one of those strips: vertex pairs that
// are coincident at rest, so any growth is the strip pulling away from what it is
// joined to.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/measure-shoulder-skin.mts \
//        [movementId] [left]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { materialIsSkin } from '../src/lib/materialColors.ts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, type Side } from './lib/rigPose.mts';

const MOVEMENT = process.argv[2] && process.argv[2] !== 'left'
  ? process.argv[2]
  : 'glenohumeral-flexion';
const SIDE: Side = process.argv.includes('left') ? 'L' : 'R';

/** The transition strips: skin that bridges thorax and shoulder. */
const BRIDGE = /deltopectoral|infraclavicular/i;

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);

const poser = createRigPoser(scene, MOVEMENT, SIDE, true);
const sideSign = SIDE === 'R' ? 1 : -1;

interface SkinMesh { mesh: THREE.SkinnedMesh; name: string; rest: THREE.Vector3[] }
const skins: SkinMesh[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  if (!materialIsSkin((f as any)?.name ?? '')) return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  // The shoulder's own height band, driven side (plus the midline, which the
  // strips border).
  if (c.y < 1.05 || c.y > 1.65) return;
  if (c.x * sideSign < -0.04) return;
  const pos = g.getAttribute('position');
  const rest: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++)
    rest.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  skins.push({ mesh: m, name: m.name, rest });
});

// Vertex pairs coincident at rest, where at least one side is a bridge strip.
const key = (v: THREE.Vector3) =>
  `${Math.round(v.x * 400)}|${Math.round(v.y * 400)}|${Math.round(v.z * 400)}`;
const seams: { a: number; b: number; ai: number; bi: number }[] = [];
for (let i = 0; i < skins.length; i++)
  for (let j = i + 1; j < skins.length; j++) {
    if (!BRIDGE.test(skins[i].name) && !BRIDGE.test(skins[j].name)) continue;
    const grid = new Map<string, number[]>();
    skins[j].rest.forEach((v, bi) => {
      const k = key(v);
      grid.set(k, [...(grid.get(k) ?? []), bi]);
    });
    skins[i].rest.forEach((v, ai) => {
      for (const bi of grid.get(key(v)) ?? []) {
        if (v.distanceTo(skins[j].rest[bi]) > 0.0025) continue;
        seams.push({ a: i, b: j, ai, bi });
      }
    });
  }

const posed = (s: SkinMesh) => {
  s.mesh.skeleton.update();
  const pos = s.mesh.geometry.getAttribute('position');
  const out: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    s.mesh.applyBoneTransform(i, v);
    s.mesh.localToWorld(v);
    out.push(v.clone());
  }
  return out;
};

const bridges = skins.filter((s) => BRIDGE.test(s.name)).map((s) => s.name);
console.log(`movimiento: ${MOVEMENT}   lado ${SIDE}`);
console.log(`tiras de transición: ${bridges.join(', ') || '(ninguna)'}`);
console.log(`${skins.length} mallas de piel, ${seams.length} pares de costura\n`);
console.log(' ángulo   peor apertura   par');

const range = (poser.control as any).clinicalRange as { min: number; max: number };
for (const deg of [0, 15, 30, 45, 60, 90, 120, 150, 180].filter(
  (a) => a >= range.min && a <= range.max,
)) {
  poser.pose(deg);
  const P = new Map<string, THREE.Vector3[]>();
  for (const s of skins) P.set(s.name, posed(s));
  let worst = 0;
  let pair = '';
  for (const sp of seams) {
    const pa = P.get(skins[sp.a].name)!;
    const pb = P.get(skins[sp.b].name)!;
    const d = pa[sp.ai].distanceTo(pb[sp.bi]);
    if (d > worst) {
      worst = d;
      pair = `${skins[sp.a].name} / ${skins[sp.b].name}`;
    }
  }
  console.log(
    `${String(deg).padStart(6)}   ${(worst * 100).toFixed(2).padStart(9)} cm   ${pair}`,
  );
}
