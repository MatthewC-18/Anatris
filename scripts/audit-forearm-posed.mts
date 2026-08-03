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
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
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
// ---------------------------------------------------------------------------
// 4b. TAPERED SLEEVE.
//
// A single radius cannot describe an arm: the forearm is a cone, ~6 cm across at
// the elbow and ~3 cm at the wrist. Worse, distance-to-axis is blind to the exact
// thing the user is looking at -- a bar lying ACROSS the limb never leaves the
// axis, it just pierces the skin on both sides, and a 10 cm bar centred on the
// bone reads 5 cm, comfortably inside a 6.5 cm limit.
//
// So sample the forearm SKIN into axial bins and keep the p95 radius of each:
// that is the real sleeve. Everything else is then measured as how far it sticks
// out THROUGH that sleeve, at its own height.
// ---------------------------------------------------------------------------
const elbowP = flexB.getWorldPosition(new THREE.Vector3());
const wristP = boneOf('hand_flex')!.getWorldPosition(new THREE.Vector3());
const fAxis = new THREE.Vector3().subVectors(wristP, elbowP);
const fLen2 = fAxis.lengthSq();
/** Axial station 0 (elbow) .. 1 (wrist), unclamped, and radius off that axis. */
const station = (p: THREE.Vector3) => {
  const rel = new THREE.Vector3().subVectors(p, elbowP);
  const t = rel.dot(fAxis) / fLen2;
  const radial = rel.clone().addScaledVector(fAxis, -t).length();
  return { t, r: radial };
};
// The cross-section is an ELLIPSE, not a circle: a single p95 radius per station
// is the width of the arm's WIDEST direction, so anything between the real skin
// and that circle passes while sitting visibly outside the limb (the stubs that
// survived a margin of 0.85). So bin by station AND by angle around the axis.
const BINS = 12;
const SECTORS = 16;
const axU = new THREE.Vector3(1, 0, 0).cross(fAxis).normalize();
const axV = new THREE.Vector3().crossVectors(fAxis, axU).normalize();
const cellOf = (p: THREE.Vector3) => {
  const rel = new THREE.Vector3().subVectors(p, elbowP);
  const t = rel.dot(fAxis) / fLen2;
  const radial = rel.clone().addScaledVector(fAxis, -t);
  const ang = Math.atan2(radial.dot(axV), radial.dot(axU));
  const sec = Math.min(SECTORS - 1, Math.floor(((ang + Math.PI) / (2 * Math.PI)) * SECTORS));
  return { t, r: radial.length(), sec };
};
const cells: number[][][] = Array.from({ length: BINS }, () =>
  Array.from({ length: SECTORS }, () => [] as number[]));
