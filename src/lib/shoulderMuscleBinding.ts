// src/lib/shoulderMuscleBinding.ts
//
// THE SHOULDER MUSCLES WERE BOUND TO ONE BONE EACH, SO THEIR ORIGINS FLEW OFF.
//
// A physiotherapist reviewing the flexion arc said muscle was showing through the
// skin at the front of the shoulder between 45 and 135 deg. Measured on the
// shipped GLB (scripts/measure-muscle-spill.mts), he was right: at 90 deg of
// flexion the teres major, subscapularis, coracobrachialis, supraspinatus, short
// head of biceps and long head of triceps end up around 1 cm OUTSIDE the local
// skin surface, having sat ~2.7 cm inside it at rest. Those six are the walls of
// the axilla, which is what opens as the arm leaves the trunk.
//
// The cause is in the weights. Every one of these muscles SPANS a joint -- it
// originates on the scapula and inserts on the humerus -- but they ship with a
// single flat mix applied to the entire mesh:
//
//   Teres_minor              humerus_gh 100%            <- origin is the SCAPULA
//   Short_head_of_biceps     humerus_gh 100%            <- origin is the CORACOID
//   Teres_major              humerus_gh 50% / scapula 50%
//   Coracobrachialis         humerus_gh 61% / scapula 39%
//   Subscapularis            scapula 65% / humerus_gh 35%
//   Supraspinatus            scapula 67% / humerus_gh 33%
//
// A flat mix means every vertex moves the same way, so the origin travels with
// the insertion. Teres minor, bound wholly to the humerus, drags its scapular
// origin forward with the arm; teres major, split half and half, sends its origin
// half way. Measured, teres major's own bounding diagonal grows from 14.7 cm at
// rest to 22.3 cm at 135 deg -- a 52% stretch that is the mesh being pulled apart,
// not a muscle contracting.
//
// The fix is the one the rest of this codebase keeps arriving at: DERIVE the
// weights instead of choosing them. Each vertex asks which bone it actually lies
// against -- the scapula or the humerus -- and is bound accordingly, so the
// origin stays on its fossa, the tendon rides the humerus, and the belly between
// them interpolates. Nothing here is hand-tuned per muscle: the same rule gives
// the rotator cuff a mostly-scapular body with a humeral tendon and the biceps
// short head a coracoid anchor with an arm-long belly, because that is where the
// geometry puts them.
//
// Lives in src/lib rather than inside RigModel so the component and the offline
// measurement harness share ONE implementation and cannot drift apart.

import * as THREE from 'three';
import { layerForMaterial } from './materialColors';

/** Strip the `_12` disambiguator three.js appends to duplicate node names. */
const baseName = (n: string): string => n.replace(/_\d+$/, '');

/** The layer a mesh's first material puts it in. */
function layerOf(mesh: THREE.Mesh): string | null {
  const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return layerForMaterial((first as THREE.Material | undefined)?.name ?? '');
}

/**
 * Muscles that CROSS the glenohumeral joint, i.e. whose origin is on the scapula
 * and whose insertion is on the humerus or beyond.
 *
 * Deliberately a list and not "every muscle in the shoulder armature". The
 * deltoid already ships graded by its three parts and behaves; latissimus dorsi
 * and pectoralis major span the THORAX to the humerus, which is a different pair
 * of bones and a separate problem. Re-weighting either from here would move
 * geometry that is currently right.
 */
const SPANS_GLENOHUMERAL =
  /^(supraspinatus|infraspinatus|teres_minor|teres_major|subscapularis|coracobrachialis|(short|long)_head_of_biceps_brachii|long_head_of_triceps)/i;

/**
 * Bone meshes that stand for each anchor. Matched against the MESH name AND
 * against the bone material -- the name alone is not enough, because
 * `Scapular_spinal_part_of_deltoid_muscle` and the `Scapular_region` skin both
 * begin with "Scapula" and would otherwise be measured as if they were the blade.
 */
const SCAPULA_MESH = /^(scapula|coracoid|acromion|glenoid)/i;
const HUMERUS_MESH = /^humerus/i;

