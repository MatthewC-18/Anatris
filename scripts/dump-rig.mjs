// scripts/dump-rig.mjs
// Dumps the armature/skin + bone hierarchy of the rigged GLB so the boneMap can
// be authored against VERIFIED names, not the handoff doc from memory.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';

const GLB_PATH = process.argv[2] || 'rig-src/cuerpo-rig.glb';
if (!fs.existsSync(GLB_PATH)) {
  console.error('No GLB en ' + GLB_PATH);
  process.exit(1);
}

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read(GLB_PATH);
const root = doc.getRoot();

const skins = root.listSkins();
const lines = [];
lines.push(`GLB: ${GLB_PATH}`);
lines.push(`Skins: ${skins.length}`);
lines.push('');

// Build a parent lookup so we can find each joint's chain.
const allNodes = root.listNodes();
const parentOf = new Map();
for (const n of allNodes) {
  for (const c of n.listChildren()) parentOf.set(c, n);
}
const nameOf = (n) => (n ? n.getName() || '(unnamed)' : '(none)');

skins.forEach((skin, i) => {
  const joints = skin.listJoints();
  const skel = skin.getSkeleton();
  lines.push(`=== Skin #${i}: "${skin.getName() || '(unnamed)'}" ===`);
  lines.push(`  skeleton root node: ${nameOf(skel)}`);
  lines.push(`  joints (${joints.length}):`);
  for (const j of joints) {
    const parent = parentOf.get(j);
    lines.push(`    - ${nameOf(j)}   (parent: ${nameOf(parent)})`);
  }
  lines.push('');
});

// Also: top-level scene node names that look like armature roots.
lines.push('=== Scene root nodes ===');
for (const scene of root.listScenes()) {
  for (const n of scene.listChildren()) lines.push(`  - ${nameOf(n)}`);
}

const out = lines.join('\n');
fs.writeFileSync('rig-bones.txt', out, 'utf8');
console.log(out);
console.log('\n-> rig-bones.txt');
