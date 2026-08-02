// Solves for where the `scapula` bone's PIVOT should sit so that upward rotation
// slides the blade over the ribcage instead of swinging it off the side.
//
// The blade currently pivots at the glenoid, ~18 cm from its inferior angle, so
// 49 deg of upward rotation sweeps that corner through a 16 cm arc and lifts it
// 8.6 cm clear of the ribs. Moving the pivot toward the centre of the blade
// shortens that arc; moving it too far understates how much the glenoid travels.
// This searches the pivot that best preserves every scapular vertex's rest
// distance to the ribcage, while keeping the glenoid's own travel near the ~3.5 cm
// the joint really moves.
//
// The AXIS is fixed at world Z (perpendicular to the frontal plane): abduction is
// a frontal-plane movement, and the humerus is a CHILD of the scapula, so a
// frontal-plane scapular axis is also what makes each degree of upward rotation
// contribute a full degree of arm elevation.
//
// Run: npx tsx scripts/solve-scapula-pivot.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { layerForMaterial } from '../src/lib/materialColors.ts';

const GLB = 'C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb';
const D2R = Math.PI / 180;
const ANGLES = [15, 30, 45, 60].map((a) => a * D2R); // upward rotation samples
const GH_TRAVEL_TARGET = 0.035; // m the glenohumeral joint really travels at ~60 deg
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group; scene.updateMatrixWorld(true);
const bs = (n: string) => n.replace(/_\d+$/, '');
const root = scene.getObjectByName('Shoulder_Armature_R')!;
const bone = (n: string) => { let f: any = null; root.traverse((o: any) => { if (!f && bs(o.name) === n) f = o; }); return f; };
const ghRest = bone('humerus_gh').getWorldPosition(new THREE.Vector3());
const scapPivot = bone('scapula').getWorldPosition(new THREE.Vector3());

let scapPts: THREE.Vector3[] = [];
const ribPts: THREE.Vector3[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  if (layerForMaterial((f as any)?.name ?? '') !== 'bone') return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  if (c.x < 0 || c.y < 0.85 || c.y > 1.7) return;
  const pos = g.getAttribute('position');
  const isScap = /^Scapula\d*/i.test(m.name);
  const isRib = /rib|sternum|vertebra|costal/i.test(m.name);
  if (!isScap && !isRib) return;
  const step = Math.max(1, Math.floor(pos.count / (isScap ? 600 : 400)));
  for (let i = 0; i < pos.count; i += step) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
    (isScap ? scapPts : ribPts).push(v);
  }
});
console.log(`scapula sample: ${scapPts.length} pts, ribcage sample: ${ribPts.length} pts`);

// spatial hash over the (static) ribcage
const CELL = 0.025;
const hash = new Map<string, THREE.Vector3[]>();
for (const p of ribPts) {
  const k = `${Math.floor(p.x / CELL)}|${Math.floor(p.y / CELL)}|${Math.floor(p.z / CELL)}`;
  hash.set(k, [...(hash.get(k) ?? []), p]);
}
const nearRib = (p: THREE.Vector3) => {
  let best = Infinity;
  for (let r = 1; r <= 8 && best === Infinity; r++) {
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL), cz = Math.floor(p.z / CELL);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++)
      for (const q of hash.get(`${cx + i}|${cy + j}|${cz + k}`) ?? []) best = Math.min(best, p.distanceTo(q));
  }
  return best;
};
const restD = scapPts.map(nearRib);

const AXIS = new THREE.Vector3(0, 0, 1); // frontal plane
// The blade rotates so the inferior angle swings LATERALLY (+x on the right).
// Determine the sign once from a test rotation.
const signProbe = () => {
  let li = 0;
  scapPts.forEach((v, i) => { if (v.y < scapPts[li].y) li = i; });
  const q = new THREE.Quaternion().setFromAxisAngle(AXIS, 30 * D2R);
  const p = scapPts[li].clone().sub(scapPivot).applyQuaternion(q).add(scapPivot);
  return p.x > scapPts[li].x ? 1 : -1;
};
const SIGN = signProbe();

function cost(pivot: THREE.Vector3) {
  let contact = 0;
  let ghPenalty = 0;
  for (const a of ANGLES) {
    const q = new THREE.Quaternion().setFromAxisAngle(AXIS, SIGN * a);
    for (let i = 0; i < scapPts.length; i++) {
      const p = scapPts[i].clone().sub(pivot).applyQuaternion(q).add(pivot);
      const d = nearRib(p) - restD[i];
      contact += d * d;
    }
    // how far the glenohumeral joint is carried
    const gh = ghRest.clone().sub(pivot).applyQuaternion(q).add(pivot);
    const travel = gh.distanceTo(ghRest);
    const want = GH_TRAVEL_TARGET * (a / ANGLES[ANGLES.length - 1]);
    ghPenalty += (travel - want) ** 2;
  }
  return contact / (scapPts.length * ANGLES.length) + 4 * (ghPenalty / ANGLES.length);
}

// coarse grid, then local refine
let best = { p: scapPivot.clone(), c: cost(scapPivot) };
console.log(`\ncurrent pivot ${scapPivot.toArray().map((v) => v.toFixed(3)).join(', ')} -> cost ${best.c.toExponential(3)}`);
for (let x = 0.02; x <= 0.20; x += 0.02)
  for (let y = 1.20; y <= 1.46; y += 0.02)
    for (let z = -0.14; z <= 0.02; z += 0.02) {
      const p = new THREE.Vector3(x, y, z);
      const c = cost(p);
      if (c < best.c) best = { p, c };
    }
console.log(`coarse best  ${best.p.toArray().map((v) => v.toFixed(3)).join(', ')} -> cost ${best.c.toExponential(3)}`);
for (let step = 0.01; step >= 0.0025; step /= 2) {
  let improved = true;
  while (improved) {
    improved = false;
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const p = best.p.clone().add(new THREE.Vector3(d[0], d[1], d[2]).multiplyScalar(step));
      const c = cost(p);
      if (c < best.c) { best = { p, c }; improved = true; }
    }
  }
}
console.log(`refined      ${best.p.toArray().map((v) => v.toFixed(4)).join(', ')} -> cost ${best.c.toExponential(3)}`);

// report the resulting behaviour
let li = 0;
scapPts.forEach((v, i) => { if (v.y < scapPts[li].y) li = i; });
console.log(`\nblade behaviour (inferior angle gap to ribcage, and GH travel):`);
console.log('  deg   current pivot          solved pivot');
for (const a of [15, 30, 45, 60].map((v) => v * D2R)) {
  const q = new THREE.Quaternion().setFromAxisAngle(AXIS, SIGN * a);
  const row = (piv: THREE.Vector3) => {
    const p = scapPts[li].clone().sub(piv).applyQuaternion(q).add(piv);
    const gh = ghRest.clone().sub(piv).applyQuaternion(q).add(piv);
    return `gap ${(nearRib(p) * 100).toFixed(1).padStart(4)} cm, GH moves ${(gh.distanceTo(ghRest) * 100).toFixed(1).padStart(4)} cm`;
  };
  console.log(`  ${String(Math.round(a / D2R)).padStart(3)}   ${row(scapPivot)}   ${row(best.p)}`);
}
console.log(`\nrest gap was ${(restD[li] * 100).toFixed(1)} cm`);
console.log(`\nAXIS = world Z, sign ${SIGN > 0 ? '+' : '-'} for the right scapula`);
console.log(`PIVOT (world, Blender Z-up would be x=${best.p.x.toFixed(4)}, y=${(-best.p.z).toFixed(4)}, z=${best.p.y.toFixed(4)})`);