for (const r of rows) {
  if (r.foreign || r.layer !== 'skin' || r.hidden) continue;
  const pos = r.m.geometry.getAttribute('position');
  const v = new THREE.Vector3();
  for (const i of drawnVerts(r.m)) {
    v.fromBufferAttribute(pos, i); r.m.localToWorld(v);
    const c = cellOf(v);
    if (c.t < 0 || c.t > 1) continue;
    cells[Math.min(BINS - 1, Math.floor(c.t * BINS))][c.sec].push(c.r);
  }
}
const grid: number[][] = cells.map((row) => row.map((xs) => {
  if (xs.length < 4) return NaN;
  xs.sort((a, b) => a - b);
  return xs[Math.floor(xs.length * 0.95)];
}));
// A sector the skin patches never covered is filled by interpolating ANGULARLY
// between the nearest sectors that do have data, going round the ring. Borrowing
// the widest neighbour instead (the first attempt) turned every gap into the
// arm's broadest radius, which is exactly where the stubs were surviving: the
// wrist skin is patchy, and a 2 cm sector next to another 2 cm sector was being
// filled with 4 cm. Interpolation keeps a gap as narrow as its own neighbourhood.
for (let i = 0; i < BINS; i++) {
  const row = grid[i];
  const known = row.map((x, j) => (Number.isNaN(x) ? -1 : j)).filter((j) => j >= 0);
  if (known.length === 0) { row.fill(Infinity); continue; }
  for (let j = 0; j < SECTORS; j++) {
    if (!Number.isNaN(row[j])) continue;
    let back = 0; while (Number.isNaN(row[(j - back + SECTORS) % SECTORS])) back++;
    let fwd = 0; while (Number.isNaN(row[(j + fwd) % SECTORS])) fwd++;
    const a = row[(j - back + SECTORS) % SECTORS];
    const b = row[(j + fwd) % SECTORS];
    row[j] = a + (b - a) * (back / (back + fwd));
  }
}
const cellRadius = (t: number, sec: number) => {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = c * (BINS - 1);
  const i = Math.min(BINS - 2, Math.floor(x));
  return grid[i][sec] + (grid[i + 1][sec] - grid[i][sec]) * (x - i);
};
// The station's own radius, pooled over every direction. Deliberately NOT the
// max of the per-sector values: that is the widest direction's radius, which is
// wider than the p95 of the whole ring and made the angular pass looser than the
// circle it was meant to tighten.
const profile = cells.map((row) => {
  const xs = row.flat();
  if (xs.length === 0) return Infinity;
  xs.sort((a, b) => a - b);
  return xs[Math.floor(xs.length * 0.95)];
});
const sleeveAt = (t: number) => {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = c * (BINS - 1);
  const i = Math.min(BINS - 2, Math.floor(x));
  return profile[i] + (profile[i + 1] - profile[i]) * (x - i);
};
/**
 * The sleeve at a point: the station's own radius, tightened by that direction's
 * if the skin gave enough samples there. Min, not the cell alone -- borrowing a
 * neighbour's radius for a cell the skin never covered is how the angular pass
 * first came out LOOSER than the circle and let the bars back in.
 */
// The runtime uses the per-station circle plus the crosswise cull; the angular
// refinement is kept behind ANGULAR=on because it was the step that proved the
// leftover stubs were whole mangled meshes rather than a threshold being loose.
const ANGULAR = process.env.ANGULAR === 'on';
const sleeveAtCell = (t: number, sec: number) =>
  ANGULAR ? Math.min(sleeveAt(t), cellRadius(t, sec)) : sleeveAt(t);
// SHAPE CLASSIFIER. A forearm muscle runs ALONG the limb: it covers a long axial
// span and stays close to the axis. The export-mangled ones are the opposite --
// their vertices bunch into a couple of cm of the limb's length and fan out in
// radius, because the mesh is lying across the arm. Measured on the shipped rig
// before any trim, so the numbers describe the geometry as it comes.
{
  const rowsList: { n: string; l: string; span: number; rad: number; ratio: number }[] = [];
  for (const r of rows) {
    if (r.foreign || r.hidden || r.layer === 'skin' || r.layer === 'bone') continue;
    const pos = r.m.geometry.getAttribute('position');
    const v = new THREE.Vector3();
    const ts: number[] = [], rs: number[] = [];
    for (const i of drawnVerts(r.m)) {
      v.fromBufferAttribute(pos, i); r.m.localToWorld(v);
      const c = station(v); ts.push(c.t); rs.push(c.r);
    }
    if (ts.length < 8) continue;
    ts.sort((a, b) => a - b); rs.sort((a, b) => a - b);
    const q = (a: number[], f: number) => a[Math.floor(a.length * f)];
    const span = (q(ts, 0.95) - q(ts, 0.05)) * Math.sqrt(fLen2);
    const rad = q(rs, 0.95) - q(rs, 0.05);
    rowsList.push({ n: r.name, l: r.layer, span, rad, ratio: span / Math.max(rad, 1e-4) });
  }
  // CROSSWISE CULL: hide the meshes lying across the limb. Both conditions
  // matter -- small ring ligaments are also "short", but they do not fan out.
  const CROSSWISE_MAX_RATIO = 0.5;
  const CROSSWISE_MIN_RADIAL = 0.06;
  if (process.env.CROSSWISE !== 'off')
    for (const r of rowsList)
      if (r.ratio < CROSSWISE_MAX_RATIO && r.rad > CROSSWISE_MIN_RADIAL) {
        const row = rows.find((x) => x.name === r.n);
        if (row) row.hidden = 'crosswise';
      }
  rowsList.sort((a, b) => a.ratio - b.ratio);
  console.log(`
shape: axial span vs radial spread (a muscle runs along the limb)`);
  for (const r of rowsList.slice(0, 14))
    console.log(`   span ${(r.span * 100).toFixed(1).padStart(5)} cm  radial ${(r.rad * 100).toFixed(1).padStart(5)} cm  ratio ${r.ratio.toFixed(2).padStart(5)}  [${r.l}] ${r.n}`);
  console.log(`   ... healthiest: ratio ${rowsList[rowsList.length - 1].ratio.toFixed(2)} (${rowsList[rowsList.length - 1].n})`);
}

