// src/data/orthopedicTests/knee.ts
//
// KNEE orthopedic special tests, grouped by clinical target: ligamento cruzado
// anterior (LCA), ligamento cruzado posterior (LCP), menisco y ligamentos
// colaterales.
//
// HONESTIDAD DE LAS CIFRAS. Esta cabecera decia que todas las citas seguian en
// `verified: false` por falta de busqueda, y hoy todas llevan `verified: true`:
// lo que vale es el `locator` de cada una, que dice de donde sale su cifra
// ("Resumen" cuando esta en el resumen de PubMed). La excepcion es Thessaly: el
// 89/97 de Karachalios 2005 no esta en su resumen, que solo da la exactitud
// (94% en el menisco medial y 96% en el lateral; releido por E-utilities el 23
// nov), y que cifra pintan sus barras queda pendiente de criterio clinico. Las
// pruebas sin cifra defendible (el sag y los dos colaterales) lo dicen en su
// nota en vez de inventarla.
//
// Fuentes (ver references.ts): Benjaminse 2006 (LCA); Rubinstein 1994 y Malanga
// 2003 (LCP; Malanga tambien para los colaterales, sin cifras propias); Hegedus
// 2007 (menisco); Karachalios 2005 (Thessaly; replicas independientes: Harrison
// 2009, Blyth 2015 y Goossens 2015).
//
// DEMOS: el rig de la rodilla conduce flexion/extension y rotacion
// interna/externa. Casi todas sus pruebas son traslaciones (Lachman, cajones) o
// maniobras de estres que el rig no reproduce: esas posan el angulo de flexion
// en el que se explora, con una `note` honesta. McMurray, pivot shift y Apley
// llevan la rotacion tibial que el rig si conduce (componente
// knee-*-rotation). Thessaly no lleva ninguna: su giro es el del cuerpo sobre
// el pie apoyado, y el rig no lo tiene. A 20 grados solo gira el desenroscado
// automatico del tornillo (screwHomeUnwind, unos 10 de rotacion interna segun
// kneeScrewHome; leido del codigo, no medido en el rig).
//
// LA CADERA TAMBIEN SE POSA (revision del 15 nov). Los dos cajones y el sag se
// exploran en supino con la cadera flexionada, y sus demos solo doblaban la
// rodilla: en las capturas de su pose sostenida el muslo quedaba vertical,
// cadera a 0. Ahora llevan un componente `hip-flexion` sobre femur_base, otro
// hueso que shin_flex (como el nervio femoral de lumbar.ts): 45 grados en los
// cajones y 90 en el sag. El modelo sigue de pie, y sus notas lo dicen.
//
// Y `cannotShow` PROMETIA UNA DIRECCION QUE LA ESCENA NO DIBUJA. Cinco demos de
// esta region decian "lo que se demuestra es la direccion de la traslacion
// anterior/posterior de la tibia" o "se demuestra la direccion del varo",
// mientras la `note` de la misma tarjeta decia lo contrario (que la traslacion
// no se reproduce). Medido en la escena: el grupo de resistencia de
// RigOverlays contiene UN solo objeto, la mano, y su orientacion se calcula
// hacia la posicion de reposo del segmento (WORLD_DOWN), igual para el cajon
// anterior que para el posterior; no hay flecha ni ningun otro indicador de
// direccion. Lachman y posterior-sag no llevan `examinerForce`, y los dos
// cajones la llevan con `examinerHand: false`: en el cajon las manos rodean la
// tibia proximal, y `placeResistance` solo sabe apoyar la suya al 82% del
// segmento movil (RigOverlays.tsx:517-518), en la pierna distal junto al
// talon (capturas del 15 nov). En esas cuatro no sale mano. Las frases dicen
// ahora lo mismo que la nota: la POSICION si, la traslacion no. La
// alternativa buena --un campo `forceDirection` en TestDemo, con un punto de
// contacto propio, que `placeResistance` use para colocar la mano y dibujar la
// flecha-- vive en RigOverlays y queda pedida. Apley tambien lleva
// `examinerHand: false` desde la revision del 23 nov: la mano generica empuja
// la pierna de traves, hacia la extension, y la prueba carga la tibia en su eje
// desde el pie (ver su demo).
//
// EL MODELO SIEMPRE ESTA DE PIE (revision del 23 nov). Toda prueba de esta
// region que se hace tumbada lo dice en su nota, con la formula de la casa
// ("el modelo lo muestra de pie, asi que mira ..."), y el comentario de cada
// demo cita la fuente abierta de esa postura. Thessaly es la unica en carga, y
// su nota explica que el modelo carga la otra pierna. El dolor en la
// interlinea no lo lleva: ninguna fuente abierta leida fija la postura de la
// palpacion.

import type { OrthopedicTest } from '../../types/orthopedicTest';

const tests: OrthopedicTest[] = [
  // ==================== LIGAMENTO CRUZADO ANTERIOR (LCA) ====================
  {
    id: 'lachman',
    name: 'Test de Lachman',
    aka: ['Lachman'],
    region: 'knee',
    category: 'Ligamento cruzado anterior',
    target: 'Ligamento cruzado anterior',
    purpose: 'Detectar rotura del LCA por traslación anterior de la tibia.',
    maneuver:
      'Rodilla a 20-30° de flexión; el explorador estabiliza el fémur y traslada la tibia hacia anterior valorando el desplazamiento y la calidad del tope final.',
    positive: 'Traslación anterior aumentada con tope final blando o ausente respecto al lado sano.',
    metrics: {
      sensitivity: 85,
      specificity: 94,
      note: 'Benjaminse 2006, metaanálisis de 28 estudios con artroscopia, artrotomía o resonancia como patrón de referencia: sensibilidad agrupada 85% (IC 95% 83-87) y especificidad 94% (92-95). Es el test aislado más preciso para el LCA y el único que la revisión recomienda hacer siempre.'
    },
    utility: 'rule-in',
    interpretation:
      'Alta sensibilidad y especificidad: un positivo confirma con fuerza la rotura del LCA y un negativo la hace poco probable. Es el test de elección, mejor que el cajón anterior.',
    pearl:
      'Más fiable en agudo que el cajón anterior (menos espasmo/hemartros). La calidad del tope final importa tanto como la cantidad de traslación.',
    demo: {
      cannotShow:
        'El ligamento cruzado anterior no está en el rig: el modelo no trae cruzados. Y la traslación tampoco, ni hacia dónde va: el rig gira articulaciones, no desliza la tibia, y en esta prueba ni siquiera se dibuja la mano del explorador. Lo que se demuestra es el ángulo en el que se explora, la rodilla a 20-30 grados.',
      movementId: 'knee-flexion',
      angleDeg: 25,
      // EN SUPINO, Y EL MODELO DE PIE. La nota no decia la postura y escribia
      // la variante con "n" de "traslacion", la unica de src (el resto del
      // fichero dice "traslacion"). Supino a 20-30 grados, una mano fija el
      // femur y la otra tira de la tibia hacia delante: PMID 39704918
      // (PMC11662134, tabla 2, texto completo por E-utilities). Tambien en
      // supino, aunque a 15-30 grados, PMID 29894492 (PMC5997333, tabla 1,
      // texto completo de Europe PMC). La captura de la pose sostenida
      // (capturas/despues2/rodilla/test-de-lachman, 25 grados) ensena el cuerpo
      // de pie. Por eso "el angulo" y no "la posicion" al final de cannotShow.
      note: 'Con el paciente en SUPINO y la rodilla a 20-30° de flexión, una mano fija el fémur y la otra lleva la tibia proximal hacia anterior. El modelo lo muestra de pie: mira el ángulo, no la postura global. La traslación no se reproduce.',
    },
    cite: [{ ref: 'benjaminse-2006', verified: true, locator: 'Resumen: Lachman 85% (83-87) / 94% (92-95), 28 estudios' }],
  },
  {
    id: 'anterior-drawer-knee',
    name: 'Cajón anterior',
    aka: ['Anterior drawer'],
    region: 'knee',
    category: 'Ligamento cruzado anterior',
    target: 'Ligamento cruzado anterior',
    purpose: 'Valorar la traslación anterior de la tibia a 90° de flexión.',
    maneuver:
      'En supino, con la cadera a 45°, la rodilla a 90° y el pie fijo; el explorador traslada la tibia hacia anterior.',
    positive: 'Traslación anterior aumentada respecto al lado sano.',
    metrics: {
      sensitivity: 92,
      specificity: 91,
      note: 'ATENCIÓN A LA CONDICIÓN. Benjaminse 2006 publica 92% (IC 95% 88-95) y 91% (87-94), pero SOLO en lesiones CRÓNICAS: literalmente, el cajón anterior rinde bien en crónico "pero no en agudo". Esta aplicación mostraba antes 62/88, una cifra que no está en esa fuente y que además contradecía su propia nota. En el esguince agudo el dolor, el espasmo y el hemartros hunden la sensibilidad, y por eso el test de elección en agudo es el Lachman.'
    },
    utility: 'rule-in',
    interpretation:
      'En lesión CRÓNICA es tan bueno como el Lachman (92/91). En agudo no: el dolor y el hemartros lo limitan y un negativo no descarta nada. La cifra que ves solo vale para el paciente crónico.',
    demo: {
      cannotShow:
        'El ligamento cruzado anterior no está en el rig: el modelo no trae cruzados. Y la traslación tampoco: el rig gira articulaciones, no desliza la tibia. Aquí no se dibuja la mano: en el cajón las manos rodean la tibia proximal con los pulgares en la interlínea, y el modelo solo sabe apoyarla en la pierna distal. Lo que se demuestra son los ángulos de la posición: la cadera a 45 grados y la rodilla a 90.',
      // SUPINO, CADERA A 45 Y RODILLA A 90: Zhao 2021 (PMID 33853620,
      // PMC8045226, Discusion, leido por E-utilities) lo da asi para el cajon
      // anterior, con el pie estable. El demo solo doblaba la rodilla, y en la
      // captura de su pose sostenida (capturas/antes/rodilla/cajon-anterior,
      // 15 nov) el muslo quedaba vertical, cadera a 0. La cadera va de
      // componente sobre femur_base, otro hueso que shin_flex; la rodilla sigue
      // de base para conservar la rotula y el tornillo (los componentes no
      // aplican acoples). El acople de flexion profunda de cadera vale 0 por
      // debajo de 90. MEDIDO en el banco con la holgura de 35 grados de los
      // brazos (scratchpad knee-apply/hand-thigh.mts, 15 nov): la mano del
      // mismo lado queda a 19,7 cm del muslo, 0 vertices dentro.
      movementId: 'knee-flexion',
      angleDeg: 90,
      components: [{ movementId: 'hip-flexion', angleDeg: 45 }],
      // LA FUERZA ES DEL EXPLORADOR, PERO SU MANO NO SE DIBUJA. La mano generica
      // cae al 82% del segmento movil (RigOverlays.tsx:517-518): en la captura
      // queda en la pantorrilla junto al talon, empujando hacia la extension, y
      // el panel decia "En Demostrar veras donde se apoya la mano del fisio". En
      // el cajon las manos rodean la tibia proximal con los pulgares en la
      // interlinea (kneePhases.ts, "tracciona la tibia proximal hacia delante
      // con ambas manos"). Con `examinerHand: false` se quedan la etiqueta
      // "Pasivo" y su aviso de no contraer, y se va la mano.
      examinerForce: 'applies',
      examinerHand: false,
      note: 'A 90° de flexión el explorador tira de la tibia hacia ANTERIOR. Comparte posición con el cajón posterior: lo único que cambia es la dirección del tirón, que es una traslación y el rig no la tiene. La prueba se hace en SUPINO, con la cadera a 45° y el pie fijo: el modelo lo muestra de pie, así que mira los ángulos, no la postura global.',
    },
    cite: [{ ref: 'benjaminse-2006', verified: true, locator: 'Resumen: cajón anterior en CRÓNICO 92% (88-95) / 91% (87-94); en agudo no' }],
  },
  {
    id: 'pivot-shift',
    name: 'Pivot shift',
    aka: ['Pivot shift', 'Resalte rotatorio'],
    region: 'knee',
    category: 'Ligamento cruzado anterior',
    target: 'Ligamento cruzado anterior (inestabilidad rotatoria)',
    purpose: 'Detectar la inestabilidad rotatoria anterolateral del LCA.',
    maneuver:
      'Desde la extensión, el explorador aplica valgo y rotación interna mientras flexiona la rodilla, buscando la reducción brusca de la subluxación tibial hacia los 30-40°.',
    positive: 'Resalte (clunk) de reducción de la subluxación anterolateral al flexionar.',
    metrics: {
      sensitivity: 24,
      specificity: 98,
      note: 'Benjaminse 2006, sensibilidad agrupada 24% (IC 95% 21-27) y especificidad 98% (96-99). Esta aplicación mostraba un 32% que no está en esa fuente. La revisión lo recomienda precisamente por lo específico que es, tanto en agudo como en crónico: tres de cada cuatro roturas se le escapan, pero un resalte positivo no deja dudas.'
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico (SpPin): un positivo confirma la insuficiencia del LCA. Solo ve una de cada cuatro roturas con el paciente despierto; su rendimiento sube bajo anestesia.',
    demo: {
      cannotShow:
        'El cruzado anterior no está en el modelo, y el valgo no se reproduce: el rig no tiene ese eje en la rodilla. Lo que se demuestra es la mitad de la maniobra que sí conduce, la flexión con la tibia en rotación interna.',
      movementId: 'knee-flexion',
      angleDeg: 30,
      components: [{ movementId: 'knee-internal-rotation', angleDeg: 25 }],
      // LA ROTACION INTERNA DEL EXPLORADOR ENTRA ANTES QUE LA FLEXION. Con el
      // orden por defecto el demo flexionaba hasta 30 y alli anadia la rotacion,
      // al reves de la prueba: el valgo y la rotacion interna actuan desde los
      // primeros grados y la tibia se reduce hacia los 30 (Rossi 2011,
      // PMC3213012, apartado "Pivot Shift (jerk) Tests"; en la variante de
      // Slocum la rodilla extendida rota hacia dentro, se aplica el valgo y
      // "then the knee is progressively flexed"). audit-demo-path no decide
      // aqui: solo mide antebrazo y mano contra el tronco, y en un demo de
      // rodilla los cuatro ordenes empatan. MEDIDO en la revision del 15 nov,
      // aproximado (pesos crudos del GLB, sin los pases de la app): con la
      // rodilla a 0 y 25 de rotacion interna el pie que gira queda a 2 cm o mas
      // del contrario. La posicion sostenida es la misma en los dos ordenes. El
      // precio: el primer tramo (0,63 s de 1,78 s) gira la tibia con la rodilla
      // recta, que en render apenas se ve salvo en el pie (boneMap.ts,
      // knee-internal-rotation); la nota lo dice.
      order: 'components-first',
      examinerForce: 'applies',
      // EN SUPINO: "The patient lies supine and relaxed" (PMID 39704918,
      // PMC11662134, tabla 2, texto completo por E-utilities) y "The patient is
      // in supine position" (PMID 29894492, PMC5997333, tabla 1, texto completo
      // de Europe PMC). La variante de Slocum que se cita arriba por la
      // secuencia es la de decubito lateral (Rossi 2011: "with the patient on
      // the side"); la ficha describe la clasica, y la clasica lleva la misma
      // secuencia: la tibia se mantiene en 20 grados de rotacion interna
      // mientras la rodilla va de la extension completa a 30-40 grados de
      // flexion con valgo (PMID 39704918, misma tabla). Plural, "los angulos":
      // el demo conduce la flexion y la rotacion interna.
      note: 'Desde la extensión se lleva la tibia a rotación INTERNA con valgo y se flexiona; el resalte se busca hacia los 30-40°. El modelo aplica la rotación interna con la rodilla extendida, donde apenas se ve salvo en el pie, y flexiona con ella mantenida. El valgo no se reproduce. La prueba se hace en SUPINO: el modelo lo muestra de pie, así que mira los ángulos, no la postura global.',
    },
    cite: [{ ref: 'benjaminse-2006', verified: true, locator: 'Resumen: pivot shift 24% (21-27) / 98% (96-99)' }],
  },

  // ==================== LIGAMENTO CRUZADO POSTERIOR (LCP) ====================
  {
    id: 'posterior-drawer-knee',
    name: 'Cajón posterior',
    aka: ['Posterior drawer'],
    region: 'knee',
    category: 'Ligamento cruzado posterior',
    target: 'Ligamento cruzado posterior',
    purpose: 'Detectar rotura del LCP por traslación posterior de la tibia.',
    maneuver:
      'En supino, con la cadera a 45°, la rodilla a 90° y el pie fijo; el explorador traslada la tibia hacia posterior.',
    positive: 'Traslación posterior aumentada respecto al lado sano.',
    metrics: {
      sensitivity: 90,
      specificity: 99,
      note: 'Rubinstein 1994, 39 sujetos con 19 roturas crónicas aisladas de LCP y examinadores cegados a la historia y al diagnóstico: 90% de sensibilidad y 99% de especificidad, con una exactitud global del 96%. La prueba más sensible y específica fue este cajón posterior CON palpación del escalón tibiofemoral, no la inspección sola. La exactitud fue mayor en laxitudes de grado II y III que en grado I.',
    },
    utility: 'rule-in',
    interpretation:
      'Alta sensibilidad y especificidad: el mejor test para el LCP. Un positivo confirma y un negativo hace muy improbable la rotura.',
    pearl:
      'Confirma primero la posición de partida con el signo del cajón posterior en reposo (posterior sag): una tibia ya desplazada puede simular un falso cajón anterior.',
    demo: {
      cannotShow:
        'El ligamento cruzado posterior no está en el rig. Y la traslación tampoco: el rig gira articulaciones, no desliza la tibia. Aquí no se dibuja la mano: en el cajón posterior el explorador sujeta la tibia proximal por delante, con los pulgares en la interlínea, y la empuja hacia posterior mientras palpa el escalón tibiofemoral; el modelo solo sabe apoyar la mano en la pierna distal. En pantalla esta prueba y el cajón anterior son la misma imagen. Lo que se demuestra son los ángulos de la posición: la cadera a 45 grados y la rodilla a 90.',
      // LA MISMA POSICION QUE EL CAJON ANTERIOR, y con fuente propia: supino,
      // cadera a 45 y rodilla a 80-90, con el pie sujeto (Wilebski 2026, PMID
      // 41657676, PMC12875799, apartado "Posterior drawer test" y figura 2,
      // texto completo de Europe PMC). La revision del 15 nov la daba por
      // inferida porque Zhao 2021 (PMID 33853620) solo la da para el cajon
      // anterior. Rossi 2011 (PMC3213012, "Slide Tests") dice ademas que el
      // cajon anterior y el posterior "are performed simultaneously", y
      // kneePhases.ts lo explora "en la misma posicion del cajon anterior".
      // Mismo componente que el anterior a proposito: si uno lo perdiera, "la
      // misma imagen" de cannotShow seria falsa y los dos dejarian de compartir
      // firma (testDemosDiffer.test.ts los declara pareja).
      movementId: 'knee-flexion',
      angleDeg: 90,
      components: [{ movementId: 'hip-flexion', angleDeg: 45 }],
      // LA FUERZA ES DEL EXPLORADOR, PERO SU MANO NO SE DIBUJA: la generica cae
      // en la pantorrilla junto al talon (RigOverlays.tsx:517-536, captura
      // capturas/antes/rodilla/cajon-posterior del 15 nov), y aqui ni la cara
      // coincide, porque el cajon posterior empuja la cara ANTERIOR de la tibia
      // proximal. Colocacion de las manos: kneePhases.ts ("se empuja la tibia
      // proximal hacia atras"), las paginas docentes que abrio la revision y
      // Wilebski 2026 (PMID 41657676, mismo apartado: fuerza posterior sobre la
      // tibia proximal con los pulgares en la interlinea medial y lateral);
      // Rubinstein 1994 (PMID 7943523) solo dice que la prueba mas sensible y
      // especifica incluia palpar el escalon tibiofemoral.
      examinerForce: 'applies',
      examinerHand: false,
      note: 'A 90° de flexión el explorador empuja la tibia hacia POSTERIOR. Comparte posición con el cajón anterior: lo único que cambia es la dirección del empuje, que es una traslación y el rig no la tiene. Se explora en SUPINO y en la misma posición que el cajón anterior, cadera a 45° y pie fijo: el modelo lo muestra de pie, así que mira los ángulos, no la postura global.',
    },
    cite: [
      {
        ref: 'rubinstein-1994',
        verified: true,
        locator: 'Resumen: 90% / 99%, exactitud 96%, n = 39; el cajón posterior fue la prueba más sensible y específica',
      },
      {
        ref: 'malanga-2003',
        verified: true,
        locator: 'Revisión narrativa: confirma el cajón posterior como prueba de elección, sin aportar cifras propias',
      },
    ],
  },
  {
    id: 'posterior-sag',
    name: 'Signo del cajón posterior en reposo (sag)',
    aka: ['Posterior sag', 'Godfrey'],
    region: 'knee',
    category: 'Ligamento cruzado posterior',
    target: 'Ligamento cruzado posterior',
    purpose: 'Ver la caída posterior espontánea de la tibia por insuficiencia del LCP.',
    maneuver:
      'En supino, con caderas y rodillas a 90° (piernas sostenidas), se observa de perfil la posición de la tuberosidad tibial anterior.',
    positive: 'La tibia proximal cae hacia posterior respecto al lado sano.',
    metrics: {
      note: 'SIN CIFRA PROPIA. El 79% / 100% que esta aplicación mostraba se atribuía a Malanga 2003, que es una revisión narrativa y no publica cifras del sag. Lo que SÍ está medido es la exploración del LCP en conjunto: Rubinstein 1994 (39 sujetos, 19 roturas crónicas aisladas de LCP, examinadores cegados a la historia y al diagnóstico) da 90% de sensibilidad y 99% de especificidad, con una exactitud global del 96%, y señala que la prueba más sensible y específica es el CAJÓN POSTERIOR con palpación del escalón tibiofemoral. La exactitud fue mayor en laxitudes de grado II y III que en grado I. El sag es el paso que coloca la rodilla antes de ese cajón, no una prueba con cifra propia.',
    },
    utility: 'rule-in',
    utilityBasis:
      'No hay cifra propia del sag: Malanga 2003 es una revisión narrativa y no la publica. Lo medido es la exploración del LCP EN CONJUNTO (Rubinstein 1994: 90% de sensibilidad y 99% de especificidad), y dentro de ella el sag es el paso que coloca la rodilla antes del cajón posterior. Confirma como parte de esa exploración, no por una cifra suya.',
    interpretation:
      'Un sag visible orienta a insuficiencia del LCP y, sobre todo, evita malinterpretar la traslación del cajón: si la tibia parte caída, un cajón anterior "normal" puede ser en realidad la reducción de una tibia subluxada. Explóralo SIEMPRE antes del cajón anterior y posterior.',
    demo: {
      cannotShow:
        'El ligamento cruzado posterior no está en el rig, y la caída de la tibia tampoco: es una traslación, y el rig gira articulaciones. Aquí además no se dibuja ninguna mano, porque en esta prueba el explorador no aplica nada. Lo que se demuestra es la posición de partida, cadera y rodilla a 90 grados.',
      // LA CADERA TAMBIEN VA A 90. El demo solo flexionaba la rodilla: la
      // captura de su pose sostenida (capturas/antes/rodilla, 15 nov) ensenaba
      // el muslo vertical, cadera a 0, mientras cannotShow decia "cadera y
      // rodilla a 90 grados". Son dos huesos distintos (femur_base y shin_flex)
      // y se sostienen a la vez, como en lumbar/femoral-nerve-stretch. La
      // rodilla sigue de BASE porque applyComponents no aplica acoples: de
      // componente perderia la rotula y el tornillo. El acople de flexion
      // profunda de cadera vale 0 hasta 90. La posicion es la del "Passive
      // Tibial Sag sign" de Rossi 2011 (PMC3213012, "Slide Tests", Figura 10):
      // supino, cadera a 90 y rodilla a 90.
      //
      // MEDIDO en el banco compartido (createRigPoser, con la holgura de 35
      // grados que RigModel da a los dos brazos en un movimiento de pierna;
      // script en el scratchpad, knee-apply/hand-thigh.mts, 15 nov): con el
      // muslo horizontal la mano del MISMO lado entra en la piel del muslo hasta
      // 3,7 cm (153 de 1.622 vertices de la mano). No es de este dato: el scour
      // publicado (cadera a 90 de base, con su inclinacion de tronco) da 4,7 cm
      // (77 vertices) en el mismo banco, y su captura ensena la mano sobre el
      // muslo. Lo arregla la holgura de los brazos en RigModel, no la prueba.
      movementId: 'knee-flexion',
      angleDeg: 90,
      components: [{ movementId: 'hip-flexion', angleDeg: 90 }],
      note: 'Con el paciente boca arriba, cadera y rodilla a 90° y las piernas sostenidas, la tibia cae hacia posterior por su propio PESO: aquí el explorador no aplica nada, que es lo que lo separa de los dos cajones. El modelo lo muestra de pie, así que mira los ángulos, no la postura global: de pie la gravedad no tira de la tibia hacia atrás. La traslación no se reproduce.',
    },
    cite: [
      {
        ref: 'rubinstein-1994',
        verified: true,
        locator: 'Resumen: exploración del LCP 90% / 99%, exactitud 96%, n = 39',
      },
      {
        ref: 'malanga-2003',
        verified: true,
        locator: 'Revisión narrativa: describe el sag como complemento del cajón posterior, sin cifras propias',
      },
    ],
  },

  // =============================== MENISCO ===============================
  {
    id: 'mcmurray',
    name: 'Test de McMurray',
    aka: ['McMurray'],
    region: 'knee',
    category: 'Menisco',
    target: 'Menisco medial / lateral',
    purpose: 'Provocar el atrapamiento del fragmento meniscal.',
    maneuver:
      'Desde la flexión máxima se extiende la rodilla combinando rotación externa (menisco medial) o interna (menisco lateral) con estrés en valgo/varo.',
    positive: 'Clic o chasquido doloroso reproducible sobre la interlínea durante la maniobra.',
    // EL CLIC DOLOROSO NO TENIA FUENTE ABIERTA. La nota y la interpretacion
    // decian que el clic doloroso es mas especifico que el dolor aislado, bajo
    // Hegedus 2007, y su resumen (PMID 17939613, leido por E-utilities) no
    // compara criterios de positivo: da 70/71 agrupadas, 18 estudios y
    // heterogeneidad sin explicar; el texto completo es de pago. La revision
    // abierta que recoge el criterio de cada estudio, Hing 2009 (PMC2704345,
    // tabla 4, leida en la web de PMC), no lo respalda y recomienda contar
    // tambien el dolor. Que positivo se ensena (campo `positive`, y la ruta en
    // kneePhases.ts) queda pendiente de criterio clinico.
    metrics: {
      sensitivity: 70,
      specificity: 71,
      note: 'Hegedus 2007, metaanálisis de 18 estudios: sensibilidad 70% y especificidad 71% agrupadas, con diferencias grandes entre estudios que no explicaron ni la prevalencia, ni la calidad del estudio, ni lo bien descrita que estuviera la prueba. Los autores apuntan a diferencias locales en cómo se define, se hace y se interpreta cada maniobra.',
    },
    utility: 'balanced',
    interpretation:
      'Rendimiento moderado y variable: ni confirma ni descarta la rotura por sí solo. Interprétalo dentro de un clúster meniscal.',
    demo: {
      highlightStructureIds: ['knee-medial-meniscus'],
      // EL MENISCO MEDIAL SE ENCIENDE DENTRO DE LA ARTICULACION, Y LA CAMARA
      // MIRA DE PERFIL POR FUERA. knee-flexion es sagital y `readingAngleFor`
      // pone la camara del lado que se mueve (labCamera.ts, azimut -90 en la
      // derecha). MEDIDO en las capturas de la pose sostenida
      // (capturas/despues2/rodilla, 23 nov; script en el scratchpad,
      // knee-pass2/orange.py), contando el naranja del resalte (tono 12-40
      // grados, saturacion 0,35 o mas) en la caja de la rodilla:
      // McMurray 7 pixeles, interlinea 1, Thessaly 10, Apley 0; los controles
      // sin menisco encendido dan lo mismo (varo 2, Lachman 8). No se distingue
      // del fondo: "apenas se ve". Es una sola muestra de un resalte que late
      // (RigOverlays, pulso de `implicated`). Misma frase en las cuatro pruebas
      // de menisco.
      cannotShow:
        'Del objetivo doble solo está la mitad: el menisco medial sí está en el rig, el lateral no. Lo que se enciende es el medial, que está dentro de la articulación, en el compartimento INTERNO: con la vista de perfil por fuera con la que se abre el demo apenas se ve.',
      // 135, EL TOPE DE knee-flexion. La maniobra parte de la flexion maxima
      // (kneePhases.ts: "con la rodilla en flexion maxima") y el demo paraba a
      // 90. 135 es el tope del modelo y la referencia AAOS, no la flexion
      // pasiva maxima (unos 160, kneeRom.ts), y la nota lo dice asi. Visto de
      // perfil con scripts/render-test-demo.mts a 90, 120 y 135 con la
      // rotacion externa de 30 (revision del 15 nov): la pantorrilla apoya en
      // el muslo solo en el hueco popliteo. El solape medido de kneeRom.ts
      // (1,1%, 2,8 cm a 135) es SIN la rotacion; con ella, s/d.
      movementId: 'knee-flexion',
      angleDeg: 135,
      // LA ROTACION TIBIAL SI SE CONDUCE (knee-external/internal-rotation,
      // eje Y de shin_flex). La nota que decia que no es anterior a que se
      // habilitara, y por culpa de eso las cinco pruebas de 90 grados eran el
      // mismo clip. McMurray medial: flexion + rotacion EXTERNA, y se extiende.
      components: [{ movementId: 'knee-external-rotation', angleDeg: 30 }],
      // LOS COMPONENTES PRIMERO, POR LA MANIOBRA. Con el orden por defecto el
      // bucle flexionaba, giraba y a la vuelta quitaba la rotacion ANTES de
      // extender (demoTimeline.strokeAt, 'base-first'): la extension con la
      // rotacion mantenida, que es el gesto de la prueba, no salia nunca. Con
      // 'components-first' la vuelta extiende con la rotacion puesta y la
      // quita al final, y la ida flexiona con ella puesta: es la secuencia de
      // Rossi 2011 (PMC3213012, "Meniscal Palpation Tests"), que flexiona con
      // la pierna en rotacion externa y despues extiende despacio. El precio:
      // al empezar y al acabar cada ciclo la tibia gira con la rodilla recta,
      // que kneeRom.ts ensena bloqueada por el tornillo; con strokePlan son
      // 1,19 s de un trazo de 5,94 s (el tramo minimo del 20%). La nota lo
      // dice. audit-demo-path no decide aqui: solo mide antebrazo y mano
      // contra el tronco, y en un demo de pierna los ordenes empatan.
      order: 'components-first',
      examinerForce: 'applies',
      // EN SUPINO: "Subject supine" (PMID 27405996, PMC4941016, tabla 1) y "The
      // patient lies supine" (Maffulli 2010, PMID 24198542, PMC3781854), los dos
      // leidos en el texto completo de Europe PMC. Plural: el demo conduce
      // flexion y rotacion externa.
      note: 'Se flexiona con la tibia en rotación EXTERNA (variante medial) y se extiende despacio sin soltarla. El modelo flexiona hasta 135°, su tope, y vuelve extendiendo con la rotación mantenida; al empezar y al acabar gira la tibia con la rodilla recta, que en realidad está bloqueada. El valgo/varo no se reproduce. La prueba se hace en SUPINO: el modelo lo muestra de pie, así que mira los ángulos, no la postura global.',
    },
    cite: [
      {
        ref: 'hegedus-2007',
        verified: true,
        locator: 'Resumen: McMurray 70% / 71% agrupadas, 18 estudios heterogéneos',
      },
    ],
  },
  {
    id: 'joint-line-tenderness',
    name: 'Dolor en la interlínea articular',
    aka: ['Joint line tenderness'],
    region: 'knee',
    category: 'Menisco',
    target: 'Menisco medial / lateral',
    purpose: 'Localizar dolor meniscal por palpación de la interlínea.',
    maneuver:
      'Con la rodilla a ~45-90° de flexión, el explorador palpa la interlínea articular medial y lateral.',
    positive: 'Dolor localizado en la interlínea sobre el menisco afecto.',
    // Figures corrected 2026-08-04. The entry claimed 83/76 citing Hegedus
    // 2007, but that meta-analysis reports POOLED 63% / 77% in its own abstract
    // — the sensitivity was off by 20 points, and in the direction that
    // oversells the test. The interpretation was wrong as a consequence: joint
    // line tenderness is NOT a sensitive screen.
    metrics: {
      sensitivity: 63,
      specificity: 77,
      note: 'Hegedus 2007 (metaanálisis, sensibilidad/especificidad agrupadas): 63/77. Resultados muy heterogéneos entre estudios.',
    },
    utility: 'weak',
    interpretation:
      'Precisión modesta en ambas direcciones (63/77): ni descarta ni confirma la lesión meniscal por sí solo. Su valor es dentro de un clúster con McMurray y Thessaly.',
    demo: {
      highlightStructureIds: ['knee-medial-meniscus'],
      // Menisco medial dentro de la articulacion y camara de perfil por fuera:
      // medida y razon en el demo de McMurray.
      cannotShow:
        'Del objetivo doble solo está la mitad: el menisco medial sí está en el rig, el lateral no. Lo que se enciende es el medial, que está dentro de la articulación, en el compartimento INTERNO: con la vista de perfil por fuera con la que se abre el demo apenas se ve.',
      movementId: 'knee-flexion',
      angleDeg: 45,
      note: 'Se palpa la interlínea con la rodilla en flexión; el modelo solo muestra la flexión.',
    },
    cite: [
      {
        ref: 'hegedus-2007',
        verified: true,
        locator: 'interlínea articular 63/77 (agrupadas, resumen)',
      },
    ],
  },
  {
    id: 'thessaly',
    name: 'Test de Thessaly (20°)',
    aka: ['Thessaly'],
    region: 'knee',
    category: 'Menisco',
    target: 'Menisco medial / lateral',
    purpose: 'Reproducir el atrapamiento meniscal en carga y rotación.',
    maneuver:
      'En apoyo monopodal con la rodilla a 20° de flexión, el paciente rota el cuerpo (y la rodilla) medial y lateralmente tres veces, sujeto por las manos del explorador.',
    positive: 'Dolor en la interlínea o sensación de bloqueo/enganche durante la rotación.',
    // LAS CIFRAS DE REPLICACION TIENEN FUENTE. El "62-66 / 39-55" de la nota no
    // se citaba en ningun sitio: son las dos parejas del resumen de Blyth 2015
    // (PMID 26243431, leido por E-utilities), 66/39 con clinicos de atencion
    // primaria y 62/55 con clinicos musculoesqueleticos, contra resonancia,
    // estudio prospectivo en un centro de atencion especializada disenado para
    // reproducir la primaria. Por eso la interpretacion ya no dice "en atencion
    // primaria". Goossens 2015 (PMID 25420009, resumen) es la replica con
    // artroscopia y fisioterapeutas experimentados: 64/53, LR+ 1,37 y LR- 0,68.
    //
    // Y NO TODAS LAS REPLICAS FALLARON. La revision proponia "los estudios
    // independientes posteriores no lo reprodujeron", y Harrison 2009 (PMID
    // 19124977, resumen), que no es el grupo original, si lo hizo: 90,3/97,7,
    // LR+ 39,3, en una serie RETROSPECTIVA de 116 artroscopias en un centro de
    // referencia, y sus autores avisan de que no se generaliza. Callarlo
    // convertia la frase en falsa. Lo que la revision leyo en los PDF del
    // informe HTA de Blyth (quien era el clinico de primaria, cuantos pacientes
    // pasaron a resonancia o a artroscopia) no se ha reabierto aqui y no se
    // escribe. Que cifra pintan las barras (89/97 de Karachalios, que su
    // resumen no da: solo la exactitud, 94% en el medial) queda pendiente de
    // criterio clinico.
    metrics: {
      sensitivity: 89,
      specificity: 97,
      note: 'Karachalios 2005 (original, menisco medial): 89/97. Fuera de ese grupo el resultado es dispar. Harrison 2009, serie retrospectiva de 116 artroscopias en un centro de referencia: 90/98. Blyth 2015, prospectivo y con la resonancia como patrón de referencia: 66/39 con clínicos de atención primaria y 62/55 con clínicos musculoesqueléticos; en ese mismo estudio la resonancia, contrastada con artroscopia, solo tuvo un 53% de especificidad. Goossens 2015, 593 pacientes frente a artroscopia, con fisioterapeutas experimentados a 20°: 64/53.',
    },
    utility: 'balanced',
    interpretation:
      'Las cifras originales fueron muy altas; una serie retrospectiva de un centro de referencia las igualó, pero con clínicos de atención primaria, con clínicos musculoesqueléticos y con fisioterapeutas experimentados frente a artroscopia no se reprodujeron. Interprétalo con cautela dentro de un clúster, no como prueba única.',
    demo: {
      highlightStructureIds: ['knee-medial-meniscus'],
      // Menisco medial dentro de la articulacion y camara de perfil por fuera:
      // medida y razon en el demo de McMurray.
      cannotShow:
        'Del objetivo doble solo está la mitad: el menisco medial sí está en el rig, el lateral no. Lo que se enciende es el medial, que está dentro de la articulación, en el compartimento INTERNO: con la vista de perfil por fuera con la que se abre el demo apenas se ve.',
      movementId: 'knee-flexion',
      angleDeg: 20,
      // LA IMAGEN SE LEE COMO EL APOYO CONTRARIO. El demo solo gira shin_flex
      // del lado explorado, con pelvis y femur quietos: en la captura de su
      // pose sostenida (capturas/antes/rodilla/test-de-thessaly-20, 15 nov) esa
      // pierna queda doblada con el pie atras y el talon levantado, y la otra
      // recta con el pie plano. La prueba carga la explorada con el pie plano
      // (Harrison 2009, PMID 19124977, resumen: "stands flatfooted"; el apoyo
      // monopodal es el de la maniobra de esta ficha). Sin componentes: su giro
      // es el del cuerpo sobre el pie, y knee-*-rotation giraria la tibia con
      // el pie suelto y en un solo sentido.
      note: 'La prueba carga SOLO la pierna explorada, con el pie plano. El modelo no la carga: dobla la rodilla con el pie atrás y el talón levantado, como si se apoyara en la otra. Mira el ángulo; el giro del cuerpo no se reproduce.',
    },
    cite: [
      { ref: 'karachalios-2005', verified: true, locator: 'medial 89/97 (original)' },
      {
        ref: 'harrison-2009',
        verified: true,
        locator:
          'Resumen: Thessaly 90,3% / 97,7%, LR+ 39,3 y LR- 0,09, serie retrospectiva de 116 artroscopias en un centro de referencia',
      },
      {
        ref: 'blyth-2015',
        verified: true,
        locator:
          'Resumen: Thessaly 66/39 con clínicos de atención primaria y 62/55 con clínicos musculoesqueléticos (exactitud 54% y 59%), frente a resonancia',
      },
      {
        ref: 'goossens-2015',
        verified: true,
        locator: 'Resumen: Thessaly 64% (IC 95% 60-68) / 53% (43-63) frente a artroscopia, n = 593',
      },
    ],
  },
  {
    id: 'apley-compression',
    name: 'Compresión de Apley',
    aka: ['Apley grind'],
    region: 'knee',
    category: 'Menisco',
    target: 'Menisco medial / lateral',
    purpose: 'Diferenciar dolor meniscal de dolor ligamentario por compresión frente a distracción.',
    maneuver:
      'En prono con la rodilla a 90°, el explorador comprime axialmente y rota la tibia (dolor meniscal); la distracción con rotación estresa las estructuras ligamentarias.',
    positive: 'Dolor con la compresión-rotación que NO aparece (o es menor) con la distracción.',
    metrics: {
      sensitivity: 60,
      specificity: 70,
      note: 'Hegedus 2007 (metaanálisis, agrupadas): 60/70. Resultados heterogéneos; úsalo dentro de un clúster.',
    },
    utility: 'weak',
    interpretation:
      'Precisión baja aislado: aporta sobre todo para diferenciar el origen meniscal (compresión dolorosa) del ligamentario (distracción dolorosa).',
    demo: {
      highlightStructureIds: ['knee-medial-meniscus'],
      // Menisco medial dentro de la articulacion y camara de perfil por fuera:
      // medida y razon en el demo de McMurray.
      cannotShow:
        'Del objetivo doble solo está la mitad: el menisco medial sí está en el rig, el lateral no. Lo que se enciende es el medial, que está dentro de la articulación, en el compartimento INTERNO: con la vista de perfil por fuera con la que se abre el demo apenas se ve.',
      movementId: 'knee-flexion',
      angleDeg: 90,
      components: [{ movementId: 'knee-internal-rotation', angleDeg: 25 }],
      // LA MANO NO COMPRIME, Y YA NO SE DIBUJA. placeResistance (RigOverlays)
      // apoya la mano al 82% de la pierna y le quita la componente a lo largo
      // del miembro: a 90 grados empuja la pierna hacia la extension,
      // perpendicular a la tibia. En la captura de la pose sostenida
      // (capturas/despues2/rodilla/compresion-de-apley, 23 nov) el guante queda
      // sobre la cara de arriba de la pierna horizontal, junto al tobillo, y la
      // lectura del escenario mandaba aplicar la fuerza "donde se apoya la mano
      // del fisio". La nota decia ademas "la mano que comprime". En la prueba se
      // sujeta el pie y se carga la tibia en su eje rotandola a los dos lados
      // (Maffulli 2010, PMID 24198542, PMC3781854; Asokan 2023, PMID 36755559,
      // PMC9900019; los dos en prono a 90 grados, leidos en el texto completo de
      // Europe PMC). Con `examinerHand: false` se quedan la etiqueta "Pasivo" y
      // su aviso de no contraer, que eran el motivo para no quitar
      // `examinerForce`, y se va la mano. No se impone orden con la
      // distraccion: Rossi 2011 (PMID 22035381, PMC3213012, texto completo por
      // E-utilities) la hace antes que la compresion ("twisted and pulled, then
      // pushed"), y la maniobra de esta ficha no fija ninguno. Revisar cuando
      // exista un contacto por prueba (forceDirection, pedido en la cabecera).
      examinerForce: 'applies',
      examinerHand: false,
      note: 'De pie, con la rodilla a 90° (pierna horizontal) y la tibia solo en rotación interna. La prueba se hace en prono: se sujeta el pie, se carga la tibia en su eje rotándola hacia dentro y hacia fuera y se compara con la distracción. Aquí no se dibuja la mano: la del modelo empujaría la pierna de través, hacia la extensión, sin comprimir. La compresión y la distracción no se reproducen.',
    },
    // Re-attributed 2026-08-04: the entry cited Malanga 2003, whose abstract
    // reports no figures for Apley. 60/70 are the POOLED values from Hegedus
    // 2007, which states them verbatim in its abstract. Same numbers, correct
    // source — and now checkable by a reader.
    cite: [
      { ref: 'hegedus-2007', verified: true, locator: 'Apley 60/70 (agrupadas, resumen)' },
    ],
  },

  // ======================== LIGAMENTOS COLATERALES ========================
  {
    id: 'valgus-stress-knee',
    name: 'Estrés en valgo',
    aka: ['Valgus stress'],
    region: 'knee',
    category: 'Ligamentos colaterales',
    target: 'Ligamento colateral medial (LCM)',
    purpose: 'Valorar la integridad del ligamento colateral medial.',
    maneuver:
      'Se aplica una fuerza en valgo a la rodilla a 0° y a 30° de flexión, comparando la apertura con el lado sano.',
    positive: 'Apertura medial aumentada y/o dolor; la apertura a 0° sugiere lesión más grave (cápsula/cruzados).',
    metrics: {
      note: 'SIN CIFRA DEFENDIBLE, y no por falta de búsqueda. El 86% / 68% que se mostraba aquí se atribuía a Malanga 2003, que no lo publica; y su conclusión sobre estas pruebas es justamente la contraria a dar un número: aunque la exploración de los ligamentos colaterales PARECE sensible y específica, faltan estudios bien diseñados que la validen. Lo que sí se puede afirmar en consulta es el hallazgo estructural: la apertura en valgo a 30° de flexión apunta al ligamento colateral medial, mientras que la apertura con la rodilla en EXTENSIÓN COMPLETA implica lesión combinada (cruzado y/o esquina posteromedial) y cambia el manejo.',
    },
    utility: 'balanced',
    utilityBasis:
      'Sin cifra defendible: el 86% / 68% que se mostraba aquí no está en Malanga 2003, y la conclusión de esa revisión es que a la exploración de los colaterales le faltan estudios bien diseñados. La etiqueta describe el uso, no un perfil medido: lo que decide el manejo es DÓNDE se abre, a 30 grados o en extensión completa.',
    interpretation:
      'Sensible para el LCM a 30°. Una apertura clara a 0° de extensión orienta a lesión combinada (cápsula posteromedial o cruzados) y obliga a valorarlos.',
    demo: {
      // EL COLATERAL MEDIAL SE ENCIENDE DONDE LA CAMARA NO MIRA. knee-flexion
      // es sagital y `readingAngleFor` abre el demo de perfil por el lado que
      // se mueve (labCamera.ts, azimut -90 en la derecha): el ligamento queda
      // en la cara interna, con el femur y la tibia en medio (LaPrade 2007,
      // PMID 17768198, situa el colateral medial superficial en la cara
      // medial). MEDIDO en las capturas de la pose sostenida, a 30 grados
      // (capturas/despues2/rodilla, estres-en-valgo contra estres-en-varo, 23
      // nov: misma pose y camara, y el varo no resalta nada; script en el
      // scratchpad, knee-pass2/recount.py): fuera del titulo solo difieren 44
      // pixeles, todos en la interlinea (x 317-323, y 408-422), 26 de ellos en
      // mas de 20 niveles y como mucho 67, un tinte calido apenas visible. Es
      // una sola muestra de un resalte que late (RigOverlays, pulso de
      // `implicated`). Hasta que el demo pueda orientar la vista (un campo de
      // camara por demo, pedido), se dice. La pista de "gira la vista" no se
      // escribe: falta la captura desde el oblicuo anteromedial que demuestre
      // que desde ahi se ve.
      cannotShow:
        'El ligamento colateral medial sí se enciende, pero está en la cara INTERNA de la rodilla y el demo se abre de perfil, por fuera: desde ahí lo tapan el fémur y la tibia, y apenas asoma un brillo en la interlínea.',
      highlightStructureIds: ['knee-mcl'],
      movementId: 'knee-flexion',
      angleDeg: 30,
      examinerForce: 'applies',
      // EN SUPINO: "The patient lies supine", con la rodilla a 30 grados (PMID
      // 39704918, PMC11662134, tabla 2, texto completo por E-utilities), y
      // "while the subject is in supine" (PMID 27405996, PMC4941016, tabla 1,
      // texto completo de Europe PMC). Singular, "el angulo de la rodilla": el
      // demo solo conduce knee-flexion.
      note: 'Se aplica fuerza en VALGO a 0° y a 30° de flexión. Comparte posición con el estrés en varo: lo único que cambia es hacia dónde empuja el explorador, y el rig no tiene ese eje. La prueba se hace en SUPINO: el modelo lo muestra de pie, así que mira el ángulo de la rodilla, no la postura global.',
    },
    cite: [
      {
        ref: 'malanga-2003',
        verified: true,
        locator: 'Revisión narrativa: "lack of well-designed studies" para los ligamentos colaterales',
      },
    ],
  },
  {
    id: 'varus-stress-knee',
    name: 'Estrés en varo',
    aka: ['Varus stress'],
    region: 'knee',
    category: 'Ligamentos colaterales',
    target: 'Ligamento colateral lateral (LCL)',
    purpose: 'Valorar la integridad del ligamento colateral lateral.',
    maneuver:
      'Se aplica una fuerza en varo a la rodilla a 0° y a 30° de flexión, comparando la apertura con el lado sano.',
    positive: 'Apertura lateral aumentada y/o dolor; la apertura a 0° sugiere lesión más grave (esquina posterolateral).',
    metrics: {
      note: 'SIN CIFRA DEFENDIBLE, por el mismo motivo que la prueba en valgo: el 25% / 90% no consta en Malanga 2003, que concluye que a la exploración de los colaterales le faltan estudios bien diseñados que la validen. El LCL se lesiona con mucha menos frecuencia que el LCM, así que cualquier cifra procedería además de series muy pequeñas. Lo útil sigue siendo estructural: apertura en varo a 30° orienta al colateral lateral; apertura en extensión completa, a lesión combinada con la esquina posterolateral.',
    },
    utility: 'balanced',
    utilityBasis:
      'Sin cifra defendible, igual que la prueba en valgo: el 25% / 90% no consta en Malanga 2003. La etiqueta describe el uso, no un perfil medido: apertura a 30 grados orienta al colateral lateral, y apertura en extensión completa a lesión combinada con la esquina posterolateral.',
    interpretation:
      'Una apertura lateral a 0° orienta a lesión de la esquina posterolateral y obliga a descartar afectación asociada del LCP.',
    demo: {
      // "LA MISMA IMAGEN", CON SU MATIZ MEDIDO: a 30 grados, en las capturas de
      // la pose sostenida, valgo y varo solo difieren en 44 pixeles de la
      // interlinea, el colateral medial que el valgo enciende (medida en su
      // demo). Revisar esta frase cuando el demo pueda orientar la vista.
      cannotShow:
        'El ligamento colateral lateral no está en el rig (el medial sí). Y la dirección del varo tampoco se ve: la escena no representa hacia dónde empuja la mano, así que en pantalla esto y el estrés en valgo son la misma imagen, salvo el brillo del colateral medial que el valgo enciende y que desde esta vista apenas asoma. Lo que se demuestra es la flexión en la que se aplica.',
      movementId: 'knee-flexion',
      angleDeg: 30,
      examinerForce: 'applies',
      // EN SUPINO: la fila del varo a 30 grados dice "while the subjects is in
      // supine" (PMID 27405996, PMC4941016, tabla 1, texto completo de Europe
      // PMC), la unica fuente abierta leida para el varo en supino.
      note: 'Se aplica fuerza en VARO a 0° y a 30° de flexión. Comparte posición con el estrés en valgo: lo único que cambia es hacia dónde empuja el explorador, y el rig no tiene ese eje. La prueba se hace en SUPINO: el modelo lo muestra de pie, así que mira el ángulo de la rodilla, no la postura global.',
    },
    cite: [
      {
        ref: 'malanga-2003',
        verified: true,
        locator: 'Revisión narrativa: "lack of well-designed studies" para los ligamentos colaterales',
      },
    ],
  },
];

export const KNEE_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
