// ¿HACE ESE MUSCULO ESE MOVIMIENTO?
//
// Cada fase de cada movimiento acredita a unos musculos como motor principal,
// asistente o estabilizador. Y por otro lado cada musculo declara sus propias
// acciones (articulacion + movimiento) en su ficha anatomica. Son dos datos
// escritos por separado, meses aparte, y nada comprobaba que dijeran lo mismo:
// un musculo podia figurar como MOTOR PRINCIPAL de la flexion sin que su ficha
// le atribuyera ninguna flexion, o atribuyendole la extension.
//
// Eso no se ve en pantalla. El panel pinta el chip igual, el musculo se ilumina
// igual, y la cifra de grados es correcta. Lo unico que esta mal es la funcion,
// que es justo lo que el alumno ha venido a aprender.
//
// La deteccion vive aqui, en una funcion pura, para que la comparta el script
// (`npm run audit-functions`, que lo imprime musculo por musculo) y el test de
// regresion. Lo mismo que se hizo con los distractores de los casos.

/** El minimo de una ficha de musculo que hace falta para juzgar su funcion. */
export interface MuscleLike {
  id: string;
  name: string;
  actions?: { joint: string; movement: string; note?: string }[];
}

/** El minimo de un movimiento del catalogo ROM. */
export interface MovementLike {
  id: string;
  name: string;
  joint: string;
  region: string;
  reverseArc?: { name: string; phases: { muscles: MuscleRefLike[] }[] };
  phases: { label: string; muscles: MuscleRefLike[] }[];
  /**
   * Las envolventes de reclutamiento, que llevan SU PROPIO rol. El panel muestra
   * ESTE y no el de la fase cuando existe (`activeMusclesAt`), asi que un
   * desacuerdo entre los dos no es academico: lo que el usuario lee es este.
   */
  activations?: {
    muscleId: string;
    role: MuscleRefLike['role'];
    /** El papel en el tramo negativo del arco, si cambia al cruzar el cero. */
    roleWhenNegative?: MuscleRefLike['role'];
    note?: string;
  }[];
}

/** Un musculo al que la fase y la envolvente le dan papeles distintos. */
export interface RoleDisagreement {
  movementId: string;
  muscleId: string;
  phaseRoles: MuscleRefLike['role'][];
  activationRole: MuscleRefLike['role'];
}

/**
 * DOS SITIOS PARA EL MISMO PAPEL, Y PUEDEN DECIR COSAS DISTINTAS.
 *
 * El rol de un musculo esta escrito dos veces: en la fase (`phases[].muscles`) y
 * en su envolvente de reclutamiento (`activations[]`). El panel prefiere el de
 * la envolvente, de modo que corregir solo la fase deja la pantalla igual — fue
 * exactamente lo que paso al convertir el erector en freno excentrico: el dato
 * decia "freno" y el panel seguia leyendo "Motor principal".
 *
 * Un estabilizador en la fase y asistente en la envolvente es un matiz
 * defendible; motor en una y FRENO en la otra no, porque son papeles opuestos.
 * Asi que se reporta todo desacuerdo y el que lo lea decide.
 */
export function readRoleDisagreements(movement: MovementLike): RoleDisagreement[] {
  const acts = movement.activations ?? [];
  if (acts.length === 0) return [];
  const byMuscle = new Map<string, Set<MuscleRefLike['role']>>();
  for (const ph of movement.phases) {
    for (const m of ph.muscles) {
      if (!byMuscle.has(m.muscleId)) byMuscle.set(m.muscleId, new Set());
      byMuscle.get(m.muscleId)!.add(m.role);
    }
  }
  const out: RoleDisagreement[] = [];
  for (const a of acts) {
    const roles = byMuscle.get(a.muscleId);
    // Un musculo que solo esta en la envolvente no es un desacuerdo: es una
    // ausencia, y la vigila el audit de funciones por su cuenta.
    if (!roles || roles.size === 0) continue;
    if (!roles.has(a.role)) {
      out.push({
        movementId: movement.id,
        muscleId: a.muscleId,
        phaseRoles: [...roles],
        activationRole: a.role,
      });
    }
  }
  return out;
}

