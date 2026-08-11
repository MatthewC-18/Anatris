// src/lib/shoulderSkinBridge.ts
//
// THE ANTERIOR SHOULDER OPENED A HOLE WHEN THE ARM WENT FORWARD.
//
// Between the chest and the deltoid there is a strip of skin -- the deltopectoral
// triangle and, above it, the infraclavicular fossa -- whose whole job is to
// STRETCH across a shoulder that moves. In the shipped GLB both strips are
// skinned 100% to a thoracic vertebra (deltopectoral -> vert_T3, infraclavicular
// -> vert_T2), the same class of mistake that left the clavicle welded to vert_T1.
//
// So during flexion the deltoid skin travelled with the humerus, the strip stayed
// bolted to the ribcage, and the shoulder tore open. Measured on the shipped GLB,
// the worst pair of vertices that are COINCIDENT AT REST ended up 14.8 cm apart at
// 180 deg of flexion -- a hole you can see straight into.
//
// The strip cannot simply be re-bound to the shoulder either: the edge it shares
// with the chest has to stay on the chest. It needs a GRADIENT, and two earlier
// attempts show why the gradient has to be DERIVED rather than chosen:
//
//   - blending medial-to-lateral across the strip's own width fixed the seam
//     against the deltoid and tore a new one against the lateral thorax (14.1 cm).
//     The strip does not border the chest on one clean side and the shoulder on
//     the other.
//   - blending toward the SCAPULA alone still left 10.3 cm, because the deltoid
//     skin the strip seams against is not scapula-bound either: it is ~60% scapula
//     and ~40% humerus, and during flexion the humerus turns ~120 deg.
//
// So the strip INHERITS ITS NEIGHBOURS. Each vertex looks up the nearest skin that
// stays on the thorax and the nearest skin that rides the shoulder, and blends the
// two by which is closer -- copying the shoulder neighbour's own bone mix, whatever
// it happens to be. A vertex sitting on either seam inherits that neighbour
// outright, which is what holds the seam shut; everything between interpolates.
//
// Like clavicleBinding, the target bones live in a different armature and are
// absent from the strip's skeleton, so they are spliced in first.

import * as THREE from 'three';
import { materialIsSkin } from './materialColors';

/** Strip the `_12` disambiguator three.js appends to duplicate node names. */
const baseName = (n: string): string => n.replace(/_\d+$/, '');

/**
 * Skin regions that bridge thorax and shoulder. Matched against the MESH name.
 * Deliberately narrow: every other skin region belongs wholly to one side of the
 * seam, and re-weighting it would move skin that is currently correct.
 */
const BRIDGE_REGION = /^(deltopectoral_triangle|infraclavicular_fossa)/i;

/** Bones that mean "this skin stays on the trunk". */
const THORAX_BONE = /^vert_/;
/** Bones that mean "this skin rides the shoulder girdle or the arm". */
const SHOULDER_BONE = /^(clavicle|scapula|humerus_gh)$/;

/** How far from the strip a mesh may sit and still count as a neighbour. */
const NEIGHBOUR_RADIUS_M = 0.45;
/** Spatial-hash cell for the nearest-neighbour lookups. */
const CELL_M = 0.02;

export interface SkinBridgeResult {
  /** Strips that were re-graded, with the shoulder bones they inherited. */
  bridged: { mesh: string; bones: string[]; armature: string }[];
  skipped: { mesh: string; reason: string }[];
}

interface WeightedPoint {
  p: THREE.Vector3;
  /** Bone base names and weights, normalised. */
  bones: { name: string; w: number }[];
}

/** A spatial hash over weighted points, for nearest-point queries. */
class PointGrid {
  private cells = new Map<string, WeightedPoint[]>();
  size = 0;

  add(pt: WeightedPoint): void {
    const k =
      `${Math.floor(pt.p.x / CELL_M)}|${Math.floor(pt.p.y / CELL_M)}|` +
      `${Math.floor(pt.p.z / CELL_M)}`;
    const bucket = this.cells.get(k);
    if (bucket) bucket.push(pt);
    else this.cells.set(k, [pt]);
    this.size++;
  }

  /** Nearest point, searching outward shell by shell. Null if the grid is empty. */
  nearest(p: THREE.Vector3): { pt: WeightedPoint; dist: number } | null {
    if (!this.size) return null;
    const cx = Math.floor(p.x / CELL_M);
    const cy = Math.floor(p.y / CELL_M);
    const cz = Math.floor(p.z / CELL_M);
    let best: WeightedPoint | null = null;
    let bestSq = Infinity;
    for (let r = 0; r <= 24; r++) {
      // Once a hit is closer than this shell's inner radius, no later shell can beat it.
      if (best && bestSq <= ((r - 1) * CELL_M) ** 2) break;
      for (let i = -r; i <= r; i++)
        for (let j = -r; j <= r; j++)
          for (let k = -r; k <= r; k++) {
            // Only the shell; the interior was covered by earlier iterations.
            if (r > 0 && Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) !== r) continue;
            const bucket = this.cells.get(`${cx + i}|${cy + j}|${cz + k}`);
            if (!bucket) continue;
            for (const q of bucket) {
              const d = p.distanceToSquared(q.p);
              if (d < bestSq) { bestSq = d; best = q; }
            }
          }
    }
    return best ? { pt: best, dist: Math.sqrt(bestSq) } : null;
  }
}

