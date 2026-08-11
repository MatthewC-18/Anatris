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
import { bindClaviclesToShoulderGirdle } from '../../lib/clavicleBinding';
import { SCAPULA_WRAP_SIGN, scapulaWrap } from '../../lib/biomech/scapulaWrap';
import { muscleDepthLevel, type MuscleDepthLevel } from '../../lib/muscleDepth';
import { parseMeshName, structureKey, type ParsedSide } from '../../lib/parseMeshName';
import { buildMuscleResolution } from '../../lib/muscleResolver';
import { MUSCLES_BY_REGION } from '../../data/musclesByRegion';
import type { Muscle } from '../../types/muscle';
import {
  dissectChannel,
  makeSelection,
  meshIsDissected,
  meshIsIsolatedOut,
  type DissectLayer,
  type StructureSides,
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

// LATISSIMUS FOLLOW. The lats helper bones (latshum_l/r) ride the humeral head so
// the muscle's insertion stays attached while the arm elevates. POSITION follows
// 1:1 (the insertion is anchored on the humerus and the glenohumeral joint really
// does travel), but taking the humerus's full ROTATION flung the muscle out of the
// flank: the helper's weighted falloff reaches ~20 cm down the posterior axillary
// fold, so a 150 deg humeral rotation swept those fibers far outside the torso
// silhouette ("se sale el dorsal"). Anatomically the lats tendon twists around the
// humerus but its fibers keep pointing back at the thoracolumbar origin, so the
// insertion twists far LESS than the bone. We therefore follow a fraction of the
// rotation and hard-cap the total, which keeps the fold reading as a stretched
// band from the pelvis to the axilla at any elevation.
//
// RE-CALIBRATED with unilateralizeLats (below). The GLB ships BOTH helpers
// weighted onto BOTH lats with identical weights, so before that fix each side
// only received ~55% of its own humerus -- the follow constants were tuned around
// that halving. Once each lats rides only its own helper the follow doubles, so
// these come down to keep the posed silhouette at or below where it already sat.
// Measured offline against the Blender source (right-arm abduction, distance of
// the most-displaced lats vertex from its rest position / its lateral reach vs
// the 0.185 m rest edge and the 0.187 m scapular skin edge):
//   0.38 / 55 deg unilateral -> 9.7 cm, x 0.250  (6.5 cm outside the silhouette)
//   0.18 / 28 deg unilateral -> 6.6 cm, x 0.233
//   translation only         -> 4.0 cm, x 0.207  (the irreducible floor: the GH
//                                                 head itself travels ~2.4 cm)
const LATS_ROT_FOLLOW = 0.18;
const LATS_ROT_MAX_DEG = 28;

// Z-Anatomy ships a small ATTACHMENT PATCH per muscle marking where it anchors:
// `<muscle>ol` = ORIGIN, `<muscle>el` = INSERTION (confirmed against muscles whose
// anatomy is unambiguous -- latissimus `ol` sits on vert_L5, coracobrachialis `ol`
// on the scapula). Each is rigidly bound to ONE bone.
const ATTACHMENT_PATCH = /muscle(ol|el)$/i;

// ORIGIN PATCHES BOUND TO THE WRONG BONE. The teres major/minor origins are the
// scapula's inferior angle and lateral border, but both ship weighted 100% to
// `humerus_gh`, so they ride the ARM instead of staying on the blade. Measured on
// the shipped GLB at 140 deg of abduction they floated 11.4 cm and 6.5 cm off the
// nearest bone surface -- the worst offenders in the axilla, and the loose sheets
// that read as "diferentes musculos que no estan agrupados" opening past the
// shoulder. Rebound to the scapula, where they are anchored in life.
const ORIGIN_BELONGS_ON_SCAPULA = /^(teres_major|teres_minor)_muscleol$/i;

// Muscles that cross the glenohumeral joint and ship with a UNIFORM scapula/
// humerus blend instead of an origin->insertion gradient (coracobrachialis
// ~50/50, subscapularis 65/35, teres major 50/50 over every vertex), so the whole
// belly translates half-way with the arm. These are the ones that still opened
// out past the deltoid at 140 deg; the rest of the cuff (infraspinatus,
// supraspinatus, teres minor) was already re-weighted in the GLB at v6 and
// measures under 2 cm of float, so it is left alone.
const GRADE_SCAPULA_HUMERUS = /coracobrachialis|subscapularis|teres_major/i;

/** Lats helper bone (Spine_Armature) -> the shoulder armature whose humerus it
 *  follows. The mesh .l/.r vs armature _R/_L naming is mirrored (verified by the
 *  X sign of the bone's world position). */
const LATS_PAIRS: ReadonlyArray<[string, string]> = [
  ['latshum_l', 'Shoulder_Armature_R'],
  ['latshum_r', 'Shoulder_Armature_L'],
];

// SCAPULOTHORACIC WRAP: the companion rotations that keep the blade on the
// ribcage. Table + solver notes live in src/lib/biomech/scapulaWrap, shared with
// the offline harness so the two cannot drift apart.

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
// Faint cool emissive lift applied ONLY as the skin ghosts, so the translucent
// shell reads as luminous edge-lit GLASS (paired with the material's Fresnel
// sheen) instead of a muddy gray film over the muscles. Scaled by the ghost
// amount in the fade useFrame; 0 when the skin is solid, so it never tints the
// distal hand/foot caps (they keep the solid skinMat, emissiveIntensity 0).
const BODY_SKIN_GHOST_EMISSIVE = 0.45;

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

// Which half of the body a peelable mesh belongs to, for the per-side dissection.
// Measured, not read off the name: this rig leaves the l/r marker off most meshes
// and carries it MIRRORED on a few (the extensor carpi radialis patches named
// "...er" sit on the left arm), so taking the name at face value peeled the wrong
// limb. Well off the axis the position decides outright; near the axis the name
// breaks the tie when it has one; and a mesh with neither signal that still sits
// measurably off-centre goes to the side it leans to, so peeling one pectoral
// leaves no sliver of it floating over the sternum. Only what is truly ON the
// midline stays 'center', and that is the tissue a one-sided peel should keep.
const SIDE_LATERAL_M = 0.04; // clearly on a limb / one half of the trunk
const SIDE_MIDLINE_M = 0.005; // inside this, genuinely on the axis
function dissectSideOfMesh(mesh: THREE.Mesh, named: ParsedSide): ParsedSide {
  const x = meshWorldCenter(mesh).x;
  const ax = Math.abs(x);
  if (ax < SIDE_LATERAL_M && named !== 'center') return named;
  if (ax < SIDE_MIDLINE_M) return 'center';
  return x > 0 ? 'right' : 'left';
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
// NON-VERTEBRA WEIGHT IS PRESERVED. This pass used to overwrite each vertex with
// vertebrae ONLY (weight 1 on one or two of them), which silently destroyed the
// latissimus dorsi's humeral insertion: the lats' dominant bone is vert_T12, so
// it qualifies as a spine muscle, and the re-skin wiped the latshum_l/r helper
// weights that are the entire mechanism by which its insertion follows the
// abducting arm (see driveLatsHelpers). The muscle was left welded to the spine,
// so on abduction the arm rose while the axillary insertion stayed at its rest
// position -- the detached, mis-aligned fold reported in the lab. Now each vertex
// KEEPS whatever weight it carries on non-vertebra bones and only the REMAINDER
// is blended across the bracketing vertebrae, so a lats vertex bends with the
// column AND rides the humerus in the same proportion the rig authored.
//
// Rest-pose safe: the weights still sum to 1 and every bone matrix is identity at
// the bind pose, so the neutral pose is pixel-identical (bindMatrix cancels);
// only the deformation under rotation changes. Returns true when it re-skinned.
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
  const vertIdx = new Set(verts.map((v) => v.idx));
  for (let i = 0; i < pos.count; i++) {
    _vw.fromBufferAttribute(pos, i);
    mesh.localToWorld(_vw); // rest world pos (bones = identity at bind)
    const vy = _vw.y;
    // Weight this vertex already carries on NON-vertebra bones -- for the
    // latissimus, its humeral helper. Collapse it onto the heaviest such bone
    // (after unilateralizeLats there is only one) and hand the vertebrae just
    // what is left, so the insertion survives this pass. `keep` stays 0 for an
    // ordinary spine muscle, making the blend below identical to before.
    let keepBone = -1;
    let keep = 0;
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k);
      if (w <= 0) continue;
      const b = si.getComponent(i, k);
      if (vertIdx.has(b)) continue;
      if (keepBone < 0 || w > keep) keepBone = b;
      keep += w;
    }
    if (keep > 1) keep = 1;
    if (keepBone < 0) keepBone = 0;
    const spine = 1 - keep;
    if (vy <= yLo) {
      si.setXYZW(i, verts[0].idx, keepBone, 0, 0);
      sw.setXYZW(i, spine, keep, 0, 0);
    } else if (vy >= yHi) {
      si.setXYZW(i, verts[last].idx, keepBone, 0, 0);
      sw.setXYZW(i, spine, keep, 0, 0);
    } else {
      // Largest k with verts[k].y <= vy < verts[k+1].y -> the bracketing pair.
      let k = 0;
      while (k < last && verts[k + 1].y <= vy) k++;
      const lo = verts[k];
      const hi = verts[k + 1];
      const span = hi.y - lo.y;
      const t = span > 1e-6 ? (vy - lo.y) / span : 0;
      si.setXYZW(i, lo.idx, hi.idx, keepBone, 0);
      sw.setXYZW(i, (1 - t) * spine, t * spine, keep, 0);
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
//
// TWIST BONE. Blending a vertex directly between the elbow bone and the wrist
// bone makes the forearm SHRINK as it turns: linear blend skinning puts a vertex
// weighted half to a bone at 0 deg and half to one at T deg at cos(T/2) of its
// radius, so at 85 deg of pronation the limb lost a quarter of its girth
// (measured 2.30 -> 1.71 cm across the middle third). The standard fix is an
// intermediate bone turning half the angle, so a vertex is only ever blended
// between neighbours T/2 apart and the loss becomes cos(T/4): the same
// measurement then reads 2.30 -> 2.22 cm. `forearmTwist` below builds it, and
// vertices are laddered elbow -> twist -> wrist rather than blended end to end.
// See scripts/audit-forearm-twist.mts, which sweeps the segment count.
// ---------------------------------------------------------------------------
function smoothTwistForearm(
  mesh: THREE.Mesh,
  elbowY: number,
  wristY: number,
  twistBone?: THREE.Bone,
): boolean {
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
  // Rungs from elbow to wrist. With the twist bone spliced in, a vertex is only
  // ever blended between two ADJACENT rungs, which is what keeps the girth.
  const twistIdx = twistBone ? sk.skeleton.bones.indexOf(twistBone) : -1;
  const ladder = twistIdx >= 0 ? [flexIdx, twistIdx, rotIdx] : [flexIdx, rotIdx];
  const steps = ladder.length - 1;
  for (let i = 0; i < pos.count; i++) {
    _vw.fromBufferAttribute(pos, i);
    mesh.localToWorld(_vw); // rest world pos (bones = identity at bind)
    let t = (elbowY - _vw.y) / span;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    // Smoothstep so the elbow end barely twists and the roll builds to the wrist.
    t = t * t * (3 - 2 * t);
    const scaled = t * steps;
    let k = Math.floor(scaled);
    if (k >= steps) k = steps - 1;
    const f = scaled - k;
    si.setXYZW(i, ladder[k], ladder[k + 1], 0, 0);
    sw.setXYZW(i, 1 - f, f, 0, 0);
  }
  si.needsUpdate = true;
  sw.needsUpdate = true;
  return true;
}

// ---------------------------------------------------------------------------
// Elbow-crossing origins.
//
// The brachioradialis and the radial extensors originate on the lateral
// supracondylar ridge of the HUMERUS, several cm above the elbow, and insert
// down the forearm. Z-Anatomy binds those proximal fibers to forearm_flex along
// with the rest of the mesh, so on elbow flexion the origin swings around the
// joint with the forearm instead of staying on the arm: measured at 145 deg the
// brachioradialis tendon sheet ends 10.9 cm off the limb axis, on both sides, a
// flap hanging outside a limb whose own sleeve is 6 cm.
//
// Only the vertices ABOVE the elbow are moved onto humerus_gh, with a smoothstep
// across the joint so the belly is not cut in two at the crease. Rest-pose safe:
// weights sum to 1 and every bone matrix is identity at bind.
// ---------------------------------------------------------------------------
/** Height above the elbow at which a fiber is pure humeral origin. */
const ELBOW_ANCHOR_BAND_M = 0.05;

function anchorOriginToHumerus(mesh: THREE.Mesh, elbowY: number): boolean {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  const bn = (b: THREE.Bone) => b.name.replace(/_\d+$/, '');
  const humIdx = sk.skeleton.bones.findIndex((b) => bn(b) === 'humerus_gh');
  const flexIdx = sk.skeleton.bones.findIndex((b) => bn(b) === 'forearm_flex');
  if (humIdx < 0 || flexIdx < 0) return false;
  const pos = mesh.geometry.getAttribute('position');
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  if (!pos || !si || !sw) return false;
  let touched = 0;
  for (let i = 0; i < pos.count; i++) {
    _vw.fromBufferAttribute(pos, i);
    mesh.localToWorld(_vw); // rest world pos (bones = identity at bind)
    if (_vw.y <= elbowY) continue;
    let t = (_vw.y - elbowY) / ELBOW_ANCHOR_BAND_M;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t);
    si.setXYZW(i, humIdx, flexIdx, 0, 0);
    sw.setXYZW(i, t, 1 - t, 0, 0);
    touched++;
  }
  if (touched === 0) return false;
  si.needsUpdate = true;
  sw.needsUpdate = true;
  return true;
}

// ---------------------------------------------------------------------------
// Scapula -> humerus gradient (axillary muscles).
//
// A muscle that crosses the glenohumeral joint must have its ORIGIN end riding
// the scapula and its INSERTION end riding the humerus. Several axillary muscles
// ship instead with a CRUDE UNIFORM BLEND (e.g. coracobrachialis at ~50/50 over
// every vertex), which translates the whole belly half-way with the arm: the
// muscle leaves the bone entirely rather than stretching between two attachments.
// Measured on the shipped GLB at 140 deg of abduction, the coracobrachialis
// floated up to 11.0 cm off the nearest bone surface and reached |x| 0.299 --
// 6 cm past the deltoid's own silhouette, i.e. "queda mas abierto que el hombro".
//
// Each vertex is weighted by how close it lies, AT REST, to the humeral shaft
// (the segment from the glenohumeral head to the elbow): fibers hugging the shaft
// are the insertion and ride the humerus, fibers further away are the origin and
// stay on the scapula, with a smoothstep between. Distance-to-bone rather than
// height, because these muscles run obliquely -- the subscapularis, for one,
// originates over the whole costal face of the blade including its upper part, so
// a height gradient would hand that upper origin to the humerus.
//
// Rest-pose safe for the usual reason: weights sum to 1 and bone matrices are
// identity at bind. The thresholds are shared by every muscle and every primitive
// so the pieces of one belly cannot split apart at their seams.
// ---------------------------------------------------------------------------
/** Rest distance to the humeral shaft at which a fiber is pure insertion. */
const GRADE_NEAR_M = 0.03;
/** ...and beyond which it is pure origin. */
const GRADE_FAR_M = 0.09;

function gradeScapulaToHumerus(
  mesh: THREE.Mesh,
  shaftTop: THREE.Vector3,
  shaftBottom: THREE.Vector3,
): boolean {
  const sk = mesh as THREE.SkinnedMesh;
  if (!sk.isSkinnedMesh || !sk.skeleton) return false;
  const bn = (b: THREE.Bone) => b.name.replace(/_\d+$/, '');
  const sIdx = sk.skeleton.bones.findIndex((b) => bn(b) === 'scapula');
  const hIdx = sk.skeleton.bones.findIndex((b) => bn(b) === 'humerus_gh');
  if (sIdx < 0 || hIdx < 0) return false;
  const pos = mesh.geometry.getAttribute('position');
  const si = mesh.geometry.getAttribute('skinIndex');
  const sw = mesh.geometry.getAttribute('skinWeight');
  if (!pos || !si || !sw) return false;
  const shaft = new THREE.Vector3().subVectors(shaftBottom, shaftTop);
  const shaftLenSq = shaft.lengthSq();
  if (shaftLenSq <= 1e-6) return false;
  const span = GRADE_FAR_M - GRADE_NEAR_M;
  const closest = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    _vw.fromBufferAttribute(pos, i);
    mesh.localToWorld(_vw); // rest world pos (bones = identity at bind)
    let u = _vw.clone().sub(shaftTop).dot(shaft) / shaftLenSq;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    closest.copy(shaftTop).addScaledVector(shaft, u);
    const d = _vw.distanceTo(closest);
    let t = (GRADE_FAR_M - d) / span; // 1 on the shaft, 0 far from it
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t);
    si.setXYZW(i, sIdx, hIdx, 0, 0);
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
 * FOREARM CULLS, the old NAME-based rules: hide all the forearm's connective,
 * hide muscle in the wrist cuff, hide anything matching the digital-muscle regex.
 * Superseded by the measured cull below (see cullForearmOutliers), which drops
 * only what actually sticks out and so keeps 60% more of the forearm's bulk.
 * Left in place, disabled, because they are the documented fallback if the
 * measured rule ever misjudges a re-exported rig.
 */
const FOREARM_CULLS = false;

/**
 * How far past the limb's own radius a mesh may reach before it is trimmed.
 *
 * The name-based culls emptied the forearm; removing them filled it back up but
 * let loose spikes through. Neither is a judgement about a muscle's NAME -- it is
 * about where its geometry lands, so that is what we measure.
 *
 * The reference is the arm's own BONE AXIS, not its skin: the digital tendons run
 * into the fingers, where hand skin is sampled thinly, and a skin-cloud distance
 * there says 25 cm for a structure that is perfectly in place. The threshold is
 * taken from the forearm SKIN's own distance to that axis, so it adapts to the rig
 * rather than hardcoding a body size, and p95 is used rather than the max so one
 * stray vertex cannot condemn an otherwise healthy belly. Measured on the shipped
 * rig the sleeve is 6.3 cm, which is the number this margin is applied to.
 */
const LIMB_OUTLIER_MARGIN = 1.02;

/**
 * Below this fraction of surviving triangles a trimmed mesh is hidden instead:
 * what is left of a long tendon whose whole length was cut away is a handful of
 * scattered faces, which reads as debris rather than as anatomy.
 */
const LIMB_TRIM_MIN_KEPT = 0.1;

/** The limb axis: one segment per bone-to-child pair under `root`. */
function boneAxis(root: THREE.Object3D): [THREE.Vector3, THREE.Vector3][] {
  const segs: [THREE.Vector3, THREE.Vector3][] = [];
  root.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    const a = o.getWorldPosition(new THREE.Vector3());
    for (const child of o.children) {
      if ((child as THREE.Bone).isBone) {
        segs.push([a, child.getWorldPosition(new THREE.Vector3())]);
      }
    }
  });
  return segs;
}

