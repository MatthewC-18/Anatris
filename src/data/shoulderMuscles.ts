// src/data/shoulderMuscles.ts
//
// Clinical/educational content for the shoulder muscles (full set, 17 muscles).
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
//   5. `id` is kebab-case, aligned with src/data/muscles/shoulder.ts (the 3D /
//      ROM / store source of truth). resolveMuscleId matches meshes by an
//      accent/underscore-collapsed slug, so the kebab id and the snake mesh
//      name still resolve to each other.
//
// Status: anatomy authored & considered reliable; ALL page locators are
// UNVERIFIED (pageVerified: false) pending your physical copies of
// Kapandji / Oatis / Dufour.

import type { MuscleContent, MuscleContentIndex } from '../types/muscleContent';

/* ===========================================================================
 * ROTATOR CUFF
 * ======================================================================== */

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
  id: 'teres-minor',
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

/* ===========================================================================
 * SUPERFICIAL GLENOHUMERAL MOVERS
 * ======================================================================== */

const deltoid: MuscleContent = {
  id: 'deltoid',
  nameEs: 'Deltoides',
  nameLat: 'Musculus deltoideus',
  aliases: ['Deltoides', 'Deltoid'],
  group: 'Movilizadores glenohumerales',

  origin: {
    text: 'Tres porciones: clavicular (tercio lateral de la clavícula), acromial (borde lateral del acromion) y espinal (espina de la escápula).',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Tuberosidad deltoidea, en la cara lateral de la diáfisis del húmero, donde convergen las tres porciones.',
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
      text: 'Porción acromial (media): motor principal de la abducción del hombro a partir de los ~15°, una vez que el supraespinoso ha iniciado el movimiento.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'primary',
      text: 'Porción clavicular (anterior): flexión y rotación interna del hombro.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'primary',
      text: 'Porción espinal (posterior): extensión y rotación externa del hombro.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Para la porción media, hombro en abducción; las porciones anterior y posterior se acortan en flexión y extensión respectivamente.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Brazo en aducción y por detrás del cuerpo (para la porción media); la posición opuesta a su acción acorta cada porción.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Su tracción es inicialmente ascendente (luxante hacia arriba); necesita el par del manguito rotador, que deprime y centra la cabeza humeral, para producir una abducción eficiente en lugar de un simple ascenso.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'Sus porciones anterior y posterior son antagonistas entre sí en el plano sagital, lo que le permite ajustar finamente la dirección del brazo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Muy superficial; cubre el hombro en forma de hombrera. Se palpan sus tres porciones rodeando la cara lateral del húmero proximal.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una abducción resistida a ~90° hace prominente la porción media; flexión y extensión resistidas destacan las porciones anterior y posterior.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Supraespinoso en la abducción; pectoral mayor (clavicular) en la flexión; dorsal ancho y redondo mayor en la extensión.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Aductores (dorsal ancho, redondo mayor, pectoral mayor) frente a su porción media; sus propias porciones anterior y posterior se antagonizan entre sí.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Atrofia o parálisis por lesión del nervio axilar (luxación glenohumeral, fractura del cuello quirúrgico del húmero): produce el signo de la "charretera" y debilidad marcada de la abducción.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Tras una luxación de hombro debe explorarse la sensibilidad del territorio del nervio axilar (cara lateral del hombro) y la fuerza del deltoides.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const pectoralisMajor: MuscleContent = {
  id: 'pectoralis-major',
  nameEs: 'Pectoral mayor',
  nameLat: 'Musculus pectoralis major',
  aliases: ['Pectoral mayor', 'Pectoralis major'],
  group: 'Movilizadores glenohumerales',

  origin: {
    text: 'Cabeza clavicular: mitad medial de la clavícula. Cabeza esternocostal: esternón y cartílagos costales de las seis primeras costillas. Porción abdominal: aponeurosis del oblicuo externo del abdomen.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Cresta del tubérculo mayor (labio lateral del surco intertubercular) del húmero.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervios pectorales medial y lateral.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C5-T1 (todo el plexo braquial contribuye).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Aductor potente del brazo y rotador interno del hombro.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'primary',
      text: 'Cabeza clavicular: flexión del hombro, sobre todo desde la posición de extensión hacia la flexión.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'accessory',
      text: 'Porción esternocostal: extensión del hombro desde la flexión (lleva el brazo elevado de vuelta hacia abajo y adelante).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Brazo en aducción y rotación interna, cruzando por delante del tórax.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Brazo en abducción y rotación externa, llevado hacia atrás (apertura del pecho); posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Sus distintas porciones tienen líneas de tracción diferentes: la clavicular flexiona, la esternocostal extiende desde la flexión, lo que permite movimientos potentes de empuje y aducción horizontal.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'Es uno de los principales motores de la aducción horizontal (movimiento de "abrazo" o press de banca).',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Superficial en la pared anterior del tórax; su borde inferior forma el pliegue axilar anterior, fácil de tomar entre los dedos.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una aducción horizontal resistida (juntar las manos por delante contra resistencia) lo hace prominente.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Deltoides anterior y coracobraquial en la flexión; dorsal ancho y redondo mayor en la aducción y rotación interna.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Deltoides posterior, infraespinoso y redondo menor (rotación externa y aducción horizontal inversa).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Rotura del pectoral mayor: típica en levantadores de peso durante el press de banca; produce dolor, equimosis y un defecto palpable en el pliegue axilar anterior.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Su acortamiento contribuye a la postura de hombros enrollados (protracción) y debe valorarse en programas de corrección postural.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const pectoralisMinor: MuscleContent = {
  id: 'pectoralis-minor',
  nameEs: 'Pectoral menor',
  nameLat: 'Musculus pectoralis minor',
  aliases: ['Pectoral menor', 'Pectoralis minor'],
  group: 'Movilizadores escapulotorácicos',

  origin: {
    text: 'Cara anterior de las costillas 3.ª a 5.ª, cerca de sus cartílagos costales.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Apófisis coracoides de la escápula (borde medial y cara superior).',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio pectoral medial (a veces con fibras del pectoral lateral).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C8-T1.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Báscula anterior y descenso de la escápula: la inclina hacia delante haciendo prominente su ángulo inferior.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Protracción (abducción) de la escápula y rotación inferior de la glenoides.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'accessory',
      text: 'Con la cintura escapular fija, eleva las costillas como músculo inspiratorio accesorio.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Escápula en protracción y báscula anterior (hombros caídos hacia delante).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Escápula en retracción y báscula posterior (apertura del pecho con los hombros hacia atrás y abajo); posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Su tracción anterior sobre la coracoides es la causa mecánica de la báscula anterior escapular; cuando está acortado, limita la rotación superior necesaria para la elevación completa del brazo.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  palpation: {
    howTo: {
      text: 'Profundo al pectoral mayor; se accede a través de él, hacia la coracoides, en la región infraclavicular medial al deltoides.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Relajando el pectoral mayor y buscando en profundidad hacia la apófisis coracoides se palpa su tendón.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Serrato anterior en la protracción; romboides y elevador de la escápula comparten la rotación inferior.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Trapecio (sobre todo fibras inferiores) y serrato anterior en la báscula y rotación superior de la escápula.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Su acortamiento es causa frecuente de hombros enrollados y de discinesia escapular por báscula anterior excesiva.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'Síndrome del desfiladero torácico (variante por pectoral menor): puede comprimir el plexo braquial y los vasos axilares contra la coracoides.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Su longitud se valora en decúbito supino observando cuánto se eleva el hombro respecto a la camilla; un acortamiento lo mantiene despegado.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const teresMajor: MuscleContent = {
  id: 'teres-major',
  nameEs: 'Redondo mayor',
  nameLat: 'Musculus teres major',
  aliases: ['Redondo mayor', 'Teres major'],
  group: 'Movilizadores glenohumerales',

  origin: {
    text: 'Ángulo inferior y tercio inferior del borde lateral de la escápula, en su cara posterior.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Cresta del tubérculo menor (labio medial del surco intertubercular) del húmero.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio subescapular inferior (rama del fascículo posterior del plexo braquial).',
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
      text: 'Aducción, rotación interna y extensión del hombro; lleva el brazo elevado de vuelta hacia el cuerpo.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Brazo en aducción, extensión y rotación interna (mano hacia la espalda baja).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Brazo en flexión/abducción y rotación externa (elevado por delante o por el lado); posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Funciona en estrecha sinergia con el dorsal ancho (comparte acciones de aducción, rotación interna y extensión), por lo que se le llama "el pequeño ayudante del dorsal ancho".',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'A diferencia del dorsal ancho, solo actúa cuando se requiere fuerza o velocidad; no participa de forma sostenida en movimientos lentos no resistidos.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Forma el límite inferior del pliegue axilar posterior junto con el dorsal ancho; se palpa hacia el ángulo inferior de la escápula.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una aducción/rotación interna resistida del brazo (llevar la mano hacia la cadera contra resistencia) lo hace prominente en la axila posterior.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Dorsal ancho (principal sinergista), subescapular y pectoral mayor en la rotación interna y aducción.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Deltoides, supraespinoso (abducción/flexión) e infraespinoso y redondo menor (rotación externa).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Rara vez se lesiona de forma aislada; participa en el límite del espacio cuadrangular, relevante para el atrapamiento del nervio axilar.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Su tensión puede limitar la elevación completa del brazo; conviene valorarlo en restricciones de la flexión/abducción de hombro.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

/* ===========================================================================
 * SCAPULOTHORACIC MOVERS
 * ======================================================================== */

const latissimusDorsi: MuscleContent = {
  id: 'latissimus-dorsi',
  nameEs: 'Dorsal ancho',
  nameLat: 'Musculus latissimus dorsi',
  aliases: ['Dorsal ancho', 'Latissimus dorsi'],
  group: 'Movilizadores glenohumerales',

  origin: {
    text: 'Apófisis espinosas de T7 a L5, fascia toracolumbar, cresta ilíaca y las 3-4 últimas costillas, a través de una amplia aponeurosis.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Suelo del surco intertubercular del húmero (entre los tubérculos mayor y menor).',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio toracodorsal (rama del fascículo posterior del plexo braquial).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C6-C8.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Extensión, aducción y rotación interna del hombro; lleva con fuerza el brazo elevado hacia abajo y atrás.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Con los brazos fijos (p. ej. en barras), eleva el tronco hacia los brazos; participa también en la depresión de la cintura escapular.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Brazo en aducción, extensión y rotación interna (mano hacia la espalda baja).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Brazo en flexión completa por encima de la cabeza con rotación externa, idealmente con inclinación contralateral del tronco; posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Es el principal motor del movimiento de "remo descendente" y de rascarse la espalda; su gran brazo de palanca lo hace muy potente en extensión y aducción.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'Conecta el miembro superior con la pelvis y la columna, transmitiendo fuerzas en cadenas cruzadas (relevante en marcha, lanzamiento y transferencias).',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Forma el pliegue axilar posterior; se palpa su borde lateral en la pared posterior de la axila y su masa en la región dorsolateral baja.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una aducción/extensión resistida del brazo (empujar hacia abajo y atrás contra resistencia) lo hace prominente.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Redondo mayor (sinergista principal), porción esternocostal del pectoral mayor y deltoides posterior.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Deltoides y supraespinoso (abducción/flexión); rotadores externos del manguito.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Su acortamiento limita la flexión completa del hombro y favorece una hiperlordosis compensatoria al elevar los brazos.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Clave en escaladores, nadadores y en personas que usan muletas o silla de ruedas (depresión del hombro contra el peso corporal).',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const trapezius: MuscleContent = {
  id: 'trapezius',
  nameEs: 'Trapecio',
  nameLat: 'Musculus trapezius',
  aliases: ['Trapecio', 'Trapezius'],
  group: 'Movilizadores escapulotorácicos',

  origin: {
    text: 'Protuberancia occipital externa, ligamento nucal y apófisis espinosas de C7 a T12.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Tercio lateral de la clavícula, acromion y espina de la escápula.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio accesorio (par craneal XI) para la función motora; ramos cervicales C3-C4 para la sensibilidad propioceptiva.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Nervio craneal XI con aferencias de C3-C4.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Fibras superiores (descendentes): elevación de la escápula y soporte del peso del miembro superior.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'primary',
      text: 'Fibras medias (transversas): retracción (aducción) de la escápula hacia la columna.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'primary',
      text: 'Fibras inferiores (ascendentes): descenso de la escápula y, junto con las superiores y el serrato, rotación superior de la glenoides en la elevación del brazo.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Escápula elevada y retraída (hombros hacia arriba y atrás) para las fibras superiores y medias.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Escápula deprimida y protraída con inclinación cervical contralateral; posición de estiramiento de las fibras superiores.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Forma con el serrato anterior un par de fuerzas que produce la rotación superior de la escápula, indispensable para elevar el brazo por encima de la cabeza (ritmo escapulohumeral).',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'El equilibrio entre sus fibras superiores e inferiores controla la orientación de la glenoides; su desequilibrio altera la mecánica escapular.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Muy superficial; las fibras superiores se toman entre el cuello y el hombro, las medias e inferiores sobre la región interescapular y dorsal media.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una elevación resistida del hombro (encogimiento) destaca las fibras superiores; la retracción escapular resistida, las medias.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Serrato anterior en la rotación superior; romboides y elevador de la escápula en la retracción y elevación.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Pectoral menor y serrato anterior (protracción) frente a la retracción; entre sí, fibras superiores e inferiores se oponen en elevación/descenso.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Las fibras superiores tienden a sobreactivarse y acortarse (tensión cervical y cefaleas tensionales); las inferiores tienden a debilitarse.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'Lesión del nervio accesorio (XI): debilidad del trapecio con descenso y rotación lateral de la escápula, dolor y limitación de la abducción.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'El desequilibrio superior/inferior es central en la discinesia escapular; los programas de control escapular buscan activar las fibras inferiores e inhibir las superiores.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const rhomboids: MuscleContent = {
  id: 'rhomboids',
  nameEs: 'Romboides',
  nameLat: 'Musculi rhomboidei (major et minor)',
  aliases: ['Romboides', 'Rhomboid major', 'Rhomboid minor'],
  group: 'Movilizadores escapulotorácicos',

  origin: {
    text: 'Romboides menor: apófisis espinosas de C7-T1. Romboides mayor: apófisis espinosas de T2-T5.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Borde medial de la escápula, desde la raíz de la espina (menor) hasta el ángulo inferior (mayor).',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio dorsal de la escápula.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C4-C5.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Retracción (aducción) de la escápula, acercándola a la columna.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'primary',
      text: 'Rotación inferior de la glenoides y elevación de la escápula; estabilizan el borde medial contra la pared torácica.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Escápula retraída y ligeramente elevada (hombros llevados hacia atrás).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Escápula protraída y rotada superiormente (brazo llevado al frente y arriba); posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Junto con el elevador de la escápula producen rotación inferior; deben equilibrarse con el serrato anterior y el trapecio para una mecánica escapular correcta.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'Su función estabilizadora del borde medial es clave para evitar el despegue escapular durante los empujes.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Profundos al trapecio; se palpan en el espacio entre el borde medial de la escápula y las apófisis espinosas torácicas.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Con la mano en la espalda baja y empujando el codo hacia atrás contra resistencia, se hace prominente el borde medial escapular y se accede mejor a ellos.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Trapecio medio en la retracción; elevador de la escápula en la elevación y rotación inferior.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Serrato anterior (protracción y rotación superior); trapecio inferior frente a la rotación inferior.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Su debilidad (incluida la lesión del nervio dorsal de la escápula) produce una escápula alada leve con desplazamiento lateral y altera el control postural.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Frecuente foco de dolor interescapular en posturas mantenidas; los ejercicios de retracción escapular los fortalecen junto al trapecio medio.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const serratusAnterior: MuscleContent = {
  id: 'serratus-anterior',
  nameEs: 'Serrato anterior',
  nameLat: 'Musculus serratus anterior',
  aliases: ['Serrato anterior', 'Serratus anterior'],
  group: 'Movilizadores escapulotorácicos',

  origin: {
    text: 'Caras laterales de las 8-9 primeras costillas, mediante digitaciones carnosas.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Borde medial de la escápula en su cara costal, con concentración de fibras en el ángulo inferior.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio torácico largo.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C5-C7.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Protracción (abducción) de la escápula: la mantiene aplicada contra la pared torácica; motor del gesto de "puñetazo".',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'primary',
      text: 'Rotación superior de la glenoides (fibras inferiores): esencial para elevar el brazo por encima de la cabeza.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Escápula protraída y rotada superiormente (brazo llevado al frente, como al empujar).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Escápula retraída con rotación inferior (hombros llevados hacia atrás); posición de mayor longitud.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Forma con el trapecio el par de fuerzas de la rotación superior escapular; sin él, la escápula no rota lo suficiente y el brazo no completa la elevación.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'Su función de mantener la escápula pegada al tórax es la base mecánica de un apoyo escapular estable para todos los movimientos del brazo.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpan sus digitaciones en la pared lateral del tórax, por debajo de la axila, sobre las costillas.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Empujando con el brazo hacia delante contra una pared (protracción resistida) se hacen prominentes las digitaciones costales.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Trapecio (superior e inferior) en la rotación superior; pectoral menor comparte la protracción.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Romboides y trapecio medio (retracción y rotación inferior).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Parálisis por lesión del nervio torácico largo: produce la escápula alada clásica, con el borde medial despegado del tórax, especialmente al empujar.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Es uno de los músculos clave del ritmo escapulohumeral; su reeducación (ejercicios de empuje con protracción) es central en la rehabilitación del hombro.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const levatorScapulae: MuscleContent = {
  id: 'levator-scapulae',
  nameEs: 'Elevador de la escápula',
  nameLat: 'Musculus levator scapulae',
  aliases: ['Elevador de la escápula', 'Angular del omóplato', 'Levator scapulae'],
  group: 'Movilizadores escapulotorácicos',

  origin: {
    text: 'Tubérculos posteriores de las apófisis transversas de C1-C4.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Ángulo superior y borde medial superior de la escápula.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio dorsal de la escápula y ramos cervicales directos C3-C4.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C3-C5.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Elevación del ángulo superior de la escápula.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'primary',
      text: 'Rotación inferior de la glenoides; con el cuello fijo, contribuye a inclinar la columna cervical hacia su lado.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Escápula elevada con la cabeza inclinada hacia el mismo lado.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Escápula deprimida con la cabeza en flexión, inclinación y rotación contralaterales (mirar hacia la axila opuesta); posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Con los romboides produce rotación inferior de la escápula; debe ser inhibido y elongado cuando se busca rotación superior para la elevación del brazo.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa en el triángulo posterior del cuello, hacia el ángulo superior de la escápula, bajo el borde del trapecio superior.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una elevación resistida del ángulo superior de la escápula con ligera rotación cervical homolateral lo hace accesible.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Trapecio superior en la elevación; romboides en la rotación inferior.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Trapecio inferior (descenso) y serrato anterior (rotación superior).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Foco muy frecuente de dolor cervical y puntos gatillo, sobre todo en posturas mantenidas frente a pantalla; suele estar hipertónico junto al trapecio superior.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Su acortamiento limita la rotación superior escapular y contribuye a la rigidez cervical alta; el estiramiento mirando hacia la axila opuesta es una pauta habitual.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const subclavius: MuscleContent = {
  id: 'subclavius',
  nameEs: 'Subclavio',
  nameLat: 'Musculus subclavius',
  aliases: ['Subclavio', 'Subclavius'],
  group: 'Movilizadores escapulotorácicos',

  origin: {
    text: 'Unión de la 1.ª costilla con su cartílago costal.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Cara inferior del tercio medio de la clavícula (surco subclavio).',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio del subclavio (rama directa del tronco superior del plexo braquial).',
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
      text: 'Desciende y estabiliza la clavícula, fijando la articulación esternoclavicular durante los movimientos del hombro.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  biomechanics: [
    {
      text: 'Más que mover, su papel es estabilizador: protege la articulación esternoclavicular y, por su posición, amortigua los vasos subclavios frente a la clavícula.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Profundo a la clavícula y al pectoral mayor; prácticamente no es palpable de forma directa.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Trapecio inferior y pectoral menor en el descenso de la cintura escapular.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Clínicamente relevante como protector de los vasos subclavios en fracturas de clavícula del tercio medio.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Pequeño y profundo; se incluye por su papel estabilizador de la articulación esternoclavicular más que por su contribución al movimiento.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

const omohyoid: MuscleContent = {
  id: 'omohyoid',
  nameEs: 'Omohioideo',
  nameLat: 'Musculus omohyoideus',
  aliases: ['Omohioideo', 'Omohyoid'],
  group: 'Movilizadores escapulotorácicos',

  origin: {
    text: 'Vientre inferior: borde superior de la escápula, cerca de la escotadura escapular.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Vientre superior: borde inferior del cuerpo del hueso hioides. Ambos vientres se unen por un tendón intermedio fijado a la clavícula por una expansión fascial.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Asa cervical (ramos del plexo cervical).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C1-C3.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Deprime y estabiliza el hueso hioides tras la deglución; músculo infrahioideo. No participa en el movimiento del brazo.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  ],

  biomechanics: [
    {
      text: 'Funcionalmente pertenece al cuello (infrahioideos), no a la cintura escapular; se incluye en el módulo por su origen escapular.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Su vientre inferior cruza oblicuamente el triángulo posterior del cuello; difícil de aislar a la palpación.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  clinicalNotes: [
    {
      text: 'Su tendón intermedio y la fascia que lo fija sirven de referencia quirúrgica en el cuello; el vientre inferior cruza el paquete vasculonervioso cervical.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

/* ===========================================================================
 * BIARTICULAR ARM MUSCLES (cross the shoulder)
 * ======================================================================== */

const bicepsBrachii: MuscleContent = {
  id: 'biceps-brachii',
  nameEs: 'Bíceps braquial',
  nameLat: 'Musculus biceps brachii',
  aliases: ['Bíceps braquial', 'Biceps brachii'],
  group: 'Músculos biarticulares del brazo',

  origin: {
    text: 'Cabeza larga: tubérculo supraglenoideo de la escápula (su tendón cruza la articulación dentro de la cápsula). Cabeza corta: apófisis coracoides.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Tuberosidad del radio y, mediante la aponeurosis bicipital (lacertus fibrosus), a la fascia del antebrazo.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio musculocutáneo.',
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
      text: 'Flexión del codo y supinación del antebrazo (su acción principal y más potente).',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'En el hombro contribuye débilmente a la flexión; el tendón de la cabeza larga ayuda a estabilizar y deprimir la cabeza humeral.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Codo flexionado con antebrazo supinado y hombro en ligera flexión.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Codo extendido con antebrazo pronado y hombro en extensión; posición de estiramiento de la unidad completa.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Su eficacia como flexor del codo depende de la posición del antebrazo (máxima en supinación) y, al ser biarticular, de la posición del hombro.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'El tendón de la cabeza larga, al discurrir sobre la cabeza humeral, aporta una contención superior que colabora con el manguito en la estabilidad del hombro.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Vientre muy superficial en la cara anterior del brazo; el tendón distal se palpa en la flexura del codo y el de la cabeza larga en el surco intertubercular.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una flexión de codo resistida con el antebrazo supinado hace prominente el vientre; rotando el hombro se localiza el tendón de la cabeza larga en el surco.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Braquial y braquiorradial en la flexión de codo; supinador en la supinación; deltoides anterior y coracobraquial en la flexión de hombro.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Tríceps braquial (extensión de codo); pronador redondo y pronador cuadrado (pronación).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Tendinopatía de la porción larga del bíceps: causa frecuente de dolor anterior del hombro, a menudo asociada a patología del manguito.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'Rotura de la porción larga: produce la deformidad en "Popeye" por retracción distal del vientre muscular.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Pruebas de Speed y de Yergason orientan a tendinopatía/inestabilidad de la porción larga del bíceps en el surco intertubercular.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const tricepsBrachii: MuscleContent = {
  id: 'triceps-brachii',
  nameEs: 'Tríceps braquial',
  nameLat: 'Musculus triceps brachii',
  aliases: ['Tríceps braquial', 'Triceps brachii'],
  group: 'Músculos biarticulares del brazo',

  origin: {
    text: 'Cabeza larga: tubérculo infraglenoideo de la escápula (única cabeza que cruza el hombro). Cabezas lateral y medial: cara posterior del húmero.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Olécranon del cúbito.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio radial.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C6-C8 (predominio C7).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Extensor principal del codo (las tres cabezas).',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Solo la cabeza larga cruza el hombro y aporta extensión y aducción, además de estabilizar la articulación por debajo.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Codo extendido con el hombro en extensión (para la cabeza larga).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Codo en flexión máxima con el hombro en flexión completa por encima de la cabeza; posición de estiramiento de la cabeza larga.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Por ser biarticular, la tensión de la cabeza larga depende de la posición del hombro: con el hombro flexionado se preestira y aumenta su eficacia como extensor del codo.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  palpation: {
    howTo: {
      text: 'Superficial en la cara posterior del brazo; se distinguen la cabeza larga (medial) y la lateral, convergiendo en el tendón hacia el olécranon.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una extensión de codo resistida hace prominentes sus tres cabezas y el tendón sobre el olécranon.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Ancóneo en la extensión del codo; dorsal ancho y redondo mayor comparten la extensión/aducción de hombro con la cabeza larga.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Bíceps braquial y braquial (flexión del codo).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'La cabeza larga delimita los espacios cuadrangular y triangular del hombro posterior, relevantes para el trayecto del nervio axilar y la arteria circunfleja humeral posterior.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'La debilidad de la extensión del codo con afectación sensitiva en el dorso de la mano orienta a lesión del nervio radial.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const coracobrachialis: MuscleContent = {
  id: 'coracobrachialis',
  nameEs: 'Coracobraquial',
  nameLat: 'Musculus coracobrachialis',
  aliases: ['Coracobraquial', 'Coracobrachialis'],
  group: 'Músculos biarticulares del brazo',

  origin: {
    text: 'Apófisis coracoides de la escápula (origen común con la cabeza corta del bíceps).',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Cara medial de la diáfisis del húmero, en su tercio medio.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio musculocutáneo (que lo perfora).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C5-C7.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Flexión y aducción del hombro; estabiliza el húmero durante los movimientos del brazo.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Brazo en flexión y aducción (llevado adelante y hacia la línea media).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Brazo en extensión y abducción (llevado atrás y hacia afuera); posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Refuerza la sinergia de flexión del hombro junto con el deltoides anterior y la cabeza corta del bíceps; su contribución es modesta pero estabilizadora.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa en profundidad en la pared medial de la axila, medial al tendón de la cabeza corta del bíceps.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una flexión/aducción resistida del hombro con el brazo ligeramente separado hace accesible su vientre en la axila.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Deltoides anterior y cabeza corta del bíceps en la flexión; pectoral mayor en la aducción.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Deltoides posterior, dorsal ancho y redondo mayor (extensión); abductores del hombro.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'El nervio musculocutáneo lo perfora, lo que constituye un reparo anatómico útil y un posible punto de atrapamiento del nervio.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Forma parte de la pared lateral de la axila; rara vez es foco primario de patología.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

/**
 * The shoulder muscle content index. Keys are kebab-case ids aligned with
 * src/data/muscles/shoulder.ts (the 3D / ROM source of truth).
 */
export const SHOULDER_MUSCLES: MuscleContentIndex = {
  // Rotator cuff
  supraspinatus,
  infraspinatus,
  'teres-minor': teresMinor,
  subscapularis,
  // Superficial glenohumeral movers
  deltoid,
  'pectoralis-major': pectoralisMajor,
  'pectoralis-minor': pectoralisMinor,
  'teres-major': teresMajor,
  // Scapulothoracic movers
  'latissimus-dorsi': latissimusDorsi,
  trapezius,
  rhomboids,
  'serratus-anterior': serratusAnterior,
  'levator-scapulae': levatorScapulae,
  subclavius,
  omohyoid,
  // Biarticular arm muscles
  'biceps-brachii': bicepsBrachii,
  'triceps-brachii': tricepsBrachii,
  coracobrachialis,
};