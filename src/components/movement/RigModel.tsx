// src/components/movement/RigModel.tsx
//
// The biomechanical rig runtime. Loads the SKINNED rig GLB (public/cuerpo-rig.glb
// -- 5 armatures, 65 bones, 972 skinned meshes), caches every bone by its
// armature subtree (so the L/R name collision never bites: we descend from the
// UNIQUE armature root), and drives a clinical movement on demand by rotating
// the mapped bone in its LOCAL space and replicating the Blender drivers that
// glTF dropped (scapulohumeral rhythm, patellar glide).
//
// The skinned meshes deform automatically once the bone matrices change -- this
// is real skeletal deformation, not the old rigid-block reparenting.
//
// Driven from the DOM via `rigChannel` (module-level pub/sub, same pattern as
// the legacy shoulderRigChannel) so the control panel outside the <Canvas> can
// command the rig without prop-drilling a ref across the canvas boundary.
//
// Fully reversible: bones are restored to their captured rest pose on unmount.
// ASCII-only source; no `any`.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getBoneControl,
  resolveArmatureName,
  distributeSpineAngle,
  type Side,
  type RigAxis,
} from '../../lib/boneMap';
import {
  colorForMaterial,
  colorForMaterialMesh,
  materialIsSkin,
  layerForMaterial,
  tissueClassForMaterial,
  type TissueClass,
  type AnatomyLayer,
} from '../../lib/materialColors';
import { muscleDepthLevel, type MuscleDepthLevel } from '../../lib/muscleDepth';
import { parseMeshName, type ParsedSide } from '../../lib/parseMeshName';
import { buildMuscleResolution } from '../../lib/muscleResolver';
import { MUSCLES_BY_REGION } from '../../data/musclesByRegion';
import type { Muscle } from '../../types/muscle';
import {
  dissectChannel,
  makeSelection,
  meshIsDissected,
  type DissectLayer,
} from './dissectChannel';
import type { RomMuscleRole } from '../../types/rom';
import { pathologyById } from '../../data/pathologies';

// Cache-bust query so browsers/drei re-fetch after a rig re-export instead of
// serving a stale cached GLB. Bump on every cuerpo-rig.glb re-export.
// v5: added the missing finger/sole skin modifiers so BOTH hands and feet ship
// a complete, deforming skin envelope (the distal skin-cap below relies on it).
// v6: fixed the RIGHT hand skin. Its palm/dorsum/wrist/digit skin shells carried
// a wrong object rotation (0,0.11,-0.11) instead of the mirror of the left hand,
// so the thin shells sat edge-on and rendered as separated, curling ribbons that
// spilled up into the forearm. Rebuilt each as a baked X-mirror of its clean left
// twin (mesh-data mirror + translation-only transform, the export-safe method).
// v7: completed the TORSO + THIGHS skin. The Z-Anatomy trunk/thigh surface-region
// patches (Pectoral/Scapular/Lumbar/Gluteal/thigh...) shipped WITHOUT an armature
// modifier, so they never exported and the body read as a bare ribcage. Bound each
// to its nearest bone (trunk -> Spine vertebra, thigh -> femur; single vertex
// group, weight 1.0) + armature modifier, so they now export and deform.
// v8: completed the HEAD/face skin (100 face/ear/scalp patches bound rigidly to
// vert_C1, the head moves as one piece) + a few stragglers (knee/foot/nail). The
// whole body is now skinned neck-to-toe (the face has eye/mouth openings by
// design). Twin-symmetry verified: no mirror mis-orientation on the ear shells.
// v9: (a) rebound `Hip region.l/.r` from hand_flex (they inherited the wrong bone
// in the source, so the hip skin flew off with the hand) to vert_sacrum, so it
// stays on the pelvis; (b) shifted the LEFT radius+ulna ~2.5 cm palmar to match
// the right -- they sat too dorsal and poked a bone through the wrist skin.
// v10: nudged the LEFT radius+ulna a further ~1.2 cm palmar to fully tuck the
// last of the bone under the (asymmetrically thinner) dorsal wrist skin.
// v11: SKELETON COMPLETION. Bound 99 previously-unbound bone meshes (the whole
// rib cage + sternum/xiphoid, skull/face bones, hip bones + coccyx, femurs and
// clavicles) each to its correct bone (ribs -> nearest thoracic vertebra, skull
// -> vert_C1, pelvis -> vert_sacrum, femur -> femur_base, all rigid wt 1.0) so
// they finally EXPORT and the thorax reads as a real rib cage. Also symmetrized
// the LEFT radius+ulna laterally (x-only) to mirror the right, preserving the
// v9/v10 palmar tuck. GLB ~61.6 MB / 1222 meshes. v10 backup at
// public/cuerpo-rig.v10.bak.glb.
// v12: MUSCLE COMPLETION. Bound 698 previously-unbound skeletal MUSCLE meshes
// (material -> muscle color) each rigidly to its bone (face/head -> vert_C1, neck
// -> nearest cervical vertebra, trunk -> nearest spine vertebra, limbs -> nearest
// limb bone; 14 thigh bellies corrected off patella -> femur_base so they don't
// swing during knee flexion). EXCLUDED 37 visceral non-locomotor muscles (heart,
// larynx, pharynx, tongue, inner eye/ear) + the distal hand/foot (skin-capped).
// The body now reads as a full muscular figure under the skin. GLB ~106 MB / 1920
// meshes. v11 (skeleton-only) backup at public/cuerpo-rig.v11.bak.glb.
//
// v13: OPTIMIZED LOAD. Runtime loads cuerpo-rig.opt.glb, decoded transparently by
// drei's useGLTF. The 101 MB source is decimated ~57% (3.4M -> 1.5M tris, weld +
// meshopt simplify, 0.5%-AABB error bound) then meshopt-encoded WITHOUT position
// quantization -> 18.2 MB (from 101 MB source / 29.5 MB pre-decimation). No dedup,
// no quantize: all 1920 meshes, 106 MATERIAL NAMES and the 5 SHARED skins survive,
// and a validation pass confirmed 0 region-cull re-classifications with a 1.7 mm
// max mesh-center shift, so the distal hand/foot skin-cap and every cull behave as
// before. Regenerate: `node scripts/decimate-glb.mjs public/cuerpo-rig.glb
// public/cuerpo-rig.opt.glb 0.4 --no-quantize`. See scripts/decimate-glb.mjs +
// scripts/validate-decimation.mjs. Uncompressed public/cuerpo-rig.glb is the source.
// v5: two Spine_Armature helper bones (latshum_l/r) + re-weighted latissimus
// insertion fibers so the lats' humeral insertion follows the abducting arm
// (belly stays spine-skinned); driven in apply() -> driveLatsHelpers (glTF drops
// the Blender Copy-Rotation). See rig-latissimus-cross-armature.
// v6: re-weighted the rotator cuff + teres/coracobrachialis (Infraspinatus,
// Supraspinatus, Subscapularis, Teres minor/major, Coracobrachialis) with a
// position gradient (origin -> scapula, insertion -> humerus) so they no longer
// "safan" (detach) on abduction -- they shipped with a crude uniform scapula/
// humerus blend that translated the whole belly half-way with the arm.
// v7: re-weighted the TRICEPS LONG HEAD (was 100% forearm bone) so its scapular
// origin rides the scapula + belly the humerus (+ excluded it from the arm-belly
// rebind above); tightened the posterior deltoid + teres minor origins toward the
// scapula. Fixes the residual "pico" poking out of the posterior axilla at high
// abduction.
const RIG_URL = '/cuerpo-rig.opt.glb?v=7';

// The five unique armature roots. Bone names collide between sides, so we ALWAYS
// look a bone up inside its armature subtree, never globally.
const ARMATURE_NAMES: readonly string[] = [
  'Shoulder_Armature_R',
  'Shoulder_Armature_L',
  'Leg_Armature_R',
  'Leg_Armature_L',
  'Spine_Armature',
] as const;

const AXIS_VEC: Record<RigAxis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};
const DEG2RAD = Math.PI / 180;

// ARM CLEARANCE. With the torso now fully skinned, an arm hanging at the side (or
// swinging to the extreme where a lab movement STARTS -- abduction begins in
// cross-body adduction, flexion begins in extension) buries itself -- and the
// whole forearm below the elbow -- inside the body. So whenever an ARM movement
// is active we lift the ACTIVE humerus forward (anterior/flexion), seating the
// entire arm IN FRONT of the trunk so it never clips through it. Purely visual --
// the clinical angle in the panel is unchanged. Forward = humerus local -X on
// both sides (same axis/sign as glenohumeral-flexion). Enough to carry the
// FOREARM clear too, but not so much the arm visibly starts "raised" (45 read too
// high, 25 left the forearm inside -- 35 balances); faded out at high elevation
// (see armClearanceFactor) so the top of an arc isn't over-rotated.
const ARM_CLEARANCE_DEG = 35;
const ARM_CLEARANCE_SIGN: Record<Side, 1 | -1> = { R: -1, L: -1 };
// Above this elevation the arm is already clear of the trunk, so the forward
// clearance ramps linearly to zero (full below 0 deg, none at/above this).
const ARM_CLEARANCE_FADE_DEG = 75;

