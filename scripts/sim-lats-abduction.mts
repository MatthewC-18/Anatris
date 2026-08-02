// Offline pose simulation of the LATISSIMUS DORSI through shoulder abduction.
//
// The rig cannot be screenshotted from the embedded preview, so this measures
// what the lab would show: it loads the shipped GLB, replays RigModel's mesh
// preparation and its abduction pose on the CPU, and reports where every lats
// vertex ends up relative to its rest position.
//
// Three configurations are compared:
//   before  - the spine re-skin overwrites each vertex with vertebrae only, which
//             wipes the latshum_l/r helper weights: the insertion never follows
//             the arm at all.
//   kept    - the re-skin preserves non-vertebra weight, but the GLB's bilateral
//             weights are left alone, so each lats is half-driven by the WRONG
//             arm and the contralateral one is dragged across the body.
//   fixed   - preserve + unilateralize, i.e. what RigModel now does.
//
// Run: npx tsx scripts/sim-lats-abduction.mts
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { shoulderChain } from '../src/lib/biomech/shoulderChain.ts';

const GLB =
  process.argv[2] || 'C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb';
const DEG2RAD = Math.PI / 180;
// Must track the constants in RigModel.tsx.
const LATS_ROT_FOLLOW = 0.18;
const LATS_ROT_MAX_DEG = 28;
const ARM_CLEARANCE_DEG = 35;
const ARM_CLEARANCE_FADE_DEG = 75;
const SIDE: 'R' | 'L' = 'R';

const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise<any>((res, rej) => loader.parse(ab, '', res, rej));
// The scene under test. Re-pointed by rebuild() when a configuration re-parses
// the file: pose() must reset and refresh the SAME scene the meshes live in, or
// it silently poses one graph and measures another.
let scene = gltf.scene as THREE.Group;
scene.updateMatrixWorld(true);

const base = (n: string) => n.replace(/_\d+$/, '');
const AXIS = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

// ---- bone lookup, per armature subtree (bone names collide between sides) ----
const byArmature = new Map<string, Map<string, THREE.Object3D>>();
for (const an of ['Shoulder_Armature_R', 'Shoulder_Armature_L', 'Spine_Armature']) {
  const root = scene.getObjectByName(an);
  if (!root) continue;
  const m = new Map<string, THREE.Object3D>();
  root.traverse((o) => { if (!m.has(base(o.name))) m.set(base(o.name), o); });
  byArmature.set(an, m);
}
const restQuat = new Map<THREE.Object3D, THREE.Quaternion>();
const restPos = new Map<THREE.Object3D, THREE.Vector3>();
const restWorld = new Map<THREE.Object3D, THREE.Matrix4>();
scene.traverse((o) => {
  restQuat.set(o, o.quaternion.clone());
  restPos.set(o, o.position.clone());
  restWorld.set(o, o.matrixWorld.clone());
});

// ---- the lats meshes, with their rest world vertex positions ----
type Lat = { mesh: THREE.SkinnedMesh; rest: THREE.Vector3[]; side: 'R' | 'L' };
const lats: Lat[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !/latissimus/i.test(m.name) || !m.isSkinnedMesh) return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const cx = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld).x;
  const pos = g.getAttribute('position');
  const rest: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) {
    rest.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  }
  lats.push({ mesh: m, rest, side: cx > 0 ? 'R' : 'L' });
});

// ---- RigModel's mesh preparation, replayed ----
const spineY = new Map<string, number>();
scene.getObjectByName('Spine_Armature')?.traverse((o) => {
  if (/^vert_/.test(base(o.name)) && !spineY.has(base(o.name)))
    spineY.set(base(o.name), o.getWorldPosition(new THREE.Vector3()).y);
});

