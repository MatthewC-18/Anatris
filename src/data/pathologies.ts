// src/data/pathologies.ts
//
// P1 "normal vs patologico" — clinical PRESETS for the movement lab, now GENERAL
// across regions (was shoulder-only). Each preset alters the NORMAL movement to
// model a clinical picture and carries the narrative a physio reads next to it.
//
// EFFECTS (all optional; a preset uses only what applies to its joint):
//   - shoulderMod:   alters the scapulohumeral rhythm (shoulder elevation chain).
//   - rangeCapDeg:   caps the reachable MAX angle (ROM loss, e.g. frozen shoulder).
//   - rangeFloorDeg: raises the reachable MIN angle (e.g. knee extension lag /
//                    flexion contracture: the joint can't fully straighten).
// The lab applies the range constraints at the slider (so both the rig pose and the
// readout stay consistent) and passes the id through rigChannel; the shoulder chain
// reads shoulderMod so the altered rhythm drives BOTH the rig and the readout.
//
// DISCIPLINE: MODELLED, not invented. Gains/caps are a didactic model grounded in
// the cited sources; every preset points at its source (pageVerified:false until
// checked). UI strings Spanish LATAM; ids/keys ASCII; no `any`.

import type { Citation } from '../types/muscleContent';
import type { ShoulderChainMod } from '../lib/biomech/shoulderChain';

/** A pathological preset for a movement (or set of movements). */
export interface MovementPathology {
  /** Stable id, kebab-case. */
  id: string;
  /** Spanish display name. */
  name: string;
  /** Very short chip label. */
  chip: string;
  /** One-line "what it is". */
  summary: string;
  /** What changes biomechanically vs. normal. */
  mechanism: string;
  /** The clinical payoff — "por que duele aqui". */
  whyItHurts: string;
  /** Muscle ids to emphasize (readout banner). */
  implicated: string[];
  /** Supporting citation(s). */
  cite: Citation[];
  /** Movement ids this preset applies to. */
  appliesTo: string[];
  /** Shoulder scapulohumeral-rhythm alteration (shoulder elevation only). */
  shoulderMod?: ShoulderChainMod;
  /** Cap the reachable MAX angle, degrees (ROM loss). */
  rangeCapDeg?: number;
  /** Raise the reachable MIN angle, degrees (extension lag / contracture). */
  rangeFloorDeg?: number;
}

// ---------------------------------------------------------------------------
// SHOULDER (elevation chain) — see biomech/shoulderChain + data/shoulderRom.
// ---------------------------------------------------------------------------
const shoulder: MovementPathology[] = [
  {
    id: 'scapular-dyskinesis',
    name: 'Discinesia escapular',
    chip: 'Discinesia',
    summary:
      'Alteración del control de la escápula: rota y bascula menos durante la elevación.',
    mechanism:
      'La rotación superior de la escápula (serrato anterior + trapecio inferior) disminuye, de modo que el húmero asume más del arco: el ritmo escapulohumeral se descompensa y la proporción húmero:escápula se dispara.',
    whyItHurts:
      'Con la escápula "quieta", la glenoides no se orienta a tiempo y el troquíter choca antes contra el arco coracoacromial: reaparece el arco doloroso y el manguito se sobrecarga.',
    implicated: ['serratus-anterior', 'trapezius'],
    cite: [{ ref: 'kibler-2013', pageVerified: false }],
    appliesTo: ['glenohumeral-abduction'],
    shoulderMod: { scapulaGainMul: 0.5 },
  },
  {
    id: 'subacromial-impingement',
    name: 'Pinzamiento subacromial',
    chip: 'Pinzamiento',
    summary:
      'Conflicto del manguito y la bursa en el espacio subacromial durante la elevación.',
    mechanism:
      'El par depresor del manguito (supraespinoso/infraespinoso) no centra la cabeza humeral y, con frecuencia, se asocia una menor rotación superior de la escápula: la cabeza asciende y estrecha el espacio subacromial.',
    whyItHurts:
      'Entre 60 y 120° el troquíter y la bursa quedan atrapados bajo el acromion → arco doloroso. Ceden primero el supraespinoso y la bursa subacromial.',
    implicated: ['supraspinatus', 'infraspinatus'],
    cite: [{ ref: 'ludewig-2009', pageVerified: false }],
    appliesTo: ['glenohumeral-abduction'],
    shoulderMod: { scapulaGainMul: 0.8 },
  },
  {
    id: 'frozen-shoulder',
    name: 'Hombro congelado (capsulitis adhesiva)',
    chip: 'Congelado',
    summary: 'Restricción capsular global: pérdida de movilidad activa y pasiva.',
    mechanism:
      'La cápsula fibrótica limita el deslizamiento glenohumeral. La elevación se topa pronto (~115°) y la escápula "encoge" para sustituir (báscula/elevación compensatoria).',
    whyItHurts:
      'Patrón capsular: la rotación externa es la más limitada, luego la abducción. Forzar la elevación solo sube el muñón del hombro (sustitución escapular), sin ganar arco real.',
    implicated: ['subscapularis', 'trapezius'],
    cite: [{ ref: 'kelley-2013', pageVerified: false }],
    appliesTo: ['glenohumeral-abduction'],
    shoulderMod: { scapulaGainMul: 1.25 },
    rangeCapDeg: 115,
  },
];

