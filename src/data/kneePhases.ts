// src/data/kneePhases.ts
//
// The 7-phase pedagogical track for the KNEE. See src/types/pedagogy.ts.
// Mirrors the structure of src/data/elbowPhases.ts exactly.
//
// AUTHORING / ENCODING RULE:
//   - User-facing `text` strings (text, title, name, intro, prompt, caption,
//     rangeLabel, finding, vignette, etc.): proper Latin American Spanish WITH
//     accents and enie, in UTF-8. This is product copy and must read correctly.
//   - Code, ids, keys, enum-like values (id, movementId, ref, role, view,
//     scope, *MuscleIds, *TestIds, kind, side) and comments: ASCII only.
//   - Editor MUST save as UTF-8 without BOM.
//
// STATUS / AUTHORING NOTES (read before extending):
//   - Phases 1-3 (anatomy / biomechanics / palpation) only declare the ordered
//     muscle ids and which MuscleContent field groups to surface. The text
//     comes from KNEE_MUSCLES at render time.
//   - The biomechanics phase carries guided gestures (flexion, extension,
//     tibial internal/external rotation): step-by-step narrations that drive
//     the live 3D model (highlight by role + camera).
//   - Phases 4-7 (tests / pathology / treatment / case) carry full DRAFT
//     content, standard textbook material structured for teaching, pending
//     (a) expert review and (b) page verification. EVERY locator stays
//     pageVerified:false. Never invent a page.
//   - Muscle ids are kebab-case, aligned with KNEE_MUSCLES / muscles/knee.ts.
//   - GuideStepMarker.kind only admits 'abduction-arc' | 'gh-axis' | 'none'
//     (shoulder-specific arcs). All knee guides use 'none'.
//   - CameraView valid values: anterior, posterior, lateral-right,
//     lateral-left, superior, three-quarter.

import type {
  RegionTrack,
  PerMusclePhase,
  TestsPhase,
  PathologyPhase,
  TreatmentPhase,
  CasePhase,
  GestureGuide,
} from '../types/pedagogy';

/* ---------------------------------------------------------------------------
 * Ordered muscle ids for the per-muscle phases (teaching sequence):
 * quadriceps -> hamstrings -> triceps surae / posterior -> pes anserinus.
 * ------------------------------------------------------------------------ */
const KNEE_MUSCLE_ORDER: string[] = [
  'rectus-femoris',
  'vastus-lateralis',
  'vastus-medialis',
  'vastus-intermedius',
  'biceps-femoris',
  'semitendinosus',
  'semimembranosus',
  'gastrocnemius',
  'soleus',
  'plantaris',
  'popliteus',
  'sartorius',
  'gracilis',
];

/* ===========================================================================
 * GUIDED GESTURES (biomechanics phase)
 * ===========================================================================
 * Right side by default. Draft content (pageVerified:false).
 * ======================================================================== */