/** Bones the graded weights are written onto. */
const SCAPULA_BONE = 'scapula';
const HUMERUS_BONE = 'humerus_gh';

/** Spatial-hash cell for the nearest-bone-surface lookups. */
const CELL_M = 0.01;
/** How far a bone cloud is searched before a vertex is called "not near it". */
const MAX_SEARCH_M = 0.30;

export interface MuscleBindResult {
  /** Muscles that were re-graded, with the spread of the resulting weights. */
  graded: { mesh: string; armature: string; minScapula: number; maxScapula: number }[];
  skipped: { mesh: string; reason: string }[];
}

/** A spatial hash over rest-pose points, for nearest-point queries. */
class PointGrid {
  private cells = new Map<string, THREE.Vector3[]>();
  size = 0;

  add(p: THREE.Vector3): void {
    const k =
      `${Math.floor(p.x / CELL_M)}|${Math.floor(p.y / CELL_M)}|${Math.floor(p.z / CELL_M)}`;
    const bucket = this.cells.get(k);
    if (bucket) bucket.push(p);
    else this.cells.set(k, [p]);
    this.size++;
  }

  /** Distance to the nearest point, or Infinity. Searches shell by shell. */
  nearest(p: THREE.Vector3): number {
    if (!this.size) return Infinity;
    const cx = Math.floor(p.x / CELL_M);
    const cy = Math.floor(p.y / CELL_M);
    const cz = Math.floor(p.z / CELL_M);
    let bestSq = Infinity;
    const maxR = Math.ceil(MAX_SEARCH_M / CELL_M);
    for (let r = 0; r <= maxR; r++) {
      // Once a hit is closer than this shell's inner radius, no later shell wins.
      if (bestSq <= ((r - 1) * CELL_M) ** 2) break;
      for (let i = -r; i <= r; i++)
        for (let j = -r; j <= r; j++)
          for (let k = -r; k <= r; k++) {
            if (r > 0 && Math.max(Math.abs(i), Math.abs(j), Math.abs(k)) !== r) continue;
            const bucket = this.cells.get(`${cx + i}|${cy + j}|${cz + k}`);
            if (!bucket) continue;
            for (const q of bucket) {
              const d = p.distanceToSquared(q);
              if (d < bestSq) bestSq = d;
            }
          }
    }
    return Math.sqrt(bestSq);
  }
}

/** Every world-space vertex of a mesh at REST (no skinning applied). */
function restPoints(mesh: THREE.Mesh, into: PointGrid): void {
  const pos = mesh.geometry.getAttribute('position');
  if (!pos) return;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    mesh.localToWorld(v);
    into.add(v.clone());
  }
}

/**
 * Re-grade the scapulohumeral muscles so each vertex follows the bone it lies
 * against, instead of the whole muscle following one bone.
 *
 * Safe to call once per loaded scene, before any posing. The rest pose is
 * preserved exactly: both target bones are already in these meshes' skeleton (and
 * are spliced in with an inverse taken from their CURRENT world matrix if not),
 * and the weights are a partition of unity, so at rest every vertex lands where
 * it already was.
 */