// ---------------------------------------------------------------------------
// LUMBOPELVIC COUNTER-BALANCE (standing hip flexion).
//
// A standing straight-leg hip flexion is NOT a femur-on-fixed-pelvis rotation:
// past ~45 deg the trunk participates so the raise reads as a whole-body gesture
// rather than a frozen, impossible kick ("debe moverse todo el cuerpo, si no no
// es real"). The trunk inclines FORWARD with the rising leg (calibrated in-lab).
//
// We add a modest LUMBAR counter-lean that ramps in with the angle, reusing the
// vertebra block + local axis the lumbar-extension movement already drives
// (proven to deform the torso skin cleanly and never tear). The SACRUM is NOT
// rotated, so the pelvis + both legs stay put and the flexed leg never detaches;
// the thorax/arms/head ride the lean (arms via carryShouldersWithSpine). Keyed to
// the hip sagittal movement only -- nothing else is affected.
const HIP_BALANCE_LUMBAR = ['vert_L5', 'vert_L4', 'vert_L3', 'vert_L2', 'vert_L1'];
const HIP_BALANCE_START_DEG = 25; // below this the trunk stays neutral
const HIP_BALANCE_FULL_DEG = 90; // full counter-lean reached here
const HIP_BALANCE_MAX_DEG = 16; // total lumbar lean at the top of range
// movementId -> lean direction on the lumbar local X axis. CALIBRATED in the
// lab: the trunk leans FORWARD with the rising leg (+1 = lumbar-flexion sign);
// leaning back (-1) looked wrong.
const HIP_BALANCE_DIR: Record<string, 1 | -1> = { 'hip-flexion': 1 };

// ---------------------------------------------------------------------------
// SHOULDER-YOKE CARRY (spine movements).
//
// The rig ships FIVE independent armatures: the spine, plus a shoulder and a leg
// armature per side. They are NOT parented to one another -- each is a scene-root
// skin. So when the SPINE bends (thoracic/lumbar flexion, cervical, ...), the
// ribcage skin and the head follow (they are bound to the spine vertebrae), but
// the ARM armatures stay welded to world space and the arms detach -- they dangle
// where the shoulders used to be while the trunk leans away ("el cuerpo se sale de
// los ejes"). The head rides vert_C1 and the legs hang below the fixed sacrum, so
// only the two shoulder armatures come loose.
//
// Fix: on every spine command we rigidly carry each shoulder armature ROOT by the
// same delta transform the shoulder-yoke vertebra underwent (rest -> posed), so
// the whole arm rides the upper thorax exactly as if welded to it. The glenohumeral
// joint sits at the vert_T3 level (clavicle y~1.396, GH joint y~1.381, vert_T3
// y~1.400), so vert_T3 is the anatomically correct anchor. When the spine is at
// rest (e.g. cervical-only movements, or any limb movement) the delta is identity,
// so the arms stay put -- the carry is self-cancelling and always safe to run.
const SHOULDER_SPINE_ANCHOR = 'vert_T3';

// GLASS SKIN. When a movement is highlighting muscles, the body skin fades to a
// translucent "glass" so the glowing muscles read THROUGH it -- no need to peel
// the skin layer by hand. It eases back to solid when nothing is highlighted.
// The distal hand/foot caps keep their own solid material (they'd look hollow if
// faded, since their internals are intentionally hidden). See the fade useFrame.
const BODY_SKIN_GHOST_OPACITY = 0.16; // opacity while muscles are active

// Emissive tint for the click-to-dissect SELECTION (sky-300): shows what the
// "Diseccionar" button will remove without repainting the muscle's own color.
const SELECTION_EMISSIVE = 0x7dd3fc;
const SKIN_FADE_SPEED = 6; // per-second lerp rate toward the target

// ---------------------------------------------------------------------------
// Duplicate-overlap removal.
//
// Z-Anatomy ships several distal bones TWICE: two near-coincident skinned
// meshes of the SAME bone with DIFFERENT tessellation, occupying the same
// volume. Two opaque surfaces in the same place Z-fight into a flickering,
// speckled mess -- worst on the dense little hand and foot bones, which is what
// made the hands "look broken". The runtime keeps ONE copy per (dominant bone +
// near-coincident center) cluster (the higher-resolution mesh) and hides the
// rest. ~140 redundant meshes across the model, ~60% of them in the hands/feet.
// ---------------------------------------------------------------------------

/** Two meshes count as the same bone when their centers are within this (m). */
const DUP_EPS = 0.004; // 4 mm -- tighter than any inter-bone gap, so distinct
// carpals/tarsals never collapse into each other.

const _tmpCenter = new THREE.Vector3();

/** World-space center of a (possibly skinned) mesh, at the rest pose. */
function meshWorldCenter(mesh: THREE.Mesh): THREE.Vector3 {
  const g = mesh.geometry;
  if (!g.boundingSphere) g.computeBoundingSphere();
  const c = g.boundingSphere?.center ?? _tmpCenter.set(0, 0, 0);
  return c.clone().applyMatrix4(mesh.matrixWorld);
}

// ---------------------------------------------------------------------------
// Corrupted-spike guard.
//
// A handful of long, multi-joint hand/leg meshes (the finger flexor/extensor
// TENDONS -- Extensor_digitorum, Palmaris_longus, Flexor_digitorum_profundus,
// Extensor_digiti_minimi -- and two leg muscle-origins) come out of the glTF
// export as "spikes": a compact core of vertices plus a few flung far across the
// scene. At rest that is exactly the geometry three.js draws, so they show as
// grey/red starburst spikes radiating from the wrist. The SOURCE .blend is
// clean; this is an export artifact on the negative-/tiny-scale mirror meshes.
//
// A spike has a compact median vertex-distance-from-centroid but a large MAX --
// so (max / median) is high AND the absolute max is large. Genuine long
// structures (tibia, humerus, brachioradialis, sartorius...) spread uniformly:
// max/median stays ~2 no matter how long they are. Measured on the current GLB
// the two populations are cleanly separated -- every corrupted spike has
// ratio >= 5.4 with max >= 0.16 m, every genuine mesh has ratio <= 2.3 -- so the
// threshold below sits in a wide empty gap and hides only the 10 broken meshes.
// ---------------------------------------------------------------------------
const HIDE_SPIKES = true;
const SPIKE_RATIO = 3.5; // max/median vertex distance from centroid
const SPIKE_MAX_M = 0.13; // absolute max distance (m); below this a spike is too small to matter

const _sv = new THREE.Vector3();
const _scentroid = new THREE.Vector3();

/**
 * True when a mesh's rest geometry is a corrupted export spike (compact core +
 * a few flung vertices). Samples up to ~160 vertices in world space.
 */
function isCorruptedSpike(mesh: THREE.Mesh): boolean {
  const pos = mesh.geometry.getAttribute('position');
  if (!pos || pos.count < 8) return false;
  const step = Math.max(1, Math.floor(pos.count / 160));
  const pts: number[] = [];
  // Pass 1: centroid of sampled world-space verts.
  _scentroid.set(0, 0, 0);
  let n = 0;
  for (let i = 0; i < pos.count; i += step) {
    _sv.fromBufferAttribute(pos, i);
    mesh.localToWorld(_sv);
    _scentroid.add(_sv);
    n++;
  }
  if (n < 4) return false;
  _scentroid.multiplyScalar(1 / n);
  // Pass 2: distances from centroid.
  for (let i = 0; i < pos.count; i += step) {
    _sv.fromBufferAttribute(pos, i);
    mesh.localToWorld(_sv);
    pts.push(_sv.distanceTo(_scentroid));
  }
  pts.sort((a, b) => a - b);
  const median = pts[pts.length >> 1] || 1e-9;
  const max = pts[pts.length - 1] || 0;
  return max > SPIKE_MAX_M && max / median > SPIKE_RATIO;
}

/** Dominant (highest-weight) bone name of a skinned mesh, or '' if not skinned. */
function dominantBoneName(mesh: THREE.Mesh): string {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return '';
  const idx = mesh.geometry.getAttribute('skinIndex');
  const wgt = mesh.geometry.getAttribute('skinWeight');
  if (!idx || !wgt) return '';
  const acc = new Map<number, number>();
  const n = Math.min(idx.count, 200);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(i, k);
      if (w > 0) {
        const b = idx.getComponent(i, k);
        acc.set(b, (acc.get(b) ?? 0) + w);
      }
    }
  }
  let best = -1;
  let bw = 0;
  for (const [b, w] of acc) if (w > bw) { bw = w; best = b; }
  return best >= 0 && sk.skeleton.bones[best] ? sk.skeleton.bones[best].name : '';
}

// ---------------------------------------------------------------------------
// Smooth spine-muscle re-skin (premium spine compaction).
//
// Z-Anatomy binds each long spine/neck muscle RIGIDLY to ONE vertebra (and its
// duplicate copies to scattered other vertebrae). A rigid single-bone mesh
// pivots as one block: on thoracic/cervical flexion the erector's lumbar end
// swings forward while its cranial end swings back, so the belly peels off the
// curved column -- the "los musculos no estan bien compactados en la columna"
// the user is seeing. Here we re-weight EACH vertex to the TWO vertebrae that
// bracket it in height and blend linearly, so every slice of the muscle follows
// its own spinal level and the whole belly bends WITH the spine and stays tight.
//
// Rest-pose safe: the weights sum to 1 and every bone matrix is identity at the
// bind pose, so the neutral pose is pixel-identical (bindMatrix cancels); only
// the deformation under rotation changes. Returns true when it re-skinned.
// ---------------------------------------------------------------------------
const _vw = new THREE.Vector3();

