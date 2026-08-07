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
      note: 'Devillé 2000 (metaanálisis): 91/26. Muy sensible, poco específico.',
    },
    utility: 'rule-out',
    interpretation:
      'Muy sensible (SnNout): un negativo hace poco probable la hernia con compromiso radicular. Un positivo es inespecífico (isquiotibiales, cadera) y debe confirmarse.',
    pearl:
      'La sensibilización con dorsiflexión del tobillo (Bragard) o flexión cervical orienta a origen neural frente a tensión muscular.',
    demo: {
      movementId: 'lumbar-flexion',
      angleDeg: 25,
      note: 'La maniobra real eleva la pierna con la rodilla extendida (cadera); el modelo solo muestra el raquis lumbar.',
    },
    cite: [
      { ref: 'deville-2000', verified: true, locator: 'metaanálisis, SLR ipsilateral' },
      {
        ref: 'suri-2011',
        verified: false,
        // Comprobado 2026-08-06 (PMID 20543768): el resumen presenta razones
        // de verosimilitud, no sensibilidad/especificidad, y no nombra estos
        // tests. Comprobar en las tablas del texto completo.
        locator: 'PENDIENTE: el resumen da razones de verosimilitud, no sens/espec',
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
      movementId: 'lumbar-flexion',
      angleDeg: 25,
      note: 'Se eleva la pierna SANA; el positivo es el dolor en la pierna sintomática. El modelo solo muestra el raquis lumbar.',
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
      note: 'Suri 2011 (prone knee bend frente a RM): ~50/100 para L2-L4. Datos limitados; la sensibilidad sube con el nivel L3.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico y moderadamente sensible: un positivo apoya con fuerza la radiculopatía lumbar alta. Útil cuando el dolor es anterior (muslo) y el SLR es negativo.',
    pearl:
      'Falsos positivos por acortamiento del recto femoral/psoas o patología de cadera: interpreta el dolor por su territorio anterior.',
    demo: {
      movementId: 'lumbar-extension',
      angleDeg: 20,
      note: 'En prono se flexiona la rodilla y se extiende la cadera; el modelo muestra la extensión lumbar, que también tensa las raíces altas.',
    },
    cite: [{ ref: 'suri-2011', verified: false, locator: 'reverse SLR, L2-L4' }],
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
      sensitivity: 72,
      specificity: 58,
      note: 'Hicks 2005; rendimiento moderado. Más útil como predictor de respuesta al ejercicio de estabilización.',
    },
    utility: 'balanced',
    interpretation:
      'Precisión moderada aislado. Su valor real es pronóstico: un positivo predice buena respuesta a un programa de estabilización lumbar.',
    demo: {
      movementId: 'lumbar-extension',
      angleDeg: 18,
      note: 'En prono se aplica presión posteroanterior sobre el segmento; el modelo aproxima con una ligera extensión lumbar.',
    },
    cite: [{ ref: 'hicks-2005', verified: false }],
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
