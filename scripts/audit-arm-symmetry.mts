// Are the two arms the same? Two ways they can fail to be, measured separately.
//
// GEOMETRY: each mesh is paired with its opposite-side twin, the left one is
// mirrored across x=0, and what is left is the real difference -- how far the
// twin's centre sits from where it should be, and whether the two have the same
// shape at all. A pair that disagrees is a mesh the export misplaced on one side.
//
// COLOR: the lab jitters every muscle's shade so neighbouring bellies separate,
// and the jitter is drawn from a hash. Hashing the RAW mesh name gives the left
// and right copies of one muscle two unrelated shades, which is why the body
// reads as two different colors down the midline.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-arm-symmetry.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { colorForMaterialMesh, layerForMaterial } from '../src/lib/materialColors.ts';
import { structureKey } from '../src/lib/parseMeshName.ts';

const buf = readFileSync('C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group; scene.updateMatrixWorld(true);
const matNameOf = (m: THREE.Mesh) => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};

interface Item {
  mesh: THREE.Mesh; name: string; base: string; layer: string; mat: string;
  c: THREE.Vector3; dims: THREE.Vector3; verts: number; hex: number;
}
const items: Item[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const mat = matNameOf(m);
  const layer = layerForMaterial(mat);
  if (!layer) return;
  if (/g0\d\d$/.test(m.name) || /_system/i.test(m.name)) return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  g.computeBoundingBox();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  // Arms only by default; REGION=all sweeps the whole body.
  if (process.env.REGION !== 'all' && (Math.abs(c.x) < 0.14 || c.y < 0.85 || c.y > 1.45)) return;
  if (Math.abs(c.x) < 0.005) return; // true midline structures have no twin
  items.push({
    mesh: m, name: m.name, base: structureKey(m.name), layer, c, mat,
    dims: g.boundingBox!.getSize(new THREE.Vector3()),
    verts: g.getAttribute('position').count,
    hex: colorForMaterialMesh(mat, m.name) ?? 0,
  });
});

// Pair by base name + vertex count, one from each side.
const groups = new Map<string, Item[]>();
for (const it of items) {
  const k = `${it.base}|${it.verts}`;
  groups.set(k, [...(groups.get(k) ?? []), it]);
}
interface Pair { base: string; layer: string; dc: number; dShape: number; left: Item; right: Item }
const pairs: Pair[] = [];
let unpaired = 0;
for (const list of groups.values()) {
  const l = list.filter((x) => x.c.x < 0);
  const r = list.filter((x) => x.c.x > 0);
  if (l.length !== 1 || r.length !== 1) { unpaired += list.length; continue; }
  const mirrored = l[0].c.clone().setX(-l[0].c.x);
  const dc = mirrored.distanceTo(r[0].c);
  const dShape = Math.max(
    Math.abs(l[0].dims.x - r[0].dims.x),
    Math.abs(l[0].dims.y - r[0].dims.y),
    Math.abs(l[0].dims.z - r[0].dims.z),
  );
  pairs.push({ base: l[0].base, layer: l[0].layer, dc, dShape, left: l[0], right: r[0] });
}
pairs.sort((a, b) => b.dc + b.dShape - (a.dc + a.dShape));
console.log(`arm meshes ${items.length}, mirror pairs ${pairs.length}, unpaired ${unpaired}\n`);
console.log('GEOMETRY -- worst pairs (centre offset after mirroring, shape difference):');
for (const p of pairs.slice(0, 10))
  console.log(`   centre ${(p.dc * 100).toFixed(1).padStart(5)} cm  shape ${(p.dShape * 100).toFixed(1).padStart(5)} cm  [${p.layer}] ${p.base}`);
const bad = pairs.filter((p) => p.dc > 0.01 || p.dShape > 0.01);
console.log(`   -> ${bad.length} of ${pairs.length} pairs disagree by more than 1 cm`);

// --- Color symmetry
const dHex = (a: number, b: number) =>
  Math.max(
    Math.abs(((a >> 16) & 255) - ((b >> 16) & 255)),
    Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)),
    Math.abs((a & 255) - (b & 255)),
  );
const musclePairs = pairs.filter((p) => p.layer === 'muscle');
const diffs = musclePairs.map((p) => ({ base: p.base, d: dHex(p.left.hex, p.right.hex), l: p.left.hex, r: p.right.hex }));
diffs.sort((a, b) => b.d - a.d);
const worst = diffs[0]?.d ?? 0;
const mean = diffs.reduce((s, x) => s + x.d, 0) / Math.max(1, diffs.length);
console.log(`\nCOLOR -- left vs right of the SAME muscle, per channel (0-255):`);
console.log(`   worst ${worst}, mean ${mean.toFixed(1)}, over ${diffs.length} muscle pairs`);
for (const d of diffs.slice(0, 10)) {
  const p = musclePairs.find((x) => x.base === d.base)!;
  const why = p.left.mat === p.right.mat ? 'same material' : `materials "${p.left.mat}" vs "${p.right.mat}"`;
  console.log(`   ${String(d.d).padStart(3)}  #${d.l.toString(16).padStart(6, '0')} vs #${d.r.toString(16).padStart(6, '0')}  ${d.base}  (${why})`);
}