function smoothSkinSpineMuscle(mesh: THREE.Mesh, vertY: Map<string, number>): boolean {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  // Vertebrae present in THIS mesh's skeleton, tagged with their rest world Y.
  const verts: { idx: number; y: number }[] = [];
  sk.skeleton.bones.forEach((b, i) => {
    const bn = b.name.replace(/_\d+$/, '');
    if (/^vert_/.test(bn)) {
      const y = vertY.get(bn);
      if (y !== undefined) verts.push({ idx: i, y });
    }
  });
  if (verts.length < 2) return false;
  verts.sort((a, b) => a.y - b.y);
  const pos = mesh.geometry.getAttribute('position');
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  if (!pos || !si || !sw) return false;
  const last = verts.length - 1;
  const yLo = verts[0].y;
  const yHi = verts[last].y;
  for (let i = 0; i < pos.count; i++) {
    _vw.fromBufferAttribute(pos, i);
    mesh.localToWorld(_vw); // rest world pos (bones = identity at bind)
    const vy = _vw.y;
    if (vy <= yLo) {
      si.setXYZW(i, verts[0].idx, 0, 0, 0);
      sw.setXYZW(i, 1, 0, 0, 0);
    } else if (vy >= yHi) {
      si.setXYZW(i, verts[last].idx, 0, 0, 0);
      sw.setXYZW(i, 1, 0, 0, 0);
    } else {
      // Largest k with verts[k].y <= vy < verts[k+1].y -> the bracketing pair.
      let k = 0;
      while (k < last && verts[k + 1].y <= vy) k++;
      const lo = verts[k];
      const hi = verts[k + 1];
      const span = hi.y - lo.y;
      const t = span > 1e-6 ? (vy - lo.y) / span : 0;
      si.setXYZW(i, lo.idx, hi.idx, 0, 0);
      sw.setXYZW(i, 1 - t, t, 0, 0);
    }
  }
  si.needsUpdate = true;
  sw.needsUpdate = true;
  return true;
}

// ---------------------------------------------------------------------------
// Forearm pronation re-skin (premium forearm rotation).
//
// The rig separates the elbow hinge (forearm_flex) from the pronation pivot
// (forearm_rot, ITS CHILD). But Z-Anatomy skinned almost the whole forearm --
// every muscle belly and the skin envelope -- rigidly to forearm_flex, leaving
// forearm_rot driving only the hand (+ the radius). So pronation/supination
// twisted the HAND at the wrist while the forearm stayed frozen ("al girar no
// se mueve todo el antebrazo"). Here we re-weight each forearm vertex between
// forearm_flex (proximal, at the elbow) and forearm_rot (distal, at the wrist)
// by its height along the forearm, so the whole forearm ROLLS progressively into
// pronation and stays tight: the distal end follows the hand, the elbow end
// stays put. Because forearm_rot is a CHILD of forearm_flex, ELBOW FLEXION is
// unchanged (both bones carry the vertex together); only the pronation twist is
// added. Rest-pose safe: weights sum to 1 and every bone matrix is identity at
// bind, so the neutral pose is pixel-identical.
// ---------------------------------------------------------------------------
function smoothTwistForearm(mesh: THREE.Mesh, elbowY: number, wristY: number): boolean {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  const flexIdx = sk.skeleton.bones.findIndex((b) => b.name.replace(/_\d+$/, '') === 'forearm_flex');
  const rotIdx = sk.skeleton.bones.findIndex((b) => b.name.replace(/_\d+$/, '') === 'forearm_rot');
  if (flexIdx < 0 || rotIdx < 0) return false;
  const pos = mesh.geometry.getAttribute('position');
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  if (!pos || !si || !sw) return false;
  const span = elbowY - wristY;
  if (span <= 1e-4) return false;
  for (let i = 0; i < pos.count; i++) {
    _vw.fromBufferAttribute(pos, i);
    mesh.localToWorld(_vw); // rest world pos (bones = identity at bind)
    let t = (elbowY - _vw.y) / span;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    // Smoothstep so the elbow end barely twists and the roll builds to the wrist.
    t = t * t * (3 - 2 * t);
    si.setXYZW(i, flexIdx, rotIdx, 0, 0);
    sw.setXYZW(i, 1 - t, t, 0, 0);
  }
  si.needsUpdate = true;
  sw.needsUpdate = true;
  return true;
}

interface DupCandidate {
  mesh: THREE.Mesh;
  center: THREE.Vector3;
  vcount: number;
  bone: string;
}

/** A kept mesh tagged with the peelable layer the DOM panel toggles it by. */
interface LayerMesh {
  mesh: THREE.Mesh;
  layer: AnatomyLayer;
  /** Hand/foot skin cap: shown regardless of the skin toggle (never vanishes). */
  distalCap: boolean;
  /**
   * For muscle meshes only: the dissection plane (1 superficial .. 3 deep, see
   * lib/muscleDepth). Kept for the selection card's plane badge. Undefined for
   * other layers.
   */
  muscleLevel?: MuscleDepthLevel;
  /**
   * Parsed muscle/tissue identity for the click-to-dissect peel: the mesh's base
   * name and side (see parseMeshName). Set for dissectable tissue (muscle +
   * connective) so applyLayers can hide a whole selected structure quickly.
   */
  base?: string;
  side?: ParsedSide;
}

/**
 * Hide redundant overlapping copies in-place. Among meshes that share a dominant
 * bone and sit within DUP_EPS of each other, keep only the one with the most
 * vertices (smoothest) and hide the others.
 */
function hideOverlapDuplicates(candidates: DupCandidate[]): number {
  let hidden = 0;
  for (let i = 0; i < candidates.length; i++) {
    const a = candidates[i];
    if (!a.mesh.visible || !a.bone) continue;
    for (let j = i + 1; j < candidates.length; j++) {
      const b = candidates[j];
      if (!b.mesh.visible || b.bone !== a.bone) continue;
      if (a.center.distanceTo(b.center) > DUP_EPS) continue;
      // Same bone, coincident -> a duplicate. Hide the lower-resolution one.
      if (b.vcount <= a.vcount) {
        b.mesh.visible = false;
      } else {
        a.mesh.visible = false;
      }
      hidden++;
      if (!a.mesh.visible) break; // a was the one hidden; stop pairing it
    }
  }
  return hidden;
}

// ---------------------------------------------------------------------------
// Distal skin-cap (hands and feet).
//
// The distal Z-Anatomy internals are the source of "no se ven como manos": the
// glTF export shatters the hand/foot into a pile of tiny bones + spike-corrupted
// finger tendons (verified by re-importing the GLB). No amount of runtime
// filtering of that pile reads as a premium hand. But the model ALSO ships a
// SKIN envelope -- clean surface patches (Palm, Dorsum, digits, wrist / Sole,
// Heel, ankle) that together form a complete, recognisable hand/foot. Body-wide
// the skin is hidden (it occludes the muscles the lab animates), but for the
// EXTREMITIES we do the opposite: show ONLY the skin cap and hide every internal
// piece in the region. Result: forearm/leg keep their muscles+bones, and the
// hand/foot read as clean, solid, gloved extremities.
//
// The region stops at the wrist / ankle so the forearm and leg keep their
// muscle detail. Coordinates are three.js-space (y-up), measured on the shipped
// GLB: hand+wrist skin spans y 0.72..0.86 at |x| > 0.18 (forearm skin begins at
// y ~= 0.865); foot+ankle skin sits at y < 0.12.
// ---------------------------------------------------------------------------

/**
 * True when a rest-pose world center lies in the hand/wrist or foot/ankle
 * cluster. Forearm and leg (muscle bellies, proximal skin) sit outside and keep
 * their normal muscle+bone rendering.
 */
function inDistalRegion(c: THREE.Vector3): boolean {
  const hand = c.y > 0.6 && c.y < 0.86 && Math.abs(c.x) > 0.18;
  const foot = c.y < 0.12;
  return hand || foot;
}

// ---------------------------------------------------------------------------
// Forearm "wire" cull.
//
// The joint-connecting CONNECTIVE layer (tendon/ligament/capsule/cartilage) was
// added so the scattered distal bones read as a connected hand -- but the hand
// is now a solid SKIN-CAP, so that rationale is gone. In the FOREARM the same
// layer renders as thin, glossy, pearly-white strands (the wrist ligaments and
// the long carpi/digitorum tendons spanning the forearm) that spill out past the
// skin cap as loose "alambres". In the arm band we therefore keep MUSCLE + BONE
// (which read as a clean, meaty forearm) and drop the connective wires. Legs and
// torso sit outside this band and keep their connective.
//
// Band (three.js y-up, measured on the shipped GLB): arms are the lateral
// columns |x| > 0.16; the forearm/wrist/elbow connective spans y 0.82..1.35
// (the wrist ligaments begin at y ~= 0.86, just above the hand cap).
// ---------------------------------------------------------------------------
function inArmBand(c: THREE.Vector3): boolean {
  return Math.abs(c.x) > 0.16 && c.y > 0.82 && c.y < 1.4;
}

// ---------------------------------------------------------------------------
// Wrist cuff.
//
// Just above the hand skin-cap, the thin DISTAL forearm muscles (the dorsal
// extensor slips -- extensor digitorum / digiti minimi / indicis / pollicis,
// abductor pollicis longus, palmaris longus, pronator quadratus) reach the wrist
// and poke through the thin skin there as loose red spindles ("cosas salidas en
// la muñeca"). We hide MUSCLE in this cuff so the wrist reads clean under the
// skin; the bone (radius/ulna, which does not poke and bridges to the hand) and
// the main forearm bellies higher up (y >= 0.96) stay. Connective here is already
// gone via inArmBand.
//
// Band (three.js y-up): laterally |x| > 0.18, from the top of the hand cap
// (y ~= 0.86) up to y < 0.96 (the distal ~10 cm of forearm).
// ---------------------------------------------------------------------------
function inWristCuff(c: THREE.Vector3): boolean {
  return Math.abs(c.x) > 0.18 && c.y >= 0.86 && c.y < 0.96;
}

