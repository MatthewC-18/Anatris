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
// lumbar pasiva), Hicks 2005 (inestabilidad en prono) y Rabin 2014 (su
// validación), Laslett 2005 (clúster SI).
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
      examinerForce: 'applies',
      cannotShow:
        'El nervio ciático y las raíces L4-S1 no se pueden encender: el rig no trae raíces, y de los nervios del miembro inferior solo tiene las ramas del peroneo, con un material que las deja en una capa que el laboratorio no muestra. Lo que se demuestra es la puesta en tensión.',
      // LA MANIOBRA ES FLEXION DE CADERA CON LA RODILLA EXTENDIDA, no flexion
      // lumbar: el Lasegue pone en tension el ciatico elevando la pierna recta,
      // y el raquis no se mueve. Esto ensenaba `lumbar-flexion@25`, con una
      // nota que admitia que el modelo "solo muestra el raquis lumbar", y
      // ademas era la MISMA pose que el Lasegue cruzado.
      //
      // LA NOTA DICE LO QUE EL MODELO ENSENA Y LA MANIOBRA NO (revision del 15
      // nov contra la captura de la app, capturas/antes/lumbar/elevacion-de-la-
      // pierna-recta-lasegue.png):
      //   - la prueba es en SUPINO y el modelo esta de pie;
      //   - la UNICA mano que dibuja el rig (RigOverlays.placeResistance: al 82%
      //     del femur, en la cara hacia la que avanza el miembro y empujando
      //     hacia el reposo) cae en la cara anterior del muslo distal. Es la
      //     mano que mantiene la rodilla extendida (EBMConsult,
      //     straight-leg-raising-test: una mano eleva desde el tobillo y la otra
      //     se apoya en la cara anterior del muslo), asi que el contacto es real
      //     y `examinerForce` se queda con su mano. La lectura dice "la fuerza la
      //     aplicas tu donde se apoya la mano", y la fuerza que eleva va en el
      //     tobillo: por eso la nota nombra las dos manos;
      //   - el modelo de pie inclina el tronco HACIA DELANTE al flexionar la
      //     cadera (RigModel, HIP_BALANCE_*, signo de lumbar-flexion): a 60
      //     grados, 16 x (60-25)/(90-25) = 8,6 grados repartidos en L1-L5,
      //     CALCULADO con esas constantes, no medido. En la prueba el raquis
      //     lumbar y la pelvis no se mueven (la misma fuente: un cambio de la
      //     curva invalida la prueba). Quitar esa inclinacion en los demos es
      //     una decision de diseno del usuario, que la pidio y la calibro en el
      //     laboratorio: aqui solo se dice.
      movementId: 'hip-flexion',
      angleDeg: 60,
      side: 'R',
      note: 'La prueba se hace en SUPINO y el modelo la enseña de pie: mira la cadera a 60° con la rodilla extendida, no la postura global. La mano dibujada en la cara anterior del muslo es la que mantiene la rodilla en extensión; la que eleva la pierna sujeta el tobillo y no se dibuja. Al estar de pie, el modelo inclina un poco el tronco hacia delante: no es parte de la maniobra, en la que el raquis lumbar y la pelvis no se mueven. La banda que interesa es 30 a 70°.',
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
      examinerForce: 'applies',
      cannotShow:
        'El nervio ciático y las raíces L4-S1 no se pueden encender: el rig no trae raíces, y de los nervios del miembro inferior solo tiene las ramas del peroneo, con un material que las deja en una capa que el laboratorio no muestra. Lo que se demuestra es la puesta en tensión.',
      // Lo que distingue al cruzado es QUE PIERNA se eleva: la sana. Por eso el
      // lado es el contrario al del Lasegue, y por eso las dos demostraciones
      // ya no son el mismo clip.
      //
      // Y lleva los mismos avisos que el Lasegue (ver alli el porque y la
      // cifra calculada de la inclinacion): supino frente a de pie, la mano
      // dibujada es la que mantiene la rodilla extendida y no la que eleva, y
      // el tronco que se inclina no es parte de la maniobra. Captura de la app:
      // capturas/antes/lumbar/elevacion-cruzada-de-la-pierna-recta.png.
      movementId: 'hip-flexion',
      angleDeg: 60,
      side: 'L',
      note: 'Se eleva la pierna SANA (el modelo levanta la contraria a la del Lasègue); el positivo es el dolor en la pierna sintomática. La prueba se hace en SUPINO y el modelo la enseña de pie. La mano dibujada sobre la cara anterior del muslo es la que mantiene la rodilla extendida; la que eleva la pierna sujeta el tobillo y no se dibuja. Al estar de pie, el modelo inclina un poco el tronco hacia delante: no es parte de la maniobra, en la que el raquis lumbar y la pelvis no se mueven.',
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
    // EL SLUMP ES UNA PIERNA RECTA EN SEDESTACION, no una flexion lumbar de pie
    // (revision del 15 nov). Majlesi 2008 (PMID 18391677, resumen abierto por
    // E-utilities) lo presenta como una variante en sedestacion del SLR que
    // suma la flexion del raquis y de la cadera a la elevacion de la pierna. Lo
    // que habia posaba solo la flexion lumbar a 40: el muslo seguia vertical, y
    // con la cadera en 0 la rodilla extendida no tensa nada.
    //
    // La cadera y la flexion dorsal se sostienen encima de una base de raquis:
    // applyComponents (RigModel) solo exige componentes 'joint' y los resuelve
    // con el lado del demo. La rodilla queda recta porque los componentes no
    // llevan acoplamientos (y el de la cadera profunda empieza pasados 90). NO
    // poner knee-extension de componente: comparte hueso, eje y signo con la
    // flexion, y RigModel no mira arcFrom, asi que la DOBLARIA. Torax y cuello
    // no pueden acompanarla: un componente de raquis se descarta. Flexion dorsal
    // a 20: todo el arco, como el miotoma L4 (neuro/lumbosacral.ts). Sin
    // `order`: base-first lleva el tronco antes que la pierna, que es el orden
    // de la maniobra. Sin `examinerForce`, como estaba: la base es de raquis.
    //
    // MEDIDO antes de publicarlo, porque es el primer demo con componentes
    // sobre una base de raquis y ahi NO corre la holgura de brazos de los demos
    // de pierna (los brazos van rigidos con T3). Banco sin navegador
    // (scratchpad lumbar-aplicar/medir-slump*.mts: rigPose con base y
    // componentes como RigModel, trazo base-first de demoTimeline en 17
    // instantes):
    //   - brazo derecho (humero a dedos) contra muslo, pierna y pie: la piel
    //     mas cercana queda a 4,0 cm o mas en todo el trazo (9,8 cm en la
    //     espera) y, mientras sube la pierna, ningun vertice del brazo cae
    //     dentro del miembro;
    //   - muslo (a mas de 12 cm de la cadera) contra la piel del abdomen y del
    //     torax: ningun vertice del muslo dentro del tronco en los 17 instantes
    //     (perfil polar del tronco posado), y la distancia minima baja a 1,0 cm
    //     en la espera. Referencia en el mismo banco: la cadera a 90 de pie con
    //     16 grados de flexion lumbar, que es lo que RigModel anade por
    //     HIP_BALANCE (rigPose no lo hace; aqui va emulado con lumbar-flexion),
    //     deja 2,0 cm, y la ingle se pliega igual que en esa pose (renders de
    //     perfil desde la derecha);
    //   - la punta del pie llega a z = 0,80 m (delante): el recorte por defecto
    //     de render-test-demo (z hasta 0,75) la corta, usar BOX=-1,1,0,1.9.
    // Queda mirarlo en el navegador (el guardian del encuadre con la pierna).
    demo: {
      cannotShow:
        'Es neurodinamia: el tracto neural no está en ninguna capa que el laboratorio pueda mostrar. Lo que se demuestra es la secuencia con la que se pone en tensión.',
      movementId: 'lumbar-flexion',
      angleDeg: 40,
      side: 'R',
      components: [
        { movementId: 'hip-flexion', angleDeg: 90 },
        { movementId: 'ankle-dorsiflexion', angleDeg: 20 },
      ],
      note: 'La prueba se hace sentado y el modelo la enseña de pie: sobre la flexión lumbar quedan el muslo a 90°, la rodilla extendida y el tobillo en flexión dorsal, que es la posición final del miembro inferior. En la prueba la cadera está flexionada desde el principio y lo que se mueve es la rodilla al extenderse; el modelo no puede animar ese paso, así que la pierna sube ya recta. Faltan la flexión torácica y la cervical (el modelo solo posa una región del raquis a la vez), y por eso tampoco enseña lo que interpreta la prueba: que los síntomas cambien al soltar la flexión cervical.',
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
    // LA VERSION CON LA QUE SE MIDIERON LAS CIFRAS, y el criterio de positivo de
    // esa misma fuente (revision del 15 nov). Suri 2011, PMID 20543768, texto
    // completo PMC2978791 abierto por E-utilities, Metodos: en prono, el
    // explorador sujeta el tobillo del lado sintomatico y facilita una flexion
    // SUAVE de la rodilla; es positivo si reproduce el dolor HABITUAL del
    // miembro inferior. El texto anterior contaba cualquier dolor en la cara
    // anterior del muslo, y con ese criterio un recto femoral corto puntuaria
    // como positivo: el 100% de especificidad no se midio asi. La extension de
    // cadera y el decubito lateral no estan en esa version; se nombran como
    // variantes, no se borran (si el demo las conserva lo decide un clinico).
    // "Suele estar en la cara anterior del muslo": Tabla 2 del mismo texto, 17
    // de 25 con compresion L2-L4 (L2 2 de 2, L3 10 de 10, L4 5 de 13; en L4
    // domina la cara lateral del muslo, 8 de 13).
    maneuver:
      'En prono, el explorador sujeta el tobillo del lado sintomático y flexiona suavemente la rodilla: es la versión con la que se midieron las cifras. Añadir extensión de cadera (como hace el modelo) o hacerla en decúbito lateral son variantes que esas cifras no cubren.',
    positive:
      'Reproduce el dolor habitual del paciente en el miembro inferior sintomático (en la compresión L2-L4 suele estar en la cara anterior del muslo). Una molestia en el muslo que no es su dolor habitual no cuenta como positivo.',
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
    // La lista de falsos positivos ya estaba y NO viene de Suri 2011, que no
    // la trata; lo que si viene de alli es el criterio (su dolor habitual).
    pearl:
      'Falsos positivos por acortamiento del recto femoral o del psoas, o por patología de cadera: lo que cuenta es que reproduzca el dolor habitual del paciente, no cualquier molestia en la cara anterior del muslo.',
    // LA PRUEBA ES DE RODILLA, en prono; la cadera es una variante.
    //
    // Lo que habia posaba una extension lumbar de 20 grados, de pie: no es la
    // maniobra ni la posicion. Ahora flexiona la rodilla (shin_flex) con 15
    // grados de extension de cadera (femur_base): dos huesos distintos, asi que
    // se sostienen a la vez.
    //
    // La version medida (Suri 2011, ver la maniobra) es solo la flexion de
    // rodilla. La nota decia que la extension de cadera "es lo que tensa el
    // nervio femoral" y la maniobra ya la presenta como variante: ahora la nota
    // dice lo mismo. El demo no cambia, porque quitar la cadera o dejarla como
    // variante es una decision clinica pendiente (revision del 15 nov). La mano
    // del explorador no se dibuja: no hay `examinerForce`.
    demo: {
      cannotShow:
        'El nervio femoral y las raíces L2-L4 no están en el rig. Lo que se demuestra es la posición que los pone en tensión.',
      components: [{ movementId: 'hip-extension', angleDeg: 15 }],
      movementId: 'knee-flexion',
      angleDeg: 90,
      side: 'R',
      note: 'La prueba se hace en PRONO: el modelo la enseña de pie, así que mira los ángulos, no la postura global. La flexión de rodilla es el gesto de la versión con la que se midieron las cifras. Los 15° de extensión de cadera que añade el modelo son una variante que esas cifras no cubren.',
    },

    cite: [
      {
        ref: 'suri-2011',
        verified: true,
        locator:
          'Métodos: en prono, flexión suave de rodilla, positivo si reproduce el dolor habitual; Tabla 3: 50% (31-69) / 100% (88-100), LR+ infinito; Tabla 4: L3 70%/88%',
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
    // LA MANIOBRA ES LA DE KASAI 2006, que es la fuente de las cifras. Su resumen
    // (PMID 17033040) no la describe y el texto completo es de pago; la
    // reproducen citandolo Ferrari 2015 (PMC4392873, tabla de pruebas, ref. 25)
    // y Rathod 2019 (PMC6469328), los dos abiertos en Europe PMC con la misma
    // frase: prono, las dos piernas a la vez a unos 30 cm de la camilla,
    // rodillas extendidas "and gently pulling the legs". Faltaba ese tiron.
    // "Por los tobillos" solo lo dice una ficha de Physiotutors, no esa
    // descripcion, y no se escribe (revision del 15 nov, U28).
    maneuver:
      'En prono, el explorador eleva ambas piernas juntas unos 30 cm sobre la camilla, con las rodillas extendidas y tirando suavemente de las piernas, lo que extiende pasivamente la columna lumbar.',
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
      // EL MODELO ESTA DE PIE Y NO LEVANTA LAS PIERNAS: 'lumbar-extension' gira
      // solo L5-L1 del Spine_Armature (boneMap.ts, LUMBAR_BONES), la pelvis no
      // se posa (lumbarCoupling.ts, LUMBOPELVIC_PELVIS_POSED = false) y
      // RigModel arrastra los hombros con el raquis, asi que el tronco se va
      // hacia atras sobre unas piernas quietas. En la prueba es al reves: el
      // tronco queda en la camilla y suben las piernas. La nota anterior decia
      // que eso "es lo que muestra el modelo". Captura en la espera, a 30 grados
      // ("Rango final"): capturas/despues2/lumbar/extension-lumbar-pasiva.png;
      // es un plano lateral cerrado del tronco en el que las piernas no salen,
      // asi que lo de las piernas lo establece el codigo, no la imagen. Se avisa
      // igual que en la tension femoral. Los 30 grados no se nombran: no tienen
      // fuente y estan pendientes de criterio clinico (J21). Sigue sin
      // `examinerForce`: la revision (U28) solo corrige el texto. Con
      // `examinerHand: false` podria declararse pasiva sin dibujar una mano,
      // pero es otra decision y no se toma aqui.
      note: 'La prueba se hace en PRONO y el modelo está de pie: solo extiende la columna lumbar, inclinando el tronco hacia atrás, y no levanta las piernas. En la prueba el paciente está relajado: el tronco se queda en la camilla y son las piernas las que suben.',
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
    // DOS REGLAS, NO UNA, Y LA PIERNA RECTA NO ES EL LASEGUE (revision del 15
    // nov, U27). El resumen de Hicks 2005 (PMID 16181938, E-utilities) habla de
    // reglas preliminares en plural, una para el exito (LR+ 4,0) y otra para el
    // fracaso (LR- 0,18), y de seis variables de peso entre las dos; la de la
    // pierna recta es su amplitud media por encima de 91 grados (PMC8609735,
    // Chatprem 2021, que cita a Hicks) en pacientes sin dolor radicular, no el
    // signo que esta app llama Lasegue. La nota decia "una regla con seis
    // variables", "Lasegue" y "0,18" sin decir que es negativa, y llevaba dos
    // guiones dobles en texto visible. Las 72% / 58% no estan en el resumen,
    // pero dos revisiones abiertas se las atribuyen a este estudio: PMC8351422
    // lo nombra ("Hicks and colleagues", con LR+ 1,7 y LR- 0,48) y PMC11433180
    // lo cita como su ref. 26. Cuadran con 13/18 y 21/36 sobre los 18 exitos
    // de 54 (y con esas LR): si salen de ahi, miden si la prueba predice el
    // exito, no un diagnostico. La validacion posterior es Rabin 2014 (PMID
    // 24261926, resumen abierto): no valido la regla del exito y, por poca
    // potencia, tampoco la descarto.
    metrics: {
      note: 'SIN cifras de diagnóstico, y por un motivo de fondo: el estudio original (Hicks 2005, 54 pacientes con lumbalgia no radicular) no mide si la prueba acierta un diagnóstico, sino si predice la RESPUESTA a ocho semanas de ejercicio de estabilización. Las cifras que circulan (72% / 58%) se le atribuyen, pero no están en su resumen; si salen de su texto, miden si la prueba predice el éxito del tratamiento, no si acierta un diagnóstico. Lo que publica Hicks son dos reglas preliminares, una para predecir el éxito (razón de verosimilitud positiva 4,0) y otra para el fracaso (razón de verosimilitud negativa 0,18), y las variables que más pesaron fueron seis: edad, amplitud de la elevación de la pierna recta (no el signo de Lasègue: nadie tenía dolor radicular), esta prueba, movimientos aberrantes, hipermovilidad lumbar y creencias de miedo y evitación. Un ensayo posterior (Rabin 2014, 105 pacientes) no pudo validar la regla del éxito, aunque por su poca potencia tampoco pudo descartarla; una versión con solo esta prueba y los movimientos aberrantes parece predecir mejor, pero salió de un análisis a posteriori y está por confirmar.',
    },
    utility: 'weak',
    // Ninguna de las dos fuentes citadas (Hicks 2005, Rabin 2014) mide
    // precision diagnostica: las dos miden la respuesta al tratamiento. Por eso
    // ni "precision moderada" (el panel pinta a la vez "poca precision aislado"
    // por `weak`) ni "un positivo predice buena respuesta" a secas.
    interpretation:
      'Ninguna de las fuentes citadas mide su precisión diagnóstica, así que, sola, la prueba no permite confirmar ni descartar una inestabilidad. Lo estudiado es su valor pronóstico, y dentro de una regla preliminar: es una de las variables con las que Hicks intentó predecir quién responde a un programa de estabilización lumbar, y el ensayo que después intentó validar esa regla no lo consiguió.',
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
        locator: 'Reglas de predicción de la respuesta (éxito y fracaso): LR+ 4,0 / LR− 0,18 (no es precisión diagnóstica)',
      },
      {
        // La validacion de la regla de Hicks, con resumen abierto (PMID
        // 24261926, E-utilities): ensayo aleatorizado de 105 pacientes; la regla
        // de cuatro elementos no se valido ni, por poca potencia, se pudo
        // descartar; la de dos (movimientos aberrantes y esta prueba positiva)
        // mostro interaccion con el tratamiento, pero salio a posteriori.
        ref: 'rabin-2014',
        verified: true,
        locator:
          'Validación: la regla de cuatro elementos no se validó (ni se pudo descartar, por poca potencia); la de dos (esta prueba y movimientos aberrantes) salió a posteriori',
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
    // LA CIFRA DEL CONJUNTO ES LA DE LA FUENTE QUE CITA ESTA FICHA. El resumen
    // de Laslett 2005 (PMID 16038856, abierto por E-utilities) da 94% y 78%
    // para tres o mas positivas de seis, y anade que si ninguna de las seis
    // provoca el dolor familiar la sacroiliaca queda descartada como origen del
    // dolor lumbar actual; es lo mismo que ensena Combinar (testClusters.ts,
    // si-laslett). El 91% / 78% que habia aqui es el del resumen de la revision
    // de Laslett 2008 (PMID 19119403), que esta ficha no cita: la tarjeta decia
    // 91 en la perla y 94 en el localizador de su propia fuente, dos lineas mas
    // abajo. "Thrust sacro" pasa a "empuje sacro", el nombre de su ficha. Por
    // que cinco entradas son seis pruebas (el Gaenslen de cada lado) solo sale
    // de una copia no oficial del texto completo: queda fuera del texto visible
    // (revision del 15 nov, U26).
    pearl:
      'Conjunto de Laslett (distracción, empuje del muslo, compresión, empuje sacro y Gaenslen; en el estudio son seis pruebas): con 3 o más positivas, sensibilidad 94% y especificidad 78%, y si las seis son negativas la sacroilíaca queda descartada como origen del dolor. Usa el botón "Combinar".',
    // LA RAZON ERA FALSA (revision del 15 nov): las dos caderas del modelo NO
    // son el mismo hueso. Hay un Leg_Armature por lado, cada uno con su
    // femur_base (boneMap: resolveArmatureName da Leg_Armature_R o _L). Lo que
    // impide el demo es que un demo lleva un solo `side`, `TestDemoComponent`
    // no tiene lado y RigModel resuelve la base y cada componente con ese mismo
    // lado: la flexion de una cadera y la extension de la contraria no se
    // pueden declarar. Tumbarse no es la razon: este fichero ensena de pie
    // pruebas en supino y en prono, y lo avisa en su nota.
    noDemo:
      'Pide las dos caderas a la vez en direcciones opuestas: una en flexión máxima sobre el pecho y la otra colgando en extensión al borde de la camilla. Cada cadera del modelo es un hueso distinto, pero un demo solo posa un lado a la vez, así que no puede sostener la flexión de una y la extensión de la otra.',
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
