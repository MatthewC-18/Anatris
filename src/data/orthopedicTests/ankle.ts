// src/data/orthopedicTests/ankle.ts
//
// Orthopedic special tests for the ANKLE. Analogue of ./hip.ts.
//
// ESTADO DE LA VERIFICACION (2026-11-04). Las cinco pruebas estan comprobadas
// contra su fuente primaria y ninguna cita ya un manual sin abrir.
//
//   ankle-anterior-drawer   78% / 75%  ->  nota: nadie lo mide POR SEPARADO
//   ankle-talar-tilt        50% / 88%  ->  nota: tampoco, y lo instrumentado rinde peor
//   ankle-thompson          96% / 93%  ->  confirmadas: Maffulli 1998, 174 roturas
//   ankle-kleiger / squeeze            ->  ya estaban, Sman 2015
//
// El hallazgo que cambia como se ensena el tobillo esta en van Dijk 1996 (160
// traumatismos consecutivos por inversion, hallazgos quirurgicos como patron de
// referencia): el estudio no compara pruebas sueltas, compara ESTRATEGIAS. La
// misma exploracion fisica da 71% / 33% antes de las 48 horas y 96% / 84% a los
// cinco dias. Esa diferencia es mayor que la que separa a dos pruebas
// distintas, y mayor que la que separa al explorador experto (96/84) del
// inexperto bien instruido (89/70). En el tobillo, el factor que manda es
// CUANDO se explora.
//
// Por eso las dos pruebas de estabilidad lateral pasan a nota: la cifra honrada
// no es suya, es la de la exploracion completa y diferida de la que forman
// parte.
//
// DEMO: mapped to a driveable ankle movementId (from ankleRom.ts) only where the
// single-axis rig approximates the maneuver; passive-translation tests (drawer,
// squeeze, external rotation) omit the demo.

import type { OrthopedicTest } from '../../types/orthopedicTest';

