// src/data/kneeMuscles.ts
//
// Clinical/educational content for the knee muscles (13 muscles): quadriceps,
// hamstrings, triceps surae + posterior, and pes anserinus. Analogue of
// src/data/shoulderMuscles.ts and the elbow content.
//
// AUTHORING RULES (read before adding muscles):
//   1. Anatomy (origin/insertion/innervation/actions) is standard and stable
//      across authoritative texts — safe to author directly.
//   2. NEVER invent a page number. If you haven't confirmed it in the actual
//      edition, set `pageVerified: false` and leave `page` empty.
//   3. Biomechanics statements should cite Kapandji/Oatis; descriptive facts
//      can cite Dufour/descriptive.
//   4. Keep `text` in Latin American Spanish, user-facing and concise.
//   5. `id` is kebab-case, aligned with src/data/muscles/knee.ts (the 3D / ROM
//      / store source of truth).
//
// ENCODING / AUTHORING RULE:
//   - User-facing strings (nameEs, nameLat, group, all `text` fields): Latin
//     American Spanish WITH accents and enies, UTF-8.
//   - Code, ids, keys, enum-like values and comments: ASCII.
//   - Editor ALWAYS UTF-8 without BOM.
//
// Status: anatomy authored & considered reliable; ALL page locators are
// UNVERIFIED (pageVerified: false) pending physical copies of
// Kapandji / Oatis / Dufour.

import type { MuscleContent, MuscleContentIndex } from '../types/muscleContent';

/* ===========================================================================
 * QUADRICEPS — the knee extensors
 * ======================================================================== */

