// src/data/orthopedicTests/cervical.ts
//
// CERVICAL orthopedic special tests, grouped by clinical target: radiculopatía
// cervical (clúster de Wainner), mielopatía cervical (signos de motoneurona
// superior), inestabilidad craneocervical (banderas rojas) y cribado vascular.
//
// Same encoding + honesty rules as shoulder.ts: metrics are POINT ESTIMATES (%)
// that vary by study and positivity criterion, with a `note` carrying the spread.
// Values here were CHECKED against the primary sources (verified: true + locator);
// where the literature only gives a wide range with no defensible point estimate
// (Lhermitte, insuficiencia vertebrobasilar, pruebas ligamentarias) the metric
// stays note-only or verified: false and the note states why.
//
// Sources (see references.ts): Wainner 2003 + Rubinstein 2007 + Tong 2002
// (radiculopatía), Cook 2010, Jiang 2024 y Jiang 2024b (mielopatía; la 2024b
// es la revision de sintomas, solo frecuencias, citada en Lhermitte),
// Uitvlugt 1988 y Hutting 2013b (inestabilidad cervical alta), Hutting 2013
// (insuficiencia vertebrobasilar).
//
// Reading the utility badge:
//   rule-out (SnNout) = sensible: un NEGATIVO descarta.
//   rule-in  (SpPin)  = específico: un POSITIVO confirma.
//   weak              = poco valor aislado; interpretar en clúster/contexto.
//
// NOTA DE LOS DEMOS: el cuello del rig se mueve con un control por plano,
// repartido de C7 a C1, que gira y no traslada ni empuja. Las pruebas cuya
// maniobra es una traslacion o un reflejo (distraccion, estres del ligamento
// transverso, Hoffmann, supinador invertido, Babinski) no llevan `demo` y lo
// explican en `noDemo`; Sharp-Purser si lo lleva porque su flexion ligera es
// la posicion de partida. Las demas posan la posicion de la prueba, y su nota
// dice lo que el modelo deja fuera: la compresion axial del Spurling, la
// fuerza del explorador, la postura sentada o en supino. Decia que la
// compresion axial y la tension neural del miembro superior no se podian
// posar, y Spurling y el ULNT del mediano tienen demo desde la revision del
// 14 nov.

import type { OrthopedicTest } from '../../types/orthopedicTest';

