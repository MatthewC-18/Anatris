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

/**
 * How many points each bone surface is reduced to before the distance queries.
 *
 * A bone mesh carries thousands of vertices, and a blend that only asks "am I
 * nearer the blade or the shaft" does not need them: 600 points spread over a
 * scapula sit about 5 mm apart, which is finer than the gradient this feeds. At
 * that size a plain brute-force scan beats any spatial index, and -- unlike the
 * shell search this replaced -- its cost does not depend on how FAR the vertex
 * is from the bone, which is what made the first version quadratic in practice.
 */
const CLOUD_POINTS = 600;
/**
 * How far a bone cloud is searched before a vertex is called FAR from it, in
 * which case the distance is clamped to this value rather than measured.
 *
 * The clamp is not an approximation of the answer, it is the answer: what the
 * gradient needs is the RATIO of the two distances, and the ratio only matters
 * while both bones are in reach. The long head of triceps runs 25 cm past the
 * scapula, so its distal end clamps at 15 cm from the blade while sitting 1 cm
 * from the humerus, which reads as ~94% humeral -- correct, and reached without
 * measuring the 25 cm.
 *
 * It also has to be a clamp rather than an unbounded search because this runs at
 * page load. An unbounded shell search over a 1 cm grid walked up to 30 shells --
 * 27 000 cells -- for every vertex that was far from one of the two bones, and
 * cost 22 SECONDS on the shipped model. Bounded, the whole pass is under a
 * second.
 */
const MAX_SEARCH_M = 0.15;

export interface MuscleBindResult {
  /** Muscles that were re-graded, with the spread of the resulting weights. */
  graded: { mesh: string; armature: string; minScapula: number; maxScapula: number }[];
  skipped: { mesh: string; reason: string }[];
}

/**
 * A bone surface reduced to a flat array of points, for nearest-point queries.
 *
 * Points are collected first and thinned to CLOUD_POINTS on the first query, by
 * uniform stride over the collected order -- which is mesh order, i.e. spread
 * over the whole surface rather than clustered in one corner of it.
 */
class BoneCloud {
  private raw: number[] = [];
  private xyz: Float32Array | null = null;
  size = 0;

  add(p: THREE.Vector3): void {
    this.raw.push(p.x, p.y, p.z);
    this.size++;
  }

  private thin(): void {
    const n = this.size;
    const take = Math.min(n, CLOUD_POINTS);
    const out = new Float32Array(take * 3);
    for (let i = 0; i < take; i++) {
      const src = Math.floor((i * n) / take) * 3;
      out[i * 3] = this.raw[src];
      out[i * 3 + 1] = this.raw[src + 1];
      out[i * 3 + 2] = this.raw[src + 2];
    }
    this.xyz = out;
  }

  /**
   * Distance to the nearest point, clamped at MAX_SEARCH_M (see the note there).
   * Returns Infinity only when the cloud is empty.
   */
  nearest(p: THREE.Vector3): number {
    if (!this.size) return Infinity;
    if (!this.xyz) this.thin();
    const a = this.xyz!;
    let bestSq = Infinity;
    for (let i = 0; i < a.length; i += 3) {
      const dx = p.x - a[i];
      const dy = p.y - a[i + 1];
      const dz = p.z - a[i + 2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestSq) bestSq = d;
    }
    return Math.min(Math.sqrt(bestSq), MAX_SEARCH_M);
  }
}

