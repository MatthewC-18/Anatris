// src/data/spineMuscleContent.ts
//
// Clinical/educational content for the SPINE muscles, split into the three
// sub-regions the store knows (cervical / thoracic / lumbar). This closes the
// gap documented in muscleContentByRegion.ts: until now the three spine regions
// resolved to an EMPTY MuscleContentIndex, so a paid region showed only the
// bare `Muscle` fallback while shoulder/elbow/knee showed sourced prose.
//
// STRATEGY (same as hip/ankle, one step further)
// ----------------------------------------------
//   1. Every spine muscle gets a BASE record derived from the structured
//      `Muscle` records (muscles/spine.ts) through the shared adapter, so no
//      muscle is ever empty.
//   2. The clinically load-bearing muscles (the ones a physio actually reasons
//      about: ECOM, escalenos, elevador, flexores profundos, suboccipitales,
//      erector, transversoespinoso, cuadrado lumbar, iliopsoas y la pared
//      abdominal) are HAND-AUTHORED on top, with the full field set the
//      shoulder index uses: functionalPositions, biomechanics, palpation,
//      synergists, antagonists, pathologies, clinicalNotes.
//
// The thoracic index also carries the anterolateral abdominal wall + cuadrado
// lumbar, mirroring musclesByRegion.ts: those muscles are authored in the lumbar
// list but drive thoracic flexion / inclination / rotation, so a click on them
// while studying the thoracic spine must resolve to real content.
//
// AUTHORING RULES (identical to shoulderMuscles.ts):
//   1. Anatomy (origin/insertion/innervation/actions) is standard and stable —
//      safe to author directly.
//   2. NEVER invent a page number. Everything ships pageVerified:false until
//      checked against the physical edition.
//   3. Biomechanics statements cite Kapandji/Neumann; descriptive facts cite
//      Dufour/Gray (descriptive).
//   4. `text` in Latin American Spanish, user-facing, concise.
//   5. `id` is kebab-case and MUST match src/data/muscles/spine.ts.
//
// ENCODING: user-facing strings UTF-8 with accents; ids/keys/comments ASCII.

import type {
  Citation,
  MuscleContent,
  MuscleContentIndex,
} from '../types/muscleContent';
import { contentIndexFromMuscles } from '../lib/muscleToContent';
import {
  cervicalMuscles,
  thoracicMuscles,
  lumbarMuscles,
} from './muscles/spine';

/* ===========================================================================
 * CITATION SHORTHANDS
 * All unverified: no page locator has been checked against a physical edition.
 * ======================================================================== */
const KAP: Citation[] = [{ ref: 'kapandji', pageVerified: false }];
const NEU: Citation[] = [{ ref: 'neumann', pageVerified: false }];
const KAP_NEU: Citation[] = [
  { ref: 'kapandji', pageVerified: false },
  { ref: 'neumann', pageVerified: false },
];
const DUF: Citation[] = [{ ref: 'dufour', pageVerified: false }];
const DESC: Citation[] = [{ ref: 'descriptive', pageVerified: false }];
const DESC_DUF: Citation[] = [
  { ref: 'descriptive', pageVerified: false },
  { ref: 'dufour', pageVerified: false },
];
const MAG: Citation[] = [{ ref: 'magee', pageVerified: false }];

/* ===========================================================================
 * CERVICAL — hand-authored
 * ======================================================================== */

const sternocleidomastoid: MuscleContent = {
  id: 'sternocleidomastoid',
  nameEs: 'Esternocleidomastoideo',
  nameLat: 'Musculus sternocleidomastoideus',
  aliases: ['ECOM', 'Esternocleidomastoideo', 'Sternocleidomastoid'],
  group: 'Cervical superficial',

  origin: {
    text: 'Dos cabezas: la esternal en la cara anterior del manubrio y la clavicular en el tercio medial de la clavícula.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Cara lateral de la apófisis mastoides y mitad lateral de la línea nucal superior del occipital.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: {
      text: 'Nervio accesorio (XI par) para la función motora; ramos de C2-C3 aportan la sensibilidad propioceptiva.',
      cite: DESC,
    },
    roots: { text: 'XI par craneal; C2-C3.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Unilateralmente: rota la cara hacia el lado OPUESTO e inclina la cabeza hacia el mismo lado. Es la combinación que define la tortícolis.',
      cite: KAP_NEU,
    },
    {
      role: 'primary',
      text: 'Bilateralmente: flexiona la columna cervical baja mientras EXTIENDE la craneocervical, produciendo la típica postura de "sacar la barbilla".',
      cite: KAP,
    },
    {
      role: 'accessory',
      text: 'Músculo inspiratorio accesorio: con la cabeza fija eleva el esternón y la clavícula.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Cabeza inclinada hacia el lado del músculo y rotada al contrario, con el cuello ligeramente flexionado.',
      cite: KAP,
    },
    lengthened: {
      text: 'Cuello en extensión, inclinado al lado contrario y rotado hacia el mismo lado del músculo: esta es la posición de estiramiento.',
      cite: KAP,
    },
  },

  biomechanics: [
    {
      text: 'Su línea de acción pasa POR DELANTE de la columna cervical baja y POR DETRÁS del eje atlanto-occipital: por eso flexiona el cuello y extiende la cabeza a la vez. Sin los flexores profundos que lo contrarresten, esa doble acción es exactamente el patrón de cabeza adelantada.',
      cite: KAP_NEU,
    },
    {
      text: 'Al tener un brazo de palanca largo, es un motor potente pero mal estabilizador segmentario: no puede sostener la lordosis cervical, tarea de los flexores profundos.',
      cite: NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se marca como un relieve oblicuo desde el manubrio hasta la mastoides. Se toma en pinza entre pulgar e índice en su tercio medio.',
      cite: DUF,
    },
    position: {
      text: 'Paciente en supino: pídele que gire la cara al lado contrario contra una resistencia mínima; el vientre salta bajo los dedos.',
      cite: DUF,
    },
  },

  synergists: [
    {
      text: 'Escalenos y largo del cuello en la flexión cervical; el ECOM contralateral neutraliza el componente rotatorio cuando actúan juntos.',
      cite: KAP,
    },
  ],
  antagonists: [
    {
      text: 'Esplenios, semiespinosos y trapecio superior (extensores cervicales); el ECOM del lado opuesto para la rotación.',
      cite: KAP,
    },
  ],

  pathologies: [
    {
      text: 'Tortícolis muscular congénita: retracción fibrosa del ECOM con la cabeza inclinada al lado afecto y rotada al contrario.',
      cite: DESC,
    },
    {
      text: 'Latigazo cervical: hiperactividad del ECOM con inhibición de los flexores profundos, un patrón que perpetúa el dolor.',
      cite: MAG,
    },
  ],

  clinicalNotes: [
    {
      text: 'Divide el cuello en triángulo anterior y posterior: es el reparo de referencia para localizar el resto de las estructuras cervicales.',
      cite: DESC,
    },
    {
      text: 'En la prueba de flexión craneocervical, un ECOM que se dispara antes que el largo del cuello indica sustitución superficial: el objetivo del reentrenamiento es invertir ese orden.',
      cite: MAG,
    },
  ],
};

