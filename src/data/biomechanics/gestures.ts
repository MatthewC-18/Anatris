// src/data/biomechanics/gestures.ts
//
// DATA for the schematic biomechanics engine. Separates "what happens in this
// gesture" (here) from "how it is drawn" (BiomechanicsSchematic.tsx), the same
// data/render split used by shoulder.ts.
//
// Each gesture defines: the anatomical plane it is best seen in, its range of
// motion, the joint rhythm (how the total motion is split between the
// glenohumeral joint and the scapula), and the muscles involved with an
// ACTIVATION CURVE describing when in the range each muscle is most active.
//
// ---------------------------------------------------------------------------
// CLINICAL CONTENT DISCLAIMER
// Ranges, rhythms and activation windows below are drafted from standard
// references as a STARTING POINT. Verify against an authoritative source
// before this ships in a clinical product. Treat as draft copy.
// ---------------------------------------------------------------------------
//
// Muscle ids reference shoulder.ts so the schematic can cross-highlight the 3D
// model later (hover a band here -> light the muscle in the scene).

import type { RomMuscleRole } from '../../types/rom';

/** The plane the gesture is best observed in (drives the default view). */
export type AnatomicalPlane = 'frontal' | 'sagittal' | 'transverse';

/** Which schematic view shows this gesture clearly. */
export type SchematicView = 'anterior' | 'posterior';

/**
 * Activation curve sample. `at` is the fraction of the range (0..1); `level`
 * is the relative activation (0..1) of the muscle at that point. The engine
 * interpolates linearly between samples to get activation at any angle.
 */
export interface ActivationSample {
  at: number; // 0..1 along the range
  level: number; // 0..1 activation
}

export interface GestureMuscle {
  /** Muscle id (matches shoulder.ts ids for future cross-highlight). */
  id: string;
  /** Display label in the schematic. */
  label: string;
  /** Role, reusing the ROM role palette (amber / sky / violet). */
  role: RomMuscleRole;
  /** Activation across the range; engine interpolates between samples. */
  activation: ActivationSample[];
  /**
   * Schematic attachment anchors, as fractions, interpreted by the engine in
   * the chosen view. `originRef` is a named landmark on the (possibly moving)
   * proximal bone; `insertionAlongHumerus` is how far down the humeral shaft
   * the insertion sits (0 = head, 1 = elbow). This keeps the data view-
   * agnostic; the engine maps landmarks to concrete points per view.
   */
  originRef: LandmarkRef;
  insertionAlongHumerus: number; // 0..1
}

/** Named proximal-bone landmarks the engine knows how to place per view. */
export type LandmarkRef =
  | 'acromion'
  | 'supraspinous-fossa'
  | 'infraspinous-fossa'
  | 'subscapular-fossa'
  | 'coracoid'
  | 'clavicle-lateral'
  | 'inferior-angle'
  | 'lateral-border';

export interface JointRhythm {
  /**
   * Below this many degrees, motion is essentially all glenohumeral (the
   * "setting phase"). Beyond it, the scapula contributes `scapularShare` of the
   * additional motion. Set settingPhaseDeg=0 and scapularShare=0 for gestures
   * with negligible scapular contribution (e.g. pure rotations).
   */
  settingPhaseDeg: number;
  scapularShare: number; // 0..1, share of motion beyond the setting phase
}

export interface Gesture {
  id: string;
  name: string; // Spanish label
  plane: AnatomicalPlane;
  defaultView: SchematicView;
  rangeDeg: number; // max angle the slider allows
  rhythm: JointRhythm;
  muscles: GestureMuscle[];
  /** Short clinical note shown under the diagram. */
  note: string;
  /**
   * Maturity flag for honesty during development: 'tuned' means the geometry
   * has been validated visually; 'draft' means the data exists but the drawing
   * still needs per-gesture tuning (Phase B).
   */
  status: 'tuned' | 'draft';
}

