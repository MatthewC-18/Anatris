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
/** Mirrors FOREARM_CULLS in RigModel.tsx. Pass "culls" to see the old behaviour. */
const FOREARM_CULLS = process.argv[2] === 'culls';
const LIMB_OUTLIER_MARGIN = 1.02;

// Measured outlier cull, mirroring RigModel: reach past the arm's BONE CHAIN,
// thresholded by how far the skin reaches.
const chain: THREE.Vector3[] = [];
armRoot.traverse((o: any) => { if (o.isBone) chain.push(o.getWorldPosition(new THREE.Vector3())); });
const reachOf = (mesh: THREE.Mesh) => {
  const pos = mesh.geometry.getAttribute('position');
  if (!pos || pos.count === 0) return 0;
  const step = Math.max(1, Math.floor(pos.count / 300));
  const d: number[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += step) {
    p.fromBufferAttribute(pos, i); mesh.localToWorld(p);
    let best = Infinity;
    for (const q of chain) { const dd = p.distanceToSquared(q); if (dd < best) best = dd; }
    d.push(Math.sqrt(best));
  }
  d.sort((a, b) => a - b);
  return d[Math.floor(d.length * 0.95)] ?? 0;
};
const outliers = new Set<string>();
{
  const inLimb: { name: string; layer: string; p95: number; y: number }[] = [];
  scene.traverse((o: any) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh || !m.isSkinnedMesh) return;
    if (!m.skeleton?.bones.some((b) => armRoot.getObjectById(b.id))) return;
    const f = Array.isArray(m.material) ? m.material[0] : m.material;
    const layer = layerForMaterial((f as any)?.name ?? '');
    if (!layer) return;
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
    if (c.y > ELBOW_Y + 0.02) return;
    inLimb.push({ name: m.name, layer, p95: reachOf(m), y: c.y });
  });
  const skinReach = inLimb
    .filter((e) => e.layer === 'skin' && e.y >= WRIST_Y - 0.02)
    .reduce((mx, e) => Math.max(mx, e.p95), 0);
  const limit = skinReach * LIMB_OUTLIER_MARGIN;
  for (const e of inLimb) if (e.layer !== 'skin' && e.p95 > limit) outliers.add(e.name);
  console.log(`measured cull: skin reaches ${(skinReach * 100).toFixed(1)} cm, limit ${(limit * 100).toFixed(1)} cm, ${outliers.size} meshes over it
`);
}

interface Row {
  name: string; layer: string; hiddenBy: string | null;
  y: number; verts: number; volume: number; color: string;
}
const rows: Row[] = [];
const centres = new Map<string, THREE.Vector3>();
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
  else if (outliers.has(m.name)) hiddenBy = 'measured outlier';
  else if (FOREARM_CULLS && layer === 'connective' && inArmBand(c)) hiddenBy = 'forearm wire cull';
  else if (FOREARM_CULLS && layer === 'muscle' && inWristCuff(c)) hiddenBy = 'wrist cuff';
  else if (FOREARM_CULLS && layer === 'muscle' && inArmBand(c) && DIGITAL.test(m.name)) hiddenBy = 'digital muscle cull';
  else if (inDistalRegion(c) && layer !== 'skin') hiddenBy = 'distal skin-cap';
  const pos = g.getAttribute('position');
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const size = bb.getSize(new THREE.Vector3());
  centres.set(m.name, c.clone());
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

// Are the culled meshes even in the right PLACE? Distance from each mesh's own
// centre to the forearm bone axis (elbow -> wrist), at rest. A belly sits within
// a few cm of it; anything far off is not where a forearm muscle lives.
{
  const a = boneOf('forearm_flex').getWorldPosition(new THREE.Vector3());
  const b = boneOf('hand_flex').getWorldPosition(new THREE.Vector3());
  const ax = b.clone().sub(a).normalize();
  const distAxis = (p: THREE.Vector3) => {
    const ap = p.clone().sub(a);
    return ap.clone().sub(ax.clone().multiplyScalar(ap.dot(ax))).length();
  };
  console.log('\nDISTANCE OF EACH MESH CENTRE TO THE FOREARM AXIS (rest):');
  const withDist = rows.map((r) => ({ ...r, d: distAxis(centres.get(r.name)!) }));
  withDist.sort((x, y) => y.d - x.d);
  for (const r of withDist.slice(0, 14))
    console.log(`   ${(r.d * 100).toFixed(1).padStart(5)} cm  [${r.layer.padEnd(10)}] ${r.hiddenBy ? `(${r.hiddenBy}) ` : '(SHOWN) '}${r.name}`);
  const shownMax = Math.max(...withDist.filter((r) => !r.hiddenBy).map((r) => r.d));
  console.log(`   worst SHOWN mesh sits ${(shownMax * 100).toFixed(1)} cm off the axis`);
}

// What reaches the WRIST? If nothing does, the forearm reads as bone + a gap.
console.log('\nreaching the distal third (y < wrist + 4 cm), shown only:');
const distal = shown.filter((r) => r.y < WRIST_Y + 0.04);
for (const r of distal.sort((a, b) => a.y - b.y))
  console.log(`    y=${r.y.toFixed(3)} [${r.layer.padEnd(10)}] ${r.name}`);
if (!distal.length) console.log('    NOTHING — the forearm ends in bare bone.');
