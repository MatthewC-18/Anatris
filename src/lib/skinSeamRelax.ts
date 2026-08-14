// src/lib/skinSeamRelax.ts
//
// THE SKIN IS A MOSAIC, AND EVERY TILE WAS FOLLOWING A DIFFERENT BONE.
//
// Z-Anatomy ships the body's skin as ~250 named regions, each a separate mesh,
// each skinned to ONE bone by the "skeleton completion" pass:
//
//   Deltoid_region_1           scapula 100%
//   Lateral_region_of_thorax_1 vert_T9 100%
//   Posterior_region_of_neck_1 vert_C1 100%
//   Posterior_axillary_line    vert_T9 100%
//
// The tiles ABUT: measured on the shipped GLB, of 13 948 boundary vertices over
// the whole body only 76 have no neighbouring patch, so the envelope really is
// closed at rest. But two tiles that share a vertex and follow different bones
// pull that shared vertex two ways as soon as anything moves, and the envelope
// splits along the tile borders.
//
// That is one defect wearing two faces, both reported by the physiotherapist:
//
//   - the DELTOPECTORAL SEAM. `Deltoid_region_3` (scapula 60% / humerus 40%) and
//     `Deltopectoral_triangle_1` share a vertex at x0.160 y1.357; at 180 deg of
//     flexion the two copies of that vertex end up 9.69 cm apart. An earlier fix
//     (shoulderSkinBridge) graded the strip and took this from 14.84 to 9.69, but
//     it could not close it: the SAME vertex is also shared with
//     `Lateral_region_of_thorax_1`, which is 100% on a vertebra, so a rule that
//     blends "towards the nearest shoulder neighbour" is being asked to be on the
//     thorax and on the arm at once, and lands halfway (vert_T3 65% / scapula 21%
//     / humerus 14%) -- tearing from both.
//   - the AXILLA. The armpit's skin is `Lateral_region_of_thorax` and
//     `Posterior_axillary_line`, both bolted to vert_T9, over muscle that rides
//     the arm (humerus 62% / scapula 38%). From ~45 deg the arm leaves the trunk,
//     the skin does not follow, and the axilla shows its walls -- latissimus,
//     serratus, intercostals.
//
// No amount of per-tile cleverness fixes this, because the conflict is BETWEEN
// tiles. So this pass stops treating them as separate surfaces:
//
//   1. WELD. Vertices that coincide at rest become one node with one weight
//      vector, the mean of what its members had. Two copies of a vertex that
//      carry identical weights land in identical places under any pose, so a
//      welded seam CANNOT open -- not "opens less", cannot.
//   2. RELAX. A weld whose members disagreed leaves a crease: the seam holds but
//      the skin kinks along it. So the weights are Laplacian-smoothed over the
//      mesh graph for a few rings around each disagreeing weld, which spreads the
//      compromise over a hand's width of skin instead of one edge.
//
// Everything away from a disagreeing seam is left exactly as it is, so this
// cannot move skin that was already right.
//
// Lives in src/lib rather than inside RigModel so the component and the offline
// measurement harness share ONE implementation and cannot drift apart.

import * as THREE from 'three';
import { layerForMaterial, materialIsSkin } from './materialColors';

/** Strip the `_12` disambiguator three.js appends to duplicate node names. */
const baseName = (n: string): string => n.replace(/_\d+$/, '');

/** Height band this pass touches: shoulder girdle, axilla and upper arm. */
const Y_LO = 0.95;
const Y_HI = 1.70;
/**
 * Nodes closer to the midline than this are left alone. The two sides share bone
 * NAMES, so a weld spanning the midline could not say which scapula it meant.
 */
const MIDLINE_M = 0.02;
/** Vertices this close at rest are the same point of skin. */
const WELD_M = 0.0025;
/** Weight difference (L1/2, i.e. 0..1) above which a weld counts as disagreeing. */
const DISAGREE = 0.10;
/**
 * How far under a weld we look for the tissue it should follow. Skin sits on
 * fascia a few millimetres thick; 3 cm is generous enough to survive the source
 * model's gaps without reaching a muscle that belongs to somewhere else.
 */
