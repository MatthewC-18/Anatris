// One summary row per angle across a shoulder elevation arc, measured on the
// shipped GLB with the runtime's own pose and mesh preparation replayed on the
// CPU. The lab's 3D cannot be screenshotted from the agent harness, so every
// claim about the arc is made here.
//
// The pose is driven straight from boneMap's ChainControl -- the same decompose
// and targets the runtime uses -- so the script cannot drift out of sync with the
// app the way a hand-copied chain would. Only the parts RigModel adds around the
// chain (scapulothoracic wrap, shoulder carry, aim) are mirrored below, and each
// is marked.
//
// Columns:
//   arm on screen  the shaft's angle IN THE MOVEMENT'S OWN PLANE, from rest.
//                  Should track the asked angle.
//   scapula drift  worst scapular vertex moving AWAY from its rest gap to the
//                  ribcage. This is the blade coming off the back.
//   bone exposed   bone standing proud of the muscle over it, radially, worst
//                  height band and sector.
//   reach          furthest |x| anything gets to in the axillary band.
//   skin seam      worst separation between skin vertices coincident at rest,
//                  i.e. the body splitting open. Arm and deltoid skin are
//                  excluded: they rest against the flank and MUST separate.
//
// Run: npx tsx scripts/sweep-shoulder-arc.mts [movementId] [off]
//   movementId  glenohumeral-abduction (default) | glenohumeral-flexion
//   off         skip the runtime fixes, to see the raw GLB behaviour
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { getBoneControl } from '../src/lib/boneMap.ts';
import { createRigPoser, type Side } from './lib/rigPose.mts';
import { rigGlbPath } from './lib/rigPath.mts';
import { layerForMaterial } from '../src/lib/materialColors.ts';

const MOVEMENT = process.argv[2] && !['off', 'left', 'allseams'].includes(process.argv[2])
  ? process.argv[2]
  : 'glenohumeral-abduction';
const APPLY = !process.argv.includes('off');
const D2R = Math.PI / 180;
const SIDE: Side = process.argv.includes('left') ? 'L' : 'R';

const ctrl = getBoneControl(MOVEMENT);
if (!ctrl || (ctrl.kind !== 'chain' && ctrl.kind !== 'joint')) {
  console.error(`${MOVEMENT} is not drivable (got ${ctrl?.kind ?? 'nothing'})`);
  process.exit(1);
}
const IS_CHAIN = ctrl.kind === 'chain';

/** Plane the clinical angle is read in. Abduction is frontal, flexion sagittal. */
const PLANE: 'frontal' | 'sagittal' = MOVEMENT.includes('flexion') ? 'sagittal' : 'frontal';

// The pose machinery (wrap / carry / aim / lats) is shared with the renderer;
// only the MESH PREPARATION below is specific to this measurement.
const ATTACH = /muscle(ol|el)$/i;
const ORIGIN_SCAP = /^(teres_major|teres_minor)_muscleol$/i;
const GRADE = /coracobrachialis|subscapularis|teres_major/i;
const GRADE_NEAR_M = 0.03;
const GRADE_FAR_M = 0.09;
const LATS_ROT_FOLLOW = 0.18;
const LATS_ROT_MAX_DEG = 28;

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);
const bs = (n: string) => n.replace(/_\d+$/, '');
const AX: Record<string, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const byArm = new Map<string, Map<string, THREE.Object3D>>();
for (const an of ['Shoulder_Armature_R', 'Shoulder_Armature_L', 'Spine_Armature']) {
  const root = scene.getObjectByName(an); if (!root) continue;
  const m = new Map<string, THREE.Object3D>();
  root.traverse((o) => { if (!m.has(bs(o.name))) m.set(bs(o.name), o); });
  byArm.set(an, m);
}
const spineY = new Map<string, number>();
scene.getObjectByName('Spine_Armature')?.traverse((o) => {
  if (/^vert_/.test(bs(o.name)) && !spineY.has(bs(o.name)))
    spineY.set(bs(o.name), o.getWorldPosition(new THREE.Vector3()).y);
});

type M = { mesh: THREE.SkinnedMesh; name: string; layer: string; rest: THREE.Vector3[] };
const all: M[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  const first = Array.isArray(m.material) ? m.material[0] : m.material;
  const layer = layerForMaterial((first as any)?.name ?? '');
  if (!layer) return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  if (c.y < 0.9 || c.y > 1.75) return;
  const pos = g.getAttribute('position');
  if (pos.count < 24) return;
  const step = Math.max(1, Math.floor(pos.count / 260));
  const rest: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += step)
    rest.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  all.push({ mesh: m, name: m.name, layer, rest });
});