const levatorScapulae: MuscleContent = {
  id: 'levator-scapulae',
  nameEs: 'Elevador de la escápula',
  nameLat: 'Musculus levator scapulae',
  aliases: ['Angular del omóplato', 'Levator scapulae'],
  group: 'Cervicoescapular',

  origin: {
    text: 'Tubérculos posteriores de las apófisis transversas de C1 a C4.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Ángulo superior y porción alta del borde medial de la escápula.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: {
      text: 'Nervio dorsal de la escápula, con ramos directos del plexo cervical.',
      cite: DESC,
    },
    roots: { text: 'C3-C5 (el nervio dorsal escapular es C5).', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Eleva la escápula y la rota hacia abajo (la glenoides mira al suelo), acompañando el descenso del brazo.',
      cite: KAP_NEU,
    },
    {
      role: 'primary',
      text: 'Con la escápula fija: inclina el cuello hacia el mismo lado y lo rota levemente al mismo lado.',
      cite: KAP,
    },
    {
      role: 'accessory',
      text: 'Estabiliza el ángulo superior de la escápula frente a la tracción de los otros estabilizadores.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Hombro elevado (en "encogimiento") con el cuello inclinado y rotado hacia el mismo lado.',
      cite: KAP,
    },
    lengthened: {
      text: 'Hombro deprimido, cuello flexionado, inclinado al lado contrario y ROTADO al lado contrario: mirar hacia la axila opuesta es la posición de estiramiento clásica.',
      cite: KAP,
    },
  },

  biomechanics: [
    {
      text: 'Es un rotador INFERIOR de la escápula: en la elevación del brazo debe ceder. Si permanece acortado limita la rotación superior y contribuye al pinzamiento subacromial.',
      cite: NEU,
    },
    {
      text: 'Su doble inserción (raquis y escápula) lo convierte en el eslabón que transmite la carga del hombro al cuello: por eso el dolor cervical alto y el dolor escapular suelen viajar juntos.',
      cite: KAP_NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se busca en el ángulo superior de la escápula, justo medial y profundo al borde anterior del trapecio superior.',
      cite: DUF,
    },
    position: {
      text: 'Paciente sentado con la mano del lado a explorar en la espalda baja: la escápula rota hacia abajo y el vientre se hace accesible bajo el trapecio.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Trapecio superior y romboides en la elevación escapular.', cite: KAP },
  ],
  antagonists: [
    {
      text: 'Trapecio inferior y serrato anterior (descenso y rotación superior de la escápula).',
      cite: NEU,
    },
  ],

  pathologies: [
    {
      text: 'Punto gatillo miofascial muy frecuente en el ángulo superior de la escápula, con dolor referido a la base del cuello.',
      cite: MAG,
    },
  ],

  clinicalNotes: [
    {
      text: 'Sobreactivación típica del trabajo con pantalla: hombros elevados y cuello adelantado mantienen el músculo en acortamiento sostenido.',
      cite: MAG,
    },
  ],
};

const spleniusCapitis: MuscleContent = {
  id: 'splenius-capitis',
  nameEs: 'Esplenio de la cabeza',
  nameLat: 'Musculus splenius capitis',
  aliases: ['Splenius capitis'],
  group: 'Extensores cervicales superficiales',

  origin: {
    text: 'Mitad inferior del ligamento nucal y apófisis espinosas de C7 a T3-T4.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Apófisis mastoides y tercio lateral de la línea nucal superior, por debajo del ECOM.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Ramos dorsales de los nervios cervicales medios.', cite: DESC },
    roots: { text: 'C3-C5.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Bilateralmente: extiende la cabeza y el cuello manteniendo la lordosis cervical.',
      cite: KAP,
    },
    {
      role: 'primary',
      text: 'Unilateralmente: rota la cara hacia el MISMO lado e inclina hacia el mismo lado.',
      cite: KAP_NEU,
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Cabeza en extensión, rotada e inclinada hacia el mismo lado.',
      cite: KAP,
    },
    lengthened: {
      text: 'Flexión cervical con rotación e inclinación al lado contrario (mentón hacia el hombro opuesto).',
      cite: KAP,
    },
  },

  biomechanics: [
    {
      text: 'Es el antagonista rotatorio directo del ECOM contralateral: ambos rotan la cara al mismo lado, uno tirando desde delante y el otro desde detrás. Forman un par cruzado que estabiliza la cabeza mientras gira.',
      cite: KAP_NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se aborda en el triángulo posterior del cuello, entre el borde posterior del ECOM y el borde anterior del trapecio superior.',
      cite: DUF,
    },
    position: {
      text: 'Paciente en prono con la frente apoyada: una extensión suave contra resistencia mínima lo hace resaltar.',
      cite: DUF,
    },
  },

  synergists: [
    {
      text: 'Esplenio del cuello, longísimo de la cabeza y trapecio superior en la extensión.',
      cite: KAP,
    },
  ],
  antagonists: [
    { text: 'Largo del cuello, largo de la cabeza y ECOM bilateral (flexores).', cite: KAP },
  ],

  clinicalNotes: [
    {
      text: 'Capa que "envuelve" (splenion = venda) los músculos profundos del cuello: es lo primero que se palpa al buscar la musculatura cervical posterior.',
      cite: DUF,
    },
  ],
};

const scalenusAnterior: MuscleContent = {
  id: 'scalenus-anterior',
  nameEs: 'Escaleno anterior',
  nameLat: 'Musculus scalenus anterior',
  aliases: ['Scalenus anterior'],
  group: 'Escalenos',

  origin: {
    text: 'Tubérculos anteriores de las apófisis transversas de C3 a C6.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Tubérculo del escaleno (tubérculo de Lisfranc) en la cara superior de la primera costilla.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Ramos ventrales directos de los nervios cervicales.', cite: DESC },
    roots: { text: 'C4-C6.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Con la costilla fija: inclina la columna cervical hacia el mismo lado y colabora en la flexión.',
      cite: KAP,
    },
    {
      role: 'primary',
      text: 'Con el cuello fijo: eleva la primera costilla en la inspiración. Es el principal inspiratorio accesorio del cuello.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Cuello inclinado hacia el mismo lado con la caja torácica elevada (patrón respiratorio alto).',
      cite: KAP,
    },
    lengthened: {
      text: 'Cuello en extensión ligera, inclinado y rotado al lado contrario, con la primera costilla deprimida (hombro bajo y espiración).',
      cite: KAP,
    },
  },

  biomechanics: [
    {
      text: 'Entre el escaleno anterior y el medio queda el desfiladero interescalénico, por donde pasan el plexo braquial y la arteria subclavia. Un escaleno anterior hipertónico estrecha ese espacio: es el mecanismo del síndrome del desfiladero torácico neurógeno.',
      cite: DESC_DUF,
    },
    {
      text: 'En la respiración de reposo apenas participa; en la respiración alta o ansiosa se vuelve motor principal y termina sobrecargándose.',
      cite: NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa en el triángulo posterior, por detrás del borde posterior del ECOM y por encima de la clavícula. Presión SUAVE: el plexo braquial está inmediatamente por detrás.',
      cite: DUF,
    },
    position: {
      text: 'Paciente en supino: una inspiración corta y rápida lo hace tensarse bajo los dedos.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Escalenos medio y posterior; ECOM en la flexión e inclinación.', cite: KAP },
  ],
  antagonists: [
    { text: 'Escalenos y trapecio superior del lado contrario (inclinación).', cite: KAP },
  ],

  pathologies: [
    {
      text: 'Síndrome del desfiladero torácico: parestesias en el borde cubital de la mano que aumentan con el brazo elevado.',
      cite: MAG,
    },
  ],

  clinicalNotes: [
    {
      text: 'El nervio frénico desciende sobre su cara anterior: cualquier técnica sobre el escaleno anterior debe ser deliberadamente suave.',
      cite: DESC,
    },
  ],
};

