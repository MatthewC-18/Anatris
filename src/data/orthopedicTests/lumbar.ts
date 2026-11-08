// src/data/orthopedicTests/lumbar.ts
//
// LUMBAR orthopedic special tests, grouped by clinical target: radiculopatía /
// hernia discal lumbar (tests neurodinámicos), inestabilidad lumbar y dolor
// sacroilíaco (clúster de Laslett).
//
// Same encoding + honesty rules as the other regions: metrics are POINT
// ESTIMATES (%) with a `note` for the spread. Values were CHECKED against the
// primary sources (verified: true + locator) where a defensible point estimate
// exists; the individual sacroiliac tests keep verified: false (the exact
// per-test figures need confirmation against Laslett's tables) and lean on the
// CLUSTER, which is verified.
//
// Sources (see references.ts): Devillé 2000 (SLR/Lasègue + cruzado), Majlesi
// 2008 (Slump), Suri 2011 (tensión femoral / reverse SLR), Kasai 2006 (extensión
// lumbar pasiva), Hicks 2005 (inestabilidad en prono), Laslett 2005 (clúster SI).
//
// DEMO note: the lumbar rig drives the LUMBAR SPINE only (flexión/extensión/
// inclinación/rotación). Neurodynamic tests are hip + nerve-tension maneuvers and
// SI provocation tests load the pelvis, so those either approximate the lumbar
// position with an honest `note` or omit the demo (the pelvis-only SI tests).

// ESTADO DE LA VERIFICACION (2026-11-04). Las tres citas que quedaban sin
// comprobar en esta region estan resueltas, y una de ellas ensenaba numeros de
// un estudio que no los publica.
//
//   slr-lasegue             91% / 26%  ->  igual, pero con el contraste medido
//   femoral-nerve-stretch   50% / 100% ->  CONFIRMADAS (Suri 2011, Tabla 3)
//   prone-instability-test  72% / 58%  ->  nota: Hicks 2005 no es diagnostico
//
// Hicks 2005 no mide si el test de inestabilidad en prono acierta un
// diagnostico: mide si predice la RESPUESTA a ocho semanas de ejercicio de
// estabilizacion. Es un estudio pronostico, y presentarlo como precision
// diagnostica confunde dos cosas distintas.
//
// Y de Suri 2011 sale el mejor material docente de esta region: el mismo
// Lasegue da 69% / 84% si lo que se busca es compresion de L5-S1 y 16% / 31%
// si se busca L2-L4, sobre los MISMOS 57 pacientes y con el mismo explorador
// ciego a la resonancia. No es que una cifra este mal: es que una prueba no
// tiene una cifra, tiene una por pregunta.

import type { OrthopedicTest } from '../../types/orthopedicTest';