export const ANKLE_ORTHOPEDIC_TESTS: OrthopedicTest[] = [
  /* ======================= Lateral stability ======================= */
  {
    id: 'ankle-anterior-drawer',
    name: 'Cajón anterior de tobillo',
    aka: ['Anterior drawer test'],
    region: 'ankle',
    category: 'Estabilidad lateral',
    target: 'Ligamento peroneoastragalino anterior (LPAA)',
    purpose: 'Detectar laxitud del LPAA tras el esguince por inversión.',
    maneuver:
      'Con el tobillo en ligera flexión plantar, se estabiliza la tibia y se tracciona el retropié/calcáneo hacia delante.',
    positive:
      'Desplazamiento anterior aumentado del astrágalo (a veces con hoyuelo de succión) frente al lado sano.',
    metrics: {
      note: 'SIN cifras propias: el estudio de referencia (van Dijk, 160 traumatismos consecutivos por inversión, hallazgos quirúrgicos como patrón) NO mide el cajón por separado, sino la exploración completa. Y lo que mide es demoledor: antes de las 48 h, 71% de sensibilidad y 33% de especificidad; LA MISMA exploración a los cinco días, 96% y 84%. Esa diferencia es mayor que la que hay entre dos pruebas distintas. Combinado con dolor a la palpación del LPAA y hematoma, el cajón alcanza el 96% de sensibilidad.',
    },
    utility: 'balanced',
    utilityBasis:
      'El estudio de referencia no mide el cajón por separado, sino la exploración completa, así que no hay cifra propia detrás de la etiqueta. Y la del conjunto depende de la FECHA más que de la técnica: antes de las 48 horas 71% y 33%, y a los cinco días 96% y 84%.',
    interpretation:
      'Laxitud aumentada respecto al lado sano apoya lesión del LPAA; combínalo con la inclinación astragalina y la clínica.',
    pearl:
      'Lo que más cambia el rendimiento no es la técnica, es la FECHA: a los 4-5 días del esguince la exploración pasa de 71%/33% a 96%/84%, porque el dolor y el edema agudos impiden localizar la palpación y tolerar la maniobra.',
    demo: {
      highlightStructureIds: ['ankle-atfl'],
      movementId: 'ankle-plantarflexion',
      angleDeg: 15,
      side: 'R',
      note: 'El rig posa la ligera flexión plantar de partida; la prueba es una traslación anterior pasiva del astrágalo.',
    },
    cite: [
      {
        ref: 'vandijk-1996',
        verified: true,
        locator: 'Tabla 1: exploración <48 h 71%/33%, a los 5 días 96%/84%',
      },
    ],
  },
  {
    id: 'ankle-talar-tilt',
    name: 'Inclinación astragalina (talar tilt)',
    aka: ['Talar tilt', 'Inversion stress test'],
    region: 'ankle',
    category: 'Estabilidad lateral',
    target: 'Ligamento calcaneoperoneo (y complejo lateral)',
    purpose: 'Valorar la laxitud del ligamento calcaneoperoneo con estrés en inversión.',
    maneuver:
      'Con el retropié en posición neutra, se invierte pasivamente el calcáneo/astrágalo comparando con el lado contralateral.',
    positive: 'Aumento de la apertura/inclinación lateral respecto al lado sano.',
    metrics: {
      note: 'SIN cifras: no hay estudio que mida la inclinación astragalina MANUAL por separado. Las que circulan (50% / 88%) no tienen fuente localizable. Lo más cercano que sí está medido es la radiografía de estrés en el mismo protocolo de van Dijk, 68% de sensibilidad y 71% de especificidad, que es la versión instrumentada de esta misma maniobra y rinde peor que la exploración física diferida.',
    },
    utility: 'weak',
    interpretation:
      'Una inclinación aumentada y asimétrica apoya la lesión del calcaneoperoneo, pero sin precisión medida no sostiene una decisión por sí sola: su sitio está junto al cajón anterior y la palpación, a los 4-5 días.',
    demo: {
      highlightStructureIds: ['ankle-cfl', 'ankle-atfl'],
      movementId: 'ankle-inversion',
      angleDeg: 30,
      side: 'R',
      note: 'El rig muestra la inversión del retropié que estresa el complejo lateral.',
    },
    cite: [
      {
        ref: 'vandijk-1996',
        verified: true,
        locator: 'Tabla 1: radiografía de estrés (talar tilt instrumentado) 68%/71%',
      },
    ],
  },
  /* ======================= Achilles ======================= */
  {
    id: 'ankle-thompson',
    name: 'Prueba de Thompson (Simmonds)',
    aka: ['Thompson test', 'Simmonds squeeze'],
    region: 'ankle',
    category: 'Tendón de Aquiles',
    target: 'Integridad del tendón calcáneo (de Aquiles)',
    purpose: 'Detectar la rotura completa del tendón de Aquiles.',
    maneuver:
      'Paciente en decúbito prono con los pies fuera de la camilla; el explorador comprime la pantorrilla y observa el pie.',
    positive:
      'AUSENCIA de flexión plantar al comprimir la pantorrilla: rotura completa del Aquiles.',
    metrics: {
      sensitivity: 96,
      specificity: 93,
      note: 'Las dos cifras del mismo estudio (Maffulli 1998: 174 roturas completas y 28 sospechas sin rotura, recogidas a lo largo de 13 años). Fue la más sensible de las cinco pruebas comparadas, junto con Matles (0,88 / 0,85); la palpación del hueco se queda en 0,73. El dato que remata: en TODOS los pacientes del estudio al menos DOS pruebas fueron positivas.',
    },
    utility: 'rule-out',
    interpretation:
      'Muy sensible: la presencia de flexión plantar al comprimir descarta prácticamente la rotura completa; su ausencia la confirma.',
    pearl: 'La flexión plantar activa puede conservarse por los flexores largos aunque el Aquiles esté roto: por eso se explora con la compresión, no pidiendo el movimiento.',
    demo: {
      highlightStructureIds: ['achilles-tendon'],
      movementId: 'ankle-plantarflexion',
      angleDeg: 25,
      side: 'R',
      highlightMuscleId: 'gastrocnemius',
      note: 'El rig muestra la flexión plantar que un Aquiles íntegro produce al comprimir la pantorrilla (positiva = NO ocurre).',
    },
    cite: [
      {
        ref: 'maffulli-1998',
        verified: true,
        locator: 'Compresión de la pantorrilla: sensibilidad 0,96, especificidad 0,93',
      },
    ],
  },
  /* ======================= Syndesmosis (high sprain) ======================= */
  {
    id: 'ankle-kleiger',
    name: 'Prueba de rotación externa (Kleiger)',
    aka: ['Kleiger test', 'External rotation test'],
    region: 'ankle',
    category: 'Sindesmosis',
    target: 'Sindesmosis tibiofibular y ligamento deltoideo',
    purpose: 'Detectar el esguince alto (sindesmal) y la lesión del deltoideo.',
    maneuver:
      'Con la rodilla flexionada, se lleva el tobillo a DORSIFLEXIÓN y se aplica rotación externa al pie mientras se estabiliza la pierna.',
    positive:
      'Dolor en la sindesmosis anterolateral (o medial, si es el deltoideo) reproducido con la rotación externa.',
    metrics: {
      sensitivity: 71,
      specificity: 63,
      lrPositive: 1.93,
      lrNegative: 0.46,
      note: 'Con DORSIFLEXIÓN. Sin ella la sensibilidad cae mucho: la versión en tobillo neutro es la que se cita en torno al 20%. Sman 2015 mide la de dorsiflexión, que es la recomendable.',
    },
    utility: 'balanced',
    interpretation:
      'Es de las dos más sensibles del grupo sindesmal, no una prueba de confirmación: un negativo resta (LR- 0,46), un positivo aporta poco por sí solo (LR+ 1,93). Combínala con la palpación sindesmal y con el squeeze.',
    noDemo:
      'Pide dorsiflexión y rotación externa del pie a la vez, y los cuatro movimientos de tobillo del rig mueven el mismo hueso; además la rotación externa del pie no es un eje que el modelo conduzca.',
    cite: [{ ref: 'sman-2015', verified: true, locator: 'Tabla 3' }],
  },
  {
    id: 'ankle-squeeze',
    name: 'Prueba de compresión (squeeze)',
    aka: ['Squeeze test'],
    region: 'ankle',
    category: 'Sindesmosis',
    target: 'Sindesmosis tibiofibular',
    purpose: 'Detectar la lesión sindesmal (esguince alto).',
    maneuver:
      'Se comprimen la tibia y la fíbula juntas en el tercio medio de la pierna, proximal a la lesión.',
    positive: 'Dolor referido distal en la sindesmosis al comprimir proximalmente.',
    metrics: {
      sensitivity: 26,
      specificity: 88,
      lrPositive: 2.15,
      lrNegative: 0.84,
      note: 'Poco sensible y bastante específica, pero el intervalo del LR+ cruza el 1 (0,86 a 5,39): por sí sola no confirma nada.',
    },
    utility: 'rule-in',
    interpretation:
      'Un positivo sube la sospecha de esguince alto, pero con un intervalo que incluye el 1 no cierra el diagnóstico. Un negativo no sirve para descartar (LR- 0,84). Úsala DESPUÉS de una prueba sensible (palpación sindesmal, rotación externa con dorsiflexión).',
    noDemo:
      'Es una compresión de la tibia y la fíbula en el tercio medio de la pierna: el rig gira articulaciones, no comprime.',
    cite: [{ ref: 'sman-2015', verified: true, locator: 'Tabla 3' }],
  },
];