const longusColli: MuscleContent = {
  id: 'longus-colli',
  nameEs: 'Largo del cuello',
  nameLat: 'Musculus longus colli',
  aliases: ['Longus colli', 'Longus cervicis'],
  group: 'Flexores profundos del cuello',

  origin: {
    text: 'Tres porciones (vertical, oblicua superior y oblicua inferior) sobre los cuerpos y las apófisis transversas de C3 a T3.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Tubérculo anterior del atlas, cuerpos vertebrales y tubérculos anteriores de las transversas cervicales altas.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Ramos ventrales directos de los nervios cervicales.', cite: DESC },
    roots: { text: 'C2-C6.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Flexiona la columna cervical y APLANA la lordosis, aproximando los cuerpos vertebrales entre sí.',
      cite: KAP_NEU,
    },
    {
      role: 'accessory',
      text: 'Colabora en la inclinación y en la rotación cervical con sus fascículos oblicuos.',
      cite: KAP,
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Retracción del mentón ("doble mentón") con la mirada al frente: la posición de trabajo de la flexión craneocervical.',
      cite: MAG,
    },
    lengthened: {
      text: 'Cabeza adelantada con extensión craneocervical, la postura de pantalla mantenida.',
      cite: MAG,
    },
  },

  biomechanics: [
    {
      text: 'Se aplica directamente sobre los cuerpos vertebrales, así que su vector es de COMPRESIÓN axial y no de palanca: estabiliza segmento a segmento en vez de generar movimiento amplio. Es el equivalente cervical del multífido lumbar.',
      cite: NEU,
    },
    {
      text: 'Junto al largo de la cabeza contrarresta la tracción extensora del ECOM y los escalenos; si falla, la lordosis cervical se acentúa y aparece la cabeza adelantada.',
      cite: KAP_NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'No es palpable con seguridad: está por delante de los cuerpos vertebrales, detrás de la vía aerodigestiva y del paquete vascular. Se evalúa por su FUNCIÓN, no por el tacto.',
      cite: DUF,
    },
    position: {
      text: 'Se valora con la prueba de flexión craneocervical (biofeedback de presión en supino), observando que el mentón se retraiga sin que se disparen ECOM ni escalenos.',
      cite: MAG,
    },
  },

  synergists: [
    { text: 'Largo de la cabeza, recto anterior de la cabeza y suprahioideos/infrahioideos.', cite: KAP },
  ],
  antagonists: [
    { text: 'Semiespinoso del cuello, esplenios, multífidos cervicales y suboccipitales.', cite: KAP },
  ],

  pathologies: [
    {
      text: 'Tras un latigazo cervical presenta inhibición y atrofia selectiva, con sustitución por el ECOM: su reentrenamiento es el eje del programa de control motor cervical.',
      cite: MAG,
    },
  ],

  clinicalNotes: [
    {
      text: 'Objetivo terapéutico prioritario en cervicalgia crónica y cefalea cervicogénica: se entrena con contracciones de baja carga y larga duración, nunca con abdominales cervicales bruscos.',
      cite: MAG,
    },
  ],
};

const rectusPosteriorMajorCapitis: MuscleContent = {
  id: 'rectus-posterior-major-capitis',
  nameEs: 'Recto posterior mayor de la cabeza',
  nameLat: 'Musculus rectus capitis posterior major',
  aliases: ['Recto posterior mayor'],
  group: 'Suboccipitales',

  origin: { text: 'Apófisis espinosa del axis (C2).', cite: DESC_DUF },
  insertion: {
    text: 'Mitad lateral de la línea nucal inferior del occipital.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Nervio suboccipital (ramo dorsal de C1).', cite: DESC },
    roots: { text: 'C1.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Extiende la cabeza sobre el atlas y rota la cara hacia el mismo lado sobre el eje del diente del axis.',
      cite: KAP,
    },
    {
      role: 'primary',
      text: 'Control fino y continuo de la posición de la cabeza: trabaja como sensor postural más que como motor.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Extensión craneocervical con rotación hacia el mismo lado (mirar hacia arriba y de lado).',
      cite: KAP,
    },
    lengthened: {
      text: 'Flexión craneocervical pura (retracción del mentón) con rotación al lado contrario.',
      cite: KAP,
    },
  },

  biomechanics: [
    {
      text: 'Los suboccipitales tienen la mayor densidad de husos neuromusculares del cuerpo: su papel es informar al SNC de la posición de la cabeza, integrándose con el sistema vestibular y ocular. Por eso su disfunción cursa con mareo cervicogénico, no solo con dolor.',
      cite: NEU,
    },
    {
      text: 'Junto con el oblicuo inferior y el oblicuo superior delimita el triángulo suboccipital, donde discurren la arteria vertebral y el nervio suboccipital.',
      cite: DESC_DUF,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se accede bajo la línea nucal inferior, entre la protuberancia occipital externa y la mastoides, atravesando el trapecio y el esplenio con presión progresiva.',
      cite: DUF,
    },
    position: {
      text: 'Paciente en supino con la cabeza apoyada en las manos del explorador: es la posición que relaja las capas superficiales y permite llegar al plano profundo.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Oblicuo superior e inferior de la cabeza, recto posterior menor.', cite: KAP },
  ],
  antagonists: [
    { text: 'Recto anterior de la cabeza y largo de la cabeza (flexores craneocervicales).', cite: KAP },
  ],

  pathologies: [
    {
      text: 'Cefalea cervicogénica: la tensión suboccipital mantenida refiere dolor hacia la órbita siguiendo el territorio de C1-C2.',
      cite: MAG,
    },
  ],

  clinicalNotes: [
    {
      text: 'La cabeza adelantada mantiene los suboccipitales en acortamiento permanente: sin corregir la posición del tronco, liberarlos da un alivio transitorio.',
      cite: MAG,
    },
  ],
};

const multifidusCervicis: MuscleContent = {
  id: 'multifidus-cervicis',
  nameEs: 'Multífido del cuello',
  nameLat: 'Musculus multifidus cervicis',
  aliases: ['Multifidus cervicis'],
  group: 'Transversoespinoso cervical',

  origin: { text: 'Apófisis articulares de C4 a C7.', cite: DESC_DUF },
  insertion: {
    text: 'Apófisis espinosas situadas dos a cuatro niveles por encima del origen.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Ramos dorsales de los nervios cervicales.', cite: DESC },
    roots: { text: 'C3-C7.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Estabilización segmentaria: controla el deslizamiento y la rotación de cada segmento cervical durante el movimiento.',
      cite: NEU,
    },
    {
      role: 'accessory',
      text: 'Extiende el cuello y lo rota levemente hacia el lado contrario.',
      cite: KAP,
    },
  ],

  functionalPositions: {
    shortened: { text: 'Extensión cervical con rotación al lado contrario.', cite: KAP },
    lengthened: { text: 'Flexión cervical con rotación al mismo lado.', cite: KAP },
  },

  biomechanics: [
    {
      text: 'Su brazo de palanca es mínimo pero su sección transversal es alta: está construido para RIGIDIZAR el segmento, no para moverlo. Es el par profundo del largo del cuello, uno por delante y otro por detrás del eje.',
      cite: NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se localiza en el canal paravertebral, inmediatamente lateral a las apófisis espinosas cervicales, bajo el semiespinoso.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Semiespinoso del cuello, rotadores e interespinosos; largo del cuello como par anterior.', cite: NEU },
  ],
  antagonists: [
    { text: 'Flexores profundos anteriores en la extensión; multífido contralateral en la rotación.', cite: KAP },
  ],

  pathologies: [
    {
      text: 'Presenta atrofia grasa segmentaria en cervicalgia crónica y tras latigazo, visible en resonancia y correlacionada con la persistencia del dolor.',
      cite: MAG,
    },
  ],

  clinicalNotes: [
    {
      text: 'Se reentrena con extensión craneocervical de baja carga en cuadrupedia o prono, no con extensiones cervicales amplias.',
      cite: MAG,
    },
  ],
};

/* ===========================================================================
 * THORACIC — hand-authored
 * ======================================================================== */

