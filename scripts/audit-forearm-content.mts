// What does the lab actually SHOW in the forearm, and what does it hide?
//
// The user reports the forearm looking empty ("no llega nada a la muñeca"), bone
// bare down to the wrist, and loose red/blue shapes pointing up out of the arm.
// This inventories every mesh between elbow and wrist: its tissue layer, whether
// the runtime hides it and under which rule, and how much of the forearm's bulk
// each rule removes.
//
// Run: npx tsx scripts/audit-forearm-content.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { resolveArmatureName } from '../src/lib/boneMap.ts';
import { colorForMaterial, layerForMaterial } from '../src/lib/materialColors.ts';

const GLB = 'C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb';
const SIDE: 'R' | 'L' = 'R';
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group; scene.updateMatrixWorld(true);
const bs = (n: string) => n.replace(/_\d+$/, '');
const armRoot = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', SIDE))!;
const boneOf = (n: string) => { let f: any = null; armRoot.traverse((o: any) => { if (!f && bs(o.name) === n) f = o; }); return f; };
const ELBOW_Y = boneOf('forearm_flex').getWorldPosition(new THREE.Vector3()).y;
const WRIST_Y = boneOf('hand_flex').getWorldPosition(new THREE.Vector3()).y;

// The runtime's own predicates.
const inArmBand = (c: THREE.Vector3) => Math.abs(c.x) > 0.16 && c.y > 0.82 && c.y < 1.4;
const inWristCuff = (c: THREE.Vector3) => Math.abs(c.x) > 0.18 && c.y >= 0.86 && c.y < 0.96;
const inDistalRegion = (c: THREE.Vector3) =>
  (c.y > 0.6 && c.y < 0.86 && Math.abs(c.x) > 0.18) || c.y < 0.12;
const DIGITAL = /digitorum|digiti minimi|indicis|pollicis|palmaris/i;

interface Row {
  name: string; layer: string; hiddenBy: string | null;
  y: number; verts: number; volume: number; color: string;
}
const rows: Row[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  if (!m.skeleton?.bones.some((b) => armRoot.getObjectById(b.id))) return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  // forearm band only
  if (c.y < WRIST_Y - 0.03 || c.y > ELBOW_Y + 0.02) return;
  if (Math.abs(c.x) < 0.15) return;
  const first = Array.isArray(m.material) ? m.material[0] : m.material;
  const matName = (first as any)?.name ?? '';
  const layer = layerForMaterial(matName);
  const col = colorForMaterial(matName);
  let hiddenBy: string | null = null;
  if (!layer) hiddenBy = 'not a lab layer (nerve/vessel/fascia/organ)';
  else if (layer === 'connective' && inArmBand(c)) hiddenBy = 'forearm wire cull';
  else if (layer === 'muscle' && inWristCuff(c)) hiddenBy = 'wrist cuff';
  else if (layer === 'muscle' && inArmBand(c) && DIGITAL.test(m.name)) hiddenBy = 'digital muscle cull';
  else if (inDistalRegion(c) && layer !== 'skin') hiddenBy = 'distal skin-cap';
  const pos = g.getAttribute('position');
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const size = bb.getSize(new THREE.Vector3());
  rows.push({
    name: m.name, layer: layer ?? 'none', hiddenBy, y: c.y, verts: pos.count,
    volume: size.x * size.y * size.z,
    color: col === null ? 'none' : `#${col.toString(16).padStart(6, '0')}`,
  });
});

const shown = rows.filter((r) => !r.hiddenBy);
const hidden = rows.filter((r) => r.hiddenBy);
console.log(`FOREARM (y ${WRIST_Y.toFixed(3)} .. ${ELBOW_Y.toFixed(3)}), side ${SIDE}`);
console.log(`${rows.length} meshes bound into this arm: ${shown.length} shown, ${hidden.length} hidden\n`);

const byRule = new Map<string, Row[]>();
for (const r of hidden) byRule.set(r.hiddenBy!, [...(byRule.get(r.hiddenBy!) ?? []), r]);
console.log('hidden, by rule:');
for (const [rule, list] of [...byRule.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const vol = list.reduce((s, r) => s + r.volume, 0);
  console.log(`  ${String(list.length).padStart(3)} meshes  vol ${(vol * 1e6).toFixed(0).padStart(6)}  ${rule}`);
}

console.log('\nMUSCLE shown vs hidden (the "is the forearm empty" question):');
const mus = rows.filter((r) => r.layer === 'muscle');
const musShown = mus.filter((r) => !r.hiddenBy);
const volAll = mus.reduce((s, r) => s + r.volume, 0);
const volShown = musShown.reduce((s, r) => s + r.volume, 0);
console.log(`  ${musShown.length} of ${mus.length} muscle meshes shown`);
console.log(`  ${(volShown / volAll * 100).toFixed(0)}% of forearm muscle bulk survives the culls`);
console.log('\n  shown:');
for (const r of musShown.sort((a, b) => b.volume - a.volume))
  console.log(`    ${(r.volume * 1e6).toFixed(0).padStart(5)}  ${r.name}`);
console.log('\n  hidden:');
for (const r of mus.filter((r) => r.hiddenBy).sort((a, b) => b.volume - a.volume).slice(0, 20))
  console.log(`    ${(r.volume * 1e6).toFixed(0).padStart(5)}  ${r.name.padEnd(52)} ${r.hiddenBy}`);

// What reaches the WRIST? If nothing does, the forearm reads as bone + a gap.
console.log('\nreaching the distal third (y < wrist + 4 cm), shown only:');
const distal = shown.filter((r) => r.y < WRIST_Y + 0.04);
for (const r of distal.sort((a, b) => a.y - b.y))
  console.log(`    y=${r.y.toFixed(3)} [${r.layer.padEnd(10)}] ${r.name}`);
if (!distal.length) console.log('    NOTHING — the forearm ends in bare bone.');