/** The bone carrying most of a mesh's weight, by base name. */
function dominantBoneName(mesh: THREE.SkinnedMesh): string {
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  if (!si || !sw || !mesh.skeleton) return '';
  const acc = new Map<number, number>();
  for (let i = 0; i < si.count; i++)
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k);
      if (w > 0) {
        const b = si.getComponent(i, k);
        acc.set(b, (acc.get(b) ?? 0) + w);
      }
    }
  let best = -1;
  let bw = 0;
  for (const [b, w] of acc) if (w > bw) { bw = w; best = b; }
  return best >= 0 ? baseName(mesh.skeleton.bones[best]?.name ?? '') : '';
}

/** Every world-space vertex of a mesh at rest, carrying its bone weights BY NAME. */
function weightedPoints(mesh: THREE.SkinnedMesh): WeightedPoint[] {
  const pos = mesh.geometry.getAttribute('position');
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  const out: WeightedPoint[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    mesh.localToWorld(v);
    const bones: { name: string; w: number }[] = [];
    let total = 0;
    if (si && sw && mesh.skeleton) {
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w <= 0) continue;
        const name = baseName(mesh.skeleton.bones[si.getComponent(i, k)]?.name ?? '');
        if (!name) continue;
        bones.push({ name, w });
        total += w;
      }
    }
    if (total > 0) for (const b of bones) b.w /= total;
    out.push({ p: v.clone(), bones });
  }
  return out;
}

/**
 * Grade each thorax-to-shoulder skin strip so it stretches across the moving
 * shoulder instead of staying behind and tearing a hole in it.
 *
 * Safe to call once per loaded scene, before any posing. The rest pose is
 * preserved exactly: each spliced bone's inverse is taken from its CURRENT world
 * matrix, so bone * boneInverse is the identity at bind time, and the weights are
 * a partition of unity, so at rest every vertex lands where it already was.
 */
