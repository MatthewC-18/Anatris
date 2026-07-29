import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const buf = readFileSync('rig-src/cuerpo-rig.glb');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const scene = gltf.scene;
scene.updateWorldMatrix(true, true);
const fmt = (v) => `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;

function dominantBone(mesh) {
  const skin = mesh.geometry.getAttribute('skinIndex');
  const wgt = mesh.geometry.getAttribute('skinWeight');
  if (!skin || !wgt || !mesh.skeleton) return '?';
  const acc = new Map();
  const n = Math.min(skin.count, 400);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 4; k++) {
      const idx = skin.getComponent(i, k), w = wgt.getComponent(i, k);
      if (w > 0) acc.set(idx, (acc.get(idx) || 0) + w);
    }
  let best = -1, bw = 0;
  for (const [idx, w] of acc) if (w > bw) { bw = w; best = idx; }
  return best >= 0 && mesh.skeleton.bones[best] ? mesh.skeleton.bones[best].name : '?';
}

function show(label, match) {
  console.log(`\n=== ${label} ===`);
  let n = 0;
  scene.traverse((o) => {
    if (!o.isSkinnedMesh || n > 30) return;
    if (!match(o.name.toLowerCase())) return;
    const box = new THREE.Box3().setFromObject(o);
    const c = new THREE.Vector3(); if (!box.isEmpty()) box.getCenter(c);
    console.log(`  ${o.name.slice(0,40).padEnd(40)} bone=${dominantBone(o).padEnd(14)} center=${fmt(c)}`);
    n++;
  });
}

// Upper-limb hand only (exclude foot)
show('HAND (upper limb)', (s) =>
  (s.includes('metacarpal') || s.includes('phalanx') || s.includes('carpal') ||
   s.includes('hand') || s.includes('capitate') || s.includes('lunate') || s.includes('scaphoid'))
  && !s.includes('foot'));

// Long leg bones
show('LEG long bones (femur/tibia/fibula/patella)', (s) =>
  s.includes('femur') || s.includes('tibia') || s.includes('fibula') || s.includes('patella'));

// Outliers: any skinned mesh whose center is far from the body core.
console.log('\n=== OUTLIER skinned meshes (|x|>0.45 or y<-0.1 or y>1.7 or |z|>0.4) ===');
let n = 0;
scene.traverse((o) => {
  if (!o.isSkinnedMesh || n > 40) return;
  const box = new THREE.Box3().setFromObject(o);
  if (box.isEmpty()) return;
  const c = new THREE.Vector3(); box.getCenter(c);
  if (Math.abs(c.x) > 0.45 || c.y < -0.1 || c.y > 1.7 || Math.abs(c.z) > 0.4) {
    console.log(`  ${o.name.slice(0,40).padEnd(40)} bone=${dominantBone(o).padEnd(14)} center=${fmt(c)}`);
    n++;
  }
});
