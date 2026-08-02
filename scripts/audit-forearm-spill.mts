// Do the culled forearm muscles still fly out, now that the twist bindings are
// fixed? And what is poking out of the arm in the poses the user reported?
//
// The forearm currently shows only 40% of its muscle: the digital bellies and the
// distal slips are hidden because, with the OLD bindings, they shot 13-15 cm out
// of the skin as loose "puntas". Those bindings changed (every forearm mesh now
// gets the roll gradient), so this re-asks the question that justified the culls.
//
// For each pose it reports, per mesh, how far outside the forearm SKIN envelope
// its worst vertex lands. Anything under ~1 cm is inside the sleeve and safe to
// show; a mesh at 10 cm is a spike.
//
// Run: npx tsx scripts/audit-forearm-spill.mts [fixed|raw]
//   fixed (default) applies the runtime's current bindings; raw skips them.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { getBoneControl, resolveArmatureName } from '../src/lib/boneMap.ts';
import { colorForMaterial, layerForMaterial } from '../src/lib/materialColors.ts';

const RAW = process.argv[2] === 'raw';
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
const boneOf = (n: string) => { let f: any = null; armRoot.traverse((o: any) => { if (!f && bs(o.name) === n) f = o; }); return f; };
const flex = boneOf('forearm_flex'), rot = boneOf('forearm_rot'), wrist = boneOf('hand_flex');
const hum = boneOf('humerus_gh');
const ELBOW_Y = flex.getWorldPosition(new THREE.Vector3()).y;
const WRIST_Y = wrist.getWorldPosition(new THREE.Vector3()).y;
const rq = new Map<THREE.Object3D, THREE.Quaternion>();
scene.traverse((o) => rq.set(o, o.quaternion.clone()));

type M = {
  m: THREE.SkinnedMesh; name: string; layer: string; color: string;
  culled: string | null; rest: THREE.Vector3[];
};
const inArmBand = (c: THREE.Vector3) => Math.abs(c.x) > 0.16 && c.y > 0.82 && c.y < 1.4;
const inWristCuff = (c: THREE.Vector3) => Math.abs(c.x) > 0.18 && c.y >= 0.86 && c.y < 0.96;
const DIGITAL = /digitorum|digiti minimi|indicis|pollicis|palmaris/i;
const all: M[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  if (!m.skeleton?.bones.some((b) => armRoot.getObjectById(b.id))) return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  const first = Array.isArray(m.material) ? m.material[0] : m.material;
  const matName = (first as any)?.name ?? '';
  const layer = layerForMaterial(matName);
  if (!layer) return;
  // SKIN is collected over the WHOLE limb, hand included: the digital tendons run
  // from the forearm into the fingers, so an envelope that stops at the wrist
  // reports them 20 cm "outside" even in the rest pose. Everything else is
  // restricted to the forearm band, which is what we are auditing.
  if (layer === 'skin') {
    if (c.y < 0.60 || c.y > ELBOW_Y + 0.10) return;
    if (Math.abs(c.x) < 0.12) return;
  } else {
    if (c.y < WRIST_Y - 0.02 || c.y > ELBOW_Y + 0.06) return;
    if (Math.abs(c.x) < 0.15) return;
  }
  const col = colorForMaterial(matName);
  let culled: string | null = null;
  if (layer === 'connective' && inArmBand(c)) culled = 'wire';
  else if (layer === 'muscle' && inWristCuff(c)) culled = 'cuff';
  else if (layer === 'muscle' && inArmBand(c) && DIGITAL.test(m.name)) culled = 'digital';
  const pos = g.getAttribute('position');
  const step = Math.max(1, Math.floor(pos.count / 300));
  const rest: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += step)
    rest.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  all.push({
    m, name: m.name, layer, culled, rest,
    color: col === null ? 'none' : `#${col.toString(16).padStart(6, '0')}`,
  });
});

// ---- runtime bindings (current RigModel behaviour) ----
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
const twistBone = new THREE.Bone();
twistBone.name = 'forearm_twist';
twistBone.position.copy(rot.position);
twistBone.quaternion.copy(rot.quaternion);
twistBone.scale.copy(rot.scale);
flex.add(twistBone);
scene.updateMatrixWorld(true);
const twistRest = twistBone.quaternion.clone();
if (!RAW) {
  const done = new Set<THREE.Skeleton>();
  for (const m of all) {
    const sk = m.m.skeleton;
    if (done.has(sk) || sk.bones.includes(twistBone)) continue;
    done.add(sk);
    sk.bones.push(twistBone);
    sk.boneInverses.push(new THREE.Matrix4().copy(twistBone.matrixWorld).invert());
    sk.init();
  }
}
function smoothTwist(mesh: THREE.SkinnedMesh) {
  const flexIdx = mesh.skeleton.bones.findIndex((b) => bs(b.name) === 'forearm_flex');
  const rotIdx = mesh.skeleton.bones.findIndex((b) => bs(b.name) === 'forearm_rot');
  const twIdx = mesh.skeleton.bones.indexOf(twistBone);
  if (flexIdx < 0 || rotIdx < 0) return false;
  const ladder = twIdx >= 0 ? [flexIdx, twIdx, rotIdx] : [flexIdx, rotIdx];
  const steps = ladder.length - 1;
  const pos = mesh.geometry.getAttribute('position');
  const si = mesh.geometry.getAttribute('skinIndex'), sw = mesh.geometry.getAttribute('skinWeight');
  const span = ELBOW_Y - WRIST_Y;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); mesh.localToWorld(v);
    let t = (ELBOW_Y - v.y) / span;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t);
    const sc = t * steps;
    let k = Math.floor(sc); if (k >= steps) k = steps - 1;
    const f = sc - k;
    si.setXYZW(i, ladder[k], ladder[k + 1], 0, 0);
    sw.setXYZW(i, 1 - f, f, 0, 0);
  }
  si.needsUpdate = true; sw.needsUpdate = true;
  return true;
}
if (!RAW) {
  for (const m of all) {
    const g = m.m.geometry;
    const c = g.boundingSphere!.center.clone().applyMatrix4(m.m.matrixWorld);
    if (m.layer === 'bone') continue;
    const dom = dominantBoneName(m.m);
    if (c.y < ELBOW_Y && c.y > WRIST_Y &&
        (dom === 'forearm_flex' || dom === 'forearm_rot' || dom === 'hand_flex')) {
      smoothTwist(m.m);
    }
  }
}

