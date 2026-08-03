// What does the FOREARM actually look like once the arm is POSED, with the whole
// current runtime pipeline applied (mirror repair + measured trim + rebinds)?
//
// The earlier audits measure the REST pose (audit-forearm-outliers) or apply only
// the twist bindings (audit-forearm-spill). Neither reproduces what ships: the
// mirror rebuild of the right forearm, the measured triangle TRIM, the elbow
// anchor and the rebinds. This one does, and then poses the arm -- including the
// abduction the user screenshotted -- to see what is left hanging outside it.
//
// Two things it measures that the older audits got wrong, and that were hiding
// the bug:
//   - distances are taken to the limb AXIS (bone-to-child segments), not to the
//     cloud of bone origins, which in a 7-bone arm leaves a 25 cm hole down the
//     forearm and turns any threshold into a measure of that hole;
//   - only the vertices the index still DRAWS are sampled, so a mesh that has
//     been trimmed reports what it shows rather than what its buffer remembers.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-forearm-posed.mts [R|L]
// Env: TRIM=points, NAME_CULL=on, ELBOW_ANCHOR=off re-test the older behaviours.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { getBoneControl, resolveArmatureName } from '../src/lib/boneMap.ts';
import { layerForMaterial, materialIsSkin, colorForMaterial } from '../src/lib/materialColors.ts';

const SIDE = ((process.argv[2] as 'R' | 'L') ?? 'R');
const GLB = 'C:/Users/Matthew/Documents/Fisio/public/cuerpo-rig.opt.glb';
const D2R = Math.PI / 180;
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
const boneOf = (n: string) => {
  let f: THREE.Object3D | null = null;
  armRoot.traverse((o) => { if (!f && bs(o.name) === n) f = o; });
  return f;
};
const flexB = boneOf('forearm_flex')!, rotB = boneOf('forearm_rot')!;
const ELBOW_Y = flexB.getWorldPosition(new THREE.Vector3()).y;
const WRIST_Y = boneOf('hand_flex')!.getWorldPosition(new THREE.Vector3()).y;
const centerOf = (m: THREE.Mesh) => {
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  return g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
};
const matNameOf = (m: THREE.Mesh) => {
  const f = Array.isArray(m.material) ? m.material[0] : m.material;
  return (f as THREE.Material | undefined)?.name ?? '';
};

// ---------------------------------------------------------------------------
// 1. MIRROR REPAIR (RigModel repairMirroredMeshes)
// ---------------------------------------------------------------------------
interface Twin { mesh: THREE.SkinnedMesh; dims: THREE.Vector3; vol: number; x: number }
const groups = new Map<string, Twin[]>();
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh || !m.geometry) return;
  if (!layerForMaterial(matNameOf(m))) return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  if (Math.abs(c.x) < 0.04) return;
  g.computeBoundingBox();
  const dims = g.boundingBox!.getSize(new THREE.Vector3());
  const key = `${m.name.replace(/_\d+$/, '')}|${g.getAttribute('position').count}`;
  groups.set(key, [...(groups.get(key) ?? []), { mesh: m, dims, vol: dims.x * dims.y * dims.z, x: c.x }]);
});
const longAxis = (d: THREE.Vector3) => (d.x >= d.y && d.x >= d.z ? 'x' : d.y >= d.z ? 'y' : 'z');
const mirror = new THREE.Matrix4().makeScale(-1, 1, 1);
const repaired: string[] = [];
for (const list of groups.values()) {
  if (list.length !== 2) continue;
  const [a, b] = list;
  if (a.x * b.x > 0) continue;
  if (longAxis(a.dims) === longAxis(b.dims)) continue;
  const bad = a.vol < b.vol ? a : b;
  const good = a.vol < b.vol ? b : a;
  if (bad.vol > good.vol * 0.5) continue;
  const badBones = bad.mesh.skeleton.bones.map((x) => bs(x.name));
  const goodBones = good.mesh.skeleton.bones.map((x) => bs(x.name));
  const remap = goodBones.map((n) => badBones.indexOf(n));
  if (remap.some((i) => i < 0)) continue;
  const toBadLocal = new THREE.Matrix4()
    .copy(bad.mesh.matrixWorld).invert().multiply(mirror).multiply(good.mesh.matrixWorld);
  const dst = good.mesh.geometry.clone();
  dst.applyMatrix4(toBadLocal);
  const idx = dst.getIndex();
  if (idx) {
    const arr = idx.array as Uint16Array | Uint32Array;
    for (let i = 0; i + 2 < arr.length; i += 3) { const t = arr[i + 1]; arr[i + 1] = arr[i + 2]; arr[i + 2] = t; }
    idx.needsUpdate = true;
  }
  dst.computeVertexNormals();
  const si = dst.getAttribute('skinIndex');
  if (si) {
    for (let i = 0; i < si.count; i++)
      for (let k = 0; k < 4; k++) si.setComponent(i, k, remap[si.getComponent(i, k)] ?? 0);
    si.needsUpdate = true;
  }
  dst.computeBoundingBox(); dst.computeBoundingSphere();
  bad.mesh.geometry = dst;
  repaired.push(`${bad.mesh.name} (${bad.x > 0 ? 'R' : 'L'})`);
}

