// How the pronation twist is DISTRIBUTED along the forearm.
//
// The rig only turns one bone (forearm_rot), so the roll has to be spread across
// the forearm by skin weights: RigModel.smoothTwistForearm blends each vertex
// between forearm_flex (elbow, still) and forearm_rot (wrist, turning) by its
// height. Get that gradient wrong and the arm either turns as a rigid block with
// a crease at one end, or pinches into the "candy wrapper" every skinned twist is
// prone to.
//
// Measured here:
//   ROLL     - how far the surface has actually turned at each height. Should
//              climb smoothly from ~0 at the elbow to the full angle at the wrist.
//   GIRTH    - mean radius of the limb at that height, rest vs posed. A twist
//              that pinches shows up as girth collapsing mid-forearm.
//   EDGES    - real mesh edges (from the index buffer), worst stretch and worst
//              compression. This is the direct tear/pinch signal.
//
// Run: npx tsx scripts/audit-forearm-twist.mts [deg]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { getBoneControl, resolveArmatureName } from '../src/lib/boneMap.ts';
import { layerForMaterial } from '../src/lib/materialColors.ts';

const DEG = Number(process.argv[2] ?? 85);
const GLB = 'C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb';
const D2R = Math.PI / 180;
const SIDE: 'R' | 'L' = 'R';
const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group; scene.updateMatrixWorld(true);
const bs = (n: string) => n.replace(/_\d+$/, '');
const AX: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1),
};
const armRoot = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', SIDE))!;
const bone = (n: string) => { let f: any = null; armRoot.traverse((o: any) => { if (!f && bs(o.name) === n) f = o; }); return f; };
const flex = bone('forearm_flex'), rot = bone('forearm_rot'), wrist = bone('hand_flex');
const rq = new Map<THREE.Object3D, THREE.Quaternion>();
scene.traverse((o) => rq.set(o, o.quaternion.clone()));

const ELBOW_Y = flex.getWorldPosition(new THREE.Vector3()).y;
const WRIST_Y = wrist.getWorldPosition(new THREE.Vector3()).y;
console.log(`forearm spans y ${WRIST_Y.toFixed(3)} (wrist) .. ${ELBOW_Y.toFixed(3)} (elbow)`);

// Rotation axis: the driven bone's own axis, through its pivot.
const ctrl: any = getBoneControl('elbow-pronation');
const axisPivot = rot.getWorldPosition(new THREE.Vector3());
const axisDir = AX[ctrl.axis].clone()
  .applyQuaternion(rot.getWorldQuaternion(new THREE.Quaternion())).normalize();

// Forearm meshes: bound into this arm, between wrist and elbow.
type M = { m: THREE.SkinnedMesh; name: string; layer: string; rest: THREE.Vector3[]; idx: number[] };
const meshes: M[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  const layer = layerForMaterial((f as any)?.name ?? '');
  if (!layer) return;
  if (!m.skeleton?.bones.some((b) => armRoot.getObjectById(b.id))) return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  if (c.y < WRIST_Y - 0.02 || c.y > ELBOW_Y + 0.02) return;
  if (Math.abs(c.x) < 0.15) return;
  // Only measure what the lab actually SHOWS. The runtime hides all forearm
  // connective (the pearly "alambres"), the distal muscle slips at the wrist,
  // the extrinsic digital muscles, and every internal distal to the wrist (the
  // hand is a skin cap). Measuring those reports faults nobody can see.
  const inArmBand = Math.abs(c.x) > 0.16 && c.y > 0.82 && c.y < 1.4;
  const inWristCuff = Math.abs(c.x) > 0.18 && c.y >= 0.86 && c.y < 0.96;
  const inDistal = c.y > 0.6 && c.y < 0.86 && Math.abs(c.x) > 0.18;
  if (layer === 'connective' && inArmBand) return;
  if (layer === 'muscle' && inWristCuff) return;
  if (layer === 'muscle' && inArmBand && /digitorum|digiti minimi|indicis|pollicis|palmaris/i.test(m.name)) return;
  if (inDistal && layer !== 'skin') return;
  const pos = g.getAttribute('position');
  const rest: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++)
    rest.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  const index = g.getIndex();
  meshes.push({ m, name: m.name, layer, rest, idx: index ? Array.from(index.array as ArrayLike<number>) : [] });
});
console.log(`forearm meshes: ${meshes.length} (${meshes.filter((m) => m.layer === 'skin').length} skin, ${meshes.filter((m) => m.layer === 'muscle').length} muscle, ${meshes.filter((m) => m.layer === 'bone').length} bone, ${meshes.filter((m) => m.layer === 'connective').length} connective)\n`);