// ---------------------------------------------------------------------------
// runtime mesh preparation (the parts that rewrite skin weights)
// ---------------------------------------------------------------------------
const dominant = (m: THREE.SkinnedMesh) => {
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
function rigidBindTo(m: THREE.SkinnedMesh, boneBase: string) {
  const bi = m.skeleton.bones.findIndex((b) => bs(b.name) === boneBase);
  if (bi < 0) return;
  const si = m.geometry.getAttribute('skinIndex'), sw = m.geometry.getAttribute('skinWeight');
  for (let i = 0; i < si.count; i++) { si.setXYZW(i, bi, 0, 0, 0); sw.setXYZW(i, 1, 0, 0, 0); }
  si.needsUpdate = true; sw.needsUpdate = true;
}
function unilateralizeLats(m: THREE.SkinnedMesh) {
  const hx = new Map<number, number>();
  m.skeleton.bones.forEach((b, i) => {
    if (/^latshum_[lr]$/.test(bs(b.name))) hx.set(i, b.getWorldPosition(new THREE.Vector3()).x);
  });
  if (hx.size < 2) return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const mx = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld).x;
  const drop = new Set<number>();
  for (const [i, x] of hx) if (x * mx < 0) drop.add(i);
  if (!drop.size) return;
  const si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
  for (let v = 0; v < si.count; v++) {
    const idx = [si.getX(v), si.getY(v), si.getZ(v), si.getW(v)];
    const w = [sw.getX(v), sw.getY(v), sw.getZ(v), sw.getW(v)];
    let sum = 0, ch = false;
    for (let k = 0; k < 4; k++) { if (drop.has(idx[k]) && w[k] > 0) { w[k] = 0; ch = true; } sum += w[k]; }
    if (!ch || sum <= 1e-6) continue;
    sw.setXYZW(v, w[0] / sum, w[1] / sum, w[2] / sum, w[3] / sum);
  }
  sw.needsUpdate = true;
}
function smoothSkinSpine(m: THREE.SkinnedMesh, keepNonVertebra: boolean) {
  const verts: { idx: number; y: number }[] = [];
  m.skeleton.bones.forEach((b, i) => {
    const y = spineY.get(bs(b.name));
    if (/^vert_/.test(bs(b.name)) && y !== undefined) verts.push({ idx: i, y });
  });
  if (verts.length < 2) return;
  verts.sort((a, b) => a.y - b.y);
  const g = m.geometry;
  const pos = g.getAttribute('position'), si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
  const last = verts.length - 1, yLo = verts[0].y, yHi = verts[last].y;
  const vi = new Set(verts.map((v) => v.idx));
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); m.localToWorld(v);
    let kb = -1, keep = 0;
    if (keepNonVertebra)
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w <= 0) continue;
        const b = si.getComponent(i, k);
        if (vi.has(b)) continue;
        if (kb < 0 || w > keep) kb = b;
        keep += w;
      }
    if (keep > 1) keep = 1;
    if (kb < 0) kb = 0;
    const sp = 1 - keep;
    if (v.y <= yLo) { si.setXYZW(i, verts[0].idx, kb, 0, 0); sw.setXYZW(i, sp, keep, 0, 0); }
    else if (v.y >= yHi) { si.setXYZW(i, verts[last].idx, kb, 0, 0); sw.setXYZW(i, sp, keep, 0, 0); }
    else {
      let k = 0; while (k < last && verts[k + 1].y <= v.y) k++;
      const lo = verts[k], hi = verts[k + 1], span = hi.y - lo.y;
      const t = span > 1e-6 ? (v.y - lo.y) / span : 0;
      si.setXYZW(i, lo.idx, hi.idx, kb, 0);
      sw.setXYZW(i, (1 - t) * sp, t * sp, keep, 0);
    }
  }
  si.needsUpdate = true; sw.needsUpdate = true;
}
function grade(m: THREE.SkinnedMesh, top: THREE.Vector3, bot: THREE.Vector3) {
  const s = m.skeleton.bones.findIndex((b) => bs(b.name) === 'scapula');
  const h = m.skeleton.bones.findIndex((b) => bs(b.name) === 'humerus_gh');
  if (s < 0 || h < 0) return;
  const pos = m.geometry.getAttribute('position');
  const si = m.geometry.getAttribute('skinIndex'), sw = m.geometry.getAttribute('skinWeight');
  const shaft = new THREE.Vector3().subVectors(bot, top);
  const lenSq = shaft.lengthSq();
  if (lenSq <= 1e-6) return;
  const span = GRADE_FAR_M - GRADE_NEAR_M;
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); m.localToWorld(v);
    let u = v.clone().sub(top).dot(shaft) / lenSq;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    c.copy(top).addScaledVector(shaft, u);
    let t = (GRADE_FAR_M - v.distanceTo(c)) / span;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t);
    si.setXYZW(i, s, h, 0, 0); sw.setXYZW(i, 1 - t, t, 0, 0);
  }
  si.needsUpdate = true; sw.needsUpdate = true;
}
if (APPLY) {
  const shaftOf = (side: 'R' | 'L') => {
    const sr = scene.getObjectByName(`Shoulder_Armature_${side}`);
    let head: THREE.Vector3 | null = null, elb: THREE.Vector3 | null = null;
    sr?.traverse((o) => {
      const bn = bs(o.name);
      if (bn === 'humerus_gh' && !head) head = o.getWorldPosition(new THREE.Vector3());
      else if (bn === 'forearm_flex' && !elb) elb = o.getWorldPosition(new THREE.Vector3());
    });
    return head && elb ? ([head, elb] as const) : null;
  };
  const shafts = { R: shaftOf('R'), L: shaftOf('L') };
  for (const m of all) {
    const bare = bs(m.name);
    if (/latissimus/i.test(m.name)) unilateralizeLats(m.mesh);
    if (ORIGIN_SCAP.test(bare)) rigidBindTo(m.mesh, 'scapula');
    else if (GRADE.test(m.name) && !ATTACH.test(bare)) {
      const g = m.mesh.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      const cx = g.boundingSphere!.center.clone().applyMatrix4(m.mesh.matrixWorld).x;
      const s = shafts[cx >= 0 ? 'R' : 'L'];
      if (s) grade(m.mesh, s[0], s[1]);
    }
    if (dominant(m.mesh).startsWith('vert_')) smoothSkinSpine(m.mesh, true);
  }
} else {
  for (const m of all) if (dominant(m.mesh).startsWith('vert_')) smoothSkinSpine(m.mesh, false);
}

