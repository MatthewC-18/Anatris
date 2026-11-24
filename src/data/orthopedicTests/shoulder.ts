// src/data/orthopedicTests/shoulder.ts
//
// SHOULDER orthopedic special tests, grouped by clinical target. Metrics are
// POINT ESTIMATES (%) taken from the cited studies; they vary by study, degree
// of tear and positivity criterion, so every entry carries `verified: false`
// (see StudyCitation) and a `note` with the spread. Numbers to confirm against
// the primary sources before publishing.
//
// Sources (see references.ts): Hegedus 2012 (metaanálisis), Park 2005
// (pinzamiento), Lo 2004 (inestabilidad anterior), Gerber 1991 y Hertel 1996
// (manguito), Chronopoulos 2004 (acromioclavicular).
//
// Reading the utility badge:
//   rule-out (SnNout) = sensible: un NEGATIVO descarta.
//   rule-in  (SpPin)  = específico: un POSITIVO confirma.

import type { OrthopedicTest } from '../../types/orthopedicTest';

const tests: OrthopedicTest[] = [
  // ======================= PINZAMIENTO SUBACROMIAL =======================
  // LA BOLSA QUE SE PINZA, ENCENDIDA. Neer, Hawkins-Kennedy y el arco doloroso
  // provocan el conflicto del espacio subacromial, y lo que se comprime ahi es
  // el supraespinoso Y la bolsa subacromial-subdeltoidea. El demo encendia solo
  // el musculo. La bolsa esta en el rig (4 mallas, 2 por lado, medido con
  // `npm run audit-structures`) y desde que tiene capa propia (LayerState.bursa)
  // el demo la fuerza visible como a cualquier ligamento: `subacromial-bursa`
  // en src/lib/clinicalStructures.ts.
  {
    id: 'neer',
    name: 'Test de Neer',
    aka: ['Neer impingement'],
    region: 'shoulder',
    category: 'Pinzamiento subacromial',
    target: 'Espacio subacromial (supraespinoso / bíceps)',
    purpose: 'Reproducir el pinzamiento de las estructuras subacromiales.',
    maneuver:
      'El explorador estabiliza la escápula y eleva pasivamente el brazo en flexión con el hombro en rotación interna, llevándolo al final del rango.',
    positive: 'Dolor en la cara anterolateral del hombro al final de la elevación.',
    metrics: {
      sensitivity: 72,
      specificity: 60,
      note: 'Metaanálisis; sensible pero poco específico. Sube su valor combinado con Hawkins.',
    },
    // Reclassified 'rule-out' -> 'weak' (2026-08-04). SnNout needs high
    // sensitivity; 72% is not high enough to make a negative meaningfully rule
    // impingement out, and 60% specificity means a positive says little either.
    // Hegedus 2012 concludes exactly this: no single shoulder test is
    // pathognomonic, clusters do better.
    utility: 'weak',
    interpretation:
      'Sensibilidad moderada (72%) y especificidad baja (60%): aislado no descarta ni confirma. Su valor está en el clúster con Hawkins y arco doloroso.',
    pearl:
      'Comparte falsos positivos con patología acromioclavicular y labral; interprétalo dentro de un clúster.',
    // PASIVA, PERO SIN LA MANO DEL EXPLORADOR. La mano generica de
    // RigOverlays.placeResistance se apoya al 82% del segmento del gesto BASE y
    // empuja hacia el reposo del brazo colgando: es la mano de una prueba
    // resistida contra la flexion. A 160 grados quedaba en la cara posterior del
    // brazo, junto al occipucio, empujandolo hacia delante y abajo, al reves de la
    // elevacion forzada que pide la maniobra (captura del demo sostenido, revision
    // del 15 nov, capturas/antes/hombro/test-de-neer.png: guante en x 314-358,
    // y 301-372 de 728x834), y la lectura mandaba aplicar la fuerza justo ahi.
    // `examinerHand: false` quita la mano y conserva la etiqueta y las
    // instrucciones de prueba pasiva, que en Neer son las correctas.
    // La escapula del modelo rota con la cadena de flexion (boneMap,
    // 'glenohumeral-flexion' mueve scapula y clavicula) y la maniobra la fija:
    // eso lo dice la nota.
    demo: { examinerForce: 'applies', examinerHand: false, components: [{ movementId: 'glenohumeral-internal-rotation', angleDeg: 60 }], movementId: 'glenohumeral-flexion', angleDeg: 160, highlightMuscleId: 'supraspinatus', highlightStructureIds: ['subacromial-bursa'], note: 'El modelo no fija la escápula: la deja rotar con el ritmo escapulohumeral, y en la prueba el explorador la estabiliza mientras eleva el brazo en rotación interna hasta el final del rango. Las manos del explorador no se dibujan.' },
    cite: [{ ref: 'hegedus-2012', verified: true, locator: 'Neer 72/60' }],
  },
  {
    id: 'hawkins-kennedy',
    name: 'Test de Hawkins-Kennedy',
    aka: ['Hawkins'],
    region: 'shoulder',
    category: 'Pinzamiento subacromial',
    target: 'Espacio subacromial (supraespinoso)',
    purpose: 'Provocar el pinzamiento del supraespinoso bajo el arco coracoacromial.',
    maneuver:
      'Hombro y codo en flexión de 90°; el explorador realiza rotación interna forzada del hombro descendiendo el antebrazo.',
    positive: 'Dolor en la reproducción del gesto.',
    // Figures corrected 2026-08-04: the entry said 74/57, but the cited source
    // (Hegedus 2012, PMID 22773322) reports pooled 79% / 59% in its own
    // abstract. Utility likewise reclassified — 79% sensitivity is still below
    // the SnNout threshold, so a negative does not rule impingement out.
    metrics: {
      sensitivity: 79,
      specificity: 59,
      note: 'Hegedus 2012 (metaanálisis): 79/59. El más sensible del grupo de pinzamiento, pero poco específico.',
    },
    utility: 'weak',
    interpretation:
      'El más sensible del grupo (79%), aunque insuficiente para descartar por sí solo, y con especificidad baja (59%). Úsalo dentro del clúster de pinzamiento, no aislado.',
    // PASIVA, PERO SIN LA MANO DEL EXPLORADOR. La mano generica se coloca por el
    // gesto BASE, la cadena de flexion: caia al 82% del humero, en su cara
    // superior junto al codo, empujando el brazo hacia abajo (captura del demo
    // sostenido, revision del 15 nov, capturas/antes/hombro/
    // test-de-hawkins-kennedy.png: guante en x 387-469, y 427-453, la misma caja
    // que el de Speed, x 382-469, y 426-452), y la lectura mandaba aplicar ahi la
    // fuerza. La de Hawkins baja el antebrazo y es de rotacion interna, y ningun
    // dato puede llevar la mano alli: un componente tiene que ser 'joint' y la
    // flexion de hombro solo existe como cadena. `examinerHand: false` quita la
    // mano y conserva la etiqueta de prueba pasiva.
    //
    // LA CAMARA la pone el plano de la base (sagital, de perfil), y de perfil el
    // antebrazo rotado hacia dentro queda detras del codo. Medido en la revision
    // con el mismo poser que `npm run audit-demo-path`: del codo a la mano hay
    // 30,3 cm, 30,1 de ellos hacia la linea media; desde la camara del demo la
    // mano se desplaza 2,8 cm en pantalla (9% del largo) y de frente se ve
    // entera. Y de frente no baja: acaba 2,0 cm por encima del codo, porque el
    // codo y la rotacion entran a la vez (base-first escala los componentes con
    // un solo factor, src/lib/demoTimeline.ts). La nota dice las dos cosas.
    demo: { examinerForce: 'applies', examinerHand: false, components: [{ movementId: 'elbow-flexion', angleDeg: 90 }, { movementId: 'glenohumeral-internal-rotation', angleDeg: 70 }], movementId: 'glenohumeral-flexion', angleDeg: 90, highlightMuscleId: 'supraspinatus', highlightStructureIds: ['subacromial-bursa'], note: 'De perfil el antebrazo queda oculto tras el codo: gira la cámara de frente para ver la rotación interna. El modelo dobla el codo y rota a la vez, así que no enseña el antebrazo bajando desde la vertical, y la mano del explorador que lo baja no se dibuja.' },
    cite: [
      {
        ref: 'hegedus-2012',
        verified: true,
        locator: 'Hawkins-Kennedy 79/59 (resumen, metaanálisis)',
      },
    ],
  },
  {
    id: 'painful-arc',
    name: 'Arco doloroso',
    aka: ['Painful arc'],
    region: 'shoulder',
    category: 'Pinzamiento subacromial',
    target: 'Espacio subacromial',
    purpose: 'Detectar el conflicto subacromial durante la abducción activa.',
    maneuver: 'El paciente abduce activamente el brazo en el plano de la escápula de 0° a 180°.',
    positive: 'Dolor entre ~60° y 120° de abducción que cede fuera de ese rango.',
    metrics: {
      sensitivity: 74,
      specificity: 81,
      note: 'Park 2005; de los más equilibrados para pinzamiento.',
    },
    utility: 'balanced',
    interpretation:
      'Sensibilidad y especificidad equilibradas: aporta tanto al cribado como a la confirmación. Dolor en ~170-180° orienta más a la articulación acromioclavicular.',
    // EL ARCO ENTERO, NO UNA POSICION. La maniobra es un barrido activo y el
    // positivo es que el dolor del tramo medio CEDE fuera de el. A 90 grados el
    // demo se quedaba dentro del tramo doloroso, no ensenaba que cede y era la
    // misma pose que el brazo caido (capturas/despues2/hombro/arco-doloroso.png y
    // brazo-caído.png: iguales salvo el titulo). Fuentes abiertas: Donnelly 2013
    // (Open Orthop J, PMID 24082969, PMC3785041), abduccion activa y lenta en
    // todo el rango, dolor desde ~70 que cede pasados ~130; Itoi 2013 (J Orthop
    // Sci, PMID 23306597, PMC3607722), dolor entre 90 y 120 al subir y entre 90
    // y 30 al bajar. El resumen de Park 2005, de donde salen las cifras, no
    // describe la maniobra.
    //
    // 150, NO 180. Por encima de 150 la cadena inclina el tronco (rampa desde 0
    // a 150 hasta 25-29 grados a 180: T_SPINE en shoulderChain.ts y
    // trunkLean.test.ts) y `carryShouldersWithSpine` (RigModel) arrastra los DOS
    // brazos con vert_T3, mientras la holgura solo adelanta el brazo activo.
    // Visto en el banco, no en la app (23 nov, `TEST=painful-arc DEG=90,150,180
    // npx tsx --tsconfig tsconfig.scripts.json scripts/render-test-demo.mts`, de
    // frente): a 180 el tronco se inclina, la mano izquierda baja hasta el muslo
    // izquierdo y de frente solo asoman las puntas de los dedos por delante de
    // el (profundidad sin medir), y una tira de musculo sale por el hombro
    // izquierdo; a 150 la pose sale limpia. De la app solo hay captura de 150 de
    // abduccion con el encuadre toracico (Wright, capturas/despues2/toracica):
    // limpia, con la mano justo bajo la lectura de arriba; con el encuadre del
    // hombro no hay ninguna. 150 cruza el tramo doloroso y el punto en que cede
    // sin inclinar el tronco, y la nota dice que la prueba sigue hasta 180.
    // Subir a 180 queda pendiente del brazo contrario y de una captura de la app
    // en la espera.
    //
    // Ya no comparte pose con el brazo caido (que sostiene 90): el par salio de
    // SHARED_POSITION_PAIRS en testDemosDiffer.test.ts (23 nov) y la nota ya no
    // necesita decirlo.
    demo: { movementId: 'glenohumeral-abduction', angleDeg: 150, highlightMuscleId: 'supraspinatus', highlightStructureIds: ['subacromial-bursa'], note: 'El paciente sube y baja el brazo activamente: el dolor aparece al cruzar el arco medio (~60-120°), al subir o al bajar, y cede por encima. El modelo llega a 150°, pasado ese tramo; la prueba sigue hasta la elevación completa. La pausa arriba no es la prueba: lo que se valora es el tramo medio. El modelo abduce en el plano frontal; la prueba se hace en el plano de la escápula.' },
    cite: [{ ref: 'park-2005', verified: true, locator: 'arco doloroso 74/81' }],
  },

  // ==================== MANGUITO ROTADOR — SUPRAESPINOSO ====================
  {
    id: 'empty-can',
    name: 'Lata vacía (Jobe)',
    aka: ['Empty can', 'Jobe'],
    region: 'shoulder',
    category: 'Manguito rotador (supraespinoso)',
    target: 'Supraespinoso',
    purpose: 'Aislar y evaluar la fuerza/integridad del supraespinoso.',
    maneuver:
      'Brazo a 90° de abducción en el plano escapular, rotación interna completa (pulgar hacia abajo, "vaciar la lata"); el explorador resiste hacia abajo.',
    positive: 'Dolor y/o debilidad frente a la resistencia.',
    metrics: {
      sensitivity: 69,
      specificity: 62,
      note: 'Hegedus 2012: 69/62. La DEBILIDAD es más específica de rotura; el DOLOR aislado, menos.',
    },
    utility: 'balanced',
    interpretation:
      'Rendimiento moderado. Distingue el criterio de positividad: la debilidad orienta a rotura, el dolor a tendinopatía/pinzamiento.',
    // EL PULGAR, MEDIDO. Esto llevaba además `elbow-pronation 80`, y con el
    // brazo en abducción eso NO es la maniobra: la rotación interna del hombro
    // ya pone la palma hacia abajo, y 80° más de pronación seguían girando la
    // mano hasta devolver el pulgar ARRIBA. Medido con `npm run audit-demo-hand`
    // (pulgar menos meñique, en altura): con la pronación, +5,6 cm (pulgar
    // arriba); sin ella, -5,4 cm (pulgar abajo), que es el rasgo que distingue a
    // Jobe de una abducción resistida cualquiera.
    //
    // EL PLANO NO SE PUEDE MONTAR, Y LA NOTA LO DICE. Decia "Añade plano
    // escapular" y el panel la imprime tras "En el modelo:", asi que se leia como
    // algo que el demo hace. No lo hace: la abduccion apunta el humero en el
    // plano frontal (`aimPlane: 'z'` en boneMap) conservando la componente
    // anteroposterior del reposo, y en los nodos de reposo del GLB el codo queda
    // 0,6 cm por DETRAS del hombro (eje del humero con z = -0,021, leido por la
    // revision del 15 nov): a 90 grados el brazo queda a 1,2 grados del frontal
    // (cuenta con la formula del aim, no medida con el rig posado). Desde 75
    // grados no hay adelanto cosmetico (`armClearanceFactor` da 0). Los
    // componentes solo admiten controles 'joint' y no hay flexion horizontal,
    // asi que los ~30 grados por delante del frontal no se pueden poner. La
    // cifra: Jobe y Moynes 1982 citados en el texto completo de Kijkunasathian
    // 2023 (BMC Musculoskelet Disord, PMID 37013546, PMC10069100), "30 degrees
    // shoulder horizontal flexion"; el resumen de Jobe (PMID 7180952) no da el
    // angulo.
    demo: { components: [{ movementId: 'glenohumeral-internal-rotation', angleDeg: 70 }], movementId: 'glenohumeral-abduction', angleDeg: 90, highlightMuscleId: 'supraspinatus', examinerForce: 'resists', note: 'El modelo abduce en el plano frontal porque no puede elevar el brazo en el plano de la escápula, que es donde se hace la prueba, unos 30° por delante del frontal. La rotación interna deja el pulgar hacia abajo y el explorador resiste hacia abajo.' },
    cite: [{ ref: 'hegedus-2012', verified: true, locator: 'lata vacía 69/62' }],
  },
  {
    id: 'drop-arm',
    name: 'Brazo caído',
    aka: ['Drop arm'],
    region: 'shoulder',
    category: 'Manguito rotador (supraespinoso)',
    target: 'Supraespinoso (rotura de espesor completo)',
    purpose: 'Detectar rotura significativa del manguito.',
    maneuver:
      'El explorador eleva el brazo en abducción a 90° y pide al paciente que lo descienda lentamente de forma controlada.',
    positive: 'Caída brusca del brazo o incapacidad de controlar el descenso.',
    metrics: {
      sensitivity: 27,
      specificity: 88,
      note: 'Park 2005; alta especificidad, baja sensibilidad.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico: un positivo confirma con fuerza una rotura de espesor completo (SpPin). Un negativo NO la descarta por su baja sensibilidad.',
    // El arco doloroso ya no se queda en 90 (sube a 150, ver su comentario): ya
    // no son la misma pose y el par salio de testDemosDiffer.test.ts (23 nov).
    demo: { movementId: 'glenohumeral-abduction', angleDeg: 90, highlightMuscleId: 'supraspinatus', note: 'El paciente desciende el brazo desde 90° de abducción: lo que se valora aquí es el control del descenso, no el ángulo.' },
    cite: [{ ref: 'park-2005', verified: true, locator: 'brazo caído, esp 87.5%' }],
  },

  // ================== MANGUITO ROTADOR — INFRAESPINOSO ==================
  {
    id: 'external-rotation-lag',
    name: 'Signo de retardo en rotación externa',
    aka: ['ERLS', 'External rotation lag sign'],
    region: 'shoulder',
    category: 'Manguito rotador (infraespinoso)',
    target: 'Infraespinoso / redondo menor',
    purpose: 'Detectar rotura de los rotadores externos.',
    maneuver:
      'Codo a 90°, hombro con ~20° de elevación; el explorador lleva el hombro a rotación externa casi máxima y suelta pidiendo mantener la posición.',
    positive: 'El antebrazo "cae" (lag) hacia la rotación interna: incapacidad de sostener la RE.',
    metrics: {
      sensitivity: 97,
      specificity: 93,
      note: 'Hertel 1996: 97/93 para roturas de espesor COMPLETO del infraespinoso; la sensibilidad cae mucho en roturas parciales.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico y, en roturas de espesor completo, muy sensible: un lag positivo confirma el déficit de rotadores externos. Su sensibilidad baja en roturas parciales.',
    // SIN `elbow-flexion` EN LOS COMPONENTES: la rotacion de hombro ya se lee
    // con el codo a 90 (su postura, `ELBOW_AT_90` en boneMap) y el componente
    // se sumaba encima. Medido: el codo acababa doblado a 156 grados, el
    // antebrazo atravesando el biceps. Ver src/data/__tests__/demoComponents.test.ts.
    //
    // 75 GRADOS, NO 60. La maniobra pide rotacion externa casi maxima, que en la
    // descripcion de Hertel 1996 es la maxima menos 5 grados para evitar el
    // rebote elastico (la reproduce Jain 2013, PMID 23332909, texto completo
    // abierto en PMC3826176, que cita a Hertel como su referencia 14). El control
    // llega a 80 (boneMap, clinicalRange), asi que 75 es su "casi maxima"; 60 se
    // quedaba a 20 del tope. Medido con `npm run audit-demo-path --
    // external-rotation-lag --angulo=75`: 0,0% del antebrazo y la mano dentro del
    // tronco en los dos lados, radio minimo 0,93 y en reposo, igual que a 60.
    //
    // LA NOTA. El signo no es una postura: es la caida del antebrazo cuando el
    // explorador suelta la muneca y sigue sujetando el codo (la misma fuente). Y
    // la vuelta del bucle a 0 grados (src/lib/demoTimeline.ts, loopAt) gira el
    // antebrazo justo hacia la rotacion interna, la direccion del retardo
    // positivo: sin decirlo, la animacion se lee como un signo positivo. La
    // postura real tambien la da Jain 2013: sentado, de espaldas al explorador,
    // con 20 grados de elevacion en el plano de la escapula. El modelo esta de
    // pie, y lo que adelanta su brazo es la holgura que lo aparta del tronco
    // (ARM_CLEARANCE_DEG en RigModel), no esa elevacion.
    demo: { movementId: 'glenohumeral-external-rotation', angleDeg: 75, highlightMuscleId: 'infraspinatus', note: 'El modelo no enseña el signo: que el antebrazo caiga hacia la rotación interna al soltarle la muñeca, con el codo aún sujeto. La vuelta a 0° es la animación que se repite, no un retardo. La prueba se hace sentado y con unos 20° de elevación en el plano de la escápula; el modelo está de pie y solo adelanta el brazo para apartarlo del tronco.' },
    cite: [{ ref: 'hertel-1996', verified: true, locator: 'ERLS espesor completo 97/93' }],
  },

  // =================== MANGUITO ROTADOR — SUBESCAPULAR ===================
  {
    id: 'lift-off',
    name: 'Lift-off (Gerber)',
    aka: ['Lift-off', 'Gerber'],
    region: 'shoulder',
    category: 'Manguito rotador (subescapular)',
    target: 'Subescapular',
    purpose: 'Evaluar la integridad del subescapular (rotador interno).',
    maneuver:
      'Dorso de la mano sobre la región lumbar; el paciente intenta separar la mano de la espalda contra ligera resistencia.',
    positive: 'Incapacidad de despegar la mano de la espalda.',
    metrics: {
      sensitivity: 18,
      specificity: 100,
      note: 'Barth 2006, 68 pacientes consecutivos con artroscopia como patrón de referencia: 17,6% de sensibilidad y 100% de especificidad. La cifra de sensibilidad que circula (60%) no sale de ninguna de las dos fuentes: Gerber describió la prueba en 1991 sin publicar sensibilidad ni especificidad. Con una especificidad del 100% un positivo cierra el diagnóstico, pero se le escapan CUATRO de cada cinco roturas.',
    },
    utility: 'rule-in',
    interpretation:
      'La más específica de las cuatro pruebas de subescapular y la MENOS sensible de todas: un positivo confirma, un negativo no dice nada. Requiere rango de rotación interna suficiente para ejecutarse.',
    pearl:
      'Si el paciente no alcanza la posición lumbar (hombro rígido/doloroso), usa el belly-press como alternativa.',
    // SIN DEMO, Y ESTA ES LA RAZÓN.
    //
    // Esta prueba se hace con el DORSO DE LA MANO sobre la región lumbar, y esa
    // posición el rig no la alcanza. Lo que tenía era una rotación interna de
    // 90° con el codo a 90, y ahí hay dos problemas encadenados:
    //
    //  1. 90° se sale de lo que el control conduce. La tabla de ROM da 100°,
    //     pero esa cifra es precisamente con la mano pasando por detrás de la
    //     espalda; el control trabaja en la postura de lectura --codo a 90,
    //     brazo al costado-- donde el tope medido son 70° porque a partir de
    //     ahí el antebrazo entra en el abdomen. Pedir 90 no daba el dorso
    //     lumbar: daba un antebrazo atravesando la tripa. Ahora lo vigila
    //     `npm run audit-data`.
    //  2. Bajarlo al tope tampoco sirve. Medido con
    //     `scripts/measure-test-poses.mts`: a 70° la pose queda a 2,7 cm de la
    //     del press abdominal, por debajo del umbral con el que dos maniobras
    //     se leen como la misma. Y no es un parecido cualquiera: lo que se
    //     vería es la mano SOBRE EL ABDOMEN, que es el press abdominal, con el
    //     rótulo "Lift-off (Gerber)" encima. Un alumno aprendería la maniobra
    //     equivocada.
    //
    // Llevar la mano detrás de la espalda exige además extensión de hombro, que
    // en este rig es la mitad negativa de la cadena de flexión (`labReverse` de
    // shoulderRom, hasta -60 en el laboratorio). Por eso el texto NO dice que el
    // rig no conduzca la extensión: la regla del arco en los demos de Neer y
    // Hawkins rotula "Extensión" de -60 a 0 (capturas/despues2/hombro). Lo que
    // no hay es un demo que la combine con la rotación interna:
    //  - como componente no vale: los componentes son articulaciones sueltas
    //    (testDemosDiffer.test.ts) y la flexión es una cadena;
    //  - como base, `clinicalAudit` solo acepta 0 a 180 para
    //    `glenohumeral-flexion` (clinicalRange en boneMap);
    //  - además, la holgura estética de 35 grados hacia delante
    //    (armClearanceFactor en RigModel) se aplica entera por debajo de 0 y
    //    después de los componentes.
    // Nadie ha medido dónde caería la mano. Y el límite NO es que haga falta
    // más de 70 de rotación interna: 70 es el tope del rig con el codo a 90 y
    // el brazo al costado. Levy 2026 (Int Orthop, PMID 42631756, resumen) mide
    // en sanos que llevan la mano por encima de T12 dos estrategias, extensión
    // 24 ± 9 con rotación interna 27 ± 8, y extensión 17 ± 7 con rotación
    // interna 53 ± 10, aunque es húmero respecto a escápula, otro convenio que
    // el del rig. Así que no hay botón: la maniobra está descrita en su texto y
    // la perla ya dice qué hacer cuando el paciente tampoco alcanza la posición
    // lumbar. Mejor ninguna demostración que una que enseña otra prueba.
    noDemo:
      'La prueba parte con el dorso de la mano sobre la región lumbar, y esa posición no está montada en el modelo. El laboratorio conduce la extensión del hombro (el tramo del arco de flexión por debajo de 0°) y la rotación interna por separado, pero no hay una pose medida que las combine con el codo doblado y la mano detrás de la espalda; con la rotación interna sola la mano va hacia el abdomen, que es la posición del press abdominal.',
    cite: [
      {
        ref: 'barth-2006',
        verified: true,
        locator: 'Resumen: lift-off 17,6% / 100%, n = 68, artroscopia',
      },
      {
        ref: 'gerber-1991',
        verified: true,
        locator: 'Descripción original de la maniobra; NO publica sensibilidad ni especificidad',
      },
    ],
  },
  {
    id: 'belly-press',
    name: 'Press abdominal (belly-press)',
    aka: ['Belly-press', 'Napoleon'],
    region: 'shoulder',
    category: 'Manguito rotador (subescapular)',
    target: 'Subescapular',
    purpose: 'Evaluar el subescapular cuando la rotación interna posterior está limitada.',
    maneuver:
      'Palma sobre el abdomen con el codo por delante del plano del cuerpo; el paciente presiona el abdomen manteniendo la muñeca recta.',
    positive: 'La muñeca se flexiona / el codo cae hacia atrás (compensa con el deltoides posterior).',
    metrics: {
      sensitivity: 40,
      specificity: 98,
      note: 'Barth 2006, los MISMOS 68 pacientes que midieron el lift-off: 40% de sensibilidad y 97,9% de especificidad. Importa que sea la misma serie, porque ahí el belly-press dobla la sensibilidad del lift-off sin perder especificidad. En ese estudio la prueba más sensible fue el abrazo de oso (bear-hug, 60% / 91,7%), y aun así el 40% de las roturas de subescapular no las predijo NINGUNA de las cuatro pruebas.',
    },
    utility: 'rule-in',
    interpretation:
      'Muy específico: un positivo confirma déficit del subescapular. Poco sensible aislado, aunque el doble que el lift-off en la misma serie.',
    // SIN `elbow-flexion` EN LOS COMPONENTES: la rotacion de hombro ya se lee
    // con el codo a 90 (su postura, `ELBOW_AT_90` en boneMap) y el componente
    // se sumaba encima. Medido: el codo acababa doblado a 156 grados, el
    // antebrazo atravesando el biceps. Ver src/data/__tests__/demoComponents.test.ts.
    // Y 5 GRADOS, NO 45. La postura de la rotacion (codo a 90) mas la holgura
    // que adelanta el brazo ya dejan el antebrazo DELANTE del tronco, y mas
    // rotacion interna lo mete en el. Medido con
    // `npm run audit-demo-path -- belly-press --angulo=N` (radio normalizado
    // del punto mas hundido; 1 = la piel, 0 = el centro del tronco): a 5 grados
    // nada entra (0,86; el umbral del banco es 0,85); a 10 empieza a hundirse
    // (0,78); a 45 se metia hasta 0,26, con el 10,6% del antebrazo y la mano
    // dentro del abdomen. La prueba es la PRESION contra el abdomen, y esa no
    // sale de mas rotacion.
    // OJO: ese radio es el MINIMO de todo DISTAL_ARM (antebrazo, mano y codo) y
    // el banco no dice que punto es. Con FOREARM_NEUTRAL la mano va de canto,
    // asi que no es la palma apoyada: la captura de la app a 5 grados
    // (capturas/despues2/hombro/press-abdominal-belly-press.png) ensena el
    // antebrazo hacia delante y la mano de canto en el borde lateral del tronco.
    // Por eso la nota dice que solo se ve la rotacion casi en neutro y que la
    // palma sobre el abdomen y el empuje no se pueden posar. La maniobra y el
    // positivo del texto si tienen fuente abierta: Kilic 2024 (PMID 38075394,
    // PMC10698570, Metodos: brazo al costado, codo flexionado, la palma aprieta
    // el abdomen; positivo si se despega o si la muneca se flexiona). El
    // resumen de Barth 2006 (PMID 17027405), de donde salen las cifras, no la
    // describe.
    demo: { movementId: 'glenohumeral-internal-rotation', angleDeg: 5, highlightMuscleId: 'subscapularis', note: 'Solo se ve la rotación casi en neutro (5° de rotación interna): codo a 90°, antebrazo hacia delante y mano de canto. Falta lo que define la prueba, la palma sobre el abdomen y el empuje contra él con la muñeca recta, y no se puede posar: con más rotación interna el antebrazo y la mano se meten en el tronco.' },
    cite: [
      {
        ref: 'barth-2006',
        verified: true,
        locator: 'Resumen: belly-press 40% / 97,9%, n = 68, artroscopia',
      },
    ],
  },

  // ==================== INESTABILIDAD ANTERIOR / LABRUM ====================
  // LA POSTURA DEL PACIENTE, DICHA. El rig solo esta de pie (no hay forma de
  // tumbar el cuerpo entero) y la maniobra de la aprension dice "en supino". La
  // recolocacion y la sorpresa heredan esa postura sin nombrarla, y la nota de
  // la aprension decia "se hace en SUPINO" como si de pie fuera otra prueba.
  // Fuentes abiertas: en supino se pueden hacer las tres seguidas (Cotter 2018,
  // Sports Health, PMID 29443643, PMC6044121, texto y Tabla 1); la aprension se
  // explora en supino con la escapula apoyada en la camilla y la recolocacion
  // sigue desde ahi (James 2022, AJSM, PMID 35357960, PMC9069656, pie de la
  // Figura 1 y Metodos). La aprension sola tambien se describe de pie (Valencia
  // Mora 2017, Open Orthop J, PMID 29114336, PMC5646139: "either standing or
  // supine"; Godinho 2021, JSES Int, PMID 34223405, PMC8246003, que lo atribuye
  // a Rowe y Zarins 1981), asi que su nota no dice que de pie este mal. Lo 2004,
  // de donde salen las cifras, no da la postura en el resumen y no es de acceso
  // abierto: no se afirma cual uso. Misma formula que el femoral en prono
  // (lumbar.ts). Las tres notas conservan "misma posicion"
  // (testDemosDiffer.test.ts).
  {
    id: 'apprehension',
    name: 'Aprensión anterior',
    aka: ['Apprehension', 'Crank de aprensión'],
    region: 'shoulder',
    category: 'Inestabilidad anterior',
    target: 'Cápsula anterior / labrum anteroinferior',
    purpose: 'Detectar inestabilidad glenohumeral anterior.',
    maneuver:
      'Paciente en supino, hombro a 90° de abducción; el explorador lleva a rotación externa progresiva.',
    positive: 'Sensación de aprensión/luxación inminente (NO solo dolor).',
    metrics: {
      sensitivity: 72,
      specificity: 96,
      note: 'Lo 2004, tomando la APRENSIÓN (no el dolor) como criterio positivo.',
    },
    utility: 'rule-in',
    interpretation:
      'Con la aprensión como criterio es muy específico: un positivo confirma inestabilidad anterior. Si el criterio es "dolor", pierde especificidad.',
    // PASIVA, PERO SIN LA MANO DEL EXPLORADOR. La mano generica se opone al gesto
    // BASE, la abduccion, y caia encima del humero distal empujando hacia la
    // aduccion (captura del demo sostenido, revision del 15 nov,
    // capturas/antes/hombro/aprensión-anterior.png: guante en x 208-258,
    // y 403-425, la misma caja que el de Jobe, x 208-257, y 402-426), y la lectura
    // mandaba aplicar la fuerza ahi. La fuerza de la aprension es de rotacion
    // externa, y ningun dato la mueve: abduccion y rotacion externa resuelven al
    // mismo hueso (humerus_gh) y la abduccion no puede ser componente porque es
    // una cadena. `examinerHand: false` quita la mano y conserva la etiqueta de
    // prueba pasiva. Donde agarra el explorador no lo dice ninguna fuente
    // abierta de las revisadas, asi que la nota no lo inventa.
    //
    // LA POSTURA: supino para encadenar las tres, y de pie tambien vale para la
    // aprension sola; las fuentes, en la cabecera de esta seccion.
    demo: { examinerForce: 'applies', examinerHand: false, cannotShow: 'El rig no tiene cápsula glenohumeral ni labrum glenoideo: ninguna de las dos está en el modelo, así que no hay nada honesto que encender. Lo que ves es la posición; qué estructura cede va en el texto.', components: [{ movementId: 'elbow-flexion', angleDeg: 90 }, { movementId: 'glenohumeral-external-rotation', angleDeg: 80 }], movementId: 'glenohumeral-abduction', angleDeg: 90, note: 'Es la posición de aprensión, 90° de abducción con rotación externa. Recolocación y sorpresa se hacen en ESTA MISMA posición; lo que cambia entre las tres es la mano del explorador, no el brazo del paciente, y el modelo no la dibuja. Aquí se describe en SUPINO, con la escápula apoyada en la camilla: es la postura en la que se pueden hacer las tres seguidas. La aprensión sola también se hace de pie, que es como la muestra el modelo.' },
    cite: [{ ref: 'lo-2004', verified: true, locator: 'aprensión 72/96' }],
  },
  {
    id: 'relocation',
    name: 'Recolocación (Jobe)',
    aka: ['Relocation'],
    region: 'shoulder',
    category: 'Inestabilidad anterior',
    target: 'Cápsula anterior / labrum',
    purpose: 'Confirmar el origen anterior de la aprensión provocada.',
    maneuver:
      'Desde la posición de aprensión, el explorador aplica una fuerza posterior sobre la cabeza humeral.',
    positive: 'Alivio de la aprensión, que reaparece al retirar la fuerza (test de sorpresa).',
    metrics: {
      note: 'SIN CIFRA PROPIA, y el motivo es el hallazgo. Lo 2004 (46 pacientes, cuatro examinadores ciegos e independientes) midió las tres pruebas juntas y concluyó que el alivio de la aprensión o del dolor con la recolocación "añadía poco" al valor del conjunto: no publicó sensibilidad ni especificidad de la recolocación aislada. Lo que sí midió es la prueba de SORPRESA, que es la mejor de las tres por separado (63,9% / 98,9%), y el conjunto: con aprensión en las tres pruebas, el valor predictivo positivo fue del 93,6%. La recolocación vale como paso intermedio para llegar a la sorpresa, no como prueba con cifra propia.',
    },
    utility: 'rule-in',
    utilityBasis:
      'Lo 2004 no publicó sensibilidad ni especificidad de la recolocación aislada, así que ninguna cifra propia respalda esta etiqueta. Lo que ese estudio sí midió es la SECUENCIA: con aprensión en las tres pruebas el valor predictivo positivo fue del 93,6%, y la prueba de sorpresa por separado dio 63,9% / 98,9%. Confirma como paso de esa secuencia, no sola.',
    interpretation:
      'Es el paso intermedio de una secuencia, no una prueba independiente: su utilidad medida está en completar aprensión + recolocación + sorpresa, donde el conjunto positivo es muy específico de inestabilidad anterior traumática.',
    demo: { cannotShow: 'El rig no tiene cápsula glenohumeral ni labrum glenoideo: ninguna de las dos está en el modelo, así que no hay nada honesto que encender. Lo que ves es la posición; qué estructura cede va en el texto.', components: [{ movementId: 'elbow-flexion', angleDeg: 90 }, { movementId: 'glenohumeral-external-rotation', angleDeg: 80 }], movementId: 'glenohumeral-abduction', angleDeg: 90, note: 'Misma posición que la aprensión. Lo único que cambia es que el explorador empuja la cabeza humeral hacia atrás: por eso el brazo se ve igual. La prueba se hace en SUPINO, con la escápula apoyada en la camilla: el modelo la muestra de pie, así que mira los ángulos, no la postura global.' },
    cite: [
      {
        ref: 'lo-2004',
        verified: true,
        locator: 'Resumen: la recolocación "añade poco"; sorpresa 63,89% / 98,91%; VPP del conjunto 93,6%',
      },
    ],
  },
  {
    id: 'surprise-release',
    name: 'Sorpresa / liberación anterior',
    aka: ['Surprise', 'Anterior release'],
    region: 'shoulder',
    category: 'Inestabilidad anterior',
    target: 'Cápsula anterior / labrum',
    purpose: 'Prueba confirmatoria de inestabilidad anterior tras la recolocación.',
    maneuver:
      'En la posición de recolocación, se retira bruscamente la fuerza posterior sobre la cabeza humeral.',
    positive: 'Reaparición súbita de aprensión o dolor.',
    metrics: {
      sensitivity: 64,
      specificity: 99,
      note: 'Lo 2004; el más específico de la tríada de inestabilidad anterior.',
    },
    utility: 'rule-in',
    interpretation:
      'Especificidad muy alta: un positivo confirma inestabilidad anterior. Suele completar la tríada aprensión → recolocación → sorpresa.',
    demo: { cannotShow: 'El rig no tiene cápsula glenohumeral ni labrum glenoideo: ninguna de las dos está en el modelo, así que no hay nada honesto que encender. Lo que ves es la posición; qué estructura cede va en el texto.', components: [{ movementId: 'elbow-flexion', angleDeg: 90 }, { movementId: 'glenohumeral-external-rotation', angleDeg: 80 }], movementId: 'glenohumeral-abduction', angleDeg: 90, note: 'Misma posición que la aprensión y la recolocación. Lo que cambia es que se retira bruscamente la fuerza posterior; el brazo no se mueve. La prueba se hace en SUPINO, desde la recolocación: el modelo la muestra de pie, así que mira los ángulos, no la postura global.' },
    cite: [{ ref: 'lo-2004', verified: true, locator: 'sorpresa 64/99' }],
  },

  // ================= LESIÓN LABRAL SUPERIOR (SLAP) / BÍCEPS =================
  {
    id: 'obrien',
    name: 'Compresión activa (O’Brien)',
    aka: ["O'Brien", 'Active compression'],
    region: 'shoulder',
    category: 'Lesión labral superior (SLAP) / bíceps',
    target: 'Labrum superior (SLAP) / articulación acromioclavicular',
    purpose: 'Orientar hacia lesión SLAP o patología acromioclavicular.',
    maneuver:
      'Hombro a 90° de flexión con 10-15° de aducción; se resiste la flexión primero en rotación interna (pulgar abajo) y luego en rotación externa (palma arriba).',
    positive:
      'Dolor profundo en rotación interna que MEJORA en rotación externa (SLAP); dolor superior/acromioclavicular orienta a la AC.',
    metrics: {
      sensitivity: 59,
      specificity: 57,
      note: 'Hegedus 2012: 59/57. La descripción original (100/99) no se ha reproducido: usar en clúster.',
    },
    utility: 'weak',
    interpretation:
      'Aislado tiene baja precisión: interprétalo dentro de un clúster de tests labrales, no como prueba única.',
    // LO QUE EL MODELO NO HACE, DICHO COMO TAL. La nota decia "Con 10-15° de
    // aduccion" y el panel la imprime tras "En el modelo:", asi que prometia la
    // aduccion y los dos tiempos, y no hace ninguna de las dos cosas: no existe
    // aduccion horizontal de hombro (solo abduccion y flexion como cadenas y las
    // dos rotaciones en boneMap) y un componente tiene que ser 'joint'; y el
    // bucle (src/lib/demoTimeline.ts, loopAt) tiene una sola espera, asi que no
    // hay segundo tiempo. La fuente, O'Brien 1998 (PMID 9784804, resumen): de
    // pie, flexion a 90 con el codo extendido, 10-15 grados de aduccion medial
    // al plano sagital y rotacion interna con el pulgar abajo; el explorador,
    // detras, aplica una fuerza uniforme hacia abajo; con el brazo igual, la
    // palma se supina del todo y se repite. "Sostiene" y no "resiste" para el
    // paciente: encaja con la fuente y con el bloque de prueba resistida del
    // escenario. "Tiempo" y no "fase": la regla del arco ya rotula fases. La
    // mano que se dibuja (encima del brazo, empujando hacia abajo) es la de la
    // fuente (capturas/despues2/hombro/compresión-activa-o-brien.png).
    demo: { cannotShow: 'Ni el labrum superior ni la cápsula acromioclavicular están en el rig. Qué valora cada uno de los dos tiempos va en el texto.', components: [{ movementId: 'glenohumeral-internal-rotation', angleDeg: 60 }, { movementId: 'elbow-pronation', angleDeg: 80 }], movementId: 'glenohumeral-flexion', angleDeg: 90, examinerForce: 'resists', note: 'Faltan los 10-15° de aducción hacia la línea media, porque no hay aducción horizontal: el brazo sube recto hacia delante. Se ve solo el primer tiempo, con el pulgar abajo; el segundo se repite sin mover el brazo, con la palma arriba. En los dos, el explorador empuja el brazo hacia abajo y el paciente sostiene la posición.' },
    cite: [{ ref: 'hegedus-2012', verified: true, locator: 'O’Brien 59/57' }],
  },
  {
    id: 'speed',
    name: 'Test de Speed',
    aka: ['Speed', 'Palm-up'],
    region: 'shoulder',
    category: 'Lesión labral superior (SLAP) / bíceps',
    target: 'Tendón largo del bíceps / labrum superior',
    purpose: 'Provocar el dolor de la porción larga del bíceps o del labrum superior.',
    maneuver:
      'Hombro a ~90° de flexión, codo extendido y antebrazo supinado; el explorador resiste la flexión del hombro.',
    positive: 'Dolor en la corredera bicipital (cara anterior del hombro).',
    metrics: {
      sensitivity: 65,
      specificity: 61,
      note: 'Hegedus 2012: 65/61. Precisión baja en ambos sentidos (LR+ ~1.7).',
    },
    utility: 'weak',
    interpretation:
      'Precisión baja aislado: ni un positivo ni un negativo cambian mucho la probabilidad. Aporta más como parte de un clúster bicipital/labral.',
    demo: { highlightStructureIds: ['biceps-long-head-tendon'], cannotShow: 'Del objetivo doble solo se puede encender la mitad: el tendón de la porción larga del bíceps sí está en el rig, el labrum superior no.', components: [{ movementId: 'elbow-supination', angleDeg: 80 }], movementId: 'glenohumeral-flexion', angleDeg: 90, examinerForce: 'resists', note: 'Codo extendido y antebrazo supinado; el explorador resiste la flexión del hombro.' },
    cite: [{ ref: 'hegedus-2012', verified: true, locator: 'Speed 65/61' }],
  },

  // ====================== ARTICULACIÓN ACROMIOCLAVICULAR ======================
  {
    id: 'cross-body-adduction',
    name: 'Aducción cruzada',
    aka: ['Cross-body adduction', 'Scarf test'],
    region: 'shoulder',
    category: 'Articulación acromioclavicular',
    target: 'Articulación acromioclavicular',
    purpose: 'Estresar la articulación acromioclavicular.',
    maneuver:
      'Hombro a 90° de flexión; el explorador lleva el brazo en aducción horizontal máxima cruzando el cuerpo.',
    positive: 'Dolor localizado en la articulación acromioclavicular.',
    metrics: {
      sensitivity: 77,
      note: 'Chronopoulos 2004 (35 pacientes operados de resección de clavícula distal, casos y controles) publica la sensibilidad del 77%, la más alta de las tres pruebas acromioclaviculares. El 79% que suele acompañarla NO es la especificidad: es la EXACTITUD global de la prueba, y son cosas distintas. La especificidad de esta prueba no consta en esa fuente. Lo que sí consta cambia cómo se usa: el valor predictivo positivo fue MENOR del 30% en las tres pruebas y el negativo mayor del 94%. Es decir, sirve para descartar, no para confirmar; y como es un diseño de casos y controles, esos valores predictivos dependen de una prevalencia artificial.',
    },
    utility: 'rule-out',
    utilityBasis:
      'La etiqueta no viene de la sensibilidad (77%, que no llega al umbral de una prueba de descarte) sino del valor predictivo negativo de la misma fuente, por encima del 94%. Chronopoulos no publica la especificidad de esta prueba.',
    interpretation:
      'Un negativo deja la articulación acromioclavicular prácticamente fuera (VPN > 94%). Un positivo NO la confirma: con un VPP por debajo del 30%, el dolor a la aducción cruzada es frecuente sin lesión acromioclavicular. La localización del dolor en la propia AC, y no en el subacromial, es lo que aporta valor.',
    noDemo:
      'La aducción horizontal cruzando el pecho no existe como movimiento en el rig (solo hay abducción, flexión y las dos rotaciones), y forzarla metería el brazo dentro del tórax.',
    cite: [
      {
        ref: 'chronopoulos-2004',
        verified: true,
        locator: 'Resumen: aducción cruzada sens 77%, exactitud 79%; VPP < 30% y VPN > 94% en las tres pruebas',
      },
    ],
  },
];

export const SHOULDER_ORTHOPEDIC_TESTS: OrthopedicTest[] = tests;
