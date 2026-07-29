// Dump the rig's material names + a sample of skinned-mesh -> material pairs,
// to confirm we can reuse materialColors.colorForMaterial on the rig.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const buf = readFileSync('rig-src/cuerpo-rig.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const scene = gltf.scene;

const matNames = new Map();
let skinned = 0, plain = 0;
const sample = [];
scene.traverse((o) => {
  if (o.isMesh) {
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      matNames.set(m.name, (matNames.get(m.name) || 0) + 1);
    }
    if (o.isSkinnedMesh) skinned++; else plain++;
    if (sample.length < 25) sample.push(`${o.isSkinnedMesh ? 'SK' : '  '} mesh="${o.name}" mat="${(Array.isArray(o.material)?o.material[0]:o.material)?.name}"`);
  }
});

console.log(`skinned meshes: ${skinned}  plain meshes: ${plain}`);
console.log(`\nunique material names (${matNames.size}):`);
console.log([...matNames.entries()].sort((a,b)=>b[1]-a[1]).map(([n,c])=>`  ${c.toString().padStart(4)}  ${n}`).join('\n'));
console.log('\nsample mesh->material:');
console.log(sample.join('\n'));
