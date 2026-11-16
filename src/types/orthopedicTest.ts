// src/types/orthopedicTest.ts
//
// Data model for ORTHOPEDIC SPECIAL TESTS (pruebas ortopedicas / tests
// clinicos) shown in the biomechanics lab. Each test carries the maneuver, the
// positive finding, the diagnostic-accuracy metrics (sensibilidad,
// especificidad, y razones de verosimilitud) and the STUDY it comes from.
//
// AUTHORING / ENCODING RULE (same as the rest of the data layer):
//   - User-facing strings: Latin American Spanish WITH accents/enie, UTF-8.
//   - Code, ids, keys, enum-like values: ASCII only (kebab-case ids).
//
// HONESTY CONVENTION: sensibilidad/especificidad vary a LOT by study, degree of
// tear, and positivity criterion. Every metric set points to the study it came
// from and carries `verified: false` until the number is checked against the
// primary source (mirrors `pageVerified: false` on the book citations). The UI
// surfaces the unverified flag so the physio can confirm before publishing.

/** A study/source backing a test's metrics; verified=false until checked. */
export interface StudyCitation {
  /** Key into REFERENCES (references.ts). */
  ref: string;
  /** True once the exact numbers were checked against the primary source. */
  verified: boolean;
  /** Optional page/table locator within the source. */
  locator?: string;
}

/**
 * Diagnostic-accuracy metrics for a test, as POINT ESTIMATES in percent.
 * Likelihood ratios are optional and, when omitted, the UI derives an
 * approximate LR from sens/spec (clearly labelled "aprox."). `note` carries the
 * spread/context (e.g. "varia 60-79% segun grado de rotura").
 */
export interface DiagnosticMetrics {
  /** Sensibilidad, 0..100 (%). Omitted when the source did not report it. */
  sensitivity?: number;
  /** Especificidad, 0..100 (%). */
  specificity?: number;
  /**
   * Extremo INFERIOR del intervalo de confianza de la especificidad, cuando la
   * fuente lo publica.
   *
   * Existe por las especificidades del 100%. Una especificidad del 100% no
   * significa que la prueba sea infalible: significa que en ESA muestra, finita,
   * no hubo ni un falso positivo. Tratarla como certeza daba una razon de
   * verosimilitud infinita y una probabilidad post-test del 100% desde
   * cualquier sospecha previa, incluido el 1%, que es una afirmacion clinica
   * falsa y peligrosa. Con el extremo inferior del intervalo se puede ademas
   * publicar una estimacion CONSERVADORA junto al aviso (Suri 2011 da 88%).
   */
  specificityCiLow?: number;
  /** Razon de verosimilitud positiva (LR+), if the study reported one. */
  lrPositive?: number;
  /** Razon de verosimilitud negativa (LR-), if the study reported one. */
  lrNegative?: number;
  /** Spread / caveat shown under the bars. */
  note?: string;
}

/**
 * How to reproduce the test's provocative position on the 3D rig. Maps the test
 * to a driveable movement (movementId from *Rom.ts) + a target angle, plus an
 * optional muscle to glow (muscleId as used by RigOverlays). Optional: tests
 * whose position the current rig cannot approximate simply omit it (no demo
 * button). `note` documents the part of the maneuver the single-axis rig cannot
 * reproduce (e.g. an added rotation), shown next to the button.
 */
/**
 * One extra joint HELD while the demo plays, on top of the base movement.
 *
 * Without these, a maneuver is only its base movement, and most shoulder tests
 * share one: six of the fourteen were "abduct to 90" and three were "flex to
 * 90". On screen they were the same pose, and everything that actually
 * distinguishes them -- Hawkins' forced internal rotation, the apprehension
 * position's external rotation, Jobe's thumb-down -- lived in the note TEXT
 * only. The physio reviewing the lab put it plainly: "todos hacen lo mismo, no
 * veo la diferencia".
 *
 * Expressed as a movementId rather than a bone + axis so the clinical
 * vocabulary stays the vocabulary, and so the per-side sign and axis mapping
 * boneMap already solved is reused rather than restated.
 */
