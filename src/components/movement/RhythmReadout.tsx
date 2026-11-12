// src/components/movement/RhythmReadout.tsx
//
// The movement lab's clinical READOUT: the top half of the left margin. It is
// the single home for the "support" content a physio reads while the joint
// sweeps, styled after the Universite Lyon anatomie3d "intervencion de los
// segmentos oseos en los 4 sectores" plates:
//
//   1. SECTOR GONIOMETER. A goniometer dial mapped to the movement's own signed
//      arc, with the clinical PHASES drawn as sectors (dividers + the active
//      sector lit), a pointer, the 0 neutral tick and the signed angle.
//   2. PROTAGONIST MUSCLE. The muscle carrying the movement right now, its role
//      and live recruitment %.
//   3. HUMERO-ESCAPULO-RAQUIDEO RHYTHM (shoulder elevation only). The cumulative
//      split of the elevation between glenohumeral (humero), scapula and trunk
//      (raquis) at the current angle, as a proportion bar + degrees + ratio --
//      exactly the Lyon "proporciones de intervencion" idea. The knee, the neck
//      and the lumbar spine have their own equivalent.
//   4. RECRUITMENT. Every muscle of the movement with its live level.
//
// READ-ONLY: it subscribes to the SAME rigChannel the controller drives
// (movementId + side + signed angleDeg) and recomputes everything with the SAME
// pure helpers (shoulderChain / romActivation / romPhaseAtAngle), so it never
// invents a claim and never drifts from the glow on the model. Renders null in
// the rest pose.
//
// -----------------------------------------------------------------------------
// FORMA: SISTEMA LAMINA (docs/sistema-lamina.md). NI UNA CAJA.
// -----------------------------------------------------------------------------
// La lectura tiene DOS partes, y la frontera entre ellas es lo que hace que
// quepa en un portatil:
//
//   FIJA      lo que no puede perderse nunca: el gesto, el goniometro con su
//             cifra, la fase y el musculo protagonista. Mide lo mismo en todo el
//             arco, asi que nada salta mientras el gesto corre.
//   CUERPO    todo lo demas, en un cuerpo que se DESPLAZA: el reparto articular,
//             el reclutamiento musculo a musculo, las notas clinicas, la prosa
//             de la fase y sus fuentes.
//
// Antes no habia cuerpo que desplazar. El panel flotaba sobre el modelo y era
// `pointer-events: none` para dejar girar el cuerpo por debajo, asi que lo que
// no cabia se TIRABA segun el alto de la ventana: por debajo de 850 px no se
// nombraba a ningun musculo salvo el protagonista, y por debajo de 780 no habia
// prosa. Acoplado al margen ya no tapa nada, puede recibir el raton y puede
// tener scroll: a cualquier alto esta todo, y lo esencial arriba.
//
// Y aquel `pointer-events: none` tenia un defecto que nadie veia: se hereda.
// Los nombres de los musculos son botones ("ver este musculo solo") y ninguno
// lo anulaba, asi que NUNCA recibieron un clic. La lectura decia en su `title`
// "Ver este musculo solo en el modelo" y no lo hacia.
//
// UI strings Spanish LATAM; code/ids ASCII; no `any`.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { rigChannel, type RigCommand, type RigDemoInfo } from './RigModel';
import { movementById } from '../../data/romByRegion';
import { getBoneControl, rigSideFor, type Side } from '../../lib/boneMap';
import { shoulderChain } from '../../lib/biomech/shoulderChain';
import { kneeScrewHome, type ScrewHomeZone } from '../../lib/biomech/kneeCoupling';
import { cervicalRotationSplit } from '../../lib/biomech/cervicalCoupling';
import { lumbopelvicRhythm, LUMBOPELVIC_PELVIS_POSED } from '../../lib/biomech/lumbarCoupling';
import {
  buildLabArc,
  phaseAtAngleIn,
  muscleNameById,
} from '../../lib/romPhaseAtAngle';
import {
  ACTIVE_EPS,
  activeMusclesAt,
  hasActivations,
  type ActiveMuscle,
} from '../../lib/romActivation';
import { ROM_ROLE_LABEL, type RomMuscleRole } from '../../types/rom';
import { ROLE_ORDER, ROLE_TONE_CSS } from '../../lib/romRolePalette';
import { getReference } from '../../data/references';
import type { Citation } from '../../types/muscleContent';
import { pathologyById } from '../../data/pathologies';
import { musclesForRomLookup } from '../../data/musclesByRegion';
import { dissectChannel, type DissectState } from './dissectChannel';
import { ChevronDownIcon } from '../ui/Icons';

/**
 * LO QUE MIDE LA PARTE FIJA DE LA LECTURA, en px, en una ventana baja.
 *
 * Es la cifra de la que sale el tope de alto de la consola (MovementControls):
 * la consola no encoge, asi que lo que ella no ocupa es lo que le queda a esto.
 *
 *    54   cabecera: 12 de aire, el gesto (15 px a 1,25 = 19), la articulacion
 *         (11 px a 1,5 = 17), 2 entre ambas y 4 debajo
 *    66   goniometro: 62 de dial y 4 de aire
 *    19   la fase: una linea de 12 px a 1,25 y 4 de aire
 *    66   protagonista: 6 de aire, cabecera de seccion (20 + 6), nombre y cifra
 *         (24) y 10 debajo
 *    27   el aviso de que es un modelo: el filo, 12 de aire y una linea
 *   ---
 *   232
 *
 * Un nombre de gesto o de musculo que parta en dos lineas suma 19 o 21 px; para
 * eso esta la holgura del tope. `leftMargin.test.ts` comprueba la cuenta contra
 * el tope de la consola en todo alto de ventana.
 */
export const READOUT_ESSENTIAL_PX = 232;

/**
 * EL PROTAGONISTA ES EL QUE LLEVA EL GESTO, NO EL QUE MAS CIFRA TIENE.
 *
 * Se tomaba el primero de la lista, que va ordenada por nivel: el musculo mas
 * reclutado, tenga el papel que tenga. MEDIDO grado a grado en los 34 arcos
 * (3.744 grados): en 13 de ellos el rotulo "Musculo protagonista" nombraba a
 * uno que el propio dato no llama motor.
 *   - Abduccion del hombro, de -7° a -4° (tramo de aduccion): "Subescapular,
 *     estabilizador, 36%", con el pectoral mayor (motor) al 35..26% y el dorsal
 *     ancho (motor) al 32..25%. El subescapular esta ahi sujetando la cabeza
 *     del humero; quien aduce el brazo es el pectoral.
 *   - Supinacion, de 82° a 90°: "Biceps braquial, asistente, 86..90%", con el
 *     supinador (motor) al 84..85%. La nota del propio dato dice del supinador
 *     "motor constante de la supinacion en cualquier angulo".
 *
 * Asi que el protagonista es el MOTOR mas reclutado, o el FRENO excentrico, que
 * en una flexion de tronco es quien lleva la fase (ver ROLE_ORDER). Solo si en
 * ese grado no trabaja ninguno de los dos lo es el mas reclutado, con su papel
 * escrito al lado. En esos 13 grados la diferencia de nivel nunca pasa de 0,05;
 * `leftMargin.test.ts` vigila que un dato futuro no convierta esta regla en
 * nombrar protagonista a un motor casi apagado.
 */
