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
// LAS TRES PRUEBAS DEL DESFILADERO SE QUEDARON SIN CIFRA, Y ESA ES LA
// CORRECCION. Roos, Adson y Wright llevaban las TRES el mismo 72/53, y las tres
// notas empezaban diciendo que ese par no era suyo sino la media de todos los
// tests provocativos de Gillard 2001. El desmentido estaba escrito y el panel
// seguia calculando con la cifra: medido sobre el payload que se sirve
// (supabase/functions/content/payloads/thoracic.json), las tres imprimian
// LR+ 1,5319, LR- 0,5283 y "30% -> 39,63%", identicos, y en la fila cerrada
// "Se 72  Es 53" y "30 -> 40% si +". Sin marca de ningun tipo, porque las dos
// citas van `verified: true` y el aviso ambar del panel solo mira eso.
//
// Peor todavia: del MISMO par de numeros salian TRES veredictos de utilidad
// distintos en filas consecutivas de la misma categoria (Roos "Descarta",
// Adson "Equilibrado", Wright "En conjunto"). Una tabla no puede dar tres
// respuestas a la misma pregunta.
//
// Asi que las tres pierden `sensitivity` y `specificity` --el panel imprime
// "s/d" y "sin LR", que es la verdad-- y se queda la nota, que es donde esta
// lo que SI se midio por prueba (Plewa 1998 en 53 sanos). Las cifras de Plewa
// no se convierten en una especificidad: son tasas de falso positivo por
// CRITERIO (pulso, parestesias, dolor), y elegir un criterio para publicar un
// numero propio seria inventarselo. Los veredictos quedan en dos, cada uno con
// su motivo: Roos sigue siendo de descarte con `utilityBasis` declarado, y
// Adson pasa de "Equilibrado" --que afirma que las dos cifras se parecen, sin
// tener ninguna-- a "En conjunto", que es literalmente lo que dice su propia
// interpretacion.
//
// DEMOS. Las pruebas cuya postura de provocación es un movimiento torácico
// (Adams, rotación en sedestación, Schepelmann) posan ese movimiento de la
// columna torácica; Roos y Wright posan la posición del brazo con la cadena
// del hombro (abducción glenohumeral con sus componentes). Las demás llevan
// `noDemo` con su motivo: los signos de fractura son percusión y observación,
// la expansión torácica se mide con cinta, la compresión costal comprime y el
// rig solo gira articulaciones, y Adson suma rotación y extensión cervical con
// apnea. Este párrafo decía que las del desfiladero no tenían demo, y Roos y
// Wright lo tienen. Cada demo lleva una `note` con lo que el modelo deja
// fuera, empezando por que siempre está de pie.

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
    // LA MANIOBRA ES LA DEL ESTUDIO DEL QUE SALEN LAS CIFRAS. Langdon 2010
    // (texto completo, PMC3025244, Patients and Methods, "The clinical signs";
    // página del artículo abierta el 23 nov 2026) explora al paciente DE PIE
    // frente a un espejo, con el explorador de pie detrás para ver su reacción,
    // y percute con el puño cerrado, firme, toda la longitud de la columna. La
    // ficha decía sentado y en ligera flexión, con el borde cubital y espinosa
    // por espinosa: nada de eso está en el artículo. Tampoco dice qué parte del
    // puño golpea ni que la otra mano se apoye en la espalda (eso lo describe
    // Physiotutors, que solo cita a Langdon para las cifras), así que no se
    // añade.
    maneuver:
      'Paciente de pie frente a un espejo y el explorador de pie detrás de él, para ver su reacción en el espejo. El explorador percute con el puño cerrado, de forma firme, a lo largo de toda la columna.',
    positive:
      'Dolor intenso, agudo y bien localizado en un nivel concreto (no una molestia difusa en varios niveles).',
    metrics: {
      sensitivity: 88,
      specificity: 90,
      note: 'Langdon 2010: 87,5 / 90 en 78 pacientes analizados (42 de 48 con fractura; 27 de 30 sin ella). Entraron 83, con sospecha de fractura y edad media de 78,4 años, y se excluyeron 5. Una sola serie y un solo explorador.',
    },
    utility: 'rule-in',
    interpretation:
      'Especificidad alta (SpPin): un dolor exquisito y puntual apoya con fuerza la fractura y justifica imagen. Su sensibilidad también es alta, así que un negativo limpio la hace bastante menos probable, pero no la descarta en fracturas antiguas ya consolidadas.',
    pearl:
      'Combínalo con el signo del supino: los dos positivos en un paciente osteoporótico con dorsalgia aguda son una indicación clara de radiografía.',
    // Verificado contra el resumen (PMID 19995486, 2026-08-06) y contra el texto
    // completo (PMC3025244, página del artículo abierta el 23 nov 2026). El
    // resumen dice 83 pacientes, pero 5 se excluyeron (2 con marcapasos y 2 por
    // claustrofobia, sin resonancia; 1 con metástasis) y la Tabla 1 suma 78: 48
    // con fractura y 30 sin ella, 42/48 = 87,5% y 27/30 = 90%. Con 83 no cuadra
    // ninguna tabla: 87,5 y 90 exigen un grupo múltiplo de 8 y otro de 10, y esa
    // suma siempre es par. De los 83 que entraron, 75 eran mujeres, con edad
    // media de 78,4 años (72 a 95), y a todos los exploró el autor sénior.
    noDemo:
      'Es una percusión con el puño a lo largo de la columna: no hay movimiento articular que reproducir.',
    cite: [
      {
        ref: 'langdon-2010',
        verified: true,
        locator: 'Tabla 1 del texto completo: 42 de 48 y 27 de 30 (87,5/90)',
      },
    ],
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
    // CON UNA SOLA ALMOHADA, como en el estudio del que salen las cifras. La
    // ficha decía "sin almohada", que es otro protocolo que el del 81/93. El
    // resumen de Langdon 2010 (PMID 19995486) solo dice tumbarse en supino en la
    // camilla. El 15 nov el texto completo (PMC3025244) no se pudo abrir (PMC
    // pedía verificación de navegador) y la frase solo se LOCALIZÓ con su índice
    // de texto completo (E-utilities, esearch db=pmc con 3025244[uid]: "with
    // only one pillow", Count 1; "without a pillow", Count 0). El 23 nov se
    // abrió la página del artículo y se leyó en su párrafo (Patients and
    // Methods, "The clinical signs"): "lie supine on the examination couch with
    // only one pillow". Physiotutors (wiki/supine-sign, abierto el 15 nov 2026)
    // lo describe igual, con una sola almohada, y cita a Langdon.
    maneuver:
      'Se pide al paciente que se tumbe en supino sobre la camilla, con una sola almohada, y permanezca así.',
    positive:
      'El paciente es incapaz de tolerar el decúbito supino plano por dolor y necesita incorporarse o poner apoyos.',
    metrics: {
      sensitivity: 81,
      specificity: 93,
      note: 'Langdon 2010: 81,25 / 93,33 en los mismos 78 pacientes (39 de 48 con fractura; 28 de 30 sin ella). Misma serie y mismo explorador que la percusión con puño cerrado.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico (SpPin): la intolerancia al supino plano en una dorsalgia aguda apoya la fractura. Un negativo por sí solo no la descarta.',
    pearl:
      'Es un signo de observación, no una maniobra: se recoge mientras colocas al paciente para el resto de la exploración, sin coste de tiempo.',
    // Verificado contra el texto completo (PMC3025244, página del artículo
    // abierta el 23 nov 2026): Tabla 2, los mismos 78 pacientes, 39/48 = 81,25%
    // y 28/30 = 93,33%. Con 83 no sale: 81,25 pide un grupo con fractura
    // múltiplo de 16 y 93,33 uno sin fractura múltiplo de 15, y ninguna pareja
    // así suma 83.
    noDemo:
      'Lo que se observa es que el paciente NO puede tumbarse plano: el hallazgo es la postura que no se alcanza, no una que se pueda posar.',
    cite: [
      {
        ref: 'langdon-2010',
        verified: true,
        locator: 'Tabla 2 del texto completo: 39 de 48 y 28 de 30 (81,25/93,33)',
      },
    ],
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
    // HASTA DÓNDE SE FLEXIONA Y DESDE DÓNDE SE MIRA: la maniobra no decía hasta
    // dónde flexionar. Pautas de cribado de la Scoliosis Research Society
    // (reproducidas, con agradecimiento a la SRS, en
    // srf-india.org/site-in-archive/?p=110, abierta el 23 nov 2026): pies
    // juntos, rodillas extendidas, brazos colgando relajados con las palmas
    // juntas, flexión hasta que la espalda queda horizontal, e inspección en esa
    // postura de frente, de espaldas y de lado; de lado se anota además la
    // espalda redonda acentuada. Que "de frente" sea mirar la espalda desde la
    // cabeza sale de la fig. 6 del folleto de la SRS ("Screening Procedure
    // Guidelines for Spinal Deformity", srs.org), que leyó la verificación del
    // 23 nov y no se reabrió al aplicar. No va en `cite`: no da cifras y no trae
    // año para `Reference.year`.
    maneuver:
      'Paciente de pie, pies juntos y rodillas extendidas, con los brazos colgando relajados y las palmas juntas. Se le pide flexionar el tronco hacia delante hasta que la espalda quede horizontal. El explorador busca la giba mirando la espalda desde atrás, a la altura del plano de la espalda, y completa la inspección de frente, mirando la espalda por encima de la cabeza, y de lado, donde además se ve si la cifosis dorsal está acentuada.',
    positive:
      'Asimetría de altura entre ambos hemitórax (giba costal). Con escoliómetro se cuantifica la rotación del tronco; el umbral habitual de derivación es 5° a 7°.',
    metrics: {
      note: 'Sin punto estimado defendible: Côté 1998 (105 pacientes, patrón de referencia Cobb ≥20° torácico) no publica sensibilidad ni especificidad en el registro público. Lo que sí sostiene: la prueba de Adams es MÁS SENSIBLE que el escoliómetro para curvas torácicas de 20° o más, y la concordancia entre dos exploradores es sustancial en la torácica pero POBRE en la lumbar. Cualquier cifra de precisión depende además del umbral del escoliómetro (5° frente a 7°) y de la edad.',
    },
    utility: 'rule-in',
    utilityBasis:
      'Côté 1998 no publica sensibilidad ni especificidad en el registro público, así que la etiqueta no se apoya en ninguna cifra. Se apoya en el hallazgo: la giba costal ES rotación vertebral, es decir deformidad estructural, y eso es lo que obliga a valorar radiografía. Su ausencia no descarta curvas pequeñas ni deformidades lumbares.',
    interpretation:
      'Una giba franca indica rotación vertebral, es decir deformidad estructural, y obliga a valorar radiografía con medición de Cobb. La ausencia de giba no descarta curvas pequeñas ni deformidades lumbares.',
    pearl:
      'La actitud escoliótica funcional (por dismetría o contractura) DESAPARECE en la flexión; la estructural mantiene o acentúa la giba. Ésa es toda la prueba. En la LUMBAR, en cambio, dos exploradores se ponen de acuerdo mal: ahí fíate del escoliómetro, no del ojo.',
    demo: {
      cannotShow:
        'La giba costal es una deformidad rotacional del tórax: el rig es simétrico y no la reproduce, así que no hay nada que encender con ese nombre. En su lugar se enciende el longísimo del tórax, la columna intermedia del erector espinal, que en el tramo de flexión torácica que posa el modelo frena excéntricamente el descenso junto al iliocostal (que no se enciende). No es la estructura que la prueba valora.',
      movementId: 'thoracic-flexion',
      angleDeg: 40,
      // EL SEMIESPINOSO NO TRABAJA EN ESTA POSTURA. Es transversoespinoso, capa
      // profunda bajo el erector (depth 4 en muscles/spine.ts, frente al 3 del
      // longísimo), y el guion de la flexión torácica no lo nombra en ninguna
      // fase ni envolvente (thoracicRom.ts). A 40° la curva de autor, que no es
      // EMG, pone al longísimo como freno excéntrico al 0,82 (iliocostal 0,62,
      // recto 0,57, multífido 0,47): el más alto del tramo. Se dice "el tramo
      // que posa el modelo" porque en la flexión completa la actividad del
      // erector torácico varía: Zwambag 2016 (PMID 27267174) lo ve activo todo
      // el arco y Hashem Boroojerdi 2024 (PMID 36239128) mide relajación en el
      // 60% de 15 ciclistas (resúmenes abiertos el 23 nov 2026). npm run
      // audit-glow (23 nov): los 10 músculos que nombra la torácica, el
      // longísimo entre ellos, se encienden en los dos lados. Con el
      // semiespinoso, la captura de la pose sostenida
      // (capturas/despues2/toracica/prueba-de-adams-flexión-anterior.png, 40°)
      // ponía su etiqueta sobre la cara posterior del brazo derecho y la espalda
      // no daba brillo (114 de 106.600 píxeles cálidos, tono 12-35°). Dónde cae
      // el longísimo con la cámara de perfil está SIN MEDIR: falta recapturar.
      highlightMuscleId: 'longissimus-thoracis',
      // LA NOTA DICE LO QUE EL MODELO DEJA FUERA, que es casi toda la postura.
      // El mando de raquis solo gira T1-T12 (boneMap.ts, 'thoracic-flexion':
      // THORACIC_BONES, 0-45°), la pelvis no bascula en este GLB
      // (lumbarCoupling.ts, LUMBOPELVIC_PELVIS_POSED = false) y el plano
      // sagital pone la cámara de perfil (labCamera.ts, readingAngleFor). Captura
      // de la app en la pose sostenida, 40° (revisión del 15 nov,
      // capturas/antes/toracica/prueba-de-adams-flexión-anterior.png): de perfil,
      // el tórax alto enrollado y la cabeza baja, lejos de la horizontal. Igual
      // en la recaptura tras el arreglo del recorte (ae0c5e5;
      // capturas/despues2/toracica/prueba-de-adams-flexión-anterior.png, 40°,
      // fase 2 de 2). La espalda horizontal es del cribado de la Scoliosis
      // Research Society (srf-india.org/site-in-archive/?p=110: flexión hasta
      // que la espalda queda horizontal) y "por la cintura" con la simetría
      // vista desde atrás, de Horne 2014 (Am Fam Physician, 2014/0201/p193); las
      // dos páginas se abrieron el 15 nov 2026. Ninguna dice "con caderas y
      // lumbar", así que no se escribe (la revisión del 23 nov lo volvió a
      // proponer, sin fuente nueva). De esa revisión sí se toma decir EN CLARO
      // que la espalda no llega a la horizontal, que antes solo se deducía, y
      // que lo que se mira desde atrás es la giba: la maniobra completa ahora
      // la inspección de frente y de lado. "Por defecto" porque la cámara no
      // vuelve a girar si el movimiento ya estaba encuadrado y el usuario
      // puede orbitar (RigOverlays.tsx, frameForPlane).
      note: 'El modelo solo flexiona la columna torácica 40°, con la pelvis y la columna lumbar quietas, así que la espalda queda lejos de la horizontal, y la vista por defecto es de perfil. En la prueba real el paciente flexiona el tronco por la cintura hasta dejar la espalda horizontal, y el explorador la mira sobre todo desde atrás, que es donde se busca la giba costal. Esa giba depende de la rotación vertebral del paciente y no se reproduce en un raquis simétrico.',
    },
    cite: [
      {
        ref: 'cote-1998',
        verified: true,
        locator:
          'más sensible que el escoliómetro en curvas torácicas >=20 grados; concordancia POBRE en la lumbar (resumen)',
      },
    ],
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
    // DOS CRITERIOS DISTINTOS, que la ficha mezclaba en uno ("igual o menor a
    // 2,5 cm, ajustada por edad y sexo": ese umbral no existe). Los 2,5 cm (una
    // pulgada) en el 4.º espacio intercostal son del criterio de Nueva York de
    // 1966 (Bennett y Wood 1968); el modificado de 1984 (van der Linden, PMID
    // 6231933) pide la limitación respecto a valores normales corregidos por
    // edad y sexo, con normogramas y sin dar cifra. Fuente: SPARTAN,
    // spartangroup.org/?p=2297, leído el 15 nov 2026; el resumen de 1984 no da
    // ningún umbral. El positivo no afirma nada del rendimiento: el resumen de
    // 1984 llama al criterio "demasiado poco sensible" (ya en el locator de la
    // cita), y lo que la nota dice de los mayores queda para criterio clínico.
    positive:
      'Expansión torácica limitada respecto a los valores normales para la edad y el sexo (criterio de Nueva York modificado, 1984, que no da cifra). El umbral fijo de 2,5 cm o menos en el 4º espacio intercostal es el del criterio de Nueva York de 1966.',
    metrics: {
      note: 'Sin punto estimado defendible: es un CRITERIO clínico (Nueva York modificado), no un test validado con sensibilidad y especificidad propias. El valor normal desciende con la edad, así que el umbral fijo de 2,5 cm sobrediagnostica en mayores.',
    },
    utility: 'weak',
    interpretation:
      'Aporta poco de forma aislada. Su valor está en el CONJUNTO con dolor lumbar inflamatorio (rigidez matutina de más de 30 minutos, mejora con el ejercicio y no con el reposo, despertar nocturno) y con la limitación de Schober.',
    pearl:
      'Mide siempre en el mismo nivel y anota la cifra: el seguimiento longitudinal del mismo paciente informa mucho más que compararlo con un valor de referencia.',
    noDemo:
      'Se mide con cinta métrica la diferencia de perímetro entre inspiración y espiración máximas: el modelo no respira ni cambia de volumen.',
    cite: [
      {
        ref: 'vanderlinden-1984',
        verified: true,
        locator: 'el criterio de expansión torácica es "demasiado poco sensible" (resumen)',
      },
    ],
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
    // SIN SENSIBILIDAD NI ESPECIFICIDAD, A PROPÓSITO. Ver la cabecera del
    // fichero: el 72/53 que llevaban las tres pruebas del desfiladero era la
    // media de Gillard y no la cifra de ninguna de ellas.
    metrics: {
      note: 'SIN cifra propia: el 72/53 que suele atribuirse a esta prueba es la MEDIA de todos los tests provocativos de Gillard 2001, y ese resumen no publica cifras por test; las revisiones que las dan se contradicen. Lo que sí está medido por test es el comportamiento en SANOS (Plewa 1998, 53 voluntarios): el EAST altera el pulso en el 62%, da parestesias en el 36% y dolor en el 21%. Solo el criterio "tiene que interrumpir la prueba" se sostiene, con un límite superior de falsos positivos del 16%.',
    },
    utility: 'rule-out',
    utilityBasis:
      'No hay sensibilidad propia de esta prueba que respalde la etiqueta: la cifra que se le atribuye es la media de todos los tests provocativos de Gillard. Se usa como prueba de descarte por el razonamiento clínico, no por un número propio. Lo que las fuentes citadas publican de esta prueba sola es su comportamiento en sanos, y ahí el único criterio que se sostiene es tener que interrumpir la prueba.',
    // SIN "SENSIBLE (SnNout)". Lo afirmaba justo debajo de un `utilityBasis` que
    // dice que no hay sensibilidad propia, y el panel enseña los dos bloques
    // seguidos ("Por qué ese uso" e "Interpretación", OrthopedicTestsPanel).
    // "Tolerar los tres minutos hace improbable" era la misma inferencia con
    // otras palabras. Ninguna fuente citada da la sensibilidad del EAST: Gillard
    // 2001 (PMID 11707008) solo publica la media de los tests, y Plewa 1998
    // (PMID 9562199) solo mide sanos. El único estudio en pacientes que se pudo
    // abrir tampoco respalda leer un negativo como descarte: Pesser 2022 (PMID
    // 35550394, resumen abierto el 23 nov 2026), con el EAST medido por la
    // duración en 266 pacientes con sospecha de desfiladero neurógeno, da un
    // área bajo la curva de 0,62 (IC 95% 0,55-0,69) y un valor predictivo
    // negativo del 53-58% en esa cohorte. Mantener 'rule-out' o pasarla a
    // 'weak' queda para criterio clínico; este texto vale con las dos.
    interpretation:
      'Un positivo aislado no confirma el desfiladero neurógeno. Y que un negativo lo descarte es razonamiento clínico, no una cifra: no hay una sensibilidad propia de esta prueba que se pueda comprobar, así que tolerar los tres minutos sin síntomas no dice cuánto baja la sospecha. Define además ANTES qué cuentas como positivo: en voluntarios sanos, el pulso se altera en seis de cada diez y aparecen parestesias en uno de cada tres, así que esos dos criterios no sirven; el que se sostiene es tener que interrumpir la prueba.',
    pearl:
      'Compara SIEMPRE los dos lados en la misma sesión. Lo relevante es la asimetría (un lado que claudica antes), no la aparición de molestias en sí.',
    demo: {
      // La posicion de "manos arriba" mantenida: hombros en abduccion de 90,
      // rotacion externa y codos a 90. Las tres las conduce el rig.
      movementId: 'glenohumeral-abduction',
      angleDeg: 90,
      side: 'R',
      components: [
        { movementId: 'glenohumeral-external-rotation', angleDeg: 80 },
        { movementId: 'elbow-flexion', angleDeg: 90 },
      ],
      highlightStructureIds: ['interscalene-triangle'],
      // EL BRILLO DE LOS ESCALENOS APENAS SE DISTINGUE, Y SE DICE. Captura de la
      // pose sostenida tras el arreglo del recorte (ae0c5e5;
      // capturas/despues2/toracica/prueba-de-roos-east.png, 90° con la rotación
      // externa y el codo puestos): en el cuello lateral derecho, encima de la
      // clavícula (x 430-505, y 366-388 de 728x834), 58 de 1.650 píxeles
      // cálidos (tono 12-35°, saturación >= 0,30, valor >= 0,55; el resalte
      // mezcla el difuso hacia 0xf97316, RigOverlays.paintImplicated), frente a
      // 1 en el espejo izquierdo, que no se enciende, y a 10.034 de 24.000 en el
      // gemelo encendido de Thompson con el mismo criterio. Hasta la pasada de
      // rayos X del pendiente 4 de CLAUDE.md.
      cannotShow:
        'Lo que se comprime es el plexo braquial y la arteria subclavia, y el material de los nervios y los vasos los deja en una capa que el laboratorio no muestra nunca. Se enciende la PUERTA: el escaleno anterior y el medio, entre los que pasan, aunque desde la vista frontal del demo su brillo apenas se distingue.',
      // El modelo siempre está de pie, así que la nota dice que la prueba se
      // hace sentado (regla de la revisión del 15 nov para todos los demos).
      note:
        'La prueba es BILATERAL, se hace sentado y dura tres minutos abriendo y cerrando las manos; el modelo, de pie, posa un lado y no mantiene el tiempo, que es justo lo que la hace positiva.',
    },
    cite: [
      {
        ref: 'gillard-2001',
        verified: true,
        locator: 'media de todos los tests provocativos 72%/53%, en el resumen (no por test)',
      },
      {
        ref: 'plewa-1998',
        verified: true,
        locator:
          'EAST en 53 sanos: pulso 62%, parestesias 36%, dolor 21%; interrumpir la prueba, falsos positivos <=16%',
      },
    ],
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
    // SIN SENSIBILIDAD NI ESPECIFICIDAD, A PROPÓSITO (ver la cabecera).
    metrics: {
      note: 'SIN cifra propia: el 72/53 que suele atribuirse a Adson es la MEDIA de todos los tests provocativos de Gillard 2001, y el 85% que ese resumen da para Adson es un valor predictivo POSITIVO, no una especificidad. Lo medido por test es el comportamiento en SANOS (Plewa 1998, 53 voluntarios): el pulso se altera en el 11% y hay parestesias en el 11%, pero DOLOR en el 0%; con el dolor como criterio, el límite superior de falsos positivos es del 7%.',
    },
    // "Equilibrado" AFIRMA que las dos cifras se parecen, y aquí no hay
    // ninguna de las dos: lo que la prueba dice de sí misma, en su propia
    // interpretación, es que no se usa aislada. Eso es exactamente 'weak'.
    utility: 'weak',
    interpretation:
      'Interprétalo dentro de un conjunto de tests, nunca aislado. Y sobre todo: el criterio de positividad decide el resultado. Uno de cada nueve sanos pierde pulso con esta maniobra, así que el pulso por sí solo no vale; ninguno de los 53 sanos de Plewa refirió DOLOR, de modo que el dolor reproducido sí es un hallazgo con peso.',
    // SIN EPÓNIMO, A PROPÓSITO. "Wright-Adson" no nombra esta variante en
    // ninguna fuente abierta. El único "Adson-Wright" encontrado (Reynoso
    // Campo, Ortho-tips 2012;8(1), p. 43) es una maniobra propia del autor con
    // el hombro a 90° de abducción y rotación externa y el codo extendido, no
    // la de Adson con la cabeza al otro lado, y la fila siguiente de este panel
    // es justo la de Wright. "Adson modificado" tampoco sirve: en Cortés Vega
    // 2009 es la abducción a 90° de Gilroy y Meyer que luego fue el EAST.
    // Lo que sí está escrito es que el lado del giro importa: Cortés Vega et
    // al., Osteopatía Científica 2009;4(3):93-103, p. 94
    // (doi 10.1016/S1886-9297(09)73435-6), resume que Wright (1945) vio
    // borrarse el pulso girando hacia cualquiera de los dos lados y que en la
    // serie de Woods (1965), en pacientes con desfiladero, Adson salía positiva
    // en el 63% girando al lado contrario frente al 22% hacia el mismo lado.
    // Es cita secundaria (Woods no se ha abierto): por eso la cifra no sale en
    // la ficha y la fuente no entra en `cite`, que es la de las métricas. Los
    // dos PDF los leyó la verificación del 23 nov; no se reabrieron al aplicar.
    pearl:
      'Hay quien la hace girando la cabeza al lado CONTRARIO, no hacia el lado explorado. Sea cual sea la variante, deja constancia de cuál usaste: cambian los resultados.',
    noDemo:
      'La maniobra suma rotación cervical, extensión del cuello y apnea, y el modelo solo posa una cadena de raquis a la vez; además el hallazgo es la desaparición del pulso radial, que no se ve en el modelo.',
    cite: [
      {
        ref: 'gillard-2001',
        verified: true,
        locator: 'media de todos los tests provocativos 72%/53%, en el resumen (no por test)',
      },
      {
        ref: 'plewa-1998',
        verified: true,
        locator: 'Adson en 53 sanos: pulso 11%, parestesias 11%, dolor 0%; falsos positivos por dolor <=7%',
      },
    ],
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
    // SIN SENSIBILIDAD NI ESPECIFICIDAD, A PROPÓSITO (ver la cabecera).
    //
    // EL NOMBRE SE USA DE DOS MANERAS, y la ficha se queda con la
    // hiperabducción. Wright 1945 (Am Heart J 29:1-19, doi
    // 10.1016/0002-8703(45)90593-x; registro de Crossref abierto el 15 nov 2026)
    // titula su trabajo con la hiperabducción de los brazos, y
    // Fernández-González 1998 (PMID 9585952) habla de la hiperabducción de
    // Wright. Pero Gillard 2001 (PMID 11707008), la única fuente citada,
    // enumera en su resumen la hiperabducción (VPP 92%) y la de Wright como
    // pruebas distintas, sin cifra para la de Wright. Physiotutors
    // (wiki/wrights-test) la describe en dos tiempos: 90° de abducción con
    // rotación externa durante un minuto, y después hiperabducción. El nombre,
    // el demo a 150° y el pectoral menor encendido descansan en la
    // hiperabducción; posar el paso de 90° repetiría casi el demo de Roos. Así
    // que la maniobra y el demo no cambian y el nombre se declara en la nota y
    // en la perla. Pendiente de criterio clínico: esa misma página atribuye el
    // espacio retropectoral al PRIMER paso y el costoclavicular al segundo, al
    // revés que cannotShow y que clinicalStructures.ts.
    metrics: {
      note: 'SIN cifra propia: el 72/53 que suele atribuirse a Wright es la MEDIA de todos los tests provocativos de Gillard 2001, y el 92% que ese resumen da para la hiperabducción es un valor predictivo POSITIVO, no una especificidad. A diferencia de Adson y del EAST, esta maniobra NO entró en el estudio de falsos positivos en sanos, así que de ella no hay ni siquiera ese contraste. Ojo con el nombre: ese mismo resumen enumera la prueba de hiperabducción y la de Wright como pruebas DISTINTAS, y para la de Wright no da ninguna cifra; el 92% es de la que llama de hiperabducción. El epónimo se usa de dos maneras: para la hiperabducción, que es lo que describe esta ficha, y para una maniobra en dos tiempos que empieza con el brazo a 90° de abducción y rotación externa durante un minuto y se repite después en hiperabducción.',
    },
    utility: 'weak',
    interpretation:
      'Poco fiable de forma aislada. Su interés es localizador: cuando es el ÚNICO positivo, orienta al espacio retropectoral (pectoral menor) más que al interescalénico.',
    pearl:
      'Si es positivo, revisa el pectoral menor y la posición escapular: en muchos casos el trabajo terapéutico está ahí y no en los escalenos. Anota qué variante usaste (hiperabducción directa o en dos tiempos desde 90°): el nombre de Wright se usa para las dos.',
    demo: {
      examinerForce: 'applies',
      // PASIVA, PERO SIN LA MANO DEL EXPLORADOR. La mano genérica de
      // RigOverlays.placeResistance se apoya al 82% del segmento del gesto BASE
      // y empuja hacia el reposo del brazo colgando: es la mano de una abducción
      // resistida (contrato en types/orthopedicTest.ts, `examinerHand`). En la
      // captura de la pose sostenida (capturas/despues2/toracica/
      // maniobra-de-wright-hiperabducción.png, 150° con la rotación externa
      // puesta) el guante sale en la cara interna del brazo, cerca del codo
      // (x 320-350, y 312-365 de 728x834), empujándolo hacia abajo, al revés de
      // la maniobra: el explorador lleva el brazo a la hiperabducción, lo
      // sostiene y palpa el pulso radial en la muñeca. La verificación de la
      // captura de Wright (23 nov) ya da por confirmada la mano dibujada en esta
      // prueba pasiva. `examinerHand: false` quita la mano y conserva la
      // etiqueta y las instrucciones de prueba pasiva, que aquí son las
      // correctas.
      examinerHand: false,
      // La hiperabducción: el brazo por encima de la cabeza con rotación
      // externa. SE QUEDA EN 150 A PROPÓSITO: 150 es T_SPINE en
      // biomech/shoulderChain.ts, donde la cadena de la abducción empieza a
      // inclinar el raquis hacia el otro lado (T12..T1 y L5..L1). Por encima, el
      // aim de RigModel deja el brazo a su ángulo EN EL MUNDO después de esa
      // inclinación: lo que crece es el tronco (reparto de shoulderChain: 18
      // grados a 170 y 27 a 180; trunkLean.test.ts fija 25-29 a 180 y 0 por
      // debajo de 150) y el brazo respecto al tórax apenas gana unos grados
      // (calculado con las constantes, sin medir en 3D). Esta maniobra mueve el
      // brazo, no el tronco. Subirlo pide antes conducir la abducción sin esa
      // inclinación y un banco del brazo contra la cabeza: audit-demo-path solo
      // mira antebrazo y mano dentro del tronco (rodajas de y 0,98 a 1,46 m),
      // así que con el brazo en alto no puede marcar nada.
      movementId: 'glenohumeral-abduction',
      angleDeg: 150,
      side: 'R',
      components: [{ movementId: 'glenohumeral-external-rotation', angleDeg: 60 }],
      highlightStructureIds: ['pectoralis-minor'],
      // Bajo el pectoral menor la arteria ya es la AXILAR, no la subclavia.
      // Ahmed 2022 (PMC10426640, 'Thoracic outlet anatomy and biomechanics') y
      // Uzun 2026 (PMC13205449, 'Radiological Anatomy'), textos completos
      // abiertos el 23 nov 2026, ponen en el espacio retropectoral la arteria
      // axilar (Uzun, también la vena) y los fascículos del plexo, con el
      // pectoral menor como pared ANTERIOR, no como techo (arriba queda la
      // coracoides en Ahmed; en Uzun, por detrás y por arriba, el
      // subescapular). Según Uzun, la TC y la RM en sanos muestran que elevar
      // el brazo lo ESTRECHA. El pulso que se palpa es el radial, y eso ya lo
      // dice `note`.
      //
      // EL BRILLO NO SE DISTINGUE, Y SE DICE. En la misma captura, píxeles
      // cálidos (tono 12-35°, saturación >= 0,30, valor >= 0,55; el resalte
      // mezcla el difuso hacia 0xf97316, RigOverlays.paintImplicated) en el
      // pecho derecho bajo la coracoides (x 340-420, y 485-590): 910 de 8.400,
      // frente a 1.006 en su espejo izquierdo, que no se enciende; el gemelo
      // encendido de Thompson da 10.034 de 24.000 con el mismo criterio. Junto a
      // la coracoides hay un parche cálido (x 340-385, y 440-485: 608 de 2.025,
      // espejo 7) que no se puede atribuir al resalte: Roos, que no enciende el
      // pectoral menor, tiene otro en el hombro derecho, también con el brazo
      // elevado (x 380-480, y 370-410: 818 de 4.000, espejo 38). Recontado el
      // 23 nov sobre capturas/despues2. Donde está el músculo no hay nada que lo
      // separe del lado apagado, así que la frase sigue al verificador de la
      // revisión (U25, que proponía "no se ve") en vez de "apenas se
      // distingue", y dice "no se distingue", que es lo que mide el recuento.
      // Hasta la pasada de rayos X del pendiente 4 de CLAUDE.md.
      cannotShow:
        'La arteria axilar y los fascículos del plexo braquial, que pasan bajo el pectoral menor, están en una capa que el laboratorio no muestra. Se enciende el pectoral menor: la pared anterior del espacio retropectoral, que la hiperabducción estrecha. Queda bajo el pectoral mayor, así que desde la vista frontal del demo su brillo no se distingue.',
      // El modelo siempre está de pie, así que la nota dice que la prueba se
      // hace sentado (regla de la revisión del 15 nov para todos los demos), y
      // dice por qué el brazo se queda en 150 (ver el comentario de angleDeg) y
      // que la mano del explorador no se dibuja.
      note:
        'El paciente está sentado y el explorador palpa el pulso radial mientras mantiene la posición hasta un minuto; el modelo, de pie, enseña la posición del brazo, no el pulso, y no dibuja la mano del explorador. El brazo se queda en 150° porque, por encima, el modelo completa la elevación inclinando el tronco hacia el otro lado, y esta maniobra mueve el brazo, no el tronco: en la prueba real el explorador lo lleva hasta el final de su recorrido.',
    },
    cite: [
      {
        ref: 'gillard-2001',
        verified: true,
        locator: 'media de todos los tests provocativos 72%/53%, en el resumen (no por test)',
      },
    ],
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
    noDemo:
      'Es una compresión anteroposterior y lateral de la caja torácica: el rig gira articulaciones, no comprime.',
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
      'Diferenciar un dolor torácico lateral de origen intercostal de uno de origen pleural.',
    maneuver:
      'Paciente sentado con los brazos elevados. Se le pide inclinar el tronco hacia un lado y después hacia el otro, y se le pregunta en qué lado aparece el dolor.',
    // LOS LADOS SALEN DE FUENTES ABIERTAS (15 nov 2026). La ficha ponía la
    // pleura en el lado cóncavo y la neuralgia en el convexo, al revés que todas
    // las fuentes que se abrieron. Neuritis o neuralgia intercostal en el
    // cóncavo: clinicalgate.com/thoracic-spine/ (cap. 7, apartado del signo de
    // Schepelmann; la página no nombra el libro, y la atribución a Evans,
    // Instant Access to Orthopedic Physical Assessment, 2.ª ed., es inferida por
    // el ISBN de sus imágenes), el diccionario médico
    // medicine.en-academic.com/160816/Schepelmann_sign y chiro-board-review
    // (teachable, lección 24261328). Pleura en el convexo: el diccionario (en la
    // pleuritis seca duele más al inclinarse hacia el lado sano), orthofixar.com
    // (?p=13577) y chiro-board-review; clinicalgate la nombra solo como
    // diferencial de la miofascitis del lado convexo. orthofixar no habla de
    // nervio: en el cóncavo pone la distensión intercostal y las articulaciones
    // costovertebrales y costotransversas. Por eso el objetivo ya no dice
    // "(muscular)": con los lados corregidos, el músculo intercostal y la pleura
    // caen los dos en el convexo, y lo que separa el cóncavo es el nervio.
    // Magee, la cita de la ficha, no se abrió: sigue verified: false.
    positive:
      'Dolor en el lado CÓNCAVO (el lado hacia el que se inclina) sugiere neuritis o neuralgia intercostal; dolor en el lado CONVEXO (el que se estira) sugiere lesión intercostal (miofascitis o distensión) y obliga a diferenciar un origen pleural.',
    metrics: {
      note: 'Signo clásico de exploración, sin estudios de precisión diagnóstica que permitan dar sensibilidad ni especificidad.',
    },
    utility: 'weak',
    interpretation:
      'Es una prueba de ORIENTACIÓN, no de diagnóstico. Su utilidad real es levantar la sospecha de una causa no musculoesquelética y decidir la derivación.',
    pearl:
      'Ante un dolor torácico que no se modifica con NINGÚN movimiento ni con la palpación, la causa mecánica es improbable: deriva.',
    demo: {
      highlightStructureIds: ['thoracic-intercostals'],
      // EL BRILLO DE LOS INTERCOSTALES NO SE VE, Y SE DICE. Captura de la pose
      // sostenida a 25° tras el arreglo del recorte (ae0c5e5;
      // capturas/despues2/toracica/prueba-de-schepelmann.png): en la pared
      // lateral derecha del tórax, con el brazo derecho (x 90-260, y 420-720 de
      // 728x834), 125 de 51.000 píxeles cálidos (tono 12-35°, saturación
      // >= 0,30, valor >= 0,55; el resalte mezcla el difuso hacia 0xf97316,
      // RigOverlays.paintImplicated), frente a 10.034 de 24.000 en el gemelo
      // encendido de Thompson con el mismo criterio. Hasta la pasada de rayos X
      // del pendiente 4 de CLAUDE.md.
      cannotShow:
        'De los dos lados del diagnóstico diferencial solo se puede mostrar uno: los intercostales sí están en el rig, la pleura no está en el modelo. Y los intercostales quedan bajo los músculos de la pared del tórax: desde la vista frontal del demo su brillo no se ve.',
      movementId: 'thoracic-lateral-flexion',
      angleDeg: 25,
      // El modelo siempre está de pie, así que la nota dice que la prueba se
      // hace sentado (regla de la revisión del 15 nov para todos los demos).
      note: 'El modelo muestra la inclinación torácica de la maniobra, de pie; la prueba real se hace sentado y con los brazos elevados por encima de la cabeza.',
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
    // SIN CIFRA DE REFERENCIA, A PROPÓSITO. Decía "en torno a 35° por lado" con
    // Magee sin verificar como única fuente. Ese 35 coincide con el tope del
    // arco de libro que da thoracicRom (30-35°, una referencia y no una medida),
    // y no sirve de vara para una rotación medida sentado: en 26 sanos
    // (Ichikawa 2024, PMID 38434995, Tabla 1 del texto completo PMC10904216,
    // abierto el 23 nov 2026) la misma rotación derecha midió 29,91° por
    // resonancia, 35,40° con la lumbar bloqueada y 42,13° (DE 12,05) sentado
    // con goniómetro electrónico, un balón entre las piernas y los brazos
    // cruzados sobre una barra; 35° queda a menos de una desviación típica por
    // debajo de la media sentada de los sanos. Esteban-González 2022 (48
    // estudios) atribuye la dispersión a que cada aparato usa su protocolo. La
    // ruta de Aprender ('thoracic-rotation-seated' en thoracicPhases.ts) ya
    // define este positivo sin cifra.
    positive:
      'Asimetría clara entre lados o rotación global claramente reducida, con o sin dolor. No hay un valor normal único con el que comparar la amplitud, porque la cifra cambia con el protocolo de medida: compárala con el otro lado y con la medida previa del mismo paciente.',
    metrics: {
      note: 'Prueba de MOVILIDAD, no de diagnóstico: se informa por fiabilidad y por comparación entre lados, no por sensibilidad y especificidad.',
    },
    utility: 'weak',
    interpretation:
      'Una pérdida de rotación torácica se compensa arriba (cervical) o abajo (lumbar). Encontrarla no da un diagnóstico, pero sí un objetivo de tratamiento cuando el dolor está en las regiones vecinas.',
    pearl:
      'Sentarse a horcajadas es lo que hace válida la prueba: sin bloquear la pelvis estás midiendo rotación de tronco entera, no torácica.',
    // EL OBLICUO EXTERNO, NO LOS ROTADORES (revisión del 15 nov 2026). El demo
    // se sostiene a 35°, en la fase que el guion de la rotación da a los
    // oblicuos ("Rango medio-final (motor abdominal)", thoracicRom.ts y
    // thoracicPhases.ts), y a 35° la envolvente pone al oblicuo externo en 0,95
    // y a los rotadores en 0,6 (thoracicRom.ts, activations). Los rotadores son
    // profundos y posteriores: con la cámara del plano transversal (de frente y
    // desde arriba, labCamera.ts) su etiqueta caía sobre el pectoral mayor
    // derecho (captura de la app a 35°,
    // capturas/antes/toracica/rotación-torácica-en-sedestación.png). McGill 1991
    // (PMID 1824571): el oblicuo externo interviene con fuerza en el par axial
    // en todo el arco del giro. Nitz y Peck 1986 (PMID 2422993): el rotador
    // corto tiene de 4,58 a 7,30 veces más volumen de husos que el multífido y
    // el semiespinoso, un papel de monitor más que de motor. El par con el
    // oblicuo interno del lado opuesto es dato propio de la app (Kapandji,
    // pageVerified: false), igual que en el guion de la rotación. Medido con el
    // oblicuo en la captura de la pose sostenida tras el arreglo del recorte
    // (ae0c5e5; capturas/despues2/toracica/rotación-torácica-en-sedestación.png,
    // 35°): brilla en el flanco derecho (x 240-340, y 600-740 de 728x834: 4.166
    // de 14.000 píxeles cálidos, tono 12-35°) y el punto de su etiqueta cae
    // encima, por fuera del brazo derecho.
    //
    // Sin `side`: el R por defecto enciende el oblicuo externo DERECHO, y el rig
    // gira el pecho hacia +x, que es la izquierda anatómica (npm run
    // audit-direction, 'thoracic-rotation': giro +15,2 cm, el frente mira a +x;
    // repetido el 15 nov 2026). El oblicuo externo gira el tronco al lado
    // contrario (muscles/spine.ts), así que el derecho es el agonista de ese
    // giro. Si cambia el signo del raquis, cambia el lado.
    demo: {
      cannotShow:
        'Las articulaciones costotransversas no tienen malla propia en el rig. Se enciende el oblicuo externo, que con el oblicuo interno del lado opuesto genera el giro del tronco. Los rotadores, profundos y segmentarios, son sobre todo propioceptivos: afinan el giro más que generarlo.',
      movementId: 'thoracic-rotation',
      angleDeg: 35,
      highlightMuscleId: 'external-oblique',
      // EL MODELO ESTÁ DE PIE, y la nota lo dice como en Roos, Wright y
      // Schepelmann (regla de la revisión del 15 nov para todos los demos).
      // Antes solo nombraba la posición a horcajadas. 'thoracic-rotation' gira
      // solo T12-T1 (boneMap.ts, THORACIC_BONES, 0-35°), así que la pelvis y
      // la lumbar no se mueven, y en la captura de la pose sostenida
      // (capturas/despues2/toracica/rotación-torácica-en-sedestación.png, 35°)
      // los brazos cuelgan, cuando la maniobra los cruza sobre el pecho o pone
      // un bastón sobre los hombros.
      note: 'El modelo, de pie y con los brazos colgando, rota solo la columna torácica, con la pelvis y la columna lumbar quietas. En la prueba real el paciente está sentado a horcajadas en la camilla, que es lo que bloquea la pelvis, con los brazos cruzados sobre el pecho o un bastón sobre los hombros.',
    },
    // Esteban-González respalda que el positivo no lleve cifra (resumen abierto
    // el 23 nov 2026, conclusiones). Magee sigue sin abrir.
    cite: [
      { ref: 'magee', verified: false },
      {
        ref: 'esteban-2022',
        verified: true,
        locator:
          'conclusión: las medidas torácicas de distintos aparatos son muy dispares porque cada uno usa un protocolo distinto (resumen)',
      },
    ],
  },
];

export const THORACIC_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