// ---------------------------------------------------------------------------
// RigModel's own preparation. Without this we would be measuring the raw GLB,
// where nothing rolls at all -- the gradient IS the runtime's doing.
// ---------------------------------------------------------------------------
const dominantBoneName = (m: THREE.SkinnedMesh) => {
  const si = m.geometry.getAttribute('skinIndex'), sw = m.geometry.getAttribute('skinWeight');
  const acc = new Map<number, number>();
  for (let i = 0; i < Math.min(si.count, 200); i++)
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k);
      if (w > 0) { const b = si.getComponent(i, k); acc.set(b, (acc.get(b) ?? 0) + w); }
    }
  let best = -1, bw = 0;
  for (const [b, w] of acc) if (w > bw) { bw = w; best = b; }
  return best >= 0 ? bs(m.skeleton.bones[best]?.name ?? '') : '';
};
function smoothTwistForearm(mesh: THREE.SkinnedMesh, elbowY: number, wristY: number) {
  const flexIdx = mesh.skeleton.bones.findIndex((b) => bs(b.name) === 'forearm_flex');
  const rotIdx = mesh.skeleton.bones.findIndex((b) => bs(b.name) === 'forearm_rot');
  if (flexIdx < 0 || rotIdx < 0) return false;
  // proximal -> distal ladder: elbow, the twist bones, then the wrist bone
  const ladder = [flexIdx, ...twistChain.map((b) => mesh.skeleton.bones.indexOf(b)), rotIdx];
  if (ladder.some((i) => i < 0)) return false;
  const steps = ladder.length - 1;
  const pos = mesh.geometry.getAttribute('position');
  const si = mesh.geometry.getAttribute('skinIndex'), sw = mesh.geometry.getAttribute('skinWeight');
  const span = elbowY - wristY;
  if (span <= 1e-4) return false;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); mesh.localToWorld(v);
    let t = (elbowY - v.y) / span;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t);
    // Blend only between ADJACENT rungs, so the angle spanned by any one blend
    // is the full twist divided by the number of steps.
    const scaled = t * steps;
    let k = Math.floor(scaled);
    if (k >= steps) k = steps - 1;
    const f = scaled - k;
    si.setXYZW(i, ladder[k], ladder[k + 1], 0, 0);
    sw.setXYZW(i, 1 - f, f, 0, 0);
  }
  si.needsUpdate = true; sw.needsUpdate = true;
  return true;
}
/**
 * TWIST SEGMENTS (experiment, pass a second arg to try it).
 *
 * Linear blend skinning shrinks a limb that is twisted between two bones: a
 * vertex weighted half to a bone at 0 deg and half to one at T deg lands at
 * cos(T/2) of its radius. At 85 deg that is 0.74, i.e. the forearm loses a
 * quarter of its girth — which is exactly what the girth column measures.
 *
 * The standard fix is intermediate twist bones, so a vertex is only ever blended
 * between neighbours T/N apart and the loss becomes cos(T/2N). Here we build them
 * at runtime: N-1 extra bones sharing forearm_rot's rest transform, spliced into
 * every forearm skeleton, each turning its share of the angle.
 */
