// src/data/orthopedicTests/hip.ts
//
// Orthopedic special tests for the HIP. Analogue of ./knee.ts.
//
// HONESTY: sensitivity/specificity vary widely by study, degree of pathology
// and positivity criterion. Every metric set carries verified:false and points
// to a source until the exact numbers are checked against the primary study.
//
// ESTADO DE LA VERIFICACION (2026-11-04). Las ocho pruebas citaban un manual y
// nada mas: cero PubMed, cero forma de comprobar la cifra. Cuatro ya apuntan al
// ESTUDIO PRIMARIO, y la cifra que ese estudio respalda esta en su resumen
// publico, asi que cualquiera puede comprobarla sin acceso de biblioteca:
//
//   hip-trendelenburg   Bird 2001       72,7% / 76,9%   (las DOS cifras)
//   hip-fadir           Reiman 2015     sensibilidad agrupada 0,94
//   hip-resisted-flexion Maslowski 2010 especificidad 0,32
//   hip-faber           Maslowski 2010  sensibilidad 0,82 (sin especificidad)
//   hip-scour           Wong 2022       rangos 50-100% / 29%, SIN cifra unica
//   hip-log-roll        Wong 2022       no existe cifra publicada
//
// Cuando una fuente respalda solo UNA de las dos cifras, el `locator` lo dice y
// la otra se queda citando el manual sin verificar: el aviso del bloque de
// probabilidad post-test salta si CUALQUIERA de las fuentes esta sin comprobar,
// no solo si lo estan todas.
//
// Y tres pruebas DEJARON DE ENSENAR NUMEROS (2026-11-04), porque los que
// mostraban no los dice ninguna fuente que se pueda abrir:
//
//   hip-scour      62% / 75%  ->  nota con el rango publicado 50-100% / 29%
//   hip-log-roll   30% / 85%  ->  nota: no existe estudio que lo mida
//   hip-faber      ... / 18%  ->  se queda la sensibilidad 0,82, verificada
//
// El dato que lo decide: en el unico estudio primario de la cadera con bloqueo
// intraarticular como patron de referencia (Maslowski, 50 pacientes), la prueba
// MAS especifica de las cuatro llegaba a 0,32. Una especificidad del 75% o del
// 85% no es una estimacion dispar, es una cifra que contradice la unica medida
// que hay.
//
// Sigue sin fuente primaria Thomas, que es prueba de longitud muscular y no
// lleva cifras. Ober cita Willett 2016 (PMID 26755689), estudio anatomico en
// cadaver sin cifras de exactitud: pone en duda que la banda iliotibial limite
// la aduccion en la prueba (2026-11-15).
//
// DEMO: una prueba posa un movimiento de cadera accionable (hipRom.ts), con
// componentes cuando la maniobra los pide, y una nota con lo que el modelo no
// hace; o lleva `noDemo` con la razon escrita (FADIR, FABER, Ober y
// Trendelenburg). Un componente en el MISMO hueso que la base se compone encima
// de ella (RigModel, `applyComponents`: solo devuelve a reposo un hueso que
// nadie ha tocado y gira con rotateOnAxis sobre la pose de la base, como el
// pivot shift y McMurray en shin_flex), asi que compartir `femur_base` no
// impide sumar flexion, aduccion y rotacion. Lo que falta en FADIR y FABER es
// MEDIR la pose compuesta (ver cada una).
// Revision del 15 nov, demo por demo contra su maniobra y su captura en la
// pose sostenida (capturas/antes/cadera/ del scratchpad de esa revision): Ober
// y Trendelenburg ensenaban otra cosa que la prueba, Thomas y el scour dejaban
// recta una rodilla que la maniobra dobla. Segunda pasada (23 nov) con las
// capturas de capturas/despues2/cadera/, tomadas despues de ae0c5e5 (las mallas
// con piel ya no desaparecen al acercar la camara).

import type { OrthopedicTest } from '../../types/orthopedicTest';