const FLEXION_GUIDE: GestureGuide = {
  movementId: 'knee-flexion',
  name: 'Flexión',
  intro: {
    text: 'La flexión de la rodilla parte de una articulación bloqueada en extensión. Antes de que los isquiotibiales puedan flexionar, el poplíteo debe "desbloquear" la rodilla rotando la tibia hacia dentro. Recorre los pasos para ver el orden real del movimiento.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'popliteus-unlock',
      title: 'El poplíteo desbloquea la rodilla',
      rangeLabel: 'Inicio (0-20 grados)',
      caption: {
        text: 'En extensión completa la rodilla está bloqueada por el mecanismo de tornillo: la tibia quedó rotada externamente. El poplíteo rota la tibia internamente y deshace ese bloqueo, condición previa para que comience cualquier flexión. Es la "llave de contacto" de la rodilla.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'popliteus', role: 'prime-mover' },
        { id: 'biceps-femoris', role: 'assistant' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'hamstrings-drive',
      title: 'Los isquiotibiales conducen la flexión',
      rangeLabel: 'Rango medio (20-90 grados)',
      caption: {
        text: 'Desbloqueada la rodilla, los tres isquiotibiales se vuelven los motores de la flexión. La cabeza corta del bíceps femoral, uniarticular, flexiona con independencia de la posición de la cadera; el resto, biarticular, es más eficaz con la cadera flexionada (preestiramiento).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'biceps-femoris', role: 'prime-mover' },
        { id: 'semitendinosus', role: 'prime-mover' },
        { id: 'semimembranosus', role: 'prime-mover' },
        { id: 'gastrocnemius', role: 'assistant' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'flexion-end',
      title: 'Final del arco',
      rangeLabel: 'Final (90-140 grados)',
      caption: {
        text: 'Cerca de la flexión máxima el movimiento lo frenan el contacto de la pantorrilla con el muslo y la tensión del cuádriceps. Los isquiotibiales trabajan acortados, con eficacia decreciente por insuficiencia activa.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'biceps-femoris', role: 'prime-mover' },
        { id: 'semitendinosus', role: 'assistant' },
        { id: 'semimembranosus', role: 'assistant' },
      ],
      view: 'lateral-right',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const EXTENSION_GUIDE: GestureGuide = {
  movementId: 'knee-extension',
  name: 'Extensión',
  intro: {
    text: 'La extensión devuelve la rodilla a la posición neutra. El cuádriceps es el único extensor, y en los últimos grados aparece el mecanismo de tornillo, que bloquea la rodilla con bajo coste muscular. Observa el papel especial del vasto medial oblicuo.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  steps: [
    {
      id: 'quadriceps-drive',
      title: 'El cuádriceps extiende',
      rangeLabel: 'Rango medio (90-30 grados)',
      caption: {
        text: 'Los cuatro vientres del cuádriceps tiran de la rótula y, vía tendón rotuliano, extienden la tibia. Es su tramo de mayor ventaja mecánica. El recto femoral solo aporta bien si la cadera está extendida; con la cadera flexionada sufre insuficiencia activa.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'vastus-lateralis', role: 'prime-mover' },
        { id: 'vastus-medialis', role: 'prime-mover' },
        { id: 'vastus-intermedius', role: 'prime-mover' },
        { id: 'rectus-femoris', role: 'assistant' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'vmo-lock',
      title: 'El VMO y el bloqueo final',
      rangeLabel: 'Final (30-0 grados)',
      caption: {
        text: 'Los últimos 30 grados son los más exigentes. El vasto medial oblicuo asegura que la rótula no se desplace lateralmente, y la tibia rota externamente de forma automática: la rodilla se bloquea. En bipedestación relajada, los ligamentos sostienen la posición casi sin músculo.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'vastus-medialis', role: 'prime-mover' },
        { id: 'rectus-femoris', role: 'assistant' },
        { id: 'vastus-lateralis', role: 'assistant' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const INTERNAL_ROTATION_GUIDE: GestureGuide = {
  movementId: 'knee-internal-rotation',
  name: 'Rotación interna de la tibia',
  intro: {
    text: 'La rotación de la tibia solo es posible con la rodilla flexionada. Hacia dentro la lideran los músculos mediales; este reparto explica por qué la pata de ganso protege la cara medial de la rodilla. Se enseña con la rodilla a 90 grados.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'medial-rotators',
      title: 'Rotadores internos mediales',
      rangeLabel: 'Inicio (0-15 grados)',
      caption: {
        text: 'El poplíteo inicia la rotación interna (su acción de desbloqueo), seguido del semitendinoso y el semimembranoso. Todos cruzan la rodilla por su cara medial o posterior y giran la tibia hacia dentro.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'popliteus', role: 'prime-mover' },
        { id: 'semitendinosus', role: 'prime-mover' },
        { id: 'semimembranosus', role: 'assistant' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'none' },
    },
    {
      id: 'pes-anserinus',
      title: 'La pata de ganso completa el giro',
      rangeLabel: 'Final (15-30 grados)',
      caption: {
        text: 'El sartorio y el gracilis, con el semitendinoso, forman la pata de ganso medial. Completan la rotación interna y, sobre todo, frenan dinámicamente el valgo y la rotación externa forzada, protegiendo el ligamento cruzado anterior.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      muscles: [
        { id: 'semitendinosus', role: 'prime-mover' },
        { id: 'sartorius', role: 'assistant' },
        { id: 'gracilis', role: 'assistant' },
      ],
      view: 'anterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

const EXTERNAL_ROTATION_GUIDE: GestureGuide = {
  movementId: 'knee-external-rotation',
  name: 'Rotación externa de la tibia',
  intro: {
    text: 'Hacia fuera, la tibia tiene un solo motor activo: el bíceps femoral, el isquiotibial lateral. Compáralo con la riqueza de rotadores internos para entender por qué el control rotacional de la rodilla es asimétrico.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
  steps: [
    {
      id: 'biceps-femoris-rotator',
      title: 'El bíceps femoral, rotador externo único',
      rangeLabel: 'Todo el rango (0-40 grados)',
      caption: {
        text: 'Con la rodilla flexionada, el bíceps femoral es el único motor de la rotación externa de la tibia: tira de la cabeza del peroné hacia atrás y afuera. Los rotadores internos actúan como antagonistas que frenan el final del movimiento.',
        cite: [{ ref: 'kapandji', pageVerified: false }],
      },
      muscles: [
        { id: 'biceps-femoris', role: 'prime-mover' },
        { id: 'popliteus', role: 'stabilizer' },
      ],
      view: 'posterior',
      side: 'right',
      marker: { kind: 'none' },
    },
  ],
};

/* ===========================================================================
 * PHASES 1-3 - per-muscle projections
 * ======================================================================== */

const anatomy: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: KNEE_MUSCLE_ORDER,
  fields: ['origin', 'insertion', 'innervation'],
  intro: {
    text: 'La rodilla la mueven cuatro familias musculares: el cuádriceps (único extensor), los isquiotibiales (flexores biarticulares y rotadores), el tríceps sural con el poplíteo (flexión y desbloqueo) y la pata de ganso medial. Reconoce primero de dónde viene y a dónde va cada uno.',
    cite: [{ ref: 'gray', pageVerified: false }],
  },
};

const biomechanics: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: KNEE_MUSCLE_ORDER,
  fields: ['actions', 'biomechanics', 'synergists', 'antagonists'],
  guides: [
    FLEXION_GUIDE,
    EXTENSION_GUIDE,
    INTERNAL_ROTATION_GUIDE,
    EXTERNAL_ROTATION_GUIDE,
  ],
  intro: {
    text: 'La biomecánica de la rodilla gira en torno a dos ideas: el mecanismo de tornillo (que bloquea la rodilla en extensión y la libera el poplíteo) y el carácter biarticular de casi todos sus motores, que crea insuficiencias activas y pasivas. Recorre las guías de cada movimiento.',
    cite: [{ ref: 'kapandji', pageVerified: false }],
  },
};

const palpation: PerMusclePhase = {
  scope: 'per-muscle',
  muscleIds: KNEE_MUSCLE_ORDER,
  fields: ['palpation', 'functionalPositions'],
  intro: {
    text: 'Muchas estructuras de la rodilla son superficiales y palpables: el tendón rotuliano, los tendones de la pata de ganso, el hueco poplíteo. Aprende a localizarlas con la rodilla flexionada, que tensa los tendones y los hace destacar.',
    cite: [{ ref: 'gray', pageVerified: false }],
  },
};

/* ===========================================================================
 * PHASE 4 - TESTS (region-level)
 * ======================================================================== */

const tests: TestsPhase = {
  scope: 'region',
  intro: {
    text: 'La exploración de la rodilla combina pruebas ligamentarias (cajones, estrés en valgo/varo), meniscales (McMurray) y de aparato extensor. Una respuesta positiva rara vez es binaria: importa el grado de bostezo, el punto final y el dolor frente a la inestabilidad.',
    cite: [{ ref: 'oatis', pageVerified: false }],
  },
  tests: [
    {
      id: 'lachman',
      name: 'Prueba de Lachman',
      assesses: {
        text: 'Integridad del ligamento cruzado anterior (LCA). Es la prueba más sensible para su lesión.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Con la rodilla en 20-30 grados de flexión, se estabiliza el fémur con una mano y con la otra se tracciona la tibia proximal hacia delante.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Desplazamiento anterior aumentado de la tibia con punto final blando o ausente, comparado con el lado sano.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      grading: {
        painVsWeakness: {
          text: 'Lo que importa no es el dolor sino el punto final: un tope firme sugiere LCA íntegro; un tope blando o ausente, rotura. Comparar siempre con el lado contralateral.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
        grades: [
          {
            finding: 'Desplazamiento leve con punto final firme',
            interpretation: {
              text: 'LCA probablemente íntegro o lesión parcial; laxitud fisiológica si es simétrica.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
          {
            finding: 'Desplazamiento marcado con punto final blando',
            interpretation: {
              text: 'Sugiere rotura completa del LCA.',
              cite: [{ ref: 'oatis', pageVerified: false }],
            },
          },
        ],
      },
      targetMuscleIds: ['semitendinosus', 'sartorius', 'gracilis'],
    },
    {
      id: 'anterior-drawer',
      name: 'Cajón anterior',
      assesses: {
        text: 'Integridad del LCA con la rodilla flexionada a 90 grados.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Paciente en decúbito supino, rodilla a 90 grados y pie fijo; el explorador tracciona la tibia proximal hacia delante con ambas manos.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Desplazamiento anterior excesivo de la tibia respecto al fémur frente al lado sano.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      targetMuscleIds: ['biceps-femoris', 'semitendinosus', 'semimembranosus'],
    },
    {
      id: 'posterior-drawer',
      name: 'Cajón posterior',
      assesses: {
        text: 'Integridad del ligamento cruzado posterior (LCP).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'En la misma posición del cajón anterior, se empuja la tibia proximal hacia atrás. Observar primero el signo del escalón (caída posterior de la tibia en reposo).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Desplazamiento posterior aumentado de la tibia; pérdida del relieve normal de la meseta tibial.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      targetMuscleIds: ['gastrocnemius', 'popliteus'],
    },
    {
      id: 'valgus-stress',
      name: 'Estrés en valgo',
      assesses: {
        text: 'Integridad del ligamento colateral medial (LCM).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Se aplica una fuerza en valgo (empujando la rodilla hacia la línea media) primero en extensión completa y luego a 30 grados de flexión.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Apertura (bostezo) medial aumentada. El bostezo a 30 grados aísla el LCM; el bostezo en extensión completa implica también estructuras capsulares y cruzados.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      targetMuscleIds: ['sartorius', 'gracilis', 'semitendinosus'],
    },
    {
      id: 'mcmurray',
      name: 'Prueba de McMurray',
      assesses: {
        text: 'Lesión meniscal (rotura del menisco medial o lateral).',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      procedure: {
        text: 'Con la rodilla en flexión máxima, se combina rotación de la tibia con extensión progresiva: rotación externa para el menisco medial, interna para el lateral.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      positiveSign: {
        text: 'Chasquido o resalte doloroso palpable en la interlínea durante la maniobra.',
        cite: [{ ref: 'oatis', pageVerified: false }],
      },
      targetMuscleIds: ['popliteus', 'semimembranosus'],
    },
  ],
};

/* ===========================================================================
 * PHASE 5 - PATHOLOGY (region-level)
 * ======================================================================== */

const pathology: PathologyPhase = {
  scope: 'region',
  intro: {
    text: 'Las lesiones de rodilla más frecuentes en fisioterapia van del traumatismo deportivo agudo (LCA, menisco) al dolor por sobreuso (femoropatelar, tendinopatías). Reconocer el mecanismo lesional orienta el tratamiento.',
    cite: [{ ref: 'dufour', pageVerified: false }],
  },
  pathologies: [
    {
      id: 'acl-rupture',
      name: 'Rotura del ligamento cruzado anterior',
      description: {
        text: 'Lesión del LCA, típicamente por un giro con el pie fijo (desaceleración + valgo + rotación). Frecuente en deportes de pivote. A menudo se acompaña de derrame inmediato (hemartros) y sensación de fallo.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Crujido audible en el momento de la lesión, derrame en horas, inestabilidad ("la rodilla se va"). Lachman y Pivot-shift positivos.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['semitendinosus', 'gracilis', 'sartorius', 'biceps-femoris'],
      relatedTestIds: ['lachman', 'anterior-drawer'],
    },
    {
      id: 'meniscal-tear',
      name: 'Lesión meniscal',
      description: {
        text: 'Rotura del fibrocartílago meniscal, por traumatismo rotacional en el joven o degenerativa en el adulto mayor. El menisco medial, más fijo, se lesiona con más frecuencia.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor en la interlínea, derrame de aparición lenta, bloqueos y chasquidos. McMurray positivo.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['popliteus', 'semimembranosus'],
      relatedTestIds: ['mcmurray'],
    },
    {
      id: 'patellofemoral-pain',
      name: 'Síndrome femoropatelar',
      description: {
        text: 'Dolor anterior de rodilla por mal rastreo (tracking) de la rótula en su tróclea, a menudo por desequilibrio entre el vasto medial oblicuo (débil) y el vasto lateral / tensor de la fascia lata (tensos), valgo dinámico y debilidad de la cadera.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor peri o retrorrotuliano al subir/bajar escaleras, al ponerse en cuclillas y tras estar mucho tiempo sentado (signo del cine).',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['vastus-medialis', 'vastus-lateralis', 'rectus-femoris'],
    },
    {
      id: 'hamstring-strain',
      name: 'Tirón de isquiotibiales',
      description: {
        text: 'Desgarro miotendinoso de los isquiotibiales, típico del sprint (fase final de la oscilación, contracción excéntrica). La cabeza larga del bíceps femoral es la más afectada.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor súbito posterior de muslo durante la carrera, a veces con hematoma; dolor a la flexión resistida y al estiramiento.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['biceps-femoris', 'semitendinosus', 'semimembranosus'],
      relatedTestIds: ['anterior-drawer'],
    },
    {
      id: 'pes-anserine-tendinopathy',
      name: 'Tendinopatía / bursitis de la pata de ganso',
      description: {
        text: 'Dolor en la cara medial de la tibia proximal, distal a la interlínea, por sobreuso o fricción de los tendones de sartorio, gracilis y semitendinoso. Frecuente en corredores y en mujeres con valgo.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      presentation: {
        text: 'Dolor medial a la palpación de la pata de ganso, que empeora al subir escaleras; se diferencia del dolor meniscal medial por su localización más distal.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedMuscleIds: ['sartorius', 'gracilis', 'semitendinosus'],
    },
  ],
};

/* ===========================================================================
 * PHASE 6 - TREATMENT (region-level)
 * ======================================================================== */

const treatment: TreatmentPhase = {
  scope: 'region',
  intro: {
    text: 'El tratamiento de la rodilla se apoya en el control neuromuscular: reequilibrar el cuádriceps y la cadena posterior, recuperar el control del valgo dinámico y restaurar la propiocepción. La cirugía resuelve la estructura; la fisioterapia, la función.',
    cite: [{ ref: 'dufour', pageVerified: false }],
  },
  principles: [
    {
      id: 'vmo-quadriceps-balance',
      title: 'Reequilibrar el cuádriceps y el rastreo rotuliano',
      rationale: {
        text: 'En el dolor femoropatelar, el objetivo no es solo fortalecer el cuádriceps sino reequilibrar la tracción medial (VMO) frente a la lateral. Se combinan ejercicios en cadena cinética cerrada (control del valgo) con trabajo del glúteo medio.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      examples: [
        {
          text: 'Sentadillas controladas con alineación de rodilla sobre el pie, evitando el valgo dinámico.',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
        {
          text: 'Activación del glúteo medio (la debilidad de cadera proyecta el valgo a la rodilla).',
          cite: [{ ref: 'dufour', pageVerified: false }],
        },
      ],
      relatedPathologyIds: ['patellofemoral-pain'],
    },
    {
      id: 'hamstring-eccentric',
      title: 'Trabajo excéntrico de isquiotibiales',
      rationale: {
        text: 'El tirón de isquiotibiales ocurre en la contracción excéntrica de alta velocidad. La prevención y la rehabilitación priorizan el fortalecimiento excéntrico progresivo (p. ej. Nordic hamstring) para tolerar esa demanda.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedPathologyIds: ['hamstring-strain'],
    },
    {
      id: 'acl-neuromuscular',
      title: 'Control neuromuscular tras lesión del LCA',
      rationale: {
        text: 'Con o sin cirugía, el resultado depende de recuperar el control dinámico de la rodilla: propiocepción, fuerza del cuádriceps y de los isquiotibiales (que asisten al LCA frenando el cajón anterior) y reeducación del gesto de aterrizaje y giro.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      examples: [
        {
          text: 'Co-contracción cuádriceps-isquiotibiales para estabilizar la traslación tibial.',
          cite: [{ ref: 'oatis', pageVerified: false }],
        },
      ],
      relatedPathologyIds: ['acl-rupture'],
    },
    {
      id: 'load-management',
      title: 'Gestión de carga en tendinopatías',
      rationale: {
        text: 'Las tendinopatías (pata de ganso, rotuliana) responden a la modificación de carga y al ejercicio progresivo, no al reposo absoluto. Se ajusta el volumen de entrenamiento y se introduce trabajo isométrico y excéntrico tolerable.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      relatedPathologyIds: ['pes-anserine-tendinopathy'],
    },
  ],
};

/* ===========================================================================
 * PHASE 7 - CLINICAL CASE (region-level, integrative)
 * ======================================================================== */

const cases: CasePhase = {
  scope: 'region',
  cases: [
    {
      id: 'acl-pivot-injury',
      title: 'Giro con el pie fijo en una jugadora de fútbol',
      vignette: {
        text: 'Mujer de 22 años, futbolista. Al girar para cambiar de dirección con el pie clavado, nota un crujido y dolor inmediato en la rodilla derecha, que se hincha en pocas horas. Refiere que la rodilla "se le va" al apoyar. Acude a la semana con derrame y limitación.',
        cite: [{ ref: 'dufour', pageVerified: false }],
      },
      steps: [
        {
          id: 'mechanism',
          prompt: '¿Qué estructura sugiere el mecanismo lesional?',
          answer: {
            text: 'El giro con el pie fijo combinando valgo y rotación es el mecanismo clásico de rotura del LCA. El crujido, el derrame rápido (hemartros) y la sensación de fallo refuerzan la sospecha.',
            cite: [{ ref: 'dufour', pageVerified: false }],
          },
          muscleIds: ['semitendinosus', 'biceps-femoris'],
        },
        {
          id: 'tests-step',
          prompt: '¿Qué pruebas confirman la sospecha?',
          answer: {
            text: 'La prueba de Lachman es la más sensible: buscamos desplazamiento anterior con punto final blando. El cajón anterior la complementa a 90 grados. Siempre se compara con la rodilla sana.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          testIds: ['lachman', 'anterior-drawer'],
        },
        {
          id: 'why-hamstrings',
          prompt: '¿Por qué los isquiotibiales son clave en la rehabilitación?',
          answer: {
            text: 'Los isquiotibiales son agonistas del LCA: al traccionar la tibia hacia atrás frenan el cajón anterior que el ligamento roto ya no controla. Fortalecerlos y entrenar la co-contracción con el cuádriceps estabiliza dinámicamente la rodilla.',
            cite: [{ ref: 'oatis', pageVerified: false }],
          },
          muscleIds: ['biceps-femoris', 'semitendinosus', 'semimembranosus'],
        },
        {
          id: 'graft',
          prompt: 'Si se opta por cirugía, ¿de dónde sale el injerto habitual?',
          answer: {
            text: 'Una opción frecuente es el injerto de isquiotibiales (semitendinoso, a menudo con el gracilis), tomado de la pata de ganso. La rehabilitación debe contar con la debilidad transitoria de estos flexores donantes.',
            cite: [{ ref: 'dufour', pageVerified: false }],
          },
          muscleIds: ['semitendinosus', 'gracilis'],
        },
      ],
    },
  ],
};

/* ===========================================================================
 * THE KNEE TRACK
 * ======================================================================== */

export const KNEE_TRACK: RegionTrack = {
  regionId: 'knee',
  regionName: 'Rodilla',
  phases: {
    anatomy,
    biomechanics,
    palpation,
    tests,
    pathology,
    treatment,
    case: cases,
  },
};
