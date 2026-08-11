// Re-solve the SCAPULOTHORACIC WRAP table against the full girdle chain.
//
// A scapula rotating about one axis cannot follow a curved thorax, so the runtime
// adds two companion rotations (yaw + roll) that keep the blade ON the ribcage.
// The table that holds them (WRAP in RigModel / scripts/lib/rigPose) was solved
// with the SCAPULA BONE rotating alone, back when the clavicle was welded to the
// spine and could not move.
//
// Now that the girdle splits its rotation between the sternoclavicular and
// acromioclavicular joints, the blade arrives at the same upward rotation from a
// different place -- it has been carried up and medially by the clavicle first --
// so the old companions no longer fit and the blade lifts off the back.
//
// solve-scapula-tilt.mts cannot answer this: it rotates the scapula bone by hand
// and knows nothing about the chain. This poses the REAL chain at a real clinical
// angle (via the shared poser, wrap disabled) and searches the companions that
// minimise the blade's departure from its resting gap to the ribs.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/solve-scapula-wrap.mts [left]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { layerForMaterial } from '../src/lib/materialColors.ts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, type Side } from './lib/rigPose.mts';

const SIDE: Side = process.argv.includes('left') ? 'L' : 'R';
const MOVEMENT = 'glenohumeral-abduction';
const D2R = Math.PI / 180;

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);

const poser = createRigPoser(scene, MOVEMENT, SIDE, true);
const sideSign = SIDE === 'R' ? 1 : -1;

// --- the blade, and the cage it has to stay on ---
let bladeMesh: THREE.SkinnedMesh | null = null;
const ribPts: THREE.Vector3[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  if (layerForMaterial((f as any)?.name ?? '') !== 'bone') return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  if (c.y < 0.85 || c.y > 1.7) return;
  const pos = g.getAttribute('position');
  if (/^Scapula\d*/i.test(m.name)) {
    if (c.x * sideSign > 0) bladeMesh = m;
  } else if (/rib|sternum|vertebra|costal/i.test(m.name)) {
    const step = Math.max(1, Math.floor(pos.count / 400));
    for (let i = 0; i < pos.count; i += step)
      ribPts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  }
});
if (!bladeMesh) {
  console.error('No encuentro la escápula del lado', SIDE);
  process.exit(1);
}
const blade = bladeMesh as THREE.SkinnedMesh;

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
const bladePts = () => {
  blade.skeleton.update();
  const pos = blade.geometry.getAttribute('position');
  const step = Math.max(1, Math.floor(pos.count / 400));
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += step) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    blade.applyBoneTransform(i, v);
    blade.localToWorld(v);
    out.push(v);
  }
  return out;
};

poser.pose(0);
const restGap = bladePts().map(nearRib);

/** Score a candidate pair of companions at one clinical angle. */
function evaluate(deg: number, wy: number, wz: number) {
  poser.pose(deg, { wrapOverride: [wy, wz] });
  const pv = bladePts();
  let off = 0, into = 0, sum = 0;
  for (let i = 0; i < pv.length; i++) {
    const d = nearRib(pv[i]) - restGap[i];
    if (d > off) off = d;
    if (-d > into) into = -d;
    sum += d * d;
  }
  // Penalise BOTH directions: drifting off the cage AND sinking into it, or the
  // solver happily buries the blade inside the thorax to make one number small.
  return { worst: off, sink: into, rms: Math.sqrt(sum / pv.length) };
}

// The table is keyed on scapulothoracic upward rotation, so report that for each
// clinical angle solved -- those pairs ARE the new table.
const ANGLES = [0, 30, 60, 90, 120, 150, 180];
console.log(`lado ${SIDE}, ${ribPts.length} puntos de parrilla\n`);
console.log(' ángulo   rot.asc.   yaw     roll     peor     hundido   rms   (antes: peor)');
const rows: { up: number; wy: number; wz: number }[] = [];
for (const deg of ANGLES) {
  const up = (poser.outputsAt(deg).scapulaTotal ?? 0) / D2R;
  const before = evaluate(deg, 0, 0);
  let best = { wy: 0, wz: 0, ...before };
  for (let wy = -60; wy <= 60; wy += 5)
    for (let wz = -60; wz <= 60; wz += 5) {
      const e = evaluate(deg, wy, wz);
      if (e.rms < best.rms) best = { wy, wz, ...e };
    }
  for (let step = 2.5; step >= 0.25; step /= 2) {
    for (const dy of [-step, 0, step])
      for (const dz of [-step, 0, step]) {
        const e = evaluate(deg, best.wy + dy, best.wz + dz);
        if (e.rms < best.rms) best = { wy: best.wy + dy, wz: best.wz + dz, ...e };
      }
  }
  rows.push({ up, wy: best.wy, wz: best.wz });
  console.log(
    `${String(deg).padStart(6)}   ${up.toFixed(1).padStart(7)}   ` +
    `${best.wy.toFixed(1).padStart(6)}  ${best.wz.toFixed(1).padStart(6)}   ` +
    `${(best.worst * 100).toFixed(1).padStart(5)} cm  ${(best.sink * 100).toFixed(1).padStart(5)} cm  ` +
    `${(best.rms * 100).toFixed(2).padStart(5)}   (${(before.worst * 100).toFixed(1)} cm)`,
  );
}

console.log('\nTabla WRAP resultante (rotación ascendente, yaw, roll):');
console.log('const WRAP: ReadonlyArray<readonly [number, number, number]> = [');
for (const r of rows)
  console.log(`  [${r.up.toFixed(1)}, ${r.wy.toFixed(1)}, ${r.wz.toFixed(1)}],`);
console.log('];');
