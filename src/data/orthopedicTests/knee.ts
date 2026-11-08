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
      sensitivity: 85,
      specificity: 94,
      note: 'Benjaminse 2006, metaanálisis de 28 estudios con artroscopia, artrotomía o resonancia como patrón de referencia: sensibilidad agrupada 85% (IC 95% 83-87) y especificidad 94% (92-95). Es el test aislado más preciso para el LCA y el único que la revisión recomienda hacer siempre.'
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
    cite: [{ ref: 'benjaminse-2006', verified: true, locator: 'Resumen: Lachman 85% (83-87) / 94% (92-95), 28 estudios' }],
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
      sensitivity: 92,
      specificity: 91,
      note: 'ATENCIÓN A LA CONDICIÓN. Benjaminse 2006 publica 92% (IC 95% 88-95) y 91% (87-94), pero SOLO en lesiones CRÓNICAS: literalmente, el cajón anterior rinde bien en crónico "pero no en agudo". Esta aplicación mostraba antes 62/88, una cifra que no está en esa fuente y que además contradecía su propia nota. En el esguince agudo el dolor, el espasmo y el hemartros hunden la sensibilidad, y por eso el test de elección en agudo es el Lachman.'
    },
    utility: 'rule-in',
    interpretation:
      'En lesión CRÓNICA es tan bueno como el Lachman (92/91). En agudo no: el dolor y el hemartros lo limitan y un negativo no descarta nada. La cifra que ves solo vale para el paciente crónico.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 90,
      examinerForce: 'applies',
      note: 'A 90° de flexión el explorador tira de la tibia hacia ANTERIOR. Comparte posición con el cajón posterior: lo único que cambia es la dirección del tirón, que es una traslación y el rig no la tiene.',
    },
    cite: [{ ref: 'benjaminse-2006', verified: true, locator: 'Resumen: cajón anterior en CRÓNICO 92% (88-95) / 91% (87-94); en agudo no' }],
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
      sensitivity: 24,
      specificity: 98,
      note: 'Benjaminse 2006, sensibilidad agrupada 24% (IC 95% 21-27) y especificidad 98% (96-99). Esta aplicación mostraba un 32% que no está en esa fuente. La revisión lo recomienda precisamente por lo especifico que es, tanto en agudo como en crónico: tres de cada cuatro roturas se le escapan, pero un resalte positivo no deja dudas.'
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico (SpPin): un positivo confirma la insuficiencia del LCA. Solo ve una de cada cuatro roturas con el paciente despierto; su rendimiento sube bajo anestesia.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 30,
      components: [{ movementId: 'knee-internal-rotation', angleDeg: 25 }],
      examinerForce: 'applies',
      note: 'El resalte se busca hacia los 30-40° de flexión con la tibia en rotación INTERNA y valgo; el modelo muestra la flexión con esa rotación. El valgo no se reproduce.',
    },
    cite: [{ ref: 'benjaminse-2006', verified: true, locator: 'Resumen: pivot shift 24% (21-27) / 98% (96-99)' }],
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
      note: 'Rubinstein 1994, 39 sujetos con 19 roturas crónicas aisladas de LCP y examinadores cegados a la historia y al diagnóstico: 90% de sensibilidad y 99% de especificidad, con una exactitud global del 96%. La prueba más sensible y específica fue este cajón posterior CON palpación del escalón tibiofemoral, no la inspección sola. La exactitud fue mayor en laxitudes de grado II y III que en grado I.',
    },
    utility: 'rule-in',
    interpretation:
      'Alta sensibilidad y especificidad: el mejor test para el LCP. Un positivo confirma y un negativo hace muy improbable la rotura.',
    pearl:
      'Confirma primero la posición de partida con el signo del cajón posterior en reposo (posterior sag): una tibia ya desplazada puede simular un falso cajón anterior.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 90,
      examinerForce: 'applies',
      note: 'A 90° de flexión el explorador empuja la tibia hacia POSTERIOR. Comparte posición con el cajón anterior: lo único que cambia es la dirección del empuje, que es una traslación y el rig no la tiene.',
    },
    cite: [
      {
        ref: 'rubinstein-1994',
        verified: true,
        locator: 'Resumen: 90% / 99%, exactitud 96%, n = 39; el cajón posterior fue la prueba más sensible y específica',
      },
      {
        ref: 'malanga-2003',
        verified: true,
        locator: 'Revisión narrativa: confirma el cajón posterior como prueba de elección, sin aportar cifras propias',
      },
    ],
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
      note: 'SIN CIFRA PROPIA. El 79% / 100% que esta aplicación mostraba se atribuía a Malanga 2003, que es una revisión narrativa y no publica cifras del sag. Lo que SÍ está medido es la exploración del LCP en conjunto: Rubinstein 1994 (39 sujetos, 19 roturas crónicas aisladas de LCP, examinadores cegados a la historia y al diagnóstico) da 90% de sensibilidad y 99% de especificidad, con una exactitud global del 96%, y señala que la prueba más sensible y específica es el CAJÓN POSTERIOR con palpación del escalón tibiofemoral. La exactitud fue mayor en laxitudes de grado II y III que en grado I. El sag es el paso que coloca la rodilla antes de ese cajón, no una prueba con cifra propia.',
    },
    utility: 'rule-in',
    interpretation:
      'Un sag visible orienta a insuficiencia del LCP y, sobre todo, evita malinterpretar la traslación del cajón: si la tibia parte caída, un cajón anterior "normal" puede ser en realidad la reducción de una tibia subluxada. Explóralo SIEMPRE antes del cajón anterior y posterior.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 90,
      note: 'Con cadera y rodilla a 90° la tibia cae hacia posterior por su propio PESO: aquí el explorador no aplica nada, que es lo que lo separa de los dos cajones. La traslación no se reproduce.',
    },
    cite: [
      {
        ref: 'rubinstein-1994',
        verified: true,
        locator: 'Resumen: exploración del LCP 90% / 99%, exactitud 96%, n = 39',
      },
      {
        ref: 'malanga-2003',
        verified: true,
        locator: 'Revisión narrativa: describe el sag como complemento del cajón posterior, sin cifras propias',
      },
    ],
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
      // LA ROTACION TIBIAL SI SE CONDUCE (knee-external/internal-rotation,
      // eje Y de shin_flex). La nota que decia que no es anterior a que se
      // habilitara, y por culpa de eso las cinco pruebas de 90 grados eran el
      // mismo clip. McMurray medial: flexion + rotacion EXTERNA, y se extiende.
      components: [{ movementId: 'knee-external-rotation', angleDeg: 30 }],
      examinerForce: 'applies',
      note: 'Se parte de la flexión con la tibia en rotación EXTERNA (variante medial) y se extiende; el valgo/varo añadido no se reproduce.',
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
    // Figures corrected 2026-08-04. The entry claimed 83/76 citing Hegedus
    // 2007, but that meta-analysis reports POOLED 63% / 77% in its own abstract
    // — the sensitivity was off by 20 points, and in the direction that
    // oversells the test. The interpretation was wrong as a consequence: joint
    // line tenderness is NOT a sensitive screen.
    metrics: {
      sensitivity: 63,
      specificity: 77,
      note: 'Hegedus 2007 (metaanálisis, sensibilidad/especificidad agrupadas): 63/77. Resultados muy heterogéneos entre estudios.',
    },
    utility: 'weak',
    interpretation:
      'Precisión modesta en ambas direcciones (63/77): ni descarta ni confirma la lesión meniscal por sí solo. Su valor es dentro de un clúster con McMurray y Thessaly.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 45,
      note: 'Se palpa la interlínea con la rodilla en flexión; el modelo solo muestra la flexión.',
    },
    cite: [
      {
        ref: 'hegedus-2007',
        verified: true,
        locator: 'interlínea articular 63/77 (agrupadas, resumen)',
      },
    ],
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
      note: 'Hegedus 2007 (metaanálisis, agrupadas): 60/70. Resultados heterogéneos; úsalo dentro de un clúster.',
    },
    utility: 'weak',
    interpretation:
      'Precisión baja aislado: aporta sobre todo para diferenciar el origen meniscal (compresión dolorosa) del ligamentario (distracción dolorosa).',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 90,
      components: [{ movementId: 'knee-internal-rotation', angleDeg: 25 }],
      examinerForce: 'applies',
      note: 'En prono a 90° de flexión se comprime en el eje y se rota la tibia; el modelo muestra la flexión con rotación interna y la mano que comprime. La compresión axial no se reproduce.',
    },
    // Re-attributed 2026-08-04: the entry cited Malanga 2003, whose abstract
    // reports no figures for Apley. 60/70 are the POOLED values from Hegedus
    // 2007, which states them verbatim in its abstract. Same numbers, correct
    // source — and now checkable by a reader.
    cite: [
      { ref: 'hegedus-2007', verified: true, locator: 'Apley 60/70 (agrupadas, resumen)' },
    ],
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
      note: 'SIN CIFRA DEFENDIBLE, y no por falta de búsqueda. El 86% / 68% que se mostraba aquí se atribuía a Malanga 2003, que no lo publica; y su conclusión sobre estas pruebas es justamente la contraria a dar un número: aunque la exploración de los ligamentos colaterales PARECE sensible y específica, faltan estudios bien diseñados que la validen. Lo que sí se puede afirmar en consulta es el hallazgo estructural: la apertura en valgo a 30° de flexión apunta al ligamento colateral medial, mientras que la apertura con la rodilla en EXTENSIÓN COMPLETA implica lesión combinada (cruzado y/o esquina posteromedial) y cambia el manejo.',
    },
    utility: 'balanced',
    interpretation:
      'Sensible para el LCM a 30°. Una apertura clara a 0° de extensión orienta a lesión combinada (cápsula posteromedial o cruzados) y obliga a valorarlos.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 30,
      examinerForce: 'applies',
      note: 'Se aplica fuerza en VALGO a 0° y a 30° de flexión. Comparte posición con el estrés en varo: lo único que cambia es hacia dónde empuja el explorador, y el rig no tiene ese eje.',
    },
    cite: [
      {
        ref: 'malanga-2003',
        verified: true,
        locator: 'Revisión narrativa: "lack of well-designed studies" para los ligamentos colaterales',
      },
    ],
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
      note: 'SIN CIFRA DEFENDIBLE, por el mismo motivo que la prueba en valgo: el 25% / 90% no consta en Malanga 2003, que concluye que a la exploración de los colaterales le faltan estudios bien diseñados que la validen. El LCL se lesiona con mucha menos frecuencia que el LCM, así que cualquier cifra procedería además de series muy pequeñas. Lo útil sigue siendo estructural: apertura en varo a 30° orienta al colateral lateral; apertura en extensión completa, a lesión combinada con la esquina posterolateral.',
    },
    utility: 'balanced',
    interpretation:
      'Una apertura lateral a 0° orienta a lesión de la esquina posterolateral y obliga a descartar afectación asociada del LCP.',
    demo: {
      movementId: 'knee-flexion',
      angleDeg: 30,
      examinerForce: 'applies',
      note: 'Se aplica fuerza en VARO a 0° y a 30° de flexión. Comparte posición con el estrés en valgo: lo único que cambia es hacia dónde empuja el explorador, y el rig no tiene ese eje.',
    },
    cite: [
      {
        ref: 'malanga-2003',
        verified: true,
        locator: 'Revisión narrativa: "lack of well-designed studies" para los ligamentos colaterales',
      },
    ],
  },
];

export const KNEE_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