// ---------------------------------------------------------------------------
// 2. TWIST BONE + splice (RigModel)
// ---------------------------------------------------------------------------
const twist = new THREE.Bone();
twist.name = `forearm_twist_${SIDE}`;
twist.position.copy(rotB.position);
twist.quaternion.copy(rotB.quaternion);
twist.scale.copy(rotB.scale);
flexB.add(twist);
scene.updateMatrixWorld(true);
const twistRest = twist.quaternion.clone();
const splice = (m: THREE.SkinnedMesh) => {
  const sk = m.skeleton;
  if (!sk || sk.bones.includes(twist)) return;
  sk.bones.push(twist);
  sk.boneInverses.push(new THREE.Matrix4().copy(twist.matrixWorld).invert());
  sk.init();
};

// ---------------------------------------------------------------------------
// 3. Inventory of this arm's meshes + the runtime's visibility rules
// ---------------------------------------------------------------------------
const inDistalRegion = (c: THREE.Vector3) =>
  (c.y > 0.6 && c.y < 0.86 && Math.abs(c.x) > 0.18) || c.y < 0.12;
const inArmBand = (c: THREE.Vector3) => Math.abs(c.x) > 0.16 && c.y > 0.82 && c.y < 1.4;
const DIGITAL = /digitorum|digiti minimi|indicis|pollicis|palmaris/i;
/** The name-based digital cull, now removed from RigModel; NAME_CULL=on re-tests it. */
const NAME_CULL = process.env.NAME_CULL === 'on';

interface Row {
  m: THREE.SkinnedMesh; name: string; layer: string; color: string;
  hidden: string | null; center: THREE.Vector3; foreign: boolean;
}
const rows: Row[] = [];
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  if (!m.skeleton?.bones.some((b) => armRoot.getObjectById(b.id))) return;
  const mat = matNameOf(m);
  const layer = layerForMaterial(mat);
  const c = centerOf(m);
  if (c.y > ELBOW_Y + 0.06) return;          // forearm + hand only
  const isGroup = /g0\d\d$/.test(m.name) || /_system/i.test(m.name) || /^General[_ ]terms$/i.test(m.name);
  let hidden: string | null = null;
  if (!layer || isGroup) hidden = 'non-anatomy';
  else if (inDistalRegion(c)) hidden = materialIsSkin(mat) ? null : 'distal-cap';
  if (!hidden && NAME_CULL && layer === 'muscle' && DIGITAL.test(m.name) && inArmBand(c)) hidden = 'digital-name';
  const col = colorForMaterial(mat);
  rows.push({
    m, name: m.name, layer: layer ?? 'none', hidden, center: c,
    color: col === null ? 'none' : `#${col.toString(16).padStart(6, '0')}`,
    foreign: false,
  });
});