/** Un paso de una guia gestual, con los musculos que ilumina. */
export interface GuideStepLike {
  id: string;
  title: string;
  muscles: { id: string; role: MuscleRefLike['role'] }[];
}

/** Una guia gestual: pasos encadenados bajo el id de un movimiento ROM. */
export interface GuideLike {
  movementId: string;
  name: string;
  steps: GuideStepLike[];
}

/** Un paso de guia que llama motor a lo que el movimiento llama freno. */
export interface GuideRoleConflict {
  movementId: string;
  stepId: string;
  stepTitle: string;
  muscleId: string;
  guideRole: MuscleRefLike['role'];
  romRoles: MuscleRefLike['role'][];
}

/** Papeles que no pueden ser el mismo musculo en el mismo tramo. */
function opposedRoles(a: MuscleRefLike['role'], b: MuscleRefLike['role']): boolean {
  const motor = (r: MuscleRefLike['role']) => r === 'prime-mover' || r === 'assistant';
  return (motor(a) && b === 'eccentric-control') || (a === 'eccentric-control' && motor(b));
}

/**
 * EL CUARTO SITIO DONDE VIVE EL PAPEL DE UN MUSCULO.
 *
 * Las guias gestuales de la fase de biomecanica (`GestureGuide.steps[].muscles`)
 * llevan SU PROPIO rol, que es el que colorea el chip y el musculo mientras el
 * alumno avanza paso a paso. Un paso puede legitimamente subrayar a un musculo
 * que el movimiento llama asistente (el braquiorradial con el antebrazo en
 * neutro es el ejemplo bueno), asi que un rol distinto no es por si un defecto.
 *
 * Lo que NO puede ser es un paso titulado «el erector frena» que acredite al
 * erector como MOTOR: motor y freno excentrico son funciones opuestas. Eso es lo
 * que se reporta.
 */
export function readGuideRoleConflicts(
  guides: readonly GuideLike[],
  movements: readonly MovementLike[],
): GuideRoleConflict[] {
  const byId = new Map(movements.map((m) => [m.id, m]));
  const out: GuideRoleConflict[] = [];
  for (const g of guides) {
    const mv = byId.get(g.movementId);
    if (!mv) continue;
    const roles = new Map<string, Set<MuscleRefLike['role']>>();
    const add = (id: string, role: MuscleRefLike['role']): void => {
      if (!roles.has(id)) roles.set(id, new Set());
      roles.get(id)!.add(role);
    };
    for (const ph of mv.phases) for (const r of ph.muscles) add(r.muscleId, r.role);
    for (const a of mv.activations ?? []) add(a.muscleId, a.role);
    for (const st of g.steps) {
      for (const mu of st.muscles) {
        const rs = roles.get(mu.id);
        if (!rs || rs.size === 0) continue;
        // Si ALGUN tramo del movimiento le da ese papel, el paso es defendible.
        if (rs.has(mu.role)) continue;
        if (![...rs].every((r) => opposedRoles(mu.role, r))) continue;
        out.push({
          movementId: g.movementId,
          stepId: st.id,
          stepTitle: st.title,
          muscleId: mu.id,
          guideRole: mu.role,
          romRoles: [...rs],
        });
      }
    }
  }
  return out;
}

export interface MuscleRefLike {
  muscleId: string;
  role: 'prime-mover' | 'assistant' | 'eccentric-control' | 'stabilizer';
  note?: string;
}

/** Sin tildes, en minusculas: los dos datos no las escriben igual. */
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * LAS PALABRAS QUE NOMBRAN CADA GESTO.
 *
 * Un nombre de movimiento no se puede comparar como cadena con una accion de
 * musculo, porque la accion se escribe compuesta y en plural de gestos:
 * «Flexion y supinacion», «Protraccion (abduccion)», «Extension y aduccion».
 * Asi que cada gesto se reduce a sus palabras clave y se busca por palabra.
 *
 * Y cada gesto conoce SU CONTRARIO, que es la mitad util de esto: acreditar a
 * un musculo como motor de un gesto cuando su ficha solo le atribuye el
 * contrario es un error que se puede nombrar, no una sospecha.
 */
