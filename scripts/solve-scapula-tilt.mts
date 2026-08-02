// The scapula has THREE rotations during elevation (Ludewig/Inman): upward
// rotation, posterior tilt, and external rotation. The rig drives only upward
// rotation, so the blade swings off the ribcage instead of wrapping around it --
// no pivot can fix that, because a rigid body rotating about one axis cannot
// follow a curved thorax.
//
// This searches the posterior-tilt and external-rotation companions that keep the
// blade ON the ribcage for a given amount of upward rotation, and reports whether
// literature-scale values are enough.
//
// Run: npx tsx scripts/solve-scapula-tilt.mts [upwardDeg]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { layerForMaterial } from '../src/lib/materialColors.ts';

const UP = Number(process.argv[2] ?? 49.4);
const GLB = 'C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb';
const D2R = Math.PI / 180;
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group; scene.updateMatrixWorld(true);
const bs = (n: string) => n.replace(/_\d+$/, '');
const root = scene.getObjectByName('Shoulder_Armature_R')!;
const bone = (n: string) => { let f: any = null; root.traverse((o: any) => { if (!f && bs(o.name) === n) f = o; }); return f; };
const scap = bone('scapula');
const humB = bone('humerus_gh');
const restQ = scap.quaternion.clone();

type M = { m: THREE.SkinnedMesh; rest: THREE.Vector3[] };
let S: M | null = null;
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
  if (/^Scapula\d*/i.test(m.name)) {
    const rest: THREE.Vector3[] = [];
    for (let i = 0; i < pos.count; i++) rest.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
    S = { m, rest };
  } else if (/rib|sternum|vertebra|costal/i.test(m.name)) {
    const step = Math.max(1, Math.floor(pos.count / 400));
    for (let i = 0; i < pos.count; i += step)
      ribPts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  }
});
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
const posed = () => {
  S!.m.skeleton.update();
  const pos = S!.m.geometry.getAttribute('position');
  const out: THREE.Vector3[] = [];
  const step = Math.max(1, Math.floor(pos.count / 400));
  for (let i = 0; i < pos.count; i += step) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    S!.m.applyBoneTransform(i, v); S!.m.localToWorld(v); out.push(v);
  }
  return out;
};
// rest reference on the same sampling
const restSample = (() => {
  scap.quaternion.copy(restQ); scene.updateMatrixWorld(true);
  return posed();
})();
const restD = restSample.map(nearRib);
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

function evaluate(rx: number, ry: number) {
  scap.quaternion.copy(restQ);
  scap.rotateOnAxis(AX.x, UP * D2R);      // the rig's existing upward rotation
  scap.rotateOnAxis(AX.y, ry * D2R);
  scap.rotateOnAxis(AX.z, rx * D2R);
  scene.updateMatrixWorld(true);
  const pv = posed();
  // Penalise BOTH directions: drifting off the ribcage AND sinking into it. An
  // earlier version scored only the outward error, and the solver happily buried
  // the blade inside the thorax to make that number small.
  let off = 0, into = 0, sum = 0;
  for (let i = 0; i < pv.length; i++) {
    const d = nearRib(pv[i]) - restD[i];
    if (d > off) off = d;
    if (-d > into) into = -d;
    sum += d * d;
  }
  return { worst: off, sink: into, rms: Math.sqrt(sum / pv.length) };
}

console.log(`upward rotation fixed at ${UP} deg (the rig's current local-X rotation)`);
console.log(`scapula sample ${restSample.length} pts, ribcage ${ribPts.length} pts`);
const b0 = evaluate(0, 0);
console.log(`\nno companion rotations: worst vertex ${(b0.worst * 100).toFixed(1)} cm off its rest gap (rms ${(b0.rms * 100).toFixed(1)})`);
let best = { rx: 0, ry: 0, ...b0 };
for (let rx = -40; rx <= 40; rx += 5)
  for (let ry = -40; ry <= 40; ry += 5) {
    const e = evaluate(rx, ry);
    if (e.rms < best.rms) best = { rx, ry, ...e };
  }
for (let step = 2.5; step >= 0.5; step /= 2) {
  let improved = true;
  while (improved) {
    improved = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rx = best.rx + dx * step, ry = best.ry + dy * step;
      const e = evaluate(rx, ry);
      if (e.rms < best.rms) { best = { rx, ry, ...e }; improved = true; }
    }
  }
}
console.log(`best companions: local-Z ${best.rx.toFixed(1)} deg, local-Y ${best.ry.toFixed(1)} deg`);
console.log(`  -> ${(best.worst * 100).toFixed(1)} cm off / ${(best.sink * 100).toFixed(1)} cm sunk (rms ${(best.rms * 100).toFixed(1)})`);
console.log(`  improvement: off-the-ribs ${(b0.worst * 100).toFixed(1)} -> ${(best.worst * 100).toFixed(1)} cm, sink ${(b0.sink * 100).toFixed(1)} -> ${(best.sink * 100).toFixed(1)} cm`);
scap.quaternion.copy(restQ); scene.updateMatrixWorld(true);

// How far do the companion rotations carry the glenohumeral joint? If they drag
// the shoulder several cm, a rotation-only compensation on the humerus cannot put
// the arm back where it was.
scap.quaternion.copy(restQ); scene.updateMatrixWorld(true);
const ghRest = humB.getWorldPosition(new THREE.Vector3());
scap.quaternion.copy(restQ);
scap.rotateOnAxis(AX.x, UP * D2R);
scene.updateMatrixWorld(true);
const ghUpOnly = humB.getWorldPosition(new THREE.Vector3());
scap.quaternion.copy(restQ);
scap.rotateOnAxis(AX.x, UP * D2R);
scap.rotateOnAxis(AX.y, best.ry * D2R);
scap.rotateOnAxis(AX.z, best.rx * D2R);
scene.updateMatrixWorld(true);
const ghWrap = humB.getWorldPosition(new THREE.Vector3());
console.log(`
glenohumeral joint travel from rest:`);
console.log(`  upward rotation only : ${(ghUpOnly.distanceTo(ghRest) * 100).toFixed(1)} cm`);
console.log(`  with the companions  : ${(ghWrap.distanceTo(ghRest) * 100).toFixed(1)} cm`);
console.log(`  companions add       : ${(ghWrap.distanceTo(ghUpOnly) * 100).toFixed(1)} cm of extra shoulder displacement`);
scap.quaternion.copy(restQ); scene.updateMatrixWorld(true);