const longissimusThoracis: MuscleContent = {
  id: 'longissimus-thoracis',
  nameEs: 'Longísimo del tórax',
  nameLat: 'Musculus longissimus thoracis',
  aliases: ['Longissimus thoracis', 'Dorsal largo'],
  group: 'Erector espinal (columna intermedia)',

  origin: {
    text: 'Masa común: cara posterior del sacro, crestas ilíacas, apófisis espinosas lumbares y fascia toracolumbar.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Apófisis transversas torácicas y caras posteriores de las costillas, en todos los niveles.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Ramos dorsales de los nervios espinales, segmento a segmento.', cite: DESC },
    roots: { text: 'T1-T12.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Extensor antigravitatorio principal del tronco: sostiene la columna contra la gravedad en bipedestación y sedestación.',
      cite: KAP_NEU,
    },
    {
      role: 'primary',
      text: 'Unilateralmente inclina el tronco hacia el mismo lado.',
      cite: KAP,
    },
    {
      role: 'accessory',
      text: 'Controla EXCÉNTRICAMENTE el descenso del tronco al inclinarse hacia delante: ese es su trabajo cotidiano real.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Extensión del tronco en prono con las manos en la nuca (posición de trabajo del extensor).',
      cite: KAP,
    },
    lengthened: {
      text: 'Flexión completa del tronco con la pelvis fija: en el rango final el músculo se silencia eléctricamente y la carga pasa a la fascia y los ligamentos (fenómeno de flexión-relajación).',
      cite: NEU,
    },
  },

  biomechanics: [
    {
      text: 'Fenómeno de flexión-relajación: al llegar a la flexión completa del tronco el erector deja de emitir actividad EMG y el peso queda sostenido por estructuras pasivas. Es el momento de mayor vulnerabilidad para el disco y explica por qué se levantan pesos con la columna neutra.',
      cite: NEU,
    },
    {
      text: 'Por su distancia al eje, cada kilo sostenido lejos del cuerpo multiplica la fuerza que el erector debe generar y, con ella, la compresión discal.',
      cite: KAP_NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Forma los dos cordones verticales que flanquean las apófisis espinosas, más marcados en la unión toracolumbar.',
      cite: DUF,
    },
    position: {
      text: 'Paciente en prono: al despegar ligeramente el esternón de la camilla los cordones se endurecen bajo los dedos.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Iliocostal y espinoso (las otras dos columnas del erector), multífido y dorsal ancho.', cite: KAP },
  ],
  antagonists: [
    { text: 'Recto del abdomen, oblicuos y psoas mayor en la flexión del tronco.', cite: KAP },
  ],

  pathologies: [
    {
      text: 'Espasmo protector del erector en la lumbalgia aguda: rigidez en bloque y pérdida del fenómeno de flexión-relajación.',
      cite: MAG,
    },
  ],

  clinicalNotes: [
    {
      text: 'El atlas 3D lo modela segmentado en numerosos fascículos por nivel: en el cuerpo es una lámina continua, no un vientre único.',
      cite: DESC,
    },
  ],
};

const iliocostalisThoracis: MuscleContent = {
  id: 'iliocostalis-thoracis',
  nameEs: 'Iliocostal del tórax',
  nameLat: 'Musculus iliocostalis thoracis',
  aliases: ['Iliocostalis thoracis'],
  group: 'Erector espinal (columna lateral)',

  origin: { text: 'Ángulos de las costillas inferiores (7ª a 12ª).', cite: DESC_DUF },
  insertion: {
    text: 'Ángulos de las costillas superiores (1ª a 6ª) y apófisis transversa de C7.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Ramos dorsales de los nervios torácicos.', cite: DESC },
    roots: { text: 'T1-T6.', cite: DESC },
  },

  actions: [
    { role: 'primary', text: 'Extiende la columna torácica.', cite: KAP },
    {
      role: 'primary',
      text: 'Unilateralmente inclina el tronco hacia el mismo lado; es la columna del erector con mayor brazo de palanca frontal.',
      cite: KAP_NEU,
    },
    {
      role: 'accessory',
      text: 'Al insertarse en las costillas, colabora en descenderlas durante la espiración forzada.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: { text: 'Extensión torácica con inclinación hacia el mismo lado.', cite: KAP },
    lengthened: { text: 'Flexión torácica con inclinación hacia el lado contrario.', cite: KAP },
  },

  biomechanics: [
    {
      text: 'Es la más lateral de las tres columnas del erector: por eso su papel dominante es el control FRONTAL del tronco (inclinación y su freno excéntrico), más que la extensión pura.',
      cite: NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa lateral al longísimo, sobre los ángulos costales, a unos cuatro o cinco dedos de la línea de las espinosas.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Longísimo del tórax, iliocostal lumbar y cuadrado lumbar en la inclinación.', cite: KAP },
  ],
  antagonists: [
    { text: 'Iliocostal y oblicuos del lado contrario; pared abdominal en la flexión.', cite: KAP },
  ],

  clinicalNotes: [
    {
      text: 'Forma una cadena continua con el iliocostal lumbar y el cervical: una restricción torácica se manifiesta a menudo como tensión lumbar alta.',
      cite: DUF,
    },
  ],
};

const semispinalisThoracis: MuscleContent = {
  id: 'semispinalis-thoracis',
  nameEs: 'Semiespinoso del tórax',
  nameLat: 'Musculus semispinalis thoracis',
  aliases: ['Semispinalis thoracis'],
  group: 'Transversoespinoso torácico',

  origin: { text: 'Apófisis transversas de T6 a T10.', cite: DESC_DUF },
  insertion: {
    text: 'Apófisis espinosas de C6 a T4, cinco o seis niveles por encima del origen.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Ramos dorsales de los nervios torácicos.', cite: DESC },
    roots: { text: 'T1-T6.', cite: DESC },
  },

  actions: [
    { role: 'primary', text: 'Extiende la columna torácica y cervicotorácica.', cite: KAP },
    {
      role: 'primary',
      text: 'Unilateralmente rota el tronco hacia el lado CONTRARIO.',
      cite: KAP_NEU,
    },
  ],

  functionalPositions: {
    shortened: { text: 'Extensión torácica con rotación hacia el lado contrario.', cite: KAP },
    lengthened: { text: 'Flexión torácica con rotación hacia el mismo lado.', cite: KAP },
  },

  biomechanics: [
    {
      text: 'Es el fascículo más largo del transversoespinoso: cruza muchos niveles, así que actúa como un cable de refuerzo que reparte la extensión a lo largo de todo el segmento en vez de concentrarla.',
      cite: NEU,
    },
    {
      text: 'La rotación torácica es posible gracias a la orientación de las carillas articulares; el semiespinoso y los rotadores son sus motores, y por eso la región torácica rota mucho más que la lumbar.',
      cite: KAP,
    },
  ],

  palpation: {
    howTo: {
      text: 'Plano profundo: se percibe como resistencia firme en el canal paravertebral torácico alto, bajo el erector.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Rotadores, multífido torácico y oblicuo externo contralateral en la rotación.', cite: KAP },
  ],
  antagonists: [
    { text: 'Semiespinoso del lado contrario; recto del abdomen en la flexión.', cite: KAP },
  ],

  clinicalNotes: [
    {
      text: 'Su rigidez es un contribuyente frecuente a la pérdida de rotación torácica, que el paciente compensa con rotación lumbar o cervical.',
      cite: MAG,
    },
  ],
};

