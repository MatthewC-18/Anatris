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
// Siguen sin fuente primaria Thomas y Ober, que son pruebas de longitud
// muscular y no llevan cifras.
//
// DEMO: each test maps to a driveable hip movementId (from hipRom.ts) plus a
// note documenting the parts of the composite maneuver the single-axis rig can
// only approximate (e.g. FADIR = flexion + adduction + internal rotation).

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
    maneuver:
      'En decúbito supino, se lleva la cadera a 90° de flexión y se añade aducción y rotación interna.',
    positive: 'Reproducción del dolor inguinal característico del paciente (con o sin chasquido).',
    metrics: {
      sensitivity: 94,
      specificity: 25,
      note: 'Dos estudios distintos, y conviene saberlo: la sensibilidad 0,94 (IC 95% 0,90-0,97) es la agrupada del metanálisis de Reiman; la especificidad 25% es la de Pålsson (81 pacientes, bloqueo + imagen), donde la sensibilidad fue del 80%. El positivo aislado no confirma nada.',
    },
    utility: 'rule-out',
    interpretation:
      'Un FADIR NEGATIVO hace poco probable el pinzamiento/labrum (SnNout). Un positivo, por su baja especificidad, obliga a confirmar con imagen o cluster.',
    pearl:
      'Muy sensible: su valor está en el resultado negativo. El positivo aislado no confirma FAI.',
    // SIN DEMO, Y ESTA ES LA RAZON.
    //
    // FADIR es flexion de 90 grados MAS aduccion MAS rotacion interna, las tres
    // a la vez. En este rig los tres movimientos de cadera cuelgan del MISMO
    // hueso (femur_base) con ejes distintos, y un componente que repite el hueso
    // de la base lo sobreescribe: solo se puede posar uno. Lo que habia era la
    // rotacion interna sola, a 30 grados.
    //
    // Y medido con `npm run measure-test-poses`: esa pose queda a 1,3 cm de la
    // de "rotacion interna pasiva en neutro", que es OTRA prueba de esta misma
    // region. Es decir, el boton de FADIR reproducia la prueba de al lado. La
    // maniobra esta descrita en su texto.

    noDemo:
      'Suma flexión, aducción y rotación interna en la misma cadera, y los seis movimientos de cadera del rig mueven el MISMO hueso: el modelo posa uno a la vez, así que la combinación no se puede montar.',
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
  {
    id: 'hip-ir-neutral',
    name: 'Rotación interna pasiva en neutro',
    aka: ['Passive hip internal rotation', 'IR in neutral hip position'],
    region: 'hip',
    category: 'Pinzamiento / labrum',
    target: 'Síndrome de pinzamiento femoroacetabular (FAI)',
    purpose:
      'CONFIRMAR el pinzamiento midiendo el rango, no provocando dolor: es la única maniobra de la cadera con especificidad alta publicada.',
    maneuver:
      'En decúbito prono o supino con la cadera en posición NEUTRA (sin flexión), se rota el muslo pasivamente hacia dentro y se mide el rango alcanzado, comparándolo con el lado sano.',
    positive: 'Rotación interna restringida respecto al lado sano.',
    metrics: {
      sensitivity: 29,
      specificity: 94,
      note: 'Las dos cifras del mismo estudio (Pålsson, 81 pacientes), con tres criterios simultáneos como patrón de referencia: síntomas, morfología CAM o pincer en imagen, y respuesta al bloqueo intraarticular. Es el espejo exacto del FADIR: donde aquél sólo sirve para descartar, ésta sirve para confirmar.',
    },
    utility: 'rule-in',
    interpretation:
      'Una rotación interna restringida en neutro apoya con fuerza el pinzamiento (SpPin). Un rango normal NO lo descarta: la sensibilidad es del 29%.',
    pearl:
      'Se mide, no se provoca. Emparejada con el FADIR cubre las dos direcciones: FADIR negativo descarta, rotación interna restringida confirma.',
    demo: {
      cannotShow:
        'El labrum acetabular y el cartílago de la cadera no están en el rig. Lo que la prueba mide es la amplitud de rotación interna, y eso es lo que el modelo hace.',
      movementId: 'hip-internal-rotation',
      angleDeg: 35,
      side: 'R',
      note: 'El rig muestra la rotación interna pasiva con la cadera en neutro, que es la posición de la prueba.',
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
    interpretation:
      'Úsalo para LOCALIZAR el origen del dolor más que como prueba binaria; combínalo con FADIR y el cuadro clínico.',
    // SIN DEMO, Y ESTA ES LA RAZON.
    //
    // FABER es la figura de 4: flexion, abduccion y rotacion externa juntas. Los
    // tres movimientos comparten hueso en este rig (femur_base), asi que solo se
    // puede posar uno, y lo que habia era la rotacion externa sola a 45 grados
    // --que es la pose del log roll, otra prueba de esta lista, a 1,3 cm
    // (`npm run measure-test-poses`)-.
    //
    // Una pierna en rotacion externa no es la figura de 4; y con el rotulo
    // "FABER (Patrick)" encima, lo que ensena es la prueba equivocada.

    noDemo:
      'Suma flexión, abducción y rotación externa en la misma cadera, y los seis movimientos de cadera del rig comparten hueso: el modelo posa uno a la vez.',
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
    interpretation:
      'Un arco doloroso o con resalte apoya patología intraarticular; no descarta por sí solo.',
    demo: {
      examinerForce: 'applies',
      cannotShow:
        'La superficie articular y el labrum no están como malla propia en el rig. Se demuestra el barrido; el hallazgo va en el texto.',
      movementId: 'hip-flexion',
      angleDeg: 90,
      side: 'R',
      note: 'El rig aproxima la flexión de partida; la maniobra añade carga axial y un arco de rotación.',
    },
    cite: [
      { ref: 'wong-2022', verified: true, locator: 'Scour: sensibilidad 50-100%, especificidad 29%' },
      { ref: 'maslowski-2010', verified: true, locator: 'Techo de especificidad en la cadera: 0,32' },
    ],
  },
  {
    id: 'hip-log-roll',
    name: 'Log roll (rodamiento)',
    aka: ['Freiberg test', 'Passive rotation test'],
    region: 'hip',
    category: 'Pinzamiento / labrum',
    target: 'Origen intraarticular del dolor',
    purpose:
      'Aislar la articulación coxofemoral: es la prueba más específica de origen intraarticular porque solo mueve el fémur bajo el acetábulo, sin estresar partes blandas.',
    maneuver:
      'En supino con la pierna extendida y relajada, se rota pasivamente el muslo hacia dentro y hacia fuera ("rodando" el fémur).',
    positive: 'Dolor, chasquido o asimetría del rango de rotación respecto al lado sano.',
    metrics: {
      note: 'SIN cifras: no hay estudio que publique sensibilidad ni especificidad del log roll. La fama de prueba "muy específica" viene de su MECÁNICA -- es la única que mueve el fémur bajo el acetábulo sin tensar partes blandas -- y así la recoge la revisión de Wong 2022, que lo dice con palabras y no con números. Las cifras que circulan (30% / 85%) no tienen fuente localizable.',
    },
    utility: 'rule-in',
    interpretation:
      'Al mover SOLO la cadera, un positivo apunta con fuerza al interior de la articulación (SpPin).',
    demo: {
      cannotShow:
        'La prueba busca un origen intraarticular, y ni labrum ni cartílago están en el rig. Lo que se demuestra es la rotación pasiva sin mover la pelvis.',
      movementId: 'hip-external-rotation',
      angleDeg: 40,
      side: 'R',
      note: 'El rig muestra la rotación externa pasiva; la prueba alterna interna/externa con la pierna extendida.',
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
    interpretation:
      'Valora el balance flexor: un iliopsoas corto favorece la anteversión pélvica y limita la extensión de cadera.',
    demo: {
      movementId: 'hip-extension',
      angleDeg: 15,
      side: 'R',
      highlightMuscleId: 'psoas-major',
      note: 'El rig muestra la extensión que el flexor corto limita.',
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
    metrics: {
      note: 'Prueba de longitud; sin sens/espec establecidas de forma consistente.',
    },
    utility: 'balanced',
    interpretation:
      'Una banda iliotibial retraída se asocia a dolor lateral de rodilla y a compresión de los tendones glúteos.',
    demo: {
      highlightStructureIds: ['hip-itb'],
      movementId: 'hip-adduction',
      angleDeg: 20,
      side: 'R',
      highlightMuscleId: 'tensor-fasciae-latae',
      note: 'El rig muestra la aducción que el TFL/banda iliotibial retraídos limitan.',
    },
    cite: [{ ref: 'magee', verified: false }],
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
    demo: {
      movementId: 'hip-abduction',
      angleDeg: 30,
      side: 'R',
      highlightMuscleId: 'gluteus-medius',
      note: 'El rig muestra la abducción activa; el signo se valora en carga monopodal.',
    },
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
      note: 'El rig muestra la flexión resistida (mano del terapeuta oponiéndose).',
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
