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
// Sources (see references.ts): Saroja 2014 (Cozen/Maudsley/Mill), O'Driscoll 2005
// (moving valgus), Novak 1994 (Tinel + flexión-compresión del cubital), Zwerus
// 2018 (revisión de la evidencia de la exploración del codo).
//
// ESTADO DE LA VERIFICACION (2026-11-04). Abiertos los tres resumenes
// primarios, cuatro cifras no estaban en su fuente y una prueba se estaba
// quedando sin datos que si existen:
//
//   cozen      79% / 80%  ->  84% / 0%   la fuente dice otra cosa, en AMBAS
//   maudsley   sin cifras ->  88% / 0%   el estudio si las publica
//   tinel      70% / 98%  ->  70% / --   el 98% no esta en Novak 1994
//   flex+compr 91% / 97%  ->  91% / --   el 97% tampoco
//
// Las especificidades del 0% de Saroja no son un error de lectura: en esa serie
// de 30 sujetos, TODOS los que tenian ecografia negativa dieron positivo en las
// dos pruebas resistidas. Con 30 sujetos los negativos son pocos, asi que el 0%
// y el 100% de Mill son extremos de muestra pequena; se muestran con esa
// advertencia en la nota, porque lo que sostienen es la DIRECCION (Cozen y
// Maudsley descartan, Mill confirma) y no el valor exacto.
//
// Y de Novak 1994, el dato que hay que ensenar no es un numero suelto: la
// flexion del codo SOLA tiene sensibilidad 0,32, la compresion sola 0,55, y las
// dos juntas 0,91. La maniobra funciona cuando se anade la compresion.
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
      sensitivity: 84,
      specificity: 0,
      note: 'Las dos cifras del único estudio que las mide (Saroja 2014, 30 sujetos, ecografía como patrón de referencia). La especificidad es 0%: en esa serie TODOS los sujetos con ecografía negativa dieron Cozen positivo. Con 30 sujetos los negativos son pocos, así que el 0% es un extremo de muestra pequeña y no una constante; lo que sí sostiene es que esta prueba no confirma nada.',
    },
    utility: 'rule-out',
    interpretation:
      'Sirve para DESCARTAR, no para confirmar: con 84% de sensibilidad un Cozen negativo hace poco probable la epicondilalgia, y un positivo aislado no dice nada. Para confirmar, Mill.',
    demo: {
      movementId: 'elbow-extension',
      angleDeg: 10,
      // The demo drives the ELBOW, but what the test loads is the extensor
      // origin, so that is what the model lights up. Without this the elbow
      // tests posed the arm and glowed nothing, and the only muscles on screen
      // were whatever the free movement had left active -- the pronator group,
      // i.e. the medial mass, in a test about the LATERAL epicondyle.
      highlightMuscleId: 'common-extensor-origin',
      // LA MUNECA SI SE PUEDE MOVER, y es lo que separa a Cozen de Maudsley:
      // los dos ponian el codo a 10 grados y nada mas, asi que en pantalla eran
      // el mismo clip. Cozen resiste la EXTENSION DE MUNECA con el puno cerrado;
      // Maudsley resiste la del tercer dedo, que el rig no tiene.
      components: [{ movementId: 'wrist-extension', angleDeg: 40 }],
      examinerForce: 'resists',
      note: 'Con el codo en extensión y antebrazo pronado se resiste la extensión de la muñeca con el puño cerrado.',
    },
    cite: [
      { ref: 'saroja-2014', verified: true, locator: 'Cozen: sensibilidad 84%, especificidad 0%' },
    ],
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
      note: 'Las dos cifras del mismo estudio (Saroja 2014, 30 sujetos, ecografía como patrón de referencia) y la única de las tres pruebas con área bajo la curva ROC significativa (0,769). Especificidad 100% sobre 30 sujetos: el intervalo de confianza real es ancho, pero es la única de la serie que sirve para CONFIRMAR.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico (SpPin): un positivo confirma la epicondilalgia lateral; un negativo no la descarta. Complementa a Cozen (más sensible).',
    // LA MANIOBRA EXTIENDE EL CODO; la pronacion y la flexion de muneca se
    // SOSTIENEN. Estaba al revés: el demo barria la pronacion de 0 a 80 grados
    // --el antebrazo girando-- mientras el codo se quedaba quieto, que es la
    // pelicula contraria a la prueba. Ahora barre la extension del codo con la
    // muneca flexionada y el antebrazo pronado, que es el estiramiento que
    // provoca el dolor en el epicondilo.
    demo: {
      movementId: 'elbow-extension',
      angleDeg: 10,
      highlightMuscleId: 'common-extensor-origin',
      // Mill es un estiramiento PASIVO: la muneca va a flexion y el explorador
      // no resiste nada. Eso es justo lo contrario del test de epitroclea, que
      // compartia con el esta misma pose de pronacion.
      components: [
        { movementId: 'elbow-pronation', angleDeg: 80 },
        { movementId: 'wrist-flexion', angleDeg: 60 },
      ],
      note: 'Con antebrazo pronado y muñeca flexionada se extiende pasivamente el codo: es un estiramiento, no una resistencia. El modelo resalta el origen extensor, que es lo que se estira.',
    },

    cite: [
      {
        ref: 'saroja-2014',
        verified: true,
        locator: 'Mill: sensibilidad 53%, especificidad 100%, ROC 0,769',
      },
    ],
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
      sensitivity: 88,
      specificity: 0,
      note: 'La MÁS sensible de las tres pruebas resistidas en Saroja 2014 (30 sujetos, ecografía como patrón de referencia), y con la misma especificidad del 0% que el Cozen: todos los sujetos con ecografía negativa dieron positivo. Muestra pequeña, así que el 0% es un extremo y no una constante; el mensaje que aguanta es que provoca dolor también sin lesión ecográfica.',
    },
    utility: 'rule-out',
    interpretation:
      'Su valor está en el negativo: con 88% de sensibilidad, un Maudsley negativo hace poco probable la epicondilalgia lateral. El positivo aislado no confirma.',
    demo: {
      movementId: 'elbow-extension',
      angleDeg: 10,
      highlightMuscleId: 'common-extensor-origin',
      examinerForce: 'resists',
      note: 'Con el codo en extensión se resiste la extensión del tercer dedo. El rig no tiene dedos, así que comparte posición con Cozen salvo por la muñeca: lo que cambia es DÓNDE resiste el explorador.',
    },
    cite: [
      {
        ref: 'saroja-2014',
        verified: true,
        locator: 'Maudsley: sensibilidad 88%, especificidad 0%',
      },
      { ref: 'zwerus-2018', verified: false, locator: 'Evidencia escasa para los tests de codo' },
    ],
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
      components: [{ movementId: 'wrist-flexion', angleDeg: 35 }],
      examinerForce: 'resists',
      note: 'Con el codo extendido se RESISTE la flexión de muñeca y la pronación; el modelo resalta el origen flexor-pronador de la epitróclea.',
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
      note: 'Sensibilidad 100% (17 de 17) y especificidad 75% (3 de 4) frente a exploración quirúrgica o artroscópica (O’Driscoll 2005, 21 pacientes operados). Los denominadores son el dato: la especificidad sale de CUATRO pacientes, así que un caso distinto la movería 25 puntos. Lo más reproducible del estudio no es la cifra, es el arco: dolor entre 120° y 70°, máximo a 90°.',
    },
    utility: 'rule-out',
    interpretation:
      'Muy sensible (SnNout): un negativo hace poco probable la lesión del LCU. La especificidad es menor y la serie original es pequeña: confirma con imagen si procede.',
    demo: {
      highlightStructureIds: ['elbow-ucl'],
      movementId: 'elbow-flexion',
      angleDeg: 90,
      examinerForce: 'applies',
      note: 'Se aplica un valgo constante mientras se flexiona-extiende el codo por el arco 70-120°; el modelo muestra la flexión con la mano del explorador aplicando el valgo.',
    },
    cite: [
      {
        ref: 'odriscoll-2005',
        verified: true,
        locator: 'Sensibilidad 100% (17/17), especificidad 75% (3/4), en el resumen',
      },
    ],
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
      examinerForce: 'applies',
      highlightStructureIds: ['elbow-ucl'],
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
      note: 'Sensibilidad 0,70 a los 30 segundos (Novak 1994, 44 extremidades con túnel cubital confirmado por electrodiagnóstico frente a 33 controles). SIN cifra de especificidad: ese estudio no la publica para ninguna de sus cuatro maniobras; de los controles dice sólo que "rara vez" dieron positivo. El 98% que suele citarse no está en la fuente.',
    },
    utility: 'balanced',
    utilityBasis:
      'Falta una de las dos cifras: Novak 1994 publica 0,70 de sensibilidad y ninguna especificidad, para ninguna de sus cuatro maniobras (el 98% que suele citarse no está en esa fuente). La etiqueta no puede apoyarse en un perfil de dos ejes que no existe; interprétalo con la clínica y el electrodiagnóstico.',
    interpretation:
      'Un Tinel positivo apoya la neuropatía cubital, pero con la cautela de que su especificidad no está medida: también aparece en personas sanas. Interprétalo con la clínica y el electrodiagnóstico.',
    demo: {
      cannotShow:
        'El nervio cubital sí está en el rig, pero su material lo deja en una capa que el laboratorio no muestra. Lo que se posa es el codo donde se percute, entre epitróclea y olécranon.',
      movementId: 'elbow-flexion',
      angleDeg: 90,
      note: 'Se percute el nervio en el canal epitrócleo-olecraniano con el codo en flexión. Comparte posición con el valgo dinámico: lo que cambia es que aquí el explorador percute y no aplica fuerza.',
    },
    cite: [
      {
        ref: 'novak-1994',
        verified: true,
        locator: 'Sensibilidad del Tinel 0,70 a los 30 s (sin especificidad publicada)',
      },
    ],
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
      note: 'Las tres sensibilidades del mismo estudio, a los 30 segundos: flexión SOLA 0,32, compresión sola 0,55, las dos juntas 0,91 (Novak 1994). Ahí está el mensaje clínico: la maniobra funciona cuando se añade la compresión del nervio. SIN cifra de especificidad: el estudio no la publica.',
    },
    utility: 'rule-out',
    interpretation:
      'La versión combinada (flexión + compresión) es sensible: un negativo hace menos probable la neuropatía cubital. La flexión aislada, poco sensible, no descarta.',
    demo: {
      cannotShow:
        'Mismo límite: el nervio cubital no está en una capa que el laboratorio pueda mostrar. Lo que se demuestra es la posición que cierra el túnel.',
      movementId: 'elbow-flexion',
      angleDeg: 120,
      note: 'Codo en flexión máxima con compresión del nervio, sostenido; el modelo muestra la flexión.',
    },
    cite: [
      {
        ref: 'novak-1994',
        verified: true,
        locator: 'Flexión + compresión: sensibilidad 0,91 (sin especificidad publicada)',
      },
    ],
  },
];

export const ELBOW_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