export const HIP_ORTHOPEDIC_TESTS: OrthopedicTest[] = [
  /* ======================= Impingement / labrum ======================= */
  {
    id: 'hip-fadir',
    name: 'FADIR (pinzamiento anterior)',
    aka: ['Anterior impingement test', 'Flexion-Adduction-Internal Rotation'],
    region: 'hip',
    category: 'Pinzamiento / labrum',
    target: 'Pinzamiento femoroacetabular (FAI) y labrum anterosuperior',
    purpose: 'Detectar pinzamiento anterior y lesión del labrum.',
    // DOS VARIANTES, Y LA CIFRA ES DE UNA (segunda pasada, 23 nov). Palsson
    // 2020 (PMC7511272, leyenda de la Fig. 1, texto completo abierto): su FADIR
    // lleva la cadera a flexion MAXIMA con rotacion interna y aduccion (Fig.
    // 1b), y la version a 90 grados es otra prueba, la de pinzamiento anterior
    // (AIMT, Fig. 1a). Resumen: 80% de sensibilidad en las dos, especificidad
    // 26% (AIMT) y 25% (FADIR). Wong 2022 (PMC9076795, apartado FADDIR) dice
    // que a 90 grados a veces se le llama prueba de pinzamiento anterior, y el
    // resumen de Reiman (el 94%) no da el grado. La maniobra decia 90, que es
    // el AIMT, al lado de la especificidad del FADIR en flexion maxima: ahora
    // nombra las dos, y cual ensenar queda para criterio clinico.
    //
    // LAS CUENTAS DE LA NOTA, contra la fuente (23 nov). Palsson incluyo 81
    // pacientes, pero la exactitud se calculo en 63 de ellos, 69 caderas
    // (PMC7511272, texto completo, apartado de resultados y Tabla 4; Europe
    // PMC fullTextXML). La Tabla 4 da al FADIR 24% (9-38) de especificidad y el
    // resumen 25%: se queda la del resumen. Y el resumen de Reiman 2015 (PMID
    // 25515771, E-utilities) da la sensibilidad agrupada "ranging from 0.94
    // (95% CI 0.90 to 0.97) to 0.99": la ficha usa el extremo bajo y lo dice.
    maneuver:
      'En decúbito supino, se flexiona la cadera (al máximo, o hasta 90° en la variante que a veces se llama prueba de pinzamiento anterior) y se añaden aducción y rotación interna.',
    positive: 'Reproducción del dolor inguinal característico del paciente (con o sin chasquido).',
    metrics: {
      sensitivity: 94,
      specificity: 25,
      note: 'Dos estudios distintos, y conviene saberlo: la sensibilidad 0,94 (IC 95% 0,90-0,97) es el valor más bajo de la agrupada del metanálisis de Reiman, que según el análisis llega a 0,99; la especificidad 25% es la de Pålsson (69 caderas de 63 pacientes, bloqueo + imagen), donde la cadera se llevaba a flexión máxima y la sensibilidad fue del 80%. En ese mismo estudio, la variante a 90° (prueba de pinzamiento anterior) dio 80% y 26%. El positivo aislado no confirma nada.',
    },
    utility: 'rule-out',
    interpretation:
      'Un FADIR NEGATIVO hace poco probable el pinzamiento/labrum (SnNout). Un positivo, por su baja especificidad, obliga a confirmar con imagen o cluster.',
    pearl:
      'Muy sensible: su valor está en el resultado negativo. El positivo aislado no confirma FAI.',
    // SIN DEMO, Y ESTA ES LA RAZON (segunda pasada, 23 nov).
    //
    // La razon que habia era falsa: decia que un componente que repite el
    // hueso de la base lo sobreescribe y que el rig posa un movimiento de
    // cadera cada vez. RigModel hace lo contrario (`applyComponents` gira con
    // rotateOnAxis encima de la base; el pivot shift y McMurray ya lo publican
    // en shin_flex, knee.ts), asi que flexion, aduccion y rotacion interna en
    // `femur_base` se pueden sumar.
    //
    // Lo que falta es MEDIR la pose compuesta, y ningun banco la mira.
    // `npm run audit-demo-path` solo cuenta el antebrazo y la mano del lado que
    // se mueve dentro del tronco (rodajas de y 0,98 a 1,46 m). Medido el 23 nov
    // sobre el scour, que tambien es pierna con componente: 0,0% en los cuatro
    // ordenes y radio minimo 0,99 en todo el trazo, el brazo colgando al
    // costado (en un gesto de pierna el banco no aplica la holgura del brazo).
    // No ve si el muslo entra en el abdomen o en la pierna de apoyo, ni la mano
    // del propio paciente, que en la captura del scour, de perfil, queda
    // delante de la rodilla
    // (capturas/despues2/cadera/prueba-de-fricción-cuadrante-scour.png); y
    // measure-limb-collision solo lee MOVE, DEG y SIDE, sin componentes.
    // Ademas el angulo de la base es la pregunta clinica abierta: flexion
    // maxima (el FADIR de Palsson) o 90 (su prueba de pinzamiento anterior).
    //
    // Receta medida sobre el codigo por el verificador (J23), para cuando haya
    // banco: base 'hip-flexion' (con la rotacion de base, a 90 grados el giro
    // se vuelve aduccion y el femur no rota); componentes 'hip-adduction' ANTES
    // que 'hip-internal-rotation' (rotateOnAxis multiplica por la derecha: al
    // reves, el eje de la aduccion rueda con la diafisis) y 'knee-flexion' (un
    // componente no recibe KNEE_AT_90, que no es cero clinico, y con la rodilla
    // recta el giro del femur no se ve); orden 'proportional' (con la base
    // primero, el primer tramo es la pierna estirada a 90, la pose del scour de
    // antes); `examinerForce: 'applies'` con `examinerHand: false`. La camara
    // abre de perfil (plano de la base), donde la aduccion y la rotacion van
    // hacia la profundidad: la nota tendria que pedir girar la vista.
    //
    // Historia medida: el demo que hubo era la rotacion interna sola a 30
    // grados, y quedaba a 1,3 cm de la pose de "rotacion interna pasiva en
    // neutro" (`npm run measure-test-poses`): reproducia la prueba de al lado.
    noDemo:
      'Suma flexión, aducción y rotación interna en la misma cadera. El modelo puede componer los tres giros, pero esta postura combinada aún no está comprobada en el rig y no se enseña sin medirla.',
    cite: [
      {
        ref: 'reiman-2015',
        verified: true,
        locator: 'Sensibilidad agrupada 0,94 (IC 95% 0,90-0,97), en el resumen',
      },
      {
        ref: 'palsson-2020',
        verified: true,
        locator: 'Especificidad 25% (sensibilidad 80%), frente a bloqueo + imagen',
      },
    ],
  },
  // SE VALORA, NO SE MIDE, Y EN PRONO (segunda pasada, 23 nov).
  //
  // Palsson 2020 (PMC7511272, Metodos, "Passive ROM", texto completo abierto):
  // la rotacion interna con la cadera neutra se exploro SOLO en prono, y cada
  // resultado se clasifico a juicio clinico como negativo (rango completo, con
  // o sin dolor) o positivo (rango disminuido, con o sin dolor). La Discusion
  // admite que el rango solo se valoro de forma dicotomica, y el texto no
  // describe comparacion con el otro lado. Por eso aqui se dice "se valora" y
  // no "se mide", y no se pide el lado sano.
  //
  // Y "la unica maniobra de la cadera con especificidad alta" era falso: en la
  // misma fuente la abduccion y la rotacion externa a 90 de flexion dan 79%, y
  // Trendelenburg tiene 77% en este fichero. Lo que dice Palsson es que fue la
  // mas especifica de sus pruebas (94%, por delante de ese 79%; las de
  // pinzamiento, de 24 a 51%). Esa frase va en la perla y no en `purpose`, que
  // se ve en el modo examen (OrthopedicTestsPanel) y revelaria la respuesta.
  {
    id: 'hip-ir-neutral',
    name: 'Rotación interna pasiva en neutro',
    aka: ['Passive hip internal rotation', 'IR in neutral hip position'],
    region: 'hip',
    category: 'Pinzamiento / labrum',
    target: 'Síndrome de pinzamiento femoroacetabular (FAI)',
    purpose:
      'Valorar si la rotación interna de la cadera en posición neutra está disminuida ante la sospecha de pinzamiento femoroacetabular: se valora el rango, no se busca el dolor.',
    maneuver:
      'En decúbito PRONO con la cadera en posición NEUTRA (sin flexión), se rota el muslo pasivamente hacia dentro y se valora si el rango es completo o está disminuido.',
    positive:
      'Rotación interna disminuida, con o sin dolor. Si el rango es completo, aunque duela, la prueba es negativa.',
    metrics: {
      sensitivity: 29,
      specificity: 94,
      note: 'Las dos cifras del mismo estudio (Pålsson, 69 caderas de 63 pacientes), con tres criterios simultáneos como patrón de referencia: síntomas, morfología CAM o pincer en imagen, y respuesta al bloqueo intraarticular. Es el espejo exacto del FADIR: donde aquél sólo sirve para descartar, ésta sirve para confirmar.',
    },
    utility: 'rule-in',
    interpretation:
      'Una rotación interna restringida en neutro apoya con fuerza el pinzamiento (SpPin). Un rango normal NO lo descarta: la sensibilidad es del 29%.',
    pearl:
      'Se valora el rango, no se provoca el dolor. En Pålsson fue la más específica de las pruebas cuya exactitud se calculó, pero el rango se clasificó a juicio del explorador, sin medir grados, y la fuente no describe comparación con el otro lado. Emparejada con el FADIR cubre las dos direcciones: FADIR negativo descarta, rotación interna disminuida confirma.',
    demo: {
      cannotShow:
        'El labrum acetabular y el cartílago de la cadera no están en el rig. Lo que la prueba valora es la amplitud de rotación interna, y eso es lo que el modelo hace.',
      movementId: 'hip-internal-rotation',
      angleDeg: 35,
      side: 'R',
      // DE PIE Y CON LA RODILLA A 90, Y LA NOTA LO TIENE QUE DECIR.
      // 'hip-internal-rotation' lleva la postura KNEE_AT_90 (boneMap), aplicada
      // en todo angulo, y durante el demo el margen pasa a la ficha de la
      // maniobra: la "Posicion de exploracion", donde vive la razon de la
      // rodilla, no sale, asi que esta nota es lo unico que la explica. Se lee
      // con y sin el "En el modelo:" que antepone el panel (RhythmReadout la
      // imprime sola). Direccion medida y registrada: a 35 grados el talon se
      // abre 22,5 cm hacia fuera (movementDirection.test.ts). Prono con la
      // cadera a 0 y la rodilla a 90 es la posicion habitual de esta medida
      // (Figueroa-Mayordomo 2026, PMC13267181, Metodos 2.4.3), y Palsson la
      // exploro en prono. Captura de la pose sostenida:
      // capturas/despues2/cadera/rotación-interna-pasiva-en-neutro.png.
      note: 'Está de pie, con la cadera en neutro y la rodilla a 90°: son los mismos ángulos de cadera y rodilla que en decúbito prono, que es como se hace la prueba, así que mira los ángulos y no la postura global. La pierna es la aguja que marca el giro: al rotar la cadera hacia dentro, el pie se va hacia fuera.',
    },
    cite: [
      {
        ref: 'palsson-2020',
        verified: true,
        locator: 'Rotación interna en neutro: sensibilidad 29%, especificidad 94%',
      },
    ],
  },
  {
    id: 'hip-faber',
    name: 'FABER (Patrick)',
    aka: ['Figura de 4', 'Flexion-Abduction-External Rotation'],
    region: 'hip',
    category: 'Movilidad y dolor articular',
    target: 'Patología intraarticular de cadera y articulación sacroilíaca',
    purpose: 'Diferenciar dolor de origen coxofemoral, sacroilíaco o de partes blandas.',
    maneuver:
      'En decúbito supino, el tobillo del lado explorado se apoya sobre la rodilla contraria (posición en 4); se presiona la rodilla y la EIAS contralateral hacia la camilla.',
    positive:
      'Dolor inguinal (origen coxofemoral) o dolor glúteo/posterior (sacroilíaca); rigidez que impide descender la rodilla indica restricción de cadera.',
    metrics: {
      sensitivity: 82,
      note: 'Sensibilidad 0,82 (IC 95% 0,57-0,96) frente a bloqueo intraarticular (Maslowski, 50 pacientes). SIN cifra de especificidad: ese estudio no la publica para el FABER, y dice que la MÁS específica de sus cuatro maniobras llegaba sólo a 0,32. Las revisiones dan un rango de 18-100%, demasiado ancho para enseñar un número. Localizar el dolor (inguinal vs posterior) aporta más que el sí/no.',
    },
    utility: 'balanced',
    utilityBasis:
      'Solo existe una de las dos cifras: Maslowski publica 0,82 de sensibilidad y ninguna especificidad, y las revisiones dan un rango de 18 a 100%, demasiado ancho para publicar un número. La etiqueta describe cómo se usa, localizando el origen del dolor, y no un perfil de dos ejes medido.',
    interpretation:
      'Úsalo para LOCALIZAR el origen del dolor más que como prueba binaria; combínalo con FADIR y el cuadro clínico.',
    // SIN DEMO, Y ESTA ES LA RAZON (segunda pasada, 23 nov).
    //
    // FABER es la figura de 4: flexion, abduccion y rotacion externa juntas,
    // con el pie del lado explorado justo por encima de la rodilla contraria
    // (Palsson 2020, PMC7511272, leyenda de la Fig. 1c). La razon que habia,
    // que los tres giros comparten `femur_base` y solo se puede posar uno, era
    // falsa: un componente en el hueso de la base se compone encima (ver
    // FADIR). Lo que falta es medirla, y aqui pesa mas: la figura de 4 apoya
    // una pierna SOBRE la otra, y ningun banco mide el contacto entre las dos
    // (audit-demo-path solo mira el antebrazo y la mano dentro del tronco;
    // measure-limb-collision no acepta componentes). Ademas el modelo esta de
    // pie, sobre la pierna en la que tendria que apoyarse el tobillo.
    //
    // Historia medida: lo que habia era la rotacion externa sola a 45 grados,
    // la pose del log roll, otra prueba de esta lista, a 1,3 cm
    // (`npm run measure-test-poses`). Una pierna en rotacion externa no es la
    // figura de 4, y con el rotulo "FABER (Patrick)" encima ensenaba la prueba
    // equivocada.
    noDemo:
      'Suma flexión, abducción y rotación externa en la misma cadera, con el tobillo apoyado sobre la rodilla contraria. El modelo puede componer los giros de la cadera, pero esta postura, con una pierna sobre la otra, aún no está comprobada en el rig y no se enseña sin medirla.',
    cite: [
      {
        ref: 'maslowski-2010',
        verified: true,
        locator: 'Sensibilidad 0,82 (IC 95% 0,57-0,96) frente a bloqueo intraarticular',
      },
      { ref: 'wong-2022', verified: true, locator: 'Rango publicado: 41-97% / 18-100%' },
    ],
  },
  {
    id: 'hip-scour',
    name: 'Prueba de fricción / cuadrante (scour)',
    aka: ['Hip quadrant', 'Scour test'],
    region: 'hip',
    category: 'Movilidad y dolor articular',
    target: 'Superficie articular / labrum / artrosis',
    purpose: 'Provocar el dolor articular recorriendo el borde acetabular con carga axial.',
    maneuver:
      'En supino, cadera y rodilla en flexión; se aplica carga axial por el fémur mientras se describe un arco de aducción-abducción con rotación.',
    positive: 'Dolor, resalte o crepitación reproducibles durante el arco.',
    metrics: {
      note: 'SIN cifras. Las que circulan (62% / 75%) no las publica ninguna fuente que se pueda abrir. Lo que sí está publicado son rangos: sensibilidad 50-100% y especificidad en torno al 29% (Wong 2022, texto completo abierto). Una especificidad del 75% además contradice el único estudio primario con bloqueo intraarticular, donde la prueba MÁS específica de la cadera llegaba a 0,32.',
    },
    utility: 'balanced',
    utilityBasis:
      'Sin cifras propias que se puedan abrir: lo publicado son rangos, sensibilidad de 50 a 100% y especificidad en torno al 29%. La etiqueta describe el uso que propone la fuente, provocar el dolor articular dentro de un conjunto de maniobras, y no un perfil medido.',
    interpretation:
      'Un arco doloroso o con resalte apoya patología intraarticular; no descarta por sí solo.',
    // LA RODILLA VA DOBLADA, COMO PIDE LA MANIOBRA (revision del 15 nov).
    //
    // La maniobra es "cadera y rodilla en flexion", y el demo posaba la flexion
    // de cadera sola: a 90 grados `hipDeepFlexionKnee` (boneMap) vale 0, asi
    // que la pierna quedaba recta y horizontal, una elevacion de la pierna recta
    // y la misma pose que el demo del miotoma L2. Captura de la pose sostenida:
    // capturas/antes/cadera/prueba-de-fricción-cuadrante-scour.png. La rodilla
    // entra como componente ('knee-flexion' sobre shin_flex, otro hueso que el
    // de la base): con la cadera a 90 su acoplamiento es 0 y la rodilla queda
    // en el angulo del componente. Precio, el mismo que KNEE_AT_90 en las
    // rotaciones de cadera: `applyComponents` (RigModel) no ejecuta
    // acoplamientos, asi que la rotula no desliza. MEDIDO en el banco de render
    // (ver el demo de Thomas): 1,52% de pixeles que no son piel a menos de 9 cm
    // de la rodilla, de perfil y sin conectivo, frente al 1,84% de la flexion
    // de rodilla de base a 90. Y la mano del propio paciente, con los brazos
    // adelantados 35 grados como en todo gesto de pierna, queda sobre la
    // rodilla: medido de vertice a vertice de piel, la mano y el antebrazo
    // quedan como minimo a 2,5 cm de la pierna y ninguno a menos de 1 cm (una
    // faceta grande podria cruzar entre vertices; no se ha medido por
    // superficie). En el perfil tapa algo de la rodilla. Captura en la
    // aplicacion de la pose sostenida (23 nov,
    // capturas/despues2/cadera/prueba-de-fricción-cuadrante-scour.png, 90
    // grados): rodilla a 90, la mano del paciente delante de la rodilla en la
    // proyeccion de perfil (la distancia es la medida de arriba) y 0 pixeles
    // del guante del explorador (recuento por color; con la mano generica
    // asomaban 63 px hundidos en el muslo, segun el verificador de U38). El 90
    // de rodilla es valor de demostracion: ni Wong 2022
    // (PMC9076795) ni Cibulka 2009 (PMC3963282, PMID 19352008) dan la posicion
    // de la rodilla.
    //
    // LA MANO NO SE DIBUJA (`examinerHand: false`). La mano generica se apoya
    // al 82% del segmento del gesto base y empuja hacia el reposo: aqui caia
    // encima del muslo distal, de traves al femur (guante en la captura de
    // capturas/antes/cadera/). La carga de la prueba va por el eje largo del
    // femur (Cibulka 2009, metodo del Scour: "long-axis compression through
    // the femur"). La prueba sigue siendo pasiva, y eso lo dice
    // `examinerForce`.
    //
    // Sin `order`: con el de por defecto la pierna sube recta hasta 90 durante
    // el 61% de la ida (3,46 de 5,71 s, `strokePlan`) y despues dobla la
    // rodilla. Cambiarlo es una decision clinica que queda abierta.
    demo: {
      examinerForce: 'applies',
      examinerHand: false,
      cannotShow:
        'La superficie articular y el labrum no están como malla propia en el rig. Se demuestra solo la flexión de cadera y de rodilla; el arco, la carga axial y el hallazgo van en el texto.',
      movementId: 'hip-flexion',
      angleDeg: 90,
      side: 'R',
      components: [{ movementId: 'knee-flexion', angleDeg: 90 }],
      note: 'Está de pie, con la cadera y la rodilla a 90°; la prueba se hace en supino. No hace el arco de aducción a abducción con rotación ni la carga axial, que va a lo largo del fémur: por eso no se dibuja la mano del explorador, que aquí empujaría el muslo de través.',
    },
    cite: [
      { ref: 'wong-2022', verified: true, locator: 'Scour: sensibilidad 50-100%, especificidad 29%' },
      { ref: 'maslowski-2010', verified: true, locator: 'Techo de especificidad en la cadera: 0,32' },
    ],
  },
  {
    id: 'hip-log-roll',
    name: 'Log roll (rodamiento)',
    // SIN "Freiberg test" COMO ALIAS (segunda pasada, 23 nov). Wilson y
    // Furukawa 2014 (Am Fam Physician, PMID 24444505, tabla 1 y figura 5, segun
    // el verificador de U36, que leyo el HTML) lo dan como otro nombre del log
    // roll, con el sindrome piriforme en su diagnostico diferencial; pero en la
    // literatura del piriforme el signo de Freiberg es otra maniobra (Cass 2015,
    // PMID 25574881, resumen leido por E-utilities: entre los hallazgos que
    // reproducen el piriforme; y, segun el mismo verificador, la tabla de
    // pruebas de HSS J 2025, PMC12664778, lo define como rotacion interna
    // FORZADA de la cadera extendida que busca dolor gluteo o ciatico).
    // Esta ficha busca el origen intraarticular (Wong 2022): con el alias,
    // quien buscaba "Freiberg" llegaba aqui con otra diana. No reponerlo sin
    // decidir antes que prueba se ensena.
    aka: ['Passive rotation test'],
    region: 'hip',
    category: 'Pinzamiento / labrum',
    target: 'Origen intraarticular del dolor',
    // "Una de las mas especificas", no "la mas especifica": es lo que dice la
    // fuente citada (Wong 2022, PMC9076795, examen en supino: "one of the most
    // specific tests for hip pathology") y lo que ya dicen el locator de la
    // cita y la nota de wong-2022 en references.ts. El superlativo viene del
    // articulo que Wong cita (Byrd 2007, PMC2953301), un comentario clinico sin
    // cifras, segun el verificador de U36, que lo leyo solo a traves de un
    // resumen. "Dentro del acetabulo" y "musculos vecinos" son las palabras de
    // Wong, y su "por eso" justifica empezar el examen con esta prueba, no su
    // especificidad: de ahi que no haya "porque".
    purpose:
      'Aislar la articulación coxofemoral: hace rodar la cabeza del fémur dentro del acetábulo sin apenas cargar ni estirar los músculos vecinos, y se ha descrito como una de las pruebas más específicas de patología de la cadera.',
    maneuver:
      'En supino con la pierna extendida y relajada, se rota pasivamente el muslo hacia dentro y hacia fuera ("rodando" el fémur).',
    positive: 'Dolor, chasquido o asimetría del rango de rotación respecto al lado sano.',
    metrics: {
      note: 'SIN cifras: no hay estudio que publique sensibilidad ni especificidad del log roll. La fama de prueba "muy específica" viene de su MECÁNICA (es la única que mueve el fémur bajo el acetábulo sin tensar partes blandas), y así la recoge la revisión de Wong 2022, que lo dice con palabras y no con números. Las cifras que circulan (30% / 85%) no tienen fuente localizable.',
    },
    utility: 'rule-in',
    utilityBasis:
      'No hay estudio que publique sensibilidad ni especificidad del log roll, así que la etiqueta no sale de una cifra: sale de la MECÁNICA, que es como la recoge la revisión de Wong 2022, con palabras y no con números. Es la única maniobra que mueve el fémur bajo el acetábulo sin tensar partes blandas, de modo que un positivo señala el interior de la articulación.',
    interpretation:
      'Al mover SOLO la cadera, un positivo apunta con fuerza al interior de la articulación (SpPin).',
    // LA NOTA DICE POR QUE LA RODILLA VA DOBLADA (revision del 15 nov).
    //
    // 'hip-external-rotation' lleva la postura KNEE_AT_90 (boneMap), aplicada
    // en todo angulo, 0 incluido: la pierna hace de aguja del giro. La prueba
    // rueda la pierna EXTENDIDA en supino (Wong 2022, PMC9076795, Supine Exam:
    // el miembro se rueda adelante y atras, con la mano del explorador en el
    // muslo; y en su variante dial, rodillas en extension completa). En la
    // captura (capturas/antes/cadera/log-roll-rodamiento.png) la rodilla
    // derecha esta doblada, y durante el demo el margen (RhythmReadout,
    // `demoSection`) no ensena la "Posicion de exploracion", donde vive esa
    // razon: solo se lee esta nota.
    // No hay arreglo con componentes: un componente no puede repetir shin_flex,
    // que la postura ya sostiene (demoComponents.test.ts).
    demo: {
      cannotShow:
        'La prueba busca un origen intraarticular, y ni labrum ni cartílago están en el rig. Lo que se demuestra es la rotación pasiva sin mover la pelvis.',
      movementId: 'hip-external-rotation',
      angleDeg: 40,
      side: 'R',
      note: 'Está de pie, con la rodilla doblada a 90° para que la pierna haga de aguja, como en toda rotación de cadera que se enseña aquí: con la rodilla recta, el giro del fémur no se aprecia en pantalla. La prueba se hace en supino y sin doblar la rodilla: con la pierna EXTENDIDA y relajada, se rueda el miembro entero desde el muslo, hacia dentro y hacia fuera. Solo se muestra la rotación externa.',
    },
    cite: [
      {
        ref: 'wong-2022',
        verified: true,
        locator: 'Descrita como una de las más específicas, SIN cifras publicadas',
      },
    ],
  },
  /* ======================= Muscle length ======================= */
  {
    id: 'hip-thomas',
    name: 'Prueba de Thomas',
    aka: ['Thomas test'],
    region: 'hip',
    category: 'Acortamiento muscular',
    target: 'Retracción del iliopsoas y del recto femoral',
    purpose: 'Detectar acortamiento de los flexores de cadera.',
    maneuver:
      'En supino al borde de la camilla, el paciente abraza una rodilla contra el pecho para aplanar la lordosis; se observa el muslo contralateral.',
    positive:
      'El muslo explorado se eleva de la camilla (iliopsoas corto). Si además la rodilla se extiende, sugiere acortamiento del recto femoral.',
    metrics: {
      note: 'Prueba de longitud muscular; la exactitud diagnóstica no suele expresarse en sens/espec.',
    },
    utility: 'balanced',
    utilityBasis:
      'Es una prueba de LONGITUD muscular, no de diagnóstico: su exactitud no se expresa en sensibilidad y especificidad, así que ninguna cifra respalda la etiqueta. Lo que informa es el balance flexor de la cadera.',
    interpretation:
      'Valora el balance flexor: un iliopsoas corto favorece la anteversión pélvica y limita la extensión de cadera.',
    // LA RODILLA VA DOBLADA DE COMPONENTE Y LA CADERA SIGUE DE BASE (revision
    // del 15 nov).
    //
    // La prueba se lee tambien en la rodilla (positive: "si ademas la rodilla
    // se extiende"), y el demo extendia la cadera con la rodilla recta: en la
    // captura de la pose sostenida (capturas/antes/cadera/prueba-de-thomas.png,
    // 15 grados) la pierna derecha va atras y recta. Esa es la prueba ORIGINAL,
    // con la pierna sobre la camilla; la maniobra escrita es la del borde, donde
    // muslo y pierna cuelgan libres (Vigotsky 2016, PMC4991856, PMID 27602291,
    // que la atribuye a Harvey 1998). Ahora la rodilla se dobla a 90 como
    // componente ('knee-flexion' sobre shin_flex, otro hueso que el de la
    // base).
    //
    // La cadera sigue de base porque la cifra grande y la cabecera del
    // escenario salen del movimiento BASE: asi se imprime la extension de
    // cadera, que es lo que la prueba valora (Wong 2022, PMC9076795: positiva
    // si la cadera no vuelve a neutro). Con 'knee-flexion' de base se
    // imprimirian los 90 de la rodilla, un valor de demostracion. La camara ya
    // no decide esto: desde 21233e0 su plano tiene respaldo en
    // boneMap.MOVEMENT_PLANE.
    //
    // Precio: `applyComponents` (RigModel) no ejecuta acoplamientos, asi que no
    // hay deslizamiento rotuliano ni tornillo, igual que con KNEE_AT_90 en las
    // rotaciones de cadera. MEDIDO en el banco de render (copia de
    // render-pose con el componente y la separacion de los brazos de RigModel,
    // de perfil, sin la capa conectiva, que el laboratorio trae apagada):
    // pixeles que no son piel a menos de 9 cm de la rodilla, 1,44% en esta
    // pose frente al 1,84% de la flexion de rodilla de base a 90, que SI
    // desliza la rotula; en las dos asoma lo mismo, el ligamento rotuliano
    // (unos 25 px). El componente no empeora la rodilla del laboratorio.
    // Captura en la aplicacion de la pose sostenida (23 nov,
    // capturas/despues2/cadera/prueba-de-thomas.png, 15 grados): muslo atras,
    // rodilla a 90 con la pierna horizontal hacia atras y el psoas encendido.
    // El 90 es valor de demostracion: ninguna fuente abierta da el angulo de la
    // rodilla.
    demo: {
      movementId: 'hip-extension',
      angleDeg: 15,
      side: 'R',
      components: [{ movementId: 'knee-flexion', angleDeg: 90 }],
      highlightMuscleId: 'psoas-major',
      note: 'Está de pie y solo mueve la pierna explorada: no se tumba ni lleva la rodilla contraria al pecho, que en la prueba aplana la lordosis y fija la pelvis. Lo que se ve es el resultado NORMAL: el muslo llega a la extensión con la rodilla doblada. Con un iliopsoas corto el muslo se quedaría flexionado; con un recto femoral corto, además, la rodilla se estiraría.',
    },
    cite: [{ ref: 'magee', verified: false }],
  },
  {
    id: 'hip-ober',
    name: 'Prueba de Ober',
    aka: ['Ober test'],
    region: 'hip',
    category: 'Acortamiento muscular',
    target: 'Banda iliotibial y tensor de la fascia lata',
    purpose: 'Detectar retracción de la banda iliotibial / TFL.',
    maneuver:
      'En decúbito lateral con la pierna inferior flexionada, se abduce y extiende la cadera superior (rodilla a 90°) y se deja caer en aducción.',
    positive: 'El muslo permanece abducido y no desciende hacia la camilla.',
    // LO QUE MIDE ESTA EN DUDA, Y SE DICE (revision del 15 nov). Willett 2016
    // (PMID 26755689, resumen leido por E-utilities), en cadaver ligeramente
    // embalsamado: tras seccionar la banda iliotibial a mitad del muslo la
    // aduccion no tuvo cambio significativo en ninguna de las dos versiones de
    // la prueba; las secciones siguientes, sumadas a esa (gluteo medio y menor,
    // despues la capsula), si la aumentaron (P < 0,0001 frente a la banda
    // intacta). Solo se probaron esas tres estructuras, y del TFL no se informa
    // nada por separado.
    // Y en vivo la banda SI se estira durante la prueba (Wang 2006, PMID
    // 17023254, ecografia: se estrecha al aducir en las dos versiones; Besomi
    // 2021, PMID 33975135, elastografia: mas velocidad de onda en el Ober
    // modificado; los dos resumenes leidos por E-utilities), asi que el texto
    // dice "en cadaver" y "en duda", sin negar que la banda participe. target y
    // purpose describen el uso clasico y no se tocan: cambiarlos es decision
    // clinica.
    metrics: {
      note: 'Prueba de longitud; sin sensibilidad ni especificidad establecidas de forma consistente. Y lo que mide está en duda: en cadáver, la aducción no tuvo cambio significativo al seccionar la banda iliotibial a mitad del muslo, en ninguna de las dos versiones de la prueba, y sí aumentó con las secciones siguientes, sumadas a esa: el glúteo medio y menor y, después, la cápsula de la cadera (Willett 2016).',
    },
    utility: 'balanced',
    utilityBasis:
      'Es una prueba de LONGITUD, sin sensibilidad ni especificidad establecidas de forma consistente, así que la etiqueta no se apoya en ninguna cifra. Se usa clásicamente para valorar la retracción de la banda iliotibial y del tensor de la fascia lata, pero un estudio en cadáver lo pone en duda: al seccionar la banda la aducción quedó sin cambio significativo, y al seccionar después el glúteo medio y menor y la cápsula sí aumentó (Willett 2016).',
    interpretation:
      'Una banda iliotibial retraída se asocia a dolor lateral de rodilla y a compresión de los tendones glúteos. Pero un Ober positivo no basta para decir que la banda está retraída: en cadáver, al seccionarla la aducción quedó sin cambio significativo, y sí aumentó al seccionar además el glúteo medio y menor y la cápsula. Los autores sugieren que la prueba valora la tensión de esas estructuras de la cadera más que la de la banda (Willett 2016).',
    // SIN DEMO, Y ESTA ES LA RAZON (revision del 15 nov contra la maniobra).
    //
    // La maniobra deja caer en aduccion una cadera EXTENDIDA, de lado (Wong
    // 2022, PMC9076795, final del apartado Thomas Test: se aduce despacio
    // desde una posicion extendida y abducida). El demo posaba 'hip-adduction'
    // a 20 grados, y ESE movimiento lleva la flexion acoplada de
    // `hipCrossOverFlexion` (boneMap: sin(t*90)*25 grados, 25 a 20 de
    // aduccion) para pasar POR DELANTE de la pierna de apoyo; sin ella el muslo
    // entra 8,2 cm en el de apoyo a 15 grados
    // (scripts/measure-limb-collision.mts). En la captura de la pose sostenida
    // (capturas/antes/cadera/prueba-de-ober.png, 20 grados) la pierna derecha
    // cruza por delante de la izquierda; medido por el verificador, la rodilla
    // va 18,3 cm por delante y el pie 34,8. Flexion: la direccion contraria a
    // la extension que pide la prueba, y la nota no lo decia.
    //
    // CANDIDATA MEDIDA Y NO APLICADA. Un componente no lleva acoplamientos, asi
    // que la aduccion como COMPONENTE sobre una base 'hip-extension' no se
    // adelanta. Medido por el verificador con el metodo de
    // measure-limb-collision: extension 20 + aduccion 10 deja 0,0 cm dentro de
    // la pierna de apoyo (aduccion 15: 2,1 cm; 20: 3,5 cm; extension 10 o 15:
    // 1,6 a 8,5 cm). No se aplica sin captura en la aplicacion: la pierna pasa
    // por DETRAS de la de apoyo y de frente quiza no se lee, la cifra grande
    // diria extension y no aduccion, la extension queda en su tope
    // (clinicalRange 20) y ese banco no aplica `blendKneeSkin`. Queda para
    // criterio clinico.
    noDemo:
      'La prueba deja caer en aducción una cadera EXTENDIDA, con el paciente de lado. El modelo está de pie, y su movimiento de aducción de cadera lleva la pierna por delante de la de apoyo con hasta 25° de flexión para no atravesarla: la dirección contraria a la extensión que pide la maniobra.',
    cite: [
      { ref: 'magee', verified: false },
      {
        ref: 'willett-2016',
        verified: true,
        locator:
          'Resultados y conclusión del resumen; estudio anatómico en cadáver, sin cifras de exactitud',
      },
    ],
  },
  /* ======================= Abductor mechanism ======================= */
  {
    id: 'hip-trendelenburg',
    name: 'Signo de Trendelenburg',
    aka: ['Trendelenburg test'],
    region: 'hip',
    category: 'Mecanismo abductor',
    target: 'Glúteo medio y menor (competencia abductora)',
    purpose: 'Valorar la estabilidad frontal de la pelvis en apoyo monopodal.',
    maneuver:
      'El paciente se sostiene sobre una pierna; se observa la pelvis desde atrás durante 30 segundos.',
    positive:
      'La pelvis cae hacia el lado que NO apoya (o el tronco se inclina hacia el lado de apoyo): insuficiencia del glúteo medio del lado de apoyo.',
    metrics: {
      sensitivity: 73,
      specificity: 77,
      note: 'Medido sobre 24 mujeres con dolor trocantéreo, con la RM como patrón: 72,7% y 76,9%. Fue el más exacto Y el más fiable de los tres signos comparados; mejora combinado con dolor a la palpación del trocánter.',
    },
    utility: 'balanced',
    interpretation:
      'Un signo positivo indica insuficiencia del mecanismo abductor (debilidad, dolor o patología glútea); guía el fortalecimiento.',
    // SIN DEMO, Y ESTA ES LA RAZON (revision del 15 nov contra la maniobra).
    //
    // El demo era abduccion de la cadera derecha a 30 grados con el gluteo
    // medio encendido. Un solo `side` manda la pose Y el resalte:
    // OrthopedicTestsPanel lo pasa a rigChannel, y `forMuscleMeshes` de
    // RigOverlays descarta las mallas del otro lado (`wantSide`). Asi que el
    // modelo quedaba de pie sobre la IZQUIERDA con el gluteo medio DERECHO
    // encendido, el de la pierna que se levanta: en la captura de la pose
    // sostenida (capturas/antes/cadera/signo-de-trendelenburg.png, 30 grados)
    // la pierna derecha esta separada y la etiqueta "Gluteo medio" lleva su
    // guia a la cadera derecha. Es la opcion b del paso q2 del caso
    // `hip-gluteal-tendinopathy`, que el caso marca como error frecuente, y ese
    // paso abria esta prueba en el laboratorio.
    //
    // La prueba es apoyo sobre una pierna con el otro pie en el aire al menos
    // 30 s, y es positiva si cae la hemipelvis contralateral: se valora el
    // gluteo del lado de APOYO (Wong 2022, PMC9076795, exploracion de pie).
    // Para ensenarla habria que encender el lado contrario al que se mueve
    // (`TestDemoComponent` no lleva lado), y en BONE_MAP no hay movimiento de
    // pelvis para ensenar la caida.
    noDemo:
      'Es una prueba en apoyo sobre una pierna: se mira si la pelvis cae del lado que no apoya, y el rig no inclina la pelvis ni puede encender el glúteo medio de la pierna de apoyo mientras levanta la otra, porque el resalte va siempre al lado que se mueve.',
    cite: [
      {
        ref: 'bird-2001',
        verified: true,
        locator: 'Sensibilidad 72,7% y especificidad 76,9%, en el resumen',
      },
    ],
  },
  {
    id: 'hip-resisted-flexion',
    name: 'Flexión de cadera resistida (Stinchfield)',
    aka: ['Stinchfield test', 'Resisted straight-leg raise'],
    region: 'hip',
    category: 'Pinzamiento / labrum',
    target: 'Patología intraarticular / labrum',
    purpose: 'Cargar la articulación mediante la contracción del iliopsoas y del recto femoral.',
    maneuver:
      'En supino, el paciente eleva la pierna extendida a ~30° y mantiene contra la resistencia del explorador.',
    positive: 'Dolor inguinal o debilidad durante la flexión resistida.',
    metrics: {
      specificity: 32,
      note: 'Fue la MÁS específica de las cuatro maniobras comparadas frente a bloqueo intraarticular, y aun así sólo 0,32 (IC 95% 0,14-0,55): en la cadera ninguna prueba aislada confirma nada. SIN cifra de sensibilidad: el estudio no la publica para esta maniobra y las revisiones la dan entre el 6% y el 75%.',
    },
    utility: 'weak',
    interpretation:
      'Aporta poco de forma aislada; su valor está en el conjunto con FADIR, log roll y el cuadro clínico.',
    demo: {
      cannotShow:
        'El labrum no está en el rig. Lo que se enciende es el psoas, que es lo que carga la articulación al resistir la flexión: el mecanismo de la prueba.',
      movementId: 'hip-flexion',
      angleDeg: 30,
      side: 'R',
      highlightMuscleId: 'psoas-major',
      examinerForce: 'resists',
      // LA NOTA DICE LA POSTURA (segunda pasada, 23 nov). Es lo unico de la
      // maniobra que se lee en el escenario mientras corre el demo (la ficha
      // del demo no lleva `maneuver`), asi que dice lo que el modelo, de pie,
      // no puede adoptar. Supino y rodilla extendida: Wong 2022 (PMC9076795,
      // apartado Stinchfield). Contacto justo por encima de la rodilla, hacia
      // la camilla, con la cadera a unos 30 grados: Troelsen 2009 (PMC2823204,
      // pie de la figura 3). La mano se queda: es una prueba resistida contra
      // el gesto base, el caso para el que esta hecha la mano generica. En la
      // captura de la pose sostenida
      // (capturas/despues2/cadera/flexión-de-cadera-resistida-stinchfield.png,
      // 30 grados) asoman 135 px de guante en la cara anterior del muslo
      // distal, casi todo hundido en el muslo: donde y como se apoya es codigo
      // de RigOverlays (hallazgo U32), no dato de esta ficha.
      note: 'Está de pie; la prueba se hace en supino. El paciente mantiene elevada la pierna extendida y la mano del explorador se opone a la flexión sobre el muslo distal, justo por encima de la rodilla.',
    },
    cite: [
      {
        ref: 'maslowski-2010',
        verified: true,
        locator: 'Especificidad 0,32 (IC 95% 0,14-0,55), en el resumen',
      },
      { ref: 'wong-2022', verified: true, locator: 'Sensibilidad publicada: rango 6-75%' },
    ],
  },
];