// FOREIGN meshes: geometry sitting in the arm whose SKELETON is not the arm's --
// the Z-Anatomy duplicates bound to a thoracic vertebra. The runtime's limb trim
// only looks at meshes owned by the arm armature, so these are never measured,
// and they cannot follow the arm: on abduction the arm leaves and they stay,
// which reads as a loose piece crossing the limb.
scene.traverse((o) => {
  const m = o as THREE.SkinnedMesh;
  if (!m.isMesh || !m.isSkinnedMesh) return;
  if (m.skeleton?.bones.some((b) => armRoot.getObjectById(b.id))) return;
  const mat = matNameOf(m);
  const layer = layerForMaterial(mat);
  if (!layer) return;
  const c = centerOf(m);
  const armX = SIDE === 'R' ? c.x > 0.15 : c.x < -0.15;
  if (!armX || c.y > ELBOW_Y + 0.30 || c.y < WRIST_Y - 0.05) return;
  // The runtime hides the thoracic-bound arm-belly duplicates (rigidBindTo to
  // humerus_gh fails on a Spine skeleton). Everything else stays on screen.
  const ln = m.name.toLowerCase().replace(/[._\s]+/g, ' ');
  const isArmBelly =
    ln.includes('biceps brachii') ||
    (ln.includes('triceps brachii') && !ln.includes('long head')) ||
    (ln.includes('brachialis') && !ln.includes('coraco'));
  const hasHum = m.skeleton.bones.some((b) => bs(b.name) === 'humerus_gh');
  let hidden: string | null = null;
  if (layer === 'muscle' && isArmBelly && !hasHum) hidden = 'thoracic-dup';
  else if (inDistalRegion(c)) hidden = materialIsSkin(mat) ? null : 'distal-cap';
  const col = colorForMaterial(mat);
  rows.push({
    m, name: m.name, layer, hidden, center: c, foreign: true,
    color: col === null ? 'none' : `#${col.toString(16).padStart(6, '0')}`,
  });
});

// ---------------------------------------------------------------------------
// 4. MEASURED TRIM (RigModel trimMeshToLimb + LIMB_OUTLIER_MARGIN)
// ---------------------------------------------------------------------------
const chain: THREE.Vector3[] = [];
armRoot.traverse((o) => { if ((o as THREE.Bone).isBone) chain.push(o.getWorldPosition(new THREE.Vector3())); });
// SEGMENTS, not points. The arm armature has SEVEN bones, so a point cloud made
// of their origins leaves a ~25 cm gap down the forearm: a vertex halfway along
// it is 12 cm from both ends without being anywhere near the surface. That is the
// distance the shipped trim thresholds against, which is why it lets rods through.
// The limb AXIS is the polyline joining each bone to its children.
type Seg = [THREE.Vector3, THREE.Vector3];
const segs: Seg[] = [];
armRoot.traverse((o) => {
  if (!(o as THREE.Bone).isBone) return;
  const a = o.getWorldPosition(new THREE.Vector3());
  for (const ch of o.children)
    if ((ch as THREE.Bone).isBone) segs.push([a, ch.getWorldPosition(new THREE.Vector3())]);
});
const _ab = new THREE.Vector3(); const _ap = new THREE.Vector3();
const distToAxis = (p: THREE.Vector3): number => {
  let best = Infinity;
  for (const [a, b] of segs) {
    _ab.subVectors(b, a); _ap.subVectors(p, a);
    const l2 = _ab.lengthSq();
    let t = l2 > 1e-9 ? _ap.dot(_ab) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = _ap.addScaledVector(_ab, -t).lengthSq();
    if (d < best) best = d;
  }
  return Math.sqrt(best);
};
const axisP95 = (mesh: THREE.Mesh, pts?: THREE.Vector3[]): number => {
  const pos = mesh.geometry.getAttribute('position');
  const d: number[] = [];
  if (pts) for (const p of pts) d.push(distToAxis(p));
  else {
    const ids = drawnVerts(mesh);
    const step = Math.max(1, Math.floor(ids.length / 300));
    const v = new THREE.Vector3();
    for (let i = 0; i < ids.length; i += step) {
      v.fromBufferAttribute(pos, ids[i]); mesh.localToWorld(v); d.push(distToAxis(v));
    }
  }
  d.sort((x, y) => x - y);
  return d[Math.floor(d.length * 0.95)] ?? 0;
};
const _p = new THREE.Vector3();
/**
 * The vertices a mesh actually DRAWS. After trimMeshToLimb the position buffer
 * still carries the cut-away vertices -- only the index drops them -- so a sweep
 * over `position` reports a trimmed mesh exactly as far out as before the trim,
 * which is how the trim looked ineffective. Measure what the index references.
 */
const drawnVerts = (mesh: THREE.Mesh): number[] => {
  const idx = mesh.geometry.getIndex();
  const pos = mesh.geometry.getAttribute('position');
  if (!idx) return Array.from({ length: pos.count }, (_, i) => i);
  const seen = new Set<number>();
  const arr = idx.array as ArrayLike<number>;
  for (let i = 0; i < arr.length; i++) seen.add(arr[i]);
  return [...seen];
};
const reach = (mesh: THREE.Mesh, pts?: THREE.Vector3[]) => {
  const pos = mesh.geometry.getAttribute('position');
  const d: number[] = [];
  if (pts) {
    for (const p of pts) {
      let best = Infinity;
      for (const q of chain) { const dd = p.distanceToSquared(q); if (dd < best) best = dd; }
      d.push(Math.sqrt(best));
    }
  } else {
    const ids = drawnVerts(mesh);
    const step = Math.max(1, Math.floor(ids.length / 300));
    for (let i = 0; i < ids.length; i += step) {
      _p.fromBufferAttribute(pos, ids[i]); mesh.localToWorld(_p);
      let best = Infinity;
      for (const q of chain) { const dd = _p.distanceToSquared(q); if (dd < best) best = dd; }
      d.push(Math.sqrt(best));
    }
  }
  d.sort((x, y) => x - y);
  return d[Math.floor(d.length * 0.95)] ?? 0;
};
const AXIS_TRIM = process.env.TRIM !== 'points';
const skinReach = rows
  .filter((r) => !r.foreign && r.layer === 'skin' && r.center.y >= WRIST_Y - 0.02)
  .reduce((mx, r) => Math.max(mx, AXIS_TRIM ? axisP95(r.m) : reach(r.m)), 0);
const MARGIN = Number(process.env.MARGIN ?? 1.02);
const LIMIT = skinReach * MARGIN;
const distMetric = (p: THREE.Vector3): number => {
  if (AXIS_TRIM) return distToAxis(p);
  let best = Infinity;
  for (const q of chain) { const dd = p.distanceToSquared(q); if (dd < best) best = dd; }
  return Math.sqrt(best);
};
const trimmedFrac = new Map<string, number>();
for (const r of rows) {
  if (r.layer === 'skin' || r.hidden || r.foreign) continue; // runtime trims only arm-owned meshes
  const p95 = AXIS_TRIM ? axisP95(r.m) : reach(r.m);
  if (p95 <= LIMIT) continue;
  // trimMeshToLimb
  const geom = r.m.geometry;
  const idx = geom.getIndex()!; const pos = geom.getAttribute('position');
  const inside = new Uint8Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    _p.fromBufferAttribute(pos, i); r.m.localToWorld(_p);
    inside[i] = distMetric(_p) <= LIMIT ? 1 : 0;
  }
  const arr = idx.array as ArrayLike<number>;
  const kept: number[] = [];
  for (let i = 0; i + 2 < arr.length; i += 3)
    if (inside[arr[i]] && inside[arr[i + 1]] && inside[arr[i + 2]]) kept.push(arr[i], arr[i + 1], arr[i + 2]);
  const frac = kept.length / arr.length;
  trimmedFrac.set(r.name, frac);
  if (frac >= 0.05 && frac < 1) {
    const next = geom.clone(); next.setIndex(kept);
    next.computeBoundingBox(); next.computeBoundingSphere();
    r.m.geometry = next;
  }
  if (frac < 0.1) r.hidden = 'outlier'; // LIMB_TRIM_MIN_KEPT
}

