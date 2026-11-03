// src/lib/labFraming.ts
//
// Which bones the movement lab's camera should frame for each region.
//
// WHY: the lab framed the WHOLE skinned body, always. Picking "Hombro" and
// getting a 1,75 m figure meant the joint under study was a few percent of the
// canvas, and every user had to zoom by hand before they could read anything --
// on a tool whose entire proposition is reading one joint closely.
//
// Bones, not meshes, because they are the one naming the rig guarantees
// (verified from the GLB; see rig-bones.txt and boneMap.ts). Mesh names come
// from Z-Anatomy and are inconsistent across sides.
//
// The listed bones are the ones that must STAY IN FRAME, which is not the same
// as the ones that move: the shoulder lists the forearm and hand because
// abduction carries them overhead, and the hip lists the shin because flexion
// swings it forward. The runtime unions their world positions at the CURRENT
// pose and pads the result (see RigViewer/AutoFit), so the box follows the rig
// instead of being a baked number that silently rots when the GLB changes.

/** Region id (store.region) -> bone base names to keep in frame. */
export const REGION_FRAME_BONES: Record<string, readonly string[]> = {
  // Girdle plus the whole arm: elevation ends with the hand above the head.
  shoulder: ['clavicle', 'scapula', 'humerus_gh', 'forearm_flex', 'forearm_rot', 'hand_flex'],
  // From the glenohumeral joint down, so the humerus gives the arc its
  // reference limb the way a goniometer does.
  elbow: ['humerus_gh', 'forearm_flex', 'forearm_rot', 'hand_flex'],
  // Vertebral blocks. Each borrows a few of the neighbouring segment's
  // vertebrae, because a regional range is read against the segment above and
  // below it, never in isolation.
  cervical: ['vert_C1', 'vert_C2', 'vert_C3', 'vert_C4', 'vert_C5', 'vert_C6', 'vert_C7',
             'vert_T1', 'vert_T2', 'vert_T3'],
  thoracic: ['vert_C7', 'vert_T1', 'vert_T2', 'vert_T3', 'vert_T4', 'vert_T5', 'vert_T6',
             'vert_T7', 'vert_T8', 'vert_T9', 'vert_T10', 'vert_T11', 'vert_T12', 'vert_L1'],
  lumbar: ['vert_T10', 'vert_T11', 'vert_T12', 'vert_L1', 'vert_L2', 'vert_L3', 'vert_L4',
           'vert_L5', 'vert_sacrum'],
  // Pelvis plus the whole leg: flexion swings the shin forward and up.
  hip: ['vert_sacrum', 'vert_L5', 'femur_base', 'patella', 'shin_flex', 'foot_flex'],
  knee: ['femur_base', 'patella', 'shin_flex', 'foot_flex'],
  ankle: ['shin_flex', 'foot_flex'],
};

/**
 * Extra room around the bone box, as a FRACTION of the box's own larger side.
 *
 * Bones are points on the axis of a limb; the skin, the muscle bellies and the
 * scapula's blade all sit outside them. A single proportional margin covers
 * that without a per-region magic number: a small region gets a small margin, a
 * long one gets a proportionally larger one.
 */
export const FRAME_PAD_RATIO = 0.22;

/**
 * Smallest side the framing box may have, in metres.
 *
 * The vertebrae all sit ON the midline, so a spine region's bone box measures
 * exactly 0.00 m wide (measured: cervical 0.00 x 0.14, thoracic 0.00 x 0.34).
 * A box with a zero side is a plane, and fitting a camera to a plane either
 * divides by zero or flies the camera into it. The trunk is about 0.35 m deep
 * and wide at the chest, so this is also roughly what the user needs to see.
 */
export const FRAME_MIN_SIDE = 0.34;

/** True when this region has a framing recipe. */
export function hasRegionFrame(region: string | null | undefined): boolean {
  return region != null && region in REGION_FRAME_BONES;
}

/** Bone base names to frame, or null to fall back to the whole body. */
export function regionFrameBones(region: string | null | undefined): readonly string[] | null {
  if (region == null) return null;
  return REGION_FRAME_BONES[region] ?? null;
}
