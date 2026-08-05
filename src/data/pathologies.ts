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

// ---------------------------------------------------------------------------
// HIP — data/hipRom. The hip is the only region with SIX driveable movements.
//
// `rangeCapDeg` is a SINGLE number shared by every movement in `appliesTo`, and
// the six hip movements have very different normal ranges (flexión 90 vs
// aducción 20). So each preset is keyed to the ONE plane its cap is honest for,
// and the other planes the condition affects are described in the prose instead
// of being capped with a number that would be nonsense in that movement.
// ---------------------------------------------------------------------------
const hip: MovementPathology[] = [
  {
    id: 'hip-fai-cam',
    name: 'Pinzamiento femoroacetabular (tipo cam)',
    chip: 'Pinzamiento',
    summary:
      'La rotación interna choca antes de tiempo: el hallazgo que define el FAI.',
    mechanism:
      'La pérdida del offset en la unión cabeza-cuello hace que el fémur contacte precozmente con el reborde acetabular. La rotación interna es la primera que se restringe, y la flexión profunda combinada con rotación interna comprime el labrum: es la posición del test FADIR.',
    whyItHurts:
      'Duele la ingle al sentarse mucho rato, al agacharse profundo y al entrar y salir del coche. El paciente señala la ingle en pinza con la mano (signo de la C).',
    implicated: ['psoas-major', 'iliacus', 'rectus-femoris'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['hip-internal-rotation'],
    rangeCapDeg: 18,
  },
  {
    id: 'hip-osteoarthritis',
    name: 'Artrosis de cadera (patrón capsular)',
    chip: 'Artrosis',
    summary:
      'Pérdida global de recorrido; en la flexión se nota como tope duro y precoz.',
    mechanism:
      'La retracción capsular de la coxartrosis sigue un patrón: la rotación interna y la extensión se pierden antes y en mayor grado, y la flexión termina también restringida con un tope firme y doloroso.',
    whyItHurts:
      'Rigidez matutina de menos de 30 minutos, dolor inguinal profundo que se irradia a la cara anterior del muslo y dificultad para calzarse o cortarse las uñas del pie.',
    implicated: ['gluteus-medius', 'psoas-major', 'adductor-longus'],
    cite: [{ ref: 'kapandji', pageVerified: false }],
    appliesTo: ['hip-flexion'],
    rangeCapDeg: 60,
  },
  {
    id: 'hip-adductor-related-groin-pain',
    name: 'Dolor inguinal de origen aductor',
    chip: 'Aductores',
    summary:
      'La aducción resistida duele y el recorrido activo se acorta por el dolor.',
    mechanism:
      'Sobrecarga del origen púbico de los aductores (sobre todo el aductor largo) por gestos repetidos de cambio de dirección y golpeo. Es la forma más frecuente de dolor inguinal del deportista.',
    whyItHurts:
      'Dolor a la palpación del origen aductor y a la aducción resistida (test de squeeze). El paciente lo describe al arrancar, frenar y golpear el balón.',
    implicated: ['adductor-longus', 'adductor-brevis', 'gracilis'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['hip-adduction'],
    rangeCapDeg: 10,
  },
  {
    id: 'hip-abductor-deficiency',
    name: 'Insuficiencia de abductores (Trendelenburg)',
    chip: 'Abductores',
    summary:
      'El glúteo medio no sostiene la pelvis: la abducción activa se queda corta y la pelvis cae en apoyo monopodal.',
    mechanism:
      'La debilidad o la inhibición dolorosa del glúteo medio y menor (tendinopatía glútea, poscirugía, dolor lumbar crónico) impide mantener la pelvis nivelada; la abducción activa pierde fuerza y recorrido útil.',
    whyItHurts:
      'Dolor lateral de cadera sobre el trocánter mayor al tumbarse de ese lado, marcha de Trendelenburg o de Duchenne y sobrecarga secundaria del cuadrado lumbar contralateral.',
    implicated: ['gluteus-medius', 'gluteus-minimus', 'tensor-fasciae-latae'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['hip-abduction'],
    rangeCapDeg: 25,
  },
  {
    id: 'hip-flexor-contracture',
    name: 'Retracción del iliopsoas',
    chip: 'Psoas corto',
    summary:
      'La cadera no llega a la extensión completa: queda una flexión residual.',
    mechanism:
      'El acortamiento del iliopsoas (sedestación prolongada, síndrome cruzado inferior) impide alcanzar los últimos grados de extensión; la pelvis compensa basculando en anteversión y aumentando la lordosis lumbar.',
    whyItHurts:
      'Acorta el paso, obliga a extender desde el raquis lumbar en vez de desde la cadera y sobrecarga las carillas lumbares. Es lo que objetiva la prueba de Thomas.',
    implicated: ['psoas-major', 'iliacus', 'rectus-femoris'],
    cite: [{ ref: 'kapandji', pageVerified: false }],
    appliesTo: ['hip-extension'],
    rangeCapDeg: 5,
  },
];

// ---------------------------------------------------------------------------
// ANKLE — data/ankleRom. Dorsiflexion loss is the single most consequential
// restriction of the lower limb, so it carries two distinct presets.
// ---------------------------------------------------------------------------
const ankle: MovementPathology[] = [
  {
    id: 'ankle-dorsiflexion-restriction',
    name: 'Restricción de dorsiflexión',
    chip: 'Dorsiflexión',
    summary:
      'El tobillo no alcanza los grados de dorsiflexión que la marcha y la sentadilla necesitan.',
    mechanism:
      'Retracción del tríceps sural o bloqueo del deslizamiento posterior del astrágalo en la mortaja: la tibia no puede avanzar sobre el pie en la fase media de apoyo.',
    whyItHurts:
      'El cuerpo busca los grados que faltan río abajo y río arriba: pronación compensatoria del retropié, valgo dinámico de rodilla y despegue precoz del talón. Es un factor de riesgo reconocido de dolor femoropatelar y de tendinopatía aquílea.',
    implicated: ['gastrocnemius', 'soleus'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['ankle-dorsiflexion'],
    rangeCapDeg: 8,
  },
  {
    id: 'ankle-lateral-instability',
    name: 'Inestabilidad lateral crónica',
    chip: 'Inestabilidad',
    summary:
      'Tras esguinces de repetición, la inversión gana recorrido y pierde control.',
    mechanism:
      'La laxitud del ligamento peroneoastragalino anterior, unida al déficit propioceptivo y a la reacción tardía de los peroneos, deja el retropié sin freno en la inversión.',
    whyItHurts:
      'Sensación de fallo en terreno irregular y esguinces de repetición. El problema no es solo el ligamento: es el retardo del reflejo peroneo, y por eso el trabajo propioceptivo es el tratamiento de referencia.',
    implicated: ['fibularis-longus', 'fibularis-brevis'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['ankle-inversion'],
  },
  {
    id: 'ankle-achilles-tendinopathy',
    name: 'Tendinopatía aquílea',
    chip: 'Aquíleo',
    summary:
      'Dolor y pérdida de fuerza en la flexión plantar contra carga.',
    mechanism:
      'Degeneración por sobrecarga del tendón calcáneo, habitualmente en su porción media. El recorrido pasivo se conserva, pero la flexión plantar bajo carga duele y pierde potencia.',
    whyItHurts:
      'Dolor y rigidez matutina en el tendón, dolor al iniciar la carrera que mejora al calentar y reaparece después. El talón despega con menos fuerza y el paso se acorta.',
    implicated: ['gastrocnemius', 'soleus'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['ankle-plantarflexion'],
    rangeCapDeg: 35,
  },
  {
    id: 'ankle-tibialis-posterior-dysfunction',
    name: 'Disfunción del tibial posterior',
    chip: 'Tibial post.',
    summary:
      'El sostén activo del arco medial falla y el retropié se va a valgo: la inversión pierde fuerza.',
    mechanism:
      'La insuficiencia del tibial posterior, principal inversor y sostén dinámico del arco longitudinal medial, deja que el retropié caiga en valgo y el antepié abduzca (pie plano adquirido del adulto).',
    whyItHurts:
      'Dolor por dentro del tobillo, por detrás del maléolo medial, con incapacidad progresiva de ponerse de puntillas sobre un solo pie. Vista por detrás, aparece el signo de "demasiados dedos".',
    implicated: ['tibialis-posterior', 'flexor-digitorum-longus'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['ankle-inversion'],
    rangeCapDeg: 15,
  },
  {
    id: 'ankle-peroneal-tendinopathy',
    name: 'Tendinopatía de los peroneos',
    chip: 'Peroneos',
    summary:
      'La eversión duele y pierde fuerza: el freno lateral del tobillo trabaja de más.',
    mechanism:
      'Sobrecarga de los tendones peroneos en su trayecto retromaleolar, habitualmente secundaria a esguinces de repetición o a un retropié varo: los peroneos compensan de forma continua la tendencia a la inversión.',
    whyItHurts:
      'Dolor por detrás y por debajo del maléolo lateral, que aumenta al caminar por terreno irregular y a la eversión resistida. Con frecuencia coexiste con la inestabilidad lateral crónica: son las dos caras del mismo problema.',
    implicated: ['fibularis-longus', 'fibularis-brevis'],
    cite: [{ ref: 'neumann', pageVerified: false }],
    appliesTo: ['ankle-eversion'],
    rangeCapDeg: 8,
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
  ...hip,
  ...ankle,
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