const tests: OrthopedicTest[] = [
  // ======================= RADICULOPATÍA CERVICAL =======================
  {
    id: 'spurling',
    name: 'Test de Spurling',
    aka: ['Compresión foraminal', 'Spurling A'],
    region: 'cervical',
    category: 'Radiculopatía cervical',
    target: 'Raíz nerviosa cervical (foramen intervertebral)',
    purpose: 'Reproducir el dolor radicular por estrechamiento del foramen.',
    maneuver:
      'Sentado, se inclina el cuello hacia el lado sintomático y el explorador aplica una compresión axial de unos 7 kg sobre la cabeza. Es el «Spurling A» de Wainner; el «Spurling B» suma extensión y rotación hacia el mismo lado.',
    positive:
      'Reproducción del dolor o parestesias irradiadas por el dermatoma del lado explorado (no solo dolor cervical local).',
    metrics: {
      sensitivity: 50,
      specificity: 86,
      note: 'Wainner 2003 (frente a EMG), Spurling A (inclinación hacia el lado sintomático y compresión): 50/86, LR+ 3.5. Tong 2002: 30/93. Muy específico y poco sensible.',
    },
    utility: 'rule-in',
    interpretation:
      'Alta especificidad y baja sensibilidad (SpPin): un positivo confirma con fuerza la radiculopatía; un negativo NO la descarta. Es la clave confirmatoria del clúster de Wainner.',
    pearl:
      'No lo fuerces si aparecen mareo, síntomas bilaterales o signos medulares. Detén la compresión en cuanto se reproduzcan los síntomas.',
    // INCLINACION, NO EXTENSION. El alias y las cifras (50/86) son del Spurling
    // A de Wainner: inclinacion hacia el lado sintomatico y unos 7 kg de
    // compresion, sin extension ni rotacion (tabla 1 del preprint de Wang 2022,
    // Research Square rs-1621985 v2, y tabla 1 de Fellows y Dimond 2022,
    // abiertas en la revision del 14 nov). La maniobra describia el B y el demo
    // posaba 25 grados de extension, que el A no tiene. 30 grados es una
    // eleccion del rig, sin fuente para el angulo del A, y queda lejos de los 15
    // del ligamento alar, que usa el mismo control. El raquis del rig no lee
    // `side`: la direccion es la fija del control. La prueba se hace sentado y
    // el modelo esta de pie (captura de la pose sostenida a 30 grados,
    // despues2/cervical/test-de-spurling.png, 23 nov): la nota lo dice, como
    // la de Sharp-Purser y la del ULNT.
    demo: {
      cannotShow:
        'La raíz nerviosa no se puede encender: el rig no trae raíces ni médula, y los nervios que sí trae vienen con un material que los deja en una capa que el laboratorio no muestra. Lo que se demuestra es la posición que cierra el foramen.',
      movementId: 'cervical-lateral-flexion',
      angleDeg: 30,
      side: 'R',
      note: 'Inclinación hacia el lado sintomático, la posición del Spurling A que estrecha el foramen de ese lado, con el cuerpo de pie y no sentado. Falta la compresión axial de unos 7 kg: el modelo gira articulaciones, no empuja la cabeza.',
    },
    cite: [
      { ref: 'wainner-2003', verified: true, locator: 'Tabla 5 (frente a EMG)' },
      { ref: 'tong-2002', verified: true, locator: 'sens 30% / esp 93% frente a EMG' },
      { ref: 'rubinstein-2007', verified: true, locator: 'revisión sistemática (rangos)' },
    ],
  },
  {
    id: 'cervical-distraction',
    name: 'Distracción cervical',
    aka: ['Cervical distraction test'],
    region: 'cervical',
    category: 'Radiculopatía cervical',
    target: 'Raíz nerviosa cervical (foramen intervertebral)',
    purpose: 'Aliviar el dolor radicular descomprimiendo el foramen.',
    maneuver:
      'Paciente en supino o sentado; el explorador toma el occipucio y el mentón y aplica una tracción axial progresiva del cuello.',
    positive: 'Alivio o reducción clara del dolor/parestesias irradiadas durante la tracción.',
    metrics: {
      sensitivity: 44,
      specificity: 90,
      note: 'Wainner 2003: 44/90, LR+ 4.4. Test de alivio, específico. Un positivo apoya el origen radicular.',
    },
    utility: 'rule-in',
    interpretation:
      'Específico como prueba de alivio: la mejoría con la tracción orienta a compromiso radicular. Baja sensibilidad, por lo que no sirve para descartar.',
    pearl:
      'La tracción reproduce, en manos del explorador, el efecto de la tracción mecánica terapéutica: útil también como prueba pronóstica.',
    // SIN DEMO, Y ESTA ES LA RAZON.
    //
    // La maniobra es una TRACCION AXIAL: el explorador toma occipucio y menton
    // y tira en el eje del cuello. El rig conduce rotaciones de hueso, no
    // traslaciones, asi que eso no puede posarlo. Lo que tenia era una flexion
    // cervical de 12 grados, que no forma parte de la maniobra; con el rotulo
    // "Distraccion cervical" encima, lo que el alumno aprende es que la
    // distraccion se hace flexionando el cuello. Es justo lo contrario de lo
    // que la prueba es: una descarga sin movimiento angular.
    //
    // La maniobra esta descrita en su texto, con el alivio como criterio.

    noDemo:
      'El modelo gira articulaciones; no traslada. Una tracción axial del cuello no tiene ángulo que reproducir.',
    cite: [{ ref: 'wainner-2003', verified: true, locator: 'Tabla 5 (frente a EMG)' }],
  },
  {
    id: 'ulnt-median',
    name: 'Test de tensión neural del MMSS (sesgo mediano)',
    aka: ['ULTT A', 'ULNT 1', 'Upper limb tension test'],
    region: 'cervical',
    category: 'Radiculopatía cervical',
    target: 'Nervio mediano / raíces C5-C7',
    purpose: 'Detectar mecanosensibilidad neural (radiculopatía o neuropatía del MMSS).',
    maneuver:
      'Secuencia con sesgo del mediano: depresión escapular, abducción del hombro ~110°, supinación y extensión de muñeca/dedos, rotación externa y extensión del codo; se sensibiliza con inclinación cervical contralateral.',
    positive:
      'Reproducción de los síntomas del paciente, diferencia >10° respecto al lado sano o cambio de síntomas al modular la inclinación cervical.',
    metrics: {
      sensitivity: 97,
      specificity: 22,
      note: 'Wainner 2003: 97/22, LR− 0.12. Muy sensible y poco específico: el mejor test de cribado del clúster.',
    },
    utility: 'rule-out',
    interpretation:
      'Muy sensible (SnNout): un negativo hace muy improbable la radiculopatía cervical. Un positivo es inespecífico y debe confirmarse con Spurling/distracción.',
    // LA PRUEBA ES DEL BRAZO, no del cuello.
    //
    // Lo que habia posaba SOLO una inclinacion cervical contralateral de 20
    // grados, que es el SENSIBILIZADOR, no la prueba: el alumno veia un cuello
    // inclinandose bajo el rotulo "test de tension neural del MMSS". La
    // secuencia de verdad (abduccion de hombro, rotacion externa, supinacion y
    // extension de muneca) el rig si la conduce, y es lo que ahora se ve. La
    // extension de codo NO: un componente solo crece de 0 a su angulo y
    // RigModel lo aplica como `sign * angleDeg` sin mirar `arcFrom`, y
    // `elbow-extension` comparte hueso, eje y signo con la flexion, asi que a 10
    // grados DOBLABA el codo al final del trazo (revision del 14 nov). Se quito:
    // el codo queda recto, que es su posicion final.
    //
    // 110 grados de abduccion y no 90 (ULNT1 de Physiotutors y Beddaa 2022; el
    // texto completo de Wainner no se pudo abrir). A 110 la cadena ya pone 12
    // grados de rotacion externa obligada ((110 - 90) x 0,6, shoulderChain.ts) y
    // el componente 78: 90 en total; a 90 la cadena no ponia ninguna.
    //
    // La inclinacion cervical no puede acompanarla porque las cadenas de raquis
    // no valen como componente (solo las articulaciones de un hueso), y de
    // todos modos iria al lado contrario que el brazo.
    demo: {
      cannotShow:
        'El nervio mediano sí está en el rig, pero su material lo deja en una capa que el laboratorio no muestra, y las raíces C5-C7 no están. Se demuestra la secuencia de puesta en tensión, no el nervio.',
      components: [
        { movementId: 'glenohumeral-external-rotation', angleDeg: 78 },
        { movementId: 'elbow-supination', angleDeg: 85 },
        { movementId: 'wrist-extension', angleDeg: 60 },
      ],
      movementId: 'glenohumeral-abduction',
      angleDeg: 110,
      side: 'R',
      note: 'La secuencia con sesgo mediano, de pie y no en supino: hombro en abducción de 110° con rotación externa, antebrazo supinado y muñeca en extensión. El codo está recto desde el principio, que es como termina la prueba: el último paso, extender despacio el codo desde 90° hasta que aparezcan los síntomas, no se puede animar. Faltan la extensión de los dedos y del pulgar (el modelo no conduce falanges), la depresión escapular y la inclinación cervical CONTRALATERAL que la sensibiliza (va al lado opuesto del brazo, y el modelo solo posa un lado a la vez).',
    },

    cite: [{ ref: 'wainner-2003', verified: true, locator: 'Tabla 5 (frente a EMG)' }],
  },
  {
    id: 'cervical-rotation-limit',
    name: 'Rotación cervical < 60° al lado sintomático',
    aka: ['ROM rotación ipsilateral'],
    region: 'cervical',
    category: 'Radiculopatía cervical',
    target: 'Movilidad segmentaria cervical',
    purpose: 'Cribar la limitación de rotación asociada a la radiculopatía.',
    maneuver:
      'Se mide la rotación cervical activa hacia el lado sintomático con goniómetro/inclinómetro.',
    positive: 'Rotación activa hacia el lado sintomático menor de 60°.',
    metrics: {
      sensitivity: 89,
      specificity: 49,
      note: 'Wainner 2003: 89/49. Ítem sensible del clúster, poco útil aislado.',
    },
    utility: 'rule-out',
    interpretation:
      'Sensible pero inespecífico: aporta como cribado dentro del clúster de Wainner, no como prueba única. Combínalo con Spurling, distracción y ULTT.',
    pearl:
      'Clúster de Wainner (ULTT + distracción + Spurling + rotación <60°): con 3/4 positivos LR+ 6.1 (prob. ~65%); con 4/4 LR+ 30.3 (IC muy amplio, 1.7-538). Usa el botón "Combinar" para verlo.',
    // UN CORTE ABSOLUTO, NO UNA COMPARACION CON EL LADO SANO. La nota decia
    // "se compara con el lado sano", que es otro criterio y contradecia el
    // campo `positive`. Grondin 2026 (PMID 42070317, PMC13147772, abierto el 23
    // nov) define el item del cluster de 2003 como rotacion menor de 60 grados
    // hacia el lado sintomatico (nota de su Tabla 3), y en la Tabla 2 analiza
    // aparte la comparacion con el otro lado, con cifras distintas: 63/50 el
    // corte y 33/74 la comparacion. El demo se queda en 60, el umbral, y con
    // "menor de 60" esa postura es un NEGATIVO: la nota lo dice para que no se
    // lea como un positivo. Si es activa o pasiva y con que instrumento no
    // consta en lo abierto: el resumen de Wainner 2003 (PMID 12544957) no
    // describe el item y Grondin remite la descripcion de sus pruebas al
    // material en linea.
    //
    // La nota no nombra lado: el raquis no lee `side` (signo fijo del control
    // en boneMap), y en la captura de la pose sostenida, de frente
    // (despues2/cervical, 23 nov), la cara gira hacia la IZQUIERDA del
    // paciente aunque el dato diga 'R'. Es un limite del rig, no del texto.
    demo: {
      cannotShow:
        'Aquí no hay estructura que encender: lo que la prueba mide es una AMPLITUD, la rotación hacia el lado sintomático, y eso es exactamente lo que el modelo está haciendo.',
      movementId: 'cervical-rotation',
      angleDeg: 60,
      side: 'R',
      note: 'Rotación justo hasta el corte de la prueba, 60°. El criterio es absoluto, no una comparación con el lado sano: la prueba es positiva si la rotación activa hacia el lado sintomático no llega a 60°. Un cuello que llega a 60°, como este, la da por negativa.',
    },
    cite: [{ ref: 'wainner-2003', verified: true, locator: 'Tabla 6 (clúster / CPR)' }],
  },

  // ======================= MIELOPATÍA CERVICAL =======================
  {
    id: 'hoffmann',
    name: 'Signo de Hoffmann',
    aka: ['Hoffmann', 'Reflejo digital'],
    region: 'cervical',
    category: 'Mielopatía cervical',
    target: 'Motoneurona superior (compresión medular cervical)',
    purpose: 'Buscar signos de motoneurona superior sugestivos de mielopatía.',
    maneuver:
      'El explorador sostiene el dedo medio y flexiona/"chasquea" con rapidez la falange distal.',
    positive: 'Flexión-aducción refleja del pulgar y/o del índice.',
    // 39/88 NO ERA EL HOFFMANN. Esas cifras son la fila "2 of 5 positive
    // tests" del cluster (Cook 2010, Tabla 3: 0,39 / 0,88, LR+ 3,3). La fila
    // del Hoffmann esta en la Tabla 2: sens 0,31 (0,25-0,35), esp 0,73
    // (0,59-0,84), y es la que extrae Jiang 2024 (Tabla 5: 31/73, LR+ 1,15).
    // Esa misma fila de Cook imprime LR+ 4,9 y LR- 0,74, que con 31/73 no
    // cuadran; y con LR+ 1,15 el Hoffmann no estaria entre las 10 variables
    // con LR+ > 2 o LR- < 0,5 que, segun el texto, entraron en la regresion
    // (y sigue en el modelo final). Cuenta nuestra, no publicada: las dos LR
    // impresas casan entre si con la sensibilidad de 0,31 y una especificidad
    // cercana a 0,93, no a 0,73; por eso la nota senala la especificidad. Sin
    // fe de erratas (ni en el registro MEDLINE de PMID 22131790 ni en la
    // pagina de PMC) no se sabe que celda esta mal: se publica la
    // especificidad impresa, no se publica otra, y la duda va en la nota. El
    // rango 25-100 / 50-100 es literal de la discusion de Jiang 2024: los
    // extremos de sensibilidad son de series sin grupo control (Tabla 6:
    // El-ghandour 2020, 25%; Watson 1997, 100%); en los 8 estudios con
    // control, 31-89 (Tabla 5). Abiertos el 23 nov: PMC3113267 (Cook 2010) y
    // PMC11289551 (Jiang 2024). La etiqueta 'balanced' y la interpretacion
    // quedan pendientes de criterio clinico.
    metrics: {
      sensitivity: 31,
      specificity: 73,
      note: 'Muy variable entre estudios (sens 25-100%, esp 50-100%). Cook 2010 (tabla 2): 31/73, aunque la misma fila publica LR+ 4,9 y LR− 0,74, que no cuadran con esas cifras: su especificidad es dudosa. Un Hoffmann aislado también aparece en sanos.',
    },
    utility: 'balanced',
    interpretation:
      'Signo de motoneurona superior. Aislado tiene valor moderado; gana potencia dentro del clúster de mielopatía (marcha, supinador invertido, Babinski, edad >45).',
    pearl:
      'Un Hoffmann positivo unilateral y aislado, sin otros signos, puede ser una variante normal. Cobra sentido con déficit funcional o hiperreflexia.',
    // SIN DEMO, Y ESTA ES LA RAZON.
    //
    // El gesto es un chasquido de la falange distal del tercer dedo, y lo que
    // se observa es la respuesta refleja del pulgar. Nada de eso lo conduce el
    // rig. Lo que tenia era una flexion cervical de 30 grados --elegida porque
    // el cuello es el ORIGEN de la mielopatia, no porque sea la maniobra--, y
    // bajo el rotulo "Signo de Hoffmann" eso ensena un gesto que no existe.

    noDemo:
      'Es un reflejo de los dedos: el modelo no conduce las falanges, y la respuesta medular que la prueba busca no es una postura que se pueda posar.',
    cite: [
      {
        ref: 'cook-2010',
        verified: true,
        locator: 'Tabla 2: sens 0,31 / esp 0,73 (la misma fila publica LR+ 4,9 y LR− 0,74)',
      },
      {
        ref: 'jiang-2024',
        verified: true,
        locator: 'Discusión: sens 25-100%, esp 50-100%; tabla 5: Cook 2010, 31/73',
      },
    ],
  },
  {
    id: 'lhermitte',
    name: 'Signo de Lhermitte',
    aka: ['Lhermitte'],
    region: 'cervical',
    category: 'Mielopatía cervical',
    target: 'Médula cervical / cordones posteriores',
    purpose: 'Provocar el síntoma de descarga eléctrica de la irritación medular.',
    maneuver: 'Sentado, el explorador realiza una flexión cervical pasiva.',
    positive: 'Sensación de descarga eléctrica que desciende por la columna y/o las extremidades.',
    // SIN CIFRAS DE PRECISION, Y ESTA ES LA RAZON. Llevaba 27/93 citando a
    // Jiang 2024, que no las tiene: en su texto completo (PMC11289551, abierto
    // el 23 nov) el fenomeno de Lhermitte sale una sola vez, en la
    // introduccion, entre los sintomas, y no esta en su Tabla 5 de precision.
    // Ninguna fuente abierta da el par: el 27% coincide con la frecuencia del
    // signo ("affects 27% of cases") que Cervellini 2025 (PMC12090262)
    // atribuye a Crandall y Batzdorf 1966 (PMID 5947048, sin resumen, no
    // abierto): una frecuencia, no una precision. El 93% no aparece en
    // ninguna. Lo unico con grupo control llega de segunda
    // mano: Khare 2015 (PMC4445188, "Validity") da una sensibilidad del 3 al
    // 17% y una especificidad del 97% citando a Uchihara 1994, cuyo resumen
    // (PMID 7809749) no nombra el signo. Con 27/93 la fila pintaba "Confirma"
    // y, desde el 30% por defecto, el panel calculaba un 62% si positivo (LR+
    // 0,27/0,07). Lo comprobable es la frecuencia del sintoma (Jiang 2024b,
    // PMC11289544, "Other Symptoms": 2-77% en cuatro estudios, media ponderada
    // 25%), que respalda que un negativo no descarta.
    metrics: {
      note: 'Sin cifras de precisión que se puedan comprobar en una fuente abierta. Jiang 2024 solo lo nombra entre los síntomas de la mielopatía y no lo incluye en sus tablas de sensibilidad y especificidad. La revisión de síntomas de los mismos autores (Jiang 2024) da su frecuencia: lo refiere una cuarta parte de los pacientes con mielopatía cervical degenerativa (media ponderada del 25%, entre el 2 y el 77% en cuatro estudios), que es la frecuencia del síntoma y no la precisión de la maniobra. También aparece en la esclerosis múltiple.',
    },
    utility: 'weak',
    interpretation:
      'Sin precisión diagnóstica comprobable: aislado no confirma ni descarta. Un positivo obliga a completar el examen neurológico (marcha, Hoffmann, supinador invertido, Babinski) y a valorar una prueba de imagen; un negativo no descarta la mielopatía, porque la mayoría de los pacientes no refiere este síntoma.',
    // LA NOTA DICE QUIEN FLEXIONA, PORQUE EL MODELO NO PUEDE ENSENARLO. La
    // maniobra escrita es una flexion PASIVA que hace el explorador con el
    // paciente sentado. El rig esta de pie y no dibuja mano en el raquis
    // (`RigOverlays.placeResistance` solo la pone en controles 'joint' o
    // 'chain', y `cervical-flexion` es 'spine'). La nota vieja llamaba pasiva a
    // una flexion que en pantalla se hace sola. 45 grados es el tope del
    // control (clinicalRange.max en boneMap); captura de la pose sostenida:
    // despues2/cervical/signo-de-lhermitte.png (23 nov).
    //
    // Sin `examinerForce`, aunque con `examinerHand: false` ya se puede
    // declarar en el raquis: con 'applies' el panel imprime su bloque fijo de
    // prueba pasiva (la fuerza "sobre el segmento distal", "una contraccion
    // del paciente enmascara el hallazgo"), que ninguna fuente abierta
    // respalda para este signo, y cerraria por otra via la pregunta de quien
    // flexiona. Las fuentes abiertas no lo fijan: Khare 2015 (PMC4445188) y
    // Sprowls 2026 (PMC13022657) hablan solo de flexion o movimiento del
    // cuello. Si la maniobra pasa a admitir la flexion activa, esta nota
    // cambia con ella.
    demo: {
      cannotShow:
        'La médula cervical y los cordones posteriores no están en el modelo. Lo que se reproduce es la flexión que provoca el síntoma.',
      movementId: 'cervical-flexion',
      angleDeg: 45,
      note: 'Flexión cervical hasta 45°, el tope del modelo. Como describe la maniobra, la flexión la hace el explorador, de forma pasiva y con el paciente sentado; aquí, de pie, el cuello se flexiona solo, sin la mano del explorador, que en el raquis no se dibuja.',
    },
    cite: [
      {
        ref: 'jiang-2024',
        verified: true,
        locator: 'Solo lo nombra entre los síntomas (introducción); no figura en sus tablas de precisión',
      },
      {
        ref: 'jiang-2024b',
        verified: true,
        locator:
          'Fenómeno de Lhermitte: 2-77% en cuatro estudios, media ponderada 25% (IC 95% 23-29%); frecuencia, sin especificidad',
      },
    ],
  },
  {
    id: 'inverted-supinator',
    name: 'Signo del supinador invertido',
    aka: ['Inverted supinator sign'],
    region: 'cervical',
    category: 'Mielopatía cervical',
    target: 'Motoneurona superior (nivel C5-C6)',
    purpose: 'Detectar mielopatía a nivel C5-C6 con respuesta refleja invertida.',
    maneuver:
      'Se percute el tendón del braquiorradial (reflejo supinador) con el antebrazo relajado.',
    // EXTENSION DEL CODO, NO FLEXION. Decia "flexion ... del codo por reflejo
    // tricipital paradojico", y el triceps extiende el codo; ademas chocaba con
    // su propio arranque ("ausencia de flexion del codo"). Jiang 2024 (PMID
    // 37903098, PMC11289551), Tabla 2, fila del supinador invertido: "Elbow
    // extension and/or finger flexion" (abierta en la revision del 14 nov).
    positive:
      'Ausencia de flexión del codo, con flexión refleja de los dedos y/o extensión del codo.',
    // COOK 2010 PUBLICA 18/99 Y LR+ 29,1, NO 19/99. Tabla 2 de Cook 2010
    // (PMID 22131790, PMC3113267, abierto el 23 nov), fila del supinador
    // invertido: sens 0,18 (0,14-0,19), esp 0,99 (0,97-0,99), LR+ 29,1
    // (5,1-171,5), LR- 0,82 (0,81-0,84), y el texto lo repite ("the single
    // highest LR+"). El 0,19/0,99 era la fila "3 of 5" del cluster (Tabla 3).
    // La LR+ va escrita porque el panel, sin el campo, la deriva de las cifras
    // redondeadas: con 19/99 imprimia "LR+ 19.0 aprox." encima de una nota que
    // decia 29, y con 18/99 imprimiria 18. Jiang 2024 (Tabla 5) da 14,64 para
    // el mismo estudio. Reconstruccion nuestra, no recuento publicado: con los
    // 88 pacientes con mielopatia y los 161 sin ella de Cook (Tabla 1), 16
    // positivos y 2 falsos positivos dan las seis cifras de Jiang, y 1 falso
    // positivo da las de Cook; la diferencia es un paciente, y por eso el
    // intervalo es tan ancho. Cual de las dos LR usa el panel queda pendiente
    // de criterio clinico: aqui va la que publica el estudio citado.
    metrics: {
      sensitivity: 18,
      specificity: 99,
      lrPositive: 29.1,
      lrNegative: 0.82,
      note: 'Cook 2010, tabla 2: 18/99 y LR+ 29,1 (IC 95% 5,1 a 171,5), un intervalo muy ancho. Con las cifras redondeadas a dos decimales, 18/99 daría una LR+ de 18; Jiang 2024 recalcula la de este estudio en 14,6. Muy específico y poco sensible (sens 18-75% entre estudios).',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico (SpPin): un positivo apoya con fuerza la mielopatía a nivel C5-C6. Poco sensible, así que su ausencia no la descarta; interpretar dentro del clúster.',
    // SIN DEMO, Y ESTA ES LA RAZON.
    //
    // La maniobra es percutir el tendon del braquiorradial y mirar que pasa en
    // los dedos. Ni la percusion ni el reflejo se pueden representar. Lo que
    // tenia era una extension cervical de 20 grados, que no es parte de la
    // prueba: el cuello es donde esta la compresion, no donde se explora.

    noDemo:
      'Es un reflejo por percusión del tendón braquiorradial: el modelo no simula percusión ni respuestas reflejas.',
    cite: [
      {
        ref: 'cook-2010',
        verified: true,
        locator: 'Tabla 2: sens 0,18 / esp 0,99; LR+ 29,1 (IC 95% 5,1 a 171,5); LR− 0,82',
      },
      {
        ref: 'jiang-2024',
        verified: true,
        locator: 'Tabla 5: sens 18-75% entre estudios; Cook 2010 recalculado en LR+ 14,64',
      },
    ],
  },
  {
    id: 'babinski',
    name: 'Signo de Babinski / clonus',
    aka: ['Babinski', 'Clonus aquíleo'],
    region: 'cervical',
    category: 'Mielopatía cervical',
    target: 'Vía corticoespinal (motoneurona superior)',
    purpose: 'Confirmar afectación de motoneurona superior.',
    maneuver:
      'Se estimula el borde lateral de la planta del pie hacia los metatarsianos (Babinski) y/o se busca clonus con dorsiflexión brusca del tobillo.',
    positive:
      'Extensión del primer dedo con apertura en abanico (Babinski) o clonus sostenido del tobillo.',
    // SIN CIFRA PUNTUAL, Y ESTA ES LA RAZON. Decia 26/96 citando a Jiang 2024
    // (PMID 37903098, texto completo PMC11289551, abierto el 23 nov), y esa
    // pareja no es un resultado de la revision: su Tabla 5 da cada estudio con
    // grupo control por separado y no agrupa la especificidad (Babinski:
    // Chaiyamongkol 2017 36/100, Cook 2009 33/93, Cook 2010 7/100, Rhee 2009
    // 13/100; clonus: Cook 2009 11/96, Cook 2010 7/99, Rhee 2009 13/100). El
    // 96% solo sale en la introduccion, citando la revision de Cook 2011. Lo
    // unico agrupado es la sensibilidad media ponderada de las cohortes de la
    // Tabla 6 (Babinski 0,42, IC 0,41-0,44; clonus 0,31, IC 0,28-0,34),
    // distinta para cada signo, y esta ficha junta los dos, asi que no hay una
    // cifra que poner arriba. Con 26/96 el panel derivaba una LR+ de 6,5 que
    // ninguna fuente publica. El techo del clonus es 100 (Rhee 2009), no 99.
    // La salvedad de los controles es literal de la discusion de Jiang
    // ("the values for specificity may be falsely elevated").
    metrics: {
      note: 'Muy específico y poco sensible, sin una cifra única de especificidad. En los estudios con grupo control que recoge Jiang 2024 (Tabla 5): Babinski sens 7-36% y esp 93-100% en cuatro estudios; clonus sens 7-13% y esp 96-100% en tres. Promediando las cohortes de pacientes con mielopatía (Tabla 6), la sensibilidad fue del 42% para el Babinski y del 31% para el clonus.',
    },
    utility: 'rule-in',
    utilityBasis:
      'Jiang 2024 no agrupa la especificidad, pero en los cuatro estudios con grupo control de su Tabla 5 la del Babinski va del 93 al 100%, y la del clonus del 96 al 100% en tres. Los controles eran personas sanas o pacientes cervicales sin compresión medular en la imagen, así que la especificidad puede estar inflada: el Babinski también aparece en otras lesiones de motoneurona superior.',
    interpretation:
      'Alta especificidad (SpPin): un positivo confirma afectación de motoneurona superior. Su ausencia no descarta mielopatía incipiente.',
    // SIN DEMO, Y ESTA ES LA RAZON.
    //
    // Se estimula la planta del pie y se mira el primer dedo. Lo que tenia era
    // una flexion cervical de 25 grados, es decir: ni la zona que se estimula
    // ni la que responde. El rotulo decia "Signo de Babinski" sobre un cuello
    // flexionandose.

    noDemo:
      'Es un reflejo plantar: el modelo no conduce los dedos del pie ni simula el clonus.',
    cite: [
      {
        ref: 'jiang-2024',
        verified: true,
        locator:
          'Tabla 5 (cada estudio por separado, sin agrupar) y texto de la Tabla 6 (sensibilidad media ponderada)',
      },
    ],
  },

  // =================== INESTABILIDAD CRANEOCERVICAL ===================
  {
    id: 'sharp-purser',
    name: 'Test de Sharp-Purser',
    aka: ['Sharp-Purser'],
    region: 'cervical',
    category: 'Inestabilidad craneocervical',
    target: 'Ligamento transverso / articulación atlantoaxial (C1-C2)',
    purpose: 'Detectar subluxación atlantoaxial anterior (inestabilidad de C1-C2).',
    maneuver:
      'Sentado, con el cuello en ligera flexión, el explorador aplica una presión posterior sobre la frente mientras estabiliza la apófisis espinosa de C2.',
    positive:
      'Deslizamiento posterior de la cabeza con un "clunk" y/o alivio de los síntomas al recolocarse el atlas.',
    metrics: {
      sensitivity: 88,
      specificity: 96,
      note: 'Uitvlugt 1988 (artritis reumatoide, subluxación >4 mm): 88/96. Alta precisión, pero población seleccionada.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico: un positivo confirma inestabilidad atlantoaxial. Es una BANDERA ROJA: contraindica la manipulación cervical y obliga a derivación/imagen.',
    pearl:
      '⚠️ Prueba de precaución. Sospéchala en artritis reumatoide, síndrome de Down o traumatismo. Ejecútala con suavidad y detente ante mareo o síntomas neurológicos.',
    // SOLO LA POSICION DE PARTIDA, Y SE DICE. La prueba es una presion
    // posterior sobre la frente con la espinosa de C2 fijada, y el positivo es
    // el deslizamiento posterior de la cabeza respecto al axis (Sung 2020,
    // PMC7609854; Hariharan 2021, PMC8201716, Tabla 1; abiertos el 23 nov). El
    // rig solo gira articulaciones (boneMap no tiene control que traslade) y
    // la mano del explorador no se dibuja en el raquis
    // (`RigOverlays.placeResistance` exige 'joint' o 'chain'). El texto decia
    // "Se demuestra la maniobra" y la nota, que el panel imprime tras "En el
    // modelo:", que se trasladaba la frente; la captura de la pose sostenida a
    // 20 grados (despues2/cervical/test-de-sharp-purser.png, 23 nov) no tiene
    // ni mano ni traslacion. La flexion ligera si es la posicion de partida
    // (Sung 2020), asi que el demo se queda; y como la vuelta del bucle a
    // neutro (`demoTimeline.loopAt`) echa la cabeza atras sin ser el empuje,
    // la nota lo aclara. Sin `examinerForce`: con 'applies' el panel imprime
    // su bloque fijo de prueba pasiva, cuyas frases nadie ha contrastado con
    // esta prueba.
    demo: {
      cannotShow:
        'El ligamento transverso del atlas no está en el rig; el modelo no trae ni un ligamento de raquis.',
      movementId: 'cervical-flexion',
      angleDeg: 20,
      note: 'Se ve solo la posición de partida, el cuello en ligera flexión, con el cuerpo de pie y no sentado. La prueba en sí no se ve: la presión posterior sobre la frente con la apófisis espinosa de C2 estabilizada es una fuerza, y el deslizamiento posterior de la cabeza respecto al axis, que la hace positiva, es una traslación; el modelo solo gira articulaciones. Tampoco dibuja la mano del explorador sobre el raquis. Cuando la cabeza vuelve a neutro, el modelo solo deshace la flexión; no es el empuje.',
    },
    cite: [
      { ref: 'uitvlugt-1988', verified: true, locator: 'subluxación >4 mm' },
      { ref: 'hutting-2013b', verified: true, locator: 'especificidad suficiente' },
    ],
  },
  {
    id: 'transverse-ligament-stress',
    name: 'Estrés del ligamento transverso',
    aka: ['Transverse ligament stress test'],
    region: 'cervical',
    category: 'Inestabilidad craneocervical',
    target: 'Ligamento transverso del atlas',
    purpose: 'Estresar el ligamento transverso para detectar inestabilidad C1-C2.',
    maneuver:
      'En supino, el explorador sostiene el occipucio y desliza la cabeza y el atlas en sentido anterior, manteniendo la posición unos segundos.',
    positive:
      'Reproducción de síntomas de mielopatía (mareo, parestesias, nudo en la garganta, nistagmo) o sensación de inestabilidad.',
    metrics: {
      note: 'Hutting 2013: especificidad suficiente pero sensibilidad variable y pocos estudios. Cribado de seguridad, no prueba diagnóstica.',
    },
    utility: 'weak',
    interpretation:
      'Precisión no establecida con solidez. Úsalo como cribado de seguridad ante sospecha de inestabilidad, nunca como prueba diagnóstica aislada.',
    pearl:
      '⚠️ Prueba de precaución (banderas rojas). Un resultado sugestivo obliga a suspender técnicas de movilización/manipulación y derivar.',
    // SIN DEMO, Y ESTA ES LA RAZON.
    //
    // La maniobra es un DESLIZAMIENTO ANTERIOR de la cabeza y el atlas, mantenido
    // unos segundos, en supino y desde neutro. El rig no traslada vertebras. Lo
    // que tenia era una flexion cervical de 15 grados, que no es ni la posicion
    // de partida (neutro) ni el gesto (traslacion): la flexion craneocervical es
    // precisamente el movimiento que este ligamento FRENA, asi que posarla
    // sugiere lo contrario de lo que la prueba busca.
    //
    // Sharp-Purser si tiene demo, porque alli la flexion ligera SI es la
    // posicion de partida de la maniobra.

    noDemo:
      'Son dos imposibles a la vez: el deslizamiento anterior de la cabeza es una traslación, que el rig no hace, y el ligamento transverso del atlas no existe como malla en este modelo.',
    cite: [{ ref: 'hutting-2013b', verified: true, locator: 'revisión de inestabilidad cervical alta' }],
  },
  {
    id: 'alar-ligament',
    name: 'Prueba del ligamento alar',
    aka: ['Alar ligament test'],
    region: 'cervical',
    category: 'Inestabilidad craneocervical',
    target: 'Ligamentos alares',
    purpose: 'Valorar la integridad de los ligamentos alares (estabilidad rotatoria C0-C2).',
    maneuver:
      'El explorador estabiliza la apófisis espinosa de C2 e induce inclinación lateral o rotación de la cabeza; con el ligamento íntegro, C2 debe rotar de inmediato con el movimiento.',
    positive: 'Movimiento excesivo de la cabeza sin arrastre inmediato de C2 (laxitud del ligamento).',
    metrics: {
      note: 'Hutting 2013: fiabilidad y sensibilidad limitadas; algunas variantes con especificidad aceptable. Valor orientativo dentro del cribado.',
    },
    utility: 'weak',
    interpretation:
      'Sin precisión diagnóstica firme. Aporta solo como parte de la evaluación de estabilidad craneocervical junto a la anamnesis y otras pruebas.',
    pearl:
      '⚠️ Prueba de precaución. Complementa a Sharp-Purser y al estrés del ligamento transverso en el descarte de inestabilidad alta.',
    // EL DEMO NO ENSENA LA PRUEBA, Y LA FICHA LO TIENE QUE DECIR.
    //
    // `cervical-lateral-flexion` es un control 'spine' sin `weights`
    // (boneMap), y `distributeSpineAngle` reparte el angulo por igual de C7 a
    // C1: a 15 grados C2 se inclina con el resto del cuello, y la cabeza con el
    // atlas gira sobre el lo mismo que cualquier otro nivel. La mano del
    // explorador solo se dibuja en controles 'joint' y 'chain'
    // (`RigOverlays.placeResistance`). Y la prueba mira justo eso: la cabeza y
    // el atlas respecto al axis, y el tope (Osmotherly 2012, PMID 22267548,
    // medidas referidas a la posicion del axis; Hidalgo-Garcia 2020, PMID
    // 31989964, con C2 fijado: cortar un alar sube la inclinacion cervical
    // alta 1,30 y 1,88 grados de media, una escala que una inclinacion del
    // cuello entero no puede ensenar). Decia "se demuestra la maniobra y el
    // tope que se busca", y en la captura de la pose sostenida a 15 grados
    // (despues2/cervical/prueba-del-ligamento-alar.png, 23 nov) no hay C2 a
    // la vista, ni mano, ni tope.
    //
    // Que version se ensena, la de estres (C2 sujeto, se valora el tope) o la
    // de palpacion (el giro de C2 que se nota al inclinar), esta pendiente de
    // criterio clinico: la maniobra de arriba mezcla las dos, y esta nota vale
    // para ambas. Sin `examinerForce` por lo mismo que en Sharp-Purser.
    demo: {
      cannotShow:
        'Los ligamentos alares no están en el rig: el modelo no trae ligamentos de raquis.',
      movementId: 'cervical-lateral-flexion',
      angleDeg: 15,
      note: 'Se inclina el cuello entero, repartido por igual de C7 a C1, así que C2 se inclina con él y no hay mano del explorador sobre el raquis. No se ve lo que la prueba valora: cómo se mueven la cabeza y el atlas respecto al axis y cómo es el tope.',
    },
    cite: [{ ref: 'hutting-2013b', verified: true, locator: 'revisión de inestabilidad cervical alta' }],
  },

  // ======================== CRIBADO VASCULAR ========================
  {
    id: 'vbi-sustained-rotation',
    name: 'Insuficiencia vertebrobasilar (rotación y extensión sostenidas)',
    aka: ['Test de VBI', 'Prueba premanipulativa'],
    region: 'cervical',
    category: 'Cribado vascular',
    target: 'Arterias vertebrales / sistema vertebrobasilar',
    purpose: 'Buscar signos de compromiso del flujo vertebrobasilar antes de técnicas cervicales.',
    maneuver:
      'Sentado o en supino, se lleva el cuello a rotación y extensión combinadas hasta el rango final y se sostiene ~10 s vigilando la aparición de síntomas.',
    positive:
      'Mareo, vértigo, nistagmo, diplopía, disartria, disfagia, caídas (drop attacks) o parestesias periorales durante la posición sostenida.',
    metrics: {
      note: 'Hutting 2013: precisión muy baja e inconsistente (sens 0-57%, esp 67-100%; solo 4 estudios de calidad cuestionable). Un negativo NO garantiza seguridad.',
    },
    utility: 'weak',
    interpretation:
      'Escaso valor diagnóstico: un test negativo no descarta patología arterial ni autoriza sin más la manipulación. Prima la anamnesis de riesgo vascular (marco IFOMPT).',
    pearl:
      '⚠️ Su utilidad está muy cuestionada. El cribado real es la historia clínica (patrón de cefalea/cuello nuevo, factores de riesgo, síntomas de las 5 D y 3 N), no esta maniobra.',
    demo: {
      cannotShow:
        'La arteria vertebral no está en el rig, y las arterias que sí trae vienen en una capa que el laboratorio no muestra. Se demuestra la posición sostenida.',
      // RANGO FINAL, que es lo que pide la maniobra: 80 grados, el tope del
      // control. A 70 la pose quedaba a 0,2 cm de la del limite de rotacion
      // cervical --otra prueba de esta misma lista-- y el boton de una
      // reproducia la otra (`npm run measure-test-poses`). La extension que la
      // maniobra suma no puede acompanarla: las cadenas de raquis no valen como
      // componente, solo las articulaciones de un hueso. La maniobra se hace
      // sentado o en supino y el modelo esta de pie (captura de la pose
      // sostenida a 80 grados, despues2/cervical, 23 nov): la nota lo dice.
      movementId: 'cervical-rotation',
      angleDeg: 80,
      side: 'R',
      note: 'Rotación sostenida en el RANGO FINAL (80°, el tope del modelo), con el cuerpo de pie y no sentado ni en supino. La maniobra real suma extensión, que este control no puede sostener a la vez.',
    },
    cite: [{ ref: 'hutting-2013', verified: true, locator: 'sens 0-57% / esp 67-100%' }],
  },
];

export const CERVICAL_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