// ---------------------------------------------------------------------------
// ABDUCTION (frontal plane) - the tuned reference gesture.
// ---------------------------------------------------------------------------
const abduction: Gesture = {
  id: 'abduction',
  name: 'Abduccion',
  plane: 'frontal',
  defaultView: 'anterior',
  rangeDeg: 150,
  rhythm: { settingPhaseDeg: 30, scapularShare: 1 / 3 }, // classic ~2:1 beyond setting
  muscles: [
    {
      id: 'supraspinatus',
      label: 'Supraespinoso',
      role: 'prime-mover',
      // Initiates abduction: peaks early (0-15 deg ~ at 0..0.1), then assists.
      activation: [
        { at: 0.0, level: 0.9 },
        { at: 0.1, level: 1.0 },
        { at: 0.3, level: 0.6 },
        { at: 1.0, level: 0.3 },
      ],
      originRef: 'supraspinous-fossa',
      insertionAlongHumerus: 0.08, // greater tubercle, very proximal
    },
    {
      id: 'deltoid',
      label: 'Deltoides medio',
      role: 'prime-mover',
      // Takes over past ~15 deg, peaks around 90 deg.
      activation: [
        { at: 0.0, level: 0.2 },
        { at: 0.1, level: 0.5 },
        { at: 0.6, level: 1.0 },
        { at: 1.0, level: 0.8 },
      ],
      originRef: 'acromion',
      insertionAlongHumerus: 0.45, // deltoid tuberosity
    },
    {
      id: 'infraspinatus',
      label: 'Manguito (estabiliza)',
      role: 'stabilizer',
      // Cuff depresses/centers the head throughout; modest, fairly constant.
      activation: [
        { at: 0.0, level: 0.4 },
        { at: 0.5, level: 0.6 },
        { at: 1.0, level: 0.5 },
      ],
      originRef: 'infraspinous-fossa',
      insertionAlongHumerus: 0.1,
    },
  ],
  note:
    'El supraespinoso inicia la abduccion (0-15 grados) y centra la cabeza humeral; el deltoides medio es el motor principal a partir de ~15 grados. Tras la fase de ajuste la escapula rota hacia arriba aportando ~1/3 del movimiento (ritmo escapulohumeral ~2:1).',
  status: 'tuned',
};

// ---------------------------------------------------------------------------
// FLEXION (sagittal plane) - DRAFT: best seen from the side; geometry needs
// per-gesture tuning in Phase B.
// ---------------------------------------------------------------------------
const flexion: Gesture = {
  id: 'flexion',
  name: 'Flexion',
  plane: 'sagittal',
  defaultView: 'anterior',
  rangeDeg: 170,
  rhythm: { settingPhaseDeg: 30, scapularShare: 1 / 3 },
  muscles: [
    {
      id: 'deltoid',
      label: 'Deltoides anterior',
      role: 'prime-mover',
      activation: [
        { at: 0.0, level: 0.4 },
        { at: 0.5, level: 1.0 },
        { at: 1.0, level: 0.8 },
      ],
      originRef: 'clavicle-lateral',
      insertionAlongHumerus: 0.45,
    },
    {
      id: 'pectoralis-major',
      label: 'Pectoral mayor (clavicular)',
      role: 'assistant',
      activation: [
        { at: 0.0, level: 0.5 },
        { at: 0.4, level: 0.8 },
        { at: 1.0, level: 0.4 },
      ],
      originRef: 'clavicle-lateral',
      insertionAlongHumerus: 0.2,
    },
    {
      id: 'coracobrachialis',
      label: 'Coracobraquial',
      role: 'assistant',
      activation: [
        { at: 0.0, level: 0.6 },
        { at: 0.5, level: 0.7 },
        { at: 1.0, level: 0.5 },
      ],
      originRef: 'coracoid',
      insertionAlongHumerus: 0.5,
    },
  ],
  note:
    'La flexion ocurre en el plano sagital. El deltoides anterior y la cabeza clavicular del pectoral mayor son los motores; el coracobraquial asiste. Se aprecia mejor desde una vista lateral (pendiente de afinar).',
  status: 'draft',
};