export function pickProtagonist(live: readonly ActiveMuscle[]): ActiveMuscle | null {
  return (
    live.find((m) => m.role === 'prime-mover' || m.role === 'eccentric-control') ??
    live[0] ??
    null
  );
}

/**
 * QUE ROTULA LA TARJETA DE UN DEMO: UNA POSICION O UN RECORRIDO.
 *
 * Casi todas las maniobras salen del reposo, llegan a una posicion y la
 * sostienen: lo que hay que leer es ESA posicion ("Posicion de prueba 90°").
 *
 * En un arco compartido no. En el codo y en la rodilla la flexion y la
 * extension recorren un solo arco (`arcFrom: 'max'` en boneMap): 0° es la
 * articulacion estirada, la extension ABRE doblada y vuelve hacia 0. La tarjeta
 * rotulaba un solo numero, y era cualquiera de los dos extremos segun quien la
 * rellenara: el panel de tests manda la posicion que se sostiene (0) y el
 * neurologico el extremo doblado (120 en el miotoma C7, 90 en L3). O sea
 * "Posicion de prueba 0°" sobre un codo que se ve doblarse 10 grados, o
 * "Posicion de prueba 120°" sobre uno que se para a proposito en 0. Lo que
 * pasa es un RECORRIDO, y se rotula como tal: "120° → 0°".
 *
 * `peakDeg` es el angulo mas alto que el demo ha mandado al rig, que es su
 * extremo doblado; `targetDeg` cubre el primer fotograma del panel neurologico,
 * que abre en 0 y salta al extremo en el siguiente. Con animacion reducida el
 * panel de tests no recorre nada (pone el 0 y lo deja): ahi sigue siendo una
 * posicion.
 */
export function demoArcReading(
  sharedArc: boolean,
  peakDeg: number,
  targetDeg: number,
): { kicker: string; value: string } {
  if (sharedArc) {
    const from = Math.round(Math.max(peakDeg, targetDeg));
    if (from > 0) return { kicker: 'Recorrido de prueba', value: `${from}° → 0°` };
    return { kicker: 'Posición de prueba', value: '0°' };
  }
  return { kicker: 'Posición de prueba', value: `${grados(targetDeg)}°` };
}

/** "-30" con el signo menos tipografico, como en la lectura del escenario. */
function grados(n: number): string {
  const r = Math.round(n);
  return r < 0 ? `−${Math.abs(r)}` : String(r);
}

const SIDE_SHORT: Record<Side, string> = { R: 'Der.', L: 'Izq.' };

// Knee screw-home zones: label + clinical note. The zone is a WORD; the bar
// carries the degrees.
const SCREW_ZONE: Record<ScrewHomeZone, { label: string; note: string }> = {
  locked: {
    label: 'Bloqueada',
    note: 'Rotación externa tibial máxima: los cruzados se tensan y bloquean la rodilla (bipedestación casi sin esfuerzo muscular).',
  },
  unlocking: {
    label: 'Desbloqueando',
    note: 'El poplíteo rota la tibia internamente y deshace el tornillo para que arranque la flexión.',
  },
  free: {
    label: 'Libre',
    note: 'Pasados los ~30°, el tornillo ya está deshecho: la rotación acoplada es mínima y la rotación tibial pasa a ser voluntaria.',
  },
};

/** Short source label from a phase's citations, e.g. "Kapandji, Oatis". Dedups
 *  and takes the lead surname so the section can name its source honestly
 *  without a full Vancouver string. */
function citeLabel(cites: Citation[]): string {
  const names: string[] = [];
  for (const c of cites) {
    const ref = getReference(c.ref);
    const name = ref ? ref.authors.split(/[ ,]/)[0] : c.ref;
    if (!names.includes(name)) names.push(name);
  }
  return names.join(', ');
}

// LOS TONOS DE UN REPARTO. Una barra partida necesita distinguir sus tramos, no
// decir nada con el color: el acento para el primero y dos grises para los
// demas. Eran cian, ambar y esmeralda, y el ambar es justo el tono del MOTOR
// PRINCIPAL en la lista de reclutamiento que va debajo: la escapula y el
// deltoides compartian color sin tener nada que ver.
const SPLIT_TONE = [
  'rgb(var(--c-brand))',
  'rgb(var(--c-fg) / 0.82)',
  'rgb(var(--c-fg3))',
] as const;

// --- Goniometer dial geometry. A top semicircle: t=0 at the left end, t=1 at the
// right, so the pointer sweeps left->right as the angle grows.
const CX = 100;
const CY = 92;
const R = 76;

function polar(t: number, radius: number = R): { x: number; y: number } {
  const tt = t < 0 ? 0 : t > 1 ? 1 : t;
  const th = Math.PI * (1 - tt);
  return { x: CX + radius * Math.cos(th), y: CY - radius * Math.sin(th) };
}