// ---------------------------------------------------------------------------
// pose: the shared poser, i.e. boneMap's chain plus the extras RigModel wraps
// around it. Kept in scripts/lib/rigPose so the renderer shows what this measures.
// ---------------------------------------------------------------------------
const poser = createRigPoser(scene, MOVEMENT, SIDE, APPLY);
const shoulderBones = poser.shoulderBones;
const hum = shoulderBones.get('humerus_gh')!;
const elbow = shoulderBones.get('forearm_flex')!;
const rw = poser.restWorld;
const pose = (deg: number, opts?: { withClearance?: boolean; aim?: boolean }) =>
  poser.pose(deg, opts);

const posedOf = (m: M) => {
  m.mesh.skeleton.update();
  const pos = m.mesh.geometry.getAttribute('position');
  const step = Math.max(1, Math.floor(pos.count / 260));
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += step) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    m.mesh.applyBoneTransform(i, v); m.mesh.localToWorld(v); out.push(v);
  }
  return out;
};

/** The shaft's angle read IN the movement's plane, like a goniometer. */
const armAngle = () => {
  const a = hum.getWorldPosition(new THREE.Vector3());
  const b = elbow.getWorldPosition(new THREE.Vector3());
  const d = b.sub(a);
  const deg = PLANE === 'frontal'
    ? (Math.atan2(d.x, -d.y) / D2R) * (SIDE === 'R' ? 1 : -1)
    : Math.atan2(d.z, -d.y) / D2R;
  return deg < -90 ? deg + 360 : deg;
};

/**
 * SWING / TWIST of the humerus, for the rotations.
 *
 * A shoulder rotation does not move the shaft, it spins it, so the in-plane
 * angle above reads ~0 no matter what happens and would call a broken rotation
 * perfect. What the goniometer reads there is the TWIST: the share of the bone's
 * rotation taken about its own long axis. SWING is the leftover, i.e. how much
 * the shaft wandered off — it should stay near zero for a pure rotation, and any
 * growth means the drive axis is not the bone's axis.
 */
