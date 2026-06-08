// src/data/elbowMuscles.ts
//
// Clinical/educational content for the elbow muscles.
//
// AUTHORING RULES (read before adding muscles):
//   1. Anatomy (origin/insertion/innervation/actions) is standard and stable
//      across authoritative texts - safe to author directly.
//   2. NEVER invent a page number. If you haven't confirmed it in the actual
//      edition, set `pageVerified: false` and leave `page` empty or as a hint.
//      Verified pages flip to `pageVerified: true` once checked.
//   3. Biomechanics statements should cite Kapandji/Oatis; descriptive facts
//      can cite Dufour/descriptive.
//   4. Keep `text` in Latin American Spanish, user-facing and concise.
//   5. `id` is kebab-case. resolveMuscleId matches meshes by an
//      accent/underscore-collapsed slug, so the kebab id and the snake mesh
//      name still resolve to each other.
//
// MODULE SCOPE (didactic decision): 8 individual elbow movers + 2 grouped
// epicondylar fichas. The wrist movers with a humeral (epicondylar) origin
// cross the elbow, but for the ELBOW module what teaches is the GROUP
// (golfer's elbow = common flexor-pronator origin vs tennis elbow = common
// extensor origin), not each forearm muscle in isolation. They get full
// individual treatment later, in the wrist/forearm module.
//
// Status: anatomy authored & considered reliable; ALL page locators are
// UNVERIFIED (pageVerified: false) pending the physical copies of
// Kapandji / Oatis / Dufour.

import type { MuscleContent, MuscleContentIndex } from '../types/muscleContent';

/* ===========================================================================
 * ELBOW FLEXORS
 * ======================================================================== */