/** Live viewport height: on a short screen the dial and the notes tighten. */
function useViewportHeight(): number {
  const [h, setH] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 900,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const on = () => setH(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return h;
}

/** SVG arc path along the dial radius between two fractions (both <= a semicircle). */
function arcPath(t0: number, t1: number, radius: number = R): string {
  const a = polar(t0, radius);
  const b = polar(t1, radius);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/** One segment of a "reparto" split bar. */
interface SplitSeg {
  label: string;
  /** Contribution in degrees (shown in the legend). */
  deg: number;
  /** Share 0..100 (bar width). */
  pct: number;
}

/** La barra partida y su leyenda: un tramo por segmento, con sus grados. */
function SplitBar({ segs }: { segs: SplitSeg[] }): JSX.Element {
  return (
    <>
      <div className="flex h-[3px] w-full gap-px bg-line" aria-hidden="true">
        {segs.map((s, i) => (
          <span
            key={s.label}
            className="h-full transition-[width] duration-150"
            style={{ width: `${s.pct}%`, backgroundColor: SPLIT_TONE[i] }}
          />
        ))}
      </div>
      <dl className="mt-2 flex items-baseline justify-between gap-2">
        {segs.map((s, i) => (
          <div key={s.label} className="flex items-baseline gap-1.5">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 -translate-y-px"
              style={{ backgroundColor: SPLIT_TONE[i] }}
            />
            <dt className="text-[11px] text-fg2">{s.label}</dt>
            <dd className="num text-xs font-medium text-fg">{Math.round(s.deg)}°</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/**
 * Seccion de un reparto en dos segmentos (barra + leyenda + nota + fuente): la
 * que comparten el reparto cervical C1-C2 y el ritmo lumbopelvico.
 */
function SegmentSplit({
  title,
  ratio,
  segs,
  note,
  source,
  notPosed,
}: {
  title: string;
  ratio?: string;
  segs: SplitSeg[];
  note?: string;
  source: string;
  /**
   * Aviso cuando uno de los dos segmentos NO se mueve en el 3D. Una cifra al
   * lado de un modelo que no la hace, sin decirlo, hace creer al alumno que ha
   * visto el gesto completo. Hoy solo lo lleva la pelvis del ritmo lumbopelvico
   * (ver la cabecera de biomech/lumbarCoupling): el rig no tiene la cadera como
   * articulacion, asi que la pelvis no puede bascular sin romper la nalga.
   */
  notPosed?: string;
}): JSX.Element {
  return (
    <section className="sec">
      <div className="sec-head">
        <span className="kicker min-w-0 leading-[1.35]">{title}</span>
        <span className="sec-rule" />
        {ratio && <span className="num shrink-0 text-[11px] font-medium text-fg">{ratio}</span>}
      </div>
      <SplitBar segs={segs} />
      {notPosed && <p className="note note-warn mt-2">{notPosed}</p>}
      {note && <p className="mt-2 text-[11px] leading-snug text-fg2">{note}</p>}
      <p className="num mt-2 text-[10px] text-fg3">Fuente: {source}</p>
    </section>
  );
}

interface RhythmReadoutProps {
  region: string | null;
  /**
   * True when this readout is the TOP SECTION of the left margin (the console
   * is the bottom section). Embedded, it drops its own panel chrome and fills
   * the height the console leaves, so its foot note sits on the filo between
   * the two and the body in between is what scrolls.
   */
  embedded?: boolean;
  /**
   * EL ESCENARIO YA LEE EL GESTO. Con la lectura sobre el cuerpo (StageReadout:
   * el gesto, el plano, el lado, el angulo en grande y la fase; LabCallouts: los
   * musculos con su porcentaje), la cabecera, el goniometro y la tarjeta del
   * protagonista de este margen decian lo mismo por segunda vez, en pequeno y
   * lejos del cuerpo. Con `stageReads` el margen se queda con lo que el
   * escenario NO dice: que pasa en esta fase y por que, los avisos clinicos, el
   * ritmo y el reclutamiento entero. Es como se monta en escritorio.
   */
  stageReads?: boolean;
}

export function RhythmReadout({ region, embedded = false, stageReads = false }: RhythmReadoutProps) {
  const [cmd, setCmd] = useState<
    Pick<RigCommand, 'movementId' | 'side' | 'angleDeg' | 'pathologyId' | 'demo'>
  >(() => {
    const c = rigChannel.get();
    return {
      movementId: c.movementId,
      side: c.side,
      angleDeg: c.angleDeg,
      pathologyId: c.pathologyId ?? null,
      demo: c.demo ?? null,
    };
  });
  useEffect(() => {
    return rigChannel.subscribe((c) =>
      setCmd((prev) =>
        prev.movementId === c.movementId &&
        prev.side === c.side &&
        prev.angleDeg === c.angleDeg &&
        (prev.pathologyId ?? null) === (c.pathologyId ?? null) &&
        (prev.demo ?? null) === (c.demo ?? null)
          ? prev
          : {
              movementId: c.movementId,
              side: c.side,
              angleDeg: c.angleDeg,
              pathologyId: c.pathologyId ?? null,
              demo: c.demo ?? null,
            },
      ),
    );
  }, []);

  const [dissect, setDissect] = useState<DissectState>(() => dissectChannel.get());
  useEffect(() => dissectChannel.subscribe(setDissect), []);

  const movement = useMemo(() => movementById(cmd.movementId), [cmd.movementId]);
  const control = cmd.movementId ? getBoneControl(cmd.movementId) : undefined;
  const drivable = !!movement && !!control && control.kind !== 'unsupported';
  const isSpine = control?.kind === 'spine';
  const isChain = control?.kind === 'chain';
  // Why the model is not standing at anatomical zero. Shoulder rotation opens
  // with the elbow at 90 because that is the position it is READ in, and a user
  // who is not told that just sees a bent elbow they did not ask for.
  //
  // ALL of them, not just the first. Pronosupination holds two -- the elbow at
  // 90 and the forearm in neutral -- and showing only the first left the more
  // surprising half unexplained: a hand opening on edge rather than palm up.
  const examPostures = control?.kind === 'joint' ? (control.posture ?? []) : [];
  const arc = useMemo(() => (movement ? buildLabArc(movement) : null), [movement]);
  const muscleRegion = movement?.region ?? region ?? 'shoulder';
  const angle = cmd.angleDeg;
  // P1: active pathological preset (null = Normal). Alters the rhythm below.
  const pathology = pathologyById(cmd.pathologyId);

  const at = arc ? phaseAtAngleIn(arc.phases, angle) : null;

  // EL RECLUTAMIENTO, DOS VECES ORDENADO.
  //
  //   `live`  los que trabajan en este grado, el mas reclutado primero. Es lo
  //           mismo que la consola empuja al brillo de la escena.
  //   `rows`  TODOS los musculos del movimiento, en el orden en que el dato los
  //           escribe, trabajen o no. Es lo que se pinta.
  //
  // La lista se pintaba en el orden de `live`, y eso la hacia ilegible justo
  // cuando mas se mira: MEDIDO, en un barrido de la flexion del hombro la lista
  // cambia de composicion o de orden 27 veces, y 22 en la abduccion. Cada fila
  // saltaba de sitio mientras su cifra cambiaba. Con un orden fijo y todas las
  // filas presentes no se mueve nada: solo crecen y menguan las barras, y se ve
  // ENTRAR a un musculo (el serrato y el trapecio pasan de 0 a partir de los
  // 30° de abduccion) en vez de verlo aparecer.
  //
  // `measured` dice si las cifras salen de una envolvente. Sin envolventes solo
  // se sabe QUIEN trabaja en la fase, no cuanto: se pinta el papel y ninguna
  // cifra. (Hoy los 34 movimientos traen envolventes; antes ese caso imprimia
  // "100%" para todos.)
  const { live, rows, measured } = useMemo((): {
    live: ActiveMuscle[];
    rows: ActiveMuscle[];
    measured: boolean;
  } => {
    if (!movement) return { live: [], rows: [], measured: false };
    if (hasActivations(movement)) {
      // Umbral -1: todos, tambien los callados.
      const all = activeMusclesAt(movement, angle, -1);
      const order = new Map((movement.activations ?? []).map((a, i) => [a.muscleId, i]));
      return {
        live: all.filter((m) => m.level > ACTIVE_EPS),
        rows: [...all].sort(
          (a, b) => (order.get(a.muscleId) ?? 0) - (order.get(b.muscleId) ?? 0),
        ),
        measured: true,
      };
    }
    const phase = arc ? phaseAtAngleIn(arc.phases, angle) : null;
    const rank: Record<RomMuscleRole, number> = {
      'prime-mover': 0,
      // El freno va junto al motor: en una flexion de tronco es EL protagonista,
      // y enterrarlo detras de los asistentes seria contar la fase al reves.
      'eccentric-control': 1,
      assistant: 2,
      stabilizer: 3,
    };
    const list = (phase?.phase.muscles ?? [])
      .map((m) => ({ muscleId: m.muscleId, role: m.role, level: 1, note: m.note }))
      .sort((a, b) => rank[a.role] - rank[b.role]);
    return { live: list, rows: list, measured: false };
  }, [movement, angle, arc]);

  // Humero-escapulo-raquideo split (cumulative at the current angle). Only the
  // shoulder elevation chain decomposes this, and only above neutral.
  const rhythm = useMemo(() => {
    if (!isChain || angle <= 0) return null;
    // EL TRONCO SOLO PARTICIPA DONDE EL RIG LO MUEVE. La abduccion toma prestada
    // una inclinacion contralateral del raquis; la flexion no, y su control no
    // tiene objetivos en el raquis. Se lee del propio mapa en vez de nombrar el
    // movimiento, para que anadir una elevacion no vuelva a desincronizar el
    // reparto publicado de lo que el hueso hace.
    const opts = {
      trunkLean:
        (control as { targets?: { target: { armature: string } }[] } | null | undefined)
          ?.targets?.some((t) => t.target.armature === 'spine') ?? false,
    };
    const r = shoulderChain(angle, rigSideFor(cmd.side), pathology?.shoulderMod, opts).readout;
    const gh = Math.max(0, r.ghDeg);
    const sc = Math.max(0, r.scapulaDeg);
    const tr = Math.max(0, r.trunkDeg);
    const total = gh + sc + tr;
    if (total <= 0) return null;
    // When a pathology is active, keep the NORMAL ratio at this angle as a
    // reference so the alteration reads as "X:1 vs normal Y:1".
    const normalRatio = pathology
      ? shoulderChain(angle, rigSideFor(cmd.side), undefined, opts).readout.ratio
      : null;
    // WHERE THE SCAPULAR SHARE COMES FROM. The blade does not turn on the chest:
    // it turns because the clavicle elevates at the sternoclavicular joint AND the
    // blade turns on the clavicle at the acromioclavicular. Splitting the girdle
    // was what fixed the rig ("no se mueve en conjunto"), and the same two numbers
    // are the biomechanics a physio wants to read while the arm goes up.
    const chain = shoulderChain(angle, rigSideFor(cmd.side), pathology?.shoulderMod, opts);
    const R2D = 180 / Math.PI;
    const scTotal = chain.scapulothoracicUpwardRot * R2D;
    // The readout's scapular figure is rescaled once the trunk joins in (>150),
    // so carry that same scaling into the two joints or they would not add up to
    // the number printed right next to them.
    const scale = scTotal > 0.01 ? sc / scTotal : 0;
    const girdle = {
      sternoclavicularDeg: chain.clavicleElevation * R2D * scale,
      acromioclavicularDeg: chain.scapulaUpwardRot * R2D * scale,
    };
    return {
      gh,
      sc,
      // La rotacion ascendente de la paleta EN SU PROPIO PLANO, que es la cifra
      // de los libros (~60 grados a 180). `sc` es su proyeccion sobre el plano en
      // que se mide el brazo, y es siempre menor: sin decirlo, un alumno que ha
      // leido "60 grados" ve 51 y cree que el modelo esta mal.
      scPlane: Math.max(0, r.scapulaPlaneDeg),
      tr,
      girdle,
      ratio: r.ratio,
      normalRatio,
      ghPct: (gh / total) * 100,
      scPct: (sc / total) * 100,
      trPct: (tr / total) * 100,
    };
  }, [isChain, angle, cmd.side, pathology, control]);

  // Knee screw-home coupling (the knee's "rhythm equivalent"): the automatic tibial
  // rotation locked to sagittal flexion/extension. Only for the knee sagittal
  // gestures; the transverse tibial-rotation movements don't show it.
  const isKneeSagittal =
    cmd.movementId === 'knee-flexion' || cmd.movementId === 'knee-extension';
  const screwHome = useMemo(
    () => (isKneeSagittal ? kneeScrewHome(angle) : null),
    [isKneeSagittal, angle],
  );

  // Cervical rotation split (atlanto-axial vs subaxial) and lumbopelvic rhythm —
  // the "rhythm equivalents" for the neck and the trunk. Each only on its gesture.
  const cervicalSplit = useMemo(
    () => (cmd.movementId === 'cervical-rotation' ? cervicalRotationSplit(angle) : null),
    [cmd.movementId, angle],
  );
  const lumboPelvic = useMemo(
    () => (cmd.movementId === 'lumbar-flexion' ? lumbopelvicRhythm(angle) : null),
    [cmd.movementId, angle],
  );

  // Read viewport height BEFORE any early return so hook order stays stable.
  const vh = useViewportHeight();

  // La explicacion de la postura de exploracion se pliega. `null` = lo que
  // toque por el alto de la ventana; un clic lo fija.
  const [postureOpen, setPostureOpen] = useState<boolean | null>(null);

  // A maneuver is being DEMONSTRATED (orthopedic test / myotome). While it runs
  // the angle sweeps, so every per-angle reading below — the sector, the rhythm,
  // the recruited muscles and their percentages — would recompute on every frame
  // and be unreadable. The panel switches to a FIXED description of the maneuver
  // instead; the dial keeps showing the live angle, because motion is what a dial
  // is for.
  const demo: RigDemoInfo | null = cmd.demo ?? null;

  // El angulo mas alto que ESTE demo ha puesto en el rig (ver demoArcReading).
  // Se compara por identidad: el objeto del demo se construye una vez por
  // maniobra, no por fotograma. Solo sube, asi que repetir el render no lo
  // cambia.
  const demoPeakRef = useRef<{ demo: RigDemoInfo | null; peak: number }>({ demo: null, peak: 0 });
  if (demoPeakRef.current.demo !== demo) demoPeakRef.current = { demo, peak: demo ? angle : 0 };
  else if (demo && angle > demoPeakRef.current.peak) demoPeakRef.current.peak = angle;

  if (!drivable || !arc || !movement) return null;

  // With no activation data the panel still carries the gesture and the dial;
  // only the muscle sections drop out.
  const hero = pickProtagonist(live);

  // LA LEYENDA DEL CONTORNO. El papel de cada musculo se dibuja en el BORDE de
  // su malla, no en su carne (src/lib/rigRim.ts explica por que con la
  // medicion), asi que sin esta fila el color del borde no se puede traducir.
  //
  // Lleva los papeles que el movimiento usa EN TODO SU ARCO, no solo los de
  // este grado: asi la fila mide lo mismo de punta a punta del barrido (antes
  // ganaba y perdia una linea al entrar un papel nuevo) y un papel sin nadie
  // trabajando se queda en su sitio, atenuado y con un 0.
  const rolesHere = ROLE_ORDER.filter(
    (role) =>
      rows.some((m) => m.role === role) ||
      (movement.activations ?? []).some((a) => a.role === role || a.roleWhenNegative === role),
  );
  const roleCounts = rolesHere.map((role) => ({
    role,
    n: live.reduce((acc, m) => acc + (m.role === role ? 1 : 0), 0),
  }));

  // ISOLATE FROM THE READOUT. The panel names the muscle working at this angle;
  // until now that was a dead end -- to see it alone you had to find it on the rig
  // and click it, mid-movement. Clicking the NAME isolates it, and clicking the
  // isolated one again brings everything back.
  // musclesForRomLookup, not the static registry: premium regions get their
  // catalogue at runtime, and this is the same universe the ROM phases resolve
  // names against, so a muscle the panel can NAME is a muscle it can isolate.
  const recordFor = (muscleId: string) =>
    musclesForRomLookup(muscleRegion).find((m) => m.id === muscleId);
  const isolateByName = (muscleId: string) => {
    const record = recordFor(muscleId);
    if (!record?.meshBases?.length) return;
    dissectChannel.isolateMuscle(muscleId, record.name, record.meshBases);
  };
  /** True when this muscle is the one currently shown alone. */
  const isIsolated = (muscleId: string) => dissect.isolated?.id === muscleId;
  /** A muscle can only be isolated if the catalogue knows which meshes are its. */
  const canIsolate = (muscleId: string) => !!recordFor(muscleId)?.meshBases?.length;

  // On laptop-height screens the readout shares its column with the console, so
  // the dial is smaller and the foot note is one line instead of two.
  const compact = vh < 860;
  const showPosture = postureOpen ?? vh >= 860;

  const gestureName =
    angle < 0 && movement.labReverse ? movement.labReverse.name : movement.name;

  const sharedArc = control?.kind === 'joint' && control.arcFrom === 'max';
  const demoReading = demo
    ? demoArcReading(sharedArc, demoPeakRef.current.peak, demo.targetDeg)
    : null;

  // Dial mapping.
  const span = arc.max - arc.min;
  const t = span === 0 ? 0 : (angle - arc.min) / span;
  const clampT = t < 0 ? 0 : t > 1 ? 1 : t;
  const knob = polar(clampT, R);
  // UN PUNTERO EN EL BORDE, NO UNA AGUJA DESDE EL CENTRO. La cifra va sentada
  // en la boca del dial, y una aguja que sale del eje la cruza de lado a lado
  // en la mitad del arco: el numero que mas se mira, tachado.
  const pointerIn = polar(clampT, R - 24);
  const pointerOut = polar(clampT, R - 9);
  const bidir = arc.min < 0 && arc.max > 0;
  const neutralT = bidir ? (0 - arc.min) / span : null;
  const neutralInner = neutralT != null ? polar(neutralT, R - 6) : null;
  const neutralOuter = neutralT != null ? polar(neutralT, R + 8) : null;

  // Phase sectors along the dial.
  const sectorT = (deg: number) => (span === 0 ? 0 : (deg - arc.min) / span);

  // Lo que queda por debajo del pliegue se desvanece en vez de cortarse: una
  // linea partida se lee como un fallo, un degradado como "hay mas". El cuerpo
  // acaba en 12 px de aire, asi que al llegar al final el degradado cae sobre
  // nada.
  const fade: CSSProperties = {
    maskImage: 'linear-gradient(180deg, #000 calc(100% - 14px), transparent)',
    WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 14px), transparent)',
  };

  const nameOf = (muscleId: string) => muscleNameById(muscleRegion, muscleId);

  // LA FASE, entera: su nombre, SU tramo y lo que pasa en ella. La cifra que
  // hubo aqui era el arco completo, no el tramo de la fase, y al lado del nombre
  // de un sector se leia como una contradiccion; esta es la del sector.
  //
  // Con `stageReads` va PRIMERA y con letra de lectura (el nombre de la fase y
  // el angulo ya estan en el escenario; esto es el porque, y se lee entero).
  const phaseSection =
    at && !demo ? (
      <section className="sec">
        <div className="sec-head">
          <span className="kicker">
            {stageReads
              ? 'Qué pasa ahora'
              : at.total > 1
                ? `Fase ${at.index + 1} de ${at.total}`
                : 'Fase'}
          </span>
          <span className="sec-rule" />
          <span className="num shrink-0 text-[11px] text-fg3">
            {grados(at.phase.startDeg)}° a {grados(at.phase.endDeg)}°
          </span>
        </div>
        <p
          className={`font-semibold leading-snug text-fg ${
            stageReads ? 'font-display text-[15px]' : 'text-xs'
          }`}
        >
          {at.phase.label}
        </p>
        {at.phase.description && (
          <p
            className={`mt-1.5 text-fg2 ${
              stageReads ? 'text-[13px] leading-relaxed' : 'text-[11px] leading-snug'
            }`}
          >
            {at.phase.description}
          </p>
        )}
        {/* Source of the sector claim (honest attribution, not a footnote). */}
        {at.phase.cite.length > 0 && (
          <p className="num mt-2 text-[10px] text-fg3">Fuente: {citeLabel(at.phase.cite)}</p>
        )}
      </section>
    ) : null;

  return (
    // Una columna. Embebida llena el alto que la consola le deja (`flex-1`): la
    // parte fija arriba, el aviso del modelo abajo y, entre los dos, el cuerpo
    // que se desplaza. Nada lleva `pointer-events-none`: los nombres son botones.
    <div
      className={`flex max-h-full min-h-0 w-full flex-col ${
        embedded ? 'flex-1' : 'instrument pointer-events-auto animate-scale-in overflow-hidden'
      }`}
    >
      {/* CABECERA: el gesto, el plano y el lado. Durante un demo el titulo es la
          maniobra y el gesto pasa a la linea de debajo. Con `stageReads` no se
          pinta: lo dice el escenario, en grande y junto al cuerpo. */}
      {!stageReads && (
      <div className="shrink-0 px-4 pb-1 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="line-clamp-2 min-w-0 font-display text-[15px] font-semibold leading-tight text-fg">
            {demo ? demo.label : gestureName}
          </h2>
          <span className="tag shrink-0">
            {demo ? <span className="text-brand">Demostración</span> : movement.plane}
            {!isSpine && (
              <>
                {demo || movement.plane ? ' · ' : ''}
                <span className="text-brand">{SIDE_SHORT[cmd.side]}</span>
              </>
            )}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-fg3">
          {demo ? gestureName : movement.joint}
        </p>
      </div>
      )}

      {/* GONIOMETRO DE SECTOR, con la cifra sentada en su boca. Con
          `stageReads` no: el angulo grande y la regla del arco estan en el
          escenario. */}
      {!stageReads && (
      <div
        className={`relative mx-auto mt-1 w-full max-w-[208px] shrink-0 ${
          compact ? 'h-[62px]' : 'h-[74px]'
        }`}
      >
        <svg viewBox="0 0 200 100" className="h-full w-full" aria-hidden="true">
          {/* Track */}
          <path
            d={arcPath(0, 1)}
            fill="none"
            className="stroke-line"
            strokeWidth={9}
            strokeLinecap="round"
          />

          {/* Active sector (the phase the current angle is in) */}
          {at && (
            <path
              d={arcPath(sectorT(at.phase.startDeg), sectorT(at.phase.endDeg))}
              fill="none"
              className="stroke-brand/35"
              strokeWidth={9}
            />
          )}

          {/* Progress up to the current angle */}
          <path
            d={arcPath(0, 1)}
            fill="none"
            className="stroke-brand"
            strokeWidth={9}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={(1 - clampT) * 100}
            style={{ transition: 'stroke-dashoffset 150ms ease-out' }}
          />

          {/* Sector divider ticks at every phase boundary */}
          {arc.phases.map((p) => {
            const a = polar(sectorT(p.endDeg), R - 5);
            const b = polar(sectorT(p.endDeg), R + 5);
            return (
              <line
                key={`div-${p.endDeg}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="stroke-page"
                strokeWidth={2}
              />
            );
          })}

          {/* Neutral (0 deg) tick */}
          {neutralInner && neutralOuter && (
            <line
              x1={neutralInner.x}
              y1={neutralInner.y}
              x2={neutralOuter.x}
              y2={neutralOuter.y}
              className="stroke-fg2"
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}

          {/* Pointer + knob */}
          <line
            x1={pointerIn.x}
            y1={pointerIn.y}
            x2={pointerOut.x}
            y2={pointerOut.y}
            className="stroke-fg"
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ transition: 'all 150ms ease-out' }}
          />
          <circle
            cx={knob.x}
            cy={knob.y}
            r={5}
            className="fill-brand stroke-page"
            strokeWidth={2}
            style={{ transition: 'all 150ms ease-out' }}
          />
        </svg>

        {/* The signed angle, seated in the dial opening */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
          <span className={`readout ${compact ? 'text-2xl' : 'text-[1.75rem]'}`}>
            {grados(angle)}
            <span className="text-base font-medium text-fg3">°</span>
          </span>
        </div>
      </div>

      )}

      {/* LA FASE, al pie del dial: es el nombre del sector que esta encendido.
          Una linea; el nombre entero, su tramo y su prosa estan en el cuerpo. */}
      {at && !demo && !stageReads && (
        <p
          className="mt-1 shrink-0 truncate px-4 text-center text-xs font-semibold leading-tight text-brand"
          title={at.phase.label}
        >
          {at.phase.label}
        </p>
      )}

      {/* MUSCULO PROTAGONISTA. Nombre y cifra grandes; el papel es una palabra y
          la regla de la izquierda, las dos en su tono. Era un bloque con su
          recuadro, y el papel una ficha de color. */}
      {/* Hidden during a demo: the recruited muscles and their percentages are
          per-angle values, so on a sweep they flicker. The demo section below
          names the structure under test instead, and the model still glows it. */}
      {hero && !demo && !stageReads && (
        <div className="shrink-0 px-4 pb-2.5 pt-1.5">
          <div className="sec-head mb-1.5">
            <span className="kicker">
              {/* A 19rem de margen "MUSCULO PROTAGONISTA" y "FRENO EXCENTRICO"
                  no caben en la misma linea (148 + 109 px de 272). */}
              <span className="hidden xl:inline">Músculo </span>protagonista
            </span>
            <span className="sec-rule" />
            <span className="tag shrink-0" style={{ color: ROLE_TONE_CSS[hero.role] }}>
              {ROM_ROLE_LABEL[hero.role]}
            </span>
          </div>
          <div
            className="flex items-end justify-between gap-3 border-l-2 pl-2.5"
            style={{ borderColor: ROLE_TONE_CSS[hero.role] }}
          >
            {canIsolate(hero.muscleId) ? (
              <button
                type="button"
                onClick={() => isolateByName(hero.muscleId)}
                title={
                  isIsolated(hero.muscleId)
                    ? 'Mostrar el resto otra vez'
                    : 'Ver este músculo solo en el modelo'
                }
                aria-pressed={isIsolated(hero.muscleId)}
                className={`line-clamp-2 min-w-0 flex-1 text-left font-display text-[17px] font-semibold leading-tight underline-offset-4 transition-colors hover:underline ${
                  isIsolated(hero.muscleId) ? 'text-amber-200 underline' : 'text-fg'
                }`}
              >
                {nameOf(hero.muscleId)}
              </button>
            ) : (
              <span className="line-clamp-2 min-w-0 flex-1 font-display text-[17px] font-semibold leading-tight text-fg">
                {nameOf(hero.muscleId)}
              </span>
            )}
            {measured && (
              <span className="readout shrink-0 text-2xl">
                {Math.round(hero.level * 100)}
                <span className="text-xs font-medium text-fg3">%</span>
              </span>
            )}
          </div>
        </div>
      )}

      {!stageReads && <div className="rule" />}

      {/* EL CUERPO: todo lo que no es imprescindible, y se desplaza. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3" style={fade}>
        {/* Con el escenario leyendo el gesto, lo PRIMERO del margen es lo que
            el escenario no dice: que pasa en esta fase y por que. */}
        {stageReads && phaseSection}
        {/* P1: pathological state — what preset is active and WHY it hurts,
            with the implicated structure and its source. Amber = caution. */}
        {pathology && (
          <section className="sec">
            <div className="note note-warn">
              <p className="flex items-baseline gap-2">
                <span className="kicker shrink-0 text-amber-300/80">Patológico</span>
                <span className="min-w-0 text-xs font-semibold text-amber-100">
                  {pathology.name}
                </span>
              </p>
              <p className="mt-1.5 text-amber-100/85">{pathology.whyItHurts}</p>
              {pathology.implicated.length > 0 && (
                <p className="mt-1.5 text-amber-200/70">
                  Estructura clave: {pathology.implicated.map((id) => nameOf(id)).join(', ')}
                </p>
              )}
              <p className="num mt-1.5 text-[10px] text-fg3">
                Fuente: {citeLabel(pathology.cite)}
              </p>
            </div>
          </section>
        )}

        {/* Examination position: why the model does not start at anatomical zero.
            Plegable: se lee una vez. En una ventana baja abre cerrada, porque
            la pronosupinacion trae dos (seis lineas) y se comia el cuerpo. */}
        {examPostures.length > 0 && (
          <section className="sec">
            <button
              type="button"
              onClick={() => setPostureOpen(!showPosture)}
              aria-expanded={showPosture}
              className={`sec-head group w-full text-left ${showPosture ? '' : 'mb-0'}`}
            >
              <span className="kicker transition-colors group-hover:text-fg2">
                Posición de exploración
              </span>
              <span className="sec-rule" />
              <ChevronDownIcon
                size={13}
                className={`shrink-0 text-fg3 transition-transform ${showPosture ? 'rotate-180' : ''}`}
              />
            </button>
            {showPosture &&
              examPostures.map((p) => (
                <p key={p.bone} className="note note-brand mb-1.5 last:mb-0">
                  {p.reason}
                </p>
              ))}
          </section>
        )}

        {/* DEMO. Fixed for the whole maneuver: what position is being held,
            on what structure, and — for a resisted test — where the physio pushes.
            This is what replaces the per-frame analysis while a demo runs. */}
        {demo && demoReading && (
          <section className="sec">
            <div className="sec-head">
              <span className="kicker">{demoReading.kicker}</span>
              <span className="sec-rule" />
              <span className="num shrink-0 text-[13px] font-medium text-brand">
                {demoReading.value}
              </span>
            </div>
            {demo.structure && (
              <p className="text-xs leading-snug text-fg2">
                Evalúa <span className="font-semibold text-fg">{demo.structure}</span>
              </p>
            )}

            {demo.examinerForce === 'resists' && (
              <div className="note note-brand mt-2">
                <span className="tag text-fg2">Prueba resistida</span>
                <ol className="mt-1 space-y-1">
                  <li>1. El paciente sostiene la posición y empuja.</li>
                  <li>
                    2. Aplica resistencia en el segmento distal, donde se apoya la mano
                    del fisio en el modelo.
                  </li>
                </ol>
              </div>
            )}

            {demo.examinerForce === 'applies' && (
              <div className="note note-brand mt-2">
                <span className="tag text-fg2">Prueba pasiva</span>
                <ol className="mt-1 space-y-1">
                  <li>1. El paciente permanece relajado: no empuja.</li>
                  <li>
                    2. La fuerza la aplicas tú donde se apoya la mano del fisio en el
                    modelo.
                  </li>
                </ol>
              </div>
            )}

            {/* LO QUE SE ESTA ENCENDIENDO, con su nombre clinico. Hasta ahora
                el readout decia que se evaluaba una estructura y en la escena no
                se encendia ninguna: 42 de los 65 demos resaltaban nada. */}
            {demo.structureLabels && demo.structureLabels.length > 0 && (
              <p className="mt-2 text-xs leading-snug text-fg2">
                Resaltado:{' '}
                <span className="font-semibold text-fg">{demo.structureLabels.join(' · ')}</span>
              </p>
            )}

            {/* Y LO QUE NO SE PUEDE ENSENAR. Los nervios y los vasos no estan en
                el sistema de capas de este modelo, asi que una prueba de raiz
                nerviosa no puede resaltar su estructura. Decirlo es mejor que
                encender algo parecido y que pase por lo que el libro nombra. */}
            {demo.cannotShow && (
              <p className="mt-2 text-[11px] leading-snug text-fg3">{demo.cannotShow}</p>
            )}

            {/* LA ADVERTENCIA DEL DEMO NO SE RECORTA NUNCA. `demo.note` no es
                prosa de apoyo: es lo que el modelo NO esta ensenando de la
                maniobra. En un portatil de 1366x768 la unica linea que
                explicaba la aproximacion desaparecia con la prosa, que es
                exactamente la pantalla donde mas se agradece. */}
            {demo.note && <p className="mt-2 text-[11px] leading-snug text-fg2">{demo.note}</p>}
          </section>
        )}

        {/* Clinical flag (caution / pearl) of the current sector: a rule on the
            left in its tone, not a tinted band. */}
        {at?.phase.flag && !demo && (
          <section className="sec">
            <div className={`note ${at.phase.flag.tone === 'warn' ? 'note-warn' : 'note-brand'}`}>
              <span
                className={`tag ${at.phase.flag.tone === 'warn' ? 'text-amber-200' : 'text-brand'}`}
              >
                {at.phase.flag.label}
              </span>
              {at.phase.flag.detail && (
                <span className="mt-0.5 block">{at.phase.flag.detail}</span>
              )}
            </div>
          </section>
        )}

        {/* Humero-escapulo-raquideo rhythm (shoulder elevation only) */}
        {rhythm && !demo && (
          <section className="sec">
            <div className="sec-head">
              <span className="kicker min-w-0 leading-[1.35]">Ritmo húmero-escápulo-raquídeo</span>
              <span className="sec-rule" />
              {/* El modelo devuelve una raya cuando la escapula aun no ha girado
                  y la razon no existe: ahi no se pinta ninguna cifra. */}
              {rhythm.ratio !== '—' && (
                <span className="num shrink-0 text-[11px] font-medium text-fg">{rhythm.ratio}</span>
              )}
            </div>
            <SplitBar
              segs={[
                { label: 'Húmero', deg: rhythm.gh, pct: rhythm.ghPct },
                { label: 'Escápula', deg: rhythm.sc, pct: rhythm.scPct },
                { label: 'Tronco', deg: rhythm.tr, pct: rhythm.trPct },
              ]}
            />
            {rhythm.normalRatio && rhythm.normalRatio !== '—' && (
              <p className="num mt-2 text-[11px] text-amber-200/90">
                Ritmo normal en este ángulo: {rhythm.normalRatio}
              </p>
            )}
            {/* The scapular share, opened up into the two joints that produce it.
                Only worth showing once the girdle is actually doing something. */}
            {rhythm.sc > 1 && (
              <p className="mt-2 text-[11px] leading-snug text-fg3">
                De la escápula:{' '}
                <span className="num text-fg">
                  {Math.round(rhythm.girdle.sternoclavicularDeg)}°
                </span>{' '}
                esternoclavicular (la clavícula se eleva) y{' '}
                <span className="num text-fg">
                  {Math.round(rhythm.girdle.acromioclavicularDeg)}°
                </span>{' '}
                acromioclavicular (la escápula gira sobre ella).
              </p>
            )}
            {/* POR QUE LA CIFRA NO ES LA DEL LIBRO. El plano de la escápula está
                inclinado unos 34° por delante del frontal, así que su rotación
                ascendente eleva el brazo cos(34°) de lo que gira: los ~60° que se
                citan a 180° son en SU plano, y lo que aporta al ángulo medido es
                menos. Decirlo evita la conclusión de que el modelo está mal, y es
                además la razón por la que la elevación se explora en el plano
                escapular. Solo cuando la diferencia ya se nota. */}
            {rhythm.scPlane - rhythm.sc > 2 && (
              <p className="mt-1.5 text-[11px] leading-snug text-fg3">
                Rotación ascendente de la escápula:{' '}
                <span className="num text-fg">{Math.round(rhythm.scPlane)}°</span> en su propio
                plano, inclinado ~34° por delante del frontal; de ahí los{' '}
                <span className="num text-fg">{Math.round(rhythm.sc)}°</span> que aporta al ángulo
                que se mide.
              </p>
            )}
            {/* Source: the joint split is Inman's scapulohumeral rhythm; the trunk
                share above 150° is Kapandji's phase-3 spine contribution; the
                sternoclavicular / acromioclavicular division follows Inman and
                Ludewig. */}
            <p className="num mt-2 text-[10px] text-fg3">Fuente: Inman, Ludewig, Kapandji</p>
          </section>
        )}

        {/* Knee screw-home coupling — the knee's "rhythm equivalent": the coupled
            automatic tibial external rotation that locks the joint in extension. */}
        {screwHome && !demo && (
          <section className="sec">
            <div className="sec-head">
              <span className="kicker">Mecanismo de tornillo</span>
              <span className="sec-rule" />
              <span className="shrink-0 text-xs font-medium text-fg">
                {SCREW_ZONE[screwHome.zone].label}
              </span>
            </div>
            {/* Coupled tibial external rotation (0..15 deg). */}
            <div className="flex items-center gap-2.5">
              <span
                className="meter flex-1 text-brand"
                style={{ ['--v' as string]: (screwHome.tibialErDeg / 15) * 100 }}
                aria-hidden="true"
              />
              <span className="num shrink-0 text-xs font-medium text-fg">
                {screwHome.tibialErDeg.toFixed(1)}°
              </span>
              <span className="shrink-0 text-[11px] text-fg3">RE tibial</span>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-fg2">
              {SCREW_ZONE[screwHome.zone].note}
            </p>
            <p className="num mt-2 text-[10px] text-fg3">Fuente: Kapandji, Oatis</p>
          </section>
        )}

        {/* Cervical rotation split — the neck's rhythm equivalent (C1-C2 vs C2-C7). */}
        {cervicalSplit && !demo && (
          <SegmentSplit
            title="Reparto de la rotación"
            ratio={cervicalSplit.ratio}
            note="La articulación atlanto-axoidea (C1-C2) aporta ~la mitad de la rotación cervical y lidera el inicio; los segmentos C2-C7 completan el arco."
            source="Kapandji, Oatis"
            segs={[
              { label: 'C1-C2', deg: cervicalSplit.c1c2Deg, pct: cervicalSplit.c1c2Pct },
              { label: 'C2-C7', deg: cervicalSplit.subaxialDeg, pct: cervicalSplit.subaxialPct },
            ]}
          />
        )}

        {/* Lumbopelvic rhythm — the trunk's rhythm equivalent (lumbar spine + pelvis). */}
        {lumboPelvic && !demo && (
          <SegmentSplit
            title="Ritmo lumbopélvico"
            ratio={lumboPelvic.ratio}
            notPosed={
              LUMBOPELVIC_PELVIS_POSED
                ? undefined
                : 'La pelvis no bascula en el 3D: en este modelo la cadera no es una articulación entre pelvis y fémur. Los grados de pelvis son del modelo; lo que ves moverse es el raquis lumbar.'
            }
            note={
              lumboPelvic.leader === 'lumbar'
                ? 'El raquis lumbar lidera el inicio del gesto (invierte la lordosis); la pelvis aún apenas rota.'
                : lumboPelvic.leader === 'pelvis'
                  ? 'La pelvis (flexión de cadera) domina ya el gesto; el raquis lumbar aporta menos.'
                  : 'Lumbar y pelvis se reparten el gesto de forma pareja.'
            }
            source="Kapandji, Oatis"
            segs={[
              { label: 'Lumbar', deg: lumboPelvic.lumbarDeg, pct: lumboPelvic.lumbarPct },
              { label: 'Pelvis', deg: lumboPelvic.pelvicDeg, pct: lumboPelvic.pelvicPct },
            ]}
          />
        )}

        {/* RECLUTAMIENTO: todos los musculos del movimiento, cada uno con su
            barra. Eran un parrafo ("Tambien: A 40%, B 22%...") que ademas se
            caia por debajo de 850 px de ventana: en un portatil, de los hasta 9
            musculos encendidos en el modelo el panel nombraba a uno. */}
        {rows.length > 0 && !demo && (
          <section className="sec">
            <div className="sec-head">
              <span className="kicker">Reclutamiento</span>
              <span className="sec-rule" />
              <span className="num shrink-0 text-[11px] text-fg3">
                {live.length} de {rows.length}
              </span>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {roleCounts.map(({ role, n }) => (
                <span
                  key={role}
                  className={`flex items-center gap-1.5 whitespace-nowrap ${n === 0 ? 'opacity-45' : ''}`}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0"
                    style={{ backgroundColor: ROLE_TONE_CSS[role] }}
                  />
                  <span className="tag">{ROM_ROLE_LABEL[role]}</span>
                  <span className="num text-[10px] font-medium text-fg2">{n}</span>
                </span>
              ))}
            </div>
            <ul>
              {rows.map((m) => {
                const on = m.level > ACTIVE_EPS;
                const lead = hero?.muscleId === m.muscleId;
                const pct = Math.round(m.level * 100);
                const tone = isIsolated(m.muscleId)
                  ? 'text-amber-200 underline'
                  : lead
                    ? 'font-semibold text-fg'
                    : on
                      ? 'text-fg2'
                      : 'text-fg3';
                return (
                  <li
                    key={m.muscleId}
                    className={`grid grid-cols-[minmax(0,1fr)_4rem_2.25rem] items-center gap-x-2.5 ${
                      stageReads ? 'min-h-[26px]' : 'min-h-[22px]'
                    }`}
                  >
                    {canIsolate(m.muscleId) ? (
                      <button
                        type="button"
                        onClick={() => isolateByName(m.muscleId)}
                        aria-pressed={isIsolated(m.muscleId)}
                        title={
                          isIsolated(m.muscleId)
                            ? 'Mostrar el resto otra vez'
                            : `${ROM_ROLE_LABEL[m.role]}. Ver este músculo solo en el modelo`
                        }
                        className={`truncate text-left underline-offset-4 transition-colors hover:text-fg hover:underline ${
                          stageReads ? 'text-[12.5px]' : 'text-xs'
                        } ${tone}`}
                      >
                        {nameOf(m.muscleId)}
                      </button>
                    ) : (
                      <span className={`truncate text-xs ${tone}`} title={ROM_ROLE_LABEL[m.role]}>
                        {nameOf(m.muscleId)}
                      </span>
                    )}
                    {measured ? (
                      <>
                        <span
                          className="meter"
                          style={{ ['--v' as string]: pct, color: ROLE_TONE_CSS[m.role] }}
                          aria-hidden="true"
                        />
                        <span
                          className={`num text-right text-[11px] ${on ? 'text-fg2' : 'text-fg3'}`}
                        >
                          {pct}%
                        </span>
                      </>
                    ) : (
                      <span
                        className="tag col-span-2 text-right"
                        style={{ color: ROLE_TONE_CSS[m.role] }}
                      >
                        {ROM_ROLE_LABEL[m.role]}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!stageReads && phaseSection}
      </div>

      {/* HONEST FRAMING (G3): the %/ratios above are a recruitment MODEL grounded
          in standard kinesiology, never a measured EMG. Shown whenever a number
          is on screen, so it can never be read as a measurement — on the short
          viewports where the column is tightest it says so in one line instead
          of two. A demo shows no percentages, so it carries no such claim. */}
      {!demo && (
        <>
          <div className="rule" />
          <p className="shrink-0 px-4 py-1.5 text-[10px] leading-snug text-fg3">
            {compact
              ? 'Modelo de reclutamiento, no medición EMG.'
              : 'Porcentajes y proporciones: modelo de reclutamiento (Kapandji, Oatis, Neumann), no medición EMG.'}
          </p>
        </>
      )}
    </div>
  );
}