// ---------------------------------------------------------------------------
// 5. REBINDS (skin + muscle), as RigModel does them
// ---------------------------------------------------------------------------
const dominantBoneName = (m: THREE.SkinnedMesh) => {
  const si = m.geometry.getAttribute('skinIndex'), sw = m.geometry.getAttribute('skinWeight');
  if (!si || !sw) return '';
  const acc = new Map<number, number>();
  for (let i = 0; i < si.count; i++)
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k);
      if (w > 0) { const b = si.getComponent(i, k); acc.set(b, (acc.get(b) ?? 0) + w); }
    }
  let best = -1, bw = 0;
  for (const [b, w] of acc) if (w > bw) { bw = w; best = b; }
  return best >= 0 ? bs(m.skeleton.bones[best]?.name ?? '') : '';
};
const rigidBindTo = (m: THREE.SkinnedMesh, boneBase: string) => {
  const bi = m.skeleton.bones.findIndex((b) => bs(b.name) === boneBase);
  if (bi < 0) return false;
  const si = m.geometry.getAttribute('skinIndex'), sw = m.geometry.getAttribute('skinWeight');
  for (let i = 0; i < si.count; i++) { si.setXYZW(i, bi, 0, 0, 0); sw.setXYZW(i, 1, 0, 0, 0); }
  si.needsUpdate = true; sw.needsUpdate = true;
  return true;
};
const smoothTwistForearm = (m: THREE.SkinnedMesh) => {
  splice(m);
  const flexIdx = m.skeleton.bones.findIndex((b) => bs(b.name) === 'forearm_flex');
  const rotIdx = m.skeleton.bones.findIndex((b) => bs(b.name) === 'forearm_rot');
  const twIdx = m.skeleton.bones.indexOf(twist);
  if (flexIdx < 0 || rotIdx < 0) return false;
  const ladder = twIdx >= 0 ? [flexIdx, twIdx, rotIdx] : [flexIdx, rotIdx];
  const steps = ladder.length - 1;
  const pos = m.geometry.getAttribute('position');
  const si = m.geometry.getAttribute('skinIndex'), sw = m.geometry.getAttribute('skinWeight');
  const span = ELBOW_Y - WRIST_Y;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); m.localToWorld(v);
    let t = (ELBOW_Y - v.y) / span; t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t);
    const sc = t * steps; let k = Math.floor(sc); if (k >= steps) k = steps - 1;
    si.setXYZW(i, ladder[k], ladder[k + 1], 0, 0);
    sw.setXYZW(i, 1 - (sc - k), sc - k, 0, 0);
  }
  si.needsUpdate = true; sw.needsUpdate = true;
  return true;
};
/** RigModel anchorOriginToHumerus: the elbow-crossing origin stays on the arm. */
const ELBOW_ANCHOR = process.env.ELBOW_ANCHOR !== 'off';
const anchorOriginToHumerus = (m: THREE.SkinnedMesh) => {
  const humIdx = m.skeleton.bones.findIndex((b) => bs(b.name) === 'humerus_gh');
  const flexIdx = m.skeleton.bones.findIndex((b) => bs(b.name) === 'forearm_flex');
  if (humIdx < 0 || flexIdx < 0) return false;
  const pos = m.geometry.getAttribute('position');
  const si = m.geometry.getAttribute('skinIndex'), sw = m.geometry.getAttribute('skinWeight');
  const v = new THREE.Vector3();
  let touched = 0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i); m.localToWorld(v);
    if (v.y <= ELBOW_Y) continue;
    let t = (v.y - ELBOW_Y) / 0.05; t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t);
    si.setXYZW(i, humIdx, flexIdx, 0, 0);
    sw.setXYZW(i, t, 1 - t, 0, 0);
    touched++;
  }
  si.needsUpdate = true; sw.needsUpdate = true;
  return touched > 0;
};
const domBefore = new Map<string, string>();
for (const r of rows) {
  if (r.hidden) continue;
  domBefore.set(r.name, dominantBoneName(r.m));
  if (r.layer === 'skin') {
    if (dominantBoneName(r.m) === 'forearm_flex' && r.center.y < ELBOW_Y) smoothTwistForearm(r.m);
    continue;
  }
  if (r.layer !== 'muscle') continue;
  if (r.center.y < ELBOW_Y && r.center.y > WRIST_Y) {
    const dom = dominantBoneName(r.m);
    if (dom === 'forearm_flex' || dom === 'forearm_rot' || dom === 'hand_flex') smoothTwistForearm(r.m);
  } else if (r.center.y >= ELBOW_Y && dominantBoneName(r.m) === 'forearm_rot') {
    rigidBindTo(r.m, 'forearm_flex');
  }
}
if (ELBOW_ANCHOR) {
  for (const r of rows) {
    if (r.hidden || r.foreign) continue;
    if (r.layer !== 'muscle' && r.layer !== 'connective') continue;
    if (r.center.y >= ELBOW_Y || r.center.y <= WRIST_Y) continue;
    anchorOriginToHumerus(r.m);
  }
}

