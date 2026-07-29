// src/data/orthopedicTests/cervical.ts
//
// CERVICAL orthopedic special tests, grouped by clinical target: radiculopatía
// cervical (clúster de Wainner), mielopatía cervical (signos de motoneurona
// superior), inestabilidad craneocervical (banderas rojas) y cribado vascular.
//
// Same encoding + honesty rules as shoulder.ts: metrics are POINT ESTIMATES (%)
// that vary by study and positivity criterion, with a `note` carrying the spread.
// Values here were CHECKED against the primary sources (verified: true + locator);
// where the literature only gives a wide range with no defensible point estimate
// (Lhermitte, insuficiencia vertebrobasilar, pruebas ligamentarias) the metric
// stays note-only or verified: false and the note states why.
//
// Sources (see references.ts): Wainner 2003 + Rubinstein 2007 + Tong 2002
// (radiculopatía), Cook 2010 y Jiang 2024 (mielopatía), Uitvlugt 1988 y Hutting
// 2013b (inestabilidad cervical alta), Hutting 2013 (insuficiencia vertebrobasilar).
//
// Reading the utility badge:
//   rule-out (SnNout) = sensible: un NEGATIVO descarta.
//   rule-in  (SpPin)  = específico: un POSITIVO confirma.
//   weak              = poco valor aislado; interpretar en clúster/contexto.
//
// DEMO note: the cervical rig is a single spine armature; special tests that add
// axial compression, distraction or upper-limb neural tension cannot be posed,
// so those tests omit `demo` and explain the maneuver in prose instead.

import type { OrthopedicTest } from '../../types/orthopedicTest';