export interface TestDemoComponent {
  /** A drivable movementId, held at a fixed angle for the whole demo. */
  movementId: string;
  /** Clinical angle to hold (deg). */
  angleDeg: number;
}

export interface TestDemo {
  /** movementId the rig already knows how to drive. */
  movementId: string;
  /** Clinical angle to pose at (deg). */
  angleDeg: number;
  /** Which side to pose (default 'R'). */
  side?: 'R' | 'L';
  /** Muscle/structure to glow while posed (muscleId from the region's muscles). */
  highlightMuscleId?: string;
  /**
   * LA ESTRUCTURA QUE LA PRUEBA VALORA, cuando no es un musculo.
   *
   * `highlightMuscleId` solo resuelve musculos, y casi ninguna prueba valora
   * uno: valoran un ligamento, un menisco, la capsula, el labrum. Medido sobre
   * los 65 demos, 42 no encendian NADA mientras la ayuda del panel prometia que
   * el modelo "resalta la estructura evaluada" --y la rodilla, que es donde cada
   * prueba nombra su ligamento en el propio campo `target`, tenia los 11
   * apagados.
   *
   * Ids del registro CLINICAL_STRUCTURES (src/lib/clinicalStructures.ts), en
   * orden de importancia clinica. El demo enciende la capa que haga falta: la
   * conectiva esta apagada por defecto en el laboratorio, y pedir una prueba de
   * ligamento es pedir ver el ligamento.
   */
  highlightStructureIds?: string[];
  /**
   * LO QUE ESTA PRUEBA NO PUEDE ENSENAR, en una frase y en espanol.
   *
   * El laboratorio solo muestra cuatro capas (piel, musculo, hueso, conectivo):
   * `layerForMaterial` devuelve null para los nervios y los vasos, asi que esas
   * mallas quedan fuera del sistema de capas y no hay forma de encenderlas. Una
   * prueba cuyo objetivo es una raiz nerviosa, la medula o una arteria no puede
   * resaltar su estructura, y el ligamento transverso del atlas directamente no
   * existe como malla en este GLB.
   *
   * Eso se DICE. La alternativa que habia era callarlo, y callarlo convertia la
   * promesa del panel en mentira en dos de cada tres pruebas. Si en su lugar se
   * resalta algo relacionado (el atlas donde se inserta el ligamento), esta
   * frase es tambien donde se aclara que es un sustituto.
   */
  cannotShow?: string;
  /**
   * QUIEN HACE LA FUERZA, cuando en la maniobra hay una mano del explorador.
   *
   *   - 'resists': el PACIENTE empuja y el explorador se opone (Jobe, Speed,
   *     O'Brien, Cozen, Stinchfield). Es una contraccion resistida: si el
   *     paciente no empuja, no hay prueba.
   *   - 'applies': el paciente esta RELAJADO y la fuerza la pone el explorador
   *     (cajon anterior, estres en valgo, McMurray, valgo movil del codo). Es una
   *     prueba pasiva: si el paciente empuja, la prueba no vale.
   *
   * Esto era un solo booleano `resisted`, y siete pruebas pasivas de rodilla lo
   * llevaban puesto porque lo que se queria era DIBUJAR LA MANO. El panel leia
   * ese mismo booleano para imprimir "el paciente sostiene la posicion y empuja;
   * aplica resistencia oponiendote al movimiento" -- instrucciones contrarias a
   * la maniobra en un cajon anterior, donde la contraccion del paciente es
   * justamente lo que hay que evitar porque enmascara la traslacion.
   *
   * Dejarlo sin valor significa que no se dibuja ninguna mano. Es lo correcto
   * cuando el contacto generico en el segmento distal seria anatomicamente
   * falso: belly-press y lift-off apoyan en el abdomen y en la region lumbar, y
   * las maniobras que solo colocan una postura no tienen mano que ensenar.
   */
  examinerForce?: 'resists' | 'applies';
  /**
   * `false`: LA FUERZA ES DEL EXPLORADOR, PERO LA MANO NO SE DIBUJA.
   *
   * `examinerForce` hacia dos cosas a la vez: el TEXTO (la etiqueta "Pasivo" o
   * "Resistido" y sus instrucciones) y la MANO de `RigOverlays.placeResistance`.
   * Esa mano es una sola: se apoya al 82% del segmento que mueve el gesto BASE
   * y empuja hacia el reposo colgando, o sea, es la mano de una prueba
   * resistida CONTRA ese gesto. Revisado demo por demo contra su captura (15
   * nov): en Neer empujaba el brazo elevado hacia abajo, al reves de la
   * elevacion forzada; en Hawkins y en la aprension caia sobre el humero cuando
   * la fuerza va en el antebrazo y es de rotacion; en los cajones de rodilla se
   * apoyaba junto al talon, no en la tibia proxima. Quitar `examinerForce` para
   * borrar la mano borraba tambien el aviso de prueba pasiva, que en esas
   * pruebas es justo lo correcto.
   *
   * Con `false` se queda el texto y se va la mano, y las frases que la
   * prometen ("donde se apoya la mano del fisio en el modelo") no se imprimen.
   * Sin `examinerForce` el campo no significa nada (lo vigila el test de
   * estructuras clinicas). Tambien deja declarar quien hace la fuerza en una
   * prueba de raquis, donde nunca hubo mano que dibujar.
   */
  examinerHand?: false;
  /**
   * The joints that make this maneuver ITSELF, held while the base movement
   * sweeps. Neer and Hawkins are both flexion; what separates them is that
   * Hawkins forces internal rotation with the elbow at 90.
   */
  components?: TestDemoComponent[];
  /**
   * En que orden entran la base y los componentes (src/lib/demoTimeline.ts). Sin
   * el campo, primero la base y despues la maniobra. Se declara por dos razones,
   * y las dos se comprueban con `npm run audit-demo-path`:
   *
   *   - el CAMINO: otro orden mete menos el miembro en el tronco;
   *   - la MANIOBRA: la prueba coloca primero los componentes y despues mueve
   *     la base. Mill coloca muneca y antebrazo y DESPUES extiende el codo; el
   *     pivot shift pone la rotacion interna desde la extension y despues
   *     flexiona. Con la base primero el modelo ensenaba la pelicula al reves
   *     (revision del 15 nov contra la maniobra escrita en cada ficha).
   */
  order?: import('../lib/demoTimeline').DemoOrder;
  /** What the rig approximation leaves out (shown as a caveat). */
  note?: string;
}