/** Defaults to 2, matching the runtime. Pass 1 to see the pinch it replaced. */
const SEGMENTS = Number(process.argv[3] ?? 2);
const twistChain: THREE.Bone[] = [];
if (SEGMENTS > 1) {
  for (let i = 1; i < SEGMENTS; i++) {
    const b = new THREE.Bone();
    b.name = `forearm_twist${i}`;
    b.position.copy(rot.position);
    b.quaternion.copy(rot.quaternion);
    b.scale.copy(rot.scale);
    flex.add(b);
    twistChain.push(b);
  }
  scene.updateMatrixWorld(true);
  const touched = new Set<THREE.Skeleton>();
  for (const m of meshes) {
    const sk = m.m.skeleton;
    if (touched.has(sk)) continue;
    touched.add(sk);
    for (const b of twistChain) {
      if (sk.bones.includes(b)) continue;
      sk.bones.push(b);
      sk.boneInverses.push(new THREE.Matrix4().copy(b.matrixWorld).invert());
    }
    sk.init();
  }
}

const ARM_BELLY = (ln: string) =>
  ln.includes('biceps brachii') ||
  (ln.includes('triceps brachii') && !ln.includes('long head')) ||
  (ln.includes('brachialis') && !ln.includes('coraco'));
const rolled = new Set<string>();
for (const m of meshes) {
  const g = m.m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.m.matrixWorld);
  const ln = m.name.toLowerCase();
  const dom = dominantBoneName(m.m);
  if (m.layer === 'skin') {
    if (dom === 'forearm_flex' && c.y < ELBOW_Y && smoothTwistForearm(m.m, ELBOW_Y, WRIST_Y))
      rolled.add(m.name);
  } else if (m.layer === 'muscle' && !ARM_BELLY(ln)) {
    if (
      c.y < ELBOW_Y && c.y > WRIST_Y &&
      (dom === 'forearm_flex' || dom === 'forearm_rot' || dom === 'hand_flex') &&
      smoothTwistForearm(m.m, ELBOW_Y, WRIST_Y)
    ) rolled.add(m.name);
    else if (c.y >= ELBOW_Y && dom === 'forearm_rot') {
      const bi = m.m.skeleton.bones.findIndex((b) => bs(b.name) === 'forearm_flex');
      if (bi >= 0) {
        const si = m.m.geometry.getAttribute('skinIndex'), sw = m.m.geometry.getAttribute('skinWeight');
        for (let i = 0; i < si.count; i++) { si.setXYZW(i, bi, 0, 0, 0); sw.setXYZW(i, 1, 0, 0, 0); }
        si.needsUpdate = true; sw.needsUpdate = true;
      }
    }
  }
}
console.log(`meshes given the roll gradient: ${rolled.size} of ${meshes.length}`);
for (const layer of ['skin', 'muscle', 'bone', 'connective'] as const) {
  const inLayer = meshes.filter((m) => m.layer === layer);
  const got = inLayer.filter((m) => rolled.has(m.name)).length;
  console.log(`  ${layer.padEnd(11)} ${String(got).padStart(3)} / ${String(inLayer.length).padStart(3)}`);
}
console.log('\nvisible forearm meshes NOT given the gradient (they turn rigidly):');
for (const m of meshes) {
  if (rolled.has(m.name)) continue;
  const g = m.m.geometry;
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.m.matrixWorld);
  console.log(`  [${m.layer.padEnd(6)}] ${m.name.padEnd(42)} dominant=${dominantBoneName(m.m).padEnd(13)} y=${c.y.toFixed(3)}`);
}
console.log('');

