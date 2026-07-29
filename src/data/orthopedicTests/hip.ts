// src/data/orthopedicTests/hip.ts
//
// Orthopedic special tests for the HIP. Analogue of ./knee.ts.
//
// HONESTY: sensitivity/specificity vary widely by study, degree of pathology
// and positivity criterion. Every metric set carries verified:false and points
// to a source until the exact numbers are checked against the primary study.
// The point estimates below are the commonly cited textbook values (Magee,
// Orthopedic Physical Assessment; Reiman et al. systematic reviews) and MUST be
// verified before publishing.
//
// DEMO: each test maps to a driveable hip movementId (from hipRom.ts) plus a
// note documenting the parts of the composite maneuver the single-axis rig can
// only approximate (e.g. FADIR = flexion + adduction + internal rotation).

import type { OrthopedicTest } from '../../types/orthopedicTest';

export const HIP_ORTHOPEDIC_TESTS: OrthopedicTest[] = [
  /* ======================= Impingement / labrum ======================= */
  {
    id: 'hip-fadir',
    name: 'FADIR (pinzamiento anterior)',
    aka: ['Anterior impingement test', 'Flexion-Adduction-Internal Rotation'],
    region: 'hip',
    category: 'Pinzamiento / labrum',
    target: 'Pinzamiento femoroacetabular (FAI) y labrum anterosuperior',
    purpose: 'Detectar pinzamiento anterior y lesión del labrum.',
    maneuver:
      'En decúbito supino, se lleva la cadera a 90° de flexión y se añade aducción y rotación interna.',
    positive: 'Reproducción del dolor inguinal característico del paciente (con o sin chasquido).',
    metrics: {
      sensitivity: 94,
      specificity: 25,
      note: 'Muy sensible pero poco específica; útil para descartar. Rango amplio según estudio (sens. ~88-99%).',
    },
    utility: 'rule-out',
    interpretation:
      'Un FADIR NEGATIVO hace poco probable el pinzamiento/labrum (SnNout). Un positivo, por su baja especificidad, obliga a confirmar con imagen o cluster.',
    pearl:
      'Muy sensible: su valor está en el resultado negativo. El positivo aislado no confirma FAI.',
    demo: {
      movementId: 'hip-internal-rotation',
      angleDeg: 30,
      side: 'R',
      highlightMuscleId: 'iliacus',
      note: 'El rig muestra la rotación interna; la maniobra real se hace en 90° de flexión + aducción.',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
  {
    id: 'hip-faber',
    name: 'FABER (Patrick)',
    aka: ['Figura de 4', 'Flexion-Abduction-External Rotation'],
    region: 'hip',
    category: 'Movilidad y dolor articular',
    target: 'Patología intraarticular de cadera y articulación sacroilíaca',
    purpose: 'Diferenciar dolor de origen coxofemoral, sacroilíaco o de partes blandas.',
    maneuver:
      'En decúbito supino, el tobillo del lado explorado se apoya sobre la rodilla contraria (posición en 4); se presiona la rodilla y la EIAS contralateral hacia la camilla.',
    positive:
      'Dolor inguinal (origen coxofemoral) o dolor glúteo/posterior (sacroilíaca); rigidez que impide descender la rodilla indica restricción de cadera.',
    metrics: {
      sensitivity: 60,
      specificity: 18,
      note: 'Especificidad baja; localizar el dolor (inguinal vs posterior) aporta más que el sí/no.',
    },
    utility: 'balanced',
    interpretation:
      'Úsalo para LOCALIZAR el origen del dolor más que como prueba binaria; combínalo con FADIR y el cuadro clínico.',
    demo: {
      movementId: 'hip-external-rotation',
      angleDeg: 45,
      side: 'R',
      note: 'El rig muestra la rotación externa; la posición real combina flexión + abducción + rotación externa.',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
  {
    id: 'hip-scour',
    name: 'Prueba de fricción / cuadrante (scour)',
    aka: ['Hip quadrant', 'Scour test'],
    region: 'hip',
    category: 'Movilidad y dolor articular',
    target: 'Superficie articular / labrum / artrosis',
    purpose: 'Provocar el dolor articular recorriendo el borde acetabular con carga axial.',
    maneuver:
      'En supino, cadera y rodilla en flexión; se aplica carga axial por el fémur mientras se describe un arco de aducción-abducción con rotación.',
    positive: 'Dolor, resalte o crepitación reproducibles durante el arco.',
    metrics: {
      sensitivity: 62,
      specificity: 75,
      note: 'Estimaciones dispares; interpretar dentro del cuadro clínico.',
    },
    utility: 'balanced',
    interpretation:
      'Un arco doloroso o con resalte apoya patología intraarticular; no descarta por sí solo.',
    demo: {
      movementId: 'hip-flexion',
      angleDeg: 90,
      side: 'R',
      note: 'El rig aproxima la flexión de partida; la maniobra añade carga axial y un arco de rotación.',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
  {
    id: 'hip-log-roll',
    name: 'Log roll (rodamiento)',
    aka: ['Freiberg test', 'Passive rotation test'],
    region: 'hip',
    category: 'Pinzamiento / labrum',
    target: 'Origen intraarticular del dolor',
    purpose:
      'Aislar la articulación coxofemoral: es la prueba más específica de origen intraarticular porque solo mueve el fémur bajo el acetábulo, sin estresar partes blandas.',
    maneuver:
      'En supino con la pierna extendida y relajada, se rota pasivamente el muslo hacia dentro y hacia fuera ("rodando" el fémur).',
    positive: 'Dolor, chasquido o asimetría del rango de rotación respecto al lado sano.',
    metrics: {
      sensitivity: 30,
      specificity: 85,
      note: 'Poco sensible pero relativamente específica de origen intraarticular.',
    },
    utility: 'rule-in',
    interpretation:
      'Al mover SOLO la cadera, un positivo apunta con fuerza al interior de la articulación (SpPin).',
    demo: {
      movementId: 'hip-external-rotation',
      angleDeg: 40,
      side: 'R',
      note: 'El rig muestra la rotación externa pasiva; la prueba alterna interna/externa con la pierna extendida.',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
  /* ======================= Muscle length ======================= */
  {
    id: 'hip-thomas',
    name: 'Prueba de Thomas',
    aka: ['Thomas test'],
    region: 'hip',
    category: 'Acortamiento muscular',
    target: 'Retracción del iliopsoas y del recto femoral',
    purpose: 'Detectar acortamiento de los flexores de cadera.',
    maneuver:
      'En supino al borde de la camilla, el paciente abraza una rodilla contra el pecho para aplanar la lordosis; se observa el muslo contralateral.',
    positive:
      'El muslo explorado se eleva de la camilla (iliopsoas corto). Si además la rodilla se extiende, sugiere acortamiento del recto femoral.',
    metrics: {
      note: 'Prueba de longitud muscular; la exactitud diagnóstica no suele expresarse en sens/espec.',
    },
    utility: 'balanced',
    interpretation:
      'Valora el balance flexor: un iliopsoas corto favorece la anteversión pélvica y limita la extensión de cadera.',
    demo: {
      movementId: 'hip-extension',
      angleDeg: 15,
      side: 'R',
      highlightMuscleId: 'psoas-major',
      note: 'El rig muestra la extensión que el flexor corto limita.',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
  {
    id: 'hip-ober',
    name: 'Prueba de Ober',
    aka: ['Ober test'],
    region: 'hip',
    category: 'Acortamiento muscular',
    target: 'Banda iliotibial y tensor de la fascia lata',
    purpose: 'Detectar retracción de la banda iliotibial / TFL.',
    maneuver:
      'En decúbito lateral con la pierna inferior flexionada, se abduce y extiende la cadera superior (rodilla a 90°) y se deja caer en aducción.',
    positive: 'El muslo permanece abducido y no desciende hacia la camilla.',
    metrics: {
      note: 'Prueba de longitud; sin sens/espec establecidas de forma consistente.',
    },
    utility: 'balanced',
    interpretation:
      'Una banda iliotibial retraída se asocia a dolor lateral de rodilla y a compresión de los tendones glúteos.',
    demo: {
      movementId: 'hip-adduction',
      angleDeg: 20,
      side: 'R',
      highlightMuscleId: 'tensor-fasciae-latae',
      note: 'El rig muestra la aducción que el TFL/banda iliotibial retraídos limitan.',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
  /* ======================= Abductor mechanism ======================= */
  {
    id: 'hip-trendelenburg',
    name: 'Signo de Trendelenburg',
    aka: ['Trendelenburg test'],
    region: 'hip',
    category: 'Mecanismo abductor',
    target: 'Glúteo medio y menor (competencia abductora)',
    purpose: 'Valorar la estabilidad frontal de la pelvis en apoyo monopodal.',
    maneuver:
      'El paciente se sostiene sobre una pierna; se observa la pelvis desde atrás durante 30 segundos.',
    positive:
      'La pelvis cae hacia el lado que NO apoya (o el tronco se inclina hacia el lado de apoyo): insuficiencia del glúteo medio del lado de apoyo.',
    metrics: {
      sensitivity: 73,
      specificity: 77,
      note: 'Estimaciones variables; mejora combinada con dolor a la palpación del trocánter.',
    },
    utility: 'balanced',
    interpretation:
      'Un signo positivo indica insuficiencia del mecanismo abductor (debilidad, dolor o patología glútea); guía el fortalecimiento.',
    demo: {
      movementId: 'hip-abduction',
      angleDeg: 30,
      side: 'R',
      highlightMuscleId: 'gluteus-medius',
      note: 'El rig muestra la abducción activa; el signo se valora en carga monopodal.',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
  {
    id: 'hip-resisted-flexion',
    name: 'Flexión de cadera resistida (Stinchfield)',
    aka: ['Stinchfield test', 'Resisted straight-leg raise'],
    region: 'hip',
    category: 'Pinzamiento / labrum',
    target: 'Patología intraarticular / labrum',
    purpose: 'Cargar la articulación mediante la contracción del iliopsoas y del recto femoral.',
    maneuver:
      'En supino, el paciente eleva la pierna extendida a ~30° y mantiene contra la resistencia del explorador.',
    positive: 'Dolor inguinal o debilidad durante la flexión resistida.',
    metrics: {
      sensitivity: 59,
      specificity: 32,
      note: 'Metricas modestas; interpretar dentro de un cluster.',
    },
    utility: 'weak',
    interpretation:
      'Aporta poco de forma aislada; su valor está en el conjunto con FADIR, log roll y el cuadro clínico.',
    demo: {
      movementId: 'hip-flexion',
      angleDeg: 30,
      side: 'R',
      highlightMuscleId: 'psoas-major',
      resisted: true,
      note: 'El rig muestra la flexión resistida (mano del terapeuta oponiéndose).',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
];
