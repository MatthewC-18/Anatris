// What sticks OUT of the shoulder during abduction, measured on the shipped GLB
// with the runtime's own mesh preparation and pose. The lab's 3D cannot be
// screenshotted from the agent harness (see the movement-lab-visual-verify note),
// so this is how shoulder deformation regressions get caught.
//
// Three metrics:
//   FLOAT - how far a muscle vertex drifts from the nearest BONE surface, rest vs
//           posed. A muscle snug on bone at rest and far off it when posed has
//           torn away from its attachment. This is the primary signal.
//   EDGE  - per height band, which mesh reaches furthest out laterally. Shows
//           whether anything opens out past the shoulder's own silhouette.
//   SEAM  - vertices coincident at rest that separate when posed, i.e. a muscle
//           visibly splitting into pieces.
//
// Run: npx tsx scripts/diag-shoulder-spill.mts [deg] [off]
//   deg  abduction angle, default 140
//   off  skip the runtime fixes, to see the raw GLB behaviour for comparison
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { shoulderChain } from '../src/lib/biomech/shoulderChain.ts';
import { layerForMaterial } from '../src/lib/materialColors.ts';

const DEG = Number(process.argv[2] ?? 140);
const APPLY = process.argv[3] !== 'off';
const GLB = 'C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb';
const D2R = Math.PI / 180;
const SIDE: 'R' | 'L' = 'R';
// Must track RigModel.tsx.
const LATS_ROT_FOLLOW = 0.18;
const LATS_ROT_MAX_DEG = 28;
const ARM_CLEARANCE_DEG = 35;
const ARM_CLEARANCE_FADE_DEG = 75;
const ATTACH = /muscle(ol|el)$/i;
// Mirrors SCAPULA_WRAP in RigModel.tsx.
const WRAP: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0], [25, 30.6, -11.3], [49.4, 44.4, -28.1], [60, 45.6, -36.3],
];
function scapulaWrap(upDeg: number): [number, number] {
  const u = Math.abs(upDeg);
  const last = WRAP[WRAP.length - 1];
  if (u >= last[0]) return [last[1], last[2]];
  for (let i = 1; i < WRAP.length; i++) {
    const [u1, y1, z1] = WRAP[i];
    if (u > u1) continue;
    const [u0, y0, z0] = WRAP[i - 1];
    const t = u1 - u0 <= 1e-6 ? 0 : (u - u0) / (u1 - u0);
    return [y0 + (y1 - y0) * t, z0 + (z1 - z0) * t];
  }
  return [0, 0];
}
const ORIGIN_SCAP = /^(teres_major|teres_minor)_muscleol$/i;
const GRADE = /coracobrachialis|subscapularis|teres_major/i;
const GRADE_NEAR_M = 0.03;
const GRADE_FAR_M = 0.09;

const buf = readFileSync(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader(); ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);
const base = (n: string) => n.replace(/_\d+$/, '');
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

const byArm = new Map<string, Map<string, THREE.Object3D>>();
for (const an of ['Shoulder_Armature_R', 'Shoulder_Armature_L', 'Spine_Armature']) {
  const root = scene.getObjectByName(an); if (!root) continue;
  const m = new Map<string, THREE.Object3D>();
  root.traverse((o) => { if (!m.has(base(o.name))) m.set(base(o.name), o); });
  byArm.set(an, m);
}
const rq = new Map<THREE.Object3D, THREE.Quaternion>();
const rp = new Map<THREE.Object3D, THREE.Vector3>();
const rw = new Map<THREE.Object3D, THREE.Matrix4>();
scene.traverse((o) => {
  rq.set(o, o.quaternion.clone()); rp.set(o, o.position.clone()); rw.set(o, o.matrixWorld.clone());
});
const spineY = new Map<string, number>();
scene.getObjectByName('Spine_Armature')?.traverse((o) => {
  if (/^vert_/.test(base(o.name)) && !spineY.has(base(o.name)))
    spineY.set(base(o.name), o.getWorldPosition(new THREE.Vector3()).y);
});