const UNDER_M = 0.03;
/** Graph rings around a disagreeing weld that get smoothed. */
const RELAX_RINGS = 6;
/** Smoothing iterations, and how much of each step comes from the neighbours. */
const RELAX_ITERS = 12;
const RELAX_LAMBDA = 0.5;

export interface SeamRelaxResult {
  /** Skin meshes whose weights were rewritten. */
  meshes: number;
  /** Welds where the members disagreed, i.e. seams that would have opened. */
  disagreeing: number;
  /** Total welds found (including the ones that already agreed). */
  welds: number;
  /** The worst disagreement seen, 0..1, for reporting. */
  worst: number;
  /** Disagreeing welds that took their weights from the tissue underneath. */
  fromTissue: number;
  skipped: { mesh: string; reason: string }[];
}

type Weights = Map<string, number>;

/** Spatial hash over weighted rest-pose points, for "what is underneath" queries. */
class PointGrid {
  private cells = new Map<string, { p: THREE.Vector3; w: Weights }[]>();
  private static CELL = 0.02;

  add(pt: { p: THREE.Vector3; w: Weights }): void {
    const C = PointGrid.CELL;
    const k =
      `${Math.floor(pt.p.x / C)}|${Math.floor(pt.p.y / C)}|${Math.floor(pt.p.z / C)}`;
    const b = this.cells.get(k);
    if (b) b.push(pt);
    else this.cells.set(k, [pt]);
  }

  /** Weights of the nearest point within `maxR`, or null. */
  nearest(p: THREE.Vector3, maxR: number): Weights | null {
    const C = PointGrid.CELL;
    const cx = Math.floor(p.x / C), cy = Math.floor(p.y / C), cz = Math.floor(p.z / C);
    const R = Math.ceil(maxR / C);
    let best: Weights | null = null;
    let bestSq = maxR * maxR;
    for (let i = -R; i <= R; i++)
      for (let j = -R; j <= R; j++)
        for (let k = -R; k <= R; k++)
          for (const q of this.cells.get(`${cx + i}|${cy + j}|${cz + k}`) ?? []) {
            const d = p.distanceToSquared(q.p);
            if (d < bestSq) { bestSq = d; best = q.w; }
          }
    return best;
  }
}

/** Normalise in place; returns false if there was nothing to normalise. */
function normalise(w: Weights): boolean {
  let total = 0;
  for (const v of w.values()) total += v;
  if (total <= 1e-6) return false;
  for (const [k, v] of w) w.set(k, v / total);
  return true;
}

/** How far apart two weight vectors are, 0 (identical) .. 1 (disjoint). */
function distance(a: Weights, b: Weights): number {
  let d = 0;
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys) d += Math.abs((a.get(k) ?? 0) - (b.get(k) ?? 0));
  return d / 2;
}

