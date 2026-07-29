// Print three.js-space centers of meshes in the hand and foot bands, tagged
// skin / bone / muscle / connective, so RigModel's distal region boundaries can
// be set from real coordinates.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { colorForMaterial, tissueClassForMaterial } from '../src/lib/materialColors.ts';

const GLB = process.argv[2] || 'C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig-v5.glb';
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise<any>((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const scene = gltf.scene as THREE.Group;
scene.updateMatrixWorld(true);

const matName = (m: THREE.Mesh) => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as any)?.name ?? '';
};
const isSkin = (n: string) => n.startsWith('Skin') || n.startsWith('Nail');
const center = (m: THREE.Mesh) => {
  const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
  return g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
};

interface Row { name: string; mat: string; tag: string; c: THREE.Vector3 }
const hand: Row[] = [];
const foot: Row[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const mn = matName(m);
  if (colorForMaterial(mn) === null) return; // reference geometry
  const c = center(m);
  const tag = isSkin(mn) ? 'SKIN' : tissueClassForMaterial(mn);
  const row = { name: m.name.slice(0, 40), mat: mn, tag, c };
  if (Math.abs(c.x) > 0.18 && c.y > 0.6 && c.y < 1.05) hand.push(row);
  if (c.y < 0.22) foot.push(row);
});

function summary(label: string, rows: Row[]) {
  console.log(`\n===== ${label} (${rows.length} meshes) =====`);
  // y-band histogram of SKIN vs non-skin
  const bands = new Map<string, { skin: number; other: number }>();
  for (const r of rows) {
    const key = (Math.floor(r.c.y * 20) / 20).toFixed(2);
    const b = bands.get(key) || { skin: 0, other: 0 };
    if (r.tag === 'SKIN') b.skin++; else b.other++;
    bands.set(key, b);
  }
  console.log('y-band  SKIN  other');
  for (const k of [...bands.keys()].sort((a, b) => +a - +b)) {
    const b = bands.get(k)!;
    console.log(`  ${k}   ${String(b.skin).padStart(3)}  ${String(b.other).padStart(4)}`);
  }
  // list the SKIN meshes with their exact centers
  console.log('SKIN meshes:');
  for (const r of rows.filter((x) => x.tag === 'SKIN').sort((a, b) => a.c.y - b.c.y)) {
    console.log(`  y=${r.c.y.toFixed(3)} x=${r.c.x.toFixed(3)}  ${r.name}  [${r.mat}]`);
  }
}
summary('HAND band  |x|>0.18, 0.6<y<1.05', hand);
summary('FOOT band  y<0.22', foot);