export function bridgeShoulderSkin(scene: THREE.Object3D): SkinBridgeResult {
  const result: SkinBridgeResult = { bridged: [], skipped: [] };

  scene.updateMatrixWorld(true);

  // Every bone a strip might inherit, per side, looked up INSIDE its own armature
  // subtree -- never globally, because the two sides share bone names.
  const shoulderBones = new Map<'R' | 'L', Map<string, THREE.Object3D>>();
  for (const side of ['R', 'L'] as const) {
    const root = scene.getObjectByName(`Shoulder_Armature_${side}`);
    if (!root) continue;
    const m = new Map<string, THREE.Object3D>();
    root.traverse((o) => {
      const n = baseName(o.name);
      if (SHOULDER_BONE.test(n) && !m.has(n)) m.set(n, o);
    });
    shoulderBones.set(side, m);
  }
  if (!shoulderBones.size) return result;

  const strips: THREE.SkinnedMesh[] = [];
  const neighbours: { mesh: THREE.SkinnedMesh; kind: 'thorax' | 'shoulder' }[] = [];
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh || !m.isSkinnedMesh || !m.geometry?.getAttribute('position')) return;
    if (BRIDGE_REGION.test(baseName(m.name))) {
      strips.push(m);
      return;
    }
    // Only skin can tell a skin strip what to do; the muscle underneath is free to
    // slide relative to it.
    const first = Array.isArray(m.material) ? m.material[0] : m.material;
    if (!materialIsSkin((first as THREE.Material | undefined)?.name ?? '')) return;
    const dom = dominantBoneName(m);
    if (THORAX_BONE.test(dom)) neighbours.push({ mesh: m, kind: 'thorax' });
    else if (SHOULDER_BONE.test(dom)) neighbours.push({ mesh: m, kind: 'shoulder' });
  });
  if (!strips.length) return result;

  for (const mesh of strips) {
    const geom = mesh.geometry;
    const si = geom.getAttribute('skinIndex');
    const sw = geom.getAttribute('skinWeight');
    const pos = geom.getAttribute('position');
    const skeleton = mesh.skeleton;
    if (!skeleton || !si || !sw || !pos) {
      result.skipped.push({ mesh: mesh.name, reason: 'sin esqueleto o sin pesos' });
      continue;
    }
    if (!geom.boundingSphere) geom.computeBoundingSphere();
    const centre = geom.boundingSphere!.center.clone().applyMatrix4(mesh.matrixWorld);
    if (Math.abs(centre.x) < 1e-4) {
      result.skipped.push({ mesh: mesh.name, reason: 'sin lado (centrada en X)' });
      continue;
    }
    const side: 'R' | 'L' = centre.x > 0 ? 'R' : 'L';
    const sideSign = side === 'R' ? 1 : -1;
    const bonesForSide = shoulderBones.get(side);
    if (!bonesForSide?.size) {
      result.skipped.push({ mesh: mesh.name, reason: `sin armature de hombro ${side}` });
      continue;
    }

    // The vertebra the strip currently rides, kept for its chest-side edge. Taken
    // by total weight rather than by name, so this survives a re-export that binds
    // the strip to a different vertebra.
    const acc = new Map<number, number>();
    for (let i = 0; i < si.count; i++)
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w > 0) {
          const b = si.getComponent(i, k);
          acc.set(b, (acc.get(b) ?? 0) + w);
        }
      }
    let thoraxIndex = -1;
    let bestW = 0;
    for (const [b, w] of acc) if (w > bestW) { bestW = w; thoraxIndex = b; }
    if (thoraxIndex < 0) {
      result.skipped.push({ mesh: mesh.name, reason: 'sin hueso dominante' });
      continue;
    }

    // Neighbours on this side of the body and near enough to be seam partners.
    // Both clouds must exist, or there is nothing to interpolate between and the
    // strip is better left exactly as it is.
    const thoraxGrid = new PointGrid();
    const shoulderGrid = new PointGrid();
    for (const n of neighbours) {
      const g = n.mesh.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      const c = g.boundingSphere!.center.clone().applyMatrix4(n.mesh.matrixWorld);
      if (c.x * sideSign < -0.05 || c.distanceTo(centre) > NEIGHBOUR_RADIUS_M) continue;
      const grid = n.kind === 'thorax' ? thoraxGrid : shoulderGrid;
      for (const pt of weightedPoints(n.mesh)) grid.add(pt);
    }
    if (!thoraxGrid.size || !shoulderGrid.size) {
      result.skipped.push({ mesh: mesh.name, reason: 'sin vecinos a ambos lados' });
      continue;
    }

    /** Index of a shoulder bone inside THIS strip's skeleton, splicing on demand. */
    const spliced = new Map<string, number>();
    const indexOfShoulderBone = (name: string): number => {
      const cached = spliced.get(name);
      if (cached !== undefined) return cached;
      const bone = bonesForSide.get(name);
      if (!bone) {
        spliced.set(name, -1);
        return -1;
      }
      let idx = skeleton.bones.indexOf(bone as THREE.Bone);
      if (idx < 0) {
        // Indices are APPENDED, so any skinIndex already stored stays valid.
        skeleton.bones.push(bone as THREE.Bone);
        skeleton.boneInverses.push(new THREE.Matrix4().copy(bone.matrixWorld).invert());
        skeleton.init();
        idx = skeleton.bones.length - 1;
      }
      spliced.set(name, idx);
      return idx;
    };

    const used = new Set<string>();
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      mesh.localToWorld(v);
      const nThorax = thoraxGrid.nearest(v);
      const nShoulder = shoulderGrid.nearest(v);
      if (!nThorax || !nShoulder) continue;
      const sum = nThorax.dist + nShoulder.dist;
      let t = sum > 1e-6 ? nThorax.dist / sum : 0.5;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      t = t * t * (3 - 2 * t); // smoothstep: no crease where the gradient starts

      // The shoulder end copies the neighbour's OWN mix (scapula / humerus /
      // clavicle in whatever proportion it uses), which is what actually closes
      // the seam. Three slots for it plus one for the vertebra fills the four.
      const share = nShoulder.pt.bones
        .filter((b) => SHOULDER_BONE.test(b.name))
        .sort((a, b) => b.w - a.w)
        .slice(0, 3);
      const shareTotal = share.reduce((a, b) => a + b.w, 0);
      const idx = [thoraxIndex, 0, 0, 0];
      const wts = [1 - t, 0, 0, 0];
      if (shareTotal > 1e-6) {
        let slot = 1;
        for (const b of share) {
          const bi = indexOfShoulderBone(b.name);
          if (bi < 0) continue;
          idx[slot] = bi;
          wts[slot] = (t * b.w) / shareTotal;
          used.add(b.name);
          slot++;
        }
      }
      const total = wts[0] + wts[1] + wts[2] + wts[3];
      if (total <= 1e-6) continue;
      si.setXYZW(i, idx[0], idx[1], idx[2], idx[3]);
      sw.setXYZW(i, wts[0] / total, wts[1] / total, wts[2] / total, wts[3] / total);
    }
    si.needsUpdate = true;
    sw.needsUpdate = true;
    result.bridged.push({
      mesh: mesh.name,
      bones: [...used],
      armature: `Shoulder_Armature_${side}`,
    });
  }

  return result;
}