const _seg = new THREE.Vector3();
const _rel = new THREE.Vector3();
/**
 * Distance from `p` to the limb axis.
 *
 * SEGMENTS, not the bone origins. An arm armature has seven bones, so the cloud
 * of their positions leaves a ~25 cm hole down the forearm: a vertex halfway
 * along it measures 12 cm from both the elbow and the wrist while sitting right
 * on the bone. Thresholding against that cloud is thresholding against the gap
 * between bones, and it passed rods reaching twice as far as the skin. Against
 * the axis the forearm's own sleeve measures 6.3 cm, which is a real radius.
 */
function distToAxis(p: THREE.Vector3, segs: readonly [THREE.Vector3, THREE.Vector3][]): number {
  let best = Infinity;
  for (const [a, b] of segs) {
    _seg.subVectors(b, a);
    _rel.subVectors(p, a);
    const lenSq = _seg.lengthSq();
    let t = lenSq > 1e-9 ? _rel.dot(_seg) / lenSq : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const d = _rel.addScaledVector(_seg, -t).lengthSq();
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/**
 * The forearm's TAPERED SLEEVE: its skin radius as a function of how far down the
 * elbow -> wrist axis you are, 5.2 cm at the elbow narrowing to 3.9 cm at the
 * wrist on the shipped rig.
 *
 * One radius for the whole limb cannot describe an arm, and worse, a plain
 * distance-to-axis test is blind to the thing that was on screen: a bar lying
 * ACROSS the forearm never leaves the axis, it just pierces the skin on both
 * sides, and a 10 cm bar centred on the bone measures 5 cm -- comfortably inside
 * a limit taken from the widest part of the limb. The rig ships several such
 * bars, muscles the exporter left rotated ~90 deg (23 cm of extensor digitorum
 * running front-to-back through a 4 cm wrist), and they are what "no esta bien
 * colocado" refers to. Sampling the skin per axial station catches them.
 *
 * Returns a predicate: is this rest-pose world point inside the sleeve? Points
 * above the elbow are not judged by it -- the humeral origins live there, and
 * they are handled by anchorOriginToHumerus.
 */
function makeSleeveTest(
  elbow: THREE.Vector3,
  wrist: THREE.Vector3,
  skin: readonly THREE.Mesh[],
  margin: number,
): (p: THREE.Vector3) => boolean {
  const axis = new THREE.Vector3().subVectors(wrist, elbow);
  const lenSq = axis.lengthSq();
  if (lenSq <= 1e-6) return () => true;
  const rel = new THREE.Vector3();
  /** Axial station (0 elbow, 1 wrist) and radius off the axis. */
  const station = (p: THREE.Vector3): [number, number] => {
    rel.subVectors(p, elbow);
    const t = rel.dot(axis) / lenSq;
    return [t, rel.addScaledVector(axis, -t).length()];
  };
  const BINS = 12;
  const bins: number[][] = Array.from({ length: BINS }, () => []);
  const v = new THREE.Vector3();
  for (const mesh of skin) {
    const pos = mesh.geometry.getAttribute('position');
    if (!pos) continue;
    const step = Math.max(1, Math.floor(pos.count / 400));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i);
      mesh.localToWorld(v);
      const [t, r] = station(v);
      if (t < 0 || t > 1) continue;
      bins[Math.min(BINS - 1, Math.floor(t * BINS))].push(r);
    }
  }
  const profile = bins.map((xs) => {
    if (xs.length === 0) return NaN;
    xs.sort((a, b) => a - b);
    return xs[Math.floor(xs.length * 0.95)];
  });
  if (profile.every((x) => Number.isNaN(x))) return () => true;
  // A bin the skin did not reach borrows its neighbours' widest, so the profile
  // is defined end to end and never pinches the limb shut where it has no data.
  for (let i = 0; i < BINS; i++) {
    if (!Number.isNaN(profile[i])) continue;
    const near = profile.filter((x, j) => !Number.isNaN(x) && Math.abs(j - i) <= 2);
    profile[i] = near.length > 0 ? Math.max(...near) : Infinity;
  }
  const radiusAt = (t: number): number => {
    const c = t < 0 ? 0 : t > 1 ? 1 : t;
    const x = c * (BINS - 1);
    const i = Math.min(BINS - 2, Math.floor(x));
    return profile[i] + (profile[i + 1] - profile[i]) * (x - i);
  };
  return (p: THREE.Vector3): boolean => {
    const [t, r] = station(p);
    if (t < -0.05) return true; // above the elbow: not the forearm's business
    // Past the wrist there is nothing to be inside of: the hand is a solid skin
    // cap with every internal piece hidden, so a tendon that carries on into it
    // can only come out through the palm.
    if (t > 1.05) return false;
    return r <= radiusAt(t) * margin;
  };
}

