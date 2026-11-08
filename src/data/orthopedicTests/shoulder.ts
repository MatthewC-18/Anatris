// src/data/orthopedicTests/shoulder.ts
//
// SHOULDER orthopedic special tests, grouped by clinical target. Metrics are
// POINT ESTIMATES (%) taken from the cited studies; they vary by study, degree
// of tear and positivity criterion, so every entry carries `verified: false`
// (see StudyCitation) and a `note` with the spread. Numbers to confirm against
// the primary sources before publishing.
//
// Sources (see references.ts): Hegedus 2012 (metaanálisis), Park 2005
// (pinzamiento), Lo 2004 (inestabilidad anterior), Gerber 1991 y Hertel 1996
// (manguito), Chronopoulos 2004 (acromioclavicular).
//
// Reading the utility badge:
//   rule-out (SnNout) = sensible: un NEGATIVO descarta.
//   rule-in  (SpPin)  = específico: un POSITIVO confirma.

import type { OrthopedicTest } from '../../types/orthopedicTest';

const tests: OrthopedicTest[] = [
  // ======================= PINZAMIENTO SUBACROMIAL =======================
  {
    id: 'neer',
    name: 'Test de Neer',
    aka: ['Neer impingement'],
    region: 'shoulder',
    category: 'Pinzamiento subacromial',
    target: 'Espacio subacromial (supraespinoso / bíceps)',
    purpose: 'Reproducir el pinzamiento de las estructuras subacromiales.',
    maneuver:
      'El explorador estabiliza la escápula y eleva pasivamente el brazo en flexión con el hombro en rotación interna, llevándolo al final del rango.',
    positive: 'Dolor en la cara anterolateral del hombro al final de la elevación.',
    metrics: {
      sensitivity: 72,
      specificity: 60,
      note: 'Metaanálisis; sensible pero poco específico. Sube su valor combinado con Hawkins.',
    },
    // Reclassified 'rule-out' -> 'weak' (2026-08-04). SnNout needs high
    // sensitivity; 72% is not high enough to make a negative meaningfully rule
    // impingement out, and 60% specificity means a positive says little either.
    // Hegedus 2012 concludes exactly this: no single shoulder test is
    // pathognomonic, clusters do better.
    utility: 'weak',
    interpretation:
      'Sensibilidad moderada (72%) y especificidad baja (60%): aislado no descarta ni confirma. Su valor está en el clúster con Hawkins y arco doloroso.',
    pearl:
      'Comparte falsos positivos con patología acromioclavicular y labral; interprétalo dentro de un clúster.',
    demo: { components: [{ movementId: 'glenohumeral-internal-rotation', angleDeg: 60 }], movementId: 'glenohumeral-flexion', angleDeg: 160, highlightMuscleId: 'supraspinatus', note: 'La maniobra añade rotación interna del hombro.' },
    cite: [{ ref: 'hegedus-2012', verified: true, locator: 'Neer 72/60' }],
  },
  {
    id: 'hawkins-kennedy',
    name: 'Test de Hawkins-Kennedy',
    aka: ['Hawkins'],
    region: 'shoulder',
    category: 'Pinzamiento subacromial',
    target: 'Espacio subacromial (supraespinoso)',
    purpose: 'Provocar el pinzamiento del supraespinoso bajo el arco coracoacromial.',
    maneuver:
      'Hombro y codo en flexión de 90°; el explorador realiza rotación interna forzada del hombro descendiendo el antebrazo.',
    positive: 'Dolor en la reproducción del gesto.',
    // Figures corrected 2026-08-04: the entry said 74/57, but the cited source
    // (Hegedus 2012, PMID 22773322) reports pooled 79% / 59% in its own
    // abstract. Utility likewise reclassified — 79% sensitivity is still below
    // the SnNout threshold, so a negative does not rule impingement out.
    metrics: {
      sensitivity: 79,
      specificity: 59,
      note: 'Hegedus 2012 (metaanálisis): 79/59. El más sensible del grupo de pinzamiento, pero poco específico.',
    },
    utility: 'weak',
    interpretation:
      'El más sensible del grupo (79%), aunque insuficiente para descartar por sí solo, y con especificidad baja (59%). Úsalo dentro del clúster de pinzamiento, no aislado.',
    demo: { components: [{ movementId: 'elbow-flexion', angleDeg: 90 }, { movementId: 'glenohumeral-internal-rotation', angleDeg: 70 }], movementId: 'glenohumeral-flexion', angleDeg: 90, highlightMuscleId: 'supraspinatus', note: 'La maniobra añade rotación interna forzada a 90°.' },
    cite: [
      {
        ref: 'hegedus-2012',
        verified: true,
        locator: 'Hawkins-Kennedy 79/59 (resumen, metaanálisis)',
      },
    ],
  },
  {
    id: 'painful-arc',
    name: 'Arco doloroso',
    aka: ['Painful arc'],
    region: 'shoulder',
    category: 'Pinzamiento subacromial',
    target: 'Espacio subacromial',
    purpose: 'Detectar el conflicto subacromial durante la abducción activa.',
    maneuver: 'El paciente abduce activamente el brazo en el plano de la escápula de 0° a 180°.',
    positive: 'Dolor entre ~60° y 120° de abducción que cede fuera de ese rango.',
    metrics: {
      sensitivity: 74,
      specificity: 81,
      note: 'Park 2005; de los más equilibrados para pinzamiento.',
    },
    utility: 'balanced',
    interpretation:
      'Sensibilidad y especificidad equilibradas: aporta tanto al cribado como a la confirmación. Dolor en ~170-180° orienta más a la articulación acromioclavicular.',
    demo: { movementId: 'glenohumeral-abduction', angleDeg: 90, highlightMuscleId: 'supraspinatus', note: 'El dolor aparece en el arco medio (~60-120°). Comparte posición con el brazo caído: lo que cambia no es dónde está el brazo, sino que aquí el paciente sube activamente.' },
    cite: [{ ref: 'park-2005', verified: true, locator: 'arco doloroso 74/81' }],
  },

  // ==================== MANGUITO ROTADOR — SUPRAESPINOSO ====================
  {
    id: 'empty-can',
    name: 'Lata vacía (Jobe)',
    aka: ['Empty can', 'Jobe'],
    region: 'shoulder',
    category: 'Manguito rotador (supraespinoso)',
    target: 'Supraespinoso',
    purpose: 'Aislar y evaluar la fuerza/integridad del supraespinoso.',
    maneuver:
      'Brazo a 90° de abducción en el plano escapular, rotación interna completa (pulgar hacia abajo, "vaciar la lata"); el explorador resiste hacia abajo.',
    positive: 'Dolor y/o debilidad frente a la resistencia.',
    metrics: {
      sensitivity: 69,
      specificity: 62,
      note: 'Hegedus 2012: 69/62. La DEBILIDAD es más específica de rotura; el DOLOR aislado, menos.',
    },
    utility: 'balanced',
    interpretation:
      'Rendimiento moderado. Distingue el criterio de positividad: la debilidad orienta a rotura, el dolor a tendinopatía/pinzamiento.',
    // EL PULGAR, MEDIDO. Esto llevaba además `elbow-pronation 80`, y con el
    // brazo en abducción eso NO es la maniobra: la rotación interna del hombro
    // ya pone la palma hacia abajo, y 80° más de pronación seguían girando la
    // mano hasta devolver el pulgar ARRIBA. Medido con `npm run audit-demo-hand`
    // (pulgar menos meñique, en altura): con la pronación, +5,6 cm (pulgar
    // arriba); sin ella, -5,4 cm (pulgar abajo), que es el rasgo que distingue a
    // Jobe de una abducción resistida cualquiera.
    demo: { components: [{ movementId: 'glenohumeral-internal-rotation', angleDeg: 70 }], movementId: 'glenohumeral-abduction', angleDeg: 90, highlightMuscleId: 'supraspinatus', examinerForce: 'resists', note: 'Añade plano escapular (~30° anterior). La rotación interna deja el pulgar hacia abajo y el explorador resiste hacia abajo.' },
    cite: [{ ref: 'hegedus-2012', verified: true, locator: 'lata vacía 69/62' }],
  },
  {
    id: 'drop-arm',
    name: 'Brazo caído',
    aka: ['Drop arm'],
    region: 'shoulder',
    category: 'Manguito rotador (supraespinoso)',
    target: 'Supraespinoso (rotura de espesor completo)',
    purpose: 'Detectar rotura significativa del manguito.',
    maneuver:
      'El explorador eleva el brazo en abducción a 90° y pide al paciente que lo descienda lentamente de forma controlada.',
    positive: 'Caída brusca del brazo o incapacidad de controlar el descenso.',
    metrics: {
      sensitivity: 27,
      specificity: 88,
      note: 'Park 2005; alta especificidad, baja sensibilidad.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico: un positivo confirma con fuerza una rotura de espesor completo (SpPin). Un negativo NO la descarta por su baja sensibilidad.',
    demo: { movementId: 'glenohumeral-abduction', angleDeg: 90, highlightMuscleId: 'supraspinatus', note: 'El paciente desciende el brazo desde 90° de abducción. Misma posición que el arco doloroso: lo que se valora aquí es el control del descenso, no el ángulo.' },
    cite: [{ ref: 'park-2005', verified: true, locator: 'brazo caído, esp 87.5%' }],
  },

  // ================== MANGUITO ROTADOR — INFRAESPINOSO ==================
  {
    id: 'external-rotation-lag',
    name: 'Signo de retardo en rotación externa',
    aka: ['ERLS', 'External rotation lag sign'],
    region: 'shoulder',
    category: 'Manguito rotador (infraespinoso)',
    target: 'Infraespinoso / redondo menor',
    purpose: 'Detectar rotura de los rotadores externos.',
    maneuver:
      'Codo a 90°, hombro con ~20° de elevación; el explorador lleva el hombro a rotación externa casi máxima y suelta pidiendo mantener la posición.',
    positive: 'El antebrazo "cae" (lag) hacia la rotación interna: incapacidad de sostener la RE.',
    metrics: {
      sensitivity: 97,
      specificity: 93,
      note: 'Hertel 1996: 97/93 para roturas de espesor COMPLETO del infraespinoso; la sensibilidad cae mucho en roturas parciales.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico y, en roturas de espesor completo, muy sensible: un lag positivo confirma el déficit de rotadores externos. Su sensibilidad baja en roturas parciales.',
    demo: { components: [{ movementId: 'elbow-flexion', angleDeg: 90 }], movementId: 'glenohumeral-external-rotation', angleDeg: 60, highlightMuscleId: 'infraspinatus' },
    cite: [{ ref: 'hertel-1996', verified: true, locator: 'ERLS espesor completo 97/93' }],
  },

  // =================== MANGUITO ROTADOR — SUBESCAPULAR ===================
  {
    id: 'lift-off',
    name: 'Lift-off (Gerber)',
    aka: ['Lift-off', 'Gerber'],
    region: 'shoulder',
    category: 'Manguito rotador (subescapular)',
    target: 'Subescapular',
    purpose: 'Evaluar la integridad del subescapular (rotador interno).',
    maneuver:
      'Dorso de la mano sobre la región lumbar; el paciente intenta separar la mano de la espalda contra ligera resistencia.',
    positive: 'Incapacidad de despegar la mano de la espalda.',
    metrics: {
      sensitivity: 18,
      specificity: 100,
      note: 'Barth 2006, 68 pacientes consecutivos con artroscopia como patrón de referencia: 17,6% de sensibilidad y 100% de especificidad. La cifra de sensibilidad que circula (60%) no sale de ninguna de las dos fuentes: Gerber describió la prueba en 1991 sin publicar sensibilidad ni especificidad. Con una especificidad del 100% un positivo cierra el diagnóstico, pero se le escapan CUATRO de cada cinco roturas.',
    },
    utility: 'rule-in',
    interpretation:
      'La más específica de las cuatro pruebas de subescapular y la MENOS sensible de todas: un positivo confirma, un negativo no dice nada. Requiere rango de rotación interna suficiente para ejecutarse.',
    pearl:
      'Si el paciente no alcanza la posición lumbar (hombro rígido/doloroso), usa el belly-press como alternativa.',
    demo: { components: [{ movementId: 'elbow-flexion', angleDeg: 90 }], movementId: 'glenohumeral-internal-rotation', angleDeg: 90, highlightMuscleId: 'subscapularis', note: 'La mano parte del dorso lumbar y se despega de la espalda.' },
    cite: [
      {
        ref: 'barth-2006',
        verified: true,
        locator: 'Resumen: lift-off 17,6% / 100%, n = 68, artroscopia',
      },
      {
        ref: 'gerber-1991',
        verified: true,
        locator: 'Descripción original de la maniobra; NO publica sensibilidad ni especificidad',
      },
    ],
  },
  {
    id: 'belly-press',
    name: 'Press abdominal (belly-press)',
    aka: ['Belly-press', 'Napoleon'],
    region: 'shoulder',
    category: 'Manguito rotador (subescapular)',
    target: 'Subescapular',
    purpose: 'Evaluar el subescapular cuando la rotación interna posterior está limitada.',
    maneuver:
      'Palma sobre el abdomen con el codo por delante del plano del cuerpo; el paciente presiona el abdomen manteniendo la muñeca recta.',
    positive: 'La muñeca se flexiona / el codo cae hacia atrás (compensa con el deltoides posterior).',
    metrics: {
      sensitivity: 40,
      specificity: 98,
      note: 'Barth 2006, los MISMOS 68 pacientes que midieron el lift-off: 40% de sensibilidad y 97,9% de especificidad. Importa que sea la misma serie, porque ahí el belly-press dobla la sensibilidad del lift-off sin perder especificidad. En ese estudio la prueba más sensible fue el abrazo de oso (bear-hug, 60% / 91,7%), y aun así el 40% de las roturas de subescapular no las predijo NINGUNA de las cuatro pruebas.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico: un positivo confirma déficit del subescapular. Poco sensible aislado, aunque el doble que el lift-off en la misma serie.',
    demo: { components: [{ movementId: 'elbow-flexion', angleDeg: 90 }], movementId: 'glenohumeral-internal-rotation', angleDeg: 45, highlightMuscleId: 'subscapularis', note: 'La palma presiona el abdomen con el codo por delante del cuerpo.' },
    cite: [
      {
        ref: 'barth-2006',
        verified: true,
        locator: 'Resumen: belly-press 40% / 97,9%, n = 68, artroscopia',
      },
    ],
  },

  // ==================== INESTABILIDAD ANTERIOR / LABRUM ====================
  {
    id: 'apprehension',
    name: 'Aprensión anterior',
    aka: ['Apprehension', 'Crank de aprensión'],
    region: 'shoulder',
    category: 'Inestabilidad anterior',
    target: 'Cápsula anterior / labrum anteroinferior',
    purpose: 'Detectar inestabilidad glenohumeral anterior.',
    maneuver:
      'Paciente en supino, hombro a 90° de abducción; el explorador lleva a rotación externa progresiva.',
    positive: 'Sensación de aprensión/luxación inminente (NO solo dolor).',
    metrics: {
      sensitivity: 72,
      specificity: 96,
      note: 'Lo 2004, tomando la APRENSIÓN (no el dolor) como criterio positivo.',
    },
    utility: 'rule-in',
    interpretation:
      'Con la aprensión como criterio es muy específico: un positivo confirma inestabilidad anterior. Si el criterio es "dolor", pierde especificidad.',
    demo: { components: [{ movementId: 'elbow-flexion', angleDeg: 90 }, { movementId: 'glenohumeral-external-rotation', angleDeg: 80 }], movementId: 'glenohumeral-abduction', angleDeg: 90, note: 'Posición de aprensión: 90° de abducción con rotación externa. Recolocación y sorpresa se hacen en ESTA MISMA posición; lo que cambia entre las tres es la mano del explorador, no el brazo del paciente.' },
    cite: [{ ref: 'lo-2004', verified: true, locator: 'aprensión 72/96' }],
  },
  {
    id: 'relocation',
    name: 'Recolocación (Jobe)',
    aka: ['Relocation'],
    region: 'shoulder',
    category: 'Inestabilidad anterior',
    target: 'Cápsula anterior / labrum',
    purpose: 'Confirmar el origen anterior de la aprensión provocada.',
    maneuver:
      'Desde la posición de aprensión, el explorador aplica una fuerza posterior sobre la cabeza humeral.',
    positive: 'Alivio de la aprensión, que reaparece al retirar la fuerza (test de sorpresa).',
    metrics: {
      note: 'SIN CIFRA PROPIA, y el motivo es el hallazgo. Lo 2004 (46 pacientes, cuatro examinadores ciegos e independientes) midió las tres pruebas juntas y concluyó que el alivio de la aprensión o del dolor con la recolocación "añadía poco" al valor del conjunto: no publicó sensibilidad ni especificidad de la recolocación aislada. Lo que sí midió es la prueba de SORPRESA, que es la mejor de las tres por separado (63,9% / 98,9%), y el conjunto: con aprensión en las tres pruebas, el valor predictivo positivo fue del 93,6%. La recolocación vale como paso intermedio para llegar a la sorpresa, no como prueba con cifra propia.',
    },
    utility: 'rule-in',
    interpretation:
      'Es el paso intermedio de una secuencia, no una prueba independiente: su utilidad medida está en completar aprensión + recolocación + sorpresa, donde el conjunto positivo es muy específico de inestabilidad anterior traumática.',
    demo: { components: [{ movementId: 'elbow-flexion', angleDeg: 90 }, { movementId: 'glenohumeral-external-rotation', angleDeg: 80 }], movementId: 'glenohumeral-abduction', angleDeg: 90, note: 'Misma posición que la aprensión. Lo único que cambia es que el explorador empuja la cabeza humeral hacia atrás — por eso el brazo se ve igual.' },
    cite: [
      {
        ref: 'lo-2004',
        verified: true,
        locator: 'Resumen: la recolocación "añade poco"; sorpresa 63,89% / 98,91%; VPP del conjunto 93,6%',
      },
    ],
  },
  {
    id: 'surprise-release',
    name: 'Sorpresa / liberación anterior',
    aka: ['Surprise', 'Anterior release'],
    region: 'shoulder',
    category: 'Inestabilidad anterior',
    target: 'Cápsula anterior / labrum',
    purpose: 'Prueba confirmatoria de inestabilidad anterior tras la recolocación.',
    maneuver:
      'En la posición de recolocación, se retira bruscamente la fuerza posterior sobre la cabeza humeral.',
    positive: 'Reaparición súbita de aprensión o dolor.',
    metrics: {
      sensitivity: 64,
      specificity: 99,
      note: 'Lo 2004; el más específico de la tríada de inestabilidad anterior.',
    },
    utility: 'rule-in',
    interpretation:
      'Especificidad muy alta: un positivo confirma inestabilidad anterior. Suele completar la tríada aprensión → recolocación → sorpresa.',
    demo: { components: [{ movementId: 'elbow-flexion', angleDeg: 90 }, { movementId: 'glenohumeral-external-rotation', angleDeg: 80 }], movementId: 'glenohumeral-abduction', angleDeg: 90, note: 'Misma posición que la aprensión y la recolocación. Lo que cambia es que se retira bruscamente la fuerza posterior; el brazo no se mueve.' },
    cite: [{ ref: 'lo-2004', verified: true, locator: 'sorpresa 64/99' }],
  },

  // ================= LESIÓN LABRAL SUPERIOR (SLAP) / BÍCEPS =================
  {
    id: 'obrien',
    name: 'Compresión activa (O’Brien)',
    aka: ["O'Brien", 'Active compression'],
    region: 'shoulder',
    category: 'Lesión labral superior (SLAP) / bíceps',
    target: 'Labrum superior (SLAP) / articulación acromioclavicular',
    purpose: 'Orientar hacia lesión SLAP o patología acromioclavicular.',
    maneuver:
      'Hombro a 90° de flexión con 10-15° de aducción; se resiste la flexión primero en rotación interna (pulgar abajo) y luego en rotación externa (palma arriba).',
    positive:
      'Dolor profundo en rotación interna que MEJORA en rotación externa (SLAP); dolor superior/acromioclavicular orienta a la AC.',
    metrics: {
      sensitivity: 59,
      specificity: 57,
      note: 'Hegedus 2012: 59/57. La descripción original (100/99) no se ha reproducido: usar en clúster.',
    },
    utility: 'weak',
    interpretation:
      'Aislado tiene baja precisión: interprétalo dentro de un clúster de tests labrales, no como prueba única.',
    demo: { components: [{ movementId: 'glenohumeral-internal-rotation', angleDeg: 60 }, { movementId: 'elbow-pronation', angleDeg: 80 }], movementId: 'glenohumeral-flexion', angleDeg: 90, examinerForce: 'resists', note: 'Con 10-15° de aducción; el explorador resiste la flexión (pulgar abajo, luego palma arriba).' },
    cite: [{ ref: 'hegedus-2012', verified: true, locator: 'O’Brien 59/57' }],
  },
  {
    id: 'speed',
    name: 'Test de Speed',
    aka: ['Speed', 'Palm-up'],
    region: 'shoulder',
    category: 'Lesión labral superior (SLAP) / bíceps',
    target: 'Tendón largo del bíceps / labrum superior',
    purpose: 'Provocar el dolor de la porción larga del bíceps o del labrum superior.',
    maneuver:
      'Hombro a ~90° de flexión, codo extendido y antebrazo supinado; el explorador resiste la flexión del hombro.',
    positive: 'Dolor en la corredera bicipital (cara anterior del hombro).',
    metrics: {
      sensitivity: 65,
      specificity: 61,
      note: 'Hegedus 2012: 65/61. Precisión baja en ambos sentidos (LR+ ~1.7).',
    },
    utility: 'weak',
    interpretation:
      'Precisión baja aislado: ni un positivo ni un negativo cambian mucho la probabilidad. Aporta más como parte de un clúster bicipital/labral.',
    demo: { components: [{ movementId: 'elbow-supination', angleDeg: 80 }], movementId: 'glenohumeral-flexion', angleDeg: 90, examinerForce: 'resists', note: 'Codo extendido y antebrazo supinado; el explorador resiste la flexión del hombro.' },
    cite: [{ ref: 'hegedus-2012', verified: true, locator: 'Speed 65/61' }],
  },

  // ====================== ARTICULACIÓN ACROMIOCLAVICULAR ======================
  {
    id: 'cross-body-adduction',
    name: 'Aducción cruzada',
    aka: ['Cross-body adduction', 'Scarf test'],
    region: 'shoulder',
    category: 'Articulación acromioclavicular',
    target: 'Articulación acromioclavicular',
    purpose: 'Estresar la articulación acromioclavicular.',
    maneuver:
      'Hombro a 90° de flexión; el explorador lleva el brazo en aducción horizontal máxima cruzando el cuerpo.',
    positive: 'Dolor localizado en la articulación acromioclavicular.',
    metrics: {
      sensitivity: 77,
      note: 'Chronopoulos 2004 (35 pacientes operados de resección de clavícula distal, casos y controles) publica la sensibilidad del 77%, la más alta de las tres pruebas acromioclaviculares. El 79% que suele acompañarla NO es la especificidad: es la EXACTITUD global de la prueba, y son cosas distintas. La especificidad de esta prueba no consta en esa fuente. Lo que sí consta cambia cómo se usa: el valor predictivo positivo fue MENOR del 30% en las tres pruebas y el negativo mayor del 94%. Es decir, sirve para descartar, no para confirmar; y como es un diseño de casos y controles, esos valores predictivos dependen de una prevalencia artificial.',
    },
    utility: 'rule-out',
    utilityBasis:
      'La etiqueta no viene de la sensibilidad (77%, que no llega al umbral de una prueba de descarte) sino del valor predictivo negativo de la misma fuente, por encima del 94%. Chronopoulos no publica la especificidad de esta prueba.',
    interpretation:
      'Un negativo deja la articulación acromioclavicular prácticamente fuera (VPN > 94%). Un positivo NO la confirma: con un VPP por debajo del 30%, el dolor a la aducción cruzada es frecuente sin lesión acromioclavicular. La localización del dolor en la propia AC, y no en el subacromial, es lo que aporta valor.',
    cite: [
      {
        ref: 'chronopoulos-2004',
        verified: true,
        locator: 'Resumen: aducción cruzada sens 77%, exactitud 79%; VPP < 30% y VPN > 94% en las tres pruebas',
      },
    ],
  },
];

export const SHOULDER_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
