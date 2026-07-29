// Regional skin-coverage report for the whole rig, so we know what "completar el
// cuerpo" actually needs. For each anatomical band it reports whether skin is
// present on the front (z>0) and back (z<0), and the muscle/bone underneath, so
// gaps (e.g. the head) are explicit.
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

// central column only (|x|<0.17) to separate trunk/head/neck from the limbs.
const bands: Array<{ label: string; test: (c: THREE.Vector3) => boolean }> = [
  { label: 'head/skull  y>1.42, |x|<0.12', test: (c) => c.y > 1.42 && Math.abs(c.x) < 0.12 },
  { label: 'neck        1.30-1.42, |x|<0.10', test: (c) => c.y > 1.30 && c.y <= 1.42 && Math.abs(c.x) < 0.10 },
  { label: 'chest       1.10-1.35, |x|<0.17', test: (c) => c.y > 1.10 && c.y <= 1.35 && Math.abs(c.x) < 0.17 },
  { label: 'abdomen     0.95-1.10, |x|<0.17', test: (c) => c.y > 0.95 && c.y <= 1.10 && Math.abs(c.x) < 0.17 },
  { label: 'pelvis/hip  0.78-0.95, |x|<0.17', test: (c) => c.y > 0.78 && c.y <= 0.95 && Math.abs(c.x) < 0.17 },
  { label: 'thigh       0.45-0.78, |x|<0.17', test: (c) => c.y > 0.45 && c.y <= 0.78 && Math.abs(c.x) < 0.17 },
  { label: 'shin        0.12-0.45, |x|<0.17', test: (c) => c.y > 0.12 && c.y <= 0.45 && Math.abs(c.x) < 0.17 },
];

interface Acc { skinF: number; skinB: number; muscle: number; bone: number; other: number }
const accs = bands.map(() => ({ skinF: 0, skinB: 0, muscle: 0, bone: 0, other: 0 } as Acc));

scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const mn = matName(m);
  if (colorForMaterial(mn) === null) return;
  const c = center(m);
  for (let i = 0; i < bands.length; i++) {
    if (!bands[i].test(c)) continue;
    const a = accs[i];
    if (materialIsSkin(mn)) { if (c.z >= 0) a.skinF++; else a.skinB++; }
    else {
      const t = tissueClassForMaterial(mn);
      if (t === 'muscle') a.muscle++; else if (t === 'bone') a.bone++; else a.other++;
    }
  }
});

console.log(`GLB: ${GLB}\n`);
console.log('band                       skinFront skinBack  muscle bone  verdict');
for (let i = 0; i < bands.length; i++) {
  const a = accs[i];
  const skinOK = a.skinF > 0 && a.skinB > 0;
  const verdict = skinOK ? 'skin OK (front+back)' : a.skinF + a.skinB > 0 ? 'PARTIAL skin' : 'NO SKIN (bare)';
  console.log(
    `${bands[i].label.padEnd(28)} ${String(a.skinF).padStart(6)} ${String(a.skinB).padStart(8)} ${String(a.muscle).padStart(7)} ${String(a.bone).padStart(4)}  ${verdict}`,
  );
}
