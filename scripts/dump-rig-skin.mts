// scripts/dump-rig-skin.mts
//
// Dump the rig's SKIN meshes -- name, material, and where each one actually sits
// on the body -- so the 3D dermatome layer can be authored against VERIFIED names
// instead of names guessed from the Explorar index.
//
// Why measured centres and not just names: Z-Anatomy's surface-region names are
// good ("Anterior_region_of_forearm") but they are also duplicated per patch and
// carry no laterality in some cases (see the note in dissectChannel.ts: side is
// GEOMETRIC, not nominal). A y/x centre tells us which limb and which level a
// patch belongs to, which is what a dermatome band needs.
//
// USAGE
//   npx tsx --tsconfig tsconfig.scripts.json scripts/dump-rig-skin.mts <glb> [out.json]

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';

const glbPath = process.argv[2];
const outPath = process.argv[3] ?? 'rig-skin.json';
if (!glbPath || !fs.existsSync(glbPath)) {
  console.error('Uso: dump-rig-skin.mts <glb> [out.json]');
  process.exit(1);
}

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read(glbPath);
const root = doc.getRoot();

interface Entry {
  node: string;
  mesh: string;
  material: string;
  /** Rest-pose bounding box centre, three.js space (y up). */
  c: [number, number, number];
  min: [number, number, number];
  max: [number, number, number];
  verts: number;
}

// World transform by walking the node tree from the scene roots.
const entries: Entry[] = [];
const mul = (m: number[], v: [number, number, number]): [number, number, number] => [
  m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
  m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
  m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
];
const matMul = (a: number[], b: number[]): number[] => {
  const out = new Array(16).fill(0);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      for (let k = 0; k < 4; k++) out[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
  return out;
};

function walk(node: ReturnType<typeof root.listNodes>[number], parent: number[]): void {
  const world = matMul(parent, node.getMatrix() as unknown as number[]);
  const mesh = node.getMesh();
  if (mesh) {
    for (const prim of mesh.listPrimitives()) {
      const material = prim.getMaterial()?.getName() ?? '(none)';
      if (!material.startsWith('Skin') && !material.startsWith('Nail')) continue;
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const lo: [number, number, number] = [Infinity, Infinity, Infinity];
      const hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
      const v: [number, number, number] = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v as unknown as number[]);
        const w = mul(world, v);
        for (let a = 0; a < 3; a++) {
          if (w[a] < lo[a]) lo[a] = w[a];
          if (w[a] > hi[a]) hi[a] = w[a];
        }
      }
      entries.push({
        node: node.getName() || '(unnamed)',
        mesh: mesh.getName() || '(unnamed)',
        material,
        c: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2],
        min: lo,
        max: hi,
        verts: pos.getCount(),
      });
    }
  }
  for (const child of node.listChildren()) walk(child, world);
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
for (const scene of root.listScenes()) {
  for (const node of scene.listChildren()) walk(node, IDENTITY);
}

fs.writeFileSync(outPath, JSON.stringify(entries, null, 1));
console.log(`Skin/Nail primitives: ${entries.length} -> ${outPath}`);

// A quick human summary: canonical region name (suffix stripped) x count.
const byBase = new Map<string, number>();
for (const e of entries) {
  const base = e.node.replace(/_\d+$/, '').replace(/[lr]$/, '');
  byBase.set(base, (byBase.get(base) ?? 0) + 1);
}
console.log(`Distinct region names: ${byBase.size}`);
for (const [k, n] of [...byBase.entries()].sort()) console.log(`  ${k} x${n}`);
