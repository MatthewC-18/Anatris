// src/data/orthopedicTests/elbow.ts
//
// ELBOW orthopedic special tests, grouped by clinical target: epicondilalgia
// lateral (codo de tenista), epicondilalgia medial (codo de golfista), ligamento
// colateral cubital (LCU) y neuropatía del cubital en el túnel cubital.
//
// HONESTY: the elbow literature is thin (Zwerus 2018 found weak evidence for most
// tests). Where a defensible figure exists it is CHECKED (verified: true +
// locator); the provocation tests without solid accuracy data stay note-only or
// verified: false and say so.
//
// Sources (see references.ts): Saroja 2014 (Cozen/Mill), O'Driscoll 2005 (moving
// valgus), Novak 1994 (Tinel + flexión-compresión del cubital), Zwerus 2018
// (revisión de la evidencia de la exploración del codo).
//
// DEMO note: the elbow rig drives flexión/extensión + pronación/supinación. Most
// tests are resisted/stress maneuvers of the wrist or ligament; the demo poses
// the elbow/forearm position with an honest `note` about the resisted component.

import type { OrthopedicTest } from '../../types/orthopedicTest';

const tests: OrthopedicTest[] = [
  // ==================== EPICONDILALGIA LATERAL (TENISTA) ====================
  {
    id: 'cozen',
    name: 'Test de Cozen',
    aka: ['Cozen', 'Extensión resistida de muñeca'],
    region: 'elbow',
    category: 'Epicondilalgia lateral (codo de tenista)',
    target: 'Origen de los extensores (epicóndilo lateral)',
    purpose: 'Provocar el dolor de la epicondilalgia lateral con la contracción resistida.',
    maneuver:
      'Codo en extensión y antebrazo pronado; el paciente hace extensión y desviación radial de la muñeca contra la resistencia del explorador (puño cerrado).',
    positive: 'Dolor en el epicóndilo lateral al resistir la extensión de la muñeca.',
    metrics: {
      sensitivity: 79,
      specificity: 80,
      note: 'Saroja 2014: 79/80 (variable entre estudios: hasta 84% sens con especificidad baja).',
    },
    utility: 'balanced',
    interpretation:
      'Sensibilidad y especificidad parecidas; tiende a ser mejor para DESCARTAR (buena sensibilidad). Combínalo con Mill para confirmar.',
    demo: {
      movementId: 'elbow-extension',
      angleDeg: 10,
      // The demo drives the ELBOW, but what the test loads is the extensor
      // origin, so that is what the model lights up. Without this the elbow
      // tests posed the arm and glowed nothing, and the only muscles on screen
      // were whatever the free movement had left active -- the pronator group,
      // i.e. the medial mass, in a test about the LATERAL epicondyle.
      highlightMuscleId: 'common-extensor-origin',
      note: 'Con el codo en extensión y antebrazo pronado se resiste la extensión de la muñeca (componente de muñeca no reproducido).',
    },
    cite: [{ ref: 'saroja-2014', verified: true, locator: 'Cozen 79/80' }],
  },
  {
    id: 'mill',
    name: 'Test de Mill',
    aka: ['Mill', 'Maniobra de Mill'],
    region: 'elbow',
    category: 'Epicondilalgia lateral (codo de tenista)',
    target: 'Origen de los extensores (epicóndilo lateral)',
    purpose: 'Provocar el dolor epicondíleo con el estiramiento pasivo de los extensores.',
    maneuver:
      'Antebrazo pronado y muñeca en flexión; el explorador extiende pasivamente el codo estirando la musculatura extensora.',
    positive: 'Dolor en el epicóndilo lateral durante el estiramiento.',
    metrics: {
      sensitivity: 53,
      specificity: 100,
      note: 'Saroja 2014: 53/100. Muy específico, poco sensible.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico (SpPin): un positivo confirma la epicondilalgia lateral; un negativo no la descarta. Complementa a Cozen (más sensible).',
    demo: {
      movementId: 'elbow-pronation',
      angleDeg: 80,
      highlightMuscleId: 'common-extensor-origin',
      note: 'Con antebrazo pronado y muñeca flexionada se extiende pasivamente el codo; el modelo muestra la pronación y resalta el origen extensor, que es lo que se estira.',
    },
    cite: [{ ref: 'saroja-2014', verified: true, locator: 'Mill 53/100' }],
  },
  {
    id: 'maudsley',
    name: 'Test de Maudsley',
    aka: ['Maudsley', 'Extensión resistida del 3.º dedo'],
    region: 'elbow',
    category: 'Epicondilalgia lateral (codo de tenista)',
    target: 'Extensor común / extensor propio del 3.º dedo',
    purpose: 'Aislar el extensor del tercer dedo para provocar el dolor epicondíleo.',
    maneuver:
      'El paciente extiende el tercer dedo contra resistencia con el codo en extensión.',
    positive: 'Dolor en el epicóndilo lateral al resistir la extensión del tercer dedo.',
    metrics: {
      note: 'Sin datos robustos de precisión (Zwerus 2018: evidencia escasa para los tests de codo).',
    },
    utility: 'weak',
    interpretation:
      'Prueba de provocación sin precisión establecida: úsala como apoyo clínico dentro del cuadro, no de forma aislada.',
    demo: {
      movementId: 'elbow-extension',
      angleDeg: 10,
      highlightMuscleId: 'common-extensor-origin',
      note: 'Con el codo en extensión se resiste la extensión del tercer dedo (componente digital no reproducido).',
    },
    cite: [{ ref: 'zwerus-2018', verified: false }],
  },

  // ==================== EPICONDILALGIA MEDIAL (GOLFISTA) ====================
  {
    id: 'medial-epicondylitis-test',
    name: 'Test de epicondilalgia medial',
    aka: ['Golfer’s elbow test', 'Flexión-pronación resistida'],
    region: 'elbow',
    category: 'Epicondilalgia medial (codo de golfista)',
    target: 'Origen de los flexores-pronadores (epitróclea)',
    purpose: 'Provocar el dolor de la epicondilalgia medial con la contracción resistida.',
    maneuver:
      'Codo en extensión y antebrazo supinado; el paciente hace flexión de muñeca y pronación contra resistencia.',
    positive: 'Dolor en la epitróclea (epicóndilo medial) al resistir la flexión/pronación.',
    metrics: {
      note: 'Sin datos robustos de precisión publicados; el diagnóstico de epicondilalgia medial es clínico (Zwerus 2018).',
    },
    utility: 'weak',
    interpretation:
      'Prueba de provocación sin cifras validadas: el diagnóstico se apoya en la localización del dolor y la contracción resistida, dentro del cuadro clínico.',
    demo: {
      movementId: 'elbow-pronation',
      angleDeg: 80,
      highlightMuscleId: 'common-flexor-pronator-origin',
      note: 'Con el codo extendido se resiste la flexión de muñeca y la pronación; el modelo muestra la pronación y resalta el origen flexor-pronador de la epitróclea.',
    },
    cite: [{ ref: 'zwerus-2018', verified: false }],
  },

  // ================= LIGAMENTO COLATERAL CUBITAL (LCU) =================
  {
    id: 'moving-valgus-stress',
    name: 'Moving valgus stress test',
    aka: ['Moving valgus', 'O’Driscoll'],
    region: 'elbow',
    category: 'Ligamento colateral cubital (LCU)',
    target: 'Ligamento colateral cubital (banda anterior)',
    purpose: 'Detectar insuficiencia del LCU, típica del lanzador overhead.',
    maneuver:
      'Con el hombro en abducción, se mantiene un estrés en valgo constante mientras se flexiona y extiende el codo por el arco de 70° a 120°.',
    positive:
      'Dolor medial reproducido en el arco de cizallamiento (~70-120°), máximo hacia los 90°.',
    metrics: {
      sensitivity: 100,
      specificity: 75,
      note: 'O’Driscoll 2005 (serie pequeña, 21 pacientes): 100/75. Muy sensible.',
    },
    utility: 'rule-out',
    interpretation:
      'Muy sensible (SnNout): un negativo hace poco probable la lesión del LCU. La especificidad es menor y la serie original es pequeña: confirma con imagen si procede.',
    demo: {
      movementId: 'elbow-flexion',
      angleDeg: 90,
      note: 'Se aplica un valgo constante mientras se flexiona-extiende el codo por el arco 70-120°; el modelo muestra la flexión.',
    },
    cite: [{ ref: 'odriscoll-2005', verified: true, locator: 'moving valgus 100/75' }],
  },
  {
    id: 'valgus-stress-elbow',
    name: 'Estrés en valgo del codo',
    aka: ['Valgus stress'],
    region: 'elbow',
    category: 'Ligamento colateral cubital (LCU)',
    target: 'Ligamento colateral cubital',
    purpose: 'Valorar la laxitud del LCU en una posición estática.',
    maneuver:
      'Con el codo a 20-30° de flexión (para liberar el olécranon), el explorador aplica una fuerza en valgo y compara la apertura con el lado sano.',
    positive: 'Apertura medial aumentada y/o dolor respecto al lado contralateral.',
    metrics: {
      note: 'Precisión no establecida con solidez (Zwerus 2018). El moving valgus rinde mejor.',
    },
    utility: 'weak',
    interpretation:
      'Aporta como valoración estática de la laxitud, pero con poca precisión aislado: el moving valgus stress test es más sensible.',
    demo: {
      movementId: 'elbow-flexion',
      angleDeg: 25,
      note: 'Se aplica el valgo con el codo a 20-30° de flexión; el modelo muestra esa flexión de prueba.',
    },
    cite: [{ ref: 'zwerus-2018', verified: false }],
  },

  // ===================== NEUROPATÍA DEL CUBITAL =====================
  {
    id: 'tinel-cubital',
    name: 'Signo de Tinel del cubital',
    aka: ['Tinel del codo'],
    region: 'elbow',
    category: 'Neuropatía del cubital (túnel cubital)',
    target: 'Nervio cubital (canal epitrócleo-olecraniano)',
    purpose: 'Detectar irritación del nervio cubital en el túnel cubital.',
    maneuver:
      'El explorador percute el nervio cubital en el canal entre la epitróclea y el olécranon.',
    positive: 'Parestesias/hormigueo irradiados al 4.º y 5.º dedos.',
    metrics: {
      sensitivity: 70,
      specificity: 98,
      note: 'Novak 1994: 70/98. Alta especificidad; alto valor predictivo negativo.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico (SpPin): un Tinel positivo apoya la neuropatía cubital; también aparece en un porcentaje de personas sanas, así que interprétalo con la clínica.',
    demo: {
      movementId: 'elbow-flexion',
      angleDeg: 90,
      note: 'Se percute el nervio en el canal epitrócleo-olecraniano con el codo en flexión (percusión no reproducida).',
    },
    cite: [{ ref: 'novak-1994', verified: true, locator: 'Tinel 70/98' }],
  },
  {
    id: 'elbow-flexion-pressure',
    name: 'Flexión-compresión del codo',
    aka: ['Elbow flexion test', 'Test de flexión + presión'],
    region: 'elbow',
    category: 'Neuropatía del cubital (túnel cubital)',
    target: 'Nervio cubital (túnel cubital)',
    purpose: 'Reproducir la compresión del cubital con la flexión mantenida del codo.',
    maneuver:
      'Codo en flexión máxima, antebrazo supinado y muñeca neutra, añadiendo compresión sobre el nervio proximal al túnel; se mantiene hasta 60 s.',
    positive: 'Parestesias en el territorio cubital (4.º-5.º dedos) durante la posición mantenida.',
    metrics: {
      sensitivity: 91,
      specificity: 97,
      note: 'Novak 1994: la flexión SOLA es poco sensible (~32%); combinada con compresión del nervio sube a ~91%.',
    },
    utility: 'rule-out',
    interpretation:
      'La versión combinada (flexión + compresión) es sensible: un negativo hace menos probable la neuropatía cubital. La flexión aislada, poco sensible, no descarta.',
    demo: {
      movementId: 'elbow-flexion',
      angleDeg: 120,
      note: 'Codo en flexión máxima con compresión del nervio, sostenido; el modelo muestra la flexión.',
    },
    cite: [{ ref: 'novak-1994', verified: false, locator: 'flexión+compresión ~91% (esp aprox.)' }],
  },
];

export const ELBOW_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
