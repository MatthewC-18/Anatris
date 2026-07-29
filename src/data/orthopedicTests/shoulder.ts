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
    utility: 'rule-out',
    interpretation:
      'Sensibilidad de moderada a alta y especificidad baja: útil como cribado (un negativo hace menos probable el pinzamiento), no para confirmar por sí solo.',
    pearl:
      'Comparte falsos positivos con patología acromioclavicular y labral; interprétalo dentro de un clúster.',
    demo: { movementId: 'glenohumeral-flexion', angleDeg: 160, highlightMuscleId: 'supraspinatus', note: 'La maniobra añade rotación interna del hombro.' },
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
    metrics: {
      sensitivity: 74,
      specificity: 57,
      note: 'Hegedus 2012 (metaanálisis): 74/57. De los más sensibles del grupo de pinzamiento.',
    },
    utility: 'rule-out',
    interpretation:
      'Alta sensibilidad, baja especificidad: buen test de cribado. Un negativo reduce la probabilidad de pinzamiento; un positivo requiere confirmación.',
    demo: { movementId: 'glenohumeral-flexion', angleDeg: 90, highlightMuscleId: 'supraspinatus', note: 'La maniobra añade rotación interna forzada a 90°.' },
    cite: [{ ref: 'hegedus-2012', verified: true, locator: 'Hawkins-Kennedy 74/57' }],
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
    demo: { movementId: 'glenohumeral-abduction', angleDeg: 90, highlightMuscleId: 'supraspinatus', note: 'El dolor aparece en el arco medio (~60-120°).' },
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
    demo: { movementId: 'glenohumeral-abduction', angleDeg: 90, highlightMuscleId: 'supraspinatus', resisted: true, note: 'Añade plano escapular (~30° anterior) y rotación interna. El explorador resiste hacia abajo.' },
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
    demo: { movementId: 'glenohumeral-abduction', angleDeg: 90, highlightMuscleId: 'supraspinatus', note: 'El paciente desciende el brazo desde 90° de abducción.' },
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
    demo: { movementId: 'glenohumeral-external-rotation', angleDeg: 60, highlightMuscleId: 'infraspinatus' },
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
      sensitivity: 62,
      specificity: 100,
      note: 'Gerber 1991 (serie pequeña); especificidad muy alta, sensibilidad menor en series posteriores.',
    },
    utility: 'rule-in',
    interpretation:
      'Especificidad muy alta: un positivo confirma disfunción del subescapular. Requiere rango de rotación interna suficiente para ejecutarse.',
    pearl:
      'Si el paciente no alcanza la posición lumbar (hombro rígido/doloroso), usa el belly-press como alternativa.',
    demo: { movementId: 'glenohumeral-internal-rotation', angleDeg: 90, highlightMuscleId: 'subscapularis', note: 'La mano parte del dorso lumbar y se despega de la espalda.' },
    cite: [{ ref: 'gerber-1991', verified: false }],
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
      note: 'Alta especificidad; alternativa al lift-off en hombro rígido.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico: un positivo confirma déficit del subescapular. Poco sensible aislado.',
    demo: { movementId: 'glenohumeral-internal-rotation', angleDeg: 45, highlightMuscleId: 'subscapularis', note: 'La palma presiona el abdomen con el codo por delante del cuerpo.' },
    cite: [{ ref: 'hegedus-2012', verified: false }],
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
    demo: { movementId: 'glenohumeral-abduction', angleDeg: 90, note: 'Se añade rotación externa progresiva a 90° de abducción (posición de aprensión).' },
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
      sensitivity: 65,
      specificity: 90,
      note: 'Lo 2004; depende del criterio (alivio de la aprensión vs del dolor).',
    },
    utility: 'rule-in',
    interpretation:
      'Confirmatorio de la aprensión: si el alivio es el criterio, es específico de inestabilidad anterior.',
    demo: { movementId: 'glenohumeral-abduction', angleDeg: 90, note: 'Desde la posición de aprensión (90° abd + RE), se aplica fuerza posterior sobre la cabeza humeral.' },
    cite: [{ ref: 'lo-2004', verified: false }],
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
    demo: { movementId: 'glenohumeral-abduction', angleDeg: 90, note: 'Se retira bruscamente la fuerza posterior en 90° abd + rotación externa.' },
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
    demo: { movementId: 'glenohumeral-flexion', angleDeg: 90, resisted: true, note: 'Con 10-15° de aducción; el explorador resiste la flexión (pulgar abajo, luego palma arriba).' },
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
    demo: { movementId: 'glenohumeral-flexion', angleDeg: 90, resisted: true, note: 'Codo extendido y antebrazo supinado; el explorador resiste la flexión del hombro.' },
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
      specificity: 79,
      note: 'Chronopoulos 2004; localización del dolor clave para diferenciar de la patología subacromial.',
    },
    utility: 'balanced',
    interpretation:
      'Equilibrado y con buena localización: dolor en la AC (no subacromial) orienta a lesión acromioclavicular.',
    cite: [{ ref: 'chronopoulos-2004', verified: false }],
  },
];

export const SHOULDER_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
