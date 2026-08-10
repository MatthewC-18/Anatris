// src/components/movement/labFraming.ts
//
// Where the movement lab's camera should look.
//
// THE PROBLEM THIS SOLVES
//
// RigViewer's original AutoFit unioned every visible SkinnedMesh and fitted the
// camera to that box — the whole standing rig, head to feet, for every region.
// A body is roughly 1:3 (wide:tall) and the canvas is roughly 4:3, so the fit is
// height-constrained and the two side gutters are empty BY CONSTRUCTION. Measured
// on the shipped build:
//
//   1920x1080  model silhouette = 5.4% of the canvas between the panels
//   1440x900   6.8%
//   knee       4.7%   (the joint itself a ~130px speck at the bottom)
//
// The fix is not more UI in the gutters, it is pointing the camera at the thing
// under study. Every movement already declares exactly which bones it drives
// (lib/boneMap.ts), so the joint's position is derivable — no new authored data.
//
// WHY BONES AND NOT THE REGION MESH FILTER
//
// Explorar solves the same problem with `resolveRegionFocus` (data/regiones.ts),
// which matches mesh-NAME keywords. That cannot be reused here: it is written
// against the atlas GLB's naming, and the lab renders a different model
// (cuerpo-rig.opt.glb) with its own armatures and mesh names. The bone map is
// the rig's own vocabulary and is guaranteed to resolve in rig space.
//
// FRAMING THE ARC, NOT THE POSE
//
// A joint box measured at the rest pose is wrong the moment the movement runs:
// frame tightly on a neutral shoulder and the hand leaves the picture at 120 deg
// of abduction. So a limb joint is framed as a SPHERE centred on the driven bone
// with the radius of its own reach (the distance out to its farthest descendant
// bone), which is precisely the volume the segment can sweep into. The framing
// then holds for the whole arc and never has to chase the animation.
//
// ASCII-only source; no `any`.

import * as THREE from 'three';
import {
  getBoneControl,
  resolveArmatureName,
  type BoneControl,
  type Side,
} from '../../lib/boneMap';

/** The five unique armature roots, mirrored from RigModel. */
const SPINE_ARMATURE = 'Spine_Armature';

/**
 * Context margin added around the swept volume, as a fraction of body height.
 * Enough neighbouring anatomy to read the movement against (a shoulder needs the
 * ribcage behind it), not so much that we are back to a whole figure.
 */
const CONTEXT_PAD = 0.10;

/**
 * Floor on the framed box, as a fraction of body height. Without it a
 * single-short-bone movement (ankle inversion) would fill the screen with a foot
 * and lose every landmark around it.
 */
const MIN_SPAN = 0.34;

/**
 * How far the framed box may be shifted toward the screen's right, in CSS px, to
 * clear the console. See `focalPaddingLeft`.
 */
const CONSOLE_SHIFT_PX = 70;

/**
 * three's GLTFLoader uniquifies colliding node names with a `_1`, `_2` tail, and
 * this rig's bone names are identical on both sides — so the second-loaded side
 * arrives as `humerus_gh_1`. Bone names ARE unique inside one armature subtree,
 * so we match on the base name within the given root. Same rule RigModel caches
 * by; keep the two in step.
 */
function findBone(root: THREE.Object3D, base: string): THREE.Object3D | null {
  let hit: THREE.Object3D | null = null;
  root.traverse((o) => {
    if (hit) return;
    if (o.name.replace(/_\d+$/, '') === base) hit = o;
  });
  return hit;
}

/** Every armature+bone pair a movement drives, in rig naming. */
function drivenTargets(
  control: BoneControl,
  side: Side,
): { armature: string; bone: string }[] {
  switch (control.kind) {
    case 'joint': {
      const armature = resolveArmatureName(control.armatureBase, side);
      return [
        { armature, bone: control.bone },
        ...(control.couplings ?? []).map((c) => ({ armature, bone: c.bone })),
      ];
    }
    case 'spine':
      return control.bones.map((bone) => ({ armature: SPINE_ARMATURE, bone }));
    case 'chain':
      return control.targets.flatMap(({ target }) =>
        target.bones.map((bone) => ({
          armature:
            target.armature === 'spine'
              ? SPINE_ARMATURE
              : resolveArmatureName('Shoulder_Armature', side),
          bone,
        })),
      );
    default:
      return [];
  }
}

