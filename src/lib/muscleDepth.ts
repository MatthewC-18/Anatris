// src/lib/muscleDepth.ts
//
// DISSECTION planes for a muscle mesh, by name. Assigns each muscle to one of
// three anatomical planes so the movement lab can PEEL them superficial -> deep,
// the way Complete Anatomy / Human Anatomy Atlas expose successive layers with a
// dissection slider:
//
//   plane 1  SUPERFICIAL  the outer, first-palpable movers you see on the surface
//                         (deltoid, trapezius, latissimus, pectoralis major,
//                          biceps/triceps brachii, gluteus maximus, rectus
//                          femoris, hamstrings, gastrocnemius, rectus abdominis...)
//   plane 2  INTERMEDIATE the layer reflected next -- deep to the outer movers
//                         (rhomboids, teres major, pectoralis minor, serratus,
//                          erector spinae, brachialis, soleus, gluteus medius,
//                          adductor magnus...)
//   plane 3  DEEP         the deepest, segmental / against-bone plane
//                         (rotator cuff, transversospinalis/multifidus, deep neck
//                          flexors, suboccipitals, deep hip rotators, tibialis
//                          posterior, transversus abdominis...)
//
// WHY a dedicated classifier (and not the Muscle.depth field):
//   The clinical catalog's `depth` is a RELATIVE per-region occlusion ordering
//   used to ghost occluders in the Explorar viewer -- it is not a body-wide
//   dissection plane and it only covers four regions. The lab's peel needs one
//   consistent superficial->deep scale over EVERY muscle on the rig, authored on
//   its own terms (e.g. the biceps brachii is Muscle.depth 2 there but is a
//   surface/plane-1 muscle here).
//
// HOW matching works:
//   The runtime mesh name is normalized (lowercased, separators collapsed to one
//   space) and tested for the tokens below with a substring match; the DEEP set
//   is checked before the INTERMEDIATE set so a specific deep token wins over a
//   broader intermediate one (e.g. "semispinalis" -> deep beats "spinalis"
//   -> intermediate). Z-Anatomy glues its .o/.e/.l/.r suffixes onto the name
//   ("...profundus.o.l" -> "...profundusol"), so tokens are muscle STEMS only and
//   never depend on a trailing marker. Anything unmatched is plane 1 (an unknown
//   muscle is far likelier to be a surface mover, and plane 1 shows by default).
//
//   Tokens are SPECIFIC where a family splits across planes so a shallower sibling
//   never trips a deeper token:
//     "teres minor"(deep) vs "teres major"(intermediate);
//     "pectoralis minor"(intermediate) vs "pectoralis major"(superficial);
//     "flexor digitorum profundus"(deep) vs "...superficialis"(superficial);
//     "tibialis posterior"(deep) vs "tibialis anterior"(superficial);
//     "obliquus internus"(deep) vs "...externus"(superficial);
//     "gluteus minimus"(deep) vs "gluteus medius"(intermediate) vs maximus(superf.);
//     "vastus intermedius"(deep) vs the other vasti(superficial);
//     "pronator quadratus"(deep) vs "pronator teres"(superficial).
//
// ASCII-only source; no `any`.

/** Muscle dissection plane: 1 superficial, 2 intermediate, 3 deep. */
export type MuscleDepthLevel = 1 | 2 | 3;

/** Number of muscle planes (the deepest level). */
export const MUSCLE_PLANE_COUNT = 3;

/** Spanish label per plane, for the dissection UI. */
export const MUSCLE_PLANE_LABELS: Record<MuscleDepthLevel, string> = {
  1: 'Superficial',
  2: 'Intermedio',
  3: 'Profundo',
};

// -- plane 3: DEEP (checked FIRST) ------------------------------------------
const DEEP_TOKENS: readonly string[] = [
  // Rotator cuff + deepest scapular
  'supraspinatus',
  'infraspinatus',
  'subscapularis',
  'teres minor',
  // Transversospinalis + the deep segmental back
  'semispinalis',
  'multifidus',
  'rotatores',
  'interspinales',
  'intertransversarii',
  // Suboccipital + deep neck flexors
  'suboccipital',
  'rectus capitis',
  'obliquus capitis',
  'longus colli',
  'longus capitis',
  'scalenus',
  'scalene',
  'pterygoid',
  // Posterior abdominal wall
  'quadratus lumborum',
  'iliacus',
  'psoas',
  // Deep external rotators of the hip + gluteus minimus
  'piriformis',
  'obturator',
  'gemellus',
  'quadratus femoris',
  'gluteus minimus',
  // Deep thigh / leg
  'vastus intermedius',
  'tibialis posterior',
  'flexor digitorum longus',
  'flexor hallucis longus',
  'popliteus',
  // Deep forearm (mostly culled in-arm, kept for completeness)
  'flexor digitorum profundus',
  'flexor pollicis longus',
  'pronator quadratus',
  'abductor pollicis longus',
  'extensor pollicis',
  'extensor indicis',
  // Deep abdominal wall
  'transversus',
  'obliquus internus',
  'internal oblique',
  // Deep intrinsics of hand / foot
  'interosse',
  'lumbrical',
  'adductor pollicis',
  'adductor hallucis',
  'quadratus plantae',
] as const;

// -- plane 2: INTERMEDIATE (checked after DEEP) -----------------------------
const INTERMEDIATE_TOKENS: readonly string[] = [
  // Scapulothoracic layer under trapezius / deltoid
  'rhomboid',
  'teres major',
  'pectoralis minor',
  'levator scapulae',
  'serratus',
  'subclavius',
  // Arm layer under biceps / triceps
  'brachialis', // deep to biceps (NOT brachioradialis, which is superficial)
  'coracobrachialis',
  'anconeus',
  'supinator',
  // Deep-ish back extensors (erector spinae) + splenius, under trapezius/lats
  'splenius',
  'erector',
  'iliocostalis',
  'longissimus',
  'spinalis', // (semispinalis already caught as DEEP above)
  // Lower limb second layer
  'soleus', // deep to gastrocnemius
  'gluteus medius',
  'adductor magnus',
  'adductor brevis',
  'pectineus',
] as const;

/** Lowercase a mesh name and collapse every separator to a single space. */
function normalizeName(meshName: string): string {
  return meshName.toLowerCase().replace(/[._\s]+/g, ' ').trim();
}

/**
 * The dissection plane of a muscle mesh: 1 (superficial) .. 3 (deep). Only call
 * this for meshes already known to be muscle tissue; unrecognized names fall
 * back to plane 1.
 */
export function muscleDepthLevel(meshName: string): MuscleDepthLevel {
  const norm = normalizeName(meshName);
  for (const token of DEEP_TOKENS) {
    if (norm.includes(token)) return 3;
  }
  for (const token of INTERMEDIATE_TOKENS) {
    if (norm.includes(token)) return 2;
  }
  return 1;
}