/**
 * How the test is best used, from its metric profile:
 *   - 'rule-out'  (SnNout): high sensibilidad -> a NEGATIVE result rules the
 *      condition OUT. Good screening test.
 *   - 'rule-in'   (SpPin):  high especificidad -> a POSITIVE result rules the
 *      condition IN. Good confirmation test.
 *   - 'balanced':  moderate both ways; use within a cluster of tests.
 *   - 'weak':      low accuracy alone; interpret only as part of a test cluster.
 */
export type TestUtility = 'rule-out' | 'rule-in' | 'balanced' | 'weak';

export interface OrthopedicTest {
  /** Stable kebab-case id, unique across all regions. */
  id: string;
  /** User-facing name (Spanish). */
  name: string;
  /** Eponyms / synonyms shown as secondary labels. */
  aka?: string[];
  /** Region id (matches store.region): 'shoulder', 'cervical', ... */
  region: string;
  /** Clinical grouping shown as a section header (e.g. "Pinzamiento subacromial"). */
  category: string;
  /** What structure/condition the test targets (e.g. "Supraespinoso"). */
  target: string;
  /** One line: what the test is trying to detect. */
  purpose: string;
  /** How the maneuver is performed (position + action). */
  maneuver: string;
  /** What counts as a POSITIVE result. */
  positive: string;
  /** Diagnostic-accuracy metrics + their study. */
  metrics: DiagnosticMetrics;
  /** Derived clinical use of the test (drives the SnNout/SpPin badge). */
  utility: TestUtility;
  /**
   * POR QUE el uso es ese, cuando NO se deduce de la sensibilidad o la
   * especificidad que figuran arriba.
   *
   * La regla normal es la obvia: se descarta con una prueba sensible y se
   * confirma con una específica, y la auditoría avisa cuando la etiqueta y la
   * cifra no concuerdan. Pero hay casos reales en los que concuerdan mal por un
   * buen motivo, y callarlo convertía el aviso en ruido permanente:
   *
   *   - la aducción cruzada tiene una sensibilidad del 77%, y lo que la hace
   *     una prueba de descarte es el VALOR PREDICTIVO NEGATIVO por encima del
   *     94% que publica la misma fuente;
   *   - y el caso más frecuente, que es NO TENER CIFRA NINGUNA. Doce pruebas
   *     llevan una etiqueta cuya cifra su fuente no publica, y cuatro de ellas
   *     llevaban la más fuerte del panel: "Confirma", con el título "Alta
   *     especificidad (SpPin): un positivo confirma", sin sensibilidad y sin
   *     especificidad (relocation, Adams, log roll y el sag posterior). La nota
   *     de relocation lo dice ella misma: Lo 2004 "no publicó sensibilidad ni
   *     especificidad de la recolocación aislada".
   *
   * Así que la excepción se DECLARA aquí, con su evidencia, en vez de vivir en
   * una lista de perdones dentro del auditor; `clinicalAudit` exige este campo
   * cuando falta la cifra que respalda la etiqueta, y el panel pinta la palabra
   * en gris y la enseña en el título de la fila. Si la cifra deja de
   * contradecir a la etiqueta, este campo sobra; mientras la contradiga o no
   * exista, la explicación tiene que estar escrita y el usuario tiene que poder
   * leerla.
   */
  utilityBasis?: string;
  /** How to read a positive/negative given the metric profile. */
  interpretation: string;
  /** Optional teaching pearl (false positives, confounders, tips). */
  pearl?: string;
  /** How to reproduce the provocative position on the 3D rig (optional). */
  demo?: TestDemo;
  /**
   * POR QUE ESTA PRUEBA NO TIENE DEMOSTRACION EN 3D, en una frase y en espanol.
   *
   * De las 80 pruebas, 24 no tienen demo, y hasta ahora eso se veia exactamente
   * igual que un error: la fila no traia boton de play y nadie decia por que.
   * El alumno no puede distinguir "esta prueba no se puede ensenar con este
   * modelo" de "esto esta sin terminar", asi que asume lo segundo.
   *
   * Y las razones son reales y medidas, no una lista de pendientes:
   *
   *   - EL RIG GIRA ARTICULACIONES, NO TRASLADA. Una traccion cervical, un
   *     cajon, un empuje sacroiliaco o una compresion de la caja toracica no
   *     tienen angulo que reproducir.
   *   - LOS SEIS MOVIMIENTOS DE CADERA COMPARTEN UN SOLO HUESO (`femur_base`),
   *     y los cuatro del tobillo tambien (`foot_flex`). El modelo posa uno a la
   *     vez, asi que FADIR, FABER, Gaenslen y Kleiger --que suman tres
   *     direcciones en la misma articulacion-- no se pueden montar.
   *   - HAY GESTOS QUE EL RIG NO CONDUCE: no existe extension ni aduccion
   *     horizontal de hombro, ni falanges, ni respiracion.
   *   - Y HAY HALLAZGOS QUE NO SON UNA POSTURA: un reflejo, un pulso que
   *     desaparece, un perimetro que no crece.
   *
   * Asi que cada una lo DICE, en el sitio donde estaria el boton. La regla la
   * vigila `clinicalStructures.test.ts`: una prueba tiene demo o tiene esto,
   * nunca ninguno de los dos y nunca los dos.
   */
  noDemo?: string;
  /** Study/studies the metrics come from. */
  cite: StudyCitation[];
}

/** region id -> tests. */
export type OrthopedicTestIndex = Record<string, OrthopedicTest[]>;