export function relaxSkinSeams(scene: THREE.Object3D): SeamRelaxResult {
  const result: SeamRelaxResult = {
    meshes: 0,
    disagreeing: 0,
    welds: 0,
    worst: 0,
    fromTissue: 0,
    skipped: [],
  };

  scene.updateMatrixWorld(true);

  // Every bone a skin vertex might end up following, per side. Spine bones are
  // unique; girdle and arm bones live in one armature per side.
  const spineBones = new Map<string, THREE.Object3D>();
  const spineRoot = scene.getObjectByName('Spine_Armature');
  spineRoot?.traverse((o) => {
    const n = baseName(o.name);
    if (!spineBones.has(n)) spineBones.set(n, o);
  });
  const limbBones = new Map<'R' | 'L', Map<string, THREE.Object3D>>();
  for (const side of ['R', 'L'] as const) {
    const root = scene.getObjectByName(`Shoulder_Armature_${side}`);
    if (!root) continue;
    const m = new Map<string, THREE.Object3D>();
    root.traverse((o) => {
      const n = baseName(o.name);
      if (!m.has(n)) m.set(n, o);
    });
    limbBones.set(side, m);
  }

  interface Mesh {
    mesh: THREE.SkinnedMesh;
    rest: THREE.Vector3[];
    /** Node id per vertex, or -1 when the vertex is out of this pass's scope. */
    node: number[];
  }
  const meshes: Mesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh || !m.isSkinnedMesh || !m.skeleton) return;
    const geom = m.geometry;
    if (!geom?.getAttribute('position') || !geom.getAttribute('skinIndex')) return;
    const first = Array.isArray(m.material) ? m.material[0] : m.material;
    if (!materialIsSkin((first as THREE.Material | undefined)?.name ?? '')) return;
    if (!geom.boundingSphere) geom.computeBoundingSphere();
    const c = geom.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
    if (c.y < Y_LO - 0.2 || c.y > Y_HI + 0.2) return;
    const pos = geom.getAttribute('position');
    const rest: THREE.Vector3[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      m.localToWorld(v);
      rest.push(v.clone());
    }
    meshes.push({ mesh: m, rest, node: new Array(pos.count).fill(-1) });
  });
  if (!meshes.length) return result;

  // --- 1. WELD -------------------------------------------------------------
  // Quantised hash plus an exact distance check, so two vertices land in one node
  // only when they really are the same point of skin.
  const CELL = WELD_M * 2;
  const cells = new Map<string, { node: number; p: THREE.Vector3 }[]>();
  const nodePos: THREE.Vector3[] = [];
  const nodeMembers: { mi: number; vi: number }[][] = [];
  for (let mi = 0; mi < meshes.length; mi++) {
    const M = meshes[mi];
    for (let vi = 0; vi < M.rest.length; vi++) {
      const p = M.rest[vi];
      if (p.y < Y_LO || p.y > Y_HI || Math.abs(p.x) < MIDLINE_M) continue;
      const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL), cz = Math.floor(p.z / CELL);
      let found = -1;
      for (let i = -1; i <= 1 && found < 0; i++)
        for (let j = -1; j <= 1 && found < 0; j++)
          for (let k = -1; k <= 1 && found < 0; k++)
            for (const e of cells.get(`${cx + i}|${cy + j}|${cz + k}`) ?? [])
              if (e.p.distanceTo(p) <= WELD_M) { found = e.node; break; }
      if (found < 0) {
        found = nodePos.length;
        nodePos.push(p.clone());
        nodeMembers.push([]);
        const key = `${cx}|${cy}|${cz}`;
        const bucket = cells.get(key);
        if (bucket) bucket.push({ node: found, p: p.clone() });
        else cells.set(key, [{ node: found, p: p.clone() }]);
      }
      M.node[vi] = found;
      nodeMembers[found].push({ mi, vi });
    }
  }

  /** The bone weights of one vertex, by bone BASE name. */
  const weightsOf = (M: Mesh, vi: number): Weights => {
    const si = M.mesh.geometry.getAttribute('skinIndex');
    const sw = M.mesh.geometry.getAttribute('skinWeight');
    const out: Weights = new Map();
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(vi, k);
      if (w <= 0) continue;
      const n = baseName(M.mesh.skeleton.bones[si.getComponent(vi, k)]?.name ?? '');
      if (!n) continue;
      out.set(n, (out.get(n) ?? 0) + w);
    }
    normalise(out);
    return out;
  };

  // WHAT A DISAGREEING WELD SHOULD SETTLE ON.
  //
  // The obvious answer is the mean of its members, and the first version used it.
  // It holds the seam -- any single value does -- but it is arbitrary about WHERE
  // the skin ends up, and being arbitrary has a cost: at the anterior axillary
  // fold the mean handed chest skin a ~50% pull toward the humerus, the pectoralis
  // major underneath stayed on the ribs, and the muscle came out through the skin
  // (2.18 cm at 90 deg of flexion, where it had been ~1.0).
  //
  // The non-arbitrary answer is the one the body uses: SKIN FOLLOWS THE TISSUE IT
  // LIES ON. So a disagreeing weld takes the bone mix of the nearest muscle or
  // fascia beneath it, and the mean is only the fallback for the places where
  // there is no soft tissue within reach (over the clavicle, say). Coincident
  // vertices are one node and so share one nearest neighbour, which means the
  // seam guarantee is untouched -- the two copies still get identical weights.
  const softGrid = new PointGrid();
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh || !m.isSkinnedMesh || !m.skeleton) return;
    const first = Array.isArray(m.material) ? m.material[0] : m.material;
    const mat = (first as THREE.Material | undefined)?.name ?? '';
    if (materialIsSkin(mat)) return;
    const layer = layerForMaterial(mat);
    if (layer !== 'muscle' && layer !== 'connective') return;
    const geom = m.geometry;
    if (!geom.boundingSphere) geom.computeBoundingSphere();
    const c = geom.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
    if (c.y < Y_LO - 0.25 || c.y > Y_HI + 0.25) return;
    const pos = geom.getAttribute('position');
    const si = geom.getAttribute('skinIndex');
    const sw = geom.getAttribute('skinWeight');
    if (!pos || !si || !sw) return;
    const v = new THREE.Vector3();
    // Every fourth vertex: this only has to say WHICH muscle is underneath, and a
    // muscle is thousands of vertices of the same answer.
    for (let i = 0; i < pos.count; i += 4) {
      v.fromBufferAttribute(pos, i);
      m.localToWorld(v);
      if (v.y < Y_LO || v.y > Y_HI || Math.abs(v.x) < MIDLINE_M) continue;
      const w: Weights = new Map();
      for (let k = 0; k < 4; k++) {
        const x = sw.getComponent(i, k);
        if (x <= 0) continue;
        const n = baseName(m.skeleton.bones[si.getComponent(i, k)]?.name ?? '');
        if (n) w.set(n, (w.get(n) ?? 0) + x);
      }
      if (normalise(w)) softGrid.add({ p: v.clone(), w });
    }
  });

  const nodeW: Weights[] = [];
  const seedRelax: number[] = [];
  for (let n = 0; n < nodePos.length; n++) {
    const members = nodeMembers[n];
    const each = members.map(({ mi, vi }) => weightsOf(meshes[mi], vi));
    const mean: Weights = new Map();
    for (const w of each) for (const [k, v] of w) mean.set(k, (mean.get(k) ?? 0) + v);
    for (const [k, v] of mean) mean.set(k, v / each.length);
    normalise(mean);
    nodeW.push(mean);
    if (members.length > 1) {
      result.welds++;
      let worst = 0;
      for (let i = 0; i < each.length; i++)
        for (let j = i + 1; j < each.length; j++) worst = Math.max(worst, distance(each[i], each[j]));
      if (worst > DISAGREE) {
        result.disagreeing++;
        seedRelax.push(n);
        const under = softGrid.nearest(nodePos[n], UNDER_M);
        if (under) {
          nodeW[n] = new Map(under);
          result.fromTissue++;
        }
      }
      if (worst > result.worst) result.worst = worst;
    }
  }

  // --- 2. RELAX ------------------------------------------------------------
  // Adjacency from the meshes' own triangles, expressed in node ids so it spans
  // patch borders.
  const adj: Set<number>[] = nodePos.map(() => new Set<number>());
  for (const M of meshes) {
    const idx = M.mesh.geometry.getIndex();
    if (!idx) continue;
    const arr = idx.array as ArrayLike<number>;
    for (let i = 0; i + 2 < arr.length; i += 3) {
      const t = [M.node[arr[i]], M.node[arr[i + 1]], M.node[arr[i + 2]]];
      for (let a = 0; a < 3; a++)
        for (let b = 0; b < 3; b++) {
          if (a === b || t[a] < 0 || t[b] < 0) continue;
          adj[t[a]].add(t[b]);
        }
    }
  }

  // Which nodes may move: the disagreeing welds and everything within a few rings
  // of them. Skin far from a torn seam keeps the weights it shipped with.
  const movable = new Set<number>(seedRelax);
  let frontier = new Set<number>(seedRelax);
  for (let r = 0; r < RELAX_RINGS; r++) {
    const next = new Set<number>();
    for (const n of frontier)
      for (const m of adj[n]) if (!movable.has(m)) { movable.add(m); next.add(m); }
    frontier = next;
    if (!next.size) break;
  }

  for (let it = 0; it < RELAX_ITERS; it++) {
    const updated = new Map<number, Weights>();
    for (const n of movable) {
      const ns = adj[n];
      if (!ns.size) continue;
      const avg: Weights = new Map();
      for (const m of ns) for (const [k, v] of nodeW[m]) avg.set(k, (avg.get(k) ?? 0) + v);
      for (const [k, v] of avg) avg.set(k, v / ns.size);
      const blended: Weights = new Map();
      const keys = new Set([...nodeW[n].keys(), ...avg.keys()]);
      for (const k of keys)
        blended.set(
          k,
          (1 - RELAX_LAMBDA) * (nodeW[n].get(k) ?? 0) + RELAX_LAMBDA * (avg.get(k) ?? 0),
        );
      if (normalise(blended)) updated.set(n, blended);
    }
    for (const [n, w] of updated) nodeW[n] = w;
  }

  // --- 3. WRITE BACK -------------------------------------------------------
  for (const M of meshes) {
    const geom = M.mesh.geometry;
    const si = geom.getAttribute('skinIndex');
    const sw = geom.getAttribute('skinWeight');
    const skeleton = M.mesh.skeleton;
    if (!geom.boundingSphere) geom.computeBoundingSphere();
    const centre = geom.boundingSphere!.center.clone().applyMatrix4(M.mesh.matrixWorld);
    const side: 'R' | 'L' = centre.x > 0 ? 'R' : 'L';
    const limb = limbBones.get(side);

    /** Index of a bone inside THIS mesh's skeleton, splicing it in on demand. */
    const indexOf = (name: string): number => {
      // Limb bones first for anything that is not a vertebra: the two sides share
      // bone names, and only the limb map is side-resolved.
      const bone = name.startsWith('vert_')
        ? spineBones.get(name)
        : (limb?.get(name) ?? spineBones.get(name));
      if (!bone) return -1;
      let idx = skeleton.bones.indexOf(bone as THREE.Bone);
      if (idx < 0) {
        // Indices are APPENDED, so any skinIndex already stored stays valid, and
        // the inverse is taken from the bone's CURRENT world matrix so that
        // bone * boneInverse is the identity at bind time and nothing jumps.
        skeleton.bones.push(bone as THREE.Bone);
        skeleton.boneInverses.push(new THREE.Matrix4().copy(bone.matrixWorld).invert());
        skeleton.init();
        idx = skeleton.bones.length - 1;
      }
      return idx;
    };

    let touched = false;
    for (let vi = 0; vi < M.node.length; vi++) {
      const n = M.node[vi];
      if (n < 0 || !movable.has(n)) continue;
      // Four slots is what the format has, so keep the four heaviest bones.
      const top = [...nodeW[n].entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
      const idx = [0, 0, 0, 0];
      const wts = [0, 0, 0, 0];
      let total = 0;
      let slot = 0;
      for (const [name, w] of top) {
        const bi = indexOf(name);
        if (bi < 0) continue;
        idx[slot] = bi;
        wts[slot] = w;
        total += w;
        slot++;
      }
      if (total <= 1e-6) continue;
      si.setXYZW(vi, idx[0], idx[1], idx[2], idx[3]);
      sw.setXYZW(vi, wts[0] / total, wts[1] / total, wts[2] / total, wts[3] / total);
      touched = true;
    }
    if (touched) {
      si.needsUpdate = true;
      sw.needsUpdate = true;
      result.meshes++;
    }
  }

  return result;
}