interface Gesture {
  key: string;
  /** Palabras que, en una accion, significan este gesto. */
  words: string[];
  /** El gesto opuesto, si lo tiene. */
  opposite?: string;
}

const GESTURES: Gesture[] = [
  // El par flexion/extension se trata aparte en cada articulacion porque
  // «flexion plantar» y «dorsiflexion» son los nombres del tobillo para lo
  // mismo, y «flexion lateral» del raquis NO es una flexion.
  { key: 'flexion', words: ['flexion', 'flexora', 'flexor'], opposite: 'extension' },
  { key: 'extension', words: ['extension', 'extensora', 'extensor'], opposite: 'flexion' },
  // Cada gesto en sustantivo Y en verbo, porque las notas lo escriben asi
  // («flexiona, abduce y rota internamente la cadera»).
  { key: 'abduccion', words: ['abduccion', 'abductor', 'separacion', 'abduce'], opposite: 'aduccion' },
  { key: 'aduccion', words: ['aduccion', 'aductor', 'aproximacion', 'aduce'], opposite: 'abduccion' },
  {
    key: 'rotacion-interna',
    words: [
      'rotacion interna', 'rotacion medial', 'rotador interno', 'rotacion inter',
      'rota interna', 'rota medial',
    ],
    opposite: 'rotacion-externa',
  },
  {
    key: 'rotacion-externa',
    words: [
      'rotacion externa', 'rotacion lateral', 'rotador externo',
      'rota externa', 'rota lateral',
    ],
    opposite: 'rotacion-interna',
  },
  { key: 'pronacion', words: ['pronacion', 'pronador'], opposite: 'supinacion' },
  { key: 'supinacion', words: ['supinacion', 'supinador'], opposite: 'pronacion' },
  { key: 'inversion', words: ['inversion', 'supinacion del pie'], opposite: 'eversion' },
  { key: 'eversion', words: ['eversion', 'pronacion del pie'], opposite: 'inversion' },
  {
    key: 'dorsiflexion',
    words: ['dorsiflexion', 'flexion dorsal', 'flexion dorsiflexion'],
    opposite: 'flexion-plantar',
  },
  {
    key: 'flexion-plantar',
    words: ['flexion plantar', 'plantiflexion', 'flexor plantar'],
    opposite: 'dorsiflexion',
  },
  {
    key: 'flexion-lateral',
    // EL RAQUIS NO LA LLAMA "FLEXION LATERAL". Las fichas de los musculos
    // espinales escriben «Inclinacion ipsilateral», que es el mismo gesto visto
    // desde el musculo (un musculo inclina a SU lado; el movimiento se llama
    // flexion lateral). Sin esta linea el banco suspendia al cuadrado lumbar,
    // que es EL inclinador lateral del tronco, y a los dos escalenos.
    words: [
      'flexion lateral', 'inclinacion lateral', 'lateralizacion',
      'inclinacion ipsilateral', 'inclinacion contralateral', 'inclina',
    ],
  },
  { key: 'rotacion', words: ['rotacion'] },
  // Gestos de la cintura escapular: no son del humero, pero un movimiento del
  // hombro los recluta y los musculos los declaran con estos nombres.
  { key: 'elevacion', words: ['elevacion', 'elevador'], opposite: 'depresion' },
  { key: 'depresion', words: ['depresion', 'descenso'], opposite: 'elevacion' },
  { key: 'protraccion', words: ['protraccion', 'protrusion'], opposite: 'retraccion' },
  { key: 'retraccion', words: ['retraccion'], opposite: 'protraccion' },
  { key: 'estabilizacion', words: ['estabiliza', 'estabilizacion', 'control', 'centra'] },
];

const BY_KEY = new Map(GESTURES.map((g) => [g.key, g]));

