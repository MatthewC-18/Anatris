// Audits how the LATISSIMUS DORSI is bound in the shipped rig, and whether the
// runtime's lats-follow mechanism can actually work.
//
// Background: the two lats are ONE mirrored Blender mesh sharing a single mesh
// datablock, so their vertex weights are shared too -- the humeral-insertion
// re-weighting had to write BOTH helper bones (latshum_l AND latshum_r) with
// identical per-vertex weights. This script checks what survives into the GLB:
//   - do the two lats share a BufferGeometry?
//   - which bone does dominantBoneName() pick (a vertebra -> the spine re-skin
//     in RigModel wipes the helper weights entirely)?
//   - how much weight do the helpers actually carry?
//
// Run: npx tsx scripts/audit-lats-binding.mts [path-to.glb]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { rigGlbPath } from './lib/rigPath.mts';

const GLB =
  process.argv[2] || rigGlbPath();
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise<any>((res, rej) => loader.parse(ab, '', res, rej));
const scene = gltf.scene as THREE.Group;
scene.updateMatrixWorld(true);

const base = (n: string) => n.replace(/_\d+$/, '');

// Verbatim copy of RigModel's dominantBoneName (200-vertex sample) -- the point
// is to reproduce what the runtime decides, not to do it better.
const dominantBoneName = (mesh: THREE.Mesh): string => {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return '';
  const idx = mesh.geometry.getAttribute('skinIndex');
  const wgt = mesh.geometry.getAttribute('skinWeight');
  if (!idx || !wgt) return '';
  const acc = new Map<number, number>();
  const n = Math.min(idx.count, 200);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(i, k);
      if (w > 0) {
        const b = idx.getComponent(i, k);
        acc.set(b, (acc.get(b) ?? 0) + w);
      }
    }
  let best = -1;
  let bw = 0;
  for (const [b, w] of acc) if (w > bw) { bw = w; best = b; }
  return best >= 0 && sk.skeleton.bones[best] ? sk.skeleton.bones[best].name : '';
};

const lats: THREE.SkinnedMesh[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (m.isMesh && /latissimus/i.test(m.name)) lats.push(m);
});

console.log(`GLB: ${GLB}`);
console.log(`latissimus meshes: ${lats.length}\n`);

const geoms = new Map<string, string[]>();
for (const m of lats) {
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  const vcount = g.getAttribute('position')?.count ?? 0;
  geoms.set(g.uuid, [...(geoms.get(g.uuid) ?? []), m.name]);

  const skel = m.skeleton;
  const helperIdx = new Map<number, { name: string; x: number }>();
  skel?.bones.forEach((b, i) => {
    if (/^latshum_[lr]$/.test(base(b.name)))
      helperIdx.set(i, {
        name: base(b.name),
        x: b.getWorldPosition(new THREE.Vector3()).x,
      });
  });

  // Total weight carried by each bone across the WHOLE mesh.
  const si = g.getAttribute('skinIndex');
  const sw = g.getAttribute('skinWeight');
  const total = new Map<number, number>();
  let helperVerts = 0;
  if (si && sw) {
    for (let i = 0; i < si.count; i++) {
      let touched = false;
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w > 1e-5) {
          const b = si.getComponent(i, k);
          total.set(b, (total.get(b) ?? 0) + w);
          if (helperIdx.has(b)) touched = true;
        }
      }
      if (touched) helperVerts++;
    }
  }
  const top = [...total.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([b, w]) => `${base(skel?.bones[b]?.name ?? '?')}=${(w / si!.count).toFixed(3)}`);

  console.log(`--- ${m.name}`);
  console.log(`    geometry uuid : ${g.uuid}  (${vcount} verts)`);
  console.log(`    world center  : x=${c.x.toFixed(3)} y=${c.y.toFixed(3)} z=${c.z.toFixed(3)}`);
  console.log(`    skeleton bones: ${skel?.bones.length ?? 0}`);
  console.log(`    helpers in skel: ${
    [...helperIdx.values()].map((h) => `${h.name}@x=${h.x.toFixed(3)}`).join(', ') || 'NONE'
  }`);
  console.log(`    verts touched by a helper: ${helperVerts} / ${si?.count ?? 0}`);
  console.log(`    mean weight per bone (top 5): ${top.join(', ')}`);
  const dom = dominantBoneName(m);
  console.log(`    dominantBoneName() -> ${base(dom)}`);
  console.log(
    `    => spine re-skin would ${
      base(dom).startsWith('vert_') ? 'RUN and WIPE the helper weights' : 'not run'
    }\n`,
  );
}

console.log('shared geometry groups:');
for (const [uuid, names] of geoms)
  console.log(`  ${uuid}: ${names.length} mesh(es) -> ${names.join(', ')}`);