/** Grow a box symmetrically until neither X nor Y is shorter than `min`. */
function ensureMinSpan(box: THREE.Box3, min: number): void {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const half = new THREE.Vector3(
    Math.max(size.x, min) / 2,
    Math.max(size.y, min) / 2,
    Math.max(size.z, min) / 2,
  );
  box.setFromCenterAndSize(center, half.multiplyScalar(2));
}

/**
 * The box the camera should fit for `movementId`, or null when the movement
 * drives nothing we can locate (unmapped, unsupported, or the rig has not
 * finished loading). The caller then falls back to the whole-body box.
 *
 * @param scene      the loaded rig scene, with world matrices already current
 * @param movementId the clinical movement being driven, or null at rest
 * @param side       which limb, for the paired armatures
 * @param bodyBox    the whole-body box, used for the scale-relative constants
 *                   and as the outer clamp
 */
export function movementFocusBox(
  scene: THREE.Object3D,
  movementId: string | null,
  side: Side,
  bodyBox: THREE.Box3,
): THREE.Box3 | null {
  if (!movementId) return null;
  const control = getBoneControl(movementId);
  if (!control || control.kind === 'unsupported') return null;

  const targets = drivenTargets(control, side);
  if (targets.length === 0) return null;

  const bodyH = bodyBox.getSize(new THREE.Vector3()).y;
  if (!isFinite(bodyH) || bodyH <= 0) return null;

  const box = new THREE.Box3();
  const pos = new THREE.Vector3();
  let found = false;

  for (const { armature, bone } of targets) {
    const root = scene.getObjectByName(armature);
    if (!root) continue;
    const obj = findBone(root, bone);
    if (!obj) continue;
    found = true;

    obj.getWorldPosition(pos);
    box.expandByPoint(pos);

    // The reach of this bone: how far its own subtree extends. For a limb that
    // is the segment length out to the fingertips, which is exactly the radius
    // the joint sweeps through during the arc. Included as a sphere around the
    // JOINT (not as the descendants' rest positions) so the framing covers where
    // the limb is going, not only where it currently hangs.
    const joint = pos.clone();
    let reach = 0;
    const child = new THREE.Vector3();
    obj.traverse((d) => {
      d.getWorldPosition(child);
      reach = Math.max(reach, joint.distanceTo(child));
    });
    if (reach > 0) {
      box.expandByPoint(joint.clone().addScalar(reach));
      box.expandByPoint(joint.clone().addScalar(-reach));
    }
  }

  if (!found || box.isEmpty()) return null;

  box.expandByScalar(bodyH * CONTEXT_PAD);
  ensureMinSpan(box, bodyH * MIN_SPAN);

  // Never frame outside the body. Clamped to the body box EXACTLY, with no slack
  // added: the reach sphere for a shoulder reaches well above the head, and any
  // margin here became a visible band of empty stage above the scalp while the
  // thighs got cropped at the bottom to pay for it. Cropping a close-up at
  // mid-thigh is how an anatomical plate is composed; floating the figure below
  // a strip of nothing is not.
  box.min.max(bodyBox.min);
  box.max.min(bodyBox.max);
  if (box.isEmpty()) return null;

  return box;
}

/**
 * Extra world-space padding to add on the box's LEFT so the subject sits in the
 * middle of the space the user can actually see.
 *
 * The canvas runs edge to edge under the floating console, so `fitToBox` centres
 * the model on the CANVAS while the console covers the leftmost ~356px of it.
 * At whole-body zoom that was a barely visible 70px of bias; once we zoom into a
 * joint it would park the joint behind the panel. camera-controls grows the box
 * by these paddings before fitting, so padding one side shifts the subject to
 * the other by half of it.
 *
 * Returns 0 on compact layouts, where the console is a bottom sheet and the
 * canvas is genuinely all the user's.
 *
 * @param boxHeight  the framed box's height in world units
 * @param canvasPx   the canvas height in CSS px
 * @param compact    true below the lg breakpoint
 */
export function focalPaddingLeft(
  boxHeight: number,
  canvasPx: number,
  compact: boolean,
): number {
  if (compact || canvasPx <= 0 || !isFinite(boxHeight)) return 0;
  // The fit is height-constrained here (a limb box is taller than it is wide in
  // every region), so world-per-pixel follows the vertical axis.
  const worldPerPx = boxHeight / canvasPx;
  return 2 * CONSOLE_SHIFT_PX * worldPerPx;
}