/**
 * A mesh lying ACROSS the limb instead of along it.
 *
 * A forearm muscle runs the length of the forearm: it covers a long axial span
 * and hugs the axis. The export-mangled ones are the exact opposite -- their
 * vertices bunch into 1-3 cm of the limb's length and fan out to 8-15 cm of
 * radius, because the mesh is lying crosswise. On the shipped rig the two groups
 * do not overlap: twelve meshes score 0.10-0.32, every healthy structure scores
 * 1.21 or more. They are the bars seen crossing the forearm, and unlike the ones
 * repairMirroredMeshes rebuilds, they are mangled on BOTH arms, so there is no
 * good twin to copy from and nothing to do but hide them. Fixing them for real
 * means rebuilding them in Blender (see the export recipe).
 *
 * Both conditions are needed: the small ring ligaments of the wrist are "short"
 * too, but they do not fan out, and they must stay.
 */
const CROSSWISE_MAX_RATIO = 0.5;
const CROSSWISE_MIN_RADIAL_M = 0.06;

function isCrosswise(mesh: THREE.Mesh, elbow: THREE.Vector3, wrist: THREE.Vector3): boolean {
  const pos = mesh.geometry.getAttribute('position');
  if (!pos || pos.count < 16) return false;
  const axis = new THREE.Vector3().subVectors(wrist, elbow);
  const lenSq = axis.lengthSq();
  if (lenSq <= 1e-6) return false;
  const len = Math.sqrt(lenSq);
  const rel = new THREE.Vector3();
  const ts: number[] = [];
  const rs: number[] = [];
  const step = Math.max(1, Math.floor(pos.count / 300));
  for (let i = 0; i < pos.count; i += step) {
    rel.fromBufferAttribute(pos, i);
    mesh.localToWorld(rel);
    rel.sub(elbow);
    const t = rel.dot(axis) / lenSq;
    ts.push(t * len);
    rs.push(rel.addScaledVector(axis, -t).length());
  }
  if (ts.length < 8) return false;
  ts.sort((a, b) => a - b);
  rs.sort((a, b) => a - b);
  const q = (a: number[], f: number) => a[Math.floor(a.length * f)];
  const span = q(ts, 0.95) - q(ts, 0.05);
  const radial = q(rs, 0.95) - q(rs, 0.05);
  return radial > CROSSWISE_MIN_RADIAL_M && span / radial < CROSSWISE_MAX_RATIO;
}

/**
 * Drop the triangles of `mesh` that lie outside the limb, keeping the rest.
 * Returns the fraction of triangles kept, so the caller can hide a mesh that has
 * essentially nothing left. Measured in the REST pose, where bone matrices are
 * identity, so a vertex's bind position is its world position.
 */
function trimMeshToLimb(
  mesh: THREE.Mesh,
  segs: readonly [THREE.Vector3, THREE.Vector3][],
  limit: number,
  inSleeve: (p: THREE.Vector3) => boolean,
): number {
  const geom = mesh.geometry;
  const idx = geom.getIndex();
  const pos = geom.getAttribute('position');
  if (!idx || !pos || pos.count === 0) return 1;
  const inside = new Uint8Array(pos.count);
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    mesh.localToWorld(p);
    inside[i] = distToAxis(p, segs) <= limit && inSleeve(p) ? 1 : 0;
  }
  const arr = idx.array as ArrayLike<number>;
  const kept: number[] = [];
  for (let i = 0; i + 2 < arr.length; i += 3) {
    if (inside[arr[i]] && inside[arr[i + 1]] && inside[arr[i + 2]]) {
      kept.push(arr[i], arr[i + 1], arr[i + 2]);
    }
  }
  const frac = arr.length > 0 ? kept.length / arr.length : 1;
  if (frac >= LIMB_TRIM_MIN_KEPT && frac < 1) {
    // clone: geometry can be shared with a deduped twin we must not damage.
    const next = geom.clone();
    next.setIndex(kept);
    next.computeBoundingBox();
    next.computeBoundingSphere();
    mesh.geometry = next;
  }
  return frac;
}

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
  /**
   * The maneuver being DEMONSTRATED (orthopedic test / myotome), or null when
   * the console is driving. Set by the panel that owns the rig via demoChannel.
   *
   * The readout renders this INSTEAD of its live per-angle analysis: during a
   * demo the angle sweeps continuously, so recomputing the sector, the rhythm
   * and the recruited muscles every frame produced text that changed ~25 times
   * a second and could not be read. This is fixed for the whole demo.
   */
  demo?: RigDemoInfo | null;
}

/** Stable description of the maneuver a demo is showing (see RigCommand.demo). */
export interface RigDemoInfo {
  /** Test / nerve-root name, e.g. "Lata vacía (Jobe)". */
  label: string;
  /** The provocative angle the sweep holds at, in degrees. */
  targetDeg: number;
  /** Structure under test, e.g. "Supraespinoso". */
  structure?: string;
  /** True when the examiner opposes the patient's effort. */
  resisted?: boolean;
  /** What the rig approximation leaves out. */
  note?: string;
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

  // Forearm twist bones, built during mesh preparation and driven in apply().
  // Kept in a ref because they are created after the rest-pose memo below has
  // already run, and apply() needs to reach them every command.
  const forearmTwistRef = useRef<Map<Side, THREE.Bone>>(new Map());