const rotatores: MuscleContent = {
  id: 'rotatores',
  nameEs: 'Rotadores',
  nameLat: 'Musculi rotatores',
  aliases: ['Rotatores', 'Rotadores del raquis'],
  group: 'Transversoespinoso profundo',

  origin: { text: 'Apófisis transversa de cada vértebra.', cite: DESC_DUF },
  insertion: {
    text: 'Lámina y base de la apófisis espinosa de la vértebra suprayacente (rotadores cortos, un nivel) o de la siguiente (rotadores largos, dos niveles).',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Ramos dorsales de los nervios espinales.', cite: DESC },
    roots: { text: 'T1-T12.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Función propioceptiva: informan al SNC de la posición de cada segmento vertebral. Es su papel dominante.',
      cite: NEU,
    },
    {
      role: 'accessory',
      text: 'Rotación segmentaria hacia el lado contrario y estabilización fina del nivel.',
      cite: KAP,
    },
  ],

  biomechanics: [
    {
      text: 'Su brazo de palanca es tan corto que la fuerza rotatoria que pueden generar es despreciable. Su densidad de husos neuromusculares, en cambio, es de las más altas del cuerpo: son sensores de posición vertebral, no motores.',
      cite: NEU,
    },
    {
      text: 'Están mejor desarrollados en la región torácica, la única del raquis con rotación amplia: donde hay más movimiento hace falta más información.',
      cite: KAP_NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'No son palpables de forma aislada: quedan bajo el erector y el multífido, directamente sobre la lámina vertebral.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Multífido, semiespinoso e interespinosos en la estabilización segmentaria.', cite: NEU },
  ],
  antagonists: [
    { text: 'Rotadores del lado contrario.', cite: KAP },
  ],

  clinicalNotes: [
    {
      text: 'El atlas 3D no los separa por nivel: se muestran como una banda continua, aunque en el cuerpo son pares independientes en cada segmento.',
      cite: DESC,
    },
  ],
};

const multifidusThoracis: MuscleContent = {
  id: 'multifidus-thoracis',
  nameEs: 'Multífido del tórax',
  nameLat: 'Musculus multifidus thoracis',
  aliases: ['Multifidus thoracis'],
  group: 'Transversoespinoso torácico',

  origin: { text: 'Apófisis transversas torácicas.', cite: DESC_DUF },
  insertion: {
    text: 'Apófisis espinosas dos a cuatro niveles por encima del origen.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Ramos dorsales de los nervios torácicos.', cite: DESC },
    roots: { text: 'T1-T12.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Estabilización segmentaria de la columna torácica durante el movimiento del tronco y de los brazos.',
      cite: NEU,
    },
    {
      role: 'accessory',
      text: 'Extensión y rotación contralateral del segmento.',
      cite: KAP,
    },
  ],

  functionalPositions: {
    shortened: { text: 'Extensión torácica con rotación al lado contrario.', cite: KAP },
    lengthened: { text: 'Flexión torácica con rotación al mismo lado.', cite: KAP },
  },

  biomechanics: [
    {
      text: 'Capa más profunda del transversoespinoso: junto con los rotadores forma el sistema local torácico, que se activa ANTES del movimiento del brazo para dar una base estable al hombro.',
      cite: NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se percibe como un relleno firme en el canal paravertebral, pegado a las espinosas torácicas, bajo el erector.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Rotadores, semiespinoso torácico e interespinosos.', cite: NEU },
  ],
  antagonists: [
    { text: 'Multífido contralateral en la rotación; pared abdominal en la flexión.', cite: KAP },
  ],

  clinicalNotes: [
    {
      text: 'En una hipomovilidad torácica dolorosa, el multífido torácico suele estar tanto rígido como mal reclutado: hay que devolver movilidad Y control, no solo estirar.',
      cite: MAG,
    },
  ],
};

/* ===========================================================================
 * LUMBAR — hand-authored
 * ======================================================================== */

const multifidusLumborum: MuscleContent = {
  id: 'multifidus-lumborum',
  nameEs: 'Multífido lumbar',
  nameLat: 'Musculus multifidus lumborum',
  aliases: ['Multifidus lumborum', 'Multífido'],
  group: 'Sistema local lumbopélvico',

  origin: {
    text: 'Cara posterior del sacro, apófisis mamilares lumbares y aponeurosis del erector espinal.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Apófisis espinosas dos a cuatro niveles por encima del origen.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: {
      text: 'Ramo dorsal medial del nervio espinal correspondiente; cada fascículo recibe UN solo nivel.',
      cite: DESC,
    },
    roots: { text: 'L1-L5 (y S1-S4 para los fascículos sacros).', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Control segmentario de la lordosis lumbar: impide el cizallamiento anterior de cada vértebra sobre la siguiente.',
      cite: NEU,
    },
    {
      role: 'primary',
      text: 'Extensión lumbar; es el extensor con mayor sección transversal de la región.',
      cite: KAP_NEU,
    },
    {
      role: 'accessory',
      text: 'Rotación segmentaria hacia el lado contrario, sobre todo como FRENO de la rotación producida por los oblicuos.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: { text: 'Extensión lumbar en prono con la pelvis estabilizada.', cite: KAP },
    lengthened: { text: 'Flexión lumbar completa con retroversión pélvica.', cite: KAP },
  },

  biomechanics: [
    {
      text: 'Su inervación uni-segmentaria lo convierte en el único músculo capaz de estabilizar un nivel concreto: por eso una radiculopatía de un solo nivel produce atrofia del multífido en ESE nivel, un signo localizador.',
      cite: NEU,
    },
    {
      text: 'Junto con el transverso del abdomen y el suelo pélvico forma el "sistema local": actúa por anticipación, con baja fuerza y de forma continua, antes que los grandes motores.',
      cite: NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa en la canal lumbar, inmediatamente lateral a las apófisis espinosas de L4-L5, como un relleno profundo y firme.',
      cite: DUF,
    },
    position: {
      text: 'Paciente en prono: se pide una elevación mínima del brazo contrario; el multífido se abomba bajo los dedos ANTES de que se mueva el brazo.',
      cite: MAG,
    },
  },

  synergists: [
    { text: 'Transverso del abdomen, suelo pélvico y diafragma (sistema local); erector espinal en la extensión.', cite: NEU },
  ],
  antagonists: [
    { text: 'Recto del abdomen y oblicuos en la flexión del tronco.', cite: KAP },
  ],

  pathologies: [
    {
      text: 'Atrofia grasa e inhibición refleja tras el primer episodio de lumbalgia; no se recupera de forma espontánea al ceder el dolor, lo que ayuda a explicar las recidivas.',
      cite: MAG,
    },
  ],

  clinicalNotes: [
    {
      text: 'Su reactivación específica es el núcleo del entrenamiento de control motor lumbopélvico: baja carga, alta repetición y foco en la anticipación, no en la fuerza máxima.',
      cite: MAG,
    },
  ],
};

