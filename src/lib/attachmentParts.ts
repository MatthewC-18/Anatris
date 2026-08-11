// src/lib/attachmentParts.ts
//
// WHERE Z-ANATOMY'S ATTACHMENT MARKERS ARE WRONG, AND HOW WE KNOW.
//
// The model ships tiny point-meshes marking where a muscle attaches, suffixed
// `o` for origin and `e` for end/insertion. AttachmentMarkers reads them to draw
// its teaching pins. For most muscles they are right: measured on the shipped
// model, deltoid, biceps, triceps, supraspinatus and the rest each carry exactly
// two insertion markers -- one per side, on the muscle's own base -- with the
// origins spread over the heads.
//
// Two muscles do not, and a physiotherapist reviewing the shoulder caught the
// consequence: "Inserción se repite (pectoral) ✗ está mal puesta".
//
//   PECTORALIS MAJOR ships EIGHT insertion markers instead of two. Six of them
//   belong to the sternocostal head and sit on the STERNUM (x ~0.01-0.06,
//   z ~+0.10), which is where that head ARISES. So the app drew four pins reading
//   "Inserción: cresta del troquíter" across the breastbone.
//
//   TRAPEZIUS has its two parts INVERTED. Its lone "insertion" marker sits near
//   the midline at the nape (0.020, 1.572, -0.074) and its "origins" sit out on
//   the shoulder (0.107 / 0.160, y ~1.41).
//
// Neither correction is a judgement call: both contradict the app's OWN cited
// content. shoulderMuscles.ts gives the trapezius origin as "protuberancia
// occipital externa, ligamento nucal y apófisis espinosas de C7 a T12" and its
// insertion as "tercio lateral de la clavícula, acromion y espina de la
// escápula" -- exactly the reverse of the mesh suffixes. It likewise lists the
// pectoralis major's sternocostal head under ORIGIN ("esternón y cartílagos
// costales de las seis primeras costillas").
//
// A curated table rather than a geometric heuristic ("insertions are lateral")
// on purpose: a heuristic that silently relabels attachments is exactly the kind
// of thing that would quietly break a muscle nobody rechecked. Everything here is
// explicit, verifiable against the model, and covered by tests.

import { parseMeshName, type MusclePart } from './parseMeshName';

/** How a muscle's attachment markers deviate from what the mesh suffixes claim. */
interface AttachmentFix {
  /** The whole muscle has origin and insertion the wrong way round. */
  swap?: boolean;
  /**
   * Mesh bases whose markers are really ORIGINS however they are suffixed. For a
   * converging muscle, each head arises separately and they share one insertion,
   * so a head's marker is an origin by construction.
   */
  originBases?: string[];
}

const ATTACHMENT_FIXES: Record<string, AttachmentFix> = {
  // Both parts inverted; see the header, and shoulderMuscles.ts for the source.
  trapezius: { swap: true },
  // The sternocostal head arises from the sternum and costal cartilages; only the
  // muscle's own marker is the humeral insertion.
  'pectoralis-major': {
    originBases: ['Sternocostal_head_of_pectoralis_major_muscle'],
  },
};

/**
 * The part a marker mesh REALLY represents, given the muscle it belongs to.
 *
 * Returns the parsed part unchanged for every muscle the model gets right, so
 * this is safe to call for all of them.
 */
export function resolveAttachmentPart(
  muscleId: string,
  meshName: string,
  parsedPart: MusclePart,
): MusclePart {
  if (parsedPart !== 'origin' && parsedPart !== 'insertion') return parsedPart;
  const fix = ATTACHMENT_FIXES[muscleId];
  if (!fix) return parsedPart;

  const base = parseMeshName(meshName).base;
  if (fix.originBases?.some((b) => base.toLowerCase().startsWith(b.toLowerCase()))) {
    return 'origin';
  }
  if (fix.swap) return parsedPart === 'origin' ? 'insertion' : 'origin';
  return parsedPart;
}

/** True when a muscle needed correcting (for tests and audits). */
export function hasAttachmentFix(muscleId: string): boolean {
  return muscleId in ATTACHMENT_FIXES;
}

/**
 * Merge markers that sit on top of each other into one pin.
 *
 * An attachment is one landmark, but the model can carry several point-meshes a
 * centimetre apart for it, and each used to become its own glowing sphere and its
 * own label -- so the label stack read as "the insertion is repeated" even where
 * the position was right. Markers further apart than this are genuinely distinct
 * landmarks (the deltoid really does arise from the clavicle, the acromion AND
 * the scapular spine) and must survive.
 */
export const MARKER_MERGE_RADIUS_M = 0.02;

/** Cluster positions, returning the centroid of each cluster. */
export function mergeNearbyMarkers<T extends { position: { x: number; y: number; z: number } }>(
  markers: T[],
  radius = MARKER_MERGE_RADIUS_M,
): T[] {
  const kept: T[] = [];
  for (const m of markers) {
    const near = kept.find((k) => {
      const dx = k.position.x - m.position.x;
      const dy = k.position.y - m.position.y;
      const dz = k.position.z - m.position.z;
      return dx * dx + dy * dy + dz * dz <= radius * radius;
    });
    if (!near) kept.push(m);
  }
  return kept;
}