const tests: OrthopedicTest[] = [
  // ======================= RADICULOPATÍA CERVICAL =======================
  {
    id: 'spurling',
    name: 'Test de Spurling',
    aka: ['Compresión foraminal', 'Spurling A'],
    region: 'cervical',
    category: 'Radiculopatía cervical',
    target: 'Raíz nerviosa cervical (foramen intervertebral)',
    purpose: 'Reproducir el dolor radicular por estrechamiento del foramen.',
    maneuver:
      'Sentado, se lleva el cuello a extensión con inclinación y rotación hacia el lado sintomático; el explorador aplica una compresión axial suave sobre la cabeza.',
    positive:
      'Reproducción del dolor o parestesias irradiadas por el dermatoma del lado explorado (no solo dolor cervical local).',
    metrics: {
      sensitivity: 50,
      specificity: 86,
      note: 'Wainner 2003 (frente a EMG): 50/86, LR+ 3.5. Tong 2002: 30/93. Muy específico y poco sensible.',
    },
    utility: 'rule-in',
    interpretation:
      'Alta especificidad y baja sensibilidad (SpPin): un positivo confirma con fuerza la radiculopatía; un negativo NO la descarta. Es la clave confirmatoria del clúster de Wainner.',
    pearl:
      'No lo fuerces si aparecen mareo, síntomas bilaterales o signos medulares. Detén la compresión en cuanto se reproduzcan los síntomas.',
    demo: {
      movementId: 'cervical-extension',
      angleDeg: 25,
      side: 'R',
      note: 'La maniobra añade inclinación y rotación hacia el lado sintomático más una compresión axial descendente.',
    },
    cite: [
      { ref: 'wainner-2003', verified: true, locator: 'Tabla 5 (frente a EMG)' },
      { ref: 'tong-2002', verified: true, locator: 'sens 30% / esp 93% frente a EMG' },
      { ref: 'rubinstein-2007', verified: true, locator: 'revisión sistemática (rangos)' },
    ],
  },
  {
    id: 'cervical-distraction',
    name: 'Distracción cervical',
    aka: ['Cervical distraction test'],
    region: 'cervical',
    category: 'Radiculopatía cervical',
    target: 'Raíz nerviosa cervical (foramen intervertebral)',
    purpose: 'Aliviar el dolor radicular descomprimiendo el foramen.',
    maneuver:
      'Paciente en supino o sentado; el explorador toma el occipucio y el mentón y aplica una tracción axial progresiva del cuello.',
    positive: 'Alivio o reducción clara del dolor/parestesias irradiadas durante la tracción.',
    metrics: {
      sensitivity: 44,
      specificity: 90,
      note: 'Wainner 2003: 44/90, LR+ 4.4. Test de alivio, específico. Un positivo apoya el origen radicular.',
    },
    utility: 'rule-in',
    interpretation:
      'Específico como prueba de alivio: la mejoría con la tracción orienta a compromiso radicular. Baja sensibilidad, por lo que no sirve para descartar.',
    pearl:
      'La tracción reproduce, en manos del explorador, el efecto de la tracción mecánica terapéutica: útil también como prueba pronóstica.',
    demo: {
      movementId: 'cervical-flexion',
      angleDeg: 12,
      note: 'La distracción es una tracción axial manual (occipucio y mentón); el modelo solo insinúa la posición de descarga del foramen.',
    },
    cite: [{ ref: 'wainner-2003', verified: true, locator: 'Tabla 5 (frente a EMG)' }],
  },
  {
    id: 'ulnt-median',
    name: 'Test de tensión neural del MMSS (sesgo mediano)',
    aka: ['ULTT A', 'ULNT 1', 'Upper limb tension test'],
    region: 'cervical',
    category: 'Radiculopatía cervical',
    target: 'Nervio mediano / raíces C5-C7',
    purpose: 'Detectar mecanosensibilidad neural (radiculopatía o neuropatía del MMSS).',
    maneuver:
      'Secuencia con sesgo del mediano: depresión escapular, abducción del hombro ~90°, supinación y extensión de muñeca/dedos, rotación externa y extensión del codo; se sensibiliza con inclinación cervical contralateral.',
    positive:
      'Reproducción de los síntomas del paciente, diferencia >10° respecto al lado sano o cambio de síntomas al modular la inclinación cervical.',
    metrics: {
      sensitivity: 97,
      specificity: 22,
      note: 'Wainner 2003: 97/22, LR− 0.12. Muy sensible y poco específico: el mejor test de cribado del clúster.',
    },
    utility: 'rule-out',
    interpretation:
      'Muy sensible (SnNout): un negativo hace muy improbable la radiculopatía cervical. Un positivo es inespecífico y debe confirmarse con Spurling/distracción.',
    demo: {
      movementId: 'cervical-lateral-flexion',
      angleDeg: 20,
      side: 'L',
      note: 'Prueba de tensión neural del brazo; el componente cervical es la inclinación CONTRALATERAL que la sensibiliza (el modelo muestra solo el cuello).',
    },
    cite: [{ ref: 'wainner-2003', verified: true, locator: 'Tabla 5 (frente a EMG)' }],
  },
  {
    id: 'cervical-rotation-limit',
    name: 'Rotación cervical < 60° al lado sintomático',
    aka: ['ROM rotación ipsilateral'],
    region: 'cervical',
    category: 'Radiculopatía cervical',
    target: 'Movilidad segmentaria cervical',
    purpose: 'Cribar la limitación de rotación asociada a la radiculopatía.',
    maneuver:
      'Se mide la rotación cervical activa hacia el lado sintomático con goniómetro/inclinómetro.',
    positive: 'Rotación activa hacia el lado sintomático menor de 60°.',
    metrics: {
      sensitivity: 89,
      specificity: 49,
      note: 'Wainner 2003: 89/49. Ítem sensible del clúster, poco útil aislado.',
    },
    utility: 'rule-out',
    interpretation:
      'Sensible pero inespecífico: aporta como cribado dentro del clúster de Wainner, no como prueba única. Combínalo con Spurling, distracción y ULTT.',
    pearl:
      'Clúster de Wainner (ULTT + distracción + Spurling + rotación <60°): con 3/4 positivos LR+ 6.1 (prob. ~65%); con 4/4 LR+ 30.3 (IC muy amplio, 1.7-538). Usa el botón "Combinar" para verlo.',
    demo: {
      movementId: 'cervical-rotation',
      angleDeg: 60,
      side: 'R',
      note: 'Se compara la rotación hacia el lado sintomático (aquí ~60°) con el lado sano.',
    },
    cite: [{ ref: 'wainner-2003', verified: true, locator: 'Tabla 6 (clúster / CPR)' }],
  },

  // ======================= MIELOPATÍA CERVICAL =======================
  {
    id: 'hoffmann',
    name: 'Signo de Hoffmann',
    aka: ['Hoffmann', 'Reflejo digital'],
    region: 'cervical',
    category: 'Mielopatía cervical',
    target: 'Motoneurona superior (compresión medular cervical)',
    purpose: 'Buscar signos de motoneurona superior sugestivos de mielopatía.',
    maneuver:
      'El explorador sostiene el dedo medio y flexiona/"chasquea" con rapidez la falange distal.',
    positive: 'Flexión-aducción refleja del pulgar y/o del índice.',
    metrics: {
      sensitivity: 39,
      specificity: 88,
      note: 'Muy variable entre estudios (sens 25-100%, esp 50-100%). Cook 2010: 39/88. Un Hoffmann aislado también aparece en sanos.',
    },
    utility: 'balanced',
    interpretation:
      'Signo de motoneurona superior. Aislado tiene valor moderado; gana potencia dentro del clúster de mielopatía (marcha, supinador invertido, Babinski, edad >45).',
    pearl:
      'Un Hoffmann positivo unilateral y aislado, sin otros signos, puede ser una variante normal. Cobra sentido con déficit funcional o hiperreflexia.',
    demo: {
      movementId: 'cervical-flexion',
      angleDeg: 30,
      note: 'Signo de mielopatía cervical; el modelo muestra la columna cervical (origen de la compresión medular), no el chasquido de la falange distal.',
    },
    cite: [
      { ref: 'cook-2010', verified: true, locator: 'sens 0.39 / esp 0.88' },
      { ref: 'jiang-2024', verified: true, locator: 'rango agrupado entre estudios' },
    ],
  },
  {
    id: 'lhermitte',
    name: 'Signo de Lhermitte',
    aka: ['Lhermitte'],
    region: 'cervical',
    category: 'Mielopatía cervical',
    target: 'Médula cervical / cordones posteriores',
    purpose: 'Provocar el síntoma de descarga eléctrica de la irritación medular.',
    maneuver: 'Sentado, el explorador realiza una flexión cervical pasiva.',
    positive: 'Sensación de descarga eléctrica que desciende por la columna y/o las extremidades.',
    metrics: {
      sensitivity: 27,
      specificity: 93,
      note: 'Estimación orientativa: los metaanálisis lo recogen como síntoma, sin datos agrupados de precisión. Poco sensible, específico; también aparece en esclerosis múltiple.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico y poco sensible: un positivo apoya la irritación medular; un negativo no la descarta. Bandera para completar el examen neurológico.',
    demo: {
      movementId: 'cervical-flexion',
      angleDeg: 45,
      note: 'La flexión cervical pasiva es el gesto que desencadena la descarga eléctrica descendente.',
    },
    cite: [{ ref: 'jiang-2024', verified: false, locator: 'referido como síntoma (sin datos agrupados)' }],
  },
  {
    id: 'inverted-supinator',
    name: 'Signo del supinador invertido',
    aka: ['Inverted supinator sign'],
    region: 'cervical',
    category: 'Mielopatía cervical',
    target: 'Motoneurona superior (nivel C5-C6)',
    purpose: 'Detectar mielopatía a nivel C5-C6 con respuesta refleja invertida.',
    maneuver:
      'Se percute el tendón del braquiorradial (reflejo supinador) con el antebrazo relajado.',
    positive:
      'Ausencia de flexión del codo con flexión refleja de los dedos y/o del codo por reflejo tricipital paradójico.',
    metrics: {
      sensitivity: 19,
      specificity: 99,
      note: 'Cook 2010: 19/99, LR+ ≈ 29. Muy específico y poco sensible (sens 18-75% entre estudios).',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico (SpPin): un positivo apoya con fuerza la mielopatía a nivel C5-C6. Poco sensible, así que su ausencia no la descarta; interpretar dentro del clúster.',
    demo: {
      movementId: 'cervical-extension',
      angleDeg: 20,
      note: 'Signo de mielopatía a nivel C5-C6; el modelo muestra la columna cervical (origen de la compresión), no la percusión del braquiorradial.',
    },
    cite: [
      { ref: 'cook-2010', verified: true, locator: 'sens 0.19 / esp 0.99' },
      { ref: 'jiang-2024', verified: true, locator: 'rango agrupado entre estudios' },
    ],
  },
  {
    id: 'babinski',
    name: 'Signo de Babinski / clonus',
    aka: ['Babinski', 'Clonus aquíleo'],
    region: 'cervical',
    category: 'Mielopatía cervical',
    target: 'Vía corticoespinal (motoneurona superior)',
    purpose: 'Confirmar afectación de motoneurona superior.',
    maneuver:
      'Se estimula el borde lateral de la planta del pie hacia los metatarsianos (Babinski) y/o se busca clonus con dorsiflexión brusca del tobillo.',
    positive:
      'Extensión del primer dedo con apertura en abanico (Babinski) o clonus sostenido del tobillo.',
    metrics: {
      sensitivity: 26,
      specificity: 96,
      note: 'Muy específico, poco sensible (Babinski sens 7-36%, esp 93-100%; clonus sens 7-13%, esp 96-99%).',
    },
    utility: 'rule-in',
    interpretation:
      'Alta especificidad (SpPin): un positivo confirma afectación de motoneurona superior. Su ausencia no descarta mielopatía incipiente.',
    demo: {
      movementId: 'cervical-flexion',
      angleDeg: 25,
      note: 'Signo de motoneurona superior; el modelo muestra la columna cervical (origen de la mielopatía), no la respuesta plantar ni el clonus.',
    },
    cite: [{ ref: 'jiang-2024', verified: true, locator: 'Babinski / clonus (rango agrupado)' }],
  },

  // =================== INESTABILIDAD CRANEOCERVICAL ===================
  {
    id: 'sharp-purser',
    name: 'Test de Sharp-Purser',
    aka: ['Sharp-Purser'],
    region: 'cervical',
    category: 'Inestabilidad craneocervical',
    target: 'Ligamento transverso / articulación atlantoaxial (C1-C2)',
    purpose: 'Detectar subluxación atlantoaxial anterior (inestabilidad de C1-C2).',
    maneuver:
      'Sentado, con el cuello en ligera flexión, el explorador aplica una presión posterior sobre la frente mientras estabiliza la apófisis espinosa de C2.',
    positive:
      'Deslizamiento posterior de la cabeza con un "clunk" y/o alivio de los síntomas al recolocarse el atlas.',
    metrics: {
      sensitivity: 88,
      specificity: 96,
      note: 'Uitvlugt 1988 (artritis reumatoide, subluxación >4 mm): 88/96. Alta precisión, pero población seleccionada.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico: un positivo confirma inestabilidad atlantoaxial. Es una BANDERA ROJA: contraindica la manipulación cervical y obliga a derivación/imagen.',
    pearl:
      '⚠️ Prueba de precaución. Sospéchala en artritis reumatoide, síndrome de Down o traumatismo. Ejecútala con suavidad y detente ante mareo o síntomas neurológicos.',
    demo: {
      movementId: 'cervical-flexion',
      angleDeg: 20,
      note: 'Desde ligera flexión, se traslada la frente/occipucio en sentido posterior estabilizando C2.',
    },
    cite: [
      { ref: 'uitvlugt-1988', verified: true, locator: 'subluxación >4 mm' },
      { ref: 'hutting-2013b', verified: true, locator: 'especificidad suficiente' },
    ],
  },
  {
    id: 'transverse-ligament-stress',
    name: 'Estrés del ligamento transverso',
    aka: ['Transverse ligament stress test'],
    region: 'cervical',
    category: 'Inestabilidad craneocervical',
    target: 'Ligamento transverso del atlas',
    purpose: 'Estresar el ligamento transverso para detectar inestabilidad C1-C2.',
    maneuver:
      'En supino, el explorador sostiene el occipucio y desliza la cabeza y el atlas en sentido anterior, manteniendo la posición unos segundos.',
    positive:
      'Reproducción de síntomas de mielopatía (mareo, parestesias, nudo en la garganta, nistagmo) o sensación de inestabilidad.',
    metrics: {
      note: 'Hutting 2013: especificidad suficiente pero sensibilidad variable y pocos estudios. Cribado de seguridad, no prueba diagnóstica.',
    },
    utility: 'weak',
    interpretation:
      'Precisión no establecida con solidez. Úsalo como cribado de seguridad ante sospecha de inestabilidad, nunca como prueba diagnóstica aislada.',
    pearl:
      '⚠️ Prueba de precaución (banderas rojas). Un resultado sugestivo obliga a suspender técnicas de movilización/manipulación y derivar.',
    demo: {
      movementId: 'cervical-flexion',
      angleDeg: 15,
      note: 'En supino se desliza la cabeza y el atlas en sentido anterior; el modelo aproxima la posición en ligera flexión craneocervical.',
    },
    cite: [{ ref: 'hutting-2013b', verified: true, locator: 'revisión de inestabilidad cervical alta' }],
  },
  {
    id: 'alar-ligament',
    name: 'Prueba del ligamento alar',
    aka: ['Alar ligament test'],
    region: 'cervical',
    category: 'Inestabilidad craneocervical',
    target: 'Ligamentos alares',
    purpose: 'Valorar la integridad de los ligamentos alares (estabilidad rotatoria C0-C2).',
    maneuver:
      'El explorador estabiliza la apófisis espinosa de C2 e induce inclinación lateral o rotación de la cabeza; con el ligamento íntegro, C2 debe rotar de inmediato con el movimiento.',
    positive: 'Movimiento excesivo de la cabeza sin arrastre inmediato de C2 (laxitud del ligamento).',
    metrics: {
      note: 'Hutting 2013: fiabilidad y sensibilidad limitadas; algunas variantes con especificidad aceptable. Valor orientativo dentro del cribado.',
    },
    utility: 'weak',
    interpretation:
      'Sin precisión diagnóstica firme. Aporta solo como parte de la evaluación de estabilidad craneocervical junto a la anamnesis y otras pruebas.',
    pearl:
      '⚠️ Prueba de precaución. Complementa a Sharp-Purser y al estrés del ligamento transverso en el descarte de inestabilidad alta.',
    demo: {
      movementId: 'cervical-lateral-flexion',
      angleDeg: 15,
      note: 'Con C2 estabilizado se induce inclinación/rotación de la cabeza; con el ligamento íntegro C2 rota de inmediato con ella.',
    },
    cite: [{ ref: 'hutting-2013b', verified: true, locator: 'revisión de inestabilidad cervical alta' }],
  },

  // ======================== CRIBADO VASCULAR ========================
  {
    id: 'vbi-sustained-rotation',
    name: 'Insuficiencia vertebrobasilar (rotación y extensión sostenidas)',
    aka: ['Test de VBI', 'Prueba premanipulativa'],
    region: 'cervical',
    category: 'Cribado vascular',
    target: 'Arterias vertebrales / sistema vertebrobasilar',
    purpose: 'Buscar signos de compromiso del flujo vertebrobasilar antes de técnicas cervicales.',
    maneuver:
      'Sentado o en supino, se lleva el cuello a rotación y extensión combinadas hasta el rango final y se sostiene ~10 s vigilando la aparición de síntomas.',
    positive:
      'Mareo, vértigo, nistagmo, diplopía, disartria, disfagia, caídas (drop attacks) o parestesias periorales durante la posición sostenida.',
    metrics: {
      note: 'Hutting 2013: precisión muy baja e inconsistente (sens 0-57%, esp 67-100%; solo 4 estudios de calidad cuestionable). Un negativo NO garantiza seguridad.',
    },
    utility: 'weak',
    interpretation:
      'Escaso valor diagnóstico: un test negativo no descarta patología arterial ni autoriza sin más la manipulación. Prima la anamnesis de riesgo vascular (marco IFOMPT).',
    pearl:
      '⚠️ Su utilidad está muy cuestionada. El cribado real es la historia clínica (patrón de cefalea/cuello nuevo, factores de riesgo, síntomas de las 5 D y 3 N), no esta maniobra.',
    demo: {
      movementId: 'cervical-rotation',
      angleDeg: 70,
      side: 'R',
      note: 'Rotación (más extensión) sostenida en rango final; el modelo muestra solo la rotación.',
    },
    cite: [{ ref: 'hutting-2013', verified: true, locator: 'sens 0-57% / esp 67-100%' }],
  },
];

export const CERVICAL_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