function unilateralize(mesh: THREE.SkinnedMesh) {
  const helperX = new Map<number, number>();
  mesh.skeleton.bones.forEach((b, i) => {
    if (/^latshum_[lr]$/.test(base(b.name)))
      helperX.set(i, b.getWorldPosition(new THREE.Vector3()).x);
  });
  if (helperX.size < 2) return;
  const g = mesh.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const meshX = g.boundingSphere!.center.clone().applyMatrix4(mesh.matrixWorld).x;
  const drop = new Set<number>();
  for (const [i, x] of helperX) if (x * meshX < 0) drop.add(i);
  if (!drop.size) return;
  const si = g.getAttribute('skinIndex');
  const sw = g.getAttribute('skinWeight');
  for (let v = 0; v < si.count; v++) {
    const idx = [si.getX(v), si.getY(v), si.getZ(v), si.getW(v)];
    const w = [sw.getX(v), sw.getY(v), sw.getZ(v), sw.getW(v)];
    let sum = 0, changed = false;
    for (let k = 0; k < 4; k++) {
      if (drop.has(idx[k]) && w[k] > 0) { w[k] = 0; changed = true; }
      sum += w[k];
    }
    if (!changed || sum <= 1e-6) continue;
    sw.setXYZW(v, w[0] / sum, w[1] / sum, w[2] / sum, w[3] / sum);
  }
  sw.needsUpdate = true;
}

/** @param keepNonVertebra false reproduces the OLD re-skin (helper weights wiped). */
function smoothSkinSpine(mesh: THREE.SkinnedMesh, keepNonVertebra: boolean) {
  const verts: { idx: number; y: number }[] = [];
  mesh.skeleton.bones.forEach((b, i) => {
    const y = spineY.get(base(b.name));
    if (/^vert_/.test(base(b.name)) && y !== undefined) verts.push({ idx: i, y });
  });
  if (verts.length < 2) return false;
  verts.sort((a, b) => a.y - b.y);
  const g = mesh.geometry;
  const pos = g.getAttribute('position');
  const si = g.getAttribute('skinIndex');
  const sw = g.getAttribute('skinWeight');
  const last = verts.length - 1, yLo = verts[0].y, yHi = verts[last].y;
  const vertIdx = new Set(verts.map((v) => v.idx));
  const _v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    _v.fromBufferAttribute(pos, i);
    mesh.localToWorld(_v);
    const vy = _v.y;
    let keepBone = -1, keep = 0;
    if (keepNonVertebra) {
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w <= 0) continue;
        const b = si.getComponent(i, k);
        if (vertIdx.has(b)) continue;
        if (keepBone < 0 || w > keep) keepBone = b;
        keep += w;
      }
    }
    if (keep > 1) keep = 1;
    if (keepBone < 0) keepBone = 0;
    const spine = 1 - keep;
    if (vy <= yLo) { si.setXYZW(i, verts[0].idx, keepBone, 0, 0); sw.setXYZW(i, spine, keep, 0, 0); }
    else if (vy >= yHi) { si.setXYZW(i, verts[last].idx, keepBone, 0, 0); sw.setXYZW(i, spine, keep, 0, 0); }
    else {
      let k = 0;
      while (k < last && verts[k + 1].y <= vy) k++;
      const lo = verts[k], hi = verts[k + 1];
      const span = hi.y - lo.y;
      const t = span > 1e-6 ? (vy - lo.y) / span : 0;
      si.setXYZW(i, lo.idx, hi.idx, keepBone, 0);
      sw.setXYZW(i, (1 - t) * spine, t * spine, keep, 0);
    }
  }
  si.needsUpdate = true; sw.needsUpdate = true;
  return true;
}

// ---- pose the rig, exactly as RigModel.apply() does for the abduction chain ----
const LATS_PAIRS: [string, string][] = [
  ['latshum_l', 'Shoulder_Armature_R'],
  ['latshum_r', 'Shoulder_Armature_L'],
];

