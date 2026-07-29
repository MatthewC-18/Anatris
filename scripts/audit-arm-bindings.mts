// Audits the DOMINANT bone of every arm/forearm/hand muscle+skin mesh, so we can
// see what actually follows elbow flexion (forearm_flex), forearm rotation
// (forearm_rot) and the wrist (hand_flex). Run: npx tsx scripts/audit-arm-bindings.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { colorForMaterial, tissueClassForMaterial } from '../src/lib/materialColors.ts';

const GLB = process.argv[2] || 'C:/Users/Matthew/Documents/Fisio/rig-src/cuerpo-rig.glb';
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise<any>((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const scene = gltf.scene as THREE.Group;
scene.updateMatrixWorld(true);

const matName = (m: THREE.Mesh) => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as any)?.name ?? '';
};
const center = (m: THREE.Mesh) => {
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  return g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
};
const dominantBone = (mesh: THREE.Mesh): string => {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return '(not skinned)';
  const idx = mesh.geometry.getAttribute('skinIndex');
  const wgt = mesh.geometry.getAttribute('skinWeight');
  if (!idx || !wgt) return '(no weights)';
  const acc = new Map<number, number>();
  const n = Math.min(idx.count, 400);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(i, k);
      if (w > 0) { const b = idx.getComponent(i, k); acc.set(b, (acc.get(b) ?? 0) + w); }
    }
  let best = -1, bw = 0;
  for (const [b, w] of acc) if (w > bw) { bw = w; best = b; }
  const bone = best >= 0 ? sk.skeleton.bones[best] : null;
  return bone ? bone.name.replace(/_\d+$/, '') : '(none)';
};

// Which armature a skinned mesh belongs to (by its skeleton's first bone chain).
const armatureOf = (mesh: THREE.Mesh): string => {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return '';
  const names = sk.skeleton.bones.map((b) => b.name.replace(/_\d+$/, ''));
  if (names.includes('humerus_gh')) return 'Shoulder';
  if (names.includes('shin_flex')) return 'Leg';
  if (names.some((n) => n.startsWith('vert_'))) return 'Spine';
  return '?';
};

interface Row { name: string; bone: string; arm: string; tissue: string; y: number; x: number }
const rows: Row[] = [];
const KEY = /biceps|triceps|brachialis|brachioradialis|pronator|supinator|anconeus|flexor_carpi|flexor_digitorum|extensor_carpi|extensor_digitorum|extensor_indicis|extensor_pollicis|abductor_pollicis|palmaris|flexor_pollicis|Palm|Dorsum_of_hand|finger|wrist|forearm/i;

scene.traverse((o) => {
  const mesh = o as THREE.Mesh;
  if (!mesh.isMesh) return;
  const mn = matName(mesh);
  if (colorForMaterial(mn) === null) return;
  const c = center(mesh);
  // arm/forearm/hand band, right side only for clarity
  if (!(Math.abs(c.x) > 0.14 && c.y > 0.55 && c.y < 1.45)) return;
  const nn = mesh.name.replace(/[._\s]+/g, '_');
  if (!KEY.test(nn)) return;
  rows.push({ name: mesh.name.slice(0, 46), bone: dominantBone(mesh), arm: armatureOf(mesh), tissue: tissueClassForMaterial(mn), y: c.y, x: c.x });
});

rows.sort((a, b) => (a.bone < b.bone ? -1 : a.bone > b.bone ? 1 : b.y - a.y));
console.log(`GLB: ${GLB}\narm/forearm/hand meshes: ${rows.length}\n`);
console.log('bone            arm      tissue      y     x      name');
for (const r of rows)
  console.log(`${r.bone.padEnd(15)} ${r.arm.padEnd(8)} ${r.tissue.padEnd(10)} ${r.y.toFixed(2)}  ${r.x.toFixed(2).padStart(5)}  ${r.name}`);

// Summary: count meshes per dominant bone
const byBone = new Map<string, number>();
for (const r of rows) byBone.set(r.bone, (byBone.get(r.bone) ?? 0) + 1);
console.log('\n=== dominant-bone histogram (arm band) ===');
for (const [b, n] of [...byBone].sort((a, b2) => b2[1] - a[1])) console.log(`${String(n).padStart(4)}  ${b}`);
