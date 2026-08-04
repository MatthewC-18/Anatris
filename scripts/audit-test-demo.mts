// What does an orthopedic test's demo actually light up, and is it still on the arm?
//
// The lab drives a test demo as a rig command: a movement, an angle and a side.
// The glow then comes from that MOVEMENT's activation list, resolved from muscle
// ids to rig meshes. Two things can go wrong and both are visible on screen:
// the movement can recruit muscles that are not what the test is about, and a
// resolved mesh can be somewhere other than on the limb -- the "musculos sueltos"
// floating beside the forearm.
//
// This poses the arm exactly as the demo does and reports, per glowing muscle,
// every mesh it resolves to and how far that mesh sits from the arm's own axis.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-test-demo.mts [testId]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { getBoneControl, resolveArmatureName, type Side } from '../src/lib/boneMap.ts';
import { layerForMaterial } from '../src/lib/materialColors.ts';
import { buildMuscleResolution } from '../src/lib/muscleResolver.ts';
import { parseMeshName } from '../src/lib/parseMeshName.ts';
import { MUSCLES_BY_REGION } from '../src/data/musclesByRegion.ts';
import { movementById } from '../src/data/romByRegion.ts';
import { ORTHOPEDIC_TESTS_BY_REGION as TESTS_BY_REGION } from '../src/data/orthopedicTests/index.ts';
import { applyMirrorRepair } from './lib/mirrorRepair.mts';
import type { Muscle } from '../src/types/muscle.ts';
import type { RomMuscleRole } from '../src/types/rom.ts';

const TEST_ID = process.argv[2] ?? 'mill';
const SIDE: Side = 'R';
const D2R = Math.PI / 180;
const buf = readFileSync('C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group; scene.updateMatrixWorld(true);
applyMirrorRepair(scene);
const bs = (n: string) => n.replace(/_\d+$/, '');

const test = Object.values(TESTS_BY_REGION).flat().find((t) => t.id === TEST_ID);
if (!test) {
  console.log(`unknown test "${TEST_ID}". Known: ${Object.values(TESTS_BY_REGION).flat().map((t) => t.id).join(', ')}`);
  process.exit(1);
}
console.log(`${test.name}  [${test.category}]`);
console.log(`   target:   ${test.target}`);
console.log(`   maneuver: ${test.maneuver}`);
const demo = test.demo;
if (!demo) { console.log('   no demo'); process.exit(0); }
const mv = movementById(demo.movementId);
console.log(`   demo:     ${demo.movementId} at ${demo.angleDeg} deg  ->  "${mv?.name}" (${mv?.plane})`);

// --- which muscles the demo lights, at that angle ---
const acts = (mv?.activations ?? []) as {
  muscleId: string; role: RomMuscleRole; curve: { deg: number; level: number }[];
}[];
const levelAt = (curve: { deg: number; level: number }[], deg: number) => {
  if (curve.length === 0) return 1;
  let prev = curve[0];
  for (const p of curve) {
    if (deg <= p.deg) {
      if (p === prev) return p.level;
      const t = (deg - prev.deg) / Math.max(1e-6, p.deg - prev.deg);
      return prev.level + (p.level - prev.level) * t;
    }
    prev = p;
  }
  return prev.level;
};

// --- resolution, exactly as RigOverlays builds it ---
const names: string[] = [];
const meshByName = new Map<string, THREE.Mesh>();
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (m.isMesh) { names.push(m.name); meshByName.set(m.name, m); }
});
const ALL: Muscle[] = Object.values(MUSCLES_BY_REGION).flat();
const res = buildMuscleResolution(ALL, names);

// --- pose the arm as the demo does ---
const armRoot = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', SIDE))!;
const AX: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1),
};
const ctrl = getBoneControl(demo.movementId) as
  | { kind: string; bone: string; axis: string; sign: Record<string, number> }
  | null;
if (ctrl?.kind === 'joint') {
  let bone: THREE.Object3D | null = null;
  armRoot.traverse((o) => { if (!bone && bs(o.name) === ctrl.bone) bone = o; });
  (bone as THREE.Object3D | null)?.rotateOnAxis(AX[ctrl.axis], demo.angleDeg * D2R * ctrl.sign[SIDE]);
  console.log(`   drives:   bone ${ctrl.bone}, axis ${ctrl.axis}, sign ${ctrl.sign[SIDE]}`);
} else {
  console.log(`   drives:   ${ctrl?.kind ?? 'nothing'} (not a single joint)`);
}
scene.updateMatrixWorld(true);

