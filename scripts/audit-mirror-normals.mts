// Do the mirror-repaired meshes come out LIT?
//
// This is the check that would have caught the black brachioradialis. The
// optimized GLB stores normals meshopt-quantized -- an Int8Array with
// normalized=true -- and BufferGeometry.computeVertexNormals writes unit-length
// FLOATS through setXYZ. Into an Int8Array every one of them truncates to zero,
// so the four meshes the mirror repair rebuilds ended up with 100% zero-length
// normals and rendered as unlit black shapes, on one arm only. Deleting the
// attribute first makes three.js allocate a fresh Float32 one.
//
// A zero normal kills every lighting term, which is why making the materials
// double-sided never helped: the problem was never the facing.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-mirror-normals.mts
//      BROKEN=1 reproduces the old behaviour, to confirm the check still bites.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { applyMirrorRepair } from './lib/mirrorRepair.mts';
import { layerForMaterial } from '../src/lib/materialColors.ts';
import { rigGlbPath } from './lib/rigPath.mts';

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group; scene.updateMatrixWorld(true);

const repaired = new Set(applyMirrorRepair(scene));
if (process.env.BROKEN) {
  // The old code path: recompute normals INTO the quantized buffer.
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !repaired.has(m.name)) return;
    const src = m.geometry.getAttribute('normal');
    const q = new THREE.BufferAttribute(new Int8Array(src.count * 3), 3, true);
    m.geometry.setAttribute('normal', q);
    m.geometry.computeVertexNormals();
  });
}

const matNameOf = (m: THREE.Mesh) => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};
const zeroFraction = (m: THREE.Mesh): number => {
  const n = m.geometry.getAttribute('normal');
  if (!n) return 1;
  let zero = 0;
  for (let i = 0; i < n.count; i++)
    if (!(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) > 0.5)) zero++;
  return zero / Math.max(1, n.count);
};

let worstAll = 0;
let worstName = '';
const bad: string[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh || !layerForMaterial(matNameOf(m))) return;
  const z = zeroFraction(m);
  if (z > worstAll) { worstAll = z; worstName = m.name; }
  if (z > 0.02) bad.push(`${(z * 100).toFixed(0)}%  ${m.name}${repaired.has(m.name) ? '  (mirror-repaired)' : ''}`);
});
console.log(`repaired meshes: ${[...repaired].join(', ') || 'none'}`);
console.log(`\nmeshes with unusable normals: ${bad.length}`);
for (const b of bad.slice(0, 12)) console.log(`   ${b}`);
console.log(`worst: ${(worstAll * 100).toFixed(0)}% zero-length normals (${worstName})`);
process.exitCode = bad.length > 0 ? 1 : 0;
