// src/data/attachmentLandmarks.ts
//
// SHORT bony-landmark names for the 3D origin/insertion markers, keyed by the
// muscle id used in src/data/muscles/shoulder.ts (kebab-case, e.g.
// "teres-minor"). These are the terse names that fit on a floating label in
// the scene — NOT the full origin/insertion sentences (those live in the
// muscle records and the clinical content).
//
// WHY A SEPARATE FILE:
// Keeping these here means the big muscle file doesn't have to be rewritten,
// and the label text for every muscle's attachments lives in one obvious place
// you can edit freely. If a muscle isn't listed, the marker simply shows the
// generic "Origen" / "Inserción".
//
// VERIFY: these are standard landmark names but confirm spelling/term choice
// against your sources before publishing. They are display text, not clinical
// claims with citations.

export interface AttachmentLandmark {
  origin: string;
  insertion: string;
}

/** muscleId (kebab-case) -> short landmark names for origin & insertion. */
export const ATTACHMENT_LANDMARKS: Record<string, AttachmentLandmark> = {
  // --- rotator cuff ---
  supraspinatus: {
    origin: 'fosa supraespinosa',
    insertion: 'troquíter',
  },
  infraspinatus: {
    origin: 'fosa infraespinosa',
    insertion: 'troquíter',
  },
  'teres-minor': {
    origin: 'borde lateral de la escápula',
    insertion: 'troquíter',
  },
  subscapularis: {
    origin: 'fosa subescapular',
    insertion: 'troquín',
  },

  // --- superficial glenohumeral movers ---
  deltoid: {
    origin: 'clavícula, acromion y espina',
    insertion: 'tuberosidad deltoidea',
  },
  'pectoralis-major': {
    origin: 'clavícula, esternón y costillas',
    insertion: 'cresta del troquíter',
  },
  'teres-major': {
    origin: 'ángulo inferior de la escápula',
    insertion: 'cresta del troquín',
  },

  // --- biarticular arm muscles ---
  'biceps-brachii': {
    origin: 'tubérculo supraglenoideo y coracoides',
    insertion: 'tuberosidad del radio',
  },
  'triceps-brachii': {
    origin: 'tubérculo infraglenoideo',
    insertion: 'olécranon',
  },
  coracobrachialis: {
    origin: 'apófisis coracoides',
    insertion: 'diáfisis humeral medial',
  },
};

/** Look up landmark names for a muscle id (returns null if not listed). */
export function getLandmarks(muscleId: string): AttachmentLandmark | null {
  return ATTACHMENT_LANDMARKS[muscleId] ?? null;
}