// --- the arm's own axis, to judge "is it still on the limb" ---
const segs: [THREE.Vector3, THREE.Vector3][] = [];
armRoot.traverse((o) => {
  if (!(o as THREE.Bone).isBone) return;
  const a = o.getWorldPosition(new THREE.Vector3());
  for (const ch of o.children)
    if ((ch as THREE.Bone).isBone) segs.push([a, ch.getWorldPosition(new THREE.Vector3())]);
});
const distToAxis = (p: THREE.Vector3) => {
  let best = Infinity;
  for (const [a, b] of segs) {
    const ab2 = new THREE.Vector3().subVectors(b, a);
    const ap = new THREE.Vector3().subVectors(p, a);
    const l2 = ab2.lengthSq();
    let t = l2 > 1e-9 ? ap.dot(ab2) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    best = Math.min(best, ap.addScaledVector(ab2, -t).length());
  }
  return Math.sqrt(best * best);
};
const posedStats = (m: THREE.Mesh) => {
  const sk = m as THREE.SkinnedMesh;
  const pos = m.geometry.getAttribute('position');
  const idx = m.geometry.getIndex();
  const ids = idx ? [...new Set(Array.from(idx.array as ArrayLike<number>))] : [...Array(pos.count).keys()];
  if (sk.isSkinnedMesh) sk.skeleton.update();
  const step = Math.max(1, Math.floor(ids.length / 250));
  const ds: number[] = [];
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (let i = 0; i < ids.length; i += step) {
    v.fromBufferAttribute(pos, ids[i]);
    if (sk.isSkinnedMesh) sk.applyBoneTransform(ids[i], v);
    m.localToWorld(v);
    box.expandByPoint(v);
    ds.push(distToAxis(v));
  }
  ds.sort((a, b) => a - b);
  return { p50: ds[Math.floor(ds.length * 0.5)], max: ds[ds.length - 1], c: box.getCenter(new THREE.Vector3()) };
};

const wantSide = SIDE === 'R' ? 'right' : 'left';
// What the TEST sends is its own highlightMuscleId; the movement's activation
// list is what the free-movement console sends. The test's comes first, because
// that is what a demo actually shows.
const testGlow = demo.highlightMuscleId
  ? [{ muscleId: demo.highlightMuscleId, role: 'prime-mover' as RomMuscleRole, curve: [{ deg: 0, level: 1 }] }]
  : [];
console.log(
  testGlow.length
    ? `\nTHE TEST LIGHTS: ${demo.highlightMuscleId}`
    : '\nTHE TEST LIGHTS NOTHING (no highlightMuscleId): it poses the joint and emphasizes no structure',
);
for (const a of [...testGlow, ...acts]) {
  const level = levelAt(a.curve, demo.angleDeg);
  const meshNames = res.meshNamesByMuscleId.get(a.muscleId);
  const tag = testGlow.some((t) => t.muscleId === a.muscleId) ? '[TEST]      ' : '[movimiento]';
  console.log(`\n  ${tag} ${a.muscleId}  [${a.role}]  level ${(level * 100).toFixed(0)}%  -> ${meshNames?.length ?? 0} meshes`);
  if (!meshNames) { console.log('     RESOLVES TO NOTHING'); continue; }
  const rows: { n: string; p50: number; max: number; y: number; x: number; side: string }[] = [];
  for (const n of meshNames) {
    const mesh = meshByName.get(n);
    if (!mesh) continue;
    // Same rule as RigOverlays: the name first, the mesh's own position when the
    // name says nothing (most forearm meshes carry no l/r marker at all).
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    const wc = mesh.geometry.boundingSphere!.center.clone().applyMatrix4(mesh.matrixWorld);
    const pside: string =
      Math.abs(wc.x) >= 0.04 ? (wc.x > 0 ? 'right' : 'left') : parseMeshName(n).side;
    if (pside !== wantSide && pside !== 'center') continue;
    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!layerForMaterial((mat as THREE.Material | undefined)?.name)) continue;
    const s = posedStats(mesh);
    rows.push({ n, p50: s.p50, max: s.max, y: s.c.y, x: s.c.x, side: pside });
  }
  rows.sort((x, y) => y.max - x.max);
  for (const r of rows)
    console.log(`     ${(r.p50 * 100).toFixed(1).padStart(5)} cm from axis (worst ${(r.max * 100).toFixed(1)})  x=${r.x.toFixed(2)} (${r.x > 0 ? 'RIGHT arm' : 'LEFT arm'})  name says "${r.side}"  ${r.n}`);
  if (rows.length === 0) console.log('     (no mesh on this side survives the visibility rules)');
}
