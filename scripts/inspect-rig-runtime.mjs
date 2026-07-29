// Replicates EXACTLY what RigModel does at runtime (three GLTFLoader.parse +
// getObjectByName + traverse) to see why a bone lookup fails.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const INPUT = 'rig-src/cuerpo-rig.glb';
const buf = readFileSync(INPUT);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const loader = new GLTFLoader();
const gltf = await new Promise((res, rej) =>
  loader.parse(ab, '', res, rej),
);
const scene = gltf.scene;

// Count duplicate-named objects across the whole scene.
const nameCount = new Map();
scene.traverse((o) => nameCount.set(o.name, (nameCount.get(o.name) || 0) + 1));

const ARMS = ['Shoulder_Armature_R', 'Shoulder_Armature_L', 'Leg_Armature_R', 'Leg_Armature_L', 'Spine_Armature'];
for (const arm of ARMS) {
  const root = scene.getObjectByName(arm);
  console.log(`\n=== ${arm} === found:${!!root} type:${root?.type} dupCount:${nameCount.get(arm)}`);
  if (!root) continue;
  const names = [];
  root.traverse((o) => names.push(`${o.name}[${o.type}]`));
  console.log(`  subtree (${names.length}):`, names.join(' '));
}

// Where does humerus_gh actually live? Print every humerus_gh and its parent chain.
console.log('\n=== all humerus_gh nodes + parent chain ===');
scene.traverse((o) => {
  if (o.name === 'humerus_gh') {
    const chain = [];
    let p = o;
    while (p) { chain.push(p.name || '(unnamed)'); p = p.parent; }
    console.log('  ', chain.join(' <- '));
  }
});