const quadratusLumborum: MuscleContent = {
  id: 'quadratus-lumborum',
  nameEs: 'Cuadrado lumbar',
  nameLat: 'Musculus quadratus lumborum',
  aliases: ['Cuadrado de los lomos', 'Quadratus lumborum', 'QL'],
  group: 'Pared posterior lumbopélvica',

  origin: {
    text: 'Labio interno de la cresta ilíaca y ligamento iliolumbar.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Borde inferior de la 12ª costilla y apófisis transversas de L1 a L4.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Ramos del plexo lumbar y nervio subcostal.', cite: DESC },
    roots: { text: 'T12-L4.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Inclinación lateral del tronco hacia el mismo lado; es su acción definitoria.',
      cite: KAP,
    },
    {
      role: 'primary',
      text: 'Con el tronco fijo, ELEVA la hemipelvis del mismo lado (hip hiking): así se despeja el pie en la fase de oscilación de la marcha.',
      cite: NEU,
    },
    {
      role: 'accessory',
      text: 'Fija la 12ª costilla durante la inspiración, dando un punto de anclaje estable al diafragma.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Tronco inclinado hacia el mismo lado o pelvis elevada de ese lado (apoyo monopodal mantenido).',
      cite: KAP,
    },
    lengthened: {
      text: 'Inclinación del tronco hacia el lado contrario con la pelvis descendida de ese mismo lado: la posición de estiramiento clásica en decúbito lateral.',
      cite: KAP,
    },
  },

  biomechanics: [
    {
      text: 'Une pelvis, raquis lumbar y caja torácica: es el estabilizador FRONTAL del tronco. Su trabajo cotidiano es excéntrico, frenando la caída de la pelvis contralateral en cada paso.',
      cite: NEU,
    },
    {
      text: 'Al anclar la 12ª costilla se comporta como un músculo respiratorio indirecto: si está rígido, limita la excursión de la base torácica.',
      cite: NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se busca en el espacio entre la 12ª costilla y la cresta ilíaca, lateral al erector espinal, con el paciente en decúbito lateral y el tronco ligeramente inclinado.',
      cite: DUF,
    },
    position: {
      text: 'En decúbito lateral con un cojín bajo la cintura, se pide elevar la pelvis del lado superior: el vientre se endurece bajo los dedos.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Oblicuos, iliocostal lumbar y glúteo medio contralateral en el control frontal de la pelvis.', cite: NEU },
  ],
  antagonists: [
    { text: 'Cuadrado lumbar y oblicuos del lado contrario.', cite: KAP },
  ],

  pathologies: [
    {
      text: 'Causa frecuente de lumbalgia mecánica UNILATERAL, con dolor que aumenta al toser y al pasar de sedestación a bipedestación.',
      cite: MAG,
    },
    {
      text: 'Se sobrecarga cuando el glúteo medio contralateral es insuficiente: el tronco compensa la caída pélvica inclinándose, y el QL paga la cuenta.',
      cite: NEU,
    },
  ],

  clinicalNotes: [
    {
      text: 'Ante un QL persistentemente doloroso, revisa el control del glúteo medio y una posible dismetría de miembros inferiores antes de insistir en tratarlo localmente.',
      cite: MAG,
    },
  ],
};

const psoasMajor: MuscleContent = {
  id: 'psoas-major',
  nameEs: 'Psoas mayor',
  nameLat: 'Musculus psoas major',
  aliases: ['Psoas', 'Psoas major', 'Iliopsoas'],
  group: 'Iliopsoas',

  origin: {
    text: 'Caras laterales de los cuerpos y discos de T12 a L4, y apófisis transversas lumbares.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Trocánter menor del fémur, a través del tendón común del iliopsoas.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Ramos ventrales directos del plexo lumbar.', cite: DESC },
    roots: { text: 'L1-L3 (a veces L4).', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Flexor principal de la cadera, sobre todo por encima de los 90° de flexión, donde el resto de los flexores pierde eficacia.',
      cite: KAP_NEU,
    },
    {
      role: 'primary',
      text: 'Con el fémur fijo: flexiona el tronco sobre la pelvis y bascula la pelvis en ANTEVERSIÓN, acentuando la lordosis lumbar.',
      cite: KAP,
    },
    {
      role: 'accessory',
      text: 'Estabiliza el raquis lumbar en el plano frontal por su aplicación directa sobre los cuerpos vertebrales.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Cadera flexionada con lordosis lumbar aumentada: la sedestación prolongada.',
      cite: KAP,
    },
    lengthened: {
      text: 'Cadera en extensión con la pelvis en RETROVERSIÓN. Sin controlar la retroversión, el estiramiento se pierde en hiperlordosis lumbar.',
      cite: KAP,
    },
  },

  biomechanics: [
    {
      text: 'Es el único músculo que une el raquis lumbar con el fémur: cualquier alteración de la cadera se transmite a la columna a través de él, y viceversa.',
      cite: NEU,
    },
    {
      text: 'Su acortamiento es una de las cuatro piezas del síndrome cruzado inferior (psoas y erector lumbar cortos, glúteo mayor y abdominales inhibidos), que produce anteversión pélvica e hiperlordosis.',
      cite: MAG,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se aborda en supino, medial a la espina ilíaca anterosuperior y lateral al recto anterior, con una presión LENTA y progresiva por dentro del abdomen. Nunca sobre pulso arterial.',
      cite: DUF,
    },
    position: {
      text: 'Con las caderas y rodillas flexionadas para relajar la pared abdominal, se pide una flexión de cadera mínima: el vientre se tensa bajo los dedos.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Ilíaco (tendón común), recto anterior del cuádriceps, sartorio y tensor de la fascia lata.', cite: KAP },
  ],
  antagonists: [
    { text: 'Glúteo mayor e isquiotibiales (extensores de cadera); recto del abdomen en la báscula pélvica.', cite: KAP },
  ],

  pathologies: [
    {
      text: 'Su acortamiento limita la extensión de cadera: la prueba de Thomas es el test de referencia para objetivarlo.',
      cite: MAG,
    },
    {
      text: 'Un psoas rígido aumenta la compresión sobre los discos lumbares bajos y puede perpetuar una lumbalgia que no responde al tratamiento local.',
      cite: NEU,
    },
  ],

  clinicalNotes: [
    {
      text: 'No es un músculo "malo" que haya que estirar siempre: en la marcha y la carrera es un motor imprescindible. Evalúa longitud Y fuerza antes de decidir.',
      cite: NEU,
    },
  ],
};

const iliacus: MuscleContent = {
  id: 'iliacus',
  nameEs: 'Ilíaco',
  nameLat: 'Musculus iliacus',
  aliases: ['Iliacus'],
  group: 'Iliopsoas',

  origin: { text: 'Dos tercios superiores de la fosa ilíaca y ala del sacro.', cite: DESC_DUF },
  insertion: {
    text: 'Trocánter menor del fémur, por el tendón común del iliopsoas.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Nervio femoral, antes de su paso bajo el ligamento inguinal.', cite: DESC },
    roots: { text: 'L2-L3 (con aporte de L4).', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Flexor potente de la cadera; con el psoas forma el iliopsoas, el flexor más fuerte de la articulación.',
      cite: KAP_NEU,
    },
    {
      role: 'accessory',
      text: 'Con el fémur fijo, bascula la pelvis en anteversión.',
      cite: KAP,
    },
  ],

  functionalPositions: {
    shortened: { text: 'Cadera flexionada con la pelvis en anteversión.', cite: KAP },
    lengthened: { text: 'Cadera en extensión con la pelvis en retroversión.', cite: KAP },
  },

  biomechanics: [
    {
      text: 'A diferencia del psoas, NO cruza el raquis: su acortamiento bascula la pelvis pero no comprime directamente los discos lumbares. Distinguirlos importa a la hora de razonar una lumbalgia.',
      cite: NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa por dentro del borde de la cresta ilíaca, deslizando los dedos hacia la fosa ilíaca con la pared abdominal relajada.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Psoas mayor (tendón común), recto anterior, sartorio y tensor de la fascia lata.', cite: KAP },
  ],
  antagonists: [
    { text: 'Glúteo mayor e isquiotibiales.', cite: KAP },
  ],

  clinicalNotes: [
    {
      text: 'La prueba de Thomas modificada ayuda a separar la retracción del iliopsoas (cadera que no baja) de la del recto anterior (rodilla que no se flexiona).',
      cite: MAG,
    },
  ],
};