// ---------------------------------------------------------------------------
// 6. Pose + measure
// ---------------------------------------------------------------------------
const rq = new Map<THREE.Object3D, THREE.Quaternion>();
scene.traverse((o) => rq.set(o, o.quaternion.clone()));
function pose(moves: [string, number][]) {
  scene.traverse((o) => { const q = rq.get(o); if (q) o.quaternion.copy(q); });
  twist.quaternion.copy(twistRest);
  for (const [id, deg] of moves) {
    const c = getBoneControl(id) as { kind: string; bone: string; axis: string; sign: Record<string, number> } | null;
    if (!c || c.kind !== 'joint') continue;
    const b = boneOf(c.bone);
    if (b) b.rotateOnAxis(AX[c.axis], deg * D2R * c.sign[SIDE]);
  }
  const d = rq.get(rotB)!.clone().invert().multiply(rotB.quaternion);
  twist.quaternion.copy(twistRest).multiply(new THREE.Quaternion().identity().slerp(d, 0.5));
  scene.updateMatrixWorld(true);
}
const posedPts = (m: THREE.SkinnedMesh) => {
  m.skeleton.update();
  const pos = m.geometry.getAttribute('position');
  const ids = drawnVerts(m);
  const step = Math.max(1, Math.floor(ids.length / 400));
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < ids.length; i += step) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, ids[i]);
    m.applyBoneTransform(ids[i], v); m.localToWorld(v); out.push(v);
  }
  return out;
};

const skinAxis = rows
  .filter((r) => !r.foreign && r.layer === 'skin' && r.center.y >= WRIST_Y - 0.02)
  .map((r) => ({ n: r.name, p: axisP95(r.m) }))
  .sort((a, b) => b.p - a.p);
console.log(`side ${SIDE}   skin reach ${(skinReach * 100).toFixed(1)} cm   trim limit ${(LIMIT * 100).toFixed(1)} cm`);
console.log(`
forearm SKIN, distance to the limb AXIS (the real sleeve radius):`);
for (const s of skinAxis.slice(0, 6)) console.log(`   ${(s.p * 100).toFixed(1).padStart(5)} cm  ${s.n}`);
console.log(`   -> sleeve p95 = ${(skinAxis[0].p * 100).toFixed(1)} cm vs point-cloud threshold ${(LIMIT * 100).toFixed(1)} cm`);
console.log(`
non-skin meshes by AXIS distance (rest, drawn triangles only):`);
const byAxis = rows.filter((r) => !r.hidden && r.layer !== 'skin')
  .map((r) => ({ n: r.name, l: r.layer, f: r.foreign, p: axisP95(r.m) }))
  .sort((a, b) => b.p - a.p);
for (const r of byAxis.slice(0, 14))
  console.log(`   ${(r.p * 100).toFixed(1).padStart(5)} cm  [${r.l.padEnd(10)}]${r.f ? ' [FOREIGN]' : ''} ${r.n}`);
