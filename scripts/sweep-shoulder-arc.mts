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
import { getBoneControl, resolveArmatureName } from '../src/lib/boneMap.ts';
import { layerForMaterial } from '../src/lib/materialColors.ts';

const MOVEMENT = process.argv[2] && process.argv[2] !== 'off'
  ? process.argv[2]
  : 'glenohumeral-abduction';
const APPLY = process.argv[2] === 'off' || process.argv[3] === 'off' ? false : true;
const GLB = 'C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb';
const D2R = Math.PI / 180;
const SIDE: 'R' | 'L' = process.argv.includes('left') ? 'L' : 'R';

const ctrl = getBoneControl(MOVEMENT);
if (!ctrl || ctrl.kind !== 'chain') {
  console.error(`${MOVEMENT} is not a chain movement (got ${ctrl?.kind ?? 'nothing'})`);
  process.exit(1);
}

/** Plane the clinical angle is read in. Abduction is frontal, flexion sagittal. */
const PLANE: 'frontal' | 'sagittal' = MOVEMENT.includes('flexion') ? 'sagittal' : 'frontal';

// Mirrors RigModel.tsx. Kept here because they live in the component, not a lib.
const WRAP: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0], [25, 30.6, -11.3], [49.4, 44.4, -28.1], [60, 45.6, -36.3],
];
const WRAP_SIGN = SIDE === 'R' ? 1 : -1;
const ARM_CLEARANCE_DEG = 35;
const ARM_CLEARANCE_FADE_DEG = 75;
const ATTACH = /muscle(ol|el)$/i;
const ORIGIN_SCAP = /^(teres_major|teres_minor)_muscleol$/i;
const GRADE = /coracobrachialis|subscapularis|teres_major/i;
const GRADE_NEAR_M = 0.03;
const GRADE_FAR_M = 0.09;
const LATS_ROT_FOLLOW = 0.18;
const LATS_ROT_MAX_DEG = 28;

function scapulaWrap(u: number): [number, number] {
  u = Math.abs(u);
  const last = WRAP[WRAP.length - 1];
  if (u >= last[0]) return [last[1], last[2]];
  for (let i = 1; i < WRAP.length; i++) {
    const [u1, y1, z1] = WRAP[i];
    if (u > u1) continue;
    const [u0, y0, z0] = WRAP[i - 1];
    const t = (u - u0) / (u1 - u0);
    return [y0 + (y1 - y0) * t, z0 + (z1 - z0) * t];
  }
  return [0, 0];
}

const buf = readFileSync(GLB);
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
const rq = new Map<THREE.Object3D, THREE.Quaternion>();
const rp = new Map<THREE.Object3D, THREE.Vector3>();
const rsc = new Map<THREE.Object3D, THREE.Vector3>();
const rw = new Map<THREE.Object3D, THREE.Matrix4>();
scene.traverse((o) => {
  rq.set(o, o.quaternion.clone()); rp.set(o, o.position.clone());
  rsc.set(o, o.scale.clone()); rw.set(o, o.matrixWorld.clone());
});
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
// pose: boneMap's chain, then the extras RigModel wraps around it
// ---------------------------------------------------------------------------
const shoulderBones = byArm.get(resolveArmatureName('Shoulder_Armature', SIDE))!;
const spineBones = byArm.get('Spine_Armature')!;
const hum = shoulderBones.get('humerus_gh')!;
const scap = shoulderBones.get('scapula')!;
const elbow = shoulderBones.get('forearm_flex')!;

function carryShoulders() {
  const anchor = spineBones.get('vert_T3');
  const anchorRest = anchor ? rw.get(anchor) : undefined;
  if (!anchor || !anchorRest) return;
  const delta = new THREE.Matrix4().copy(anchor.matrixWorld)
    .multiply(new THREE.Matrix4().copy(anchorRest).invert());
  for (const side of ['R', 'L'] as const) {
    const root = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side));
    const rootRest = root ? rw.get(root) : undefined;
    if (!root || !rootRest) continue;
    const target = new THREE.Matrix4().copy(delta).multiply(rootRest);
    const local = root.parent
      ? new THREE.Matrix4().copy(root.parent.matrixWorld).invert().multiply(target)
      : target;
    local.decompose(root.position, root.quaternion, root.scale);
  }
  scene.updateMatrixWorld(true);
}
function driveLats() {
  for (const [hn, an] of [['latshum_l', 'Shoulder_Armature_R'], ['latshum_r', 'Shoulder_Armature_L']] as const) {
    const helper = spineBones.get(hn), h = byArm.get(an)?.get('humerus_gh');
    if (!helper || !h || !helper.parent) continue;
    const hR = rw.get(h), heR = rw.get(helper);
    const qh = h.getWorldQuaternion(new THREE.Quaternion());
    const qp = helper.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    if (hR && heR) {
      const s = new THREE.Vector3(), t = new THREE.Vector3();
      const qhr = new THREE.Quaternion(), qer = new THREE.Quaternion();
      hR.decompose(t, qhr, s); heR.decompose(t, qer, s);
      const qd = qh.clone().multiply(qhr.invert());
      const a = 2 * Math.acos(Math.min(1, Math.abs(qd.w)));
      const sh = a > 1e-4 ? Math.min(LATS_ROT_FOLLOW, (LATS_ROT_MAX_DEG * D2R) / a) : LATS_ROT_FOLLOW;
      qd.slerpQuaternions(new THREE.Quaternion(), qd, sh);
      helper.quaternion.copy(qp).multiply(qd).multiply(qer);
    }
    const pw = h.getWorldPosition(new THREE.Vector3());
    helper.parent.worldToLocal(pw); helper.position.copy(pw);
  }
  scene.updateMatrixWorld(true);
}