function pose(deg: number, dropClearanceFromLats: boolean) {
  scene.traverse((o) => {
    const q = restQuat.get(o); if (q) o.quaternion.copy(q);
    const p = restPos.get(o); if (p) o.position.copy(p);
  });
  const p = shoulderChain(deg, SIDE);
  const sb = byArmature.get(`Shoulder_Armature_${SIDE}`)!;
  const hum = sb.get('humerus_gh')!;
  const scap = sb.get('scapula')!;
  hum.rotateOnAxis(AXIS.z, p.glenohumeralRot);
  hum.rotateOnAxis(AXIS.y, p.humeralExtRot * (SIDE === 'R' ? 1 : -1));
  scap.rotateOnAxis(AXIS.x, p.scapulaUpwardRot);
  // arm clearance (cosmetic forward lift, faded out above ARM_CLEARANCE_FADE_DEG)
  const f = Math.max(0, Math.min(1, (ARM_CLEARANCE_FADE_DEG - deg) / ARM_CLEARANCE_FADE_DEG));
  const clearRad = -1 * ARM_CLEARANCE_DEG * f * DEG2RAD;
  const clearQ = new THREE.Quaternion().setFromAxisAngle(AXIS.x, clearRad);
  if (f > 0) hum.rotateOnAxis(AXIS.x, clearRad);
  scene.updateMatrixWorld(true);

  // driveLatsHelpers
  const spineBones = byArmature.get('Spine_Armature')!;
  for (const [helperName, armName] of LATS_PAIRS) {
    const helper = spineBones.get(helperName);
    const h = byArmature.get(armName)?.get('humerus_gh');
    if (!helper || !h || !helper.parent) continue;
    const hRest = restWorld.get(h), helperRest = restWorld.get(helper);
    const qHum = h.getWorldQuaternion(new THREE.Quaternion());
    if (h === hum && f > 0 && dropClearanceFromLats) qHum.multiply(clearQ.clone().invert());
    const qParent = helper.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    if (hRest && helperRest) {
      const s = new THREE.Vector3(), t = new THREE.Vector3();
      const qHumRest = new THREE.Quaternion(), qHelperRest = new THREE.Quaternion();
      hRest.decompose(t, qHumRest, s);
      helperRest.decompose(t, qHelperRest, s);
      const qDelta = qHum.clone().multiply(qHumRest.invert());
      const angle = 2 * Math.acos(Math.min(1, Math.abs(qDelta.w)));
      const share = angle > 1e-4
        ? Math.min(LATS_ROT_FOLLOW, (LATS_ROT_MAX_DEG * DEG2RAD) / angle)
        : LATS_ROT_FOLLOW;
      qDelta.slerpQuaternions(new THREE.Quaternion(), qDelta, share);
      helper.quaternion.copy(qParent).multiply(qDelta).multiply(qHelperRest);
    }
    const pw = h.getWorldPosition(new THREE.Vector3());
    helper.parent.worldToLocal(pw);
    helper.position.copy(pw);
  }
  scene.updateMatrixWorld(true);
}

function measure(l: Lat) {
  const { mesh, rest } = l;
  mesh.skeleton.update();
  const pos = mesh.geometry.getAttribute('position');
  const v = new THREE.Vector3();
  let maxDisp = 0, maxX = 0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    mesh.applyBoneTransform(i, v);
    mesh.localToWorld(v);
    const d = v.distanceTo(rest[i]);
    if (d > maxDisp) maxDisp = d;
    if (Math.abs(v.x) > maxX) maxX = Math.abs(v.x);
  }
  return { maxDisp: maxDisp * 100, maxX };
}

/** Diagnostics: did the rig actually move, and does the lats still carry helper
 *  weight after the re-skin? Guards against measuring a no-op. */
function diagnose(deg: number) {
  const sp = byArmature.get('Spine_Armature')!;
  const rows: string[] = [];
  for (const n of ['latshum_l', 'latshum_r']) {
    const b = sp.get(n);
    if (!b) { rows.push(`${n}=MISSING`); continue; }
    const now = b.getWorldPosition(new THREE.Vector3());
    const was = new THREE.Vector3().setFromMatrixPosition(restWorld.get(b)!);
    rows.push(`${n} moved ${(now.distanceTo(was) * 100).toFixed(2)} cm`);
  }
  const hum = byArmature.get(`Shoulder_Armature_${SIDE}`)!.get('humerus_gh')!;
  const hq = hum.getWorldQuaternion(new THREE.Quaternion());
  const hr = new THREE.Quaternion().setFromRotationMatrix(restWorld.get(hum)!);
  const humDeg = (2 * Math.acos(Math.min(1, Math.abs(hq.dot(hr))))) / DEG2RAD;
  let helperW = 0;
  for (const l of BIG) {
    const si = l.mesh.geometry.getAttribute('skinIndex');
    const sw = l.mesh.geometry.getAttribute('skinWeight');
    const hi = new Set<number>();
    l.mesh.skeleton.bones.forEach((b, i) => { if (/^latshum_/.test(base(b.name))) hi.add(i); });
    for (let v = 0; v < si.count; v++)
      for (let k = 0; k < 4; k++)
        if (hi.has(si.getComponent(v, k))) helperW = Math.max(helperW, sw.getComponent(v, k));
  }
  console.log(`      humerus turned ${humDeg.toFixed(1)} deg | ${rows.join(', ')} | max helper weight left on a lats vertex: ${helperW.toFixed(3)}`);
}

