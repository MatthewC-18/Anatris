/**
 * Diagnostic script — compares how gltf-transform and Three.js parse the same GLB.
 *
 * Run from project root:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/diagnose-glb.ts
 *
 * Output: prints both views side-by-side and writes data/diagnose-report.json.
 *
 * This GLB uses EXT_meshopt_compression (applied during gltf-transform meshopt
 * optimization). We register the extension and provide the meshoptimizer
 * decoder so gltf-transform can read the file. Three.js GLTFLoader handles
 * meshopt natively when given the decoder.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// -------------------------------------------------------------------------- //
// Paths
// -------------------------------------------------------------------------- //

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const glbPath = resolve(projectRoot, 'public', 'modelo-opt.glb');
const reportPath = resolve(projectRoot, 'data', 'diagnose-report.json');

if (!existsSync(glbPath)) {
  console.error(`ERROR: cannot find GLB at ${glbPath}`);
  process.exit(1);
}

mkdirSync(dirname(reportPath), { recursive: true });

console.log('GLB:', glbPath);
console.log('');

// -------------------------------------------------------------------------- //
// View A — gltf-transform (with meshopt decoder)
// -------------------------------------------------------------------------- //

console.log('=== View A: gltf-transform ===');

// meshoptimizer's decoder loads a WASM module asynchronously.
await MeshoptDecoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const document = await io.read(glbPath);
const root = document.getRoot();

const gltfMeshes = root.listMeshes();
console.log('Meshes (gltf-transform Mesh objects):', gltfMeshes.length);

// In glTF, one Mesh can contain multiple Primitives (one per material).
// Three.js expands each Primitive into its own Mesh in the scene graph.
let totalPrimitives = 0;
const gltfMeshInfo: Array<{ name: string; primitives: number; materials: string[] }> = [];
for (const m of gltfMeshes) {
  const prims = m.listPrimitives();
  totalPrimitives += prims.length;
  gltfMeshInfo.push({
    name: m.getName(),
    primitives: prims.length,
    materials: prims.map((p) => p.getMaterial()?.getName() ?? '(none)'),
  });
}
console.log('Total primitives across all meshes:', totalPrimitives);
console.log('(Three.js will likely render ~this many Mesh nodes)');
console.log('');

const gltfNamesWithDots = gltfMeshInfo
  .filter((m) => m.name.includes('.'))
  .map((m) => m.name);
console.log('gltf-transform mesh names containing ".": ', gltfNamesWithDots.length);
console.log('First 10:', gltfNamesWithDots.slice(0, 10));
console.log('');

const primDist = new Map<number, number>();
for (const m of gltfMeshInfo) {
  primDist.set(m.primitives, (primDist.get(m.primitives) ?? 0) + 1);
}
console.log('Primitives-per-mesh distribution:');
for (const [n, count] of [...primDist.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${n} primitive(s): ${count} meshes`);
}
console.log('');

const gltfNodes = root.listNodes();
console.log('Nodes (gltf-transform):', gltfNodes.length);
const gltfNodeNamesWithDots = gltfNodes
  .map((n) => n.getName())
  .filter((n) => n.includes('.'));
console.log('Node names containing ".":', gltfNodeNamesWithDots.length);
console.log('First 10:', gltfNodeNamesWithDots.slice(0, 10));
console.log('');

let nodesWithMesh = 0;
let nodesWithoutMesh = 0;
for (const n of gltfNodes) {
  if (n.getMesh()) nodesWithMesh++;
  else nodesWithoutMesh++;
}
console.log('Nodes with a mesh:', nodesWithMesh);
console.log('Nodes without a mesh (pure containers/groups):', nodesWithoutMesh);
console.log('');

// -------------------------------------------------------------------------- //
// View B — Three.js GLTFLoader
// -------------------------------------------------------------------------- //

console.log('=== View B: Three.js GLTFLoader ===');

const glbBuffer = readFileSync(glbPath);
const arrayBuffer = glbBuffer.buffer.slice(
  glbBuffer.byteOffset,
  glbBuffer.byteOffset + glbBuffer.byteLength,
);

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const gltf = await new Promise<{ scene: THREE.Group }>((resolveP, rejectP) => {
  loader.parse(
    arrayBuffer,
    '',
    (result) => resolveP(result as { scene: THREE.Group }),
    (err) => rejectP(err),
  );
});

const scene = gltf.scene;

const threeMeshes: THREE.Mesh[] = [];
const threeNodes: THREE.Object3D[] = [];
scene.traverse((obj) => {
  threeNodes.push(obj);
  if ((obj as THREE.Mesh).isMesh) threeMeshes.push(obj as THREE.Mesh);
});

console.log('Objects in scene (all):', threeNodes.length);
console.log('Meshes in scene:', threeMeshes.length);
console.log('');

const threeNamesWithDots = threeMeshes.map((m) => m.name).filter((n) => n.includes('.'));
const threeNamesWithUnderscores = threeMeshes
  .map((m) => m.name)
  .filter((n) => n.includes('_'));
console.log('Three.js mesh names containing ".":', threeNamesWithDots.length);
console.log('Three.js mesh names containing "_":', threeNamesWithUnderscores.length);
console.log('First 10 names with "_":', threeNamesWithUnderscores.slice(0, 10));
console.log('First 10 names with ".":', threeNamesWithDots.slice(0, 10));
console.log('');

console.log('First 20 mesh names in scene (verbatim):');
threeMeshes.slice(0, 20).forEach((m, i) => console.log(`  [${i}] "${m.name}"`));
console.log('');

const nameCounts = new Map<string, number>();
for (const m of threeMeshes) {
  nameCounts.set(m.name, (nameCounts.get(m.name) ?? 0) + 1);
}
const duplicates = Array.from(nameCounts.entries())
  .filter(([, n]) => n > 1)
  .sort((a, b) => b[1] - a[1]);
console.log('Duplicate mesh names in scene:', duplicates.length);
console.log('Top 10 duplicates:', duplicates.slice(0, 10));
console.log('');

console.log('Parent chains for first 5 duplicate names:');
for (const [dupName] of duplicates.slice(0, 5)) {
  const instances = threeMeshes.filter((m) => m.name === dupName).slice(0, 4);
  console.log(`  "${dupName}" (showing ${instances.length}):`);
  for (const inst of instances) {
    const chain: string[] = [];
    let cur: THREE.Object3D | null = inst;
    while (cur) {
      chain.push(cur.name || '(unnamed)');
      cur = cur.parent;
    }
    console.log(`    ${chain.join(' <- ')}`);
  }
}
console.log('');

// -------------------------------------------------------------------------- //
// Cross-check: which gltf-transform names match Three names?
// -------------------------------------------------------------------------- //

console.log('=== Cross-check ===');
const threeNameSet = new Set(threeMeshes.map((m) => m.name));
const gltfNameSet = new Set(gltfMeshInfo.map((m) => m.name));

let exactMatch = 0;
for (const n of gltfNameSet) if (threeNameSet.has(n)) exactMatch++;

const sanitize = (s: string) => s.replace(/[.\s]/g, '_');
let sanitizedMatch = 0;
for (const n of gltfNameSet) if (threeNameSet.has(sanitize(n))) sanitizedMatch++;

console.log('gltf-transform names that exact-match a Three mesh name:', exactMatch);
console.log('gltf-transform names that match after "." -> "_":', sanitizedMatch);
console.log('');

// -------------------------------------------------------------------------- //
// Spatial sanity check
// -------------------------------------------------------------------------- //

const box = new THREE.Box3().setFromObject(scene);
const center = new THREE.Vector3();
box.getCenter(center);
const size = new THREE.Vector3();
box.getSize(size);
console.log('=== Spatial bounds ===');
console.log('Center:', center.toArray());
console.log('Size:', size.toArray());
console.log('Min X:', box.min.x, 'Max X:', box.max.x);
console.log('');

let leftCount = 0;
let rightCount = 0;
let centerCount = 0;
const xThreshold = size.x * 0.01;
const meshBox = new THREE.Box3();
const meshCenter = new THREE.Vector3();
for (const m of threeMeshes) {
  if (!m.geometry) continue;
  meshBox.setFromObject(m);
  if (!isFinite(meshBox.min.x)) continue;
  meshBox.getCenter(meshCenter);
  const xRel = meshCenter.x - center.x;
  if (xRel > xThreshold) rightCount++;
  else if (xRel < -xThreshold) leftCount++;
  else centerCount++;
}
console.log('Meshes by X position (relative to scene center):');
console.log(`  Right (x > +${xThreshold.toFixed(3)}): ${rightCount}`);
console.log(`  Left  (x < -${xThreshold.toFixed(3)}): ${leftCount}`);
console.log(`  Center                              : ${centerCount}`);
console.log('');

// -------------------------------------------------------------------------- //
// Write report
// -------------------------------------------------------------------------- //

const report = {
  glb: glbPath,
  gltfTransform: {
    meshes: gltfMeshes.length,
    totalPrimitives,
    nodes: gltfNodes.length,
    nodesWithMesh,
    nodesWithoutMesh,
    meshNamesWithDot: gltfNamesWithDots.length,
    nodeNamesWithDot: gltfNodeNamesWithDots.length,
    sampleMeshNamesWithDot: gltfNamesWithDots.slice(0, 30),
    sampleNodeNamesWithDot: gltfNodeNamesWithDots.slice(0, 30),
    primitiveDistribution: Object.fromEntries(primDist),
  },
  threeJs: {
    objects: threeNodes.length,
    meshes: threeMeshes.length,
    meshNamesWithDot: threeNamesWithDots.length,
    meshNamesWithUnderscore: threeNamesWithUnderscores.length,
    sampleNamesWithUnderscore: threeNamesWithUnderscores.slice(0, 30),
    sampleNamesWithDot: threeNamesWithDots.slice(0, 30),
    firstTwentyNames: threeMeshes.slice(0, 20).map((m) => m.name),
    duplicateNames: duplicates.length,
    topDuplicates: duplicates.slice(0, 20),
  },
  crossCheck: {
    exactMatch,
    sanitizedMatch,
  },
  spatial: {
    center: center.toArray(),
    size: size.toArray(),
    bboxMin: box.min.toArray(),
    bboxMax: box.max.toArray(),
    rightMeshes: rightCount,
    leftMeshes: leftCount,
    centerMeshes: centerCount,
  },
};

writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log('Wrote report to', reportPath);