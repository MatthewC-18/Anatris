// src/data/orthopedicTests/elbow.ts
//
// ELBOW orthopedic special tests, grouped by clinical target: epicondilalgia
// lateral (codo de tenista), epicondilalgia medial (codo de golfista), ligamento
// colateral cubital (LCU) y neuropatía del cubital en el túnel cubital.
//
// HONESTY: the elbow literature is thin (Zwerus 2018 found weak evidence for most
// tests). Where a defensible figure exists it is CHECKED (verified: true +
// locator); the provocation tests without solid accuracy data stay note-only or
// verified: false and say so.
//
// Sources (see references.ts): Saroja 2014 (Cozen/Maudsley/Mill), O'Driscoll 2005
// (moving valgus), Novak 1994 (Tinel + flexión-compresión del cubital), Zwerus
// 2018 (revisión de la evidencia de la exploración del codo).
//
// ESTADO DE LA VERIFICACION (2026-11-04). Abiertos los tres resumenes
// primarios, cuatro cifras no estaban en su fuente y una prueba se estaba
// quedando sin datos que si existen:
//
//   cozen      79% / 80%  ->  84% / 0%   la fuente dice otra cosa, en AMBAS
//   maudsley   sin cifras ->  88% / 0%   el estudio si las publica
//   tinel      70% / 98%  ->  70% / --   el 98% no esta en Novak 1994
//   flex+compr 91% / 97%  ->  91% / --   el 97% tampoco
//
// Las especificidades del 0% de Saroja no son un error de lectura: en esa serie
// de 30 sujetos, TODOS los que tenian ecografia negativa dieron positivo en las
// dos pruebas resistidas. Con 30 sujetos los negativos son pocos, asi que el 0%
// y el 100% de Mill son extremos de muestra pequena; se muestran con esa
// advertencia en la nota, porque lo que sostienen es la DIRECCION (Cozen y
// Maudsley descartan, Mill confirma) y no el valor exacto.
//
// Y de Novak 1994, el dato que hay que ensenar no es un numero suelto: la
// flexion del codo SOLA tiene sensibilidad 0,32, la compresion sola 0,55, y las
// dos juntas 0,91. La maniobra funciona cuando se anade la compresion.
//
// DEMO note: the elbow rig drives flexión/extensión + pronación/supinación. Most
// tests are resisted/stress maneuvers of the wrist or ligament; the demo poses
// the elbow/forearm position with an honest `note` about the resisted component.
//
// REVISION CONTRA LA MANIOBRA (2026-11-15). Cada demo se comparo con su propia
// maniobra escrita, con su fuente y con su captura en la posicion sostenida.
// Mill se veia al reves y sin la etiqueta de prueba pasiva; Cozen no tenia la
// pronacion que piden su texto y su fuente; la epicondilalgia medial ensenaba
// el codo a 90 y pronado cuando su texto dice extendido y supinado; y la nota
// del valgo dinamico prometia una mano aplicando el valgo que el rig no dibuja.
// El porque y la medida de cada cambio van en su prueba. La mano del explorador
// es siempre la generica de RigOverlays.placeResistance: se apoya al 82% del
// antebrazo y empuja hacia el brazo colgando, asi que solo cuadra con la
// fuerza de la prueba cuando la cara que toca es la que la prueba empuja.
//
// SEGUNDA REVISION (2026-11-23), contra la fuente abierta y contra las
// capturas de la pose sostenida tomadas despues del arreglo del recorte de las
// mallas con piel (scratchpad, capturas/despues2/codo). Cozen describe ya la
// maniobra de Saroja 2014, con la desviacion radial pasiva y al final; Maudsley
// no dibuja la mano (el dedo que se resiste no se mueve en el modelo) y prona,
// como pide la fuente de sus cifras; el valgo dinamico describe la maniobra de
// O'Driscoll 2005 (desde la flexion completa, extension rapida), y los dos
// valgos dicen que el colateral cubital no se ve desde la camara del demo; el
// Tinel lleva su 0,70 sin tiempo; y la flexion-compresion llega a la flexion
// maxima del modelo, 145. Los defectos del rig que siguen en esas capturas
// (placas naranjas detras del olecranon, anillo abierto en la muneca, cola del
// antebrazo al flexionar la muneca) no son del dato y no llevan nota aqui.

import type { OrthopedicTest } from '../../types/orthopedicTest';