const posedOf = (x: M) => {
  x.m.skeleton.update();
  const pos = x.m.geometry.getAttribute('position');
  const step = Math.max(1, Math.floor(pos.count / 300));
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += step) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    x.m.applyBoneTransform(i, v); x.m.localToWorld(v); out.push(v);
  }
  return out;
};
function pose(moves: [string, number][]) {
  scene.traverse((o) => { const q = rq.get(o); if (q) o.quaternion.copy(q); });
  twistBone.quaternion.copy(twistRest);
  for (const [id, deg] of moves) {
    const c: any = getBoneControl(id);
    if (!c || c.kind !== 'joint') continue;
    const b = boneOf(c.bone);
    if (b) b.rotateOnAxis(AX[c.axis], deg * D2R * c.sign[SIDE]);
  }
  // drive the twist bone at half of forearm_rot, as the runtime does
  if (!RAW) {
    const d = rq.get(rot)!.clone().invert().multiply(rot.quaternion);
    const half = new THREE.Quaternion().identity().slerp(d, 0.5);
    twistBone.quaternion.copy(twistRest).multiply(half);
  }
  scene.updateMatrixWorld(true);
}

/** Skin envelope of the forearm, as a point cloud + hash. */
const skinM = all.filter((m) => m.layer === 'skin');
const CELL = 0.02;
function skinHash(pts: THREE.Vector3[]) {
  const h = new Map<string, THREE.Vector3[]>();
  for (const p of pts) {
    const k = `${Math.floor(p.x / CELL)}|${Math.floor(p.y / CELL)}|${Math.floor(p.z / CELL)}`;
    h.set(k, [...(h.get(k) ?? []), p]);
  }
  return h;
}
function nearest(h: Map<string, THREE.Vector3[]>, p: THREE.Vector3) {
  let best = Infinity;
  for (let r = 1; r <= 8 && best === Infinity; r++) {
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL), cz = Math.floor(p.z / CELL);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++)
      for (const q of h.get(`${cx + i}|${cy + j}|${cz + k}`) ?? []) best = Math.min(best, p.distanceTo(q));
  }
  return best;
}

const POSES: [string, [string, number][]][] = [
  ['neutral', []],
  ['pronation 85', [['elbow-pronation', 85]]],
  ['supination 90', [['elbow-supination', 90]]],
  ['elbow flexion 145', [['elbow-flexion', 145]]],
  ['Mill (ext + pron)', [['elbow-extension', 0], ['elbow-pronation', 85]]],
];
console.log(`bindings: ${RAW ? 'RAW GLB' : 'current runtime'}   side ${SIDE}`);
console.log(`forearm meshes tracked: ${all.length} (${skinM.length} skin)\n`);
for (const [label, moves] of POSES) {
  pose(moves);
  const skinPts: THREE.Vector3[] = [];
  for (const s of skinM) skinPts.push(...posedOf(s));
  const h = skinHash(skinPts);
  const out: { name: string; d: number; culled: string | null; color: string; layer: string }[] = [];
  for (const m of all) {
    if (m.layer === 'skin') continue;
    let worst = 0;
    for (const v of posedOf(m)) {
      const d = nearest(h, v);
      if (d !== Infinity && d > worst) worst = d;
    }
    out.push({ name: m.name, d: worst, culled: m.culled, color: m.color, layer: m.layer });
  }
  out.sort((a, b) => b.d - a.d);
  console.log(`${label}:`);
  for (const r of out.slice(0, 6))
    console.log(`   ${(r.d * 100).toFixed(1).padStart(5)} cm  [${r.layer.padEnd(10)} ${r.color}] ${r.culled ? `(culled: ${r.culled}) ` : ''}${r.name}`);
  const shownWorst = out.filter((r) => !r.culled)[0];
  console.log(`   worst SHOWN: ${(shownWorst.d * 100).toFixed(1)} cm  ${shownWorst.name}`);
  console.log('');
}