// ---------------------------------------------------------------------------
// KNEE (sagittal flexion/extension) — see biomech/kneeCoupling + data/kneeRom.
// ---------------------------------------------------------------------------
const knee: MovementPathology[] = [
  {
    id: 'knee-extension-lag',
    name: 'Déficit de extensión (extension lag)',
    chip: 'Extension lag',
    summary:
      'El cuádriceps no completa los últimos grados: la rodilla no llega a estirarse del todo.',
    mechanism:
      'Debilidad o inhibición del cuádriceps (frecuente tras cirugía, derrame o dolor): en el rango terminal, con el peor brazo de palanca, la extensión activa queda incompleta y persiste una flexión residual.',
    whyItHurts:
      'La rodilla queda flexionada en apoyo: falla el bloqueo en extensión, se sobrecargan cuádriceps y fémoro-patelar y se altera la marcha.',
    implicated: ['vastus-medialis', 'rectus-femoris'],
    cite: [{ ref: 'kapandji', pageVerified: false }],
    appliesTo: ['knee-flexion', 'knee-extension'],
    rangeFloorDeg: 12,
  },
  {
    id: 'knee-patellar-maltracking',
    name: 'Maltracking rotuliano (déficit del VMO)',
    chip: 'Maltracking',
    summary:
      'La rótula se desliza lateralmente por déficit del vasto medial oblicuo.',
    mechanism:
      'Cuando el vasto medial oblicuo no contrarresta la tracción lateral del vasto lateral, la rótula sigue una trayectoria lateral, sobre todo en los primeros 0-30° de extensión.',
    whyItHurts:
      'Aumenta la presión en la faceta lateral fémoro-patelar → dolor anterior de rodilla y crepitación al subir y bajar escaleras.',
    implicated: ['vastus-medialis'],
    cite: [{ ref: 'kapandji', pageVerified: false }],
    appliesTo: ['knee-flexion', 'knee-extension'],
  },
];

// ---------------------------------------------------------------------------
// ELBOW (sagittal flexion/extension; pronosupination) — data/elbowRom.
// ---------------------------------------------------------------------------
const elbow: MovementPathology[] = [
  {
    id: 'elbow-flexion-contracture',
    name: 'Contractura en flexión',
    chip: 'Contractura',
    summary: 'El codo pierde los últimos grados de extensión y queda algo flexionado.',
    mechanism:
      'Retracción capsular y del braquial tras inmovilización, traumatismo o artrosis: el codo no alcanza los 0° y conserva una flexión residual.',
    whyItHurts:
      'La extensión terminal es lo primero que se pierde y lo más difícil de recuperar; limita alcanzar y cargar con el brazo estirado.',
    implicated: ['brachialis', 'biceps-brachii'],
    cite: [{ ref: 'kapandji', pageVerified: false }],
    appliesTo: ['elbow-flexion', 'elbow-extension'],
    rangeFloorDeg: 30,
  },
  {
    id: 'lateral-epicondylitis',
    name: 'Epicondilalgia lateral (codo de tenista)',
    chip: 'Epicondilalgia',
    summary: 'Tendinopatía del origen extensor común en el epicóndilo lateral.',
    mechanism:
      'Sobrecarga por prensión y extensión de muñeca repetidas: el origen extensor común (sobre todo el ECRB) se degenera en el epicóndilo lateral.',
    whyItHurts:
      'Duele el epicóndilo lateral con la extensión resistida de muñeca y la prensión; el codo no pierde recorrido, pero cargar en extensión reproduce el dolor.',
    implicated: ['common-extensor-origin'],
    cite: [{ ref: 'saroja-2014', pageVerified: false }],
    appliesTo: ['elbow-extension'],
  },
];