console.log(`mirror-repaired: ${repaired.length ? repaired.join(', ') : 'none'}`);
const shown = rows.filter((r) => !r.hidden && r.layer !== 'skin');
const hiddenBy = new Map<string, number>();
for (const r of rows) if (r.hidden) hiddenBy.set(r.hidden, (hiddenBy.get(r.hidden) ?? 0) + 1);
console.log(`meshes in forearm+hand: ${rows.length}   shown non-skin: ${shown.length}   hidden: ${[...hiddenBy].map(([k, v]) => `${k}=${v}`).join(' ')}`);
// How much forearm MUSCLE survives the trim: the previous fix was justified on
// keeping the bulk, so a tighter threshold has to be checked against it.
{
  let tris = 0, meshes = 0;
  for (const r of rows) {
    if (r.foreign || r.hidden || r.layer !== 'muscle') continue;
    if (r.center.y >= ELBOW_Y || r.center.y <= WRIST_Y) continue;
    meshes++;
    tris += (r.m.geometry.getIndex()?.count ?? 0) / 3;
  }
  console.log(`forearm MUSCLE shown: ${meshes} meshes, ${Math.round(tris)} triangles`);
}
const trims = [...trimmedFrac.entries()].filter(([, f]) => f < 1).sort((a, b) => a[1] - b[1]);
console.log(`\ntrimmed meshes (${trims.length}): kept %, triangles left, size of the remnant`);
for (const [n, f] of trims) {
  const r = rows.find((x) => x.name === n)!;
  const g = r.m.geometry; g.computeBoundingBox();
  const d = g.boundingBox!.getSize(new THREE.Vector3());
  const tri = (g.getIndex()?.count ?? 0) / 3;
  console.log(`   ${(f * 100).toFixed(0).padStart(3)}%  ${String(Math.round(tri)).padStart(5)} tri  ${(d.x * 100).toFixed(0)}x${(d.y * 100).toFixed(0)}x${(d.z * 100).toFixed(0)} cm  ${n}`);
}

const POSES: [string, [string, number][]][] = [
  ['neutral', []],
  ['shoulder abduction 90', [['shoulder-abduction', 90]]],
  ['abduction 90 + pronation 85', [['shoulder-abduction', 90], ['elbow-pronation', 85]]],
  ['elbow flexion 145', [['elbow-flexion', 145]]],
];
for (const [label, moves] of POSES) {
  pose(moves);
  // posed bone chain of this arm
  chain.length = 0;
  armRoot.traverse((o) => { if ((o as THREE.Bone).isBone) chain.push(o.getWorldPosition(new THREE.Vector3())); });
  segs.length = 0;
  armRoot.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    const a = o.getWorldPosition(new THREE.Vector3());
    for (const ch of o.children)
      if ((ch as THREE.Bone).isBone) segs.push([a, ch.getWorldPosition(new THREE.Vector3())]);
  });
  const skinP95 = rows
    .filter((r) => !r.foreign && r.layer === 'skin' && !r.hidden && r.center.y >= WRIST_Y - 0.02)
    .reduce((mx, r) => Math.max(mx, axisP95(r.m, posedPts(r.m))), 0);
  const out = shown.map((r) => {
    const pts = posedPts(r.m);
    let worst = 0;
    for (const p of pts) worst = Math.max(worst, distToAxis(p));
    return { name: r.name, layer: r.layer, color: r.color, p95: axisP95(r.m, pts), max: worst, foreign: r.foreign };
  }).sort((a, b) => b.p95 - a.p95);
  console.log(`\n${label}   forearm skin p95 = ${(skinP95 * 100).toFixed(1)} cm`);
  for (const r of out.slice(0, 10))
    console.log(`   p95 ${(r.p95 * 100).toFixed(1).padStart(5)}  max ${(r.max * 100).toFixed(1).padStart(5)} cm  [${r.layer.padEnd(10)} ${r.color}]${r.foreign ? ' [FOREIGN]' : ''} ${r.name}`);
}