const bicepsBrachii: MuscleContent = {
  id: 'biceps-brachii',
  nameEs: 'Bíceps braquial',
  nameLat: 'Musculus biceps brachii',
  aliases: ['Bíceps braquial', 'Biceps brachii'],
  group: 'Flexores del codo',

  origin: {
    text: 'Cabeza larga: tubérculo supraglenoideo de la escápula. Cabeza corta: apófisis coracoides. Ambas convergen en un vientre común en la cara anterior del brazo.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Tuberosidad del radio y, mediante la aponeurosis bicipital (lacertus fibrosus), a la fascia del antebrazo sobre los flexores.',
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
      text: 'Flexor potente del codo y, sobre todo, supinador del antebrazo; es el supinador más fuerte cuando el codo está flexionado a 90°.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Como biarticular, contribuye débilmente a la flexión del hombro; su eficacia flexora del codo depende de la posición del antebrazo.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Codo flexionado con antebrazo supinado (palma hacia arriba).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Codo extendido con antebrazo pronado y hombro en extensión; posición de estiramiento de la unidad completa.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Su eficacia como flexor depende de la posición del antebrazo: es máxima en supinación y mínima en pronación, donde cede el papel principal al braquial y al braquiorradial.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'Combina flexión y supinación, por lo que es el motor del gesto de "atornillar" o llevar comida a la boca con la palma hacia arriba.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Vientre muy superficial en la cara anterior del brazo; su tendón distal se palpa como una cuerda en la flexura del codo, medial al cual se tensa la aponeurosis bicipital.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una flexión de codo resistida con el antebrazo supinado hace prominente el vientre y el tendón distal en el pliegue del codo.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Braquial y braquiorradial en la flexión del codo; supinador en la supinación.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Tríceps braquial y ancóneo (extensión del codo); pronador redondo y pronador cuadrado (pronación).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Rotura del tendón distal del bíceps: típica en esfuerzos de flexión contra resistencia; produce debilidad de la supinación y un defecto palpable en la flexura del codo.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'Bursitis bicipitorradial: dolor en la cara anterior del codo por inflamación de la bolsa entre el tendón distal y la tuberosidad del radio.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'La prueba del gancho (hook test): la incapacidad de enganchar el tendón distal con el dedo en la flexura orienta a rotura distal completa.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const brachialis: MuscleContent = {
  id: 'brachialis',
  nameEs: 'Braquial',
  nameLat: 'Musculus brachialis',
  aliases: ['Braquial', 'Braquial anterior', 'Brachialis'],
  group: 'Flexores del codo',

  origin: {
    text: 'Mitad distal de la cara anterior del húmero (caras anteromedial y anterolateral).',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Tuberosidad del cúbito y cara anterior de la apófisis coronoides.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio musculocutáneo; una pequeña porción lateral recibe inervación del nervio radial.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C5-C6 (la porción radial, C7).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Flexor puro del codo; es el flexor más constante, ya que actúa con independencia de la posición del antebrazo (pronado o supinado).',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Codo flexionado, en cualquier posición del antebrazo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Codo en extensión completa; posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Al insertarse en el cúbito (que no rota), su acción flexora no se ve afectada por la prono-supinación: es el "caballo de tiro" de la flexión del codo.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'Su inserción muy próxima al eje articular le da poco brazo de palanca pero gran recorrido, favoreciendo la flexión rápida y sostenida.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Profundo al bíceps; sus bordes se palpan a ambos lados del vientre del bíceps en el tercio distal del brazo.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una flexión de codo resistida con el antebrazo pronado (que inhibe al bíceps) hace más accesible su contracción a los lados del bíceps.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Bíceps braquial y braquiorradial en la flexión del codo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Tríceps braquial y ancóneo (extensión del codo).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Es el músculo que con más frecuencia desarrolla miositis osificante tras un traumatismo o una luxación del codo, por su contacto directo con la cápsula anterior.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Su contractura es causa frecuente de pérdida de la extensión completa del codo tras una inmovilización; debe valorarse en la rigidez postraumática.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const brachioradialis: MuscleContent = {
  id: 'brachioradialis',
  nameEs: 'Braquiorradial',
  nameLat: 'Musculus brachioradialis',
  aliases: ['Braquiorradial', 'Supinador largo', 'Brachioradialis'],
  group: 'Flexores del codo',

  origin: {
    text: 'Cresta supracondílea lateral del húmero (dos tercios superiores) y tabique intermuscular lateral.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Cara lateral del extremo distal del radio, justo por encima de la apófisis estiloides.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio radial (antes de su división); es excepcional, pues siendo un músculo de la cara anterior funcional, está inervado por el radial.',
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
      text: 'Flexor del codo, especialmente eficaz con el antebrazo en posición neutra (pulgar hacia arriba) y en movimientos rápidos o contra carga.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Lleva el antebrazo hacia la posición neutra: supina desde la pronación completa y prona desde la supinación completa.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Codo flexionado con el antebrazo en posición neutra (como al sostener un martillo).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Codo en extensión con el antebrazo en pronación o supinación extremas; posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Por su inserción muy distal en el radio tiene un brazo de palanca largo, lo que lo convierte en un flexor potente en cargas pesadas, aunque poco activo en la flexión lenta sin resistencia.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'Forma el límite lateral de la fosa cubital (flexura del codo), reparo útil en la palpación.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Muy superficial; forma el relieve lateral del antebrazo proximal y el borde lateral de la flexura del codo.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una flexión de codo resistida con el antebrazo en posición neutra (pulgar arriba) lo hace resaltar como una cuerda en la cara lateral.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Bíceps braquial y braquial en la flexión del codo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Tríceps braquial y ancóneo (extensión del codo).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Su reflejo (reflejo braquiorradial o supinador largo) explora la raíz C6; su alteración orienta a una radiculopatía cervical.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Su inervación radial lo hace útil para diferenciar lesiones nerviosas: se preserva en lesiones del musculocutáneo pero se afecta en parálisis del radial.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

/* ===========================================================================
 * ELBOW EXTENSORS
 * ======================================================================== */

const tricepsBrachii: MuscleContent = {
  id: 'triceps-brachii',
  nameEs: 'Tríceps braquial',
  nameLat: 'Musculus triceps brachii',
  aliases: ['Tríceps braquial', 'Triceps brachii'],
  group: 'Extensores del codo',

  origin: {
    text: 'Cabeza larga: tubérculo infraglenoideo de la escápula (cruza el hombro). Cabeza lateral: cara posterior del húmero, por encima del surco radial. Cabeza medial: cara posterior del húmero, por debajo del surco radial.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Olécranon del cúbito, mediante un tendón común; algunas fibras se expanden a la fascia del antebrazo.',
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
      text: 'Extensor principal del codo; las tres cabezas convergen en el olécranon.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Solo la cabeza larga cruza el hombro: aporta extensión y aducción del brazo y estabiliza la articulación por debajo.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Codo extendido; para la cabeza larga, con el hombro también en extensión.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Codo en flexión máxima con el hombro en flexión completa por encima de la cabeza; posición de estiramiento de la cabeza larga.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Por ser biarticular, la cabeza larga depende de la posición del hombro: con el hombro flexionado se preestira y aumenta su eficacia extensora del codo (relación longitud-tensión).',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'Es el músculo del empuje y de soportar el peso del cuerpo sobre los brazos (fondos, transferencias); la cabeza medial es la trabajadora constante de la extensión.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Superficial en la cara posterior del brazo; se distinguen la cabeza larga (medial) y la lateral, convergiendo en el tendón sobre el olécranon.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una extensión de codo resistida hace prominentes sus cabezas y el tendón sobre el olécranon.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Ancóneo en la extensión del codo; dorsal ancho y redondo mayor comparten la extensión del hombro con la cabeza larga.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Bíceps braquial, braquial y braquiorradial (flexión del codo).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Tendinopatía del tríceps ("codo de levantador"): dolor posterior en la inserción olecraniana por sobrecarga en extensión resistida.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'Su debilidad con afectación sensitiva en el dorso de la mano orienta a lesión del nervio radial en el brazo.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'El reflejo tricipital explora la raíz C7; su abolición orienta a radiculopatía o lesión del nervio radial.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const anconeus: MuscleContent = {
  id: 'anconeus',
  nameEs: 'Ancóneo',
  nameLat: 'Musculus anconeus',
  aliases: ['Ancóneo', 'Anconeus'],
  group: 'Extensores del codo',

  origin: {
    text: 'Cara posterior del epicóndilo lateral (epitróclea lateral) del húmero.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Cara lateral del olécranon y cuarto proximal de la cara posterior del cúbito.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio radial (ramo para la cabeza medial del tríceps).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C7-C8.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Asiste al tríceps en la extensión del codo, sobre todo en los últimos grados.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Estabiliza el cúbito durante la prono-supinación y tensa la cápsula posterior, evitando su pinzamiento en la extensión.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Codo en extensión.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Codo en flexión máxima; posición de mayor longitud.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Su papel estabilizador es relevante: actúa de forma continua durante la prono-supinación para mantener congruente la articulación humero-cubital.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  palpation: {
    howTo: {
      text: 'Superficial; se palpa en el triángulo entre el epicóndilo lateral, el olécranon y el borde posterior del cúbito.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una extensión de codo resistida hace contraer el músculo bajo los dedos en ese triángulo posterolateral.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Tríceps braquial en la extensión del codo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Bíceps braquial, braquial y braquiorradial (flexión del codo).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'El síndrome del ancóneo epitroclear (músculo accesorio anómalo) puede comprimir el nervio cubital en el túnel cubital.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Su punto de palpación es referencia para el portal posterolateral en la artroscopia de codo y para la infiltración articular.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

/* ===========================================================================
 * PRONO-SUPINATION (proximal radio-ulnar)
 * ======================================================================== */

const pronatorTeres: MuscleContent = {
  id: 'pronator-teres',
  nameEs: 'Pronador redondo',
  nameLat: 'Musculus pronator teres',
  aliases: ['Pronador redondo', 'Pronator teres'],
  group: 'Pronosupinación',

  origin: {
    text: 'Cabeza humeral: epicóndilo medial (epitróclea) por el tendón flexor común. Cabeza cubital (ulnar): apófisis coronoides del cúbito.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Cara lateral del radio, en su punto medio (impresión del pronador redondo).',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio mediano.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C6-C7.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Pronador del antebrazo; es el motor principal de la pronación rápida.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Asiste débilmente en la flexión del codo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Antebrazo en pronación (palma hacia abajo) con ligera flexión del codo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Antebrazo en supinación completa con el codo extendido; posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Junto al pronador cuadrado realiza la pronación; el redondo aporta velocidad y fuerza, el cuadrado el control fino y constante.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'El nervio mediano pasa entre sus dos cabezas, punto donde puede quedar atrapado.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Forma el límite medial de la fosa cubital; se palpa como un relieve oblicuo desde el epicóndilo medial hacia el borde lateral del radio.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una pronación resistida con el codo en ligera flexión lo hace prominente en el antebrazo proximal medial.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Pronador cuadrado en la pronación; flexores epicondíleos en la flexión del codo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Supinador y bíceps braquial (supinación).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Síndrome del pronador redondo: compresión del nervio mediano entre sus dos cabezas, con dolor en el antebrazo proximal y parestesias en el territorio mediano.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'A diferencia del síndrome del túnel del carpo, en el síndrome del pronador el dolor es más proximal y la palma puede estar afectada (el ramo palmar del mediano nace por encima del carpo).',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const pronatorQuadratus: MuscleContent = {
  id: 'pronator-quadratus',
  nameEs: 'Pronador cuadrado',
  nameLat: 'Musculus pronator quadratus',
  aliases: ['Pronador cuadrado', 'Pronator quadratus'],
  group: 'Pronosupinación',

  origin: {
    text: 'Cuarto distal de la cara anterior del cúbito.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Cuarto distal de la cara anterior del radio.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio interóseo anterior (rama del nervio mediano).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C7-C8 (a veces T1).',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Pronador del antebrazo; es el iniciador y el pronador constante en todos los grados de movimiento, con independencia de la carga.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Mantiene unidos el radio y el cúbito en su extremo distal, oponiéndose a su separación durante la carga.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Antebrazo en pronación (palma hacia abajo).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Antebrazo en supinación completa; posición de mayor longitud.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Es el pronador primario: inicia el movimiento y actúa en toda pronación, mientras que el pronador redondo se le suma cuando se requiere fuerza o velocidad.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'Su función de coaptación de la articulación radio-cubital distal es clave para la estabilidad del antebrazo en la transmisión de cargas.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Profundo, cubierto por los flexores; prácticamente no es palpable de forma directa en el antebrazo distal anterior.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Pronador redondo en la pronación.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Supinador y bíceps braquial (supinación).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Se afecta en el síndrome del nervio interóseo anterior (síndrome de Kiloh-Nevin), junto al flexor largo del pulgar y el flexor profundo del 2.º dedo.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Su integridad se valora indirectamente con la pronación resistida con el codo en flexión máxima, posición que minimiza el aporte del pronador redondo.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const supinator: MuscleContent = {
  id: 'supinator',
  nameEs: 'Supinador',
  nameLat: 'Musculus supinator',
  aliases: ['Supinador', 'Supinador corto', 'Supinator'],
  group: 'Pronosupinación',

  origin: {
    text: 'Epicóndilo lateral del húmero, ligamento colateral radial, ligamento anular y cresta del supinador del cúbito.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Cara lateral, anterior y posterior del tercio proximal del radio (rodeándolo).',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio interóseo posterior (ramo profundo del nervio radial), que lo atraviesa.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C6-C7.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Supinador del antebrazo; es el supinador constante en movimientos lentos y sin resistencia, con independencia de la posición del codo.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Antebrazo en supinación (palma hacia arriba).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Antebrazo en pronación completa; posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Reparte la supinación con el bíceps: el supinador actúa siempre y en movimientos lentos; el bíceps se suma cuando se necesita fuerza, sobre todo con el codo flexionado.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'El nervio interóseo posterior lo atraviesa por la arcada de Frohse, punto crítico de atrapamiento.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Profundo, cubierto por los músculos epicondíleos laterales; difícil de aislar a la palpación directa.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Bíceps braquial en la supinación (sobre todo contra resistencia y con el codo flexionado).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Pronador redondo y pronador cuadrado (pronación).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Síndrome del túnel radial / del interóseo posterior: atrapamiento del nervio en la arcada de Frohse, con dolor lateral del codo y, en casos motores, debilidad de la extensión de los dedos sin déficit sensitivo.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'El síndrome del túnel radial se confunde con la epicondilitis lateral; el dolor es más distal (3-4 cm bajo el epicóndilo) y aumenta con la supinación resistida.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

/* ===========================================================================
 * EPICONDYLAR GROUPS (wrist movers crossing the elbow - taught as groups)
 * ======================================================================== */

const commonFlexorPronatorGroup: MuscleContent = {
  id: 'common-flexor-pronator-origin',
  nameEs: 'Grupo flexor-pronador (origen epitroclear)',
  nameLat: 'Origo communis flexorum',
  aliases: [
    'Grupo flexor-pronador',
    'Origen flexor común',
    'Musculatura epitroclear',
    'Common flexor origin',
  ],
  group: 'Grupos epicondíleos',

  origin: {
    text: 'Tendón flexor común en el epicóndilo medial (epitróclea) del húmero. De él nacen, de lateral a medial: pronador redondo, flexor radial del carpo, palmar largo, flexor cubital del carpo y la cabeza humero-cubital del flexor superficial de los dedos.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Cada músculo del grupo tiene su propia inserción distal (base de metacarpianos, falanges o radio); como grupo, su tracción común es sobre la epitróclea.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Mayoritariamente nervio mediano; el flexor cubital del carpo (y parte del flexor profundo, no incluido aquí) por el nervio cubital.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: {
      text: 'Raíces C6-T1 según el músculo.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  },

  actions: [
    {
      role: 'primary',
      text: 'Flexión de la muñeca y de los dedos y pronación del antebrazo; sobre el codo, refuerzan la cara medial y asisten débilmente la flexión.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'Como conjunto, aportan estabilidad dinámica medial al codo, complementando al ligamento colateral cubital frente a la fuerza en valgo.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Muñeca y dedos flexionados con el antebrazo pronado.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Muñeca y dedos en extensión con el antebrazo supinado y el codo extendido; posición de estiramiento del grupo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Su origen común concentra la carga en la epitróclea: los gestos repetidos de flexión-pronación (lanzamiento, golf, agarre) la sobrecargan, lo que explica la localización del dolor en la epicondilitis medial.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'Actúan como estabilizadores dinámicos mediales frente al valgo, sobre todo en la fase de aceleración del lanzamiento.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa el origen común sobre la epitróclea (epicóndilo medial) y los vientres divergiendo hacia el antebrazo anteromedial.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una flexión de muñeca resistida con el antebrazo pronado reproduce el dolor y hace prominente el grupo a partir de la epitróclea.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Entre sí en la flexión de muñeca y pronación; el ligamento colateral cubital como estabilizador medial pasivo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Grupo extensor (origen epicondíleo lateral) en la muñeca; supinador y bíceps en la prono-supinación.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Epicondilitis medial ("codo del golfista" o epitrocleítis): tendinopatía del origen flexor-pronador común por sobreuso en flexión-pronación.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'El nervio cubital discurre justo por detrás de la epitróclea (túnel cubital), por lo que la patología medial del codo se asocia con frecuencia a síntomas cubitales.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'En la epicondilitis medial debe explorarse siempre el nervio cubital (signo de Tinel en el túnel cubital) por su íntima relación con la epitróclea.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const commonExtensorGroup: MuscleContent = {
  id: 'common-extensor-origin',
  nameEs: 'Grupo extensor (origen epicondíleo lateral)',
  nameLat: 'Origo communis extensorum',
  aliases: [
    'Grupo extensor',
    'Origen extensor común',
    'Musculatura epicondílea lateral',
    'Common extensor origin',
  ],
  group: 'Grupos epicondíleos',

  origin: {
    text: 'Tendón extensor común en el epicóndilo lateral del húmero. De él nacen: extensor radial corto del carpo, extensor de los dedos, extensor del meñique y extensor cubital del carpo. El extensor radial largo del carpo nace algo más arriba, en la cresta supracondílea.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  insertion: {
    text: 'Cada músculo del grupo tiene su propia inserción distal (bases de metacarpianos o aparato extensor de los dedos); como grupo, su tracción común es sobre el epicóndilo lateral.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },

  innervation: {
    nerve: {
      text: 'Nervio radial y su ramo profundo (nervio interóseo posterior).',
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
      text: 'Extensión de la muñeca y de los dedos; sobre el codo refuerzan la cara lateral y participan en la estabilidad articular.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      role: 'accessory',
      text: 'El extensor radial corto del carpo es el tendón más implicado en la epicondilitis lateral por su posición y su tensión durante el agarre.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Muñeca y dedos en extensión.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Muñeca y dedos en flexión con el antebrazo pronado y el codo extendido; posición de estiramiento del grupo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'El agarre exige extensión de muñeca para estabilizarla, lo que carga el origen extensor común en el epicóndilo lateral; el sobreuso explica la epicondilitis lateral.',
      cite: [
        { ref: 'kapandji', pageVerified: false },
        { ref: 'oatis', pageVerified: false },
      ],
    },
    {
      text: 'El extensor radial corto del carpo soporta una fricción mecánica contra el cóndilo humeral durante la flexión del codo, lo que favorece su degeneración tendinosa.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa el origen común sobre el epicóndilo lateral y los vientres convergiendo hacia él desde el dorso del antebrazo proximal.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Una extensión de muñeca resistida con el codo extendido (prueba de Cozen) reproduce el dolor en el epicóndilo lateral.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Entre sí en la extensión de muñeca y dedos; refuerzan la estabilidad lateral junto con el ligamento colateral radial.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  antagonists: [
    {
      text: 'Grupo flexor-pronador (origen epitroclear) en la muñeca.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  pathologies: [
    {
      text: 'Epicondilitis lateral ("codo de tenista"): tendinopatía del origen extensor común, sobre todo del extensor radial corto del carpo, por sobreuso en extensión y agarre.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
    {
      text: 'Diagnóstico diferencial con el síndrome del túnel radial, que comparte el dolor lateral pero es más distal y de origen nervioso (nervio interóseo posterior).',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  clinicalNotes: [
    {
      text: 'Pruebas de Cozen y de Mill orientan a epicondilitis lateral; conviene descartar el atrapamiento del interóseo posterior cuando el dolor es más distal.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

/**
 * The elbow muscle content index. Keys are kebab-case ids.
 */
export const ELBOW_MUSCLES: MuscleContentIndex = {
  // Flexors
  'biceps-brachii': bicepsBrachii,
  brachialis,
  brachioradialis,
  // Extensors
  'triceps-brachii': tricepsBrachii,
  anconeus,
  // Prono-supination
  'pronator-teres': pronatorTeres,
  'pronator-quadratus': pronatorQuadratus,
  supinator,
  // Epicondylar groups
  'common-flexor-pronator-origin': commonFlexorPronatorGroup,
  'common-extensor-origin': commonExtensorGroup,
};
