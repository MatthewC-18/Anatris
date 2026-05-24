// src/data/shoulderMuscles.ts
//
// Clinical/educational content for the shoulder muscles.
//
// AUTHORING RULES (read before adding muscles):
//   1. Anatomy (origin/insertion/innervation/actions) is standard and stable
//      across authoritative texts — safe to author directly.
//   2. NEVER invent a page number. If you haven't confirmed it in the actual
//      edition, set `pageVerified: false` and leave `page` empty or as a hint.
//      Verified pages flip to `pageVerified: true` once checked.
//   3. Biomechanics statements should cite Kapandji/Oatis; descriptive facts
//      can cite Dufour/descriptive.
//   4. Keep `text` in Latin American Spanish, user-facing and concise.
//
// Status of all four rotator-cuff muscles below: anatomy authored & considered
// reliable; ALL page locators are UNVERIFIED (pageVerified: false) pending
// your copies.

import type { MuscleContent, MuscleContentIndex } from '../types/muscleContent';

const supraspinatus: MuscleContent = {
  id: 'supraspinatus',
  nameEs: 'Supraespinoso',
  nameLat: 'Musculus supraspinatus',
  aliases: ['Supraespinoso', 'Supraspinatus'],
  group: 'Manguito rotador',

  origin: {
    text: 'Fosa supraespinosa de la escápula (dos tercios mediales) y fascia supraespinosa que lo recubre.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Faceta superior del troquíter (tubérculo mayor del húmero); algunas fibras se mezclan con la cápsula articular glenohumeral.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio supraescapular.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C5-C6 (tronco superior del plexo braquial).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Estabilización dinámica de la cabeza humeral: la comprime y la centra contra la glenoides durante toda la elevación. Es su rol funcional principal.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'primary',
      text: 'Inicia la abducción del hombro en los primeros grados, antes de que el deltoides alcance una palanca eficiente.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Colabora ligeramente en la rotación externa del hombro.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Hombro en abducción (especialmente los primeros 30°), con la cabeza humeral centrada.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Hombro en aducción, llevando el brazo hacia la línea media y por delante del cuerpo; esta es la posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Forma, junto con el deltoides, un par de fuerzas (couple) que permite la abducción: el supraespinoso fija y centra la cabeza humeral mientras el deltoides genera la elevación.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      text: 'Su componente compresivo predomina sobre el elevador, por lo que es clave en la estabilidad del hombro más que en la potencia del movimiento.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  palpation: {
    howTo: {
      text: 'Cubierto por el trapecio, es difícil de aislar. Su tendón se aborda por debajo del borde anterolateral del acromion, en la cara anterior del hombro.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Con el hombro en extensión y rotación interna (mano en la espalda baja) el tendón rota hacia delante y se hace más accesible bajo el acromion.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Deltoides (porción media) en la abducción; resto del manguito rotador en la estabilización.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Aductores del hombro: dorsal ancho, redondo mayor y porción esternocostal del pectoral mayor.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Tendinopatía del supraespinoso: es el tendón del manguito que se lesiona con mayor frecuencia, por su paso bajo el arco coracoacromial.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'Síndrome de pinzamiento subacromial (impingement): compresión del tendón en el espacio subacromial durante la elevación.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'Rotura del manguito rotador: el supraespinoso es el sitio más común de desgarro, parcial o completo.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Prueba de Jobe (lata vacía): valora dolor o debilidad del supraespinoso resistiendo la elevación en el plano escapular con rotación interna.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const infraspinatus: MuscleContent = {
  id: 'infraspinatus',
  nameEs: 'Infraespinoso',
  nameLat: 'Musculus infraspinatus',
  aliases: ['Infraespinoso', 'Infraspinatus'],
  group: 'Manguito rotador',

  origin: {
    text: 'Fosa infraespinosa de la escápula (dos tercios mediales) y fascia infraespinosa que lo recubre.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Faceta media del troquíter (tubérculo mayor del húmero); su tendón se funde con la cápsula articular glenohumeral posterior.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio supraescapular (mismo nervio que el supraespinoso, tras rodear la escotadura espinoglenoidea).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C5-C6 (tronco superior del plexo braquial).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Rotador externo principal del hombro junto con el redondo menor; aporta la mayor parte del torque de rotación externa.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'primary',
      text: 'Estabilizador dinámico de la cabeza humeral: como parte del manguito, la centra y la sujeta contra la glenoides, controlando especialmente su desplazamiento anterior.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Sus fibras inferiores colaboran en la aducción del hombro.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Hombro en rotación externa; el músculo se acorta al llevar el antebrazo hacia afuera con el codo pegado al cuerpo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Hombro en rotación interna y aducción (mano cruzando hacia el hombro opuesto); esta es la posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Forma, con el subescapular por delante, un par de fuerzas transversal que mantiene centrada la cabeza humeral durante la elevación.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      text: 'Como rotador externo, contrarresta la tendencia del húmero a rotar internamente durante la elevación, evitando el pinzamiento del troquíter contra el acromion.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  palpation: {
    howTo: {
      text: 'Es el más accesible del manguito: se palpa en la fosa infraespinosa, por debajo de la espina de la escápula, donde su vientre es superficial.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Pidiendo una rotación externa resistida del hombro se siente su contracción bajo los dedos en la fosa infraespinosa.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Redondo menor en la rotación externa; deltoides posterior como rotador externo accesorio; resto del manguito en la estabilización.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Rotadores internos del hombro: subescapular, dorsal ancho, redondo mayor y pectoral mayor.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Tendinopatía y desgarros del infraespinoso: segundo tendón del manguito más afectado tras el supraespinoso, a menudo en continuidad con él.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'Atrofia de la fosa infraespinosa por atrapamiento del nervio supraescapular en la escotadura espinoglenoidea (quistes labrales, sobreuso en deportes de lanzamiento).',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Prueba de rotación externa resistida (codo a 90° pegado al cuerpo): dolor o debilidad orientan a compromiso del infraespinoso.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const teresMinor: MuscleContent = {
  id: 'teres_minor',
  nameEs: 'Redondo menor',
  nameLat: 'Musculus teres minor',
  aliases: ['Redondo menor', 'Teres minor'],
  group: 'Manguito rotador',

  origin: {
    text: 'Borde lateral de la escápula (dos tercios superiores), en su cara posterior.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Faceta inferior del troquíter (tubérculo mayor del húmero); su tendón se mezcla con la cápsula articular glenohumeral posteroinferior.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio axilar (rama del fascículo posterior del plexo braquial).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C5-C6.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Rotador externo del hombro junto con el infraespinoso.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'primary',
      text: 'Estabilizador dinámico: como parte del manguito, ayuda a centrar la cabeza humeral y a deprimirla durante la elevación.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Colabora en la aducción del hombro.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Hombro en rotación externa y ligera aducción.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Hombro en rotación interna; posición de estiramiento del músculo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Junto con el infraespinoso, su componente de rotación externa reorienta el troquíter durante la elevación y previene el pinzamiento subacromial.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      text: 'Su orientación oblicua le da un componente depresor de la cabeza humeral, oponiéndose al ascenso que tiende a generar el deltoides.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa por debajo del borde posterior del deltoides, sobre el borde lateral de la escápula, justo por debajo del infraespinoso.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una rotación externa resistida del hombro hace contraer la zona; cuesta separarlo del infraespinoso por su proximidad.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Infraespinoso en la rotación externa; deltoides posterior como accesorio; resto del manguito en la estabilización.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Rotadores internos del hombro: subescapular, dorsal ancho, redondo mayor y pectoral mayor.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Suele lesionarse con menor frecuencia que el resto del manguito; puede comprometerse en desgarros posteriores extensos.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'Afectación en el síndrome del espacio cuadrilátero por compromiso del nervio axilar (que también inerva el deltoides).',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Signo de Hornblower (del trompetista): incapacidad de mantener la rotación externa con el brazo en abducción orienta a lesión del redondo menor.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const subscapularis: MuscleContent = {
  id: 'subscapularis',
  nameEs: 'Subescapular',
  nameLat: 'Musculus subscapularis',
  aliases: ['Subescapular', 'Subscapularis'],
  group: 'Manguito rotador',

  origin: {
    text: 'Fosa subescapular, en la cara anterior (costal) de la escápula.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Troquín (tubérculo menor del húmero); es el único músculo del manguito que se inserta en el tubérculo menor, por delante de la articulación.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervios subescapulares superior e inferior (ramas del fascículo posterior del plexo braquial).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C5-C6 (a veces con contribución de C7).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Rotador interno principal del hombro; es el rotador interno más potente del manguito.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'primary',
      text: 'Estabilizador dinámico anterior: como única porción anterior del manguito, frena el desplazamiento anterior de la cabeza humeral y contiene la articulación por delante.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Colabora en la aducción del hombro; sus fibras superiores e inferiores participan según el grado de elevación.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Hombro en rotación interna (mano hacia el abdomen o la espalda).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Hombro en rotación externa, especialmente con abducción; posición de estiramiento del subescapular.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Forma, con infraespinoso y redondo menor por detrás, el par de fuerzas transversal que centra la cabeza humeral: el subescapular tira por delante y los rotadores externos por detrás.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      text: 'Es el principal estabilizador anterior pasivo-activo del hombro; su insuficiencia favorece la inestabilidad y la luxación anterior.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  palpation: {
    howTo: {
      text: 'Difícil de palpar por su situación profunda en la cara anterior de la escápula. Su porción accesible se aborda en la pared posterior de la axila, por delante del borde lateral de la escápula.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Con el brazo en ligera abducción para abrir la axila, se busca el músculo profundo contra la cara costal de la escápula; gran parte de su vientre no es accesible.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Otros rotadores internos: dorsal ancho, redondo mayor y pectoral mayor; resto del manguito en la estabilización.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Rotadores externos del hombro: infraespinoso y redondo menor.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Roturas del subescapular: menos frecuentes que las del supraespinoso, pero su lesión compromete la estabilidad anterior y suele asociarse a luxación del tendón de la porción larga del bíceps.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'Su insuficiencia contribuye a la inestabilidad anterior del hombro y a la luxación anterior recidivante.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Prueba de Gerber (lift-off): se separa la mano de la espalda baja contra resistencia; dolor o incapacidad orientan a lesión del subescapular.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'Prueba de belly-press (presión abdominal): alternativa útil cuando la rotación interna está limitada y no permite la posición de lift-off.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

/**
 * The shoulder muscle content index. Add muscles here as they are authored.
 * Currently published: the four rotator-cuff muscles.
 */
export const SHOULDER_MUSCLES: MuscleContentIndex = {
  supraspinatus,
  infraspinatus,
  teres_minor: teresMinor,
  subscapularis,
};