// ---------------------------------------------------------------------------
// Channel: the DOM control panel commands the in-canvas rig through this.
// ---------------------------------------------------------------------------
/** One muscle to emphasize in the scene, with its role (drives the glow color)
 *  and its live activation level 0..1 (drives the glow INTENSITY, so a muscle
 *  fades in as it enters its recruitment range). Omitted level = full (1). */
export interface RigHighlight {
  muscleId: string;
  role: RomMuscleRole;
  level?: number;
}

export interface RigCommand {
  /** movementId from *Rom.ts, or null for the rest pose. */
  movementId: string | null;
  /** Which limb to drive (ignored by spine movements). */
  side: Side;
  /** Clinical angle in degrees (signed: negative drives the opposite gesture). */
  angleDeg: number;
  /**
   * Muscles to emphasize in the scene for the CURRENT phase (RigOverlays glows
   * their real meshes on the active side, colored by role). Undefined/empty =
   * nothing glows.
   */
  highlight?: RigHighlight[];
  /** Whether the didactic rotation-axis marker is shown (RigOverlays). */
  showMarkers?: boolean;
  /**
   * Force the body skin to its translucent "glass" state even when no muscle is
   * highlighted. The orthopedic-test demos set this so the posed body always
   * reads as a glass envelope with the movement visible through it (otherwise a
   * demo with no muscle glow would leave the skin fully OPAQUE and it would look
   * like it "se sale" / clips as the joint moves).
   */
  ghostSkin?: boolean;
  /**
   * Active pathological preset id (P1 "normal vs patologico"), or null/undefined
   * for the healthy model. Only the elevation chain consumes it: it modifies the
   * scapulohumeral rhythm the same shoulderChain drives (see
   * src/data/pathologies.ts), so the rig moves the altered pattern.
   */
  pathologyId?: string | null;
  /**
   * Muscle/structure ids IMPLICATED by the active pathology. RigOverlays gives
   * these a distinct pulsing "injured" emphasis in the scene (on top of the normal
   * activation glow), so the user sees WHERE the problem is, not just reads it in
   * the readout banner. Empty/undefined = nothing implicated.
   */
  implicated?: string[];
  /**
   * MANUAL RESISTANCE mode. When true, RigOverlays draws a contact ring on the
   * distal segment + a force arrow (labelled "Resistencia") OPPOSING the gesture
   * -- so the lab shows the resisted interaction a physio actually performs
   * (manual muscle test / resisted isometric), not just the free movement. Only
   * the limb joints (shoulder/elbow/knee) draw it.
   */
  resistance?: boolean;
}

type Listener = (s: RigCommand) => void;

// ---------------------------------------------------------------------------
// Layer channel: the DOM layer panel peels anatomy layers on/off through this.
//
// Every visible rig mesh is tagged with one AnatomyLayer at load time; toggling
// a layer here flips the .visible flag on that whole set. Default is a dressed
// body (skin ON, with muscle + bone underneath so peeling the skin instantly
// reveals them). Connective starts OFF -- it reads as loose "wires" and the
// hands/feet are already solved by the always-on skin cap.
// ---------------------------------------------------------------------------
export interface LayerState {
  skin: boolean;
  muscle: boolean;
  bone: boolean;
  connective: boolean;
}

type LayerListener = (s: LayerState) => void;