// ---------------------------------------------------------------------------
// EXTERNAL ROTATION (transverse plane) - DRAFT.
// ---------------------------------------------------------------------------
const externalRotation: Gesture = {
  id: 'external-rotation',
  name: 'Rotacion externa',
  plane: 'transverse',
  defaultView: 'posterior',
  rangeDeg: 90,
  rhythm: { settingPhaseDeg: 0, scapularShare: 0 }, // negligible scapular contribution
  muscles: [
    {
      id: 'infraspinatus',
      label: 'Infraespinoso',
      role: 'prime-mover',
      activation: [
        { at: 0.0, level: 0.6 },
        { at: 0.5, level: 1.0 },
        { at: 1.0, level: 0.9 },
      ],
      originRef: 'infraspinous-fossa',
      insertionAlongHumerus: 0.1,
    },
    {
      id: 'teres-minor',
      label: 'Redondo menor',
      role: 'assistant',
      activation: [
        { at: 0.0, level: 0.5 },
        { at: 0.6, level: 0.9 },
        { at: 1.0, level: 0.8 },
      ],
      originRef: 'lateral-border',
      insertionAlongHumerus: 0.12,
    },
  ],
  note:
    'La rotacion externa es principalmente glenohumeral (sin aporte escapular relevante). Infraespinoso y redondo menor son los motores. Se aprecia mejor desde atras (pendiente de afinar).',
  status: 'draft',
};

// ---------------------------------------------------------------------------
// INTERNAL ROTATION (transverse plane) - DRAFT.
// ---------------------------------------------------------------------------
const internalRotation: Gesture = {
  id: 'internal-rotation',
  name: 'Rotacion interna',
  plane: 'transverse',
  defaultView: 'anterior',
  rangeDeg: 90,
  rhythm: { settingPhaseDeg: 0, scapularShare: 0 },
  muscles: [
    {
      id: 'subscapularis',
      label: 'Subescapular',
      role: 'prime-mover',
      activation: [
        { at: 0.0, level: 0.6 },
        { at: 0.5, level: 1.0 },
        { at: 1.0, level: 0.9 },
      ],
      originRef: 'subscapular-fossa',
      insertionAlongHumerus: 0.1,
    },
    {
      id: 'pectoralis-major',
      label: 'Pectoral mayor',
      role: 'assistant',
      activation: [
        { at: 0.0, level: 0.5 },
        { at: 0.5, level: 0.8 },
        { at: 1.0, level: 0.7 },
      ],
      originRef: 'clavicle-lateral',
      insertionAlongHumerus: 0.2,
    },
  ],
  note:
    'La rotacion interna es principalmente glenohumeral. El subescapular es el motor del manguito; el pectoral mayor y el dorsal ancho asisten. Se aprecia mejor de frente (pendiente de afinar).',
  status: 'draft',
};

export const gestures: Gesture[] = [
  abduction,
  flexion,
  externalRotation,
  internalRotation,
];

export const gestureById = new Map<string, Gesture>(gestures.map((g) => [g.id, g]));

/** Linear-interpolate a muscle's activation at fraction `t` (0..1) of range. */
export function activationAt(samples: ActivationSample[], t: number): number {
  if (samples.length === 0) return 0;
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= samples[0].at) return samples[0].level;
  const last = samples[samples.length - 1];
  if (clamped >= last.at) return last.level;
  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    if (clamped >= a.at && clamped <= b.at) {
      const span = b.at - a.at;
      const f = span === 0 ? 0 : (clamped - a.at) / span;
      return a.level + (b.level - a.level) * f;
    }
  }
  return last.level;
}
