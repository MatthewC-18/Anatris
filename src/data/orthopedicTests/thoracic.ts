// src/data/orthopedicTests/thoracic.ts
//
// THORACIC orthopedic special tests. This was the last region without an
// authored test set (the panel rendered empty in the thoracic lab), so the four
// clinical questions a physio actually asks in the mid-back are covered:
//
//   1. FRACTURA VERTEBRAL por compresión (la bandera roja de la dorsalgia en el
//      paciente mayor u osteoporótico)  -> percusión con puño cerrado, signo del supino.
//   2. DEFORMIDAD estructural (escoliosis)                 -> prueba de Adams.
//   3. ESPONDILOARTRITIS AXIAL (rigidez inflamatoria)      -> expansión torácica.
//   4. SÍNDROME DEL DESFILADERO TORÁCICO (compresión neurovascular en la salida
//      del tórax)                                          -> Adson, Wright, Roos/EAST.
//   + Dos exploraciones de la caja torácica: compresión costal y Schepelmann.
//
// Same encoding + honesty rules as the other regions: metrics are POINT
// ESTIMATES (%) with a `note` carrying the spread, and every citation ships
// `verified: false` until the exact figure is checked against the primary
// source. Where no defensible point estimate exists (expansión torácica,
// compresión costal, Schepelmann) the metrics are deliberately LEFT EMPTY and
// the test is labelled 'weak' instead of inventing numbers.
//
// DEMO note: the thoracic rig drives the THORACIC SPINE only (flexión /
// extensión / inclinación / rotación). The vertebral-fracture signs are
// percussion maneuvers and the desfiladero tests are ARM positions, so those
// carry no demo; the ones whose provocative position IS a thoracic movement
// (Adams, rotación sentada, Schepelmann) do, each with an honest `note`.

import type { OrthopedicTest } from '../../types/orthopedicTest';