export function gradeShoulderMuscleBinding(scene: THREE.Object3D): MuscleBindResult {
  const result: MuscleBindResult = { graded: [], skipped: [] };

  scene.updateMatrixWorld(true);

  // Bones, per side, looked up INSIDE their own armature subtree -- never
  // globally, because the two sides share bone names.
  const bonesBySide = new Map<'R' | 'L', Map<string, THREE.Object3D>>();
  for (const side of ['R', 'L'] as const) {
    const root = scene.getObjectByName(`Shoulder_Armature_${side}`);
    if (!root) continue;
    const m = new Map<string, THREE.Object3D>();
    root.traverse((o) => {
      const n = baseName(o.name);
      if ((n === SCAPULA_BONE || n === HUMERUS_BONE) && !m.has(n)) m.set(n, o);
    });
    bonesBySide.set(side, m);
  }
  if (!bonesBySide.size) return result;

  // Bone-surface clouds, per side. Built from the BONE meshes at rest, which is
  // what "this vertex lies against the scapula" has to mean.
  const scapulaGrid = new Map<'R' | 'L', PointGrid>();
  const humerusGrid = new Map<'R' | 'L', PointGrid>();
  for (const side of ['R', 'L'] as const) {
    scapulaGrid.set(side, new PointGrid());
    humerusGrid.set(side, new PointGrid());
  }
  const targets: THREE.SkinnedMesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh || !m.geometry?.getAttribute('position')) return;
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
    if (Math.abs(c.x) < 1e-4) return; // midline: no side to belong to
    const side: 'R' | 'L' = c.x > 0 ? 'R' : 'L';
    const n = baseName(m.name);
    const layer = layerOf(m);
    if (layer === 'bone') {
      if (SCAPULA_MESH.test(n)) restPoints(m, scapulaGrid.get(side)!);
      else if (HUMERUS_MESH.test(n)) restPoints(m, humerusGrid.get(side)!);
    } else if (
      (layer === 'muscle' || layer === 'connective') &&
      m.isSkinnedMesh &&
      SPANS_GLENOHUMERAL.test(n)
    ) {
      targets.push(m);
    }
  });
  if (!targets.length) return result;

  for (const mesh of targets) {
    const geom = mesh.geometry;
    const si = geom.getAttribute('skinIndex');
    const sw = geom.getAttribute('skinWeight');
    const pos = geom.getAttribute('position');
    const skeleton = mesh.skeleton;
    if (!skeleton || !si || !sw || !pos) {
      result.skipped.push({ mesh: mesh.name, reason: 'sin esqueleto o sin pesos' });
      continue;
    }
    const centre = geom.boundingSphere!.center.clone().applyMatrix4(mesh.matrixWorld);
    const side: 'R' | 'L' = centre.x > 0 ? 'R' : 'L';
    const bones = bonesBySide.get(side);
    const scap = scapulaGrid.get(side)!;
    const hum = humerusGrid.get(side)!;
    if (!bones?.size || !scap.size || !hum.size) {
      result.skipped.push({ mesh: mesh.name, reason: `sin huesos de referencia en ${side}` });
      continue;
    }

    /** Index of a bone inside THIS mesh's skeleton, splicing it in on demand. */
    const indexOf = (name: string): number => {
      const bone = bones.get(name);
      if (!bone) return -1;
      let idx = skeleton.bones.indexOf(bone as THREE.Bone);
      if (idx < 0) {
        // Indices are APPENDED, so any skinIndex already stored stays valid.
        skeleton.bones.push(bone as THREE.Bone);
        skeleton.boneInverses.push(new THREE.Matrix4().copy(bone.matrixWorld).invert());
        skeleton.init();
        idx = skeleton.bones.length - 1;
      }
      return idx;
    };
    const iScap = indexOf(SCAPULA_BONE);
    const iHum = indexOf(HUMERUS_BONE);
    if (iScap < 0 || iHum < 0) {
      result.skipped.push({ mesh: mesh.name, reason: 'falta scapula o humerus_gh' });
      continue;
    }

    let minS = 1;
    let maxS = 0;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      mesh.localToWorld(v);
      const dS = scap.nearest(v);
      const dH = hum.nearest(v);
      if (!Number.isFinite(dS) && !Number.isFinite(dH)) continue;
      // Closer to the scapula -> more scapula. A vertex out of range of one bone
      // belongs wholly to the other.
      let t = !Number.isFinite(dH) ? 0 : !Number.isFinite(dS) ? 1 : dS / (dS + dH);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      t = t * t * (3 - 2 * t); // smoothstep: no crease where the gradient starts
      const wS = 1 - t;
      if (wS < minS) minS = wS;
      if (wS > maxS) maxS = wS;
      si.setXYZW(i, iScap, iHum, 0, 0);
      sw.setXYZW(i, wS, t, 0, 0);
    }
    si.needsUpdate = true;
    sw.needsUpdate = true;
    result.graded.push({
      mesh: mesh.name,
      armature: `Shoulder_Armature_${side}`,
      minScapula: minS,
      maxScapula: maxS,
    });
  }

  return result;
}
