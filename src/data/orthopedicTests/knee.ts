// src/data/orthopedicTests/knee.ts
//
// KNEE orthopedic special tests, grouped by clinical target: ligamento cruzado
// anterior (LCA), ligamento cruzado posterior (LCP), menisco y ligamentos
// colaterales.
//
// HONESTY: unlike cervical/lumbar, these metrics were NOT web-verified in this
// session (search quota exhausted), so every entry stays `verified: false` (the
// UI shows "por verificar") and carries the point estimate + spread from the
// standard meta-analyses. Flip to verified: true + locator once each number is
// checked against the primary source.
//
// Sources (see references.ts): Benjaminse 2006 (LCA), Hegedus 2007 (menisco),
// Karachalios 2005 (Thessaly), Malanga 2003 (LCP y colaterales).
//
// DEMO note: the knee rig drives flexión/extensión + rotación interna/externa.
// Most knee tests are translation (Lachman, cajones) or stress maneuvers the rig
// cannot reproduce; those approximate the flexion angle at which the test is done
// with an honest `note`. McMurray/Thessaly use the rotation the rig CAN show.

import type { OrthopedicTest } from '../../types/orthopedicTest';

const tests: OrthopedicTest[] = [
  // ==================== LIGAMENTO CRUZADO ANTERIOR (LCA) ====================
  {
    id: 'lachman',
    name: 'Test de Lachman',
    aka: ['Lachman'],
    region: 'knee',
    category: 'Ligamento cruzado anterior',
    target: 'Ligamento cruzado anterior',
    purpose: 'Detectar rotura del LCA por traslación anterior de la tibia.',
    maneuver:
      'Rodilla a 20-30° de flexión; el explorador estabiliza el fémur y traslada la tibia hacia anterior valorando el desplazamiento y la calidad del tope final.',
    positive: 'Traslación anterior aumentada con tope final blando o ausente respecto al lado sano.',
    metrics: {
      sensitivity: 86,
      specificity: 91,
      note: 'Benjaminse 2006 (metaanálisis): 86/91. El test aislado más preciso para el LCA.',
    },
    utility: 'rule-in',
    interpretation:
      'Alta sensibilidad y especificidad: un positivo confirma con fuerza la rotura del LCA y un negativo la hace poco probable. Es el test de elección, mejor que el cajón anterior.',
    pearl:
      'Más fiable en agudo que el cajón anterior (menos espasmo/hemartros). La calidad del tope final importa tanto como la cantidad de traslación.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 25,
      note: 'A 20-30° de flexión se traslada la tibia hacia anterior (translación, que el modelo no reproduce).',
    },
    cite: [{ ref: 'benjaminse-2006', verified: true, locator: 'Lachman 86/91' }],
  },
  {
    id: 'anterior-drawer-knee',
    name: 'Cajón anterior',
    aka: ['Anterior drawer'],
    region: 'knee',
    category: 'Ligamento cruzado anterior',
    target: 'Ligamento cruzado anterior',
    purpose: 'Valorar la traslación anterior de la tibia a 90° de flexión.',
    maneuver:
      'Rodilla a 90° de flexión y pie fijo; el explorador traslada la tibia hacia anterior.',
    positive: 'Traslación anterior aumentada respecto al lado sano.',
    metrics: {
      sensitivity: 62,
      specificity: 88,
      note: 'Benjaminse 2006: 62/88 (más sensible en lesiones crónicas). Menos fiable en agudo que Lachman.',
    },
    utility: 'rule-in',
    interpretation:
      'Específico pero poco sensible en agudo (dolor/espasmo lo limitan): un positivo apoya la rotura; un negativo no la descarta. Rinde mejor en lesiones crónicas.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 90,
      note: 'A 90° de flexión se traslada la tibia hacia anterior (translación, que el modelo no reproduce).',
    },
    cite: [{ ref: 'benjaminse-2006', verified: true, locator: 'cajón anterior 62/88' }],
  },
  {
    id: 'pivot-shift',
    name: 'Pivot shift',
    aka: ['Pivot shift', 'Resalte rotatorio'],
    region: 'knee',
    category: 'Ligamento cruzado anterior',
    target: 'Ligamento cruzado anterior (inestabilidad rotatoria)',
    purpose: 'Detectar la inestabilidad rotatoria anterolateral del LCA.',
    maneuver:
      'Desde la extensión, el explorador aplica valgo y rotación interna mientras flexiona la rodilla, buscando la reducción brusca de la subluxación tibial hacia los 30-40°.',
    positive: 'Resalte (clunk) de reducción de la subluxación anterolateral al flexionar.',
    metrics: {
      sensitivity: 32,
      specificity: 98,
      note: 'Benjaminse 2006: 32/98. Muy específico, poco sensible en el paciente despierto (guarding).',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico (SpPin): un positivo confirma la insuficiencia del LCA. Muy poco sensible con el paciente despierto; su rendimiento sube bajo anestesia.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 30,
      note: 'El resalte se busca hacia los 30-40° de flexión; el modelo muestra esa flexión (el valgo y la rotación interna tibial no se reproducen).',
    },
    cite: [{ ref: 'benjaminse-2006', verified: true, locator: 'pivot shift 32/98' }],
  },

  // ==================== LIGAMENTO CRUZADO POSTERIOR (LCP) ====================
  {
    id: 'posterior-drawer-knee',
    name: 'Cajón posterior',
    aka: ['Posterior drawer'],
    region: 'knee',
    category: 'Ligamento cruzado posterior',
    target: 'Ligamento cruzado posterior',
    purpose: 'Detectar rotura del LCP por traslación posterior de la tibia.',
    maneuver:
      'Rodilla a 90° de flexión y pie fijo; el explorador traslada la tibia hacia posterior.',
    positive: 'Traslación posterior aumentada respecto al lado sano.',
    metrics: {
      sensitivity: 90,
      specificity: 99,
      note: 'Malanga 2003: 90/99. El test de elección para el LCP.',
    },
    utility: 'rule-in',
    interpretation:
      'Alta sensibilidad y especificidad: el mejor test para el LCP. Un positivo confirma y un negativo hace muy improbable la rotura.',
    pearl:
      'Confirma primero la posición de partida con el signo del cajón posterior en reposo (posterior sag): una tibia ya desplazada puede simular un falso cajón anterior.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 90,
      note: 'A 90° de flexión se traslada la tibia hacia posterior (translación, que el modelo no reproduce).',
    },
    cite: [{ ref: 'malanga-2003', verified: true, locator: 'cajón posterior 90/99' }],
  },
  {
    id: 'posterior-sag',
    name: 'Signo del cajón posterior en reposo (sag)',
    aka: ['Posterior sag', 'Godfrey'],
    region: 'knee',
    category: 'Ligamento cruzado posterior',
    target: 'Ligamento cruzado posterior',
    purpose: 'Ver la caída posterior espontánea de la tibia por insuficiencia del LCP.',
    maneuver:
      'Con caderas y rodillas a 90° (piernas sostenidas), se observa de perfil la posición de la tuberosidad tibial anterior.',
    positive: 'La tibia proximal cae hacia posterior respecto al lado sano.',
    metrics: {
      sensitivity: 79,
      specificity: 100,
      note: 'Malanga 2003: alta especificidad. Confirma la posición de partida antes del cajón.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico: un sag visible confirma insuficiencia del LCP y evita malinterpretar la traslación en el cajón. Explora siempre antes del cajón anterior/posterior.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 90,
      note: 'Con cadera y rodilla a 90° la tibia cae hacia posterior por su propio peso (translación no reproducida por el modelo).',
    },
    cite: [{ ref: 'malanga-2003', verified: false }],
  },

  // =============================== MENISCO ===============================
  {
    id: 'mcmurray',
    name: 'Test de McMurray',
    aka: ['McMurray'],
    region: 'knee',
    category: 'Menisco',
    target: 'Menisco medial / lateral',
    purpose: 'Provocar el atrapamiento del fragmento meniscal.',
    maneuver:
      'Desde la flexión máxima se extiende la rodilla combinando rotación externa (menisco medial) o interna (menisco lateral) con estrés en valgo/varo.',
    positive: 'Clic o chasquido doloroso reproducible sobre la interlínea durante la maniobra.',
    metrics: {
      sensitivity: 70,
      specificity: 71,
      note: 'Hegedus 2007 (metaanálisis): 70/71, muy variable. El CLIC doloroso es más específico que el dolor aislado.',
    },
    utility: 'balanced',
    interpretation:
      'Rendimiento moderado y variable: aporta más un clic doloroso reproducible que el dolor aislado. Interprétalo dentro de un clúster meniscal.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 90,
      note: 'Se parte de la flexión y se extiende rotando la tibia; el modelo muestra la posición flexionada de inicio (la rotación tibial y el valgo/varo no se reproducen).',
    },
    cite: [{ ref: 'hegedus-2007', verified: true, locator: 'McMurray 70/71' }],
  },
  {
    id: 'joint-line-tenderness',
    name: 'Dolor en la interlínea articular',
    aka: ['Joint line tenderness'],
    region: 'knee',
    category: 'Menisco',
    target: 'Menisco medial / lateral',
    purpose: 'Localizar dolor meniscal por palpación de la interlínea.',
    maneuver:
      'Con la rodilla a ~45-90° de flexión, el explorador palpa la interlínea articular medial y lateral.',
    positive: 'Dolor localizado en la interlínea sobre el menisco afecto.',
    metrics: {
      sensitivity: 83,
      specificity: 76,
      note: 'Hegedus 2007: ~83/76. Sensible pero inespecífico (comparte dolor con la artrosis y las colaterales).',
    },
    utility: 'balanced',
    interpretation:
      'Sensible y poco específico: un negativo hace menos probable la lesión meniscal; un positivo es inespecífico. Combínalo con McMurray/Thessaly.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 45,
      note: 'Se palpa la interlínea con la rodilla en flexión; el modelo solo muestra la flexión.',
    },
    cite: [{ ref: 'hegedus-2007', verified: false }],
  },
  {
    id: 'thessaly',
    name: 'Test de Thessaly (20°)',
    aka: ['Thessaly'],
    region: 'knee',
    category: 'Menisco',
    target: 'Menisco medial / lateral',
    purpose: 'Reproducir el atrapamiento meniscal en carga y rotación.',
    maneuver:
      'En apoyo monopodal con la rodilla a 20° de flexión, el paciente rota el cuerpo (y la rodilla) medial y lateralmente tres veces, sujeto por las manos del explorador.',
    positive: 'Dolor en la interlínea o sensación de bloqueo/enganche durante la rotación.',
    metrics: {
      sensitivity: 89,
      specificity: 97,
      note: 'Karachalios 2005 (original, menisco medial): 89/97; estudios posteriores en la práctica NO lo reprodujeron (sens ~62-66, esp ~39-55).',
    },
    utility: 'balanced',
    interpretation:
      'Las cifras originales fueron muy altas pero no se han reproducido en atención primaria: interprétalo con cautela dentro de un clúster, no como prueba única.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 20,
      note: 'La prueba se hace a 20° de flexión en apoyo monopodal; el modelo muestra esa flexión (la carga y la rotación del cuerpo sobre la rodilla no se reproducen).',
    },
    cite: [{ ref: 'karachalios-2005', verified: true, locator: 'medial 89/97 (original)' }],
  },
  {
    id: 'apley-compression',
    name: 'Compresión de Apley',
    aka: ['Apley grind'],
    region: 'knee',
    category: 'Menisco',
    target: 'Menisco medial / lateral',
    purpose: 'Diferenciar dolor meniscal de dolor ligamentario por compresión frente a distracción.',
    maneuver:
      'En prono con la rodilla a 90°, el explorador comprime axialmente y rota la tibia (dolor meniscal); la distracción con rotación estresa las estructuras ligamentarias.',
    positive: 'Dolor con la compresión-rotación que NO aparece (o es menor) con la distracción.',
    metrics: {
      sensitivity: 60,
      specificity: 70,
      note: 'Datos limitados y de baja calidad; valores orientativos. Úsalo dentro de un clúster.',
    },
    utility: 'weak',
    interpretation:
      'Precisión baja aislado: aporta sobre todo para diferenciar el origen meniscal (compresión dolorosa) del ligamentario (distracción dolorosa).',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 90,
      note: 'En prono a 90° de flexión se comprime y rota la tibia; el modelo muestra la flexión (la compresión axial y la rotación no se reproducen).',
    },
    cite: [{ ref: 'malanga-2003', verified: false }],
  },

  // ======================== LIGAMENTOS COLATERALES ========================
  {
    id: 'valgus-stress-knee',
    name: 'Estrés en valgo',
    aka: ['Valgus stress'],
    region: 'knee',
    category: 'Ligamentos colaterales',
    target: 'Ligamento colateral medial (LCM)',
    purpose: 'Valorar la integridad del ligamento colateral medial.',
    maneuver:
      'Se aplica una fuerza en valgo a la rodilla a 0° y a 30° de flexión, comparando la apertura con el lado sano.',
    positive: 'Apertura medial aumentada y/o dolor; la apertura a 0° sugiere lesión más grave (cápsula/cruzados).',
    metrics: {
      sensitivity: 86,
      specificity: 68,
      note: 'Datos limitados; la apertura a 0° implica lesión combinada. Valores orientativos.',
    },
    utility: 'balanced',
    interpretation:
      'Sensible para el LCM a 30°. Una apertura clara a 0° de extensión orienta a lesión combinada (cápsula posteromedial o cruzados) y obliga a valorarlos.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 30,
      note: 'Se aplica fuerza en valgo a 0° y a 30° de flexión; el modelo muestra la flexión de prueba.',
    },
    cite: [{ ref: 'malanga-2003', verified: false }],
  },
  {
    id: 'varus-stress-knee',
    name: 'Estrés en varo',
    aka: ['Varus stress'],
    region: 'knee',
    category: 'Ligamentos colaterales',
    target: 'Ligamento colateral lateral (LCL)',
    purpose: 'Valorar la integridad del ligamento colateral lateral.',
    maneuver:
      'Se aplica una fuerza en varo a la rodilla a 0° y a 30° de flexión, comparando la apertura con el lado sano.',
    positive: 'Apertura lateral aumentada y/o dolor; la apertura a 0° sugiere lesión más grave (esquina posterolateral).',
    metrics: {
      sensitivity: 25,
      specificity: 90,
      note: 'Datos escasos; el LCL se lesiona con menos frecuencia. Valores orientativos.',
    },
    utility: 'balanced',
    interpretation:
      'Una apertura lateral a 0° orienta a lesión de la esquina posterolateral y obliga a descartar afectación asociada del LCP.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 30,
      note: 'Se aplica fuerza en varo a 0° y a 30° de flexión; el modelo muestra la flexión de prueba.',
    },
    cite: [{ ref: 'malanga-2003', verified: false }],
  },
];

export const KNEE_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