export const layerChannel = (() => {
  let state: LayerState = {
    skin: true,
    muscle: true,
    bone: true,
    connective: false,
  };
  const listeners = new Set<LayerListener>();
  return {
    get: (): LayerState => state,
    set: (patch: Partial<LayerState>): void => {
      state = { ...state, ...patch };
      listeners.forEach((l) => l(state));
    },
    subscribe: (l: LayerListener): (() => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
})();

export const rigChannel = (() => {
  let state: RigCommand = {
    movementId: null,
    side: 'R',
    angleDeg: 0,
    highlight: [],
    showMarkers: true,
  };
  const listeners = new Set<Listener>();
  return {
    get: (): RigCommand => state,
    set: (patch: Partial<RigCommand>): void => {
      state = { ...state, ...patch };
      listeners.forEach((l) => l(state));
    },
    subscribe: (l: Listener): (() => void) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
})();

// ---------------------------------------------------------------------------
// Component.
// ---------------------------------------------------------------------------
export function RigModel({ onReady }: { onReady?: () => void } = {}): JSX.Element {
  const { scene } = useGLTF(RIG_URL) as unknown as { scene: THREE.Group };

  // Cache bones per armature (boneName -> object) and capture each bone's rest
  // quaternion ONCE, so every movement starts from the true neutral pose and we
  // can fully restore on unmount.
  const rig = useMemo(() => {
    const byArmature = new Map<string, Map<string, THREE.Object3D>>();
    const restQuat = new Map<THREE.Object3D, THREE.Quaternion>();
    // Rest-pose WORLD matrices, used by the shoulder-yoke carry to compute the
    // vertebra's rest->posed delta and where the shoulder root should ride.
    const restWorld = new Map<THREE.Object3D, THREE.Matrix4>();
    // Rest LOCAL TRS of the shoulder armature roots, so the carry can restore them
    // exactly when a movement no longer displaces the spine.
    const restRootLocal = new Map<
      THREE.Object3D,
      { pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3 }
    >();
    // World matrices must be current before we read them for the carry.
    scene.updateMatrixWorld(true);
    for (const armName of ARMATURE_NAMES) {
      const root = scene.getObjectByName(armName);
      if (!root) {
        // eslint-disable-next-line no-console
        console.warn(`[RigModel] armature not found: ${armName}`);
        continue;
      }
      const bones = new Map<string, THREE.Object3D>();
      // Only bones live under an armature root. CRITICAL: three's GLTFLoader
      // makes node names unique by appending "_1", "_2", ... when they collide
      // between skins -- and our bone names are identical on both sides. So the
      // second-loaded side becomes "humerus_gh_1", etc. We key by the BASE name
      // (suffix stripped); base names are unique within one armature subtree, so
      // the lookup works whichever side got renamed.
      root.traverse((o) => {
        const base = o.name.replace(/_\d+$/, '');
        if (!bones.has(base)) bones.set(base, o);
        if (!restQuat.has(o)) restQuat.set(o, o.quaternion.clone());
      });
      byArmature.set(armName, bones);
      // Capture the root's rest world matrix + local TRS for the carry.
      restWorld.set(root, root.matrixWorld.clone());
      restRootLocal.set(root, {
        pos: root.position.clone(),
        quat: root.quaternion.clone(),
        scale: root.scale.clone(),
      });
    }
    // Capture the shoulder-anchor vertebra's rest world matrix.
    const anchor = byArmature.get('Spine_Armature')?.get(SHOULDER_SPINE_ANCHOR);
    if (anchor) restWorld.set(anchor, anchor.matrixWorld.clone());
    return { byArmature, restQuat, restWorld, restRootLocal };
  }, [scene]);

  // Tagged, kept meshes grouped by peelable layer. Built once in the prepare
  // pass and flipped visible/hidden by the layer channel. Rebuilt from the
  // per-mesh userData tags on a remount (the scene is a drei-cached singleton, so
  // the expensive style pass runs only the first time this scene is seen).
  const layerMeshesRef = useRef<LayerMesh[]>([]);

  // Glass-skin fade. bodySkinMatRef is the body skin's OWN material (distinct
  // from the distal caps'); skinFadeRef is the eased 0..1 fade amount and
  // skinFadeTargetRef its target (1 = ghosted while muscles are highlighted).
  const bodySkinMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const skinFadeRef = useRef(0);
  const skinFadeTargetRef = useRef(0);

  const applyLayers = useCallback((st: LayerState = layerChannel.get()) => {
    // Structures peeled away by the click-to-dissect panel (composed ON TOP of
    // the tissue toggles, so a hidden muscle stays hidden regardless of toggles).
    const hidden = dissectChannel.get().hidden;
    for (const lm of layerMeshesRef.current) {
      // The distal hand/foot skin cap is ALWAYS shown (its internals are broken
      // and unusable), so the extremities never vanish while peeling body layers.
      if (lm.distalCap) {
        lm.mesh.visible = true;
        continue;
      }
      const layerOn = st[lm.layer];
      // Dissection only removes muscle/connective (never bone/skin), and only
      // when that tissue is on to begin with.
      const dissected =
        layerOn &&
        (lm.layer === 'muscle' || lm.layer === 'connective') &&
        lm.base !== undefined &&
        hidden.length > 0 &&
        meshIsDissected(lm.base, lm.side ?? 'center', hidden);
      lm.mesh.visible = layerOn && !dissected;
    }
  }, []);

  // ---- Click-to-dissect: pick a muscle, then peel it away (see dissectChannel).
  // Runtime mesh name -> clinical Muscle, so a click resolves to a real muscle
  // name/note (and its full mesh set). Built once from the loaded scene; falls
  // back to a prettified base name for muscles not yet in the catalog.
  const muscleByMeshName = useMemo(() => {
    const all: Muscle[] = Object.values(MUSCLES_BY_REGION).flat();
    const names: string[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) names.push(m.name);
    });
    return buildMuscleResolution(all, names).muscleByMeshName;
  }, [scene]);

  // Selection highlight: a cool emissive tint on the currently-selected structure
  // so the user sees exactly what "Diseccionar" will remove. Cloned per mesh (like
  // the RigOverlays glow) and restored on deselect.
  const selGlowRef = useRef<Map<THREE.Mesh, THREE.Material>>(new Map());
  const applySelectionHighlight = useCallback((sel: ReturnType<typeof makeSelection> | null) => {
    for (const [mesh, orig] of selGlowRef.current) {
      const cur = mesh.material as THREE.Material;
      mesh.material = orig;
      if (cur !== orig) (cur as THREE.Material).dispose?.();
    }
    selGlowRef.current.clear();
    if (!sel || !sel.dissectable) return;
    for (const lm of layerMeshesRef.current) {
      if (lm.base === undefined || !sel.bases.includes(lm.base)) continue;
      const s = lm.side ?? 'center';
      const match = sel.side === 'center' || s === sel.side || s === 'center';
      if (!match || !lm.mesh.visible) continue;
      const src = lm.mesh.material as THREE.MeshStandardMaterial;
      const clone = (src.clone ? src.clone() : new THREE.MeshStandardMaterial()) as THREE.MeshStandardMaterial;
      if ('emissive' in clone) {
        clone.emissive = new THREE.Color(SELECTION_EMISSIVE);
        clone.emissiveIntensity = 0.55;
      }
      selGlowRef.current.set(lm.mesh, src);
      lm.mesh.material = clone;
    }
  }, []);

  // Single click selects the frontmost visible muscle/connective mesh; a click on
  // bone, skin or empty space clears the selection.
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      for (const hit of e.intersections) {
        const m = hit.object as THREE.Mesh;
        if (!m.isMesh || !m.visible) continue;
        const lyr = m.userData.rigLayer as string | undefined;
        if (lyr === 'muscle' || lyr === 'connective') {
          dissectChannel.setSelection(
            makeSelection(m.name, lyr as DissectLayer, muscleByMeshName.get(m.name)),
          );
          return;
        }
        if (lyr === 'skin') continue; // see through the glass shell to the muscle
        break; // bone / other solid in front -> nothing to dissect here
      }
      dissectChannel.setSelection(null);
    },
    [muscleByMeshName],
  );

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    const over = e.intersections.some((h) => {
      const m = h.object as THREE.Mesh;
      const l = m.userData.rigLayer as string | undefined;
      return m.isMesh && m.visible && (l === 'muscle' || l === 'connective');
    });
    if (over) document.body.style.cursor = 'pointer';
  }, []);
  const handlePointerOut = useCallback(() => {
    document.body.style.cursor = 'default';
  }, []);

  // React to the dissect panel: re-apply visibility (hidden set changed) and move
  // the selection highlight.
  useEffect(() => {
    const onDissect = (s = dissectChannel.get()) => {
      applyLayers();
      applySelectionHighlight(s.selection);
    };
    onDissect();
    const unsub = dissectChannel.subscribe(onDissect);
    return () => {
      unsub();
      applySelectionHighlight(null);
      document.body.style.cursor = 'default';
    };
  }, [applyLayers, applySelectionHighlight]);

  // PREMIUM LOOK + LAYER TAGGING (one-time per cached scene). The raw rig GLB
  // renders near-white with floating Z-Anatomy text/label panels, and ships heavy
  // MeshPhysicalMaterials (clearcoat/specular) -- 1300+ of those is a
  // shader-compile storm and a fragment-rate sink. We REPLACE every material with
  // one lightweight MeshStandardMaterial (single shared shader program) tinted
  // from the SAME clinical atlas palette the master model uses (muscles red, bone
  // ivory), share materials by color so the GPU flips state rarely, and TAG every
  // kept mesh with its peelable layer (skin/muscle/bone/connective) so the layer
  // panel can toggle whole tissues. Non-anatomical reference geometry and the
  // broken distal internals are tagged 'hidden' (permanently off).
  const preparedRef = useRef(false);
  useEffect(() => {
    if (preparedRef.current) return;
    preparedRef.current = true;
    // World matrices must be current before we read mesh centers for dedup.
    scene.updateMatrixWorld(true);

    if (!scene.userData.__rigPrepared) {
      // ---- FIRST time this scene is seen: full style + layer-tag pass. ----
      const dupCandidates: DupCandidate[] = [];
      // PREMIUM per-tissue shading. One lightweight MeshStandardMaterial per
      // (color, tissue): bone reads as polished ivory, muscle stays matte and
      // wet-looking, connective glossy. Cached by hex+tissue so the GPU still
      // shares a handful of programs across 1100+ meshes.
      // G1 premium pass: muscle reads flat/uniform on a dark stage. Lowering its
      // roughness a touch and letting it catch more of the studio IBL (env) gives
      // the fibers a subtle wet sheen and dimensional highlights that separate belly
      // from belly, without going plasticky. Bone/connective unchanged (already read
      // well). Reversible: muscle was roughness 0.72 / env 0.22.
      const TISSUE_PBR: Record<TissueClass, { roughness: number; metalness: number; env: number }> = {
        bone: { roughness: 0.42, metalness: 0.0, env: 0.7 },
        muscle: { roughness: 0.66, metalness: 0.0, env: 0.32 },
        connective: { roughness: 0.3, metalness: 0.0, env: 0.55 },
        other: { roughness: 0.6, metalness: 0.0, env: 0.35 },
      };
      const matByKey = new Map<string, THREE.MeshStandardMaterial>();
      const flatMat = (hex: number, tissue: TissueClass): THREE.MeshStandardMaterial => {
        const key = `${hex}|${tissue}`;
        let m = matByKey.get(key);
        if (!m) {
          const pbr = TISSUE_PBR[tissue];
          m = new THREE.MeshStandardMaterial({
            color: hex,
            roughness: pbr.roughness,
            metalness: pbr.metalness,
            envMapIntensity: pbr.env,
          });
          matByKey.set(key, m);
        }
        return m;
      };
      const skinMat = new THREE.MeshPhysicalMaterial({
        color: 0xd7a88f,
        roughness: 0.62,
        metalness: 0.0,
        envMapIntensity: 0.35,
        sheen: 0.4,
        sheenRoughness: 0.8,
        sheenColor: new THREE.Color(0xffd8c2),
        side: THREE.DoubleSide,
      });
      // Body skin gets its OWN material instance so it can fade to a translucent
      // "glass skin" during movement highlights WITHOUT fading the distal
      // hand/foot caps (which stay solid on skinMat). transparent stays on so the
      // fade only varies opacity/depthWrite (no per-frame shader recompile).
      const bodySkinMat = skinMat.clone();
      bodySkinMat.transparent = true;
      bodySkinMat.depthWrite = true;
      bodySkinMatRef.current = bodySkinMat;
      const swap = (mesh: THREE.Mesh, next: THREE.Material): void => {
        const old = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mesh.material = next;
        old.forEach((m) => m && m.dispose());
      };

      // SPINE-MUSCLE BINDING FIX (precompute). The Z-Anatomy spine/neck muscles
      // ship with each mesh rigidly bound to ONE vertebra, and their duplicate
      // copies to DIFFERENT vertebrae scattered across the whole spine (e.g. the
      // trapezius has copies on C1 AND T8, levator scapulae on C1..T3). As the
      // cervical/spine chain rotates, the copies diverge and the muscle tears out
      // of the neck ("los musculos se salen, no es fiel"). The mesh GEOMETRY is
      // always in the right place -- only the driving bone is wrong -- so below we
      // rebind each spine muscle to the vertebra it physically sits ON (nearest
      // rest-pose center). Coincident copies then agree (the dedup collapses them)
      // and every muscle follows the level it lies on: faithful, no spill. Rigid
      // per-vertebra (no per-vertex blend) but far better than the tearing.
      const spineVerts: { name: string; pos: THREE.Vector3 }[] = [];
      const spineRoot = scene.getObjectByName('Spine_Armature');
      if (spineRoot) {
        spineRoot.traverse((o) => {
          const bn = o.name.replace(/_\d+$/, '');
          if (/^vert_/.test(bn) && !spineVerts.some((v) => v.name === bn)) {
            spineVerts.push({ name: bn, pos: o.getWorldPosition(new THREE.Vector3()) });
          }
        });
      }
      // Rest world Y per vertebra, for the smooth per-vertex spine re-skin below.
      const vertYByName = new Map<string, number>();
      for (const v of spineVerts) vertYByName.set(v.name, v.pos.y);
      const nearestVert = (c: THREE.Vector3): string | null => {
        let best: string | null = null;
        let bd = Infinity;
        for (const v of spineVerts) {
          const d = c.distanceToSquared(v.pos);
          if (d < bd) { bd = d; best = v.name; }
        }
        return best;
      };

      // --- Arm rebind geometry (elbow-flexion + forearm-pronation fixes). ---
      // Elbow (forearm_flex) and wrist (hand_flex) world heights from the shoulder
      // armatures, so the thresholds below survive a rig re-export instead of
      // being hardcoded. Both arms share ~the same heights; take the lower.
      let elbowY = Infinity;
      let wristY = Infinity;
      for (const side of ['R', 'L'] as const) {
        const sr = scene.getObjectByName(`Shoulder_Armature_${side}`);
        sr?.traverse((o) => {
          const bn = o.name.replace(/_\d+$/, '');
          if (bn === 'forearm_flex') elbowY = Math.min(elbowY, o.getWorldPosition(new THREE.Vector3()).y);
          else if (bn === 'hand_flex') wristY = Math.min(wristY, o.getWorldPosition(new THREE.Vector3()).y);
        });
      }
      const ELBOW_Y = isFinite(elbowY) ? elbowY : 1.1;
      const WRIST_Y = isFinite(wristY) ? wristY : 0.86;
      // Skin/soft-tissue whose center sits this far ABOVE the elbow is upper-arm
      // (arm proper, not the elbow crease) and must ride the humerus, not the
      // forearm. Half the arm skin patches ship mis-bound to forearm_flex.
      const UPPER_ARM_Y = ELBOW_Y + 0.08;

      // Rewrite every vertex of a skinned mesh to ride ONE bone (weight 1). Rest
      // pose is preserved (bone*boneInverse = identity at bind). Returns false if
      // the mesh is not skinned or the bone is absent from its own skeleton.
      const rigidBindTo = (mesh: THREE.Mesh, boneBase: string): boolean => {
        const sk = mesh as THREE.SkinnedMesh;
        if (!sk.isSkinnedMesh || !sk.skeleton) return false;
        const bi = sk.skeleton.bones.findIndex((b) => b.name.replace(/_\d+$/, '') === boneBase);
        if (bi < 0) return false;
        const si = mesh.geometry.getAttribute('skinIndex');
        const sw = mesh.geometry.getAttribute('skinWeight');
        if (!si || !sw) return false;
        for (let i = 0; i < si.count; i++) {
          si.setXYZW(i, bi, 0, 0, 0);
          sw.setXYZW(i, 1, 0, 0, 0);
        }
        si.needsUpdate = true;
        sw.needsUpdate = true;
        return true;
      };

      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const first = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const matName = first?.name ?? '';
        const base = colorForMaterial(matName);
        // Z-Anatomy ORGANIZATIONAL CONTAINERS (the ".g" group nodes and
        // "General_terms") are aggregate overlays skinned to one arbitrary bone;
        // they duplicate the real meshes and swing across the scene. Always off.
        const isGroupContainer =
          /g0\d\d$/.test(mesh.name) ||
          /_system/i.test(mesh.name) ||
          /^General[_ ]terms$/i.test(mesh.name);
        if (base === null || isGroupContainer) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        const center = meshWorldCenter(mesh);
        // DISTAL SKIN-CAP: in the hand/foot region show ONLY the skin envelope
        // and permanently hide every shattered internal piece.
        if (inDistalRegion(center)) {
          if (materialIsSkin(matName)) {
            swap(mesh, skinMat);
            mesh.userData.rigLayer = 'skin';
            mesh.userData.rigDistalCap = true;
          } else {
            mesh.visible = false;
            mesh.userData.rigLayer = 'hidden';
          }
          return;
        }
        const layer = layerForMaterial(matName);
        // Non-anatomy (nerve, vessel, fascia, bursa, organ, ...) is never shown.
        if (layer === null) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        // BODY SKIN: the whole-body envelope. Shares the premium skin material;
        // toggled as the 'skin' layer (body skin peels; the distal cap does not).
        if (layer === 'skin') {
          // Fix the arm skin binding before it becomes body skin. Half the
          // upper-arm patches ship on forearm_flex and swing about the elbow on
          // flexion (they belong on the humerus); the forearm skin below the
          // elbow is blended toward forearm_rot so it ROLLS with pronation.
          if (dominantBoneName(mesh) === 'forearm_flex') {
            if (center.y > UPPER_ARM_Y) rigidBindTo(mesh, 'humerus_gh');
            else if (center.y < ELBOW_Y) smoothTwistForearm(mesh, ELBOW_Y, WRIST_Y);
          }
          swap(mesh, bodySkinMat);
          mesh.userData.rigLayer = 'skin';
          mesh.userData.rigDistalCap = false;
          return;
        }
        // FOREARM WIRE CULL: the pearly connective strands (wrist ligaments +
        // long forearm tendons) spill past the skin cap as loose "alambres".
        // Permanently hidden in the arm band; legs/torso keep their connective.
        if (layer === 'connective' && inArmBand(center)) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        // WRIST CUFF: the thin distal extensor/flexor slips poke through the
        // wrist skin as loose red spindles. Hide MUSCLE here (bone + proximal
        // bellies stay) so the wrist reads clean.
        if (layer === 'muscle' && inWristCuff(center)) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        // EXTRINSIC DIGITAL MUSCLES of the forearm (flexor/extensor digitorum,
        // digiti minimi, indicis, the pollicis group, palmaris longus). In the
        // forearm these are almost all long, thin TENDON bound to the proximal
        // forearm; their distal ends are poorly skinned, so when the elbow flexes
        // or the forearm rotates in the lab they fling OUT of the arm as loose
        // colored "puntas" poking past the skin (reported on the left forearm; an
        // offline pose sim showed them 13-15 cm outside the envelope, the worst
        // offenders by far). Their belly sits ABOVE the wrist cuff, so the
        // location-based culls above miss them. They do not act on the elbow and
        // add little to the meaty forearm read, so hide them in the arm band -- the
        // carpi flexors/extensors, brachioradialis, pronators, biceps, brachialis
        // and triceps bellies all stay. Gated to inArmBand so the FOOT's extensor/
        // flexor digitorum (leg) are untouched.
        if (
          layer === 'muscle' &&
          inArmBand(center) &&
          /digitorum|digiti minimi|indicis|pollicis|palmaris/i.test(mesh.name)
        ) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        // EXTRINSIC DIGITAL MUSCLES of the LEG (flexor/extensor digitorum longus,
        // flexor/extensor hallucis longus + the foot brevis slips). SAME failure as
        // the forearm's above: their long thin tendons cross the ankle poorly bound
        // to foot_flex, so on ankle inversion/eversion/dorsi/plantarflexion they
        // fling OUT of the leg as loose colored "puntas" past the skin (reported on
        // the ankle). The foot skin-cap (y < 0.12) hides the toe parts, but the
        // ankle-crossing tendons sit just above it and escape it. Hide these whole
        // toe muscles in the leg (y < 0.6, so the FOREARM digitorum handled above is
        // untouched); the meaty ankle movers -- tibialis anterior/posterior, the
        // fibularis/peroneus group and the triceps surae -- all stay.
        if (
          layer === 'muscle' &&
          center.y < 0.6 &&
          /(digitorum|hallucis)_?(longus|brevis)/i.test(mesh.name)
        ) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        // Drop the few export-corrupted spike meshes outside the distal cap.
        if (HIDE_SPIKES && isCorruptedSpike(mesh)) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        // ARM-MUSCLE BELLY REBIND. The biarticular upper-arm muscles (biceps
        // brachii, brachialis, triceps brachii) ship MIS-BOUND: their belly is
        // weighted to the FOREARM (forearm_flex/forearm_rot) and their Z-Anatomy
        // origin duplicates to a THORACIC vertebra (vert_T2/T3/T5) -- not the
        // humerus. So on elbow flexion/extension the forearm-bound copy swings off
        // the arm while the spine-bound copy stays put and the mesh tears (the
        // reported "el biceps no se queda fijo" en la extension del codo). The
        // belly's home is the humerus: rebind each such mesh RIGIDLY to humerus_gh
        // so the whole belly follows the upper arm and stays fixed through the
        // elbow arc (it still moves with the shoulder). Rewriting skinIndex keeps
        // the rest pose identical (bone*boneInverse = identity at bind). The stray
        // thoracic-bound duplicates have no humerus in their (Spine) skeleton ->
        // hide them; a correctly-bound copy on the shoulder skin remains. After the
        // rebind every kept copy shares humerus_gh, so the dedup below collapses
        // the redundant overlaps automatically.
        if (layer === 'muscle') {
          const ln = mesh.name.toLowerCase().replace(/[._\s]+/g, ' ');
          const isArmBelly =
            ln.includes('biceps brachii') ||
            // The triceps LONG head crosses the shoulder (origin on the scapular
            // infraglenoid tubercle), re-weighted in the GLB so that origin rides
            // the scapula; rebinding it rigidly to the humerus would tear that
            // origin off during abduction, so EXCLUDE it (the lateral/medial heads
            // don't cross the shoulder and still rebind for the elbow).
            (ln.includes('triceps brachii') && !ln.includes('long head')) ||
            (ln.includes('brachialis') && !ln.includes('coraco'));
          if (isArmBelly) {
            // The upper-arm belly rides the humerus, not the forearm, so it stays
            // fixed through the elbow arc. rigidBindTo fails only for the stray
            // thoracic-bound duplicates (no humerus in their Spine skeleton) ->
            // hide those; a correctly-bound shoulder copy remains.
            if (!rigidBindTo(mesh, 'humerus_gh')) {
              mesh.visible = false;
              mesh.userData.rigLayer = 'hidden';
              return;
            }
          } else if (dominantBoneName(mesh) === 'forearm_flex' && center.y < ELBOW_Y) {
            // Forearm muscle bellies roll into pronation/supination with the
            // distal forearm (blended toward forearm_rot); flexion is unchanged.
            smoothTwistForearm(mesh, ELBOW_Y, WRIST_Y);
          }
        }
        // Muscle / bone / connective: recolor + tag with its layer.
        const dom = dominantBoneName(mesh);
        // SPINE-MUSCLE SMOOTH RE-SKIN (see helper + precompute above). A spine-
        // driven muscle (dominant bone is a vertebra) is re-weighted per vertex
        // across the two vertebrae that bracket it, so it bends WITH the spine
        // curve and stays compacted instead of pivoting as a rigid block and
        // spilling off the column. Rest pose is preserved (weights sum to 1 and
        // bone matrices are identity at bind). For dedup keying we still tag the
        // mesh with the vertebra nearest its center: re-skinned copies of the same
        // muscle share weights AND that key, so the dedup collapses the redundant
        // Z-Anatomy duplicates as before.
        let effBone = dom;
        if (layer === 'muscle' && dom.startsWith('vert_')) {
          if (smoothSkinSpineMuscle(mesh, vertYByName)) {
            effBone = nearestVert(center) ?? dom;
          }
        }
        const hex = colorForMaterialMesh(matName, mesh.name) ?? base;
        const tissue = tissueClassForMaterial(matName);
        swap(mesh, flatMat(hex, tissue));
        mesh.userData.rigLayer = layer;
        mesh.userData.rigDistalCap = false;
        // Tag muscles with their dissection plane (1..3) so the Capas panel can
        // peel them superficial -> deep (see lib/muscleDepth). Muscle tissue only.
        if (layer === 'muscle') {
          mesh.userData.muscleLevel = muscleDepthLevel(mesh.name);
        }
        dupCandidates.push({
          mesh,
          center,
          vcount: mesh.geometry.getAttribute('position')?.count ?? 0,
          bone: effBone,
        });
      });
      // Remove the doubled Z-Anatomy bones that Z-fight into a speckled mess.
      hideOverlapDuplicates(dupCandidates);
      // Dedup losers become permanently hidden (never resurrected by a toggle).
      for (const c of dupCandidates) if (!c.mesh.visible) c.mesh.userData.rigLayer = 'hidden';
      scene.userData.__rigPrepared = true;
    }

    // ---- Always (first pass OR remount): rebuild the tagged layer set from the
    // per-mesh userData tags, then apply the current layer toggles. ----
    const list: LayerMesh[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      let lyr = mesh.userData.rigLayer as AnatomyLayer | 'hidden' | undefined;
      if (lyr === undefined) return;
      // Re-apply the forearm digital-muscle cull here too, not only in the one-time
      // prepare pass. The prepare pass is guarded by scene.userData.__rigPrepared,
      // so on a CACHED scene (HMR, or navigating back into the lab) it is skipped --
      // a scene first prepared by older code would keep showing these muscles. This
      // block runs on EVERY mount, so the cull sticks regardless. Cheap: only meshes
      // whose NAME matches are geometry-checked. See the prepare-pass cull for why.
      if (
        lyr === 'muscle' &&
        /digitorum|digiti minimi|indicis|pollicis|palmaris/i.test(mesh.name) &&
        inArmBand(meshWorldCenter(mesh))
      ) {
        mesh.userData.rigLayer = 'hidden';
        lyr = 'hidden';
      }
      if (lyr === 'hidden') {
        mesh.visible = false;
        return;
      }
      const distalCap = mesh.userData.rigDistalCap === true;
      // Recover the body skin material on a remount (the one-time style pass that
      // created it is skipped when the cached scene is reused).
      if (lyr === 'skin' && !distalCap) {
        bodySkinMatRef.current = mesh.material as THREE.MeshStandardMaterial;
      }
      // Dissection-plane tag for the selection card. Back-fill it here for a
      // CACHED scene first prepared by older code (which never wrote the tag), so
      // it works without a re-export. Only muscle meshes carry it.
      let muscleLevel: MuscleDepthLevel | undefined;
      if (lyr === 'muscle') {
        muscleLevel = mesh.userData.muscleLevel as MuscleDepthLevel | undefined;
        if (!muscleLevel) {
          muscleLevel = muscleDepthLevel(mesh.name);
          mesh.userData.muscleLevel = muscleLevel;
        }
      }
      // Parsed base + side for the click-to-dissect peel (dissectable tissue only).
      let base: string | undefined;
      let side: ParsedSide | undefined;
      if (lyr === 'muscle' || lyr === 'connective') {
        const parsed = parseMeshName(mesh.name);
        base = parsed.base;
        side = parsed.side;
      }
      list.push({ mesh, layer: lyr, distalCap, muscleLevel, base, side });
    });
    layerMeshesRef.current = list;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as unknown as { __rigScene?: THREE.Object3D }).__rigScene = scene;
    applyLayers(layerChannel.get());
    // Signal the viewer that the rig is loaded AND styled, so it can dismiss the
    // loader. Gating on drei's load progress alone hangs on a CACHED reload.
    onReady?.();
  }, [scene, onReady, applyLayers]);

  // Peel layers on demand: the DOM layer panel writes layerChannel, we flip the
  // tagged meshes' visibility to match.
  useEffect(() => {
    applyLayers(layerChannel.get());
    return layerChannel.subscribe(applyLayers);
  }, [applyLayers]);

  // Bones currently rotated away from rest, so the next command can reset just
  // those before applying (one movement at a time, no accumulation).
  const touchedRef = useRef<Set<THREE.Object3D>>(new Set());
  // Shoulder armature roots currently carried away from rest by a spine movement,
  // so the next command can restore them before applying.
  const movedRootsRef = useRef<Set<THREE.Object3D>>(new Set());

  const apply = useCallback(
    (cmd: RigCommand) => {
      const { byArmature, restQuat, restWorld, restRootLocal } = rig;

      // Glass skin: fade the body skin out while muscles are highlighted (or when
      // a demo forces it) so the movement reads through, and back to solid when
      // nothing is active. The useFrame below eases toward this target.
      skinFadeTargetRef.current =
        (cmd.highlight?.length ?? 0) > 0 || cmd.ghostSkin ? 1 : 0;

      // Reset everything we touched last time back to rest.
      for (const b of touchedRef.current) {
        const rq = restQuat.get(b);
        if (rq) b.quaternion.copy(rq);
      }
      touchedRef.current.clear();
      // Restore any shoulder armature roots carried by the previous spine command.
      for (const r of movedRootsRef.current) {
        const rl = restRootLocal.get(r);
        if (rl) {
          r.position.copy(rl.pos);
          r.quaternion.copy(rl.quat);
          r.scale.copy(rl.scale);
        }
      }
      movedRootsRef.current.clear();

      const rotate = (bone: THREE.Object3D, axis: RigAxis, rad: number): void => {
        const rq = restQuat.get(bone);
        if (rq) bone.quaternion.copy(rq);
        else bone.quaternion.identity();
        // Rotate about the bone's LOCAL axis, on top of the rest orientation.
        bone.rotateOnAxis(AXIS_VEC[axis], rad);
        touchedRef.current.add(bone);
      };

      const done = () => scene.updateMatrixWorld(true);

      // Make each latissimus helper bone (Spine_Armature) take its side's humerus
      // WORLD rotation, so the lats' humeral-insertion fibers ride the arm. Runs
      // every command: at rest the humerus is at rest, so the helper is too (the
      // lats returns to its spine-bound shape). Requires world matrices current.
      const _qHum = new THREE.Quaternion();
      const _qParent = new THREE.Quaternion();
      const driveLatsHelpers = () => {
        const spineBones = byArmature.get('Spine_Armature');
        if (!spineBones) return;
        // helper bone -> the shoulder armature whose humerus it follows (the
        // mesh .l/.r vs armature _R/_L naming is mirrored; verified by X sign).
        const LATS_PAIRS: ReadonlyArray<[string, string]> = [
          ['latshum_l', 'Shoulder_Armature_R'],
          ['latshum_r', 'Shoulder_Armature_L'],
        ];
        for (const [helperName, armName] of LATS_PAIRS) {
          const helper = spineBones.get(helperName);
          const hum = byArmature.get(armName)?.get('humerus_gh');
          if (!helper || !hum || !helper.parent) continue;
          hum.getWorldQuaternion(_qHum);
          helper.parent.getWorldQuaternion(_qParent);
          helper.quaternion.copy(_qParent.invert().multiply(_qHum));
          touchedRef.current.add(helper);
        }
      };

      // SHOULDER-YOKE CARRY. Rigidly ride each shoulder armature root on the
      // rest->posed delta of the anchor vertebra (vert_T3), so the arms stay
      // welded to the upper thorax while the spine bends. Call AFTER the spine
      // rotations are on the rig and world matrices are refreshed; done() below
      // then propagates the moved roots to the arm skinned meshes.
      const carryShouldersWithSpine = (): void => {
        const spineBones = byArmature.get('Spine_Armature');
        const anchor = spineBones?.get(SHOULDER_SPINE_ANCHOR);
        const anchorRest = anchor ? restWorld.get(anchor) : undefined;
        if (!anchor || !anchorRest) return;
        // delta = anchorPosed * anchorRest^-1 (maps rest world -> posed world).
        const delta = new THREE.Matrix4()
          .copy(anchor.matrixWorld)
          .multiply(new THREE.Matrix4().copy(anchorRest).invert());
        for (const side of ['R', 'L'] as Side[]) {
          const root = scene.getObjectByName(
            resolveArmatureName('Shoulder_Armature', side),
          );
          const rootRest = root ? restWorld.get(root) : undefined;
          if (!root || !rootRest) continue;
          const targetWorld = new THREE.Matrix4().copy(delta).multiply(rootRest);
          // Convert the target world matrix into the root's local space.
          const parent = root.parent;
          const localM = parent
            ? new THREE.Matrix4()
                .copy(parent.matrixWorld)
                .invert()
                .multiply(targetWorld)
            : targetWorld;
          localM.decompose(root.position, root.quaternion, root.scale);
          movedRootsRef.current.add(root);
        }
      };

      // Seat the ACTIVE arm in front of the (now skinned) trunk so it never clips
      // through it. Composes on top of whatever the movement left on the humerus;
      // if the movement didn't touch it (e.g. an elbow movement), reset to rest
      // first. `factor` (0..1) scales the lift so it fades out at high elevation.
      // Runs even at 0 deg, so selecting an arm movement clears the arm at the
      // very start of its range.
      const clearActiveArm = (side: Side, factor: number) => {
        if (factor <= 0) return;
        const sb = byArmature.get(resolveArmatureName('Shoulder_Armature', side));
        const h = sb?.get('humerus_gh');
        if (!h) return;
        if (!touchedRef.current.has(h)) {
          const rq = restQuat.get(h);
          if (rq) h.quaternion.copy(rq);
          else h.quaternion.identity();
          touchedRef.current.add(h);
        }
        h.rotateOnAxis(AXIS_VEC.x, ARM_CLEARANCE_SIGN[side] * ARM_CLEARANCE_DEG * factor * DEG2RAD);
      };

      const ctrl = cmd.movementId ? getBoneControl(cmd.movementId) : undefined;
      const isArmMovement =
        !!ctrl &&
        (ctrl.kind === 'chain' ||
          (ctrl.kind === 'joint' && ctrl.armatureBase === 'Shoulder_Armature'));
      // Elevation movements (abduction chain, shoulder flexion) lift the arm clear
      // on their own as the angle grows, so fade the forward clearance out above
      // ARM_CLEARANCE_FADE_DEG. Rotations and elbow movements keep the arm at the
      // side the whole time -> full clearance.
      const armClearanceFactor = (): number => {
        if (!ctrl) return 0;
        const elevationMovement =
          ctrl.kind === 'chain' ||
          (ctrl.kind === 'joint' &&
            ctrl.armatureBase === 'Shoulder_Armature' &&
            ctrl.bone === 'humerus_gh' &&
            ctrl.axis === 'x');
        if (!elevationMovement) return 1;
        const f = (ARM_CLEARANCE_FADE_DEG - cmd.angleDeg) / ARM_CLEARANCE_FADE_DEG;
        return f < 0 ? 0 : f > 1 ? 1 : f;
      };

      // Apply the clinical rotation. Skipped at the neutral 0 deg and for
      // unsupported movements -- the arm clearance below still runs.
      if (ctrl && ctrl.kind !== 'unsupported' && cmd.angleDeg !== 0) {
        if (ctrl.kind === 'joint') {
          const armName = resolveArmatureName(ctrl.armatureBase, cmd.side);
          const bones = byArmature.get(armName);
          const bone = bones?.get(ctrl.bone);
          if (bone) {
            const rad = ctrl.sign[cmd.side] * cmd.angleDeg * DEG2RAD;
            rotate(bone, ctrl.axis, rad);
            // Replicated drivers (scapula, patella) -- same armature subtree.
            if (ctrl.couplings) {
              for (const cp of ctrl.couplings) {
                const cb = bones?.get(cp.bone);
                if (cb) rotate(cb, cp.axis, cp.follow(rad));
              }
            }
          } else {
            // eslint-disable-next-line no-console
            console.warn(`[RigModel] bone not found: ${armName} / ${ctrl.bone}`);
          }
        } else if (ctrl.kind === 'chain') {
          // Cross-armature decomposition (scapulohumeral rhythm + humeral external
          // rotation + thoracic lean). A pure function returns named radian
          // outputs; targets place each on the rig. Several targets may hit the
          // SAME bone on different local axes, so we reset a bone to rest only the
          // FIRST time it is seen this pass and compose subsequent axes on top, in
          // the order the targets are listed.
          // P1: a pathological preset (dyskinesis / frozen shoulder) modifies the
          // rhythm the chain drives, so the rig moves the altered pattern.
          const mod = pathologyById(cmd.pathologyId)?.shoulderMod;
          const outputs = ctrl.decompose(cmd.angleDeg, cmd.side, mod);
          const shoulderBones = byArmature.get(
            resolveArmatureName('Shoulder_Armature', cmd.side),
          );
          const spineBones = byArmature.get('Spine_Armature');
          const seen = new Set<THREE.Object3D>();
          for (const { key, target } of ctrl.targets) {
            const rad = outputs[key];
            if (rad === undefined) continue;
            const map = target.armature === 'spine' ? spineBones : shoulderBones;
            if (!map) continue;
            for (const bn of target.bones) {
              const bone = map.get(bn);
              if (!bone) {
                // eslint-disable-next-line no-console
                console.warn(`[RigModel] chain bone not found: ${target.armature}/${bn}`);
                continue;
              }
              if (!seen.has(bone)) {
                const rq = restQuat.get(bone);
                if (rq) bone.quaternion.copy(rq);
                else bone.quaternion.identity();
                seen.add(bone);
                touchedRef.current.add(bone);
              }
              bone.rotateOnAxis(AXIS_VEC[target.axis], rad);
            }
          }
        } else {
          // spine: distribute the regional angle across the vertebra block.
          const bones = byArmature.get(ctrl.armature);
          if (bones) {
            const perLevelDeg = distributeSpineAngle(ctrl, cmd.angleDeg);
            ctrl.bones.forEach((bn, i) => {
              const bone = bones.get(bn);
              if (bone) rotate(bone, ctrl.axis, perLevelDeg[i] * DEG2RAD);
            });
          }
        }
      }

      // Lumbopelvic counter-balance for standing hip flexion (see HIP_BALANCE_*).
      // Ramps a modest lumbar lean in past HIP_BALANCE_START_DEG so the trunk
      // shifts back as the leg rises, then carries the arms with the leaning spine.
      const balanceDir = cmd.movementId ? HIP_BALANCE_DIR[cmd.movementId] : undefined;
      if (balanceDir && cmd.angleDeg > HIP_BALANCE_START_DEG) {
        const spineBones = byArmature.get('Spine_Armature');
        if (spineBones) {
          const t = Math.min(
            1,
            (cmd.angleDeg - HIP_BALANCE_START_DEG) /
              (HIP_BALANCE_FULL_DEG - HIP_BALANCE_START_DEG),
          );
          const perVertRad =
            balanceDir *
            (HIP_BALANCE_MAX_DEG / HIP_BALANCE_LUMBAR.length) *
            t *
            DEG2RAD;
          for (const bn of HIP_BALANCE_LUMBAR) {
            const bone = spineBones.get(bn);
            if (bone) rotate(bone, 'x', perVertRad);
          }
          scene.updateMatrixWorld(true);
          carryShouldersWithSpine();
        }
      }

      // Spine bends must carry the arms with the upper thorax. Refresh world
      // matrices so the anchor vertebra's posed transform is current, then ride
      // the shoulder roots on it. Runs for every spine command: when the spine is
      // at rest the delta is identity, so the arms stay put.
      if (ctrl?.kind === 'spine') {
        scene.updateMatrixWorld(true);
        carryShouldersWithSpine();
      }

      if (isArmMovement) clearActiveArm(cmd.side, armClearanceFactor());

      // LATS INSERTION FOLLOWS THE ARM. The latissimus belly is skinned to the
      // spine only (vert_T12), so its humeral insertion cannot follow the arm --
      // in Blender a Copy-Rotation makes two spine helper bones (latshum_l/r)
      // track each side's humerus, but glTF drops constraints, so we replicate it
      // here (same pattern as the scapulohumeral chain). Each helper takes its
      // humerus's WORLD rotation; at rest the humerus is at rest so the helper is
      // too. See rig-latissimus-cross-armature. No-op if the bones aren't in the
      // GLB yet (older rig export).
      scene.updateMatrixWorld(true);
      driveLatsHelpers();
      done();
    },
    [rig, scene],
  );

  useEffect(() => {
    apply(rigChannel.get());
    const unsub = rigChannel.subscribe(apply);
    return () => {
      unsub();
      // Restore the rest pose so a re-entry starts clean (useGLTF caches scene).
      for (const b of touchedRef.current) {
        const rq = rig.restQuat.get(b);
        if (rq) b.quaternion.copy(rq);
      }
      touchedRef.current.clear();
      // Restore any carried shoulder armature roots too.
      for (const r of movedRootsRef.current) {
        const rl = rig.restRootLocal.get(r);
        if (rl) {
          r.position.copy(rl.pos);
          r.quaternion.copy(rl.quat);
          r.scale.copy(rl.scale);
        }
      }
      movedRootsRef.current.clear();
      scene.updateMatrixWorld(true);
    };
  }, [apply, rig, scene]);

  // Ease the glass-skin fade toward its target every frame (premium reveal).
  useFrame((_, dt) => {
    const mat = bodySkinMatRef.current;
    if (!mat) return;
    const target = skinFadeTargetRef.current;
    const cur = skinFadeRef.current;
    const next =
      Math.abs(target - cur) < 0.002
        ? target
        : cur + (target - cur) * Math.min(1, dt * SKIN_FADE_SPEED);
    if (next === cur) return;
    skinFadeRef.current = next;
    const opacity = 1 - next * (1 - BODY_SKIN_GHOST_OPACITY);
    mat.opacity = opacity;
    // Stop writing depth once translucent so the muscles behind are not occluded.
    mat.depthWrite = opacity > 0.92;
  });

  return (
    <primitive
      object={scene}
      onClick={handleClick}
      onPointerMissed={() => dissectChannel.setSelection(null)}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}