/**
 * EL BRAZO NO SUBE SOLO CON EL HOMBRO.
 *
 * Una elevacion recluta el trapecio y el serrato, y sus fichas no declaran
 * «abduccion» ni «flexion» porque no mueven el humero: hacen la ROTACION
 * SUPERIOR de la escapula, que es literalmente como el brazo pasa de 90 grados
 * (la ficha del serrato lo dice con esas palabras, «esencial para elevar el
 * brazo por encima de la cabeza»). Acreditarlos esta bien; lo que estaba mal era
 * exigirles el gesto del humero.
 *
 * Asi que para una elevacion del hombro la rotacion superior de la escapula y la
 * protraccion cuentan como respaldo. Para las ROTACIONES del hombro no, que es
 * la razon de que esto sea una lista y no una regla general.
 */
const GIRDLE_SUPPORTS: Record<string, string[]> = {
  abduccion: ['rotacion', 'elevacion', 'protraccion'],
  flexion: ['rotacion', 'elevacion', 'protraccion'],
};
/** ¿Es este movimiento una elevacion del brazo? */
function isArmElevation(movement: MovementLike): boolean {
  return movement.region === 'shoulder' && /glenohumeral/.test(movement.joint.toLowerCase());
}

/**
 * El gesto que nombra un texto. Se prueban primero los nombres MAS LARGOS para
 * que «flexion plantar» no se lea como «flexion» y «rotacion interna» no se lea
 * como «rotacion»: la misma regla de la aguja mas larga que hizo falta para los
 * distractores de los casos clinicos.
 */
export function gesturesIn(text: string): string[] {
  const t = fold(text);
  const hits: { key: string; len: number }[] = [];
  for (const g of GESTURES) {
    for (const w of g.words) {
      if (t.includes(w)) hits.push({ key: g.key, len: w.length });
    }
  }
  if (hits.length === 0) return [];
  // Un gesto cuyo nombre esta contenido en el de otro acertado cede.
  const kept = hits.filter(
    (h) => !hits.some((o) => o.key !== h.key && o.len > h.len && nameContains(o.key, h.key)),
  );
  return [...new Set(kept.map((h) => h.key))];
}

/** ¿Alguno de los nombres de `outer` contiene alguno de los de `inner`? */
function nameContains(outer: string, inner: string): boolean {
  const a = BY_KEY.get(outer);
  const b = BY_KEY.get(inner);
  if (!a || !b) return false;
  return a.words.some((w) => b.words.some((v) => w.includes(v)));
}

/** El veredicto sobre un musculo acreditado en un movimiento. */
export interface FunctionReading {
  movementId: string;
  muscleId: string;
  muscleName: string;
  role: MuscleRefLike['role'];
  /** Los gestos que el movimiento pide (el suyo y, si lo tiene, el del arco inverso). */
  wanted: string[];
  /** Los gestos que la ficha del musculo declara. */
  declared: string[];
  /** La ficha le atribuye el gesto del movimiento. */
  supports: boolean;
  /** La ficha le atribuye EL CONTRARIO y no el del movimiento. */
  contradicts: boolean;
  /** El contrario del gesto que el movimiento pide, si lo tiene. */
  opposites: string[];
  /** La ficha no declara ninguna accion: no se puede juzgar. */
  noActions: boolean;
}

/**
 * Lee un movimiento y devuelve un veredicto por musculo acreditado.
 *
 * El arco del laboratorio recorre el gesto Y SU CONTRARIO (la flexion sigue
 * hasta la extension), asi que los musculos del arco inverso son los del gesto
 * contrario y hay que juzgarlos contra ESE. Por eso `wanted` lleva los dos y el
 * veredicto se calcula por fase.
 */