const humerusRest = rw.get(hum)!;
function swingTwist(): { swing: number; twist: number } {
  const restQuat = new THREE.Quaternion();
  const restPos = new THREE.Vector3(), restScale = new THREE.Vector3();
  humerusRest.decompose(restPos, restQuat, restScale);
  const now = hum.getWorldQuaternion(new THREE.Quaternion());
  const delta = now.multiply(restQuat.clone().invert());
  // The shaft direction at REST, in world: rest head -> rest elbow.
  const axis = new THREE.Vector3()
    .setFromMatrixPosition(rw.get(elbow)!)
    .sub(new THREE.Vector3().setFromMatrixPosition(humerusRest))
    .normalize();
  // Swing-twist decomposition about that axis.
  const r = new THREE.Vector3(delta.x, delta.y, delta.z);
  const proj = axis.clone().multiplyScalar(r.dot(axis));
  const twistQ = new THREE.Quaternion(proj.x, proj.y, proj.z, delta.w).normalize();
  let twist = 2 * Math.atan2(proj.dot(axis) >= 0 ? proj.length() : -proj.length(), twistQ.w) / D2R;
  if (twist > 180) twist -= 360;
  if (twist < -180) twist += 360;
  const swingQ = delta.clone().multiply(twistQ.clone().invert());
  const swing = (2 * Math.acos(Math.min(1, Math.abs(swingQ.w)))) / D2R;
  // Normalise to CLINICAL degrees. The two sides are mirror images, so the same
  // clinical movement twists the bone opposite ways in world space; boneMap's
  // per-side `sign` is exactly that mirror, so dividing it out (== multiplying,
  // it is +/-1) leaves the angle a physio would read. Correcting for the side
  // AGAIN on top of it, as an earlier version did, just cancels back out and
  // makes the left arm look like it rotates backwards.
  return { swing, twist: twist * ((ctrl as any).sign?.[SIDE] ?? 1) };
}

// ---- static references, taken at rest ----
const boneM = all.filter((m) => m.layer === 'bone');
const softM = all.filter((m) => m.layer === 'muscle' || m.layer === 'connective');
const skinM = all.filter((m) => m.layer === 'skin');
const scapM = all.filter((m) => /^Scapula\d*/i.test(m.name) && m.layer === 'bone');
const ribM = boneM.filter((m) => /rib|sternum|vertebra|costal/i.test(m.name));
const CELL = 0.02;
pose(0);
const ribHash = new Map<string, THREE.Vector3[]>();
for (const m of ribM)
  for (const p of posedOf(m)) {
    const k = `${Math.floor(p.x / CELL)}|${Math.floor(p.y / CELL)}|${Math.floor(p.z / CELL)}`;
    ribHash.set(k, [...(ribHash.get(k) ?? []), p]);
  }
const nearRib = (p: THREE.Vector3) => {
  let best = Infinity;
  for (let r = 1; r <= 6 && best === Infinity; r++) {
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL), cz = Math.floor(p.z / CELL);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++)
      for (const q of ribHash.get(`${cx + i}|${cy + j}|${cz + k}`) ?? []) best = Math.min(best, p.distanceTo(q));
  }
  return best;
};
const scapRest = scapM.map((m) => posedOf(m).map(nearRib));
const restArm = armAngle();
const key = (v: THREE.Vector3) => `${Math.round(v.x * 400)}|${Math.round(v.y * 400)}|${Math.round(v.z * 400)}`;
// Skin that rests against the flank at zero and MUST separate when the arm
// leaves the body -- counting it as a seam would flag every correct pose. It
// also hides a real failure, though: the strip of skin BETWEEN the chest and the
// deltoid is supposed to stretch, not to open a hole. `allseams` drops the
// exclusion so that strip can be measured.
const ARM_SKIN = /region_of_arm|brachial|antebrachial|region_of_elbow|forearm|axilla|region_of_wrist|hand|digit|deltoid/i;
const ALL_SEAMS = process.argv.includes('allseams');
const seams: { a: number; b: number; ai: number; bi: number }[] = [];
for (let i = 0; i < skinM.length; i++)
  for (let j = i + 1; j < skinM.length; j++) {
    if (!ALL_SEAMS && (ARM_SKIN.test(skinM[i].name) || ARM_SKIN.test(skinM[j].name))) continue;
    const grid = new Map<string, number[]>();
    skinM[j].rest.forEach((v, bi) => { const k = key(v); grid.set(k, [...(grid.get(k) ?? []), bi]); });
    skinM[i].rest.forEach((v, ai) => {
      for (const bi of grid.get(key(v)) ?? []) {
        if (v.distanceTo(skinM[j].rest[bi]) > 0.0025) continue;
        seams.push({ a: i, b: j, ai, bi });
      }
    });
  }