const rectusFemoris: MuscleContent = {
  id: 'rectus-femoris',
  nameEs: 'Recto femoral',
  nameLat: 'Musculus rectus femoris',
  aliases: ['Recto femoral', 'Rectus femoris', 'Recto anterior'],
  group: 'Cuádriceps',

  origin: {
    text: 'Cabeza recta: espina ilíaca anteroinferior. Cabeza refleja: surco supraacetabular, por encima del reborde acetabular.',
    cite: [
      { ref: 'descriptive', pageVerified: false },
      { ref: 'dufour', pageVerified: false },
    ],
  },
  insertion: {
    text: 'Base de la rótula a través del tendón cuadricipital y, vía tendón rotuliano, a la tuberosidad de la tibia.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: { text: 'Nervio femoral.', cite: [{ ref: 'descriptive', pageVerified: false }] },
    roots: { text: 'Raíces L2-L4.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'primary',
      text: 'Extensión de la rodilla; es el único vientre biarticular del cuádriceps.',
      cite: [{ ref: 'kapandji', pageVerified: false }, { ref: 'oatis', pageVerified: false }],
    },
    {
      role: 'accessory',
      text: 'Flexión de la cadera; colabora con el psoas ilíaco, sobre todo con la rodilla flexionada.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Cadera flexionada y rodilla extendida (p. ej. patada): ambos extremos aproximados.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    lengthened: {
      text: 'Cadera extendida y rodilla flexionada (p. ej. talón al glúteo en decúbito prono): posición de estiramiento.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  },

  biomechanics: [
    {
      text: 'Por ser biarticular sufre insuficiencia activa: no logra la extensión máxima de rodilla cuando la cadera ya está flexionada, porque se acorta en ambos extremos.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      text: 'Su eficacia como extensor de rodilla aumenta con la cadera en extensión, que lo preestira.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'En la cara anterior del muslo, en la línea media; se hace prominente al extender la rodilla contra resistencia con el sujeto sentado.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Sentado con la rodilla a 90°; pedir extensión resistida para ver y palpar el vientre central.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    {
      text: 'Los tres vastos (lateral, medial, intermedio) en la extensión de rodilla; psoas ilíaco en la flexión de cadera.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  antagonists: [
    {
      text: 'Isquiotibiales (flexores de rodilla y extensores de cadera).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],
  pathologies: [
    {
      text: 'Desgarro del recto femoral en gestos explosivos (sprint, patada); también tendinopatía proximal en deportistas.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
  clinicalNotes: [
    {
      text: 'Prueba de Ely: en decúbito prono, flexionar la rodilla; si la cadera del mismo lado se eleva, sugiere acortamiento del recto femoral.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const vastusLateralis: MuscleContent = {
  id: 'vastus-lateralis',
  nameEs: 'Vasto lateral',
  nameLat: 'Musculus vastus lateralis',
  aliases: ['Vasto lateral', 'Vasto externo', 'Vastus lateralis'],
  group: 'Cuádriceps',

  origin: {
    text: 'Línea intertrocantérea, borde anterior e inferior del trocánter mayor y labio lateral de la línea áspera.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  insertion: {
    text: 'Borde lateral de la rótula y tendón cuadricipital; expansión al cóndilo tibial lateral (retináculo).',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: { text: 'Nervio femoral.', cite: [{ ref: 'descriptive', pageVerified: false }] },
    roots: { text: 'Raíces L2-L4.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'primary',
      text: 'Extensión de la rodilla; es el vientre más voluminoso del cuádriceps.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'accessory',
      text: 'Ejerce una tracción lateral sobre la rótula que debe equilibrarse con el vasto medial.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: { text: 'Rodilla en extensión completa.', cite: [{ ref: 'kapandji', pageVerified: false }] },
    lengthened: { text: 'Rodilla en flexión máxima.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  },

  biomechanics: [
    {
      text: 'Su vector lateral, sin oposición del vasto medial oblicuo, favorece la desviación lateral de la rótula y el síndrome femoropatelar.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'En la cara lateral del muslo; se palpa su contracción en extensión resistida, por fuera y por encima de la rótula.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    { text: 'Recto femoral, vasto medial y vasto intermedio.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  antagonists: [
    { text: 'Isquiotibiales.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  pathologies: [
    {
      text: 'Contribuye al mal rastreo rotuliano (tracking lateral) cuando predomina sobre el vasto medial oblicuo.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
  clinicalNotes: [
    {
      text: 'Sitio habitual de inyección intramuscular en el adulto (tercio medio de la cara lateral del muslo).',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

const vastusMedialis: MuscleContent = {
  id: 'vastus-medialis',
  nameEs: 'Vasto medial',
  nameLat: 'Musculus vastus medialis',
  aliases: ['Vasto medial', 'Vasto interno', 'VMO', 'Vastus medialis'],
  group: 'Cuádriceps',

  origin: {
    text: 'Línea intertrocantérea (mitad inferior), labio medial de la línea áspera y línea supracondílea medial.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  insertion: {
    text: 'Borde medial de la rótula y tendón cuadricipital; sus fibras distales oblicuas forman el vasto medial oblicuo (VMO).',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: { text: 'Nervio femoral.', cite: [{ ref: 'descriptive', pageVerified: false }] },
    roots: { text: 'Raíces L2-L4.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'primary',
      text: 'Extensión de la rodilla, con protagonismo en los últimos 30°.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'primary',
      text: 'El VMO estabiliza la rótula medialmente y se opone a su desviación lateral.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: { text: 'Rodilla en extensión terminal (bloqueo final).', cite: [{ ref: 'kapandji', pageVerified: false }] },
    lengthened: { text: 'Rodilla en flexión.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  },

  biomechanics: [
    {
      text: 'El VMO es el principal contrapeso medial frente a la tracción lateral del vasto lateral; su buen funcionamiento es clave para un rastreo rotuliano centrado.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'En la cara anteromedial del muslo, justo por encima y por dentro de la rótula; su vientre oblicuo destaca al extender la rodilla los últimos grados.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Sentado, extender la rodilla por completo desde unos 30° de flexión observando el relieve del VMO.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    { text: 'Recto femoral, vasto lateral y vasto intermedio.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  antagonists: [
    { text: 'Isquiotibiales.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  pathologies: [
    {
      text: 'Se inhibe y atrofia con rapidez tras derrame o dolor de rodilla; su debilidad relativa participa en el síndrome femoropatelar.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
  clinicalNotes: [
    {
      text: 'La reeducación del VMO (a menudo en cadena cerrada y en el rango terminal) es un objetivo clásico en el dolor femoropatelar.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

const vastusIntermedius: MuscleContent = {
  id: 'vastus-intermedius',
  nameEs: 'Vasto intermedio',
  nameLat: 'Musculus vastus intermedius',
  aliases: ['Vasto intermedio', 'Vasto crural', 'Vastus intermedius'],
  group: 'Cuádriceps',

  origin: {
    text: 'Caras anterior y lateral de los dos tercios proximales del cuerpo del fémur.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  insertion: {
    text: 'Cara profunda del tendón cuadricipital y base de la rótula.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: { text: 'Nervio femoral.', cite: [{ ref: 'descriptive', pageVerified: false }] },
    roots: { text: 'Raíces L2-L4.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'primary',
      text: 'Extensión de la rodilla; extensor puro y profundo, sin acción sobre la cadera.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: { text: 'Rodilla en extensión.', cite: [{ ref: 'kapandji', pageVerified: false }] },
    lengthened: { text: 'Rodilla en flexión máxima.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  },

  biomechanics: [
    {
      text: 'Sus fibras distales forman el músculo articular de la rodilla, que retrae la bolsa suprarrotuliana y evita su pinzamiento durante la extensión.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'No es palpable de forma aislada: queda profundo, cubierto por el recto femoral.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    { text: 'Recto femoral, vasto lateral y vasto medial.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  antagonists: [
    { text: 'Isquiotibiales.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  clinicalNotes: [
    {
      text: 'El músculo articular de la rodilla deriva de él; su disfunción se asocia a pinzamiento de la bolsa suprarrotuliana.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  ],
};

/* ===========================================================================
 * HAMSTRINGS — biarticular knee flexors + tibial rotators
 * ======================================================================== */

const bicepsFemoris: MuscleContent = {
  id: 'biceps-femoris',
  nameEs: 'Bíceps femoral',
  nameLat: 'Musculus biceps femoris',
  aliases: ['Bíceps femoral', 'Biceps femoris', 'Bíceps crural'],
  group: 'Isquiotibiales',

  origin: {
    text: 'Cabeza larga: tuberosidad isquiática (tendón común con el semitendinoso). Cabeza corta: labio lateral de la línea áspera y línea supracondílea lateral del fémur.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  insertion: {
    text: 'Cabeza del peroné; algunas fibras al cóndilo tibial lateral y a la fascia de la pierna.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: {
      text: 'Cabeza larga: división tibial del nervio ciático. Cabeza corta: división peronea (fibular) común del ciático.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    roots: { text: 'Raíces L5-S2.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'primary',
      text: 'Flexión de la rodilla; la cabeza corta es uniarticular y flexiona con independencia de la cadera.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'primary',
      text: 'Rotación externa de la tibia con la rodilla flexionada (único rotador externo activo).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'accessory',
      text: 'Extensión de la cadera: solo la cabeza larga, biarticular.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: { text: 'Rodilla flexionada y cadera extendida (cabeza larga).', cite: [{ ref: 'kapandji', pageVerified: false }] },
    lengthened: { text: 'Cadera flexionada y rodilla extendida (sentado con tronco hacia delante): estiramiento de la cabeza larga.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  },

  biomechanics: [
    {
      text: 'La doble inervación de sus dos cabezas (tibial y peronea común) es una particularidad clínica útil para localizar lesiones del ciático.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
    {
      text: 'La cabeza larga sufre insuficiencia activa al combinar extensión de cadera con flexión de rodilla.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Su tendón distal es el relieve tendinoso lateral del hueco poplíteo; se sigue hasta la cabeza del peroné.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'En decúbito prono, flexionar la rodilla contra resistencia para destacar el tendón lateral.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    { text: 'Semitendinoso y semimembranoso en la flexión; gastrocnemio asiste con el tobillo libre.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  antagonists: [
    { text: 'Cuádriceps (extensor de rodilla); rotadores internos de la tibia.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  pathologies: [
    {
      text: 'La cabeza larga es la porción más afectada en el "tirón de isquios" del sprint (mecanismo excéntrico de alta velocidad).',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
  clinicalNotes: [
    {
      text: 'Su tendón forma el límite superolateral del hueco poplíteo; reparo en la exploración de la cara posterolateral de la rodilla.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

const semitendinosus: MuscleContent = {
  id: 'semitendinosus',
  nameEs: 'Semitendinoso',
  nameLat: 'Musculus semitendinosus',
  aliases: ['Semitendinoso', 'Semitendinosus'],
  group: 'Isquiotibiales',

  origin: {
    text: 'Tuberosidad isquiática, mediante un tendón común con la cabeza larga del bíceps femoral.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  insertion: {
    text: 'Cara medial de la tibia proximal, en la pata de ganso (con el sartorio y el gracilis).',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: { text: 'División tibial del nervio ciático.', cite: [{ ref: 'descriptive', pageVerified: false }] },
    roots: { text: 'Raíces L5-S2.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'primary',
      text: 'Flexión de la rodilla.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'primary',
      text: 'Rotación interna de la tibia con la rodilla flexionada.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'accessory',
      text: 'Extensión de la cadera (biarticular).',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: { text: 'Rodilla flexionada y cadera extendida.', cite: [{ ref: 'kapandji', pageVerified: false }] },
    lengthened: { text: 'Cadera flexionada y rodilla extendida: estiramiento.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  },

  biomechanics: [
    {
      text: 'Su tendón distal, largo y superficial, es un reparo palpable medial y el injerto autólogo más usado en la reconstrucción del LCA.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Su tendón es el relieve tendinoso más medial y prominente del hueco poplíteo al flexionar la rodilla contra resistencia.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'En decúbito prono, flexión resistida de rodilla; el tendón medial se hace palpable como una cuerda.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    { text: 'Semimembranoso y bíceps femoral en la flexión; gracilis y sartorio en la rotación interna.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  antagonists: [
    { text: 'Cuádriceps; bíceps femoral (rotación externa).', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  pathologies: [
    {
      text: 'Se lesiona en el tirón de isquios; su tendón, al usarse como injerto, deja una debilidad transitoria de la flexión que la rehabilitación debe contemplar.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
  clinicalNotes: [
    {
      text: 'Forma el límite superomedial del hueco poplíteo, junto con el semimembranoso.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

const semimembranosus: MuscleContent = {
  id: 'semimembranosus',
  nameEs: 'Semimembranoso',
  nameLat: 'Musculus semimembranosus',
  aliases: ['Semimembranoso', 'Semimembranosus'],
  group: 'Isquiotibiales',

  origin: {
    text: 'Tuberosidad isquiática, más profundo y proximal que el semitendinoso.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  insertion: {
    text: 'Cara posteromedial del cóndilo tibial medial; expansiones al ligamento poplíteo oblicuo y al menisco medial.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: { text: 'División tibial del nervio ciático.', cite: [{ ref: 'descriptive', pageVerified: false }] },
    roots: { text: 'Raíces L5-S2.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'primary',
      text: 'Flexión de la rodilla.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'primary',
      text: 'Rotación interna de la tibia con la rodilla flexionada.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'accessory',
      text: 'Extensión de la cadera (biarticular).',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: { text: 'Rodilla flexionada y cadera extendida.', cite: [{ ref: 'kapandji', pageVerified: false }] },
    lengthened: { text: 'Cadera flexionada y rodilla extendida: estiramiento.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  },

  biomechanics: [
    {
      text: 'Sus expansiones traccionan el menisco medial hacia atrás durante la flexión, protegiéndolo del pinzamiento; forma parte del ángulo posteromedial estabilizador.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Más profundo que el semitendinoso; su masa se palpa a ambos lados del tendón del semitendinoso, en la cara posteromedial del muslo distal.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    { text: 'Semitendinoso y bíceps femoral en la flexión; rotadores internos de la tibia.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  antagonists: [
    { text: 'Cuádriceps; bíceps femoral.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  pathologies: [
    {
      text: 'Su bolsa serosa puede inflamarse y comunicar con la articulación, originando el quiste de Baker en el hueco poplíteo.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
  clinicalNotes: [
    {
      text: 'Componente clave del ángulo posteromedial; su lesión se asocia a inestabilidad rotatoria medial.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
};

/* ===========================================================================
 * TRICEPS SURAE + posterior knee
 * ======================================================================== */

const gastrocnemius: MuscleContent = {
  id: 'gastrocnemius',
  nameEs: 'Gastrocnemio',
  nameLat: 'Musculus gastrocnemius',
  aliases: ['Gastrocnemio', 'Gemelos', 'Gastrocnemius'],
  group: 'Tríceps sural',

  origin: {
    text: 'Cabeza medial: cara posterior del cóndilo femoral medial. Cabeza lateral: cara lateral del cóndilo femoral lateral.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  insertion: {
    text: 'Tendón calcáneo (de Aquiles), en la cara posterior del calcáneo, junto con el sóleo.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: { text: 'Nervio tibial.', cite: [{ ref: 'descriptive', pageVerified: false }] },
    roots: { text: 'Raíces S1-S2.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'accessory',
      text: 'Flexión de la rodilla, solo cuando el tobillo está libre (biarticular).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'primary',
      text: 'Flexión plantar del tobillo, su acción principal; máxima eficacia con la rodilla extendida.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: { text: 'Rodilla flexionada y tobillo en flexión plantar (de puntillas en cuclillas).', cite: [{ ref: 'kapandji', pageVerified: false }] },
    lengthened: { text: 'Rodilla extendida y tobillo en dorsiflexión: estiramiento.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  },

  biomechanics: [
    {
      text: 'Insuficiencia activa: la flexión plantar es débil con la rodilla flexionada, porque el músculo ya está acortado en su extremo proximal.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Forma el relieve superior de la pantorrilla; sus dos cabezas se distinguen al ponerse de puntillas con la rodilla extendida.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    { text: 'Sóleo en la flexión plantar; isquiotibiales en la flexión de rodilla.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  antagonists: [
    { text: 'Dorsiflexores del tobillo (tibial anterior); cuádriceps en la rodilla.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  pathologies: [
    {
      text: 'El desgarro de la cabeza medial es el clásico "tennis leg": dolor súbito en la pantorrilla al impulsarse.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
  clinicalNotes: [
    {
      text: 'Forma los límites inferiores del hueco poplíteo con sus dos cabezas.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

const soleus: MuscleContent = {
  id: 'soleus',
  nameEs: 'Sóleo',
  nameLat: 'Musculus soleus',
  aliases: ['Sóleo', 'Soleus'],
  group: 'Tríceps sural',

  origin: {
    text: 'Línea del sóleo y borde medial de la tibia; cabeza y tercio proximal del peroné; arco tendinoso del sóleo.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  insertion: {
    text: 'Tendón calcáneo (de Aquiles), junto con el gastrocnemio.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: { text: 'Nervio tibial.', cite: [{ ref: 'descriptive', pageVerified: false }] },
    roots: { text: 'Raíces S1-S2.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'primary',
      text: 'Flexión plantar del tobillo; uniarticular, no cruza la rodilla.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'accessory',
      text: 'Control postural en bipedestación (frena la caída del cuerpo hacia delante).',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: { text: 'Tobillo en flexión plantar.', cite: [{ ref: 'kapandji', pageVerified: false }] },
    lengthened: { text: 'Tobillo en dorsiflexión con la rodilla flexionada (aísla el sóleo).', cite: [{ ref: 'kapandji', pageVerified: false }] },
  },

  biomechanics: [
    {
      text: 'Es la principal "bomba muscular" del retorno venoso de la pierna; su contracción rítmica impulsa la sangre venosa hacia el corazón.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Por debajo y a los lados del gastrocnemio; se palpa mejor con la rodilla flexionada, que relaja el gastrocnemio y deja el sóleo en primer plano.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    { text: 'Gastrocnemio en la flexión plantar.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  antagonists: [
    { text: 'Dorsiflexores del tobillo.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  clinicalNotes: [
    {
      text: 'No actúa sobre la rodilla; se incluye por su relación con el tríceps sural y el diagnóstico diferencial del dolor posterior de pierna (trombosis venosa profunda).',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

const plantaris: MuscleContent = {
  id: 'plantaris',
  nameEs: 'Plantar delgado',
  nameLat: 'Musculus plantaris',
  aliases: ['Plantar delgado', 'Plantar', 'Plantaris'],
  group: 'Tríceps sural',

  origin: {
    text: 'Línea supracondílea lateral del fémur, por encima de la cabeza lateral del gastrocnemio.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  insertion: {
    text: 'Cara posterior del calcáneo, medial al tendón calcáneo (a veces fusionado con él).',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: { text: 'Nervio tibial.', cite: [{ ref: 'descriptive', pageVerified: false }] },
    roots: { text: 'Raíces S1-S2.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'accessory',
      text: 'Asiste débilmente la flexión de la rodilla y la flexión plantar del tobillo.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: { text: 'Rodilla flexionada y tobillo en flexión plantar.', cite: [{ ref: 'kapandji', pageVerified: false }] },
    lengthened: { text: 'Rodilla extendida y tobillo en dorsiflexión.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  },

  biomechanics: [
    {
      text: 'Vientre corto y tendón muy largo; rico en husos neuromusculares, se le atribuye un papel propioceptor más que motor.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'No palpable de forma fiable por su pequeño tamaño y situación profunda.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    { text: 'Gastrocnemio y sóleo.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  antagonists: [
    { text: 'Dorsiflexores del tobillo.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  pathologies: [
    {
      text: 'Su rotura puede simular el "tennis leg" y confundirse con desgarro del gastrocnemio medial.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
  clinicalNotes: [
    {
      text: 'Su tendón largo se usa a veces como injerto tendinoso.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

const popliteus: MuscleContent = {
  id: 'popliteus',
  nameEs: 'Poplíteo',
  nameLat: 'Musculus popliteus',
  aliases: ['Poplíteo', 'Popliteus'],
  group: 'Posterior profundo',

  origin: {
    text: 'Cara lateral del cóndilo femoral lateral y menisco lateral; ligamento poplíteo arqueado.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  insertion: {
    text: 'Cara posterior de la tibia, por encima de la línea del sóleo.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: { text: 'Nervio tibial.', cite: [{ ref: 'descriptive', pageVerified: false }] },
    roots: { text: 'Raíces L4-S1.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'primary',
      text: '"Desbloquea" la rodilla: rota la tibia internamente (o el fémur externamente en cadena cerrada) para iniciar la flexión desde la extensión completa.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'accessory',
      text: 'Flexor débil de la rodilla y estabilizador posterolateral dinámico.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: { text: 'Rodilla flexionada con tibia en rotación interna.', cite: [{ ref: 'kapandji', pageVerified: false }] },
    lengthened: { text: 'Rodilla en extensión con tibia en rotación externa (bloqueo).', cite: [{ ref: 'kapandji', pageVerified: false }] },
  },

  biomechanics: [
    {
      text: 'Es la "llave" del mecanismo de tornillo (screw-home): sin su desbloqueo, la rodilla extendida no puede flexionarse.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      text: 'Tracciona el menisco lateral hacia atrás durante la flexión, protegiéndolo del pinzamiento.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Profundo en el suelo del hueco poplíteo; no es accesible a la palpación directa.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    { text: 'Semitendinoso, semimembranoso y pata de ganso en la rotación interna.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  antagonists: [
    { text: 'Bíceps femoral (rotación externa de la tibia).', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  pathologies: [
    {
      text: 'Su lesión o disfunción participa en la inestabilidad posterolateral de la rodilla.',
      cite: [{ ref: 'oatis', pageVerified: false }],
    },
  ],
  clinicalNotes: [
    {
      text: 'Forma el suelo de la parte distal del hueco poplíteo.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

/* ===========================================================================
 * PES ANSERINUS — medial goose-foot
 * ======================================================================== */

const sartorius: MuscleContent = {
  id: 'sartorius',
  nameEs: 'Sartorio',
  nameLat: 'Musculus sartorius',
  aliases: ['Sartorio', 'Sartorius', 'Músculo del sastre'],
  group: 'Pata de ganso',

  origin: {
    text: 'Espina ilíaca anterosuperior.',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  insertion: {
    text: 'Cara medial de la tibia proximal, en la pata de ganso (el más anterior de los tres tendones).',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: { text: 'Nervio femoral.', cite: [{ ref: 'descriptive', pageVerified: false }] },
    roots: { text: 'Raíces L2-L3.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'accessory',
      text: 'Flexión de la rodilla y rotación interna de la tibia (con la rodilla flexionada).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'primary',
      text: 'En la cadera: flexión, abducción y rotación externa; lleva el talón a la rodilla opuesta ("posición del sastre").',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: { text: 'Cadera flexionada, abducida y en rotación externa, con la rodilla flexionada.', cite: [{ ref: 'kapandji', pageVerified: false }] },
    lengthened: { text: 'Cadera extendida, aducida y en rotación interna, con la rodilla extendida.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  },

  biomechanics: [
    {
      text: 'Es el músculo más largo del cuerpo; biarticular, cruza oblicuamente el muslo y participa en gestos combinados de cadera y rodilla.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Se sigue como una banda oblicua desde la espina ilíaca anterosuperior hacia la cara medial de la rodilla; destaca al llevar el talón a la rodilla opuesta sentado.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
    position: {
      text: 'Sentado, cruzar el tobillo sobre la rodilla contraria (posición del sastre) para tensar el músculo.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    { text: 'Gracilis y semitendinoso en la rotación interna de la tibia; psoas ilíaco en la flexión de cadera.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  antagonists: [
    { text: 'Bíceps femoral (rotación externa de la tibia).', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  pathologies: [
    {
      text: 'Sus tendones participan en la tendinopatía/bursitis de la pata de ganso (dolor medial de rodilla).',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
  clinicalNotes: [
    {
      text: 'Forma el límite lateral del triángulo femoral y el techo del conducto de los aductores.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

const gracilis: MuscleContent = {
  id: 'gracilis',
  nameEs: 'Recto interno (gracilis)',
  nameLat: 'Musculus gracilis',
  aliases: ['Recto interno', 'Gracilis', 'Grácil'],
  group: 'Pata de ganso',

  origin: {
    text: 'Rama isquiopúbica (cuerpo y rama inferior del pubis).',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  insertion: {
    text: 'Cara medial de la tibia proximal, en la pata de ganso (entre el sartorio y el semitendinoso).',
    cite: [{ ref: 'descriptive', pageVerified: false }],
  },
  innervation: {
    nerve: { text: 'Nervio obturador.', cite: [{ ref: 'descriptive', pageVerified: false }] },
    roots: { text: 'Raíces L2-L3.', cite: [{ ref: 'descriptive', pageVerified: false }] },
  },

  actions: [
    {
      role: 'accessory',
      text: 'Flexión de la rodilla y rotación interna de la tibia (con la rodilla flexionada).',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
    {
      role: 'primary',
      text: 'Aducción de la cadera; es el único aductor biarticular que cruza la rodilla.',
      cite: [{ ref: 'kapandji', pageVerified: false }],
    },
  ],

  functionalPositions: {
    shortened: { text: 'Cadera aducida y rodilla flexionada con tibia en rotación interna.', cite: [{ ref: 'kapandji', pageVerified: false }] },
    lengthened: { text: 'Cadera abducida y rodilla extendida: estiramiento.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  },

  biomechanics: [
    {
      text: 'Su carácter biarticular lo hace contribuir tanto a la aducción de cadera como al control rotacional medial de la rodilla.',
      cite: [{ ref: 'descriptive', pageVerified: false }],
    },
  ],

  palpation: {
    howTo: {
      text: 'Banda delgada en la cara más medial del muslo; su tendón se palpa en la pata de ganso, por detrás del sartorio.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  },

  synergists: [
    { text: 'Sartorio y semitendinoso en la pata de ganso; otros aductores en la cadera.', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  antagonists: [
    { text: 'Abductores de la cadera; bíceps femoral (rotación externa de la tibia).', cite: [{ ref: 'kapandji', pageVerified: false }] },
  ],
  pathologies: [
    {
      text: 'Participa en la tendinopatía de la pata de ganso; donante frecuente de injerto (con el semitendinoso) para el LCA.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
  clinicalNotes: [
    {
      text: 'Por su tendón largo y prescindible es muy usado en injertos tendinosos y colgajos.',
      cite: [{ ref: 'dufour', pageVerified: false }],
    },
  ],
};

/**
 * The knee muscle content index. Keys are kebab-case ids aligned with
 * src/data/muscles/knee.ts (the 3D / ROM source of truth).
 */
export const KNEE_MUSCLES: MuscleContentIndex = {
  // Quadriceps
  'rectus-femoris': rectusFemoris,
  'vastus-lateralis': vastusLateralis,
  'vastus-medialis': vastusMedialis,
  'vastus-intermedius': vastusIntermedius,
  // Hamstrings
  'biceps-femoris': bicepsFemoris,
  semitendinosus,
  semimembranosus,
  // Triceps surae + posterior
  gastrocnemius,
  soleus,
  plantaris,
  popliteus,
  // Pes anserinus
  sartorius,
  gracilis,
};