// Only the big bellies carry helper weight; the small origin/insertion caps do not.
const BIG = lats.filter((l) => l.rest.length > 500);

function run(label: string, keepNonVertebra: boolean, uni: boolean, dropClear: boolean) {
  // reload weights from a pristine copy of the file for each configuration
  console.log(`\n=== ${label}`);
  for (const l of BIG) {
    if (uni) unilateralize(l.mesh);
    smoothSkinSpine(l.mesh, keepNonVertebra);
  }
  for (const deg of [0, 90, 140, 180]) {
    pose(deg, dropClear);
    const ipsi = BIG.filter((l) => l.side === SIDE).map(measure);
    const contra = BIG.filter((l) => l.side !== SIDE).map(measure);
    const f = (a: { maxDisp: number; maxX: number }[]) =>
      a.length
        ? `disp ${Math.max(...a.map((x) => x.maxDisp)).toFixed(1)} cm, |x| ${Math.max(...a.map((x) => Math.abs(x.maxX))).toFixed(3)}`
        : 'n/a';
    console.log(`  ${String(deg).padStart(3)} deg | moving side: ${f(ipsi)}   | other side: ${f(contra)}`);
    if (deg === 180) diagnose(deg);
  }
}

const restX = Math.max(...BIG.flatMap((l) => l.rest.map((v) => Math.abs(v.x))));
console.log(`lats bellies: ${BIG.length} (moving side = ${SIDE})`);
console.log(`rest |x| reach: ${restX.toFixed(3)} m  (scapular skin edge ~0.187 m)`);
console.log('disp = furthest a vertex travels from rest; |x| = lateral reach');

// Each run mutates the weights, so re-parse the file between configurations.
async function fresh() {
  const g = await new Promise<any>((res, rej) => loader.parse(ab, '', res, rej));
  return g.scene as THREE.Group;
}
run('BEFORE  (re-skin wipes helpers -> insertion never follows the arm)', false, false, false);
{
  const s = await fresh(); s.updateMatrixWorld(true);
  // rebuild all caches against the fresh scene
  rebuild(s);
  run('KEEP ONLY (helpers survive, but GLB weights are still bilateral)', true, false, true);
  const s2 = await fresh(); s2.updateMatrixWorld(true);
  rebuild(s2);
  run('FIXED    (helpers survive + each lats rides only its own arm)', true, true, true);
}

function rebuild(s: THREE.Group) {
  scene = s;
  byArmature.clear(); restQuat.clear(); restPos.clear(); restWorld.clear();
  lats.length = 0;
  for (const an of ['Shoulder_Armature_R', 'Shoulder_Armature_L', 'Spine_Armature']) {
    const root = s.getObjectByName(an);
    if (!root) continue;
    const m = new Map<string, THREE.Object3D>();
    root.traverse((o) => { if (!m.has(base(o.name))) m.set(base(o.name), o); });
    byArmature.set(an, m);
  }
  s.traverse((o) => {
    restQuat.set(o, o.quaternion.clone());
    restPos.set(o, o.position.clone());
    restWorld.set(o, o.matrixWorld.clone());
  });
  spineY.clear();
  s.getObjectByName('Spine_Armature')?.traverse((o) => {
    if (/^vert_/.test(base(o.name)) && !spineY.has(base(o.name)))
      spineY.set(base(o.name), o.getWorldPosition(new THREE.Vector3()).y);
  });
  s.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh || !/latissimus/i.test(m.name) || !m.isSkinnedMesh) return;
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const cx = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld).x;
    const pos = g.getAttribute('position');
    const rest: THREE.Vector3[] = [];
    for (let i = 0; i < pos.count; i++)
      rest.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
    lats.push({ mesh: m, rest, side: cx > 0 ? 'R' : 'L' });
  });
  BIG.length = 0;
  BIG.push(...lats.filter((l) => l.rest.length > 500));
}