const tests: OrthopedicTest[] = [
  // ==================== RADICULOPATÍA / HERNIA DISCAL LUMBAR ====================
  {
    id: 'slr-lasegue',
    name: 'Elevación de la pierna recta (Lasègue)',
    aka: ['SLR', 'Straight leg raise', 'Lasègue'],
    region: 'lumbar',
    category: 'Radiculopatía lumbar (hernia discal)',
    target: 'Raíces L4-S1 / nervio ciático',
    purpose: 'Detectar tensión radicular por hernia discal lumbar baja.',
    maneuver:
      'Paciente en supino; el explorador eleva la pierna con la rodilla extendida hasta reproducir los síntomas (habitualmente entre 30° y 70°).',
    positive:
      'Dolor irradiado por debajo de la rodilla siguiendo el dermatoma (no solo dolor lumbar o isquiotibial) entre ~30° y 70°.',
    metrics: {
      sensitivity: 91,
      specificity: 26,
      note: 'Las dos cifras del metanálisis de Devillé, con hernia discal quirúrgica como patrón. Pero el mismo Lasègue vale otra cosa si lo que se busca es OTRA raíz: frente a la RM (Suri, 57 pacientes, explorador ciego), da 69% / 84% para la compresión L5-S1 y 16% / 31% para la L2-L4. No es contradicción: es que una prueba no tiene una cifra, tiene una por pregunta.',
    },
    utility: 'rule-out',
    interpretation:
      'Muy sensible (SnNout): un negativo hace poco probable la hernia con compromiso radicular. Un positivo es inespecífico (isquiotibiales, cadera) y debe confirmarse.',
    pearl:
      'La sensibilización con dorsiflexión del tobillo (Bragard) o flexión cervical orienta a origen neural frente a tensión muscular.',
    demo: {
      cannotShow:
        'El nervio ciático y las raíces L4-S1 no se pueden encender: el rig no trae raíces, y de los nervios del miembro inferior solo tiene las ramas del peroneo, con un material que las deja en una capa que el laboratorio no muestra. Lo que se demuestra es la puesta en tensión.',
      // LA MANIOBRA ES FLEXION DE CADERA CON LA RODILLA EXTENDIDA, no flexion
      // lumbar: el Lasegue pone en tension el ciatico elevando la pierna recta,
      // y el raquis no se mueve. Esto ensenaba `lumbar-flexion@25`, con una
      // nota que admitia que el modelo "solo muestra el raquis lumbar", y
      // ademas era la MISMA pose que el Lasegue cruzado.
      movementId: 'hip-flexion',
      angleDeg: 60,
      side: 'R',
      note: 'La rodilla se mantiene extendida: el modelo parte del reposo, que ya lo está. La banda que interesa es 30-70°.',
    },
    cite: [
      { ref: 'deville-2000', verified: true, locator: 'metaanálisis, SLR ipsilateral' },
      {
        // Resuelto 2026-11-04: el resumen solo da razones de verosimilitud,
        // pero el texto completo esta abierto en PMC2978791 y las cifras estan
        // en la Tabla 3.
        ref: 'suri-2011',
        verified: true,
        locator: 'Tabla 3: Lasègue 69%/84% en L5-S1 y 16%/31% en L2-L4',
      },
    ],
  },
  {
    id: 'crossed-slr',
    name: 'Elevación cruzada de la pierna recta',
    aka: ['Crossed SLR', 'XSLR', 'Lasègue contralateral'],
    region: 'lumbar',
    category: 'Radiculopatía lumbar (hernia discal)',
    target: 'Raíces L4-S1 (hernia central/grande)',
    purpose: 'Confirmar hernia discal con compromiso radicular.',
    maneuver:
      'En supino, el explorador eleva la pierna SANA (asintomática) con la rodilla extendida.',
    positive:
      'Reproducción del dolor radicular en la pierna SINTOMÁTICA al elevar la sana.',
    metrics: {
      sensitivity: 29,
      specificity: 88,
      note: 'Devillé 2000: 29/88. Poco sensible, muy específico.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico (SpPin): un positivo confirma con fuerza una hernia discal (a menudo central/grande). Un negativo no la descarta.',
    pearl:
      'Un SLR cruzado positivo se asocia a hernias más grandes y a mejores resultados quirúrgicos: dato relevante para la derivación.',
    demo: {
      cannotShow:
        'El nervio ciático y las raíces L4-S1 no se pueden encender: el rig no trae raíces, y de los nervios del miembro inferior solo tiene las ramas del peroneo, con un material que las deja en una capa que el laboratorio no muestra. Lo que se demuestra es la puesta en tensión.',
      // Lo que distingue al cruzado es QUE PIERNA se eleva: la sana. Por eso el
      // lado es el contrario al del Lasegue, y por eso las dos demostraciones
      // ya no son el mismo clip.
      movementId: 'hip-flexion',
      angleDeg: 60,
      side: 'L',
      note: 'Se eleva la pierna SANA (el modelo levanta la contraria a la del Lasègue); el positivo es el dolor en la pierna sintomática.',
    },
    cite: [{ ref: 'deville-2000', verified: true, locator: 'metaanálisis, SLR cruzado' }],
  },
  {
    id: 'slump',
    name: 'Test de Slump',
    aka: ['Slump'],
    region: 'lumbar',
    category: 'Radiculopatía lumbar (hernia discal)',
    target: 'Neurodinamia del tracto neural (ciático)',
    purpose: 'Provocar la mecanosensibilidad del sistema nervioso en sedestación.',
    maneuver:
      'Sentado, se encadena flexión de la columna (dorsal + lumbar), flexión cervical, extensión de la rodilla y dorsiflexión del tobillo; se libera la flexión cervical para diferenciar.',
    positive:
      'Reproducción de los síntomas que se modifican al liberar la flexión cervical (respuesta neural).',
    metrics: {
      sensitivity: 84,
      specificity: 83,
      note: 'Majlesi 2008: 84/83. Más sensible que el SLR y bien equilibrado.',
    },
    utility: 'balanced',
    interpretation:
      'Sensibilidad y especificidad equilibradas y altas: aporta al cribado y a la confirmación. La modulación con la flexión cervical distingue el origen neural del musculoesquelético.',
    demo: {
      cannotShow:
        'Es neurodinamia: el tracto neural no está en ninguna capa que el laboratorio pueda mostrar. Lo que se demuestra es la secuencia con la que se pone en tensión.',
      movementId: 'lumbar-flexion',
      angleDeg: 40,
      note: 'El componente lumbar es la flexión ("slump"); la maniobra añade flexión cervical y extensión de rodilla con dorsiflexión.',
    },
    cite: [{ ref: 'majlesi-2008', verified: true, locator: 'Slump 0.84 / 0.83' }],
  },
  {
    id: 'femoral-nerve-stretch',
    name: 'Tensión del nervio femoral (Lasègue invertido)',
    aka: ['Femoral nerve stretch', 'Reverse SLR', 'Prone knee bend'],
    region: 'lumbar',
    category: 'Radiculopatía lumbar (hernia discal)',
    target: 'Raíces L2-L4 / nervio femoral',
    purpose: 'Detectar radiculopatía lumbar ALTA (L2-L4).',
    maneuver:
      'En prono (o decúbito lateral), el explorador flexiona la rodilla y/o extiende la cadera para tensar el nervio femoral.',
    positive: 'Dolor en la cara anterior del muslo siguiendo el territorio femoral.',
    metrics: {
      sensitivity: 50,
      specificity: 100,
      // El intervalo que la propia nota cita: 88-100. Con el extremo bajo, la
      // LR+ pasa de infinita a 4,2 y el panel puede dar una cifra conservadora
      // en vez de publicar una certeza que el estudio no sostiene.
      specificityCiLow: 88,
      note: 'Las dos cifras de la Tabla 3 de Suri 2011 (57 pacientes, explorador CIEGO a la resonancia): 50% (IC 31-69) y 100% (IC 88-100) para la compresión L2-L4, con razón de verosimilitud positiva infinita, porque no hubo ni un falso positivo. Acotada al nivel L3 sube a 70% / 88%. Y la versión CRUZADA, igual de específica (100%) pero con 5% de sensibilidad, dio positivo en un solo paciente de la serie: no se puede contar con ella.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico y moderadamente sensible: un positivo apoya con fuerza la radiculopatía lumbar alta. Útil cuando el dolor es anterior (muslo) y el SLR es negativo.',
    pearl:
      'Falsos positivos por acortamiento del recto femoral/psoas o patología de cadera: interpreta el dolor por su territorio anterior.',
    // LA PRUEBA ES DE RODILLA Y CADERA, en prono.
    //
    // Lo que habia posaba una extension lumbar de 20 grados, de pie: no es la
    // maniobra ni la posicion. La maniobra --flexion de rodilla con extension de
    // cadera-- el rig la conduce entera, y son dos huesos distintos (shin_flex y
    // femur_base), asi que se sostienen a la vez.
    demo: {
      cannotShow:
        'El nervio femoral y las raíces L2-L4 no están en el rig. Lo que se demuestra es la posición que los pone en tensión.',
      components: [{ movementId: 'hip-extension', angleDeg: 15 }],
      movementId: 'knee-flexion',
      angleDeg: 90,
      side: 'R',
      note: 'La rodilla se flexiona y la cadera se extiende, que es lo que tensa el nervio femoral. La prueba se hace en PRONO: el modelo lo muestra de pie, así que mira los ángulos, no la postura global.',
    },

    cite: [
      {
        ref: 'suri-2011',
        verified: true,
        locator: 'Tabla 3: 50% (31-69) / 100% (88-100), LR+ infinito; Tabla 4: L3 70%/88%',
      },
    ],
  },

  // ========================== INESTABILIDAD LUMBAR ==========================
  {
    id: 'passive-lumbar-extension',
    name: 'Extensión lumbar pasiva',
    aka: ['Passive lumbar extension', 'PLE'],
    region: 'lumbar',
    category: 'Inestabilidad lumbar',
    target: 'Inestabilidad segmentaria lumbar',
    purpose: 'Detectar inestabilidad lumbar (espondilolistesis, degenerativa).',
    maneuver:
      'En prono, el explorador eleva ambas piernas juntas unos 30 cm manteniendo las rodillas extendidas, extendiendo pasivamente la columna lumbar.',
    positive:
      'Dolor lumbar intenso, sensación de "que la espalda se sale" o pesadez que desaparece al bajar las piernas.',
    metrics: {
      sensitivity: 84,
      specificity: 90,
      note: 'Kasai 2006: 84/90. El test aislado más preciso para inestabilidad lumbar.',
    },
    utility: 'rule-in',
    interpretation:
      'Sensibilidad y especificidad altas: de los pocos tests de inestabilidad con buen rendimiento en ambas direcciones. Un positivo apoya con fuerza la inestabilidad.',
    demo: {
      cannotShow:
        'La inestabilidad segmentaria no es una estructura: es un comportamiento del segmento. No hay nada que encender, y el rig tampoco traslada una vértebra sobre otra.',
      movementId: 'lumbar-extension',
      angleDeg: 30,
      note: 'La elevación pasiva de las piernas en prono extiende la columna lumbar, que es lo que muestra el modelo.',
    },
    cite: [{ ref: 'kasai-2006', verified: true, locator: 'PLE 84.2 / 90.4' }],
  },
  {
    id: 'prone-instability-test',
    name: 'Test de inestabilidad en prono',
    aka: ['Prone instability test', 'PIT'],
    region: 'lumbar',
    category: 'Inestabilidad lumbar',
    target: 'Inestabilidad segmentaria lumbar',
    purpose: 'Valorar si la activación muscular reduce el dolor del segmento inestable.',
    maneuver:
      'Con el tronco en la camilla y los pies apoyados en el suelo, se aplica presión posteroanterior sobre el segmento doloroso; luego el paciente levanta los pies (activa la musculatura) y se repite.',
    positive: 'Dolor con los pies apoyados que DISMINUYE al levantarlos y activar la musculatura.',
    metrics: {
      note: 'SIN cifras de diagnóstico, y por un motivo de fondo: el estudio que se le cita (Hicks 2005, 54 pacientes con lumbalgia no radicular) no mide si la prueba acierta un diagnóstico, sino si predice la RESPUESTA a ocho semanas de ejercicio de estabilización. Las que circulaban (72% / 58%) no están en él. Lo que sí publica es una regla con seis variables -- edad, Lasègue, esta prueba, movimientos aberrantes, hipermovilidad lumbar y creencias de miedo-evitación -- con razón de verosimilitud 4,0 para predecir el éxito y 0,18 para el fracaso.',
    },
    utility: 'weak',
    interpretation:
      'Precisión moderada aislado. Su valor real es pronóstico: un positivo predice buena respuesta a un programa de estabilización lumbar.',
    // SIN DEMO, Y ESTA ES LA RAZON.
    //
    // La prueba son dos presiones posteroanteriores sobre el mismo segmento, una
    // con los pies en el suelo y otra con el paciente sosteniendolos en el aire;
    // lo que la interpreta es la DIFERENCIA entre las dos. Ni la presion ni la
    // posicion en camilla con los pies colgando se pueden posar, y lo que tenia
    // --una extension lumbar de 18 grados, de pie-- no es ninguna de las dos
    // fases: la extension no forma parte de la maniobra.
    //
    // La extension lumbar pasiva, que SI consiste en eso, conserva su demo.

    noDemo:
      'La prueba compara la presión posteroanterior sobre el segmento con el paciente relajado y luego activando: ni esa presión ni la activación voluntaria se pueden reproducir, y el rig tampoco traslada una vértebra.',
    cite: [
      {
        ref: 'hicks-2005',
        verified: true,
        locator: 'Regla de predicción de respuesta: LR+ 4,0 / LR− 0,18 (no es precisión diagnóstica)',
      },
    ],
  },

  // ============================ DOLOR SACROILÍACO ============================
  {
    id: 'si-thigh-thrust',
    name: 'Empuje del muslo (thigh thrust)',
    aka: ['Thigh thrust', 'Posterior shear', 'P4'],
    region: 'lumbar',
    category: 'Dolor sacroilíaco (clúster de Laslett)',
    target: 'Articulación sacroilíaca',
    purpose: 'Provocar dolor sacroilíaco por cizallamiento posterior.',
    maneuver:
      'En supino, cadera a 90° de flexión; el explorador aplica una fuerza posterior a lo largo del fémur transmitiéndola a la sacroilíaca.',
    positive: 'Reproducción del dolor sacroilíaco familiar del paciente.',
    metrics: {
      sensitivity: 88,
      specificity: 69,
      note: 'Laslett 2005 (valor individual por confirmar). El más sensible del clúster.',
    },
    utility: 'balanced',
    interpretation:
      'Test de provocación individual: interpreta dentro del clúster de Laslett, no aislado. Sensible, aporta al cribado sacroilíaco.',
    noDemo:
      'La fuerza es una traslación posterior a través del fémur sobre la sacroilíaca: el rig no traslada, y su sacro no tiene articulación sacroilíaca conducida.',
    cite: [{
        ref: 'laslett-2005',
        verified: false,
        // Comprobado 2026-08-06 (PMID 16038856): el resumen SOLO publica el
        // compuesto -- 3 o mas de 6 tests positivos = 94% / 78%. Las cifras
        // por test individual estan en las tablas del texto completo.
        locator: 'PENDIENTE: el resumen solo da el compuesto (3+/6 = 94/78); cifras por test en el texto completo',
      }],
  },
  {
    id: 'si-distraction',
    name: 'Distracción sacroilíaca',
    aka: ['Distraction', 'Gapping'],
    region: 'lumbar',
    category: 'Dolor sacroilíaco (clúster de Laslett)',
    target: 'Articulación sacroilíaca (ligamentos anteriores)',
    purpose: 'Provocar dolor sacroilíaco por apertura anterior.',
    maneuver:
      'En supino, el explorador aplica una fuerza posterolateral sobre ambas espinas ilíacas anterosuperiores.',
    positive: 'Reproducción del dolor sacroilíaco familiar.',
    metrics: {
      sensitivity: 60,
      specificity: 81,
      note: 'Laslett 2005 (valor individual por confirmar). Más específico que el empuje del muslo.',
    },
    utility: 'balanced',
    interpretation:
      'Test de provocación específico. Laslett: si la distracción y el empuje del muslo son ambos positivos, casi no hace falta más exploración sacroilíaca.',
    noDemo:
      'Es una fuerza de apertura sobre las dos espinas ilíacas anterosuperiores: no hay ángulo que posar, y la pelvis del modelo es una pieza rígida.',
    cite: [{
        ref: 'laslett-2005',
        verified: false,
        // Comprobado 2026-08-06 (PMID 16038856): el resumen SOLO publica el
        // compuesto -- 3 o mas de 6 tests positivos = 94% / 78%. Las cifras
        // por test individual estan en las tablas del texto completo.
        locator: 'PENDIENTE: el resumen solo da el compuesto (3+/6 = 94/78); cifras por test en el texto completo',
      }],
  },
  {
    id: 'si-compression',
    name: 'Compresión sacroilíaca',
    aka: ['Compression'],
    region: 'lumbar',
    category: 'Dolor sacroilíaco (clúster de Laslett)',
    target: 'Articulación sacroilíaca (ligamentos posteriores)',
    purpose: 'Provocar dolor sacroilíaco por compresión.',
    maneuver:
      'En decúbito lateral, el explorador aplica una fuerza vertical descendente sobre la cresta ilíaca hacia la camilla.',
    positive: 'Reproducción del dolor sacroilíaco familiar.',
    metrics: {
      sensitivity: 69,
      specificity: 69,
      note: 'Laslett 2005 (valor individual por confirmar).',
    },
    utility: 'balanced',
    interpretation:
      'Provocación individual de valor moderado: úsala como parte del clúster, no de forma aislada.',
    noDemo:
      'Es una compresión vertical sobre la cresta ilíaca: el modelo no comprime y la pelvis no se deforma.',
    cite: [{
        ref: 'laslett-2005',
        verified: false,
        // Comprobado 2026-08-06 (PMID 16038856): el resumen SOLO publica el
        // compuesto -- 3 o mas de 6 tests positivos = 94% / 78%. Las cifras
        // por test individual estan en las tablas del texto completo.
        locator: 'PENDIENTE: el resumen solo da el compuesto (3+/6 = 94/78); cifras por test en el texto completo',
      }],
  },
  {
    id: 'si-sacral-thrust',
    name: 'Empuje sacro (sacral thrust)',
    aka: ['Sacral thrust'],
    region: 'lumbar',
    category: 'Dolor sacroilíaco (clúster de Laslett)',
    target: 'Articulación sacroilíaca',
    purpose: 'Provocar dolor sacroilíaco por cizallamiento anterior del sacro.',
    maneuver:
      'En prono, el explorador aplica una fuerza anterior sobre la línea media del sacro.',
    positive: 'Reproducción del dolor sacroilíaco familiar.',
    metrics: {
      sensitivity: 63,
      specificity: 75,
      note: 'Laslett 2005 (valor individual por confirmar).',
    },
    utility: 'balanced',
    interpretation:
      'Provocación individual: aporta dentro del clúster. Un clúster con 3 o más pruebas positivas orienta a origen sacroilíaco.',
    noDemo:
      'Es un empuje anterior sobre la línea media del sacro: una traslación, que el rig no hace.',
    cite: [{
        ref: 'laslett-2005',
        verified: false,
        // Comprobado 2026-08-06 (PMID 16038856): el resumen SOLO publica el
        // compuesto -- 3 o mas de 6 tests positivos = 94% / 78%. Las cifras
        // por test individual estan en las tablas del texto completo.
        locator: 'PENDIENTE: el resumen solo da el compuesto (3+/6 = 94/78); cifras por test en el texto completo',
      }],
  },
  {
    id: 'si-gaenslen',
    name: 'Maniobra de Gaenslen',
    aka: ['Gaenslen'],
    region: 'lumbar',
    category: 'Dolor sacroilíaco (clúster de Laslett)',
    target: 'Articulación sacroilíaca',
    purpose: 'Provocar dolor sacroilíaco por torsión (una cadera en hiperflexión, otra en extensión).',
    maneuver:
      'En supino al borde de la camilla, una cadera en flexión máxima sobre el pecho y la otra pierna en extensión colgando; se fuerzan ambos extremos.',
    positive: 'Reproducción del dolor sacroilíaco familiar.',
    metrics: {
      sensitivity: 53,
      specificity: 71,
      note: 'Laslett 2005 (valor individual por confirmar). Puede confundirse con dolor de cadera o lumbar.',
    },
    utility: 'weak',
    interpretation:
      'Precisión limitada aislada: interpreta solo dentro del clúster de Laslett. Comparte falsos positivos con la cadera y la columna lumbar.',
    pearl:
      'Clúster de Laslett (distracción, empuje del muslo, compresión, thrust sacro, Gaenslen): con 3 o más positivos, sens ~91% y esp ~78%. Usa el botón "Combinar".',
    noDemo:
      'Pide las dos caderas a la vez en direcciones opuestas (una en flexión máxima, la otra colgando en extensión) y los seis movimientos de cadera del rig mueven el mismo hueso: solo se puede posar uno cada vez.',
    cite: [{
        ref: 'laslett-2005',
        verified: false,
        // Comprobado 2026-08-06 (PMID 16038856): el resumen SOLO publica el
        // compuesto -- 3 o mas de 6 tests positivos = 94% / 78%. Las cifras
        // por test individual estan en las tablas del texto completo.
        locator: 'PENDIENTE: el resumen solo da el compuesto (3+/6 = 94/78); cifras por test en el texto completo',
      }],
  },
];

export const LUMBAR_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