// Tissue comes from the MATERIAL, exactly as the runtime decides it. Do not
// classify by mesh name: "Infrascapular_region" and "Scapular_region" are SKIN
// patches, and a name regex silently counts them as bone.
type M = {
  mesh: THREE.SkinnedMesh;
  name: string;
  layer: 'skin' | 'muscle' | 'bone' | 'connective';
  rest: THREE.Vector3[];
};
const all: M[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  const first = Array.isArray(m.material) ? m.material[0] : m.material;
  const layer = layerForMaterial((first as any)?.name ?? '');
  if (!layer) return; // nerve, vessel, fascia, organ: never shown in the lab
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  if (c.y < 0.9 || c.y > 1.7) return;
  if (SIDE === 'R' ? c.x < 0.0 : c.x > 0.0) return;
  const pos = g.getAttribute('position');
  if (pos.count < 30) return;
  const rest: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++)
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
  return best >= 0 ? base(m.skeleton.bones[best]?.name ?? '') : '';
};
function rigidBindTo(m: THREE.SkinnedMesh, boneBase: string) {
  const bi = m.skeleton.bones.findIndex((b) => base(b.name) === boneBase);
  if (bi < 0) return;
  const si = m.geometry.getAttribute('skinIndex'), sw = m.geometry.getAttribute('skinWeight');
  for (let i = 0; i < si.count; i++) { si.setXYZW(i, bi, 0, 0, 0); sw.setXYZW(i, 1, 0, 0, 0); }
  si.needsUpdate = true; sw.needsUpdate = true;
}
function unilateralizeLats(m: THREE.SkinnedMesh) {
  const hx = new Map<number, number>();
  m.skeleton.bones.forEach((b, i) => {
    if (/^latshum_[lr]$/.test(base(b.name))) hx.set(i, b.getWorldPosition(new THREE.Vector3()).x);
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
    let s = 0, ch = false;
    for (let k = 0; k < 4; k++) { if (drop.has(idx[k]) && w[k] > 0) { w[k] = 0; ch = true; } s += w[k]; }
    if (!ch || s <= 1e-6) continue;
    sw.setXYZW(v, w[0] / s, w[1] / s, w[2] / s, w[3] / s);
  }
  sw.needsUpdate = true;
}
function smoothSkinSpine(m: THREE.SkinnedMesh, keepNonVertebra: boolean) {
  const verts: { idx: number; y: number }[] = [];
  m.skeleton.bones.forEach((b, i) => {
    const y = spineY.get(base(b.name));
    if (/^vert_/.test(base(b.name)) && y !== undefined) verts.push({ idx: i, y });
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
  const s = m.skeleton.bones.findIndex((b) => base(b.name) === 'scapula');
  const h = m.skeleton.bones.findIndex((b) => base(b.name) === 'humerus_gh');
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
    let head: THREE.Vector3 | null = null, elbow: THREE.Vector3 | null = null;
    sr?.traverse((o) => {
      const bn = base(o.name);
      if (bn === 'humerus_gh' && !head) head = o.getWorldPosition(new THREE.Vector3());
      else if (bn === 'forearm_flex' && !elbow) elbow = o.getWorldPosition(new THREE.Vector3());
    });
    return head && elbow ? ([head, elbow] as const) : null;
  };
  const shafts = { R: shaftOf('R'), L: shaftOf('L') };
  for (const m of all) {
    const bare = base(m.name);
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
const sb = byArm.get(`Shoulder_Armature_${SIDE}`)!;
const hum = sb.get('humerus_gh')!, scap = sb.get('scapula')!;
const LATS_PAIRS: [string, string][] = [
  ['latshum_l', 'Shoulder_Armature_R'],
  ['latshum_r', 'Shoulder_Armature_L'],
];
// Ride each shoulder armature root on the rest->posed delta of vert_T3, exactly
// as RigModel.carryShouldersWithSpine does, so the arms follow a leaning trunk.
function carryShoulders() {
  const anchor = byArm.get('Spine_Armature')!.get('vert_T3');
  const anchorRest = anchor ? rw.get(anchor) : undefined;
  if (!anchor || !anchorRest) return;
  const delta = new THREE.Matrix4().copy(anchor.matrixWorld)
    .multiply(new THREE.Matrix4().copy(anchorRest).invert());
  for (const side of ['R', 'L'] as const) {
    const root = scene.getObjectByName(`Shoulder_Armature_${side}`);
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

function pose(deg: number) {
  scene.traverse((o) => {
    const q = rq.get(o); if (q) o.quaternion.copy(q);
    const p = rp.get(o); if (p) o.position.copy(p);
  });
  if (deg !== 0) {
    const p = shoulderChain(deg, SIDE);
    hum.rotateOnAxis(AX.z, p.glenohumeralRot);
    hum.rotateOnAxis(AX.y, p.humeralExtRot * (SIDE === 'R' ? 1 : -1));
    scap.rotateOnAxis(AX.x, p.scapulaUpwardRot);
    if (APPLY && p.scapulaUpwardRot) {
      scene.updateMatrixWorld(true);
      const before = scap.getWorldQuaternion(new THREE.Quaternion());
      const [wy, wz] = scapulaWrap(p.scapulaUpwardRot / D2R);
      const ws = SIDE === 'R' ? 1 : -1;
      scap.rotateOnAxis(AX.y, ws * wy * D2R);
      scap.rotateOnAxis(AX.z, ws * wz * D2R);
      scene.updateMatrixWorld(true);
      const after = scap.getWorldQuaternion(new THREE.Quaternion());
      hum.quaternion.premultiply(after.invert().multiply(before));
    }
  }
  // THORACIC PARTICIPATION + shoulder carry (mirrors boneMap + RigModel).
  const lean = deg === 0 ? 0 : shoulderChain(deg, SIDE).thoracicLatFlexPerVert;
  if (APPLY && lean) {
    const sp2 = byArm.get('Spine_Armature')!;
    for (const bn of ['vert_T6', 'vert_T5', 'vert_T4', 'vert_T3', 'vert_T2']) {
      const b = sp2.get(bn);
      if (b) b.rotateOnAxis(AX.z, lean);
    }
    scene.updateMatrixWorld(true);
    carryShoulders();
  }
  const f = Math.max(0, Math.min(1, (ARM_CLEARANCE_FADE_DEG - deg) / ARM_CLEARANCE_FADE_DEG));
  const cq = new THREE.Quaternion().setFromAxisAngle(AX.x, -ARM_CLEARANCE_DEG * f * D2R);
  if (f > 0) hum.rotateOnAxis(AX.x, -ARM_CLEARANCE_DEG * f * D2R);
  scene.updateMatrixWorld(true);
  const sp = byArm.get('Spine_Armature')!;
  for (const [hn, an] of LATS_PAIRS) {
    const helper = sp.get(hn), h = byArm.get(an)?.get('humerus_gh');
    if (!helper || !h || !helper.parent) continue;
    const hR = rw.get(h), heR = rw.get(helper);
    const qh = h.getWorldQuaternion(new THREE.Quaternion());
    if (APPLY && h === hum && f > 0) qh.multiply(cq.clone().invert());
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
const posedOf = (m: M, sample = false) => {
  m.mesh.skeleton.update();
  const pos = m.mesh.geometry.getAttribute('position');
  const step = sample ? Math.max(1, Math.floor(pos.count / 900)) : 1;
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i += step) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    m.mesh.applyBoneTransform(i, v); m.mesh.localToWorld(v); out.push(v);
  }
  return out;
};
const CELL = 0.02;
const buildHash = (pts: THREE.Vector3[]) => {
  const h = new Map<string, THREE.Vector3[]>();
  for (const p of pts) {
    const k = `${Math.floor(p.x / CELL)}|${Math.floor(p.y / CELL)}|${Math.floor(p.z / CELL)}`;
    h.set(k, [...(h.get(k) ?? []), p]);
  }
  return h;
};
const nearest = (h: Map<string, THREE.Vector3[]>, p: THREE.Vector3) => {
  let best = Infinity;
  for (let r = 1; r <= 6 && best === Infinity; r++) {
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL), cz = Math.floor(p.z / CELL);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++)
      for (const q of h.get(`${cx + i}|${cy + j}|${cz + k}`) ?? []) best = Math.min(best, p.distanceTo(q));
  }
  return best;
};
const floatStat = (deg: number) => {
  pose(deg);
  const bonePts: THREE.Vector3[] = [];
  for (const m of all) if (m.layer === 'bone') bonePts.push(...posedOf(m, true));
  const h = buildHash(bonePts);
  const out = new Map<string, number>();
  for (const m of all) {
    if (m.layer === 'bone') continue;
    let mx = 0;
    for (const v of posedOf(m, true)) { const d = nearest(h, v); if (d !== Infinity && d > mx) mx = d; }
    out.set(m.name, mx);
  }
  return out;
};

console.log(`GLB: ${GLB}`);
console.log(`abduction ${DEG} deg, side ${SIDE}, ${all.length} meshes (${all.filter((m) => m.layer === 'bone').length} bone, ${all.filter((m) => m.layer === 'muscle').length} muscle, ${all.filter((m) => m.layer === 'skin').length} skin)`);
console.log(`runtime fixes: ${APPLY ? 'ON' : 'OFF (raw GLB)'}\n`);

const f0 = floatStat(0), f1 = floatStat(DEG);
console.log('FLOAT — furthest a muscle vertex drifts from the nearest bone surface (rest -> posed):');
const rows = [...f1.entries()].map(([n, d]) => ({ n, r: f0.get(n) ?? 0, p: d, g: d - (f0.get(n) ?? 0) }));
rows.sort((a, b) => b.g - a.g);
for (const r of rows.slice(0, 10))
  console.log(`  ${(r.r * 100).toFixed(1).padStart(5)} -> ${(r.p * 100).toFixed(1).padStart(5)} cm  (${r.g >= 0 ? '+' : ''}${(r.g * 100).toFixed(1)})  ${r.n}`);

// The muscles this script exists to watch, listed whether or not they top the
// chart, so a regression is visible at a glance.
const WATCH = /coracobrachialis|subscapularis|teres_(major|minor)|infraspinatus|supraspinatus|latissimus/i;
console.log('\nFLOAT — watched axillary muscles:');
for (const r of rows.filter((x) => WATCH.test(x.n)).sort((a, b) => b.p - a.p))
  console.log(`  ${(r.r * 100).toFixed(1).padStart(5)} -> ${(r.p * 100).toFixed(1).padStart(5)} cm  (${r.g >= 0 ? '+' : ''}${(r.g * 100).toFixed(1)})  ${r.n}`);

pose(DEG);
const P = new Map<string, THREE.Vector3[]>();
for (const m of all) P.set(m.name, posedOf(m));

console.log('\nEDGE — lateral reach per height band (posed), top 2 per band:');
for (let y = 1.14; y < 1.47; y += 0.03) {
  const top: { n: string; x: number }[] = [];
  for (const [n, vs] of P) {
    let mx = 0, c = 0;
    for (const v of vs) if (v.y >= y && v.y < y + 0.03) { c++; if (v.x > mx) mx = v.x; }
    if (c > 8) top.push({ n, x: mx });
  }
  top.sort((a, b) => b.x - a.x);
  if (top.length)
    console.log(`  ${y.toFixed(2)}-${(y + 0.03).toFixed(2)}  ${top[0].x.toFixed(3)} ${top[0].n.slice(0, 32).padEnd(34)} ${top[1] ? `${top[1].x.toFixed(3)} ${top[1].n.slice(0, 30)}` : ''}`);
}

// EXPOSED — bone standing proud of the soft tissue in ANY direction, not just
// backwards. Per height band we take the band's soft-tissue centroid as an axis,
// split the ring into 12 sectors, and compare the furthest bone radius with the
// furthest muscle/connective radius in each sector. Bone with a larger radius has
// nothing covering it there, which is what reads as "el hueso se sale".
function exposedReport(pts: Map<string, THREE.Vector3[]>, label: string) {
  console.log(`\nEXPOSED (${label}) — bone standing proud of muscle, by height band:`);
  const SECTORS = 12;
  for (let y = 1.10; y < 1.55; y += 0.05) {
    const inBand = (m: M) => (pts.get(m.name) ?? []).filter((v) => v.y >= y && v.y < y + 0.05);
    let cx = 0, cz = 0, n = 0;
    for (const m of all) {
      if (m.layer === 'bone') continue;
      for (const v of inBand(m)) { cx += v.x; cz += v.z; n++; }
    }
    if (n < 40) continue;
    cx /= n; cz /= n;
    const boneR = new Array(SECTORS).fill(0);
    const boneName: string[] = new Array(SECTORS).fill('');
    const softR = new Array(SECTORS).fill(0);
    for (const m of all) {
      const soft = m.layer === 'muscle' || m.layer === 'connective';
      if (!soft && m.layer !== 'bone') continue;
      for (const v of inBand(m)) {
        const dx = v.x - cx, dz = v.z - cz;
        const r = Math.hypot(dx, dz);
        let s = Math.floor(((Math.atan2(dz, dx) + Math.PI) / (2 * Math.PI)) * SECTORS);
        if (s >= SECTORS) s = SECTORS - 1;
        if (m.layer === 'bone') { if (r > boneR[s]) { boneR[s] = r; boneName[s] = m.name; } }
        else if (r > softR[s]) softR[s] = r;
      }
    }
    const bad: string[] = [];
    for (let s = 0; s < SECTORS; s++) {
      if (boneR[s] > 0 && softR[s] > 0 && boneR[s] > softR[s] + 0.002)
        bad.push(`${((boneR[s] - softR[s]) * 100).toFixed(1)}cm ${boneName[s].slice(0, 22)}`);
    }
    if (bad.length)
      console.log(`  ${y.toFixed(2)}-${(y + 0.05).toFixed(2)}  ${bad.join(' | ')}`);
  }
}

// BACK — is bone poking out behind the soft tissue? -z is posterior in this rig.
// For each height band we take the most posterior point of any BONE and of any
// non-bone mesh; bone that sits further back than every muscle over it is bone
// showing through the back.
console.log('\nBACK — most posterior point per height band (-z = behind), bone vs soft tissue:');
for (let y = 1.10; y < 1.50; y += 0.04) {
  let boneZ = Infinity, boneN = '', softZ = Infinity, softN = '';
  for (const m of all) {
    const vs = P.get(m.name)!;
    let mn = Infinity;
    for (const v of vs) if (v.y >= y && v.y < y + 0.04 && v.z < mn) mn = v.z;
    if (mn === Infinity) continue;
    if (m.layer === 'bone') { if (mn < boneZ) { boneZ = mn; boneN = m.name; } }
    else if (m.layer === 'muscle' && mn < softZ) { softZ = mn; softN = m.name; }
  }
  if (boneZ === Infinity || softZ === Infinity) continue;
  const out = boneZ < softZ;
  console.log(
    `  ${y.toFixed(2)}-${(y + 0.04).toFixed(2)}  bone ${boneZ.toFixed(3)} ${boneN.slice(0, 24).padEnd(26)} soft ${softZ.toFixed(3)} ${softN.slice(0, 24).padEnd(26)} ${out ? `BONE EXPOSED by ${((softZ - boneZ) * 100).toFixed(1)} cm` : ''}`,
  );
}

{
  const restPts = new Map<string, THREE.Vector3[]>();
  for (const m of all) restPts.set(m.name, m.rest);
  exposedReport(restPts, 'at rest');
  exposedReport(P, `posed ${DEG} deg`);
}

console.log('\nSEAM — rest-coincident vertices that separate when posed:');
const lats = all.filter((m) => /latissimus/i.test(m.name) && m.rest.length > 500);
const key = (v: THREE.Vector3) => `${Math.round(v.x * 500)}|${Math.round(v.y * 500)}|${Math.round(v.z * 500)}`;
for (let i = 0; i < lats.length; i++)
  for (let j = i + 1; j < lats.length; j++) {
    const A = lats[i], B = lats[j];
    const grid = new Map<string, number[]>();
    B.rest.forEach((v, bi) => { const k = key(v); grid.set(k, [...(grid.get(k) ?? []), bi]); });
    let pairs = 0, mx = 0;
    const pa = P.get(A.name)!, pb = P.get(B.name)!;
    A.rest.forEach((v, ai) => {
      for (const bi of grid.get(key(v)) ?? []) {
        if (v.distanceTo(B.rest[bi]) > 0.001) continue;
        pairs++; mx = Math.max(mx, pa[ai].distanceTo(pb[bi]));
      }
    });
    if (pairs) console.log(`  ${A.name} <-> ${B.name}: ${pairs} shared vertices, max gap ${(mx * 100).toFixed(2)} cm`);
  }
