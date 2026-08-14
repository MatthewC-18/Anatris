// Does any MUSCLE poke out through the SKIN during an elevation arc?
//
// The physio's note 13 ("flexión mal el mov") came down, after everything else
// was measured and ruled out, to one thing left standing: something sticks out
// in FRONT of the anterior shoulder between roughly 45 and 135 deg. The skin is
// not torn there -- measure-shoulder-skin.mts says the seams hold -- so what is
// being seen is a muscle standing proud of the envelope that should cover it.
//
// sweep-shoulder-arc.mts has an EXPOSED column, but it compares BONE against
// SOFT TISSUE by radius in angular sectors, which cannot answer this: a sector
// max is a silhouette, and a muscle can push through the skin well inside the
// silhouette without ever becoming the outermost thing in its sector.
//
// So this measures the surface directly. For every muscle vertex lying just under
// the skin it takes the K nearest skin vertices, fits a local patch through them,
// and projects the offset onto the patch's OUTWARD normal. Positive = the muscle
// vertex is on the outside of the skin.
//
// Three things make the number honest:
//   - normals are recomputed from the POSED triangles (see render-pose.mts for
//     why the rest normals are useless once a limb has rotated);
//   - "outward" is decided PER SKIN MESH by voting each sampled vertex against the
//     nearest BONE: bone is always deep, so the direction away from it is out.
//     Winding is not consistent across a model assembled from hundreds of
//     separately exported surfaces, and a first version of this script that voted
//     against the body's own axis got the neck patches backwards and duly reported
//     the longus colli and the pterygoid -- muscles that sit against the cervical
//     spine and the skull base -- as sticking out of the skin;
//   - every figure is reported as GROWTH over the rest pose. The Z-Anatomy source
//     is a stack of independently modelled surfaces, not a watertight nesting, so
//     a little muscle sits outside the skin even at 0 deg. What matters is what the
//     MOVEMENT opens up.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/measure-muscle-spill.mts \
//        [movementId] [left] [angles...]
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
import { layerForMaterial } from '../src/lib/materialColors.ts';
import { rigGlbPath } from './lib/rigPath.mts';
import { createRigPoser, type Side } from './lib/rigPose.mts';

const args = process.argv.slice(2);
const MOVEMENT = args.find((a) => /[a-z]-[a-z]/.test(a)) ?? 'glenohumeral-flexion';
const SIDE: Side = args.includes('left') ? 'L' : 'R';
const ANGLES = (() => {
  const n = args.map(Number).filter((x) => !Number.isNaN(x) && x >= 0);
  return n.length ? n : [0, 45, 60, 90, 120, 135, 160, 180];
})();

/** Shoulder band. Below 1.1 is chest/abdomen, above 1.55 is neck. */
const Y_LO = 1.05;
const Y_HI = 1.60;
/** How far a muscle vertex may be from the skin and still be judged against it. */
const NEAR = 0.03;
/** Neighbours averaged, so one bad normal cannot invent a spill. */
const K = 8;
/** Below this a "spill" is modelling noise in the source surfaces. */
const REPORT = 0.002;

const buf = readFileSync(rigGlbPath());
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const ld = new GLTFLoader();
ld.setMeshoptDecoder(MeshoptDecoder);
const gl = await new Promise<any>((r, j) => ld.parse(ab, '', r, j));
const scene = gl.scene as THREE.Group;
scene.updateMatrixWorld(true);

const poser = createRigPoser(scene, MOVEMENT, SIDE, true);
const sideSign = SIDE === 'R' ? 1 : -1;

interface M { mesh: THREE.Mesh; name: string; layer: string }
const all: M[] = [];
scene.traverse((o) => {
  const m = o as THREE.Mesh;
  if (!m.isMesh) return;
  const first = Array.isArray(m.material) ? m.material[0] : m.material;
  const layer = layerForMaterial((first as any)?.name ?? '');
  if (!layer) return;
  const g = m.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
  // Driven side (or midline) and the shoulder band only. A generous margin,
  // because a bounding-sphere centre is not where the vertices are.
  if (c.x * sideSign < -0.08) return;
  if (c.y < Y_LO - 0.25 || c.y > Y_HI + 0.25) return;
  all.push({ mesh: m, name: m.name, layer });
});
const skinM = all.filter((m) => m.layer === 'skin');
const softM = all.filter((m) => m.layer === 'muscle' || m.layer === 'connective');
const boneM = all.filter((m) => m.layer === 'bone');
console.log(
  `movement: ${MOVEMENT}  side ${SIDE}   ${skinM.length} skin meshes, ${softM.length} muscle/connective`,
);