const rectusAbdominis: MuscleContent = {
  id: 'rectus-abdominis',
  nameEs: 'Recto del abdomen',
  nameLat: 'Musculus rectus abdominis',
  aliases: ['Recto anterior del abdomen', 'Rectus abdominis'],
  group: 'Pared abdominal (plano anterior)',

  origin: { text: 'Cresta del pubis y sínfisis púbica.', cite: DESC_DUF },
  insertion: {
    text: 'Cartílagos costales 5º a 7º y apófisis xifoides del esternón.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Nervios intercostales inferiores (ramos anteriores torácicos).', cite: DESC },
    roots: { text: 'T7-T12.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Flexión del tronco: aproxima el esternón al pubis. Es el flexor más potente de la pared abdominal.',
      cite: KAP,
    },
    {
      role: 'primary',
      text: 'Retroversión pélvica cuando el tórax queda fijo: es el freno directo de la anteversión del psoas.',
      cite: KAP_NEU,
    },
    {
      role: 'accessory',
      text: 'Aumenta la presión intraabdominal en la espiración forzada, la tos y el esfuerzo.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: { text: 'Tronco flexionado con la pelvis en retroversión.', cite: KAP },
    lengthened: {
      text: 'Extensión del tronco sobre un apoyo (posición de esfinge o pelota), con la pelvis en anteversión.',
      cite: KAP,
    },
  },

  biomechanics: [
    {
      text: 'Sus intersecciones tendinosas lo dividen en vientres en serie: permiten que se acorte por tramos y aumentan su resistencia a la presión intraabdominal.',
      cite: DESC,
    },
    {
      text: 'Es un músculo GLOBAL: mueve el tronco pero no estabiliza segmentos. Trabajarlo aisladamente sin transverso ni multífido da fuerza sin control.',
      cite: NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa a ambos lados de la línea alba, entre el pubis y el reborde costal; las intersecciones tendinosas se notan como surcos transversales.',
      cite: DUF,
    },
    position: {
      text: 'En supino con las rodillas flexionadas, al despegar la cabeza y los hombros los vientres se marcan de inmediato.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Oblicuos externo e interno en la flexión del tronco; psoas mayor en la flexión del tronco sobre la pelvis.', cite: KAP },
  ],
  antagonists: [
    { text: 'Erector espinal y multífido lumbar.', cite: KAP },
  ],

  pathologies: [
    {
      text: 'Diástasis de rectos: separación de los vientres por distensión de la línea alba, frecuente en el posparto; se evalúa midiendo la distancia interrecto en flexión activa.',
      cite: MAG,
    },
  ],

  clinicalNotes: [
    {
      text: 'En rehabilitación lumbopélvica se entrena DESPUÉS de recuperar el control del transverso y del multífido, no antes.',
      cite: MAG,
    },
  ],
};

const externalOblique: MuscleContent = {
  id: 'external-oblique',
  nameEs: 'Oblicuo externo del abdomen',
  nameLat: 'Musculus obliquus externus abdominis',
  aliases: ['Oblicuo mayor', 'External oblique'],
  group: 'Pared abdominal (plano superficial)',

  origin: {
    text: 'Cara externa de las costillas 5ª a 12ª, entrelazado con el serrato anterior y el dorsal ancho.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Mitad anterior de la cresta ilíaca, ligamento inguinal y línea alba a través de su aponeurosis.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Nervios intercostales inferiores.', cite: DESC },
    roots: { text: 'T7-T12.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Unilateralmente: rota el tronco hacia el lado CONTRARIO e inclina hacia el mismo lado.',
      cite: KAP_NEU,
    },
    { role: 'primary', text: 'Bilateralmente: flexiona el tronco y retroversa la pelvis.', cite: KAP },
    { role: 'accessory', text: 'Aumenta la presión intraabdominal en la espiración forzada y la tos.', cite: NEU },
  ],

  functionalPositions: {
    shortened: { text: 'Tronco flexionado, inclinado al mismo lado y rotado al contrario.', cite: KAP },
    lengthened: { text: 'Extensión con inclinación al lado contrario y rotación hacia el mismo lado.', cite: KAP },
  },

  biomechanics: [
    {
      text: 'Sus fibras van hacia abajo y adelante ("mano en el bolsillo"). Se continúan con las del oblicuo INTERNO contralateral formando un cinturón cruzado que envuelve el tronco: por eso la rotación se entrena en diagonal, no en un solo plano.',
      cite: KAP_NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa en la cara lateral del abdomen, entre el reborde costal y la cresta ilíaca, por fuera del recto.',
      cite: DUF,
    },
    position: {
      text: 'En supino con rodillas flexionadas, al llevar un hombro hacia la rodilla contraria el oblicuo externo de ese hombro se contrae.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Oblicuo interno CONTRALATERAL en la rotación; recto del abdomen en la flexión.', cite: KAP },
  ],
  antagonists: [
    { text: 'Oblicuo externo contralateral; multífido y erector en la extensión.', cite: KAP },
  ],

  clinicalNotes: [
    {
      text: 'Es el plano más superficial y amplio: su borde libre inferior forma el ligamento inguinal, referencia de la región inguinal.',
      cite: DESC,
    },
  ],
};

const internalOblique: MuscleContent = {
  id: 'internal-oblique',
  nameEs: 'Oblicuo interno del abdomen',
  nameLat: 'Musculus obliquus internus abdominis',
  aliases: ['Oblicuo menor', 'Internal oblique'],
  group: 'Pared abdominal (plano medio)',

  origin: {
    text: 'Fascia toracolumbar, dos tercios anteriores de la cresta ilíaca y mitad lateral del ligamento inguinal.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Bordes inferiores de las costillas 10ª a 12ª, línea alba y cresta del pubis por su aponeurosis.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Nervios intercostales inferiores y primer nervio lumbar.', cite: DESC },
    roots: { text: 'T7-L1.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Unilateralmente: rota el tronco hacia el MISMO lado e inclina hacia el mismo lado. Es el espejo del oblicuo externo.',
      cite: KAP_NEU,
    },
    { role: 'primary', text: 'Bilateralmente: flexiona el tronco y comprime la pared abdominal.', cite: KAP },
    {
      role: 'accessory',
      text: 'Sus fibras posteriores, ancladas en la fascia toracolumbar, colaboran en la estabilización lumbar.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: { text: 'Tronco flexionado, inclinado y rotado hacia el mismo lado.', cite: KAP },
    lengthened: { text: 'Extensión con inclinación y rotación hacia el lado contrario.', cite: KAP },
  },

  biomechanics: [
    {
      text: 'Sus fibras son perpendiculares a las del oblicuo externo. Cada rotación del tronco es obra del oblicuo interno de un lado y del externo del otro: un par cruzado que también comprime el abdomen mientras gira.',
      cite: KAP_NEU,
    },
    {
      text: 'Su anclaje en la fascia toracolumbar le da un papel estabilizador que el oblicuo externo no tiene.',
      cite: NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa profundo al oblicuo externo, en la cara lateral del abdomen, por encima de la cresta ilíaca.',
      cite: DUF,
    },
    position: {
      text: 'En supino, al llevar un hombro hacia la rodilla del MISMO lado se contrae el oblicuo interno de ese lado.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Oblicuo externo CONTRALATERAL en la rotación; transverso del abdomen en la compresión.', cite: KAP },
  ],
  antagonists: [
    { text: 'Oblicuo interno contralateral; erector espinal en la extensión.', cite: KAP },
  ],

  clinicalNotes: [
    {
      text: 'Sus fibras más bajas forman, junto al transverso, el tendón conjunto: refuerzo de la pared posterior del conducto inguinal.',
      cite: DESC,
    },
  ],
};

