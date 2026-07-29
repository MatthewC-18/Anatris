import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { colorForMaterial, materialIsSkin, tissueClassForMaterial } from '../src/lib/materialColors.ts';

const GLB = process.argv[2] || 'C:/Users/Matthew/Documents/Fisio/rig-src/cuerpo-rig.glb';
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise<any>((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const scene = gltf.scene as THREE.Group;
scene.updateMatrixWorld(true);
const matName = (m: THREE.Mesh) => { const f = Array.isArray(m.material) ? m.material[0] : m.material; return (f as any)?.name ?? ''; };
const center = (m: THREE.Mesh) => { const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); return g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld); };

const byLayer = new Map<string, number>();
const skinNames: string[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const mn = matName(m);
  if (colorForMaterial(mn) === null) return;
  const c = center(m);
  if (c.y < 1.4) return; // head band
  const layer = materialIsSkin(mn) ? 'skin' : tissueClassForMaterial(mn);
  byLayer.set(layer, (byLayer.get(layer) || 0) + 1);
  if (layer === 'skin') skinNames.push(`y=${c.y.toFixed(2)} ${m.name.slice(0,30)} [${mn}]`);
});
console.log(`head band y>1.4 anatomy by layer:`, Object.fromEntries(byLayer));
console.log('head skin meshes:', skinNames.length ? skinNames : 'NONE');
// also 1.3-1.4 (upper neck/jaw) skin
const neck: string[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh; if (!m.isMesh) return; const mn = matName(m);
  if (!materialIsSkin(mn)) return; const c = center(m);
  if (c.y > 1.25) neck.push(`y=${c.y.toFixed(2)} x=${c.x.toFixed(2)} [${mn}]`);
});
console.log('\nskin meshes above y=1.25 (neck/head):', neck.length ? neck : 'NONE');