/** Every world-space vertex of a mesh at REST (no skinning applied). */
function restPoints(mesh: THREE.Mesh, into: BoneCloud): void {
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
  const scapulaGrid = new Map<'R' | 'L', BoneCloud>();
  const humerusGrid = new Map<'R' | 'L', BoneCloud>();
  for (const side of ['R', 'L'] as const) {
    scapulaGrid.set(side, new BoneCloud());
    humerusGrid.set(side, new BoneCloud());
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
  // No early return on an empty `targets`: the thoracohumeral pass at the bottom
  // is independent of this one and must still run.

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

  gradeThoracohumeral(scene, bonesBySide, humerusGrid, result);
  return result;
}

/**
 * Muscles that cross the shoulder from the THORAX, not from the scapula.
 *
 * The pass above deferred these on the grounds that they were "a different pair
 * of bones and a separate problem". They are, and the separate problem turned out
 * to be worse: measured on the shipped GLB, every head of the pectoralis major is
 * skinned 100% to a single vertebra, so its bounding diagonal is 19.8 cm at 0 deg
 * of flexion and 19.8 cm at 135 -- the muscle does not move AT ALL. A prime mover
 * of shoulder flexion that stands still while the arm goes over the head is the
 * same class of defect as the clavicle welded to vert_T1.
 *
 * Latissimus dorsi is NOT here: the rig already carries `latshum_l/r` helper bones
 * for exactly this, driven from RigModel, and its diagonal does grow across the
 * arc (43.3 -> 46.1 cm). Pectoralis minor is not here either -- it inserts on the
 * CORACOID, so its distal anchor is the scapula, not the humerus, and it barely
 * moves against the thorax anyway.
 */
const THORACOHUMERAL =
  /^(clavicular_head_of_pectoralis_major|sternocostal_head_of_pectoralis_major|\(abdominal_part_of_pectoralis_major)/i;

/** Bone meshes standing for the muscle's PROXIMAL anchor: the chest wall. */
const THORAX_MESH = /^(rib|sternum|costal_cartilage|clavicle)/i;

/**
 * How far from the humerus a thoracohumeral fibre still follows it. The
 * pectoralis major inserts as a flat tendon about 5 cm tall; this is that tendon
 * plus the fibres converging into it, and everything beyond stays on the chest.
 */
const INSERTION_REACH_M = 0.06;

/**
 * Grade the thoracohumeral muscles from their chest-wall origin to their humeral
 * insertion.
 *
 * The proximal target is whatever vertebra the mesh ALREADY rides, taken by total
 * weight rather than by name: there is no "thorax" bone in this rig -- the chest
 * is driven through the spine -- so the origin keeps exactly the bone it has and
 * only the insertion end changes. That also means a re-export that binds the
 * pectoralis to a different vertebra still works.
 */
function gradeThoracohumeral(
  scene: THREE.Object3D,
  bonesBySide: Map<'R' | 'L', Map<string, THREE.Object3D>>,
  humerusGrid: Map<'R' | 'L', BoneCloud>,
  result: MuscleBindResult,
): void {
  const thoraxGrid = new Map<'R' | 'L', BoneCloud>([
    ['R', new BoneCloud()],
    ['L', new BoneCloud()],
  ]);
  const targets: THREE.SkinnedMesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh || !m.geometry?.getAttribute('position')) return;
    const geom = m.geometry;
    if (!geom.boundingSphere) geom.computeBoundingSphere();
    const c = geom.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
    const n = baseName(m.name);
    const layer = layerOf(m);
    if (layer === 'bone' && THORAX_MESH.test(n)) {
      // The chest wall is one surface for both sides; a right-side pectoralis
      // originates on the sternum at the midline, so both clouds take all of it.
      for (const side of ['R', 'L'] as const) restPoints(m, thoraxGrid.get(side)!);
      return;
    }
    if (Math.abs(c.x) < 1e-4) return;
    if ((layer === 'muscle' || layer === 'connective') && m.isSkinnedMesh && THORACOHUMERAL.test(n))
      targets.push(m);
  });

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
    const thorax = thoraxGrid.get(side)!;
    const hum = humerusGrid.get(side)!;
    const humBone = bonesBySide.get(side)?.get(HUMERUS_BONE);
    if (!thorax.size || !hum.size || !humBone) {
      result.skipped.push({ mesh: mesh.name, reason: `sin huesos de referencia en ${side}` });
      continue;
    }

    // The vertebra the mesh already rides, kept as the origin's anchor.
    const acc = new Map<number, number>();
    for (let i = 0; i < si.count; i++)
      for (let k = 0; k < 4; k++) {
        const w = sw.getComponent(i, k);
        if (w > 0) {
          const b = si.getComponent(i, k);
          acc.set(b, (acc.get(b) ?? 0) + w);
        }
      }
    let iThorax = -1;
    let bestW = 0;
    for (const [b, w] of acc) if (w > bestW) { bestW = w; iThorax = b; }
    if (iThorax < 0) {
      result.skipped.push({ mesh: mesh.name, reason: 'sin hueso dominante' });
      continue;
    }

    let iHum = skeleton.bones.indexOf(humBone as THREE.Bone);
    if (iHum < 0) {
      // The pectoralis is skinned to the SPINE skeleton, which has no humerus in
      // it. Appending keeps every stored skinIndex valid, and the inverse comes
      // from the bone's CURRENT world matrix so the rest pose does not jump.
      skeleton.bones.push(humBone as THREE.Bone);
      skeleton.boneInverses.push(new THREE.Matrix4().copy(humBone.matrixWorld).invert());
      skeleton.init();
      iHum = skeleton.bones.length - 1;
    }

    let minT = 1;
    let maxT = 0;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      mesh.localToWorld(v);
      const dH = hum.nearest(v);
      if (!Number.isFinite(dH)) continue;
      // NOT the ratio rule the pass above uses. That rule suits a muscle lying
      // BETWEEN two bones -- the rotator cuff, hugging blade and head -- and the
      // pectoralis is not that shape: it is a fan several hand-widths across that
      // converges into a tendon about 5 cm tall on the intertubercular groove.
      // Graded by ratio, the humerus (whose mesh runs the whole length of the arm)
      // came out "close" to a great deal of chest, so the lower fibres swung with
      // the arm and pushed out through the chest skin -- 2.34 cm at 90 deg, worse
      // than the problem being fixed. What follows the arm is the TENDON and the
      // fibres converging into it, so the humeral share is a falloff around the
      // bone rather than a share of the distance between two.
      let t = 1 - dH / INSERTION_REACH_M;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      t = t * t * (3 - 2 * t); // smoothstep: no crease where the gradient starts
      const wT = 1 - t;
      if (wT < minT) minT = wT;
      if (wT > maxT) maxT = wT;
      si.setXYZW(i, iThorax, iHum, 0, 0);
      sw.setXYZW(i, wT, t, 0, 0);
    }
    si.needsUpdate = true;
    sw.needsUpdate = true;
    result.graded.push({
      mesh: mesh.name,
      armature: `Shoulder_Armature_${side}`,
      minScapula: minT,
      maxScapula: maxT,
    });
  }
}