const tests: OrthopedicTest[] = [
  // ==================== FRACTURA VERTEBRAL POR COMPRESIÓN ====================
  {
    id: 'closed-fist-percussion',
    name: 'Percusión con puño cerrado',
    aka: ['Closed fist percussion sign', 'Signo de percusión vertebral'],
    region: 'thoracic',
    category: 'Fractura vertebral por compresión',
    target: 'Cuerpo vertebral torácico / toracolumbar',
    purpose:
      'Detectar una fractura vertebral por compresión en dorsalgia aguda, sobre todo en paciente osteoporótico o mayor de 60 años.',
    maneuver:
      'Paciente sentado con la columna en ligera flexión. El explorador percute con el borde cubital del puño cerrado, de forma firme y controlada, sobre cada apófisis espinosa desde la torácica alta hasta la lumbar.',
    positive:
      'Dolor intenso, agudo y bien localizado en un nivel concreto (no una molestia difusa en varios niveles).',
    metrics: {
      sensitivity: 88,
      specificity: 90,
      note: 'Langdon 2010 (n=83): 87,5 / 90. Serie única, población con sospecha clínica alta: el rendimiento baja en población general.',
    },
    utility: 'rule-in',
    interpretation:
      'Especificidad alta (SpPin): un dolor exquisito y puntual apoya con fuerza la fractura y justifica imagen. Su sensibilidad también es alta, así que un negativo limpio la hace bastante menos probable, pero no la descarta en fracturas antiguas ya consolidadas.',
    pearl:
      'Combínalo con el signo del supino: los dos positivos en un paciente osteoporótico con dorsalgia aguda son una indicación clara de radiografía.',
    cite: [{ ref: 'langdon-2010', verified: false }],
  },
  {
    id: 'supine-sign',
    name: 'Signo del supino',
    aka: ['Supine sign'],
    region: 'thoracic',
    category: 'Fractura vertebral por compresión',
    target: 'Cuerpo vertebral torácico / toracolumbar',
    purpose:
      'Complementar la percusión vertebral en la sospecha de fractura por compresión.',
    maneuver:
      'Se pide al paciente que se tumbe en supino sobre la camilla, sin almohada, y permanezca así.',
    positive:
      'El paciente es incapaz de tolerar el decúbito supino plano por dolor y necesita incorporarse o poner apoyos.',
    metrics: {
      sensitivity: 81,
      specificity: 93,
      note: 'Langdon 2010 (n=83): 81,25 / 93,33. Misma serie que la percusión con puño cerrado.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico (SpPin): la intolerancia al supino plano en una dorsalgia aguda apoya la fractura. Un negativo por sí solo no la descarta.',
    pearl:
      'Es un signo de observación, no una maniobra: se recoge mientras colocas al paciente para el resto de la exploración, sin coste de tiempo.',
    cite: [{ ref: 'langdon-2010', verified: false }],
  },

  // ==================== DEFORMIDAD ESTRUCTURAL ====================
  {
    id: 'adams-forward-bend',
    name: 'Prueba de Adams (flexión anterior)',
    aka: ["Adam's forward bend test", 'Test de la giba'],
    region: 'thoracic',
    category: 'Escoliosis / deformidad estructural',
    target: 'Rotación vertebral torácica (giba costal)',
    purpose:
      'Diferenciar una escoliosis ESTRUCTURAL (con rotación vertebral) de una actitud escoliótica funcional.',
    maneuver:
      'Paciente de pie, pies juntos y rodillas extendidas, con las manos juntas colgando hacia el suelo. Se le pide flexionar el tronco hacia delante. El explorador observa la espalda desde atrás, a la altura del plano de la espalda.',
    positive:
      'Asimetría de altura entre ambos hemitórax (giba costal). Con escoliómetro se cuantifica la rotación del tronco; el umbral habitual de derivación es 5° a 7°.',
    metrics: {
      sensitivity: 84,
      specificity: 93,
      note: 'Varía mucho según el umbral del escoliómetro (5° vs 7°), la edad y el ángulo de Cobb de referencia. Côté 1998 estudia precisión y fiabilidad de la prueba y del escoliómetro.',
    },
    utility: 'rule-in',
    interpretation:
      'Una giba franca indica rotación vertebral, es decir deformidad estructural, y obliga a valorar radiografía con medición de Cobb. La ausencia de giba no descarta curvas pequeñas ni deformidades lumbares.',
    pearl:
      'La actitud escoliótica funcional (por dismetría o contractura) DESAPARECE en la flexión; la estructural mantiene o acentúa la giba. Ésa es toda la prueba.',
    demo: {
      movementId: 'thoracic-flexion',
      angleDeg: 40,
      highlightMuscleId: 'semispinalis-thoracis',
      note: 'El modelo muestra la flexión torácica de la maniobra; la giba costal depende de la rotación vertebral del paciente y no se reproduce en un raquis simétrico.',
    },
    cite: [{ ref: 'cote-1998', verified: false }],
  },

  // ==================== ESPONDILOARTRITIS AXIAL ====================
  {
    id: 'chest-expansion',
    name: 'Expansión torácica (cirtometría)',
    aka: ['Chest expansion', 'Perímetro torácico'],
    region: 'thoracic',
    category: 'Espondiloartritis axial',
    target: 'Articulaciones costovertebrales y costotransversas',
    purpose:
      'Detectar la restricción de la movilidad costovertebral típica de la espondilitis anquilosante.',
    maneuver:
      'Con una cinta métrica al nivel del 4º espacio intercostal (por debajo de las axilas) y las manos del paciente sobre la cabeza o detrás de la nuca, se mide el perímetro en espiración máxima y en inspiración máxima. La diferencia es la expansión.',
    positive:
      'Expansión torácica igual o menor a 2,5 cm, ajustada por edad y sexo.',
    metrics: {
      note: 'Sin punto estimado defendible: es un CRITERIO clínico (Nueva York modificado), no un test validado con sensibilidad y especificidad propias. El valor normal desciende con la edad, así que el umbral fijo de 2,5 cm sobrediagnostica en mayores.',
    },
    utility: 'weak',
    interpretation:
      'Aporta poco de forma aislada. Su valor está en el CONJUNTO con dolor lumbar inflamatorio (rigidez matutina de más de 30 minutos, mejora con el ejercicio y no con el reposo, despertar nocturno) y con la limitación de Schober.',
    pearl:
      'Mide siempre en el mismo nivel y anota la cifra: el seguimiento longitudinal del mismo paciente informa mucho más que compararlo con un valor de referencia.',
    cite: [{ ref: 'vanderlinden-1984', verified: false }],
  },

  // ==================== SÍNDROME DEL DESFILADERO TORÁCICO ====================
  {
    id: 'roos-east',
    name: 'Prueba de Roos (EAST)',
    aka: ['Roos test', 'Elevated arm stress test', 'EAST', 'Prueba de los brazos elevados'],
    region: 'thoracic',
    category: 'Síndrome del desfiladero torácico',
    target: 'Plexo braquial en el desfiladero interescalénico y costoclavicular',
    purpose:
      'Reproducir la sintomatología neurógena del desfiladero torácico con el brazo en posición de provocación mantenida.',
    maneuver:
      'Sentado, con ambos hombros en abducción de 90° y rotación externa, y los codos flexionados a 90° ("manos arriba"). Se pide abrir y cerrar las manos lentamente durante tres minutos.',
    positive:
      'Reproducción de parestesias, pesadez o dolor en el miembro superior, o incapacidad de mantener los tres minutos por fatiga del lado sintomático.',
    metrics: {
      sensitivity: 84,
      specificity: 30,
      note: 'Gillard 2001: alta sensibilidad y especificidad baja. Muchos sujetos sanos refieren molestias al tercer minuto.',
    },
    utility: 'rule-out',
    interpretation:
      'Sensible pero poco específico (SnNout): tolerar los tres minutos sin síntomas hace improbable el desfiladero neurógeno. Un positivo aislado no lo confirma: hay que integrarlo con la clínica y con los otros tests.',
    pearl:
      'Compara SIEMPRE los dos lados en la misma sesión. Lo relevante es la asimetría (un lado que claudica antes), no la aparición de molestias en sí.',
    cite: [{ ref: 'gillard-2001', verified: false }],
  },
  {
    id: 'adson',
    name: 'Maniobra de Adson',
    aka: ['Adson test', 'Test de Adson'],
    region: 'thoracic',
    category: 'Síndrome del desfiladero torácico',
    target: 'Arteria subclavia en el desfiladero interescalénico',
    purpose:
      'Detectar la compresión vascular entre el escaleno anterior y el medio (o por una costilla cervical).',
    maneuver:
      'Sentado, con el brazo del lado a explorar en ligera extensión y rotación externa. Se palpa el pulso radial y se pide al paciente que gire la cabeza HACIA ese lado, extienda el cuello e inspire profundamente, manteniendo la apnea.',
    positive:
      'Disminución o desaparición del pulso radial, o reproducción de los síntomas del paciente.',
    metrics: {
      sensitivity: 79,
      specificity: 76,
      note: 'Gillard 2001. La abolición del pulso aparece en un porcentaje apreciable de personas asintomáticas, por lo que el criterio de positividad más útil es la reproducción de SÍNTOMAS, no el pulso.',
    },
    utility: 'balanced',
    interpretation:
      'Rendimiento moderado en ambas direcciones: interprétalo dentro de un conjunto de tests, nunca aislado. Si solo se abole el pulso sin síntomas, el hallazgo tiene poco valor.',
    pearl:
      'La variante de Wright-Adson gira la cabeza al lado CONTRARIO. Sea cual sea la variante, deja constancia de cuál usaste: cambian los resultados.',
    cite: [{ ref: 'gillard-2001', verified: false }],
  },
  {
    id: 'wright-hyperabduction',
    name: 'Maniobra de Wright (hiperabducción)',
    aka: ['Wright test', 'Hyperabduction test'],
    region: 'thoracic',
    category: 'Síndrome del desfiladero torácico',
    target: 'Paquete neurovascular bajo el pectoral menor (espacio retropectoral)',
    purpose:
      'Detectar la compresión neurovascular en el espacio subcoracoideo con el brazo en hiperabducción.',
    maneuver:
      'Sentado. El explorador lleva pasivamente el brazo a hiperabducción y rotación externa, por encima de la cabeza, mientras palpa el pulso radial. Se mantiene hasta un minuto.',
    positive:
      'Disminución del pulso radial o reproducción de parestesias en la mano.',
    metrics: {
      sensitivity: 70,
      specificity: 53,
      note: 'Gillard 2001. Es el test de desfiladero con el rendimiento más pobre: muchos falsos positivos en sujetos sanos.',
    },
    utility: 'weak',
    interpretation:
      'Poco fiable de forma aislada. Su interés es localizador: cuando es el ÚNICO positivo, orienta al espacio retropectoral (pectoral menor) más que al interescalénico.',
    pearl:
      'Si es positivo, revisa el pectoral menor y la posición escapular: en muchos casos el trabajo terapéutico está ahí y no en los escalenos.',
    cite: [{ ref: 'gillard-2001', verified: false }],
  },

  // ==================== CAJA TORÁCICA ====================
  {
    id: 'rib-compression',
    name: 'Compresión de la caja torácica',
    aka: ['Rib compression test', 'Rib springing'],
    region: 'thoracic',
    category: 'Caja torácica / costillas',
    target: 'Costillas y articulaciones costovertebrales',
    purpose:
      'Orientar entre una lesión ósea costal y un dolor de origen muscular o articular vertebral.',
    maneuver:
      'Paciente en supino o sentado. El explorador aplica una compresión anteroposterior suave y progresiva sobre el esternón y la columna dorsal, y después una compresión lateral sobre ambos hemitórax.',
    positive:
      'Dolor agudo y localizado A DISTANCIA del punto donde se aplica la presión (dolor referido al foco costal).',
    metrics: {
      note: 'Sin cifras de precisión publicadas suficientemente consistentes para dar un punto estimado. Se usa como orientación clínica, no como prueba diagnóstica.',
    },
    utility: 'weak',
    interpretation:
      'Un dolor reproducido a distancia del punto de presión sugiere lesión ósea costal y justifica imagen ante un mecanismo traumático. Un dolor solo local bajo los dedos apunta a origen muscular o de partes blandas.',
    pearl:
      'Aplica la presión de forma LENTA y suspende ante el primer signo de dolor intenso: ante sospecha de fractura, la maniobra no debe repetirse.',
    cite: [{ ref: 'magee', verified: false }],
  },
  {
    id: 'schepelmann',
    name: 'Prueba de Schepelmann',
    aka: ['Schepelmann sign'],
    region: 'thoracic',
    category: 'Caja torácica / costillas',
    target: 'Músculos intercostales frente a pleura',
    purpose:
      'Diferenciar un dolor torácico lateral de origen intercostal (muscular) de uno de origen pleural.',
    maneuver:
      'Paciente sentado con los brazos elevados. Se le pide inclinar el tronco hacia un lado y después hacia el otro, y se le pregunta en qué lado aparece el dolor.',
    positive:
      'Dolor en el lado CÓNCAVO (el lado hacia el que se inclina) sugiere origen pleural; dolor en el lado CONVEXO (el que se estira) sugiere neuralgia o lesión intercostal.',
    metrics: {
      note: 'Signo clásico de exploración, sin estudios de precisión diagnóstica que permitan dar sensibilidad ni especificidad.',
    },
    utility: 'weak',
    interpretation:
      'Es una prueba de ORIENTACIÓN, no de diagnóstico. Su utilidad real es levantar la sospecha de una causa no musculoesquelética y decidir la derivación.',
    pearl:
      'Ante un dolor torácico que no se modifica con NINGÚN movimiento ni con la palpación, la causa mecánica es improbable: deriva.',
    demo: {
      movementId: 'thoracic-lateral-flexion',
      angleDeg: 25,
      highlightMuscleId: 'iliocostalis-thoracis',
      note: 'El modelo muestra la inclinación torácica de la maniobra; la prueba real se hace con los brazos elevados por encima de la cabeza.',
    },
    cite: [{ ref: 'magee', verified: false }],
  },

  // ==================== MOVILIDAD SEGMENTARIA ====================
  {
    id: 'seated-thoracic-rotation',
    name: 'Rotación torácica en sedestación',
    aka: ['Seated thoracic rotation', 'Test de rotación torácica'],
    region: 'thoracic',
    category: 'Movilidad torácica',
    target: 'Segmentos torácicos y articulaciones costotransversas',
    purpose:
      'Cuantificar y comparar la rotación torácica activa entre ambos lados, eliminando el aporte lumbar y pélvico.',
    maneuver:
      'Paciente sentado a horcajadas en la camilla (para bloquear la pelvis), con los brazos cruzados sobre el pecho o un bastón sobre los hombros. Se le pide rotar el tronco al máximo hacia cada lado y se compara la amplitud.',
    positive:
      'Asimetría clara entre lados o rotación global claramente reducida (referencia orientativa: en torno a 35° por lado), con o sin dolor.',
    metrics: {
      note: 'Prueba de MOVILIDAD, no de diagnóstico: se informa por fiabilidad y por comparación entre lados, no por sensibilidad y especificidad.',
    },
    utility: 'weak',
    interpretation:
      'Una pérdida de rotación torácica se compensa arriba (cervical) o abajo (lumbar). Encontrarla no da un diagnóstico, pero sí un objetivo de tratamiento cuando el dolor está en las regiones vecinas.',
    pearl:
      'Sentarse a horcajadas es lo que hace válida la prueba: sin bloquear la pelvis estás midiendo rotación de tronco entera, no torácica.',
    demo: {
      movementId: 'thoracic-rotation',
      angleDeg: 35,
      highlightMuscleId: 'rotatores',
      note: 'El modelo rota la columna torácica; en la prueba real la pelvis queda bloqueada por la posición a horcajadas.',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
];

export const THORACIC_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