const SLEEVE = process.env.SLEEVE !== 'off';
const SLEEVE_MARGIN = Number(process.env.SLEEVE_MARGIN ?? 1.02);
/** Inside the tapered sleeve? Above the elbow nothing is judged by it. */
const SLEEVE_END = Number(process.env.SLEEVE_END ?? 1.05);
const insideSleeve = (p: THREE.Vector3) => {
  if (!SLEEVE) return true;
  const { t, r, sec } = cellOf(p);
  if (t < -0.05) return true; // humeral origin, handled by the elbow anchor
  if (t > SLEEVE_END) return false; // past the wrist: the hand is a skin cap
  return r <= sleeveAtCell(t, sec) * SLEEVE_MARGIN;
};
const sleeveExcess = (m: THREE.SkinnedMesh) => {
  const pos = m.geometry.getAttribute('position');
  const v = new THREE.Vector3();
  let worst = -1;
  for (const i of drawnVerts(m)) {
    v.fromBufferAttribute(pos, i); m.localToWorld(v);
    const { t, r, sec } = cellOf(v);
    if (t < -0.05) continue;
    worst = Math.max(worst, r - sleeveAtCell(t, sec) * SLEEVE_MARGIN);
  }
  return worst;
};
console.log(`
forearm sleeve profile, elbow -> wrist (p95 radius per bin, cm):`);
console.log(`   ${profile.map((x) => (x * 100).toFixed(1)).join('  ')}`);
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
  // No pre-check: RigModel trims every non-skin mesh in the limb, and a mesh can
  // be fine on both p95 measures while still running past the wrist.
  void axisP95; void sleeveExcess;
  // trimMeshToLimb
  const geom = r.m.geometry;
  const idx = geom.getIndex()!; const pos = geom.getAttribute('position');
  const inside = new Uint8Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    _p.fromBufferAttribute(pos, i); r.m.localToWorld(_p);
    inside[i] = distMetric(_p) <= LIMIT && insideSleeve(_p) ? 1 : 0;
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