  // Cache bones per armature (boneName -> object) and capture each bone's rest
  // quaternion ONCE, so every movement starts from the true neutral pose and we
  // can fully restore on unmount.
  const rig = useMemo(() => {
    const byArmature = new Map<string, Map<string, THREE.Object3D>>();
    const restQuat = new Map<THREE.Object3D, THREE.Quaternion>();
    // Rest LOCAL positions. Bones are rotation-only EXCEPT the latissimus helpers,
    // which are also translated onto the humeral head (see driveLatsHelpers), so
    // every reset restores position as well as rotation.
    const restPos = new Map<THREE.Object3D, THREE.Vector3>();
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
        if (!restPos.has(o)) restPos.set(o, o.position.clone());
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
    // Capture the rest world matrices of each latissimus helper and the humerus it
    // follows, so driveLatsHelpers can copy a DAMPED share of the humerus's
    // rest->posed rotation instead of its absolute orientation (which flung the
    // muscle out of the flank at high elevation).
    for (const [helperName, armName] of LATS_PAIRS) {
      const helper = byArmature.get('Spine_Armature')?.get(helperName);
      if (helper) restWorld.set(helper, helper.matrixWorld.clone());
      const hum = byArmature.get(armName)?.get('humerus_gh');
      if (hum) restWorld.set(hum, hum.matrixWorld.clone());
    }
    return { byArmature, restQuat, restPos, restWorld, restRootLocal };
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
    // Structures peeled away (or the single one isolated) by the click-to-dissect
    // panel, composed ON TOP of the tissue toggles: a dissected muscle stays gone
    // regardless of the toggles, and both act per SIDE via the geometric lm.side.
    const { hidden, isolated } = dissectChannel.get();
    for (const lm of layerMeshesRef.current) {
      // The distal hand/foot skin cap is ALWAYS shown (its internals are broken
      // and unusable), so the extremities never vanish while peeling body layers.
      if (lm.distalCap) {
        lm.mesh.visible = true;
        continue;
      }
      const layerOn = st[lm.layer];
      // Dissection only removes muscle/connective (never bone/skin), and only
      // when that tissue is on to begin with. Bone stays through isolation too,
      // so an isolated muscle is read against the skeleton it acts on.
      const peelable = lm.layer === 'muscle' || lm.layer === 'connective';
      let removed = false;
      if (layerOn && peelable && lm.base !== undefined) {
        const side = lm.side ?? 'center';
        removed =
          (hidden.length > 0 && meshIsDissected(lm.base, side, hidden)) ||
          meshIsIsolatedOut(lm.base, side, isolated);
      }
      lm.mesh.visible = layerOn && !removed;
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
  // Both the ORIGINAL and OUR clone are remembered, and the restore only acts if
  // the mesh is still wearing our clone. Two systems dress the same mesh -- this
  // highlight and the RigOverlays activation glow -- and the old code restored
  // whatever `mesh.material` happened to be, then disposed the material it found.
  // If the glow had swapped in between, deselecting handed the mesh a stale
  // material and DISPOSED THE SHARED flat one, the single instance every muscle of
  // that color renders with. Restoring only what we put on keeps each system to
  // its own clone.
  const selGlowRef = useRef<
    Map<THREE.Mesh, { orig: THREE.Material; clone: THREE.Material }>
  >(new Map());
  const applySelectionHighlight = useCallback((sel: ReturnType<typeof makeSelection> | null) => {
    for (const [mesh, entry] of selGlowRef.current) {
      if (mesh.material === entry.clone) mesh.material = entry.orig;
      entry.clone.dispose?.();
    }
    selGlowRef.current.clear();
    if (!sel || !sel.dissectable) return;
    for (const lm of layerMeshesRef.current) {
      if (lm.base === undefined || !sel.bases.includes(lm.base)) continue;
      const s = lm.side ?? 'center';
      // The glow marks exactly what the action will take: with the side switch on
      // "izquierdo", only the left half of the structure lights up.
      const match = sel.scope === 'both' || s === sel.scope;
      if (!match || !lm.mesh.visible) continue;
      const src = lm.mesh.material as THREE.MeshStandardMaterial;
      const clone = (src.clone ? src.clone() : new THREE.MeshStandardMaterial()) as THREE.MeshStandardMaterial;
      if ('emissive' in clone) {
        clone.emissive = new THREE.Color(SELECTION_EMISSIVE);
        clone.emissiveIntensity = 0.55;
      }
      selGlowRef.current.set(lm.mesh, { orig: src, clone });
      lm.mesh.material = clone;
    }
  }, []);

  // Survey a clicked structure: which side the clicked mesh actually sits on, and
  // how many meshes the structure has per side. Both come from the GEOMETRIC side
  // tagged on every LayerMesh, never from the mesh name -- Z-Anatomy leaves most
  // laterality out of the names, which is what made a peel take both limbs.
  const surveyStructure = useCallback(
    (
      clicked: THREE.Mesh,
      bases: string[],
      fallback: ParsedSide,
    ): { side: ParsedSide; sides: StructureSides } => {
      const sides: StructureSides = { left: 0, right: 0, center: 0 };
      let side = fallback;
      for (const lm of layerMeshesRef.current) {
        if (lm.base === undefined || !bases.includes(lm.base)) continue;
        const s = lm.side ?? 'center';
        sides[s] += 1;
        if (lm.mesh === clicked) side = s;
      }
      return { side, sides };
    },
    [],
  );

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
          const muscle = muscleByMeshName.get(m.name);
          const parsed = parseMeshName(m.name);
          const bases =
            muscle && muscle.meshBases.length ? muscle.meshBases : [parsed.base];
          const { side, sides } = surveyStructure(m, bases, parsed.side);
          dissectChannel.setSelection(
            makeSelection(m.name, lyr as DissectLayer, muscle, side, sides),
          );
          return;
        }
        if (lyr === 'skin') continue; // see through the glass shell to the muscle
        break; // bone / other solid in front -> nothing to dissect here
      }
      dissectChannel.setSelection(null);
    },
    [muscleByMeshName, surveyStructure],
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
            // DOUBLE-SIDED so a mesh whose faces are wound inside-out still reads
            // as tissue instead of a black hole. Z-Anatomy mirrored half the body,
            // and some of those meshes come out of the glTF export with reversed
            // winding; with the default front-side material the camera looks
            // straight through them and sees unlit backfaces, which is the black
            // patch on the arm. Fixing the winding per mesh was tried and the
            // detection is not reliable -- half the rig is open sheets (insertion
            // patches, fasciae) where "inside" is not defined, and a twin
            // comparison flags the entire right side, which cannot be true. Making
            // the surface two-sided is the standard answer for anatomy assets and
            // costs some overdraw. The skin material has always been DoubleSide
            // for the same reason.
            side: THREE.DoubleSide,
          });
          matByKey.set(key, m);
        }
        return m;
      };
      // PREMIUM LIVING SKIN (G1). MeshPhysicalMaterial so we get two cheap upgrades
      // over matte plastic, both without a transmission pass (that pass re-renders
      // the whole scene per frame -- too costly for the 1300-mesh rig on physio
      // laptops): (1) a CLEARCOAT lobe -> a soft dewy sheen over the diffuse that
      // reads as living tissue; (2) a stronger SHEEN, which is a built-in Fresnel
      // term -> it lights the silhouette's grazing edge so the body reads as a
      // luminous envelope (the signature "ghost skin" look of Complete Anatomy /
      // Visible Body). Applies ONLY to skin meshes (body shell + distal caps), not
      // the muscle bellies, so the extra shader cost is bounded. Reversible: was
      // roughness 0.62 / env 0.35 / sheen 0.4, no clearcoat, no emissive.
      const skinMat = new THREE.MeshPhysicalMaterial({
        color: 0xd7a88f,
        roughness: 0.6,
        metalness: 0.0,
        envMapIntensity: 0.42,
        clearcoat: 0.35,
        clearcoatRoughness: 0.6,
        sheen: 0.6,
        sheenRoughness: 0.75,
        sheenColor: new THREE.Color(0xffdcc6),
        // Cool base tint the ghost fade scales up (see BODY_SKIN_GHOST_EMISSIVE);
        // intensity 0 here so the always-solid distal caps stay untinted.
        emissive: new THREE.Color(0x1a2740),
        emissiveIntensity: 0.0,
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

      // TWIST BONE per arm (see smoothTwistForearm). Built here rather than in
      // the GLB so no re-export is needed: it shares forearm_rot's rest
      // transform, hangs off forearm_flex as its sibling, and is spliced into
      // every skeleton that skins the forearm. Bone INDICES are appended, so
      // existing skinIndex values are untouched.
      const forearmTwist = new Map<Side, THREE.Bone>();
      for (const side of ['R', 'L'] as Side[]) {
        const sr = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side));
        if (!sr) continue;
        let flexB: THREE.Object3D | null = null;
        let rotB: THREE.Object3D | null = null;
        sr.traverse((o) => {
          const bn = o.name.replace(/_\d+$/, '');
          if (bn === 'forearm_flex' && !flexB) flexB = o;
          else if (bn === 'forearm_rot' && !rotB) rotB = o;
        });
        if (!flexB || !rotB) continue;
        const twist = new THREE.Bone();
        twist.name = `forearm_twist_${side}`;
        twist.position.copy((rotB as THREE.Object3D).position);
        twist.quaternion.copy((rotB as THREE.Object3D).quaternion);
        twist.scale.copy((rotB as THREE.Object3D).scale);
        twist.userData.restQuat = twist.quaternion.clone();
        (flexB as THREE.Object3D).add(twist);
        forearmTwist.set(side, twist);
      }
      scene.updateMatrixWorld(true);
      forearmTwistRef.current = forearmTwist;
      /** Splice a twist bone into a mesh's skeleton, once per skeleton. */
      const splicedSkeletons = new Set<THREE.Skeleton>();
      const spliceTwist = (mesh: THREE.SkinnedMesh, twist: THREE.Bone): void => {
        const sk = mesh.skeleton;
        if (!sk || sk.bones.includes(twist)) return;
        if (splicedSkeletons.has(sk) && sk.bones.includes(twist)) return;
        sk.bones.push(twist);
        sk.boneInverses.push(new THREE.Matrix4().copy(twist.matrixWorld).invert());
        sk.init();
        splicedSkeletons.add(sk);
      };
      /** The twist bone for the arm a mesh belongs to, spliced in on demand. */
      const twistFor = (mesh: THREE.Mesh): THREE.Bone | undefined => {
        const sk = mesh as THREE.SkinnedMesh;
        if (!sk.isSkinnedMesh || !sk.skeleton) return undefined;
        for (const [side, twist] of forearmTwist) {
          const root = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side));
          if (!root) continue;
          if (!sk.skeleton.bones.some((b) => root.getObjectById(b.id))) continue;
          spliceTwist(sk, twist);
          return twist;
        }
        return undefined;
      };

      // LATISSIMUS CROSS-SIDE WEIGHT FIX. The two lats are ONE mirrored mesh: in
      // Blender both objects share a single mesh datablock, the right one carrying
      // a negative-X object matrix. Vertex weights live on that shared datablock,
      // so the pass that authored the humeral-insertion fibers could not give each
      // side its own helper -- it wrote BOTH helpers (latshum_l AND latshum_r) with
      // IDENTICAL per-vertex weights, and each lats ends up half-driven by each
      // arm. Two consequences, and the second is the visible bug:
      //   1. the lats on the MOVING side only gets ~55% of its own humerus, so its
      //      insertion lags behind the arm;
      //   2. the lats on the OPPOSITE side gets the other ~45% of a humerus that
      //      is across the body, so abducting one arm drags the CONTRALATERAL
      //      lats sideways -- measured offline against the Blender source at up to
      //      15.5 cm at 180 deg. That is the sheet of muscle seen tearing out of
      //      the axilla ("las partes del dorsal no estan bien alineadas... se sale
      //      demasiado en el movimiento").
      // Fix: keep only the helper on the mesh's OWN side and renormalize. Which
      // helper that is is decided GEOMETRICALLY (the helper bone whose rest world
      // X shares the mesh center's sign), not by the .l/.r suffix -- mesh and
      // armature naming is mirrored in this rig. Rest pose is untouched: at bind
      // both helpers are coincident with the humerus, so redistributing weight
      // between them changes nothing at neutral.
      //
      // The CURRENT export does not share geometry (the decimation pass splits
      // the mirrored instances into their own BufferGeometry, verified by
      // scripts/audit-lats-binding.mts), but a re-export could restore the
      // sharing -- and writing weights into a shared buffer would edit both sides
      // at once, then have the second call read back weights the first had
      // already rewritten. So copy on write when, and only when, a sibling lats
      // is on the same geometry. Skinning is unaffected by the mirroring itself:
      // it runs through each node's own bindMatrix, so each instance is already
      // posed on its own side of the body.
      // MIRROR-EXPORT REPAIR. Z-Anatomy mirrored half the body with uniform
      // scale -1, and the Blender glTF exporter non-deterministically mangles
      // some of those meshes: the mesh comes out rotated ~90 deg and collapsed,
      // while its CENTRE stays right, so it looks fine in Blender and passes
      // every position-based check. It only shows up by comparing a mesh's
      // bounding-box DIMENSIONS with its mirror twin's.
      //
      // Four meshes survive that way in the shipped rig, all on the RIGHT
      // forearm, each down to 4% of its twin's volume: the brachioradialis and
      // the extensor carpi radialis longus, belly and tendon each. Both are big
      // superficial muscles of the lateral forearm, which is why that forearm
      // reads bare next to the left one.
      //
      // The recipe's fix is to rebuild them in Blender and re-export, but the
      // rebuild is a pure mirror of the good twin, so we can do it here instead
      // and stay correct even if a future export mangles a different mesh.
      // See scripts/audit-mirror-orientation.mts, which sweeps the whole body.
      const repairMirroredMeshes = (): number => {
        interface Twin {
          mesh: THREE.SkinnedMesh; dims: THREE.Vector3; vol: number; x: number;
        }
        const groups = new Map<string, Twin[]>();
        scene.traverse((o) => {
          const m = o as THREE.SkinnedMesh;
          if (!m.isMesh || !m.isSkinnedMesh || !m.geometry) return;
          // Only meshes the lab can show, so a pair is a pair: without this the
          // groups pick up reference geometry and stop being exactly two.
          const mat = Array.isArray(m.material) ? m.material[0] : m.material;
          if (!layerForMaterial((mat as THREE.Material | undefined)?.name)) return;
          const g = m.geometry;
          if (!g.boundingSphere) g.computeBoundingSphere();
          const c = g.boundingSphere!.center.clone().applyMatrix4(m.matrixWorld);
          if (Math.abs(c.x) < 0.04) return; // midline meshes have no twin
          g.computeBoundingBox();
          const dims = g.boundingBox!.getSize(new THREE.Vector3());
          const key = `${m.name.replace(/_\d+$/, '')}|${g.getAttribute('position').count}`;
          const entry = { mesh: m, dims, vol: dims.x * dims.y * dims.z, x: c.x };
          groups.set(key, [...(groups.get(key) ?? []), entry]);
        });
        const longAxis = (d: THREE.Vector3) =>
          d.x >= d.y && d.x >= d.z ? 'x' : d.y >= d.z ? 'y' : 'z';
        const mirror = new THREE.Matrix4().makeScale(-1, 1, 1);
        let repaired = 0;
        for (const list of groups.values()) {
          if (list.length !== 2) continue;
          const [a, b] = list;
          if (a.x * b.x > 0) continue; // must be opposite sides
          if (longAxis(a.dims) === longAxis(b.dims)) continue;
          const bad = a.vol < b.vol ? a : b;
          const good = a.vol < b.vol ? b : a;
          if (bad.vol > good.vol * 0.5) continue; // not a collapse, leave alone
          // Bone lookup by NAME: the two skeletons list different bone counts,
          // so raw skinIndex values from the good side would point elsewhere.
          const badBones = bad.mesh.skeleton.bones.map((x) => x.name.replace(/_\d+$/, ''));
          const goodBones = good.mesh.skeleton.bones.map((x) => x.name.replace(/_\d+$/, ''));
          const remap = goodBones.map((n) => badBones.indexOf(n));
          if (remap.some((i) => i < 0)) continue; // cannot express it, skip
          // good local -> good world -> mirrored -> bad local
          const toBadLocal = new THREE.Matrix4()
            .copy(bad.mesh.matrixWorld).invert()
            .multiply(mirror)
            .multiply(good.mesh.matrixWorld);
          const src = good.mesh.geometry;
          const dst = src.clone();
          dst.applyMatrix4(toBadLocal);
          // A mirror flips winding, so faces would light and cull inside-out.
          const idx = dst.getIndex();
          if (idx) {
            const arr = idx.array as Uint16Array | Uint32Array;
            for (let i = 0; i + 2 < arr.length; i += 3) {
              const t = arr[i + 1]; arr[i + 1] = arr[i + 2]; arr[i + 2] = t;
            }
            idx.needsUpdate = true;
          }
          // THE NORMAL BUFFER MUST GO FIRST, and this is why the repaired muscles
          // rendered BLACK ("el braquiorradial sigue negro"). The optimized GLB
          // stores normals meshopt-quantized, as an Int8Array with normalized=true.
          // computeVertexNormals writes unit-length FLOATS through setXYZ, and
          // into an Int8Array every one of them truncates to zero: measured on the
          // shipped rig, 1076 of 1076 normals came out zero-length. A zero normal
          // kills every lighting term, so the mesh is unlit black however the
          // material is set up -- which is why making the materials double-sided
          // did not help. Dropping the attribute makes three.js allocate a fresh
          // Float32 one. Affects only the four meshes this repair rebuilds.
          dst.deleteAttribute('normal');
          dst.computeVertexNormals();
          const si = dst.getAttribute('skinIndex');
          if (si) {
            for (let i = 0; i < si.count; i++)
              for (let k = 0; k < 4; k++) {
                const from = si.getComponent(i, k);
                si.setComponent(i, k, remap[from] ?? 0);
              }
            si.needsUpdate = true;
          }
          dst.computeBoundingBox();
          dst.computeBoundingSphere();
          bad.mesh.geometry.dispose();
          bad.mesh.geometry = dst;
          repaired++;
        }
        return repaired;
      };
      const repairedCount = repairMirroredMeshes();
      if (repairedCount > 0) {
        // Left in on purpose: this is the only visible sign the repair fired, and
        // the count should stay at 4 unless a re-export changes what is mangled.
        // eslint-disable-next-line no-console
        console.info(`[RigModel] rebuilt ${repairedCount} mirror-mangled meshes from their twins`);
      }

      // CLAVICLE RE-BIND. Both clavicles ship skinned to vert_T1, so the strut
      // that holds the shoulder off the chest was the one bone in the girdle that
      // could not move -- the scapula rotated out from under a clavicle bolted to
      // the spine. See src/lib/clavicleBinding.ts for the measurements.
      const clavicleBind = bindClaviclesToShoulderGirdle(scene);
      if (clavicleBind.skipped.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          '[RigModel] clavícula sin religar:',
          clavicleBind.skipped.map((s) => `${s.mesh} (${s.reason})`).join(', '),
        );
      }

      // MEASURED OUTLIER CULL (see LIMB_OUTLIER_MARGIN). Trim away the
      // forearm/hand geometry that lands outside the limb, judged against the
      // arm's own bone AXIS and thresholded by how far its SKIN sits from it.
      const limbOutliers = new Set<THREE.Object3D>();
      {
        const _p = new THREE.Vector3();
        for (const side of ['R', 'L'] as Side[]) {
          const root = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side));
          if (!root) continue;
          const segs = boneAxis(root);
          if (segs.length === 0) continue;
          const reach = (mesh: THREE.Mesh): number => {
            const pos = mesh.geometry.getAttribute('position');
            if (!pos || pos.count === 0) return 0;
            const step = Math.max(1, Math.floor(pos.count / 300));
            const d: number[] = [];
            for (let i = 0; i < pos.count; i += step) {
              _p.fromBufferAttribute(pos, i);
              mesh.localToWorld(_p); // rest pose: bones are identity at bind
              d.push(distToAxis(_p, segs));
            }
            d.sort((a, b) => a - b);
            return d[Math.floor(d.length * 0.95)] ?? 0;
          };
          // Everything of THIS arm at or below the elbow, skin included.
          const inLimb: { mesh: THREE.Mesh; layer: AnatomyLayer; p95: number }[] = [];
          scene.traverse((o) => {
            const mesh = o as THREE.SkinnedMesh;
            if (!mesh.isMesh || !mesh.isSkinnedMesh) return;
            if (!mesh.skeleton?.bones.some((b) => root.getObjectById(b.id))) return;
            const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            const layer = layerForMaterial((mat as THREE.Material | undefined)?.name);
            if (!layer) return;
            const c = meshWorldCenter(mesh);
            if (c.y > ELBOW_Y + 0.02) return; // forearm and hand only
            inLimb.push({ mesh, layer, p95: reach(mesh) });
          });
          // The limb's own radius, from the skin that wraps the FOREARM. The
          // hand's skin is excluded: an open hand's fingers splay well away from
          // any bone, which pushes the threshold out and lets every spike
          // through. Forearm skin alone measures 6.3 cm off the axis -- the real
          // sleeve the digital tendons have to stay inside of.
          const skinReach = inLimb
            .filter((e) => e.layer === 'skin' && meshWorldCenter(e.mesh).y >= WRIST_Y - 0.02)
            .reduce((mx, e) => Math.max(mx, e.p95), 0);
          if (skinReach <= 0) continue;
          const limit = skinReach * LIMB_OUTLIER_MARGIN;
          // ...and the same skin read as a TAPERED sleeve, which is what catches
          // anything lying across the limb rather than running away from it.
          let elbowP: THREE.Vector3 | null = null;
          let wristP: THREE.Vector3 | null = null;
          root.traverse((o) => {
            const bn = o.name.replace(/_\d+$/, '');
            if (bn === 'forearm_flex' && !elbowP) elbowP = o.getWorldPosition(new THREE.Vector3());
            else if (bn === 'hand_flex' && !wristP) wristP = o.getWorldPosition(new THREE.Vector3());
          });
          const inSleeve =
            elbowP && wristP
              ? makeSleeveTest(
                  elbowP,
                  wristP,
                  inLimb
                    .filter((e) => e.layer === 'skin' && meshWorldCenter(e.mesh).y >= WRIST_Y - 0.02)
                    .map((e) => e.mesh),
                  LIMB_OUTLIER_MARGIN,
                )
              : () => true;
          // TRIM, don't drop. Some offenders are long muscles whose BELLY sits
          // properly in the forearm and whose TENDON runs on to the fingers; it
          // is only the tendon that flies, and hiding the whole mesh threw away
          // the bulkiest bellies there. So we drop only the triangles that leave
          // the limb and keep the mesh. Others -- the ~90 deg mis-oriented
          // exports -- have nothing left afterwards and are hidden, since a
          // handful of stray triangles reads as debris rather than as muscle.
          for (const e of inLimb) {
            if (e.layer === 'skin') continue;
            // Crosswise meshes are not trimmed, they are dropped: there is no
            // in-place part of a muscle that is lying across the arm.
            if (elbowP && wristP && isCrosswise(e.mesh, elbowP, wristP)) {
              limbOutliers.add(e.mesh);
              continue;
            }
            const kept = trimMeshToLimb(e.mesh, segs, limit, inSleeve);
            if (kept < LIMB_TRIM_MIN_KEPT) limbOutliers.add(e.mesh);
          }
        }
      }

      const latsGeoms = new Map<string, number>();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && /latissimus/i.test(m.name)) {
          latsGeoms.set(m.geometry.uuid, (latsGeoms.get(m.geometry.uuid) ?? 0) + 1);
        }
      });

      // Rest humeral shaft per side (GH head -> elbow), the axis the axillary
      // gradient measures distance to.
      const humeralShaft = new Map<Side, [THREE.Vector3, THREE.Vector3]>();
      for (const side of ['R', 'L'] as Side[]) {
        const sr = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side));
        let head: THREE.Vector3 | null = null;
        let elbow: THREE.Vector3 | null = null;
        sr?.traverse((o) => {
          const bn = o.name.replace(/_\d+$/, '');
          if (bn === 'humerus_gh' && !head) head = o.getWorldPosition(new THREE.Vector3());
          else if (bn === 'forearm_flex' && !elbow) elbow = o.getWorldPosition(new THREE.Vector3());
        });
        if (head && elbow) humeralShaft.set(side, [head, elbow]);
      }
      const unilateralizeLats = (mesh: THREE.Mesh): void => {
        const sk = mesh as THREE.SkinnedMesh;
        if (!sk.isSkinnedMesh || !sk.skeleton) return;
        // Rest world X of every helper bone in THIS mesh's skeleton.
        const helperX = new Map<number, number>();
        sk.skeleton.bones.forEach((b, i) => {
          if (/^latshum_[lr]$/.test(b.name.replace(/_\d+$/, ''))) {
            helperX.set(i, b.getWorldPosition(new THREE.Vector3()).x);
          }
        });
        if (helperX.size < 2) return; // nothing to disambiguate
        const meshX = meshWorldCenter(mesh).x;
        // Drop every helper that sits on the other side of the midline.
        const drop = new Set<number>();
        for (const [i, x] of helperX) if (x * meshX < 0) drop.add(i);
        if (drop.size === 0) return;
        // Un-share before writing (see above). clone() copies every attribute, so
        // a sibling still reads the ORIGINAL bilateral weights when its turn
        // comes and resolves its own side independently.
        if ((latsGeoms.get(mesh.geometry.uuid) ?? 0) > 1) {
          mesh.geometry = mesh.geometry.clone();
        }
        const si = mesh.geometry.getAttribute('skinIndex');
        const sw = mesh.geometry.getAttribute('skinWeight');
        if (!si || !sw) return;
        for (let v = 0; v < si.count; v++) {
          const idx = [si.getX(v), si.getY(v), si.getZ(v), si.getW(v)];
          const w = [sw.getX(v), sw.getY(v), sw.getZ(v), sw.getW(v)];
          let sum = 0;
          let changed = false;
          for (let k = 0; k < 4; k++) {
            if (drop.has(idx[k]) && w[k] > 0) { w[k] = 0; changed = true; }
            sum += w[k];
          }
          if (!changed) continue;
          // Renormalize to 1 so the surviving helper picks up the freed weight
          // (its share of the insertion doubles, which the LATS_ROT_* constants
          // above are calibrated for). A vertex left with no weight at all would
          // collapse to the origin, so leave those alone.
          if (sum <= 1e-6) continue;
          sw.setXYZW(v, w[0] / sum, w[1] / sum, w[2] / sum, w[3] / sum);
        }
        sw.needsUpdate = true;
      };

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
            else if (center.y < ELBOW_Y)
              smoothTwistForearm(mesh, ELBOW_Y, WRIST_Y, twistFor(mesh));
          }
          swap(mesh, bodySkinMat);
          mesh.userData.rigLayer = 'skin';
          mesh.userData.rigDistalCap = false;
          return;
        }
        // FOREARM WIRE CULL: the pearly connective strands (wrist ligaments +
        // long forearm tendons) spill past the skin cap as loose "alambres".
        // Permanently hidden in the arm band; legs/torso keep their connective.
        // MEASURED OUTLIER CULL: this mesh's geometry lands outside the limb.
        if (limbOutliers.has(mesh)) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        if (FOREARM_CULLS && layer === 'connective' && inArmBand(center)) {
          mesh.visible = false;
          mesh.userData.rigLayer = 'hidden';
          return;
        }
        // WRIST CUFF: the thin distal extensor/flexor slips poke through the
        // wrist skin as loose red spindles. Hide MUSCLE here (bone + proximal
        // bellies stay) so the wrist reads clean.
        if (FOREARM_CULLS && layer === 'muscle' && inWristCuff(center)) {
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
          FOREARM_CULLS &&
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
          // Each latissimus must ride only ITS OWN humeral helper (see above):
          // the GLB weights both helpers onto both sides, which drags the
          // contralateral lats out of the flank on abduction.
          if (ln.includes('latissimus')) unilateralizeLats(mesh);
          // Axillary fixes (see the constants above): put the teres major/minor
          // ORIGIN patches back on the scapula, and give the coracobrachialis a
          // real origin->insertion gradient instead of a uniform half-and-half
          // blend that walks the whole belly out of the shoulder.
          const bare = mesh.name.replace(/_\d+$/, '');
          if (ORIGIN_BELONGS_ON_SCAPULA.test(bare)) {
            rigidBindTo(mesh, 'scapula');
          } else if (
            GRADE_SCAPULA_HUMERUS.test(mesh.name) &&
            !ATTACHMENT_PATCH.test(bare)
          ) {
            const shaft = humeralShaft.get(center.x >= 0 ? 'R' : 'L');
            if (shaft) gradeScapulaToHumerus(mesh, shaft[0], shaft[1]);
          }
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
          } else if (center.y < ELBOW_Y && center.y > WRIST_Y) {
            // Forearm muscle bellies roll into pronation/supination with the
            // distal forearm (blended toward forearm_rot); flexion is unchanged.
            //
            // Not just the ones bound to forearm_flex: a few ship on forearm_rot
            // or even hand_flex (the ulnaris heads, the biceps/brachialis
            // insertion patches), which spins them through the FULL pronation
            // angle as a rigid block while the flesh around them rolls
            // progressively. Measured, that left ~14 deg of spurious turn down at
            // the elbow, which should not move at all. Any of the three gets the
            // gradient; bone is deliberately excluded, because the radius really
            // does turn as one piece and the ulna really does stay put.
            const dom = dominantBoneName(mesh);
            if (dom === 'forearm_flex' || dom === 'forearm_rot' || dom === 'hand_flex') {
              smoothTwistForearm(mesh, ELBOW_Y, WRIST_Y, twistFor(mesh));
            }
          } else if (center.y >= ELBOW_Y && dominantBoneName(mesh) === 'forearm_rot') {
            // Above the elbow nothing should follow the forearm's roll at all,
            // but the common extensor tendon ships on forearm_rot and swung the
            // full angle. It anchors on the lateral epicondyle of the HUMERUS.
            rigidBindTo(mesh, 'forearm_flex');
          }
        }
        // ORIGIN ABOVE THE ELBOW (see anchorOriginToHumerus). Muscle AND
        // connective: the piece that flew was the brachioradialis TENDON sheet,
        // which no muscle rule ever touched. Bone is left alone -- the radius and
        // ulna do not cross the joint.
        if (
          (layer === 'muscle' || layer === 'connective') &&
          center.y < ELBOW_Y &&
          center.y > WRIST_Y
        ) {
          anchorOriginToHumerus(mesh, ELBOW_Y);
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

      // ARM SYMMETRY. Z-Anatomy does not ship the two arms with the same pieces:
      // at the wrist the LEFT pronator quadratus carries its origin and insertion
      // patches and the right one does not, and the same goes for the pollicis
      // group and the radial extensors -- six structures, all in the distal
      // forearm, which is exactly where "el brazo izquierdo no es igual al
      // derecho, llegando a la muñeca" points. Those patches use the salmon
      // attachment tone, so on one arm the wrist shows a pale sheet that has no
      // counterpart on the other.
      //
      // A structure's pieces are matched across sides by WHAT THEY ARE (tissue
      // layer + belly/origin/insertion/tendon and its index), and a piece with no
      // counterpart is hidden. Only structures present on BOTH sides are touched:
      // a 5-versus-0 count is a naming quirk or something genuinely one-sided,
      // and hiding all of it would delete real anatomy.
      {
        interface Piece { mesh: THREE.Mesh; layer: AnatomyLayer; c: THREE.Vector3; verts: number }
        const bySide = new Map<string, { L: Piece[]; R: Piece[] }>();
        for (const side of ['R', 'L'] as Side[]) {
          const root = scene.getObjectByName(resolveArmatureName('Shoulder_Armature', side));
          if (!root) continue;
          scene.traverse((o) => {
            const mesh = o as THREE.SkinnedMesh;
            if (!mesh.isMesh || !mesh.isSkinnedMesh || !mesh.visible) return;
            const layer = mesh.userData.rigLayer as AnatomyLayer | 'hidden' | undefined;
            if (!layer || layer === 'hidden' || layer === 'skin') return;
            if (!mesh.skeleton?.bones.some((b) => root.getObjectById(b.id))) return;
            const key = structureKey(mesh.name);
            if (!key) return;
            const entry = bySide.get(key) ?? { L: [], R: [] };
            entry[side].push({
              mesh,
              layer,
              c: meshWorldCenter(mesh),
              verts: mesh.geometry.getAttribute('position')?.count ?? 0,
            });
            bySide.set(key, entry);
          });
        }
        // Pieces are matched GEOMETRICALLY -- mirror one side's centre and look
        // for the nearest piece of the same tissue and a comparable resolution.
        // Matching them by parsed NAME instead was tried and is unusable: the two
        // sides are spelled differently ("..._2" against a bare name), so the
        // parser reads one as a belly and the other as an insertion and the pass
        // hides both copies of a healthy muscle.
        const MATCH_DIST_M = 0.04;
        let dropped = 0;
        for (const { L, R } of bySide.values()) {
          if (L.length === 0 || R.length === 0) continue;
          for (const [mine, theirs] of [[L, R], [R, L]] as [Piece[], Piece[]][]) {
            const taken = new Set<Piece>();
            for (const p of mine) {
              const mirrored = p.c.clone().setX(-p.c.x);
              let best: Piece | null = null;
              let bestD = Infinity;
              for (const q of theirs) {
                if (taken.has(q) || q.layer !== p.layer) continue;
                const ratio = q.verts / Math.max(1, p.verts);
                if (ratio < 0.8 || ratio > 1.25) continue;
                const d = mirrored.distanceTo(q.c);
                if (d < bestD) { bestD = d; best = q; }
              }
              if (best && bestD <= MATCH_DIST_M) { taken.add(best); continue; }
              p.mesh.visible = false;
              p.mesh.userData.rigLayer = 'hidden';
              dropped++;
            }
          }
        }
        if (dropped > 0) {
          // eslint-disable-next-line no-console
          console.info(`[RigModel] hid ${dropped} arm pieces with no counterpart on the other side`);
        }
      }
      scene.userData.__rigPrepared = true;
    }

    // ---- Always (first pass OR remount): rebuild the tagged layer set from the
    // per-mesh userData tags, then apply the current layer toggles. ----
    const list: LayerMesh[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const lyr = mesh.userData.rigLayer as AnatomyLayer | 'hidden' | undefined;
      if (lyr === undefined) return;
      // The forearm's digital muscles used to be re-culled here BY NAME on every
      // mount. That outlived its reason: the prepare pass trims them to the limb
      // instead, so what is left of the flexor/extensor digitorum, the pollicis
      // group and the palmaris is inside the sleeve -- and they are the bulk of
      // the forearm. Culling them by name here undid the trim's whole point and
      // left the forearm looking bare next to the upper arm.
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
      // Parsed base + measured side for the click-to-dissect peel (dissectable
      // tissue only). This tag is what makes the peel act on ONE side of the
      // body; see dissectSideOfMesh for why the name alone cannot be trusted.
      let base: string | undefined;
      let side: ParsedSide | undefined;
      if (lyr === 'muscle' || lyr === 'connective') {
        const parsed = parseMeshName(mesh.name);
        base = parsed.base;
        side = dissectSideOfMesh(mesh, parsed.side);
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
      const { byArmature, restQuat, restPos, restWorld, restRootLocal } = rig;

      // Glass skin: fade the body skin out while muscles are highlighted (or when
      // a demo forces it) so the movement reads through, and back to solid when
      // nothing is active. The useFrame below eases toward this target.
      skinFadeTargetRef.current =
        (cmd.highlight?.length ?? 0) > 0 || cmd.ghostSkin ? 1 : 0;

      // Reset everything we touched last time back to rest.
      for (const b of touchedRef.current) {
        const rq = restQuat.get(b);
        if (rq) b.quaternion.copy(rq);
        const rp = restPos.get(b);
        if (rp) b.position.copy(rp);
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
      // WORLD rotation AND world POSITION, so the lats' humeral-insertion fibers
      // ride the arm. Runs every command: at rest the humerus is at rest, so the
      // helper is too (the lats returns to its spine-bound shape). Requires world
      // matrices current.
      // Position matters because the glenohumeral joint TRANSLATES: the elevation
      // chain upwardly rotates the scapula (~49 deg at 140), and the GH head sits
      // ~4 cm from that pivot, so the joint travels ~3 cm at the top of the arc.
      // Rotation alone left the insertion anchored at the REST glenoid -> a visible
      // gap at the axilla. Same for spine movements: the helpers hang off the
      // Spine_Armature ROOT (not a vertebra), so without the position copy the
      // insertion stayed behind while the trunk bent. Helper and humerus are
      // COINCIDENT at rest (verified in the GLB, dist 0.000), so this is a no-op at
      // neutral. restPos restores it (see the reset loops).
      const _qHum = new THREE.Quaternion();
      const _qHumRest = new THREE.Quaternion();
      const _qHelperRest = new THREE.Quaternion();
      const _qDelta = new THREE.Quaternion();
      const _qIdentity = new THREE.Quaternion();
      const _qParent = new THREE.Quaternion();
      const _qClearInv = new THREE.Quaternion();
      const _pHum = new THREE.Vector3();
      const _pScratch = new THREE.Vector3();
      const _sScratch = new THREE.Vector3();
      // Purely COSMETIC humeral rotation applied by clearActiveArm, per humerus.
      // The lats must not follow it: seating the arm forward to keep it out of the
      // trunk is a rendering trick, not a movement, and letting it into the delta
      // twisted the flank by ~1.7 cm the instant an arm movement was selected, at
      // 0 deg, before the user had moved anything.
      const clearanceRot = new Map<THREE.Object3D, THREE.Quaternion>();

      // FOREARM TWIST BONE: take HALF of whatever forearm_rot ended up doing, so
      // the roll is spread over two equal steps instead of one big one (see
      // smoothTwistForearm). Reads the posed bone rather than the command, so it
      // is right for pronation, supination, and any demo that poses the forearm.
      const _qRotRest = new THREE.Quaternion();
      const _qRotDelta = new THREE.Quaternion();
      const _qHalf = new THREE.Quaternion();
      const driveForearmTwist = () => {
        for (const [side, twist] of forearmTwistRef.current) {
          const rotBone = byArmature
            .get(resolveArmatureName('Shoulder_Armature', side))
            ?.get('forearm_rot');
          if (!rotBone) continue;
          const rest = restQuat.get(rotBone);
          // The twist bone is created after the rest-pose memo, so it keeps its
          // own rest on userData. Never falls into touchedRef: this runs on every
          // command and always writes an absolute value, so at rest it writes the
          // rest pose and there is nothing to undo.
          const twistRest = twist.userData.restQuat as THREE.Quaternion | undefined;
          if (!rest || !twistRest) continue;
          _qRotRest.copy(rest).invert();
          _qRotDelta.copy(_qRotRest).multiply(rotBone.quaternion); // local delta
          _qHalf.identity().slerp(_qRotDelta, 0.5);
          twist.quaternion.copy(twistRest).multiply(_qHalf);
        }
      };

      const driveLatsHelpers = () => {
        const spineBones = byArmature.get('Spine_Armature');
        if (!spineBones) return;
        for (const [helperName, armName] of LATS_PAIRS) {
          const helper = spineBones.get(helperName);
          const hum = byArmature.get(armName)?.get('humerus_gh');
          if (!helper || !hum || !helper.parent) continue;
          const humRest = restWorld.get(hum);
          const helperRest = restWorld.get(helper);

          hum.getWorldQuaternion(_qHum);
          // Divide out the cosmetic forward clearance (see clearanceRot).
          const cr = clearanceRot.get(hum);
          if (cr) _qHum.multiply(_qClearInv.copy(cr).invert());
          helper.parent.getWorldQuaternion(_qParent).invert();

          if (humRest && helperRest) {
            // How far the humerus has turned in WORLD space since the rest pose.
            humRest.decompose(_pScratch, _qHumRest, _sScratch);
            helperRest.decompose(_pScratch, _qHelperRest, _sScratch);
            _qDelta.copy(_qHum).multiply(_qHumRest.invert());
            // Follow only a share of that turn, capped in absolute terms, so the
            // insertion twists with the arm without sweeping the muscle belly out
            // of the torso at the top of the arc.
            const angle = 2 * Math.acos(Math.min(1, Math.abs(_qDelta.w)));
            const maxRad = LATS_ROT_MAX_DEG * DEG2RAD;
            const share =
              angle > 1e-4
                ? Math.min(LATS_ROT_FOLLOW, maxRad / angle)
                : LATS_ROT_FOLLOW;
            _qDelta.slerpQuaternions(_qIdentity, _qDelta, share);
            // world target = dampedDelta * helperRest, then back into local space.
            helper.quaternion.copy(_qParent).multiply(_qDelta).multiply(_qHelperRest);
          } else {
            // Older rig export without captured rest matrices: fall back to the
            // absolute copy (the pre-damping behaviour).
            helper.quaternion.copy(_qParent).multiply(_qHum);
          }

          // World position of the humeral head, expressed in the helper's parent
          // space (worldToLocal handles the armature root's own transform). Stays
          // a full 1:1 follow: the insertion must not leave the humerus, and this
          // is what closes the gap at the axilla.
          hum.getWorldPosition(_pHum);
          helper.parent.worldToLocal(_pHum);
          helper.position.copy(_pHum);
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
        const rad = ARM_CLEARANCE_SIGN[side] * ARM_CLEARANCE_DEG * factor * DEG2RAD;
        h.rotateOnAxis(AXIS_VEC.x, rad);
        // Record the clearance as a LOCAL rotation so driveLatsHelpers can divide
        // it back out. rotateOnAxis post-multiplies (qLocal = qPre * Rc), so the
        // world rotation factorizes the same way (qWorld = qWorldPre * Rc) and
        // qWorld * Rc^-1 recovers the clinically posed humerus.
        clearanceRot.set(h, new THREE.Quaternion().setFromAxisAngle(AXIS_VEC.x, rad));
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
          // SCAPULOTHORACIC WRAP (see the table above). Add the posterior-tilt and
          // external-rotation companions so the blade stays ON the ribcage, then
          // put the humerus back where it was pointing: the companions are a
          // correction to how the SCAPULA sits, and must not move the arm. The
          // humerus still RIDES the scapula (it is its child), so the shoulder
          // joint travels ~3.6 cm as it really does -- only its orientation, which
          // is what the goniometer and the readout report, is held.
          const scapBone = shoulderBones?.get('scapula');
          const humBone = shoulderBones?.get('humerus_gh');
          // The wrap table is keyed on SCAPULOTHORACIC upward rotation (it runs to
          // 60 deg). Since the girdle split its rotation between the SC and AC
          // joints, `outputs.scapula` is only the AC share, so take the published
          // total -- feeding the wrap the smaller number would under-wrap the
          // blade and let it lift off the ribs again.
          const upRad = outputs.scapulaTotal ?? outputs.scapula;
          if (scapBone && humBone && upRad) {
            scene.updateMatrixWorld(true);
            const before = scapBone.getWorldQuaternion(new THREE.Quaternion());
            const [wy, wz] = scapulaWrap(upRad / DEG2RAD);
            // The two shoulder armatures are mirrored, so the companion axes flip
            // sign on the left. Swept offline over all four sign combinations per
            // side: +y+z is the only one that helps on the right and -y-z the only
            // one on the left -- the others make the blade drift WORSE than doing
            // nothing (up to 17 cm). Upward rotation itself is +x on both sides,
            // hence the asymmetry here.
            const wrapSign = SCAPULA_WRAP_SIGN[cmd.side];
            scapBone.rotateOnAxis(AXIS_VEC.y, wrapSign * wy * DEG2RAD);
            scapBone.rotateOnAxis(AXIS_VEC.z, wrapSign * wz * DEG2RAD);
            touchedRef.current.add(scapBone);
            scene.updateMatrixWorld(true);
            const after = scapBone.getWorldQuaternion(new THREE.Quaternion());
            humBone.quaternion.premultiply(after.invert().multiply(before));
            touchedRef.current.add(humBone);
          }
          // THORACIC PARTICIPATION. When the chain leans the trunk (top of the
          // elevation arc), the arms must ride the upper thorax like they do for
          // any spine movement -- the shoulder armatures are separate scene-root
          // skins, so without this the neck skin follows the spine while the
          // deltoid stays behind and the seam tears (7.5 cm, measured). Runs only
          // when a lean was actually placed, so nothing changes below 150 deg.
          if (outputs.thoracic) {
            scene.updateMatrixWorld(true);
            carryShouldersWithSpine();
          }
          // AIM. Land the arm on exactly the goniometric angle (see aimPlane).
          // Everything above shapes the movement -- rhythm, scapular wrap, trunk
          // participation -- and this closes the residual: the humeral shaft is
          // turned the last few degrees, about the world axis the clinical angle
          // is measured around, until it sits `cmd.angleDeg` from where it rests.
          // Runs last so it also absorbs whatever the trunk lean did to the arm.
          if (ctrl.aimPlane && humBone) {
            scene.updateMatrixWorld(true);
            const elbowBone = shoulderBones?.get('forearm_flex');
            const restH = restWorld.get(humBone);
            const restE = elbowBone ? restWorld.get(elbowBone) : undefined;
            if (elbowBone && restH && restE) {
              // Rest direction of the shaft, and where it should point now.
              const rh = new THREE.Vector3().setFromMatrixPosition(restH);
              const re = new THREE.Vector3().setFromMatrixPosition(restE);
              const want = re.sub(rh).normalize();
              // The clinical angle is read IN ITS PLANE, so only the in-plane
              // part of the shaft is swung and the out-of-plane part is kept.
              // This rig rests with the arms carried forward (the elbow sits ~16
              // cm anterior to the shoulder), so rotating the whole 3D direction
              // would sweep a cone and land the arm ~24 deg short of the reading.
              // For abduction the plane is frontal: turn (x, y), keep z.
              const inPlaneSign = cmd.side === 'R' ? 1 : -1;
              if (ctrl.aimPlane === 'z') {
                const r = Math.hypot(want.x, want.y);
                const a = Math.atan2(want.x, -want.y) + cmd.angleDeg * DEG2RAD * inPlaneSign;
                want.set(Math.sin(a) * r, -Math.cos(a) * r, want.z).normalize();
              } else {
                const r = Math.hypot(want.z, want.y);
                const a = Math.atan2(want.z, -want.y) + cmd.angleDeg * DEG2RAD;
                want.set(want.x, -Math.cos(a) * r, Math.sin(a) * r).normalize();
              }
              const ph = humBone.getWorldPosition(new THREE.Vector3());
              const pe = elbowBone.getWorldPosition(new THREE.Vector3());
              const have = pe.sub(ph).normalize();
              const fix = new THREE.Quaternion().setFromUnitVectors(have, want);
              // Apply that WORLD rotation to a bone whose quaternion is local.
              const pw = humBone.parent
                ? humBone.parent.getWorldQuaternion(new THREE.Quaternion())
                : new THREE.Quaternion();
              humBone.quaternion.premultiply(
                pw.clone().invert().multiply(fix).multiply(pw),
              );
              touchedRef.current.add(humBone);
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
      // humerus's WORLD rotation AND position (the GH joint travels ~3 cm as the
      // scapula upwardly rotates); at rest the humerus is at rest so the helper is
      // too. See rig-latissimus-cross-armature. No-op if the bones aren't in the
      // GLB yet (older rig export).
      scene.updateMatrixWorld(true);
      // The forearm's twist bone mirrors half of whatever the pronation pivot
      // ended up doing, so it must run after every other bone is placed.
      driveForearmTwist();
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
        const rp = rig.restPos.get(b);
        if (rp) b.position.copy(rp);
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
    // Glass, not gray film: lift the shell's emissive as it ghosts so the
    // translucent envelope glows softly (edge-lit by its Fresnel sheen) instead of
    // reading as a dull veil over the muscles. Rides back to 0 as it re-solidifies.
    mat.emissiveIntensity = next * BODY_SKIN_GHOST_EMISSIVE;
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