/** withClearance=false omits the cosmetic forward lift, which is not part of the
 *  clinical angle and would be misread as extra elevation. */
function pose(deg: number, { withClearance = false, aim = true } = {}) {
  scene.traverse((o) => {
    const q = rq.get(o); if (q) o.quaternion.copy(q);
    const p = rp.get(o); if (p) o.position.copy(p);
    const s = rsc.get(o); if (s) o.scale.copy(s);
  });
  if (deg !== 0) {
    // --- boneMap's chain, applied exactly as RigModel does ---
    const outputs = (ctrl as any).decompose(deg, SIDE);
    const seen = new Set<THREE.Object3D>();
    for (const { key, target } of (ctrl as any).targets) {
      const rad = outputs[key];
      if (rad === undefined) continue;
      const map = target.armature === 'spine' ? spineBones : shoulderBones;
      for (const bn of target.bones) {
        const bone = map.get(bn);
        if (!bone) continue;
        if (!seen.has(bone)) { bone.quaternion.copy(rq.get(bone)!); seen.add(bone); }
        bone.rotateOnAxis(AX[target.axis], rad);
      }
    }
    scene.updateMatrixWorld(true);
    if (APPLY) {
      // --- scapulothoracic wrap ---
      if (outputs.scapula) {
        const before = scap.getWorldQuaternion(new THREE.Quaternion());
        const [wy, wz] = scapulaWrap(outputs.scapula / D2R);
        scap.rotateOnAxis(AX.y, WRAP_SIGN * wy * D2R);
        scap.rotateOnAxis(AX.z, WRAP_SIGN * wz * D2R);
        scene.updateMatrixWorld(true);
        const after = scap.getWorldQuaternion(new THREE.Quaternion());
        hum.quaternion.premultiply(after.invert().multiply(before));
        scene.updateMatrixWorld(true);
      }
      // --- shoulder carry, when the chain leans the trunk ---
      if (outputs.thoracic) carryShoulders();
      // --- aim ---
      const plane = (ctrl as any).aimPlane as 'x' | 'z' | undefined;
      if (aim && plane) {
        const rh = new THREE.Vector3().setFromMatrixPosition(rw.get(hum)!);
        const re = new THREE.Vector3().setFromMatrixPosition(rw.get(elbow)!);
        const want = re.sub(rh).normalize();
        if (plane === 'z') {
          const r = Math.hypot(want.x, want.y);
          const a = Math.atan2(want.x, -want.y) + deg * D2R * (SIDE === 'R' ? 1 : -1);
          want.set(Math.sin(a) * r, -Math.cos(a) * r, want.z).normalize();
        } else {
          const r = Math.hypot(want.z, want.y);
          const a = Math.atan2(want.z, -want.y) + deg * D2R;
          want.set(want.x, -Math.cos(a) * r, Math.sin(a) * r).normalize();
        }
        const ph = hum.getWorldPosition(new THREE.Vector3());
        const pe = elbow.getWorldPosition(new THREE.Vector3());
        const have = pe.sub(ph).normalize();
        const fix = new THREE.Quaternion().setFromUnitVectors(have, want);
        const pw = hum.parent
          ? hum.parent.getWorldQuaternion(new THREE.Quaternion())
          : new THREE.Quaternion();
        hum.quaternion.premultiply(pw.clone().invert().multiply(fix).multiply(pw));
        scene.updateMatrixWorld(true);
      }
    }
  }
  if (withClearance) {
    const f = Math.max(0, Math.min(1, (ARM_CLEARANCE_FADE_DEG - deg) / ARM_CLEARANCE_FADE_DEG));
    if (f > 0) hum.rotateOnAxis(AX.x, -ARM_CLEARANCE_DEG * f * D2R);
  }
  scene.updateMatrixWorld(true);
  if (APPLY) driveLats();
}
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
const ARM_SKIN = /region_of_arm|brachial|antebrachial|region_of_elbow|forearm|axilla|region_of_wrist|hand|digit|deltoid/i;
const seams: { a: number; b: number; ai: number; bi: number }[] = [];
for (let i = 0; i < skinM.length; i++)
  for (let j = i + 1; j < skinM.length; j++) {
    if (ARM_SKIN.test(skinM[i].name) || ARM_SKIN.test(skinM[j].name)) continue;
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
console.log(' asked   arm on screen  error   scapula drift  bone exposed   reach   worst skin seam');
const range = (ctrl as any).clinicalRange as { min: number; max: number };
const angles = [0, 30, 60, 90, 120, 140, 160, 180].filter((a) => a >= range.min && a <= range.max);
for (const deg of angles) {
  pose(deg);
  const arm = armAngle() - restArm;
  const P = new Map<string, THREE.Vector3[]>();
  for (const m of all) P.set(m.name, posedOf(m));
  let drift = 0;
  scapM.forEach((m, mi) => {
    const pv = P.get(m.name)!;
    for (let i = 0; i < pv.length; i++) drift = Math.max(drift, nearRib(pv[i]) - scapRest[mi][i]);
  });
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
  console.log(
    `${String(deg).padStart(5)}   ${arm.toFixed(1).padStart(7)} deg  ${(arm - deg >= 0 ? '+' : '')}${(arm - deg).toFixed(1).padStart(5)}   ` +
    `${(drift * 100).toFixed(1).padStart(6)} cm    ${(exposed * 100).toFixed(1).padStart(5)} cm    ${reach.toFixed(3)}    ${(seam * 100).toFixed(1).padStart(5)} cm`,
  );
  if (deg === angles[angles.length - 1]) {
    console.log(`\nat ${deg}: worst exposed bone = ${exposedName || 'none'}`);
    console.log(`        worst skin seam    = ${seamName || 'none'}`);
  }
}