const transversusAbdominis: MuscleContent = {
  id: 'transversus-abdominis',
  nameEs: 'Transverso del abdomen',
  nameLat: 'Musculus transversus abdominis',
  aliases: ['Transverso', 'Transversus abdominis', 'TrA'],
  group: 'Sistema local lumbopélvico',

  origin: {
    text: 'Fascia toracolumbar, labio interno de la cresta ilíaca, tercio lateral del ligamento inguinal y cartílagos costales 7º a 12º.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Línea alba y cresta del pubis a través de su aponeurosis.',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Nervios intercostales inferiores y primer nervio lumbar.', cite: DESC },
    roots: { text: 'T7-L1.', cite: DESC },
  },

  actions: [
    {
      role: 'primary',
      text: 'Comprime el contenido abdominal y aumenta la presión intraabdominal; NO produce movimiento del raquis.',
      cite: KAP_NEU,
    },
    {
      role: 'primary',
      text: 'Tensa la fascia toracolumbar y rigidiza el raquis lumbar: es el mecanismo de "cinturón" del sistema local.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: {
      text: 'Contracción de baja intensidad llevando el ombligo hacia dentro sin mover la pelvis ni la caja torácica.',
      cite: MAG,
    },
    lengthened: {
      text: 'Pared abdominal distendida por presión visceral o embarazo; en esa longitud pierde eficacia de compresión.',
      cite: NEU,
    },
  },

  biomechanics: [
    {
      text: 'Se activa ANTES del movimiento del brazo o la pierna (activación anticipatoria o feed-forward), preparando la columna antes de que llegue la carga. En el dolor lumbar crónico esa anticipación se retrasa, y el retraso es el hallazgo, no la debilidad.',
      cite: NEU,
    },
    {
      text: 'Sus fibras horizontales no tienen brazo de palanca para mover el raquis: su efecto es puramente de compresión y tensión fascial, como una faja.',
      cite: KAP_NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa medial a la espina ilíaca anterosuperior, un par de dedos por dentro, con presión muy superficial: se busca una tensión suave y simétrica, no un abombamiento.',
      cite: MAG,
    },
    position: {
      text: 'En supino con rodillas flexionadas: al espirar suavemente y llevar el ombligo hacia dentro debe notarse tensión sin que el oblicuo externo salte ni la pelvis bascule.',
      cite: MAG,
    },
  },

  synergists: [
    { text: 'Multífido lumbar, diafragma y suelo pélvico: los cuatro componentes del sistema local.', cite: NEU },
  ],
  antagonists: [
    {
      text: 'No tiene un antagonista directo en el sentido clásico: su acción es de compresión, no de movimiento.',
      cite: NEU,
    },
  ],

  pathologies: [
    {
      text: 'Retraso en su activación anticipatoria en la lumbalgia crónica y tras el embarazo, con pérdida de la estabilización previa al movimiento.',
      cite: MAG,
    },
  ],

  clinicalNotes: [
    {
      text: 'Se entrena con contracciones suaves (en torno al 20-30% del máximo) mantenidas y coordinadas con la respiración. Contraer con fuerza recluta los oblicuos y anula el objetivo.',
      cite: MAG,
    },
  ],
};

const iliocostalisLumborum: MuscleContent = {
  id: 'iliocostalis-lumborum',
  nameEs: 'Iliocostal lumbar',
  nameLat: 'Musculus iliocostalis lumborum',
  aliases: ['Iliocostalis lumborum'],
  group: 'Erector espinal (columna lateral)',

  origin: {
    text: 'Masa común: cresta sacra, cresta ilíaca y fascia toracolumbar.',
    cite: DESC_DUF,
  },
  insertion: {
    text: 'Ángulos de las seis costillas inferiores (7ª a 12ª).',
    cite: DESC_DUF,
  },
  innervation: {
    nerve: { text: 'Ramos dorsales de los nervios lumbares.', cite: DESC },
    roots: { text: 'L1-L3.', cite: DESC },
  },

  actions: [
    { role: 'primary', text: 'Extensor potente del raquis lumbar.', cite: KAP },
    {
      role: 'primary',
      text: 'Unilateralmente inclina el tronco hacia el mismo lado, con un brazo de palanca frontal amplio.',
      cite: KAP_NEU,
    },
    {
      role: 'accessory',
      text: 'Frena excéntricamente la flexión anterior del tronco al inclinarse hacia delante.',
      cite: NEU,
    },
  ],

  functionalPositions: {
    shortened: { text: 'Extensión lumbar con inclinación hacia el mismo lado.', cite: KAP },
    lengthened: { text: 'Flexión lumbar con inclinación hacia el lado contrario.', cite: KAP },
  },

  biomechanics: [
    {
      text: 'Es la columna más lateral y caudal del erector: junto con el cuadrado lumbar controla el plano frontal de la región lumbar y sostiene la pelvis en el apoyo monopodal.',
      cite: NEU,
    },
  ],

  palpation: {
    howTo: {
      text: 'Se palpa lateral al longísimo, en la zona lumbar alta, entre la cresta ilíaca y las últimas costillas.',
      cite: DUF,
    },
  },

  synergists: [
    { text: 'Longísimo del tórax, multífido lumbar y cuadrado lumbar.', cite: KAP },
  ],
  antagonists: [
    { text: 'Recto del abdomen y oblicuos; iliocostal contralateral en la inclinación.', cite: KAP },
  ],

  clinicalNotes: [
    {
      text: 'Su tensión unilateral acompaña muchas lumbalgias mecánicas: distingue si es la causa o una respuesta protectora antes de tratarlo de forma aislada.',
      cite: MAG,
    },
  ],
};

/* ===========================================================================
 * ASSEMBLY
 * Every muscle gets a derived base record; the hand-authored ones override it.
 * ======================================================================== */

/** Merge hand-authored records on top of the adapter-derived base index. */
function withAuthored(
  base: MuscleContentIndex,
  authored: MuscleContent[],
): MuscleContentIndex {
  const out: MuscleContentIndex = { ...base };
  for (const c of authored) out[c.id] = c;
  return out;
}

/** The abdominal wall + QL drive thoracic ROM; mirror musclesByRegion.ts. */
const THORACIC_SHARED_TRUNK = new Set([
  'rectus-abdominis',
  'external-oblique',
  'internal-oblique',
  'quadratus-lumborum',
]);
const thoracicSharedTrunkMuscles = lumbarMuscles.filter((m) =>
  THORACIC_SHARED_TRUNK.has(m.id),
);

const CERVICAL_AUTHORED: MuscleContent[] = [
  sternocleidomastoid,
  levatorScapulae,
  spleniusCapitis,
  scalenusAnterior,
  longusColli,
  rectusPosteriorMajorCapitis,
  multifidusCervicis,
];

const THORACIC_AUTHORED: MuscleContent[] = [
  longissimusThoracis,
  iliocostalisThoracis,
  semispinalisThoracis,
  rotatores,
  multifidusThoracis,
  // shared trunk muscles, so a thoracic click resolves to real content
  rectusAbdominis,
  externalOblique,
  internalOblique,
  quadratusLumborum,
];

const LUMBAR_AUTHORED: MuscleContent[] = [
  iliocostalisLumborum,
  multifidusLumborum,
  quadratusLumborum,
  psoasMajor,
  iliacus,
  rectusAbdominis,
  externalOblique,
  internalOblique,
  transversusAbdominis,
];

/** Cervical muscle content index (store.region === 'cervical'). */
export const CERVICAL_MUSCLES: MuscleContentIndex = withAuthored(
  contentIndexFromMuscles(cervicalMuscles),
  CERVICAL_AUTHORED,
);

/** Thoracic muscle content index (store.region === 'thoracic'). */
export const THORACIC_MUSCLES: MuscleContentIndex = withAuthored(
  contentIndexFromMuscles([...thoracicMuscles, ...thoracicSharedTrunkMuscles]),
  THORACIC_AUTHORED,
);

/** Lumbar muscle content index (store.region === 'lumbar'). */
export const LUMBAR_MUSCLES: MuscleContentIndex = withAuthored(
  contentIndexFromMuscles(lumbarMuscles),
  LUMBAR_AUTHORED,
);
