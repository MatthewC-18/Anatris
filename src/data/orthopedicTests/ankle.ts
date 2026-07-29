// src/data/orthopedicTests/ankle.ts
//
// Orthopedic special tests for the ANKLE. Analogue of ./hip.ts.
//
// HONESTY: sensitivity/specificity vary by study, grade and positivity
// criterion. Every metric set carries verified:false and points to a source
// (Magee; systematic reviews) until the numbers are checked. Point estimates
// below are commonly cited textbook values and MUST be verified before publishing.
//
// DEMO: mapped to a driveable ankle movementId (from ankleRom.ts) only where the
// single-axis rig approximates the maneuver; passive-translation tests (drawer,
// squeeze, external rotation) omit the demo.

import type { OrthopedicTest } from '../../types/orthopedicTest';

export const ANKLE_ORTHOPEDIC_TESTS: OrthopedicTest[] = [
  /* ======================= Lateral stability ======================= */
  {
    id: 'ankle-anterior-drawer',
    name: 'Cajón anterior de tobillo',
    aka: ['Anterior drawer test'],
    region: 'ankle',
    category: 'Estabilidad lateral',
    target: 'Ligamento peroneoastragalino anterior (LPAA)',
    purpose: 'Detectar laxitud del LPAA tras el esguince por inversión.',
    maneuver:
      'Con el tobillo en ligera flexión plantar, se estabiliza la tibia y se tracciona el retropié/calcáneo hacia delante.',
    positive:
      'Desplazamiento anterior aumentado del astrágalo (a veces con hoyuelo de succión) frente al lado sano.',
    metrics: {
      sensitivity: 78,
      specificity: 75,
      note: 'Mejor a partir de las 48 h del esguince (menos dolor/espasmo). Rango amplio según estudio.',
    },
    utility: 'balanced',
    interpretation:
      'Laxitud aumentada respecto al lado sano apoya lesión del LPAA; combínalo con la inclinación astragalina y la clínica.',
    pearl: 'Más fiable en fase subaguda; el dolor agudo limita la maniobra.',
    demo: {
      movementId: 'ankle-plantarflexion',
      angleDeg: 15,
      side: 'R',
      highlightMuscleId: 'fibularis-brevis',
      note: 'El rig posa la ligera flexión plantar de partida; la prueba es una traslación anterior pasiva del astrágalo.',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
  {
    id: 'ankle-talar-tilt',
    name: 'Inclinación astragalina (talar tilt)',
    aka: ['Talar tilt', 'Inversion stress test'],
    region: 'ankle',
    category: 'Estabilidad lateral',
    target: 'Ligamento calcaneoperoneo (y complejo lateral)',
    purpose: 'Valorar la laxitud del ligamento calcaneoperoneo con estrés en inversión.',
    maneuver:
      'Con el retropié en posición neutra, se invierte pasivamente el calcáneo/astrágalo comparando con el lado contralateral.',
    positive: 'Aumento de la apertura/inclinación lateral respecto al lado sano.',
    metrics: {
      sensitivity: 50,
      specificity: 88,
      note: 'Poco sensible pero bastante específica; la comparación bilateral es esencial.',
    },
    utility: 'rule-in',
    interpretation:
      'Una inclinación aumentada y asimétrica (SpPin) apoya la lesión del calcaneoperoneo.',
    demo: {
      movementId: 'ankle-inversion',
      angleDeg: 30,
      side: 'R',
      highlightMuscleId: 'fibularis-brevis',
      note: 'El rig muestra la inversión del retropié que estresa el complejo lateral.',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
  /* ======================= Achilles ======================= */
  {
    id: 'ankle-thompson',
    name: 'Prueba de Thompson (Simmonds)',
    aka: ['Thompson test', 'Simmonds squeeze'],
    region: 'ankle',
    category: 'Tendón de Aquiles',
    target: 'Integridad del tendón calcáneo (de Aquiles)',
    purpose: 'Detectar la rotura completa del tendón de Aquiles.',
    maneuver:
      'Paciente en decúbito prono con los pies fuera de la camilla; el explorador comprime la pantorrilla y observa el pie.',
    positive:
      'AUSENCIA de flexión plantar al comprimir la pantorrilla: rotura completa del Aquiles.',
    metrics: {
      sensitivity: 96,
      specificity: 93,
      note: 'Prueba muy sensible y específica para la rotura completa.',
    },
    utility: 'rule-out',
    interpretation:
      'Muy sensible: la presencia de flexión plantar al comprimir descarta prácticamente la rotura completa; su ausencia la confirma.',
    pearl: 'La flexión plantar activa puede conservarse por los flexores largos aunque el Aquiles esté roto: por eso se explora con la compresión, no pidiendo el movimiento.',
    demo: {
      movementId: 'ankle-plantarflexion',
      angleDeg: 25,
      side: 'R',
      highlightMuscleId: 'gastrocnemius',
      note: 'El rig muestra la flexión plantar que un Aquiles íntegro produce al comprimir la pantorrilla (positiva = NO ocurre).',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
  /* ======================= Syndesmosis (high sprain) ======================= */
  {
    id: 'ankle-kleiger',
    name: 'Prueba de rotación externa (Kleiger)',
    aka: ['Kleiger test', 'External rotation test'],
    region: 'ankle',
    category: 'Sindesmosis',
    target: 'Sindesmosis tibiofibular y ligamento deltoideo',
    purpose: 'Detectar el esguince alto (sindesmal) y la lesión del deltoideo.',
    maneuver:
      'Con la rodilla flexionada y el tobillo neutro, se aplica rotación externa al pie mientras se estabiliza la pierna.',
    positive:
      'Dolor en la sindesmosis anterolateral (o medial, si es el deltoideo) reproducido con la rotación externa.',
    metrics: {
      sensitivity: 20,
      specificity: 85,
      note: 'Poco sensible; un positivo es más informativo que un negativo.',
    },
    utility: 'rule-in',
    interpretation:
      'Dolor sindesmal reproducido apoya el esguince alto (SpPin); confírmalo con el squeeze y la clínica.',
    cite: [{ ref: 'magee', verified: false }],
  },
  {
    id: 'ankle-squeeze',
    name: 'Prueba de compresión (squeeze)',
    aka: ['Squeeze test'],
    region: 'ankle',
    category: 'Sindesmosis',
    target: 'Sindesmosis tibiofibular',
    purpose: 'Detectar la lesión sindesmal (esguince alto).',
    maneuver:
      'Se comprimen la tibia y la fíbula juntas en el tercio medio de la pierna, proximal a la lesión.',
    positive: 'Dolor referido distal en la sindesmosis al comprimir proximalmente.',
    metrics: {
      sensitivity: 30,
      specificity: 93,
      note: 'Poco sensible, muy específica; útil para confirmar.',
    },
    utility: 'rule-in',
    interpretation:
      'Un dolor sindesmal distal al comprimir proximal apoya con fuerza el esguince alto (SpPin).',
    cite: [{ ref: 'magee', verified: false }],
  },
];