console.log(`movement: ${MOVEMENT}  (${PLANE} plane, side ${SIDE})`);
console.log(`runtime fixes: ${APPLY ? 'ON' : 'OFF (raw GLB)'}${(ctrl as any).aimPlane ? '' : '  [no aimPlane on this movement]'}`);
console.log(`${all.length} meshes (${boneM.length} bone, ${softM.length} soft, ${skinM.length} skin), ${seams.length} skin seam pairs`);
console.log(`arm rests ${restArm.toFixed(1)} deg off vertical in this plane (subtracted below)\n`);
console.log(
  IS_CHAIN
    ? ' asked   arm on screen  error   scapula drift  bone exposed   reach   worst skin seam'
    : ' asked   twist on screen error  shaft wander   bone exposed   reach   worst skin seam',
);
const range = (ctrl as any).clinicalRange as { min: number; max: number };
const angles = [0, 15, 30, 45, 60, 80, 90, 100, 120, 140, 160, 180]
  .filter((a) => a >= range.min && a <= range.max);
for (const deg of angles) {
  pose(deg);
  const st = IS_CHAIN ? null : swingTwist();
  const arm = IS_CHAIN ? armAngle() - restArm : st!.twist;
  const P = new Map<string, THREE.Vector3[]>();
  for (const m of all) P.set(m.name, posedOf(m));
  // For a chain this column is the blade coming off the ribs; for a rotation it
  // is how far the shaft wandered, which should be ~0.
  let drift = 0;
  if (IS_CHAIN) {
    scapM.forEach((m, mi) => {
      const pv = P.get(m.name)!;
      for (let i = 0; i < pv.length; i++) drift = Math.max(drift, nearRib(pv[i]) - scapRest[mi][i]);
    });
  }
  let exposed = 0, exposedName = '';
  for (let y = 1.10; y < 1.55; y += 0.05) {
    const inB = (m: M) => (P.get(m.name) ?? []).filter((v) => v.y >= y && v.y < y + 0.05);
    let cx = 0, cz = 0, n = 0;
    for (const m of softM) for (const v of inB(m)) { cx += v.x; cz += v.z; n++; }
    if (n < 40) continue;
    cx /= n; cz /= n;
    const SEC = 12;
    const br = new Array(SEC).fill(0), sr = new Array(SEC).fill(0);
    const bnm: string[] = new Array(SEC).fill('');
    for (const m of boneM) for (const v of inB(m)) {
      const r = Math.hypot(v.x - cx, v.z - cz);
      let s = Math.floor(((Math.atan2(v.z - cz, v.x - cx) + Math.PI) / (2 * Math.PI)) * SEC);
      if (s >= SEC) s = SEC - 1;
      if (r > br[s]) { br[s] = r; bnm[s] = m.name; }
    }
    for (const m of softM) for (const v of inB(m)) {
      const r = Math.hypot(v.x - cx, v.z - cz);
      let s = Math.floor(((Math.atan2(v.z - cz, v.x - cx) + Math.PI) / (2 * Math.PI)) * SEC);
      if (s >= SEC) s = SEC - 1;
      if (r > sr[s]) sr[s] = r;
    }
    for (let s = 0; s < SEC; s++)
      if (br[s] > 0 && sr[s] > 0 && br[s] - sr[s] > exposed) { exposed = br[s] - sr[s]; exposedName = bnm[s]; }
  }
  let reach = 0;
  for (const m of [...softM, ...boneM])
    for (const v of P.get(m.name)!)
      if (v.y >= 1.15 && v.y <= 1.45 && Math.abs(v.x) > reach) reach = Math.abs(v.x);
  let seam = 0, seamName = '';
  for (const sp of seams) {
    const pa = P.get(skinM[sp.a].name)!, pb = P.get(skinM[sp.b].name)!;
    const d = pa[sp.ai].distanceTo(pb[sp.bi]);
    if (d > seam) { seam = d; seamName = `${skinM[sp.a].name} / ${skinM[sp.b].name}`; }
  }
  const col3 = IS_CHAIN
    ? `${(drift * 100).toFixed(1).padStart(6)} cm `
    : `${st!.swing.toFixed(1).padStart(6)} deg`;
  console.log(
    `${String(deg).padStart(5)}   ${arm.toFixed(1).padStart(7)} deg  ${(arm - deg >= 0 ? '+' : '')}${(arm - deg).toFixed(1).padStart(5)}   ` +
    `${col3}   ${(exposed * 100).toFixed(1).padStart(5)} cm    ${reach.toFixed(3)}    ${(seam * 100).toFixed(1).padStart(5)} cm`,
  );
  if (deg === angles[angles.length - 1]) {
    console.log(`\nat ${deg}: worst exposed bone = ${exposedName || 'none'}`);
    console.log(`        worst skin seam    = ${seamName || 'none'}`);
  }
}