/** Posed world positions + normals recomputed from the posed triangles. */
function posed(m: M, withNormals = true): { p: THREE.Vector3[]; n: THREE.Vector3[] } {
  const g = m.mesh.geometry;
  const pos = g.getAttribute('position');
  const sk = m.mesh as THREE.SkinnedMesh;
  const skinned = !!sk.isSkinnedMesh;
  if (skinned) sk.skeleton.update();
  const p: THREE.Vector3[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (skinned) sk.applyBoneTransform(i, v);
    m.mesh.localToWorld(v);
    p.push(v.clone());
  }
  if (!withNormals) return { p, n: [] };
  const n: THREE.Vector3[] = p.map(() => new THREE.Vector3());
  const idx = g.getIndex();
  if (idx) {
    const arr = idx.array as ArrayLike<number>;
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), fn = new THREE.Vector3();
    for (let i = 0; i + 2 < arr.length; i += 3) {
      const a = p[arr[i]], b = p[arr[i + 1]], c = p[arr[i + 2]];
      if (!a || !b || !c) continue;
      e1.subVectors(b, a);
      e2.subVectors(c, a);
      fn.crossVectors(e1, e2); // area-weighted
      n[arr[i]].add(fn); n[arr[i + 1]].add(fn); n[arr[i + 2]].add(fn);
    }
  }
  for (const q of n) {
    if (q.lengthSq() > 1e-20) q.normalize();
    else q.set(0, 0, 1);
  }
  return { p, n };
}

const CELL = 0.02;
const cellKey = (x: number, y: number, z: number) => `${x}|${y}|${z}`;
const keyOf = (v: THREE.Vector3) =>
  cellKey(Math.floor(v.x / CELL), Math.floor(v.y / CELL), Math.floor(v.z / CELL));

/** Hash a point cloud for nearest-point queries. */
function hashOf(pts: THREE.Vector3[]): Map<string, THREE.Vector3[]> {
  const h = new Map<string, THREE.Vector3[]>();
  for (const q of pts) {
    const k = keyOf(q);
    const b = h.get(k);
    if (b) b.push(q);
    else h.set(k, [q]);
  }
  return h;
}

/** Distance to the nearest point in a hash, searching outward shell by shell. */
function nearestIn(h: Map<string, THREE.Vector3[]>, p: THREE.Vector3, maxR: number): number {
  const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL), cz = Math.floor(p.z / CELL);
  let best = Infinity;
  const R = Math.ceil(maxR / CELL);
  for (let r = 0; r <= R; r++) {
    if (best <= (r - 1) * CELL) break;
    for (let i = -r; i <= r; i++)
      for (let j = -r; j <= r; j++)
        for (let k = -r; k <= r; k++) {
          if (r > 0 && Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) !== r) continue;
          for (const q of h.get(cellKey(cx + i, cy + j, cz + k)) ?? [])
            best = Math.min(best, p.distanceTo(q));
        }
  }
  return best;
}

interface Skin { p: THREE.Vector3; n: THREE.Vector3 }