const posed = (x: M) => {
  x.m.skeleton.update();
  const pos = x.m.geometry.getAttribute('position');
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    x.m.applyBoneTransform(i, v); x.m.localToWorld(v); out.push(v);
  }
  return out;
};
/** Signed angle of p around the pronation axis, and its distance from it. */
function polar(p: THREE.Vector3) {
  const ap = p.clone().sub(axisPivot);
  const along = axisDir.clone().multiplyScalar(ap.dot(axisDir));
  const radial = ap.clone().sub(along);
  const r = radial.length();
  // stable in-plane basis
  const e1 = new THREE.Vector3(1, 0, 0).sub(axisDir.clone().multiplyScalar(axisDir.x)).normalize();
  const e2 = new THREE.Vector3().crossVectors(axisDir, e1);
  return { r, a: Math.atan2(radial.dot(e2), radial.dot(e1)) / D2R };
}

scene.traverse((o) => { const q = rq.get(o); if (q) o.quaternion.copy(q); });
scene.updateMatrixWorld(true);
const restPts = meshes.map(posed);
rot.rotateOnAxis(AX[ctrl.axis], DEG * D2R * ctrl.sign[SIDE]);
// Each intermediate bone takes its share, so neighbours stay T/N apart.
twistChain.forEach((b, i) => {
  b.rotateOnAxis(AX[ctrl.axis], DEG * D2R * ctrl.sign[SIDE] * ((i + 1) / SEGMENTS));
});
scene.updateMatrixWorld(true);
const posePts = meshes.map(posed);

console.log(`pronation ${DEG} deg\n`);
console.log('  height   fraction   roll     girth rest -> posed    n');
const BAND = 0.02;
for (let y = WRIST_Y; y < ELBOW_Y; y += BAND) {
  let n = 0, rollSum = 0, r0Sum = 0, r1Sum = 0;
  for (let mi = 0; mi < meshes.length; mi++) {
    const R = restPts[mi], P = posePts[mi];
    for (let i = 0; i < R.length; i++) {
      if (R[i].y < y || R[i].y >= y + BAND) continue;
      const a = polar(R[i]), b = polar(P[i]);
      if (a.r < 0.005) continue; // on the axis, angle is noise
      let d = b.a - a.a;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      rollSum += d * ctrl.sign[SIDE]; r0Sum += a.r; r1Sum += b.r; n++;
    }
  }
  if (n < 20) continue;
  const frac = (ELBOW_Y - y - BAND / 2) / (ELBOW_Y - WRIST_Y); // 0 at elbow, 1 at wrist
  console.log(
    `  ${y.toFixed(3)}    ${frac.toFixed(2)}      ${(rollSum / n).toFixed(1).padStart(5)} deg   ` +
    `${(r0Sum / n * 100).toFixed(2)} -> ${(r1Sum / n * 100).toFixed(2)} cm   ${String(n).padStart(5)}`,
  );
}

// ---- real mesh edges ----
let worstStretch = 0, worstSquash = 0, sName = '', qName = '';
let edges = 0;
for (let mi = 0; mi < meshes.length; mi++) {
  const M = meshes[mi], R = restPts[mi], P = posePts[mi];
  const seen = new Set<number>();
  for (let t = 0; t + 2 < M.idx.length; t += 3) {
    for (const [a, b] of [[M.idx[t], M.idx[t + 1]], [M.idx[t + 1], M.idx[t + 2]], [M.idx[t + 2], M.idx[t]]]) {
      const k = a < b ? a * 1e6 + b : b * 1e6 + a;
      if (seen.has(k)) continue;
      seen.add(k);
      const l0 = R[a].distanceTo(R[b]);
      if (l0 < 1e-5) continue;
      const l1 = P[a].distanceTo(P[b]);
      edges++;
      const ratio = l1 / l0;
      if (ratio - 1 > worstStretch) { worstStretch = ratio - 1; sName = M.name; }
      if (1 - ratio > worstSquash) { worstSquash = 1 - ratio; qName = M.name; }
    }
  }
}
console.log(`\nmesh edges checked: ${edges}`);
console.log(`  worst stretch     +${(worstStretch * 100).toFixed(1)}%  (${sName})`);
console.log(`  worst compression -${(worstSquash * 100).toFixed(1)}%  (${qName})`);