// ---------------------------------------------------------------------------
// CERVICAL — data/cervicalRom.
// ---------------------------------------------------------------------------
const cervical: MovementPathology[] = [
  {
    id: 'cervical-whiplash',
    name: 'Latigazo cervical (whiplash)',
    chip: 'Whiplash',
    summary:
      'Restricción dolorosa de la rotación tras un mecanismo de aceleración-desaceleración.',
    mechanism:
      'Tras el latigazo, la rotación es el movimiento más limitado y los flexores profundos (largo del cuello/cabeza) se inhiben, delegando en los superficiales (ECOM).',
    whyItHurts:
      'Girar la cabeza reproduce el dolor y queda restringido; la inhibición del control profundo perpetúa la cervicalgia.',
    implicated: ['longus-colli', 'sternocleidomastoid'],
    cite: [{ ref: 'magee', pageVerified: false }],
    appliesTo: ['cervical-rotation'],
    rangeCapDeg: 50,
  },
];

// ---------------------------------------------------------------------------
// THORACIC — data/thoracicRom.
// ---------------------------------------------------------------------------
const thoracic: MovementPathology[] = [
  {
    id: 'thoracic-hyperkyphosis',
    name: 'Hipercifosis / rigidez torácica',
    chip: 'Hipercifosis',
    summary: 'Aumento de la cifosis con pérdida de la extensión torácica.',
    mechanism:
      'La rigidez articular y el acortamiento anterior fijan el tórax en flexión: la extensión (enderezar la cifosis) es lo primero que se pierde y el erector trabaja en desventaja.',
    whyItHurts:
      'Limita la elevación del brazo y la respiración, y sobrecarga las charnelas cervicotorácica y toracolumbar por compensación.',
    implicated: ['longissimus-thoracis', 'iliocostalis-thoracis'],
    cite: [{ ref: 'kapandji', pageVerified: false }],
    appliesTo: ['thoracic-extension'],
    rangeCapDeg: 12,
  },
];

// ---------------------------------------------------------------------------
// LUMBAR — data/lumbarRom.
// ---------------------------------------------------------------------------
const lumbar: MovementPathology[] = [
  {
    id: 'lumbar-instability',
    name: 'Inestabilidad segmentaria lumbar',
    chip: 'Inestabilidad',
    summary:
      'Movimiento aberrante y "catch" doloroso, sobre todo al reincorporarse de la flexión.',
    mechanism:
      'El fallo del control profundo (multífido + transverso, con retardo del feed-forward) deja un segmento con exceso de traslación en la zona neutra.',
    whyItHurts:
      'Aparece un arco doloroso y un "catch"/desviación al volver de la flexión; el paciente "trepa" sobre los muslos (signo de Gower).',
    implicated: ['multifidus-lumborum', 'transversus-abdominis'],
    cite: [{ ref: 'hicks-2005', pageVerified: false }],
    appliesTo: ['lumbar-flexion', 'lumbar-extension'],
  },
  {
    id: 'lumbar-disc-herniation',
    name: 'Hernia discal lumbar',
    chip: 'Hernia',
    summary: 'La flexión provoca dolor y limita el recorrido (patrón discogénico).',
    mechanism:
      'La flexión sube la presión intradiscal y desplaza el núcleo hacia atrás: con hernia posterolateral el arco de flexión se restringe y puede irradiar.',
    whyItHurts:
      'Flexionar (sentarse, atarse los zapatos) reproduce el dolor y a veces la irradiación radicular; la extensión suele aliviar (preferencia direccional).',
    implicated: ['multifidus-lumborum', 'transversus-abdominis'],
    cite: [{ ref: 'deville-2000', pageVerified: false }],
    appliesTo: ['lumbar-flexion'],
    rangeCapDeg: 35,
  },
];

/** All pathology presets, across regions. */
export const PATHOLOGIES: MovementPathology[] = [
  ...shoulder,
  ...knee,
  ...elbow,
  ...cervical,
  ...thoracic,
  ...lumbar,
];

const BY_ID: Record<string, MovementPathology> = Object.fromEntries(
  PATHOLOGIES.map((p) => [p.id, p]),
);

/** Resolve a pathology by id, or null (null id = Normal). */
export function pathologyById(id: string | null | undefined): MovementPathology | null {
  if (!id) return null;
  return BY_ID[id] ?? null;
}

/** Presets available for a given movement id (empty = movement has no presets). */
export function pathologiesForMovement(movementId: string | null | undefined): MovementPathology[] {
  if (!movementId) return [];
  return PATHOLOGIES.filter((p) => p.appliesTo.includes(movementId));
}