const tests: OrthopedicTest[] = [
  // ==================== EPICONDILALGIA LATERAL (TENISTA) ====================
  {
    id: 'cozen',
    name: 'Test de Cozen',
    aka: ['Cozen', 'Extensión resistida de muñeca'],
    region: 'elbow',
    category: 'Epicondilalgia lateral (codo de tenista)',
    target: 'Origen de los extensores (epicóndilo lateral)',
    purpose: 'Provocar el dolor de la epicondilalgia lateral con la contracción resistida.',
    // LA DESVIACION RADIAL ES PASIVA Y VA AL FINAL (revision del 23 nov).
    // Saroja 2014, p. 817 (texto completo abierto, la fuente del 84% y el 0%
    // que se muestran): de pie, codo extendido del todo, antebrazo pronado y el
    // pulgar del explorador sobre el epicondilo lateral; puno cerrado y
    // extension de muneca contra resistencia, SEGUIDA de pronacion y desviacion
    // radial pasiva. El texto daba la desviacion radial como activa y
    // resistida, que es otra variante y no la que midio el estudio. La fuente
    // no dice quien hace la pronacion, asi que la frase no se la asigna a nadie.
    maneuver:
      'De pie, codo en extensión completa y antebrazo pronado, con el pulgar del explorador sobre el epicóndilo lateral. Con el puño cerrado, el paciente extiende la muñeca contra resistencia; después se añaden pronación y desviación radial pasiva.',
    positive: 'Dolor en el epicóndilo lateral al resistir la extensión de la muñeca.',
    metrics: {
      sensitivity: 84,
      specificity: 0,
      note: 'Las dos cifras del único estudio que las mide (Saroja 2014, 30 sujetos, ecografía como patrón de referencia). La especificidad es 0%: en esa serie TODOS los sujetos con ecografía negativa dieron Cozen positivo. Con 30 sujetos los negativos son pocos, así que el 0% es un extremo de muestra pequeña y no una constante; lo que sí sostiene es que esta prueba no confirma nada.',
    },
    utility: 'rule-out',
    interpretation:
      'Sirve para DESCARTAR, no para confirmar: con 84% de sensibilidad un Cozen negativo hace poco probable la epicondilalgia, y un positivo aislado no dice nada. Para confirmar, Mill.',
    demo: {
      movementId: 'elbow-extension',
      angleDeg: 10,
      // The demo drives the ELBOW, but what the test loads is the extensor
      // origin, so that is what the model lights up. Without this the elbow
      // tests posed the arm and glowed nothing, and the only muscles on screen
      // were whatever the free movement had left active -- the pronator group,
      // i.e. the medial mass, in a test about the LATERAL epicondyle.
      highlightMuscleId: 'common-extensor-origin',
      // LA MUNECA SI SE PUEDE MOVER, y es lo que separa a Cozen de Maudsley:
      // los dos ponian el codo a 10 grados y nada mas, asi que en pantalla eran
      // el mismo clip. Cozen resiste la EXTENSION DE MUNECA con el puno cerrado;
      // Maudsley resiste la del tercer dedo, que el modelo no mueve.
      //
      // Y EL ANTEBRAZO PRONADO, que faltaba (revision del 15 nov). El GLB reposa
      // supinado (FOREARM_NEUTRAL en boneMap), asi que sin este componente la
      // muneca se extendia con la palma hacia delante y la mano del explorador
      // caia en la cara VOLAR del antebrazo, empujando hacia el dorso: el mismo
      // sentido que la extension que tenia que resistir. La maniobra lo pide y
      // la fuente de las cifras tambien (Saroja 2014, p. 817: de pie, codo en
      // extension completa y antebrazo pronado). MEDIDO en la pose sostenida
      // (codo a 0, holgura de 35, lado derecho clinico; banco del scratchpad
      // sobre scripts/lib/rigPose.mts, que posa como RigModel): el pulgar pasa
      // de 8,6 cm por fuera del menique (supinado) a 8,3 cm por dentro
      // (pronado), y la cara donde se apoya la mano del explorador, de la volar
      // (coseno +1,00) a la dorsal (-0,88), donde empuja hacia la palma, contra
      // la extension. La mano extendida del paciente queda a 5,2 cm del guante,
      // sin entrar en el, y `npm run audit-demo-path -- cozen` da 0,2% del
      // antebrazo y la mano dentro del tronco en los cuatro ordenes y los dos
      // lados (radio minimo 0,79).
      components: [
        { movementId: 'elbow-pronation', angleDeg: 80 },
        { movementId: 'wrist-extension', angleDeg: 40 },
      ],
      examinerForce: 'resists',
      // El demo sostiene la pronacion de partida (componente) y la extension de
      // muneca. Lo demas no se mueve: ningun movementId mueve los dedos y
      // boneMap no conduce la desviacion de muneca (el eje z de hand_flex no
      // tiene movimiento), asi que el puno y el ultimo paso de Saroja (la
      // pronacion que se anade y la desviacion radial pasiva) van en la frase.
      // "No mueve los dedos" y no "no tiene dedos": la piel de los dedos esta
      // en el modelo y se ve.
      note: 'Con el codo en extensión y el antebrazo pronado se resiste la extensión de la muñeca con el puño cerrado. El modelo no mueve los dedos ni desvía la muñeca: el puño, la pronación que se añade al final y la desviación radial pasiva van en el texto. La mano del explorador se dibuja en la cara dorsal del antebrazo distal, no en el dorso de la mano.',
    },
    cite: [
      { ref: 'saroja-2014', verified: true, locator: 'Cozen: sensibilidad 84%, especificidad 0%' },
    ],
  },
  {
    id: 'mill',
    name: 'Test de Mill',
    aka: ['Mill', 'Maniobra de Mill'],
    region: 'elbow',
    category: 'Epicondilalgia lateral (codo de tenista)',
    target: 'Origen de los extensores (epicóndilo lateral)',
    purpose: 'Provocar el dolor epicondíleo con el estiramiento pasivo de los extensores.',
    maneuver:
      'Antebrazo pronado y muñeca en flexión; el explorador extiende pasivamente el codo estirando la musculatura extensora.',
    positive: 'Dolor en el epicóndilo lateral durante el estiramiento.',
    metrics: {
      sensitivity: 53,
      specificity: 100,
      note: 'Las dos cifras del mismo estudio (Saroja 2014, 30 sujetos, ecografía como patrón de referencia) y la única de las tres pruebas con área bajo la curva ROC significativa (0,769). Especificidad 100% sobre 30 sujetos: el intervalo de confianza real es ancho, pero es la única de la serie que sirve para CONFIRMAR.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico (SpPin): un positivo confirma la epicondilalgia lateral; un negativo no la descarta. Complementa a Cozen (más sensible).',
    // LA MANIOBRA EXTIENDE EL CODO CON LA MUNECA Y EL ANTEBRAZO YA COLOCADOS
    // (Saroja 2014, p. 817: codo a 90, antebrazo pronado y muneca flexionada;
    // manteniendo esa posicion se extiende el codo despacio). Primero el demo
    // barria la pronacion con el codo quieto. Despues, con el orden por defecto
    // ('base-first', demoTimeline.ts), el codo pasaba de 10 a 0 en el primer
    // 20% del trazo (0,48 s de 2,4 s) y luego, con el codo ya recto, el
    // antebrazo pronaba y la muneca se flexionaba: la pelicula al reves
    // (revision del 15 nov). Ahora primero la pronacion y la flexion de muneca
    // con el codo a 90 ('components-first', 2,0 s) y despues la extension de 90
    // a 0 (3,5 s). 'together' no sirve: en reposo los componentes valen 0 y en
    // la ida 1 desde el primer fotograma, y la mano saltaria en cada vuelta.
    // MEDIDO con `npm run audit-demo-path -- mill` (codo desde 90, los dos
    // lados): 0,2% del antebrazo y la mano dentro del tronco en el peor punto
    // con cualquiera de los cuatro ordenes, radio minimo 0,79 (la revision
    // midio lo mismo con 10 grados). El banco elige 'base-first' en un empate;
    // el orden se declara por la maniobra, y no mete mas el brazo.
    demo: {
      movementId: 'elbow-extension',
      angleDeg: 90,
      highlightMuscleId: 'common-extensor-origin',
      // Mill es un estiramiento PASIVO: el explorador no resiste, PONE la
      // fuerza. Sujeta la mano del paciente (pulgar en la palma, dedos en el
      // dorso de la muneca) para mantener la pronacion y la flexion de muneca,
      // y asi extiende el codo (Saroja 2014, p. 817). Por eso 'applies': la
      // ficha dice "Pasivo" y "el paciente permanece relajado". Faltaba por un
      // olvido al convertir el antiguo `resisted` (Mill nunca lo llevo), y sin
      // el campo el codo se extendia solo, como un gesto activo. Es lo
      // contrario de la epicondilalgia medial, que es resistida.
      //
      // La mano generica SI cuadra aqui: empuja hacia el brazo colgando, y en
      // un arco que va de 90 a 0 ese es el sentido de la extension que pone el
      // explorador. MEDIDO con el banco del scratchpad (codo a 90, 45 y 0, con
      // la holgura de 35 y los componentes puestos): se apoya en la cara dorsal
      // del antebrazo distal (coseno con la cara volar de -0,92 a -0,88), la
      // muneca flexionada se aleja de ella y la mano del paciente queda a 5,5
      // cm o mas del guante.
      examinerForce: 'applies',
      components: [
        { movementId: 'elbow-pronation', angleDeg: 80 },
        { movementId: 'wrist-flexion', angleDeg: 60 },
      ],
      order: 'components-first',
      note: 'Con el antebrazo pronado y la muñeca flexionada, el explorador extiende pasivamente el codo desde 90°: es un estiramiento, no una resistencia. El modelo resalta el origen extensor, que es lo que se estira, y dibuja la mano del explorador en el dorso del antebrazo distal; en la prueba sujeta la mano del paciente. En el estudio de las cifras el paciente está sentado y con el brazo separado del cuerpo; el modelo está de pie y con el brazo junto al cuerpo.',
    },

    cite: [
      {
        ref: 'saroja-2014',
        verified: true,
        locator: 'Mill: sensibilidad 53%, especificidad 100%, ROC 0,769',
      },
    ],
  },
  {
    id: 'maudsley',
    name: 'Test de Maudsley',
    aka: ['Maudsley', 'Extensión resistida del 3.º dedo'],
    region: 'elbow',
    category: 'Epicondilalgia lateral (codo de tenista)',
    target: 'Extensor común / extensor propio del 3.º dedo',
    purpose: 'Aislar el extensor del tercer dedo para provocar el dolor epicondíleo.',
    // EL ANTEBRAZO PRONADO (revision del 23 nov): lo pide la fuente de las
    // cifras (Saroja 2014, p. 817, texto completo abierto: sentado, codo a 90
    // y antebrazo pronado) y tambien las descripciones con el codo extendido
    // que vio la revision, y la ficha lo callaba. La posicion del codo sigue
    // siendo la de la ficha: elegir la variante es decision clinica (ver
    // metrics.note).
    maneuver:
      'Con el codo en extensión y el antebrazo pronado, el paciente extiende el tercer dedo contra la resistencia del explorador.',
    positive: 'Dolor en el epicóndilo lateral al resistir la extensión del tercer dedo.',
    metrics: {
      sensitivity: 88,
      specificity: 0,
      // DE DONDE SALEN LAS CIFRAS (revision del 15 nov). Saroja 2014 hizo
      // Maudsley sentado, con el codo a 90 y el antebrazo pronado (p. 817-818;
      // la tabla 4, p. 820, da el 88% y el 0%), y esta ficha lo describe con el
      // codo en extension. Cambiar la maniobra y el demo a esa variante es
      // decision clinica; lo que no puede faltar es decir de que variante son
      // los numeros. "Tres pruebas de provocacion" y no "resistidas": de las
      // tres del estudio, Mill es un estiramiento pasivo.
      note: 'La MÁS sensible de las tres pruebas de provocación de Saroja 2014 (30 sujetos, ecografía como patrón de referencia), y con la misma especificidad del 0% que el Cozen: todos los sujetos con ecografía negativa dieron positivo. Muestra pequeña, así que el 0% es un extremo y no una constante; el mensaje que aguanta es que provoca dolor también sin lesión ecográfica. Las cifras salen de la variante de ese estudio: paciente sentado, codo a 90° y antebrazo pronado, no el codo en extensión que describe esta ficha.',
    },
    utility: 'rule-out',
    interpretation:
      'Su valor está en el negativo: con 88% de sensibilidad, un Maudsley negativo hace poco probable la epicondilalgia lateral. El positivo aislado no confirma.',
    // SIN MANO DEL EXPLORADOR, A PROPOSITO (revision del 23 nov).
    // placeResistance la pone al 82% del segmento del movimiento BASE (de
    // forearm_flex a hand_flex): salia en el mismo punto del antebrazo que en
    // Cozen, y la ficha y la lectura mandaban resistir "donde se apoya la mano
    // del fisio en el modelo". En el Maudsley se resiste la extension del
    // tercer dedo, que el modelo no mueve. `examinerHand: false` quita la mano
    // y deja la etiqueta de prueba resistida con sus instrucciones.
    //
    // Y LA PRONACION, que hasta hoy no llevaba porque el texto no la pedia (el
    // antebrazo quedaba en el reposo supinado del GLB). Va como componente,
    // con el cero clinico de FOREARM_NEUTRAL antes de los 80, igual que en
    // Cozen y Mill. MEDIDO con el banco del scratchpad (codo-pasada2b, sobre
    // scripts/lib/rigPose.mts; codo a 0 con la holgura de 35, los dos lados):
    // la normal palmar (+Z de hand_flex) pasa de (0,05; 0,71; 0,70), palma
    // hacia delante, a (0,28; -0,57; -0,78), palma hacia atras y abajo. `npm
    // run audit-demo-path -- maudsley`: 0,2% del antebrazo y la mano dentro
    // del tronco en los cuatro ordenes y los dos lados, radio minimo 0,79, lo
    // mismo que Cozen.
    demo: {
      movementId: 'elbow-extension',
      angleDeg: 10,
      highlightMuscleId: 'common-extensor-origin',
      // `common-extensor-origin` solo resuelve los dos extensores radiales del
      // carpo y el extensor cubital del carpo (muscles/elbow.ts, meshBases);
      // el extensor de los dedos no tiene ficha en esta region, asi que no hay
      // id que encender. Se dice en vez de dejar creer que se ve.
      cannotShow:
        'El extensor de los dedos, que es el músculo que esta prueba aísla, no se enciende en el modelo: en su lugar se resalta el grupo extensor del epicóndilo lateral.',
      components: [{ movementId: 'elbow-pronation', angleDeg: 80 }],
      examinerForce: 'resists',
      examinerHand: false,
      note: 'Codo extendido y antebrazo pronado. El modelo no mueve los dedos, así que no se dibuja la mano del explorador: en la prueba la resistencia va sobre el dorso del tercer dedo, no sobre el antebrazo.',
    },
    cite: [
      {
        ref: 'saroja-2014',
        verified: true,
        locator: 'Maudsley: sensibilidad 88%, especificidad 0%',
      },
      { ref: 'zwerus-2018', verified: false, locator: 'Evidencia escasa para los tests de codo' },
    ],
  },

  // ==================== EPICONDILALGIA MEDIAL (GOLFISTA) ====================
  {
    id: 'medial-epicondylitis-test',
    name: 'Test de epicondilalgia medial',
    aka: ['Golfer’s elbow test', 'Flexión-pronación resistida'],
    region: 'elbow',
    category: 'Epicondilalgia medial (codo de golfista)',
    target: 'Origen de los flexores-pronadores (epitróclea)',
    purpose: 'Provocar el dolor de la epicondilalgia medial con la contracción resistida.',
    maneuver:
      'Codo en extensión y antebrazo supinado; el paciente hace flexión de muñeca y pronación contra resistencia.',
    positive: 'Dolor en la epitróclea (epicóndilo medial) al resistir la flexión/pronación.',
    metrics: {
      note: 'Sin datos robustos de precisión publicados; el diagnóstico de epicondilalgia medial es clínico (Zwerus 2018).',
    },
    utility: 'weak',
    interpretation:
      'Prueba de provocación sin cifras validadas: el diagnóstico se apoya en la localización del dolor y la contracción resistida, dentro del cuadro clínico.',
    // EL DEMO CONTRADECIA SU PROPIA MANIOBRA (revision del 15 nov). La base era
    // `elbow-pronation`, que trae la postura de lectura ELBOW_AT_90 y
    // FOREARM_NEUTRAL (boneMap): el codo quedaba a 90, el antebrazo pronado 80
    // (palma abajo) y la vista transversal lo miraba de punta, cuando el texto
    // pide codo en extension y antebrazo supinado. En la captura del demo
    // (antes/codo, 80 grados) la mano del paciente tapaba el centro de la
    // imagen, la guia del grupo flexor terminaba sobre ella, y la mano del
    // explorador caia en el dorso empujando hacia la palma: el sentido de la
    // flexion de muneca que tenia que resistir.
    //
    // Ahora la base es la extension del codo, como en Cozen, Mill y Maudsley,
    // y SIN componente de pronosupinacion: el GLB ya reposa supinado, que es la
    // posicion de partida, y la pronacion se RESISTE, no se recorre. Un
    // componente de supinacion aplicaria su cero clinico (neutra) y el
    // antebrazo se veria girar, un gesto que la prueba no tiene. MEDIDO en la
    // pose sostenida (codo a 0, holgura de 35, lado derecho clinico; banco del
    // scratchpad sobre scripts/lib/rigPose.mts): pulgar 8,6 cm por fuera del
    // menique, o sea supinado; la mano del explorador se apoya en la cara volar
    // del antebrazo distal (coseno +1,00) y empuja hacia el dorso, contra la
    // flexion de muneca; la mano flexionada del paciente queda a 4,2 cm del
    // guante, sin entrar en el. `npm run audit-demo-path --
    // medial-epicondylitis-test`: 0,2% dentro del tronco en los cuatro ordenes
    // y los dos lados, radio minimo 0,79. SIN MEDIR: cuanto del grupo
    // flexor-pronador se ve. La extension es sagital y la camara mira el
    // miembro desde su propio lado (labCamera.ts, azimut -90 en el derecho),
    // mientras la epitroclea mira al tronco; TestDemo no tiene campo de camara.
    //
    // La posicion del codo es decision clinica pendiente: tambien se describe
    // con el codo a 90 para aislar el pronador redondo (visto solo en un
    // resumen de buscador, sin fuente abierta; Zwerus 2018 no encontro ningun
    // estudio de precision para la epicondilalgia medial, asi que ninguna cifra
    // decide). Aqui el demo sigue el texto de la propia ficha; si se elige la
    // otra variante, cambian la maniobra y el demo a la vez.
    demo: {
      movementId: 'elbow-extension',
      angleDeg: 10,
      highlightMuscleId: 'common-flexor-pronator-origin',
      components: [{ movementId: 'wrist-flexion', angleDeg: 35 }],
      examinerForce: 'resists',
      note: 'Codo extendido y antebrazo supinado: el paciente intenta flexionar la muñeca y pronar contra la resistencia del explorador. El modelo muestra la flexión de muñeca que se intenta; la pronación intentada no se dibuja porque sacaría al antebrazo de la supinación de partida. La mano del explorador se dibuja en el antebrazo distal, no en la palma.',
    },
    cite: [{ ref: 'zwerus-2018', verified: false }],
  },

  // ================= LIGAMENTO COLATERAL CUBITAL (LCU) =================
  {
    id: 'moving-valgus-stress',
    name: 'Moving valgus stress test',
    aka: ['Moving valgus', 'O’Driscoll'],
    region: 'elbow',
    category: 'Ligamento colateral cubital (LCU)',
    target: 'Ligamento colateral cubital (banda anterior)',
    purpose: 'Detectar insuficiencia del LCU, típica del lanzador overhead.',
    // LA MANIOBRA ES LA DE O'DRISCOLL 2005 (revision del 23 nov; resumen,
    // PMID 15701609, abierto por E-utilities): el explorador aplica y mantiene
    // un valgo moderado y constante con el codo en flexion completa y lo
    // extiende rapido. El arco 120-70 es donde aparecio el dolor en la serie
    // (el arco de cizallamiento), no el recorrido del codo: el texto anterior
    // los confundia. La abduccion a 90, la rotacion externa maxima y el final
    // hacia 30 no estan en el resumen; los da un texto completo abierto que
    // cita el articulo (Pottanat 2025, PMID 40308989, PMC11950621: de pie,
    // hombro a 90 de abduccion y en rotacion externa maxima, valgo mientras se
    // extiende el codo hasta 30).
    maneuver:
      'Con el hombro a 90° de abducción y en rotación externa máxima, el explorador aplica y mantiene un valgo moderado y constante con el codo en flexión completa y lo extiende rápidamente hasta unos 30°; se registra en qué ángulos aparece el dolor medial.',
    // El criterio del resumen (dolor sobre el colateral medial, maximo entre
    // 120 y 70) separado de la media de la serie (maximo a 90).
    positive:
      'Se reproduce el dolor medial sobre el LCU y es máximo entre 120° y 70° de flexión (arco de cizallamiento); en la serie original, el máximo cayó de media a 90°.',
    metrics: {
      sensitivity: 100,
      specificity: 75,
      note: 'Sensibilidad 100% (17 de 17) y especificidad 75% (3 de 4) frente a exploración quirúrgica o artroscópica (O’Driscoll 2005, 21 pacientes operados). Los denominadores son el dato: la especificidad sale de CUATRO pacientes, así que un caso distinto la movería 25 puntos. Lo más reproducible del estudio no es la cifra, es el arco: de media, dolor entre 120° y 70° y máximo a 90°.',
    },
    utility: 'rule-out',
    interpretation:
      'Muy sensible (SnNout): un negativo hace poco probable la lesión del LCU. La especificidad es menor y la serie original es pequeña: confirma con imagen si procede.',
    // LA NOTA PROMETIA UNA MANO "APLICANDO EL VALGO" QUE LA ESCENA NO DIBUJA
    // (revision del 15 nov). La mano es la generica de placeResistance: se
    // apoya al 82% del antebrazo y empuja hacia el brazo colgando, o sea hacia
    // la EXTENSION, en el plano de la flexion; el codo no tiene eje de
    // varo-valgo en boneMap (forearm_flex gira en x y forearm_rot en y).
    // MEDIDO con el banco del scratchpad (codo a 90, holgura de 35): se apoya
    // en la cara volar del antebrazo distal (coseno +0,96) y empuja hacia abajo
    // y atras (0,14; -0,92; -0,38). La captura (antes/codo, 90 grados) lo
    // confirma: guante encima del antebrazo distal y humero junto al tronco.
    // Tampoco hay arco de 120 a 70: `elbow-flexion` no lleva arcFrom, asi que
    // el bucle va de 0 a 90, espera, vuelve a 0, sin abduccion del hombro. El
    // 90 es el angulo MEDIO del dolor maximo en O'Driscoll 2005 (PMID 15701609,
    // resumen leido por E-utilities), no "donde suele ser maximo". La mano se
    // queda y la direccion que no es la de la prueba se declara en
    // `cannotShow`, la misma formula que el estres en varo de la rodilla.
    // Quitarla (`examinerHand: false`) es la otra opcion; si se toma, que sea
    // en los dos valgos del codo a la vez.
    //
    // Y EL LIGAMENTO NO SE VE DESDE LA CAMARA DEL DEMO (revision del 23 nov).
    // La flexion es sagital y readingAngleFor (labCamera.ts) abre el demo por
    // el lado que se mueve (azimut -90 en el derecho): mira la cara LATERAL del
    // codo, y el colateral cubital esta en la MEDIAL. MEDIDO en la captura de
    // la pose sostenida (scratchpad, capturas/despues2/codo, 23 nov, despues
    // del arreglo del recorte de las mallas con piel; script
    // codo-pasada2b/resalte.py): 0 pixeles de naranja vivo en el codo
    // (ventana x 280-480, y 300-500 de 728x834; tono 12-40, saturacion 0,5 o
    // mas, valor 0,6 o mas), lo mismo que en el codo del Tinel, que no resalta
    // nada. El umbral si ve un resalte: cuenta 713 a 796 pixeles en Cozen, Mill
    // y Maudsley, que encienden un musculo (otro resalte, sin pulso). Un tinte
    // tenue, como el que apenas asoma en la rodilla, no queda descartado, y es
    // un solo fotograma de un resalte que late. Por eso
    // `cannotShow` ya no promete "el ligamento resaltado"; la frase sobra el
    // dia que haya una pasada de rayos X para la estructura evaluada o un
    // campo de camara por demo.
    demo: {
      highlightStructureIds: ['elbow-ucl'],
      movementId: 'elbow-flexion',
      angleDeg: 90,
      examinerForce: 'applies',
      cannotShow:
        'El ligamento colateral cubital está en la cara medial (interna) del codo y la cámara del demo mira el codo por su cara lateral: desde esta vista el propio codo lo tapa. La dirección del valgo tampoco se ve: el rig no tiene ese eje, y la mano del explorador se dibuja empujando el antebrazo hacia la extensión, en el plano de la flexión, igual que en una flexión de codo resistida. Lo que se demuestra es el ángulo del codo.',
      // EL DEMO VA AL REVES QUE LA PRUEBA, y se dice. `elbow-flexion` barre de
      // 0 al objetivo y vuelve (demoTimeline.baseAngle, sin arcFrom), y la
      // abduccion del hombro es una cadena, que RigModel.applyComponents no
      // acepta como componente bajo una base de codo. Poner el hombro de base,
      // con el codo y la rotacion de componentes, es decision clinica
      // pendiente: la cifra grande pasaria a leer la abduccion del hombro.
      note: 'El codo va de 0° a 90° con el brazo junto al cuerpo, se sostiene en 90°, el ángulo medio del dolor máximo en la serie original, y vuelve a 0°, despacio y sin valgo. La prueba va al revés: parte de la flexión completa, con el hombro a 90° de abducción y en rotación externa, y extiende rápido hasta unos 30° atravesando ese arco con el valgo mantenido.',
    },
    cite: [
      {
        ref: 'odriscoll-2005',
        verified: true,
        locator: 'Sensibilidad 100% (17/17), especificidad 75% (3/4), en el resumen',
      },
    ],
  },
  {
    id: 'valgus-stress-elbow',
    name: 'Estrés en valgo del codo',
    aka: ['Valgus stress'],
    region: 'elbow',
    category: 'Ligamento colateral cubital (LCU)',
    target: 'Ligamento colateral cubital',
    purpose: 'Valorar la laxitud del LCU en una posición estática.',
    maneuver:
      'Con el codo a 20-30° de flexión (para liberar el olécranon), el explorador aplica una fuerza en valgo y compara la apertura con el lado sano.',
    positive: 'Apertura medial aumentada y/o dolor respecto al lado contralateral.',
    metrics: {
      note: 'Precisión no establecida con solidez (Zwerus 2018). El moving valgus rinde mejor.',
    },
    utility: 'weak',
    interpretation:
      'Aporta como valoración estática de la laxitud, pero con poca precisión aislado: el moving valgus stress test es más sensible.',
    demo: {
      examinerForce: 'applies',
      highlightStructureIds: ['elbow-ucl'],
      movementId: 'elbow-flexion',
      angleDeg: 25,
      // LA DIRECCION DEL VALGO NO SE VE, NI EL LIGAMENTO (revision del 23 nov),
      // y el panel promete "verás dónde se apoya la mano del fisio". El codo
      // del rig solo tiene forearm_flex (x) y forearm_rot (y), sin eje de valgo
      // (boneMap), y placeResistance (RigOverlays) no dibuja direccion: apoya la
      // mano al 82% del antebrazo, orientada al reposo colgando, en el plano de
      // la flexion. Se dice como en el estres en varo de la rodilla, y la mano
      // se queda, como en el valgo dinamico (ver su comentario). Tecnica: Eskew
      // 2026 (PMID 42959974, PMC13718870, tabla 1 y texto, abierto en Europe
      // PMC): humero estabilizado, mano del explorador en el borde lateral del
      // codo, positivo = mas apertura medial que en el lado sano. Y el
      // colateral cubital, en la cara medial, no se ve desde la camara sagital
      // del demo: MEDIDO en la captura de la pose sostenida a 25 (scratchpad,
      // capturas/despues2/codo, 23 nov; codo-pasada2b/resalte.py), 0 pixeles
      // de naranja vivo en el codo (ventana x 230-430, y 330-480 de 728x834),
      // con el mismo umbral y la misma salvedad que en el valgo dinamico (un
      // tinte tenue no queda descartado).
      cannotShow:
        'El ligamento colateral cubital está en la cara medial (interna) del codo y la cámara del demo mira el codo por su cara lateral: desde esta vista el propio codo lo tapa. La dirección del valgo tampoco se ve: el rig no tiene ese eje en el codo, así que no puede abrirlo por dentro, y la escena no representa hacia dónde empuja la mano del explorador. En la prueba se estabiliza el húmero con una mano en la cara lateral del codo y se aplica el valgo, valorando cuánto se abre la cara medial frente al lado sano.',
      note: 'Se aplica el valgo con el codo a 20-30° de flexión; el modelo muestra esa flexión de prueba.',
    },
    cite: [{ ref: 'zwerus-2018', verified: false }],
  },

  // ===================== NEUROPATÍA DEL CUBITAL =====================
  {
    id: 'tinel-cubital',
    name: 'Signo de Tinel del cubital',
    aka: ['Tinel del codo'],
    region: 'elbow',
    category: 'Neuropatía del cubital (túnel cubital)',
    target: 'Nervio cubital (canal epitrócleo-olecraniano)',
    purpose: 'Detectar irritación del nervio cubital en el túnel cubital.',
    maneuver:
      'El explorador percute el nervio cubital en el canal entre la epitróclea y el olécranon.',
    positive: 'Parestesias/hormigueo irradiados al 4.º y 5.º dedos.',
    // EL 0,70 DEL TINEL VA SIN TIEMPO (revision del 23 nov). El resumen de
    // Novak 1994 (PMID 7806810, abierto por E-utilities) da "The sensitivity
    // of the Tinel sign was 0.70" y reserva los 30 s para las otras tres
    // maniobras. 31 de 44 extremidades = 0,705. Los otros recuentos del
    // resumen (33, 39 y 41 de 44) no dan 0,32, 0,55 ni 0,91, asi que no son
    // los de los 30 s y no se ponen junto a esas cifras.
    metrics: {
      sensitivity: 70,
      note: 'Sensibilidad 0,70: 31 de 44 extremidades con túnel cubital confirmado por electrodiagnóstico, frente a 33 controles (Novak 1994). El resumen la da sin tiempo; los 30 segundos son de las otras tres maniobras. SIN cifra de especificidad: ese estudio no la publica para ninguna de sus cuatro maniobras; de los controles dice sólo que "rara vez" dieron positivo. El 98% que suele citarse no está en la fuente.',
    },
    utility: 'balanced',
    utilityBasis:
      'Falta una de las dos cifras: Novak 1994 publica 0,70 de sensibilidad y ninguna especificidad, para ninguna de sus cuatro maniobras (el 98% que suele citarse no está en esa fuente). La etiqueta no puede apoyarse en un perfil de dos ejes que no existe; interprétalo con la clínica y el electrodiagnóstico.',
    interpretation:
      'Un Tinel positivo apoya la neuropatía cubital, pero con la cautela de que su especificidad no está medida: también aparece en personas sanas. Interprétalo con la clínica y el electrodiagnóstico.',
    demo: {
      cannotShow:
        'El nervio cubital sí está en el rig, pero su material lo deja en una capa que el laboratorio no muestra. Lo que se posa es el codo donde se percute, entre epitróclea y olécranon.',
      movementId: 'elbow-flexion',
      angleDeg: 90,
      note: 'Se percute el nervio en el canal epitrócleo-olecraniano con el codo en flexión. Comparte posición con el valgo dinámico: lo que cambia es que aquí el explorador percute y no aplica fuerza.',
    },
    cite: [
      {
        ref: 'novak-1994',
        verified: true,
        locator: 'Sensibilidad del Tinel 0,70, 31 de 44 extremidades (sin especificidad publicada)',
      },
    ],
  },
  {
    id: 'elbow-flexion-pressure',
    name: 'Flexión-compresión del codo',
    aka: ['Elbow flexion test', 'Test de flexión + presión'],
    region: 'elbow',
    category: 'Neuropatía del cubital (túnel cubital)',
    target: 'Nervio cubital (túnel cubital)',
    purpose: 'Reproducir la compresión del cubital con la flexión mantenida del codo.',
    maneuver:
      'Codo en flexión máxima, antebrazo supinado y muñeca neutra, añadiendo compresión sobre el nervio proximal al túnel; se mantiene hasta 60 s.',
    positive: 'Parestesias en el territorio cubital (4.º-5.º dedos) durante la posición mantenida.',
    metrics: {
      sensitivity: 91,
      note: 'Las tres sensibilidades del mismo estudio, a los 30 segundos: flexión SOLA 0,32, compresión sola 0,55, las dos juntas 0,91 (Novak 1994). Ahí está el mensaje clínico: la maniobra funciona cuando se añade la compresión del nervio. SIN cifra de especificidad: el estudio no la publica.',
    },
    utility: 'rule-out',
    interpretation:
      'La versión combinada (flexión + compresión) es sensible: un negativo hace menos probable la neuropatía cubital. La flexión aislada, poco sensible, no descarta.',
    demo: {
      cannotShow:
        'Mismo límite: el nervio cubital no está en una capa que el laboratorio pueda mostrar. Lo que se demuestra es la posición que cierra el túnel.',
      movementId: 'elbow-flexion',
      // FLEXION MAXIMA = TOPE DEL MODELO, 145 (revision del 23 nov). Estaba en
      // 120 desde el primer commit, sin medida, mientras la maniobra pide
      // flexion maxima (media sana de 146 en activo, Zwerus 2017, PMID
      // 31210794, resumen) y la ficha decia "En el modelo: Codo en flexion
      // maxima". 145 es tambien el final de la flexion libre del laboratorio
      // (boneMap, clinicalRange). MEDIDO antes de subirlo con los bancos del
      // scratchpad (codo-pasada2b, flexmax.mts y pliegue*.mts, sobre
      // scripts/lib/rigPose.mts con la holgura de 35 del humero que la app
      // aplica a los movimientos de codo):
      //   - la piel de la mano queda a 15,4 cm de la de la cabeza y el cuello
      //     (20,6 a 120), a 5,1 cm de la del brazo y el deltoides de su lado
      //     (13,2 a 120; 6,9 a 140) y a 5,1 cm de la del hombro y el tronco
      //     (14,2 a 120), en los dos lados: no toca nada;
      //   - el pliegue crece: vertices de piel del antebrazo a mas de 0,15 R
      //     por dentro de la piel del brazo (R de 6,6 cm de media) entre la
      //     mitad y el 80% del eje hombro-codo, 12 de 744 a 120 y 47 a 145 en
      //     el lado derecho. Es el contacto de partes blandas de la flexion
      //     maxima, que el rig no comprime;
      //   - `npm run audit-demo-path -- elbow-flexion-pressure`: 0,0% del
      //     antebrazo y la mano dentro del tronco en la posicion final, en los
      //     dos lados (el 0,2% del peor punto es el reposo colgando, t = 0).
      // Falta la captura de la app en la pose sostenida (lectura 145) para
      // mirar ese pliegue a traves del cristal.
      angleDeg: 145,
      note: 'Flexión máxima, 145°, que es el tope del codo en el modelo, con el antebrazo supinado y la muñeca neutra, sostenida. La compresión del explorador sobre el nervio no se dibuja.',
    },
    cite: [
      {
        ref: 'novak-1994',
        verified: true,
        locator: 'Flexión + compresión: sensibilidad 0,91 (sin especificidad publicada)',
      },
    ],
  },
];

export const ELBOW_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
