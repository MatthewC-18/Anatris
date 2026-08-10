// scripts/harness/names.ts
//
// Dumps the mesh names three.js ACTUALLY produces for the rig's skin, which is not
// how they are spelt inside the GLB. Source of the cases pinned in
// src/lib/__tests__/neuroSkin.test.ts.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'meshoptimizer';
import { materialIsSkin } from '../../src/lib/materialColors';
const loader = new GLTFLoader();
await MeshoptDecoder.ready;
loader.setMeshoptDecoder(MeshoptDecoder as unknown as Parameters<typeof loader.setMeshoptDecoder>[0]);
const gltf = await loader.loadAsync('/cuerpo-rig.opt.glb');
const names: string[] = [];
gltf.scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const mat = Array.isArray(m.material) ? m.material[0] : m.material;
  if (materialIsSkin((mat as THREE.Material | undefined)?.name ?? '')) names.push(m.name);
});
document.title = 'READY';
document.body.textContent = JSON.stringify([...new Set(names)].sort());