/** Worst spill per muscle, at the current pose. */
function spillNow(): Map<string, { max: number; count: number; at: THREE.Vector3 }> {
  // Bone cloud, used only to decide which way is OUT. Bone is always the deep
  // structure, so the direction away from the nearest bone is the direction away
  // from the body -- and unlike a body-axis vote it stays right on the neck, the
  // axilla and anywhere else the trunk is not a cylinder.
  const bonePts: THREE.Vector3[] = [];
  for (const m of boneM)
    for (const q of posed(m, false).p)
      if (q.y >= Y_LO - 0.1 && q.y <= Y_HI + 0.1) bonePts.push(q);
  const boneHash = hashOf(bonePts);
  const nearestBone = (p: THREE.Vector3): THREE.Vector3 | null => {
    const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL), cz = Math.floor(p.z / CELL);
    let best: THREE.Vector3 | null = null, bestD = Infinity;
    for (let r = 0; r <= 12; r++) {
      if (best && bestD <= (r - 1) * CELL) break;
      for (let i = -r; i <= r; i++)
        for (let j = -r; j <= r; j++)
          for (let k = -r; k <= r; k++) {
            if (r > 0 && Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) !== r) continue;
            for (const q of boneHash.get(cellKey(cx + i, cy + j, cz + k)) ?? []) {
              const d = p.distanceToSquared(q);
              if (d < bestD) { bestD = d; best = q; }
            }
          }
    }
    return best;
  };

  // --- skin cloud, restricted to the band, normals turned outward ---
  const cloud = new Map<string, Skin[]>();
  const d0 = new THREE.Vector3();
  for (const m of skinM) {
    const d = posed(m);
    // Winding vote for the WHOLE mesh: sampled vertices against their nearest bone.
    let vote = 0;
    const step = Math.max(1, Math.floor(d.p.length / 60));
    for (let i = 0; i < d.p.length; i += step) {
      const b = nearestBone(d.p[i]);
      if (!b) continue;
      d0.subVectors(d.p[i], b);
      if (d0.lengthSq() < 1e-8) continue;
      vote += d0.normalize().dot(d.n[i]) > 0 ? 1 : -1;
    }
    if (vote < 0) for (const q of d.n) q.negate();
    for (let i = 0; i < d.p.length; i++) {
      const q = d.p[i];
      if (q.y < Y_LO || q.y > Y_HI) continue;
      const k = keyOf(q);
      const list = cloud.get(k);
      if (list) list.push({ p: q, n: d.n[i] });
      else cloud.set(k, [{ p: q, n: d.n[i] }]);
    }
  }

  const out = new Map<string, { max: number; count: number; at: THREE.Vector3 }>();
  const off = new THREE.Vector3();
  for (const m of softM) {
    const { p } = posed(m, false);
    let max = -Infinity, count = 0, at = new THREE.Vector3();
    for (const v of p) {
      if (v.y < Y_LO || v.y > Y_HI) continue;
      if (v.x * sideSign < -0.02) continue;
      const near: { d: number; s: Skin }[] = [];
      const cx = Math.floor(v.x / CELL), cy = Math.floor(v.y / CELL), cz = Math.floor(v.z / CELL);
      const R = Math.ceil(NEAR / CELL);
      for (let i = -R; i <= R; i++)
        for (let j = -R; j <= R; j++)
          for (let k = -R; k <= R; k++)
            for (const s of cloud.get(cellKey(cx + i, cy + j, cz + k)) ?? []) {
              const d = v.distanceTo(s.p);
              if (d <= NEAR) near.push({ d, s });
            }
      // Fewer than K neighbours means this vertex is not under a skin patch at
      // all -- deep muscle, or skin that simply is not modelled there.
      if (near.length < K) continue;
      near.sort((a, b) => a.d - b.d);
      const use = near.slice(0, K);
      // Local patch: centroid + averaged normal. Averaging before projecting (as
      // opposed to projecting on each neighbour and taking a median) smooths the
      // per-vertex normal noise of a decimated surface without letting one
      // outlier neighbour decide the sign.
      const c = new THREE.Vector3();
      const n = new THREE.Vector3();
      for (const { s } of use) { c.add(s.p); n.add(s.n); }
      c.multiplyScalar(1 / use.length);
      if (n.lengthSq() < 1e-12) continue;
      n.normalize();
      const signed = off.subVectors(v, c).dot(n);
      if (signed > max) { max = signed; at = v.clone(); }
      if (signed > REPORT) count++;
    }
    if (max > -Infinity) out.set(m.name, { max, count, at });
  }
  return out;
}

poser.pose(0);
const rest = spillNow();

console.log('\nspill = muscle vertex OUTSIDE the skin, cm. "growth" is over the rest pose.');
console.log('a positive growth is the movement pushing a muscle through the envelope.\n');
console.log(' angle   worst growth   muscle                              verts out   where');
for (const deg of ANGLES) {
  poser.pose(deg);
  const now = spillNow();
  let best = 0, bestName = '', bestCount = 0, bestAt = new THREE.Vector3();
  for (const [name, cur] of now) {
    const r = rest.get(name);
    if (!r) continue;
    const growth = cur.max - r.max;
    if (growth > best) { best = growth; bestName = name; bestCount = cur.count - r.count; bestAt = cur.at; }
  }
  const where = bestName
    ? `x${bestAt.x.toFixed(2)} y${bestAt.y.toFixed(2)} z${bestAt.z.toFixed(2)}`
    : '';
  console.log(
    `${String(deg).padStart(5)}   ${(best * 100).toFixed(2).padStart(9)} cm   ` +
      `${bestName.slice(0, 34).padEnd(34)}  ${String(bestCount).padStart(9)}   ${where}`,
  );
}

// Detail at the middle of the reported window, where the physio saw it.
const DETAIL = ANGLES.includes(90) ? 90 : ANGLES[Math.floor(ANGLES.length / 2)];
poser.pose(DETAIL);
const now = spillNow();
const rows = [...now.entries()]
  .map(([name, cur]) => ({ name, growth: cur.max - (rest.get(name)?.max ?? cur.max), cur }))
  .filter((r) => r.growth > REPORT)
  .sort((a, b) => b.growth - a.growth)
  .slice(0, 12);
console.log(`\n--- every muscle standing proud at ${DETAIL} deg ---`);
console.log('  growth    absolute   verts   muscle');
for (const r of rows)
  console.log(
    `  ${(r.growth * 100).toFixed(2).padStart(6)}cm  ${(r.cur.max * 100).toFixed(2).padStart(7)}cm  ` +
      `${String(r.cur.count).padStart(5)}   ${r.name}`,
  );
if (!rows.length) console.log('  (nothing above the noise floor)');
