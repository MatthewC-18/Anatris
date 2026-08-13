// Whole-body sweep for the known glTF mirror-export bug.
//
// Z-Anatomy mirrored half the body with uniform scale -1, and the Blender glTF
// exporter non-deterministically mis-orients some of those meshes: the mesh comes
// out rotated ~90 deg (and often collapsed), while its centre stays right, so it
// looks fine in Blender and only shows up when you compare a mesh's bounding-box
// DIMENSIONS with its mirror twin's. See the rig-glb-export-recipe note.
//
// Also checks whether a runtime repair is possible: rebuilding the bad mesh from
// its good twin only works if both sides' skeletons list their bones in the same
// order, since skinIndex values are indices into that list.
//
// Run: npx tsx scripts/audit-mirror-orientation.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { layerForMaterial } from '../src/lib/materialColors.ts';
import { rigGlbPath } from './lib/rigPath.mts';

const GLB = rigGlbPath();
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group; scene.updateMatrixWorld(true);

interface Row {
  mesh: THREE.SkinnedMesh; name: string; side: 'R' | 'L'; layer: string;
  verts: number; dims: [number, number, number]; centre: THREE.Vector3;
}
const rows: Row[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  const first = Array.isArray(m.material) ? m.material[0] : m.material;
  const layer = layerForMaterial((first as any)?.name ?? '');
  if (!layer) return; // only what the lab can show
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  if (Math.abs(c.x) < 0.04) return; // midline meshes have no twin
  g.computeBoundingBox();
  const s = g.boundingBox!.getSize(new THREE.Vector3());
  rows.push({
    mesh: m, name: m.name, side: c.x >= 0 ? 'R' : 'L', layer,
    verts: g.getAttribute('position').count,
    dims: [s.x, s.y, s.z], centre: c,
  });
});

/** Pair meshes by base name + vertex count, then by mirrored centre. */
const key = (r: Row) => `${r.name.replace(/_\d+$/, '')}|${r.verts}`;
const groups = new Map<string, Row[]>();
for (const r of rows) groups.set(key(r), [...(groups.get(key(r)) ?? []), r]);

const longAxis = (d: [number, number, number]) =>
  d[0] >= d[1] && d[0] >= d[2] ? 'X' : d[1] >= d[2] ? 'Y' : 'Z';
const fmt = (d: [number, number, number]) =>
  d.map((v) => (v * 100).toFixed(0)).join('x');

const broken: { name: string; bad: Row; good: Row; shrink: number }[] = [];
for (const list of groups.values()) {
  const R = list.find((r) => r.side === 'R');
  const L = list.find((r) => r.side === 'L');
  if (!R || !L) continue;
  if (longAxis(R.dims) === longAxis(L.dims)) continue;
  // The mis-oriented one is the SMALLER: the bug collapses it.
  const volR = R.dims[0] * R.dims[1] * R.dims[2];
  const volL = L.dims[0] * L.dims[1] * L.dims[2];
  const bad = volR < volL ? R : L;
  const good = volR < volL ? L : R;
  broken.push({
    name: bad.name, bad, good,
    shrink: 1 - (bad.dims[0] * bad.dims[1] * bad.dims[2]) / (good.dims[0] * good.dims[1] * good.dims[2]),
  });
}

console.log(`paired meshes checked: ${[...groups.values()].filter((l) => l.length >= 2).length}`);
console.log(`MIS-ORIENTED pairs: ${broken.length}\n`);
broken.sort((a, b) => b.shrink - a.shrink);
for (const b of broken) {
  console.log(`${b.bad.name.slice(0, 48).padEnd(50)} [${b.bad.layer}]`);
  console.log(`   broken ${b.bad.side}: ${fmt(b.bad.dims).padEnd(14)} long axis ${longAxis(b.bad.dims)}   (${(b.shrink * 100).toFixed(0)}% of its volume lost)`);
  console.log(`   good   ${b.good.side}: ${fmt(b.good.dims).padEnd(14)} long axis ${longAxis(b.good.dims)}`);
}

// ---- can we repair at runtime? ----
console.log('\n--- runtime repair feasibility ---');
const skelOf = (m: THREE.SkinnedMesh) => m.skeleton.bones.map((b) => b.name.replace(/_\d+$/, ''));
let compatible = 0;
for (const b of broken) {
  const a = skelOf(b.bad.mesh), g = skelOf(b.good.mesh);
  const same = a.length === g.length && a.every((n, i) => n === g[i]);
  // Even when the lists differ, the repair works if every bone the GOOD mesh
  // uses exists by name in the BAD mesh's skeleton: then skinIndex can be
  // translated bone-by-bone instead of copied.
  const missing = g.filter((n) => !a.includes(n));
  if (same || missing.length === 0) compatible++;
  console.log(`${b.bad.name.slice(0, 40).padEnd(42)} order ${same ? 'MATCHES' : 'DIFFERS'} (${a.length} vs ${g.length})  remappable: ${missing.length === 0 ? 'YES' : `NO, missing ${missing.join(',')}`}`);
  console.log(`     bad  bones: ${a.join(', ')}`);
  console.log(`     good bones: ${g.join(', ')}`);
}
console.log(
  `\n${compatible} of ${broken.length} can take their twin's geometry directly ` +
  '(same bone order, so skinIndex values mean the same thing on both sides).',
);


// ---- verify the runtime repair actually produces sane geometry ----
console.log('\n--- applying the runtime repair ---');
const mirrorM = new THREE.Matrix4().makeScale(-1, 1, 1);
for (const b of broken) {
  const badBones = b.bad.mesh.skeleton.bones.map((x) => x.name.replace(/_\d+$/, ''));
  const goodBones = b.good.mesh.skeleton.bones.map((x) => x.name.replace(/_\d+$/, ''));
  const remap = goodBones.map((n) => badBones.indexOf(n));
  if (remap.some((i) => i < 0)) { console.log(`  ${b.bad.name}: SKIP`); continue; }
  const toBadLocal = new THREE.Matrix4()
    .copy(b.bad.mesh.matrixWorld).invert()
    .multiply(mirrorM)
    .multiply(b.good.mesh.matrixWorld);
  const dst = b.good.mesh.geometry.clone();
  dst.applyMatrix4(toBadLocal);
  const si = dst.getAttribute('skinIndex');
  if (si) for (let i = 0; i < si.count; i++)
    for (let k = 0; k < 4; k++) si.setComponent(i, k, remap[si.getComponent(i, k)] ?? 0);
  dst.computeBoundingBox();
  dst.computeBoundingSphere();
  b.bad.mesh.geometry = dst;
  const d = dst.boundingBox!.getSize(new THREE.Vector3());
  const c = dst.boundingSphere!.center.clone().applyMatrix4(b.bad.mesh.matrixWorld);
  const goodC = b.good.mesh.geometry.boundingSphere!.center.clone()
    .applyMatrix4(b.good.mesh.matrixWorld);
  console.log(`  ${b.bad.name.slice(0, 40).padEnd(42)} now ${fmt([d.x, d.y, d.z])} cm  long axis ${longAxis([d.x, d.y, d.z])}`);
  console.log(`     centre ${c.toArray().map((v) => v.toFixed(3)).join(', ')}   twin mirrored ${(-goodC.x).toFixed(3)}, ${goodC.y.toFixed(3)}, ${goodC.z.toFixed(3)}`);
  console.log(`     centre error: ${(c.distanceTo(new THREE.Vector3(-goodC.x, goodC.y, goodC.z)) * 100).toFixed(2)} cm`);
}