export function readMovementFunctions(
  movement: MovementLike,
  muscles: readonly MuscleLike[],
): FunctionReading[] {
  const byId = new Map(muscles.map((m) => [m.id, m]));
  const elevation = isArmElevation(movement);
  const out: FunctionReading[] = [];

  const blocks: { gestures: string[]; refs: MuscleRefLike[] }[] = [];
  const own = gesturesIn(movement.name);
  for (const ph of movement.phases) blocks.push({ gestures: own, refs: ph.muscles });
  if (movement.reverseArc) {
    const rev = gesturesIn(movement.reverseArc.name);
    for (const ph of movement.reverseArc.phases) blocks.push({ gestures: rev, refs: ph.muscles });
  }

  // LAS ENVOLVENTES SON LA TERCERA ACREDITACION, Y LA QUE SE VE. El panel
  // prefiere `activations[].role` al de la fase, asi que una envolvente sin
  // revisar es un rotulo equivocado en pantalla aunque la fase este bien. Y el
  // TRAMO NEGATIVO de un arco bidireccional es el gesto CONTRARIO: ahi se juzga
  // contra el opuesto, que es lo que `roleWhenNegative` dice.
  const acts = movement.activations ?? [];
  if (acts.length > 0) {
    blocks.push({
      gestures: own,
      refs: acts.map((a) => ({ muscleId: a.muscleId, role: a.role, note: a.note })),
    });
    const opp = own.map((g) => BY_KEY.get(g)?.opposite).filter((g): g is string => !!g);
    const neg = acts.filter((a) => !!a.roleWhenNegative);
    if (opp.length > 0 && neg.length > 0) {
      blocks.push({
        gestures: opp,
        refs: neg.map((a) => ({
          muscleId: a.muscleId,
          role: a.roleWhenNegative!,
          note: a.note,
        })),
      });
    }
  }

  const seen = new Set<string>();
  for (const b of blocks) {
    for (const ref of b.refs) {
      const key = `${b.gestures.join('+')}|${ref.muscleId}|${ref.role}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const mu = byId.get(ref.muscleId);
      // Un id que no resuelve es otro problema, y ya lo vigila su propio test.
      if (!mu) continue;
      // CADA CAMPO POR SEPARADO, no concatenados. La ficha del plantar delgado
      // declara «Rodilla | Flexion» con la nota «asistente debil de la flexion
      // de rodilla y la flexion plantar»: concatenados, «flexion plantar» es un
      // nombre mas largo que «flexion» y la regla de la aguja larga se comia la
      // flexion de rodilla que el campo decia con todas las letras.
      const declared = [
        ...new Set(
          (mu.actions ?? []).flatMap((a) => [
            ...gesturesIn(a.movement),
            ...(a.note ? gesturesIn(a.note) : []),
          ]),
        ),
      ];
      const viaGirdle = elevation
        ? b.gestures.flatMap((g) => GIRDLE_SUPPORTS[g] ?? []).some((g) => declared.includes(g))
        : false;
      const supports = b.gestures.some((g) => declared.includes(g)) || viaGirdle;
      const opposites = b.gestures
        .map((g) => BY_KEY.get(g)?.opposite)
        .filter((g): g is string => !!g);
      out.push({
        movementId: movement.id,
        muscleId: mu.id,
        muscleName: mu.name,
        role: ref.role,
        wanted: b.gestures,
        declared,
        supports,
        contradicts: !supports && opposites.some((g) => declared.includes(g)),
        opposites,
        noActions: (mu.actions ?? []).length === 0,
      });
    }
  }
  return out;
}

/**
 * LO QUE CUENTA COMO DEFECTO.
 *
 * Un ESTABILIZADOR no produce el movimiento — eso es lo que significa la
 * palabra —, asi que su ficha no tiene por que atribuirselo: el manguito
 * rotador estabiliza la abduccion sin abducir. Un MOTOR PRINCIPAL si, siempre.
 * Un ASISTENTE tambien, porque asistir es aportar al gesto, aunque sea poco.
 *
 * Y la contradiccion es peor que la ausencia: un motor al que su ficha solo le
 * atribuye el gesto CONTRARIO es un error del que se puede dar el nombre.
 */
export function isFunctionDefect(r: FunctionReading): boolean {
  if (r.role === 'stabilizer') return false;
  // UN FRENO ES UN ANTAGONISTA, y eso se comprueba al reves. El erector frena la
  // flexion del tronco justo porque es el extensor: exigirle que su ficha
  // declare la flexion seria exigirle que deje de ser un freno. Lo que si se
  // puede exigir es que SEA el antagonista — que su ficha declare el gesto
  // contrario —, porque un musculo que no hace ni el gesto ni el contrario no
  // tiene nada que frenar ahi.
  if (r.role === 'eccentric-control') {
    if (r.opposites.length === 0) return !r.supports;
    return !r.opposites.some((g) => r.declared.includes(g));
  }
  return !r.supports;
}