{
  const out: { n: string; l: string; out: number; t: number; aspect: string }[] = [];
  for (const r of rows) {
    if (r.hidden || r.layer === 'skin' || r.foreign) continue;
    const pos = r.m.geometry.getAttribute('position');
    const ids = drawnVerts(r.m);
    const v = new THREE.Vector3();
    let worst = -1, worstT = 0;
    for (const i of ids) {
      v.fromBufferAttribute(pos, i); r.m.localToWorld(v);
      const { t, r: rad, sec } = cellOf(v);
      if (t < -0.05 || t > 1.05) continue;
      const excess = rad - sleeveAtCell(t, sec);
      if (excess > worst) { worst = excess; worstT = t; }
    }
    if (worst <= -1) continue;
    const g = r.m.geometry; g.computeBoundingBox();
    const d = g.boundingBox!.getSize(new THREE.Vector3());
    out.push({
      n: r.name, l: r.layer, out: worst, t: worstT,
      aspect: `${(d.x * 100).toFixed(0)}x${(d.y * 100).toFixed(0)}x${(d.z * 100).toFixed(0)}`,
    });
  }
  out.sort((a, b) => b.out - a.out);
  console.log(`
how far each mesh pierces the sleeve (cm out, at station t):`);
  for (const r of out.slice(0, 16))
    console.log(`   ${(r.out * 100).toFixed(1).padStart(5)} cm  t=${r.t.toFixed(2)}  [${r.l.padEnd(10)}] ${r.n}`);
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
{
  const gone = rows.filter((r) => r.hidden === 'outlier').map((r) => r.name);
  console.log(`
hidden entirely (nothing left inside the sleeve): ${gone.length}`);
  for (const n of gone) console.log(`   ${n}`);
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

// ---------------------------------------------------------------------------
// Optional offline RENDER. The lab's canvas will not initialise in the session's
// browser pane, so this is how a forearm change gets looked at instead of only
// measured: project every drawn triangle orthographically and write an SVG.
// SVG=out.svg npx tsx ... scripts/audit-forearm-posed.mts R
// ---------------------------------------------------------------------------
if (process.env.PNG) {
  const W = 620, H = 840, PAD = 20;
  interface Tri { pts: [number, number][]; z: number; rgb: [number, number, number]; op: number; owner: string }
  const tris: Tri[] = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const hex2rgb = (h: string): [number, number, number] =>
    h.startsWith('#')
      ? [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
      : [150, 150, 150];
  let offset = 0;
  for (const view of ['front', 'side'] as const) {
    // Extent of THIS view only, so the side view can be placed beside the front
    // one. Seeding it from the running bounds would start it at Infinity.
    let vMin = Infinity, vMax = -Infinity;
    for (const r of rows) {
      if (r.hidden || r.foreign) continue;
      const isSkin = r.layer === 'skin';
      if (isSkin && r.center.y < WRIST_Y - 0.02) continue;
      const g = r.m.geometry;
      const pos = g.getAttribute('position');
      const idx = g.getIndex();
      if (!idx) continue;
      const arr = idx.array as ArrayLike<number>;
      const v = new THREE.Vector3();
      const world: THREE.Vector3[] = [];
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i); r.m.localToWorld(v); world.push(v.clone());
      }
      const rgb = hex2rgb(r.color);
      for (let i = 0; i + 2 < arr.length; i += 3) {
        const a = world[arr[i]], b = world[arr[i + 1]], c = world[arr[i + 2]];
        if (Math.max(a.y, b.y, c.y) > ELBOW_Y + 0.03) continue;
        if (Math.min(a.y, b.y, c.y) < WRIST_Y - 0.12) continue;
        const pr = (p: THREE.Vector3): [number, number] =>
          view === 'front' ? [p.x + offset, p.y] : [p.z + offset, p.y];
        const pts: [number, number][] = [pr(a), pr(b), pr(c)];
        for (const q of pts) {
          if (q[0] < minX) minX = q[0]; if (q[0] > maxX) maxX = q[0];
          if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1];
          if (q[0] < vMin) vMin = q[0]; if (q[0] > vMax) vMax = q[0];
        }
        tris.push({
          pts,
          z: view === 'front' ? -(a.z + b.z + c.z) / 3 : (a.x + b.x + c.x) / 3,
          rgb: isSkin ? [140, 155, 175] : rgb,
          op: isSkin ? 0.12 : 1,
          owner: r.name,
        });
      }
    }
    offset += (vMax - vMin) * 1.2;
  }
  const sc = Math.min((W - 2 * PAD) / (maxX - minX), (H - 2 * PAD) / (maxY - minY));
  const px = (x: number) => PAD + (x - minX) * sc;
  const py = (y: number) => H - PAD - (y - minY) * sc;
  const owners: (string | null)[] = new Array(W * H).fill(null);
  const buf = new Uint8Array(W * H * 3);
  for (let i = 0; i < W * H; i++) { buf[i * 3] = 13; buf[i * 3 + 1] = 27; buf[i * 3 + 2] = 42; }
  tris.sort((a, b) => a.z - b.z);
  for (const t of tris) {
    const xs = t.pts.map((q) => px(q[0])), ys = t.pts.map((q) => py(q[1]));
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(W - 1, Math.ceil(Math.max(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)));
    const d = (xs[1] - xs[0]) * (ys[2] - ys[0]) - (xs[2] - xs[0]) * (ys[1] - ys[0]);
    if (Math.abs(d) < 1e-9) continue;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const w0 = ((xs[1] - x) * (ys[2] - y) - (xs[2] - x) * (ys[1] - y)) / d;
        const w1 = ((xs[2] - x) * (ys[0] - y) - (xs[0] - x) * (ys[2] - y)) / d;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const o = (y * W + x) * 3;
        for (let k = 0; k < 3; k++) buf[o + k] = Math.round(buf[o + k] * (1 - t.op) + t.rgb[k] * t.op);
        if (t.op > 0.5) owners[y * W + x] = t.owner;
      }
  }
  // Minimal PNG writer (no dependency): filter-0 scanlines through zlib.
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    Buffer.from(buf.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(b: Buffer) {
    let c = 0xffffffff;
    for (const x of b) c = table[(c ^ x) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  if (process.env.PICK) {
    console.log('pixel -> mesh:');
    for (const pair of process.env.PICK.split(';')) {
      const [x, y] = pair.split(',').map(Number);
      const found = new Set<string>();
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const o = owners[(y + dy) * W + (x + dx)];
          if (o) found.add(o);
        }
      console.log(`   (${x},${y}) -> ${[...found].join(', ') || 'background'}`);
    }
  }
  writeFileSync(process.env.PNG, png);
  console.log(`
wrote ${process.env.PNG} (${tris.length} triangles, ${SLEEVE ? 'tapered sleeve' : 'NO sleeve'})`);
}

// Which meshes still reach OUTSIDE the skin, measured against the skin point
// cloud itself rather than any model of it. Deep muscle sits ~2 cm inside; a
// stub poking through reads much larger, and this names it.
{
  const CELL = 0.02;
  const hash = new Map<string, THREE.Vector3[]>();
  for (const r of rows) {
    if (r.foreign || r.layer !== 'skin' || r.hidden) continue;
    const pos = r.m.geometry.getAttribute('position');
    const v = new THREE.Vector3();
    for (const i of drawnVerts(r.m)) {
      v.fromBufferAttribute(pos, i); r.m.localToWorld(v);
      const k = `${Math.floor(v.x / CELL)}|${Math.floor(v.y / CELL)}|${Math.floor(v.z / CELL)}`;
      hash.set(k, [...(hash.get(k) ?? []), v.clone()]);
    }
  }
  const nearest = (p: THREE.Vector3) => {
    for (let ring = 1; ring <= 6; ring++) {
      let best = Infinity;
      const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL), cz = Math.floor(p.z / CELL);
      for (let i = -ring; i <= ring; i++)
        for (let j = -ring; j <= ring; j++)
          for (let k = -ring; k <= ring; k++)
            for (const q of hash.get(`${cx + i}|${cy + j}|${cz + k}`) ?? [])
              best = Math.min(best, p.distanceTo(q));
      if (best < Infinity) return best;
    }
    return Infinity;
  };
  const out: { n: string; d: number; t: number; r: number }[] = [];
  for (const r of rows) {
    if (r.hidden || r.foreign || r.layer === 'skin') continue;
    const pos = r.m.geometry.getAttribute('position');
    const v = new THREE.Vector3();
    let worst = 0, wt = 0, wr = 0;
    for (const i of drawnVerts(r.m)) {
      v.fromBufferAttribute(pos, i); r.m.localToWorld(v);
      const c = cellOf(v);
      if (c.t < 0.3 || c.t > 1.1) continue;
      const d = nearest(v);
      if (d < Infinity && d > worst) { worst = d; wt = c.t; wr = c.r; }
    }
    if (worst > 0) out.push({ n: r.name, d: worst, t: wt, r: wr });
  }
  out.sort((a, b) => b.d - a.d);
  console.log(`
furthest from the skin cloud (distal half):`);
  for (const r of out.slice(0, 10))
    console.log(`   ${(r.d * 100).toFixed(1).padStart(5)} cm from skin   t=${r.t.toFixed(2)} r=${(r.r * 100).toFixed(1)}  ${r.n}`);
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
