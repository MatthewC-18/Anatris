// src/components/movement/LabMarginParts.tsx
//
// LAS PIEZAS DEL CENTRO DEL MARGEN IZQUIERDO DEL LABORATORIO.
//
// El margen era un parrafo de ocho lineas, una lista de diez musculos con barra
// y una nota fija, todo con el mismo peso ("se ve todo aglomerado y el usuario
// no va a leer todo asi"). El rediseño (sintesis de tres maquetas, revisada dos
// veces) deja UNA cosa grande cada vez:
//
//   PhasePager  en que tramo se esta y a que fase se puede ir; pulsar una lleva
//               el cuerpo al centro de su parte alcanzable.
//   PhaseStack  la frase de la fase (su primera oracion, ver phaseLead), la
//               fuente, "Seguir leyendo" y el aviso clinico.
//   LabTrio     tres musculos por fase, cada uno con la curva de TODO el arco
//               en la misma rejilla que el deslizador; los demas, detras de
//               "Ver los N".
//
// Ninguna lleva cajas (sistema LAMINA): tipografia, filos y color.

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ROM_ROLE_LABEL, type RomMovement, type RomMuscleRole, type RomPhase } from '../../types/rom';
import type { Citation } from '../../types/muscleContent';
import { ROLE_ORDER, ROLE_TONE_CSS } from '../../lib/romRolePalette';
import { ACTIVE_EPS, activationFor, activeMusclesAt } from '../../lib/romActivation';
import { phaseLead } from '../../lib/phaseLead';
import { phaseTrio, phaseWhyNote } from '../../lib/phaseTrio';
import { phaseSeekTarget } from '../../lib/labArc';
import { grados, sinRango } from '../../lib/phaseLabel';
import { PHASE_CONT_GAP_REM, phaseContinuationLines } from '../../lib/phaseFit';
import { labMotionChannel } from './labMotionChannel';
import { ActivationStrip } from './ActivationStrip';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';

/** La frase larga del modelo: va en el titulo del rotulo y al pie de la lista entera. */
export const MODEL_NOTE =
  'Porcentajes y proporciones: modelo de reclutamiento (Kapandji, Oatis, Neumann), no medición EMG.';

/**
 * Siglas que se escriben en mayusculas y se quedan asi. Todo lo demas en
 * mayusculas de cuatro letras o mas es ENFASIS del dato ("se activan JUNTOS")
 * y se compone en minuscula y seminegrita: unas mayusculas en mitad de una
 * frase de 18 px gritan. Medido sobre los textos de las 73 fases: los unicos
 * enfasis son JUNTOS, TODO y ANTES; GIRD, FADIR, FAI y LCA son siglas. La
 * prueba de phaseLead avisa si aparece una palabra nueva sin clasificar.
 */
export const SIGLAS = new Set([
  'AAOS', 'ECOM', 'ECRB', 'EMG', 'FADIR', 'FABER', 'FAI', 'GIRD', 'LCA', 'LCP', 'SLAP',
]);

/**
 * El texto de una fase como se compone: comillas rectas a «», un tramo como
 * 60-120° que no se parte por el guion, y el enfasis en minuscula seminegrita.
 */
export function typeset(text: string): ReactNode[] {
  const t = text.replace(/"([^"]+)"/g, '«$1»').replace(/(\d)-(\d)/g, '$1\u2011$2');
  return t.split(/\b([A-ZÁÉÍÓÚÑ]{4,})\b/).map((part, i) =>
    i % 2 === 1 && !SIGLAS.has(part) ? (
      <strong key={i} className="font-semibold">
        {part.toLowerCase()}
      </strong>
    ) : (
      part
    ),
  );
}

/* ---------------------------------------------------------------------------
 * EL PAGINADOR
 * ------------------------------------------------------------------------ */

export function PhasePager({
  phases,
  index,
  effMin,
  effMax,
}: {
  phases: RomPhase[];
  index: number;
  /** El arco que permite el cuadro clinico: una fase fuera de el se apaga. */
  effMin: number;
  effMax: number;
}) {
  const targets = phases.map((p) => phaseSeekTarget(p, effMin, effMax));
  const go = (i: number) => {
    const t = targets[i];
    if (t != null) labMotionChannel.seek(t);
  };
  let prev = -1;
  for (let i = index - 1; i >= 0; i--) {
    if (targets[i] != null) {
      prev = i;
      break;
    }
  }
  let next = -1;
  for (let i = index + 1; i < phases.length; i++) {
    if (targets[i] != null) {
      next = i;
      break;
    }
  }
  const p = phases[index];
  const etiqueta = (ph: RomPhase, i: number) => {
    const tramo = `${grados(ph.startDeg)}° a ${grados(ph.endDeg)}°`;
    const t = targets[i];
    if (t == null) return `${sinRango(ph.label)}, ${tramo}: fuera del arco con este cuadro`;
    const aviso = ph.flag ? `. ${ph.flag.label}` : '';
    return `${sinRango(ph.label)}, ${tramo}. Llevar el brazo a ${grados(t)}°${aviso}`;
  };
  return (
    <div className="pager-row">
      <span className="tramo">
        {grados(p.startDeg)}° a {grados(p.endDeg)}°
      </span>
      {phases.length > 1 && (
        <nav className="pager" aria-label="Fases del gesto">
          <button
            type="button"
            className="btn btn-quiet btn-icon btn-sm"
            disabled={prev < 0}
            onClick={() => go(prev)}
            aria-label="Fase anterior"
            title={prev >= 0 ? etiqueta(phases[prev], prev) : undefined}
          >
            <ChevronLeftIcon size={14} />
          </button>
          <span className="flex items-center">
            {phases.map((ph, i) => (
              <button
                key={`${ph.startDeg}-${ph.endDeg}`}
                type="button"
                // Sin tinte de aviso: el ambar se leia como el del motor
                // principal de la lista de abajo. El aviso va en la etiqueta.
                className="pip"
                aria-current={i === index ? 'step' : undefined}
                disabled={targets[i] == null}
                onClick={() => go(i)}
                aria-label={etiqueta(ph, i)}
                title={etiqueta(ph, i)}
              />
            ))}
          </span>
          <button
            type="button"
            className="btn btn-quiet btn-icon btn-sm"
            disabled={next < 0}
            onClick={() => go(next)}
            aria-label="Fase siguiente"
            title={next >= 0 ? etiqueta(phases[next], next) : undefined}
          >
            <ChevronRightIcon size={14} />
          </button>
        </nav>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * LA FRASE DE LA FASE
 * ------------------------------------------------------------------------ */

/**
 * Cambios seguidos de la cuenta de lineas, en la misma fase, antes de cortar.
 * Con la cuenta de lib/phaseFit lo medido es 1 (encuesta de 73 fases en cuatro
 * clases de ventana); React corta a las 50 vueltas, asi que 4 deja margen sin
 * acercarse.
 */
const MAX_VUELTAS_MEDIDA = 4;

/**
 * LA CELDA DE LA FRASE MIDE SIEMPRE LO MISMO: lo que la fase mas alta (frase,
 * fuente y aviso). Asi, al cambiar de fase, al reproducir o al pausar, solo
 * cambia el texto y nada de lo de debajo se mueve. El sitio que le sobra a una
 * fase mas corta no queda en blanco: lo llena la CONTINUACION de su propio
 * texto, por lineas enteras, y acaba en puntos suspensivos. "Seguir leyendo"
 * solo sale si queda texto sin ver.
 */
export function PhaseStack({
  phases,
  index,
  citeLabel,
}: {
  phases: RomPhase[];
  index: number;
  citeLabel: (c: Citation[]) => string;
}) {
  const [open, setOpen] = useState(false);
  // Al cambiar de fase se pliega lo abierto: el resto era de la otra.
  useEffect(() => setOpen(false), [index, phases]);

  const cellRef = useRef<HTMLDivElement>(null);
  const contRef = useRef<HTMLParagraphElement>(null);
  /** Lineas de continuacion que caben en la fase activa, y si queda texto sin ver. */
  const [fit, setFit] = useState<{ lines: number; truncated: boolean }>({ lines: 0, truncated: false });
  // CINTURON. Esta medida depende de lo que ella misma pinta, y el 25 nov 2026
  // una cuenta que daba 1 linea sin la continuacion y 0 con ella tumbo el
  // laboratorio entero ("Maximum update depth exceeded" en la flexion del codo,
  // ver lib/phaseFit). La cuenta ya no depende de eso, pero por si otra
  // combinacion de fuente y ventana vuelve a oscilar: se cuentan los cambios
  // SEGUIDOS de `lines` sin llegar a un punto fijo en la misma fase, y pasado el
  // tope se queda con el menor, que seguro cabe. Lo normal es 1 cambio.
  const vueltas = useRef<{ index: number; phases: RomPhase[] | null; open: boolean; n: number }>({
    index: -1,
    phases: null,
    open: false,
    n: 0,
  });

  useLayoutEffect(() => {
    const cell = cellRef.current;
    if (!cell) return;
    const v = vueltas.current;
    if (v.index !== index || v.phases !== phases || v.open !== open) {
      vueltas.current = { index, phases, open, n: 0 };
    }
    const medir = () => {
      const blocks = [...cell.children] as HTMLElement[];
      const cont = contRef.current;
      // El margen sale de la fuente raiz en las dos ramas (pintada o no): leer
      // el marginTop pintado en una y una constante en la otra es el mismo
      // fallo que se arregla aqui.
      const raiz = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const medidas = phaseContinuationLines({
        blockHeights: blocks.map((b) => b.getBoundingClientRect().height),
        index,
        contHeight: cont ? cont.getBoundingClientRect().height : 0,
        contGapPx: PHASE_CONT_GAP_REM * raiz,
      });
      const r = vueltas.current;
      let lines = medidas;
      if (lines === fit.lines) {
        r.n = 0;
      } else if (++r.n > MAX_VUELTAS_MEDIDA) {
        lines = Math.min(fit.lines, lines);
        if (import.meta.env.DEV && r.n === MAX_VUELTAS_MEDIDA + 1) {
          console.warn('[PhaseStack] la medida de la continuacion oscila; se queda en', lines, 'lineas');
        }
      }
      const truncated = cont ? cont.scrollHeight > cont.clientHeight + 1 : true;
      setFit((f) => (f.lines === lines && f.truncated === truncated ? f : { lines, truncated }));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(cell);
    return () => ro.disconnect();
  }, [index, phases, open, fit.lines]);

  return (
    // `items-start`: sin el, cada fase se estira al alto de la celda y no se
    // puede medir lo que ocupa de verdad.
    <div ref={cellRef} className="grid items-start">
      {phases.map((p, i) => {
        const on = i === index;
        const L = phaseLead(p.description ?? '');
        const src = p.cite.length > 0 ? citeLabel(p.cite) : '';
        const abierto = on && open;
        // La continuacion solo en la fase activa: las demas miden su nucleo.
        const verCont = on && !!L.rest && (abierto || fit.lines > 0);
        const quedaTexto = !!L.rest && (abierto || !verCont || fit.truncated);
        return (
          <div
            key={`${p.startDeg}-${p.endDeg}`}
            className="[grid-area:1/1]"
            style={on ? undefined : { visibility: 'hidden' }}
            aria-hidden={on ? undefined : true}
          >
            <p className={`lede ${abierto ? '' : 'lab-lede-clamp'}`}>
              {typeset(L.lead)}
              {L.cut ? '…' : ''}
            </p>
            {verCont && (
              <p
                ref={contRef}
                // mt-1.5 y text-[13px] leading-[1.55] van atados a
                // PHASE_CONT_GAP_REM y PHASE_CONT_LINE_PX (lib/phaseFit): si
                // cambian aqui, cambian alli.
                className="mt-1.5 text-[13px] leading-[1.55] text-fg2"
                style={
                  abierto
                    ? undefined
                    : {
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: fit.lines,
                        overflow: 'hidden',
                      }
                }
              >
                {L.cut ? '…' : ''}
                {typeset(L.rest)}
              </p>
            )}
            {(src || quedaTexto) && (
              <div className="byline">
                {src ? <span className="src-line">Fuente: {src}</span> : <span />}
                {quedaTexto && (
                  <button
                    type="button"
                    className="link-quiet"
                    aria-expanded={abierto}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setOpen((o) => !o)}
                  >
                    {abierto ? 'Leer menos' : 'Seguir leyendo'}
                    <ChevronDownIcon
                      size={12}
                      className={`transition-transform ${abierto ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
              </div>
            )}
            {p.flag && (
              <div className={`note mt-3 ${p.flag.tone === 'warn' ? 'note-warn' : 'note-brand'}`}>
                <span
                  className={`tag mr-1.5 ${p.flag.tone === 'warn' ? 'text-amber-200' : 'text-brand'}`}
                >
                  {p.flag.label}
                </span>
                {typeset(p.flag.detail ?? '')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * QUIEN LO HACE
 * ------------------------------------------------------------------------ */

interface TrioProps {
  movement: RomMovement;
  phase: RomPhase;
  /** El arco ENTERO del gesto (el trio es de la fase, no del cuadro). */
  arcMin: number;
  arcMax: number;
  /** El arco que permite el cuadro: el mismo dominio que el deslizador. */
  effMin: number;
  effMax: number;
  angle: number;
  nameOf: (id: string) => string;
  canIsolate: (id: string) => boolean;
  isIsolated: (id: string) => boolean;
  isolate: (id: string) => void;
}

/** Una fila: nombre (aisla), papel, tira y cifra. */
function MuscleRow({
  id,
  role,
  level,
  movement,
  phase,
  effMin,
  effMax,
  angle,
  small,
  note,
  whyOpen = false,
  nameOf,
  canIsolate,
  isIsolated,
  isolate,
}: {
  id: string;
  role: RomMuscleRole;
  level: number;
  movement: RomMovement;
  phase: RomPhase;
  effMin: number;
  effMax: number;
  angle: number;
  small?: boolean;
  /** La nota del "Por que" (null = el dato no trae nota; undefined = sin nota). */
  note?: string | null;
  /** "Por que" pulsado. En una ventana alta la nota se ve igual (ver index.css). */
  whyOpen?: boolean;
  nameOf: (id: string) => string;
  canIsolate: (id: string) => boolean;
  isIsolated: (id: string) => boolean;
  isolate: (id: string) => void;
}) {
  const env = activationFor(movement, id);
  const on = level > ACTIVE_EPS;
  const pct = Math.round(level * 100);
  const iso = isIsolated(id);
  const nombre = (
    <span className={small ? 'text-xs font-medium' : 'text-[13px] font-semibold'}>{nameOf(id)}</span>
  );
  return (
    <li className={`relative ${small ? 'mt-1.5 first:mt-0' : 'mt-2 first:mt-0'}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {canIsolate(id) ? (
          <button
            type="button"
            onClick={() => isolate(id)}
            aria-pressed={iso}
            title={iso ? 'Mostrar el resto otra vez' : `${ROM_ROLE_LABEL[role]}. Ver este músculo solo en el modelo`}
            className={`min-w-0 text-left underline decoration-dotted decoration-1 underline-offset-[5px] transition-colors hover:decoration-solid ${
              iso
                ? 'text-amber-200 decoration-solid'
                : on
                  ? 'text-fg decoration-fg3'
                  : 'text-fg3 decoration-fg3/60'
            }`}
          >
            {nombre}
          </button>
        ) : (
          <span className={`min-w-0 ${on ? 'text-fg' : 'text-fg3'}`}>{nombre}</span>
        )}
        {!small && (
          <span className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-fg2">
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0" style={{ backgroundColor: ROLE_TONE_CSS[role] }} />
            {ROM_ROLE_LABEL[role]}
          </span>
        )}
      </div>
      {env ? (
        <div className={`lab-axis ${small ? 'mt-0.5' : 'mt-1'}`}>
          <span aria-hidden="true" />
          <ActivationStrip
            curve={env.curve}
            role={env.role}
            roleWhenNegative={env.roleWhenNegative}
            min={effMin}
            max={effMax}
            windowStart={phase.startDeg}
            windowEnd={phase.endDeg}
            angle={angle}
            small={small}
          />
          <span
            className={`num text-right font-medium ${small ? 'text-xs' : 'text-[13px]'} ${on ? 'text-fg' : 'text-fg3'}`}
          >
            {pct}%
          </span>
        </div>
      ) : null}
      {note !== undefined && (
        <p
          data-lab-why=""
          aria-hidden={whyOpen ? undefined : true}
          className={`mt-1 text-xs leading-snug text-fg2 ${whyOpen ? '' : 'lab-why-probe'}`}
        >
          {note ?? 'Sin nota en el dato: queda el papel.'}
        </p>
      )}
    </li>
  );
}

export function LabTrio(props: TrioProps) {
  const { movement, phase, arcMin, arcMax, angle } = props;
  const [why, setWhy] = useState(false);
  const [all, setAll] = useState(false);
  const [modelo, setModelo] = useState(false);

  // LAS NOTAS DEL "POR QUE" SE VEN SOLAS SI CABEN. En una ventana alta (la de
  // grabacion, 1920 x 1080) el margen dejaba 195 px vacios bajo el trio; con las
  // notas a la vista se llenan. Pero con un cuadro clinico abierto ya no caben
  // (medido: 115 px de desplazamiento con la discinesia), y un margen que se
  // desplaza delante de la camara es peor que un hueco. Asi que se MIDE: las
  // notas ocultas se dibujan fuera del flujo (`.lab-why-probe`), se suma su alto
  // al del contenido sin ellas y solo entran si el total cabe. La cuenta no
  // depende de si se ven, asi que no oscila; se hace antes de pintar (sin
  // parpadeo) y no se rehace con el cuerpo en movimiento (nada salta al
  // reproducir).
  const sectionRef = useRef<HTMLElement>(null);
  const [caben, setCaben] = useState(false);
  useLayoutEffect(() => {
    const sec = sectionRef.current;
    const centro = sec?.closest('[data-lab-center]') as HTMLElement | null;
    const sc = centro?.parentElement ?? null;
    if (!sec || !centro || !sc || all) return;
    const medir = () => {
      if (labMotionChannel.isMoving()) return;
      if (!window.matchMedia('(min-height: 1000px)').matches) {
        setCaben(false);
        return;
      }
      const notas = [...sec.querySelectorAll<HTMLElement>('[data-lab-why]')];
      const altoNotas = notas.reduce((acc, n) => acc + n.getBoundingClientRect().height + 4, 0);
      const cs = getComputedStyle(sc);
      const contenido =
        centro.getBoundingClientRect().height +
        parseFloat(cs.paddingTop || '0') +
        parseFloat(cs.paddingBottom || '0');
      // Lo que mide el contenido SIN notas (si ya se ven, se descuentan).
      const base = contenido - (caben ? altoNotas : 0);
      const ok = base + altoNotas <= sc.clientHeight + 1;
      if (ok !== caben) setCaben(ok);
    };
    medir();
    // El hueco (la ventana) y el contenido (entra o sale un cuadro, una postura).
    const ro = new ResizeObserver(medir);
    ro.observe(sc);
    ro.observe(centro);
    return () => ro.disconnect();
  }, [caben, all, phase]);
  const verNotas = why || caben;
  // "Por que" es de la fase: se pliega al cambiar de fase.
  useEffect(() => setWhy(false), [phase]);

  // Todos los musculos del gesto en este grado, con el papel segun el signo: el
  // mismo calculo que enciende el contorno y las etiquetas del escenario.
  const live = useMemo(() => activeMusclesAt(movement, angle, -1), [movement, angle]);
  const byId = useMemo(() => new Map(live.map((m) => [m.muscleId, m])), [live]);
  const trio = useMemo(
    () => phaseTrio(movement, phase, { min: arcMin, max: arcMax }),
    [movement, phase, arcMin, arcMax],
  );
  const total = movement.activations?.length ?? 0;
  const activos = live.filter((m) => m.level > ACTIVE_EPS).length;
  // El musculo aislado en el modelo, si no es del trio: una linea para devolver
  // el resto sin buscarlo en la lista entera.
  const aislado =
    !all && (movement.activations ?? []).find((a) => props.isIsolated(a.muscleId) && !trio.includes(a.muscleId))
      ?.muscleId;

  const roleOf = (id: string): RomMuscleRole => {
    const m = byId.get(id);
    if (m) return m.role;
    const env = activationFor(movement, id);
    return angle < 0 && env?.roleWhenNegative ? env.roleWhenNegative : (env?.role ?? 'stabilizer');
  };
  const levelOf = (id: string) => byId.get(id)?.level ?? 0;

  // Sin envolventes (hoy ninguno de los 34 gestos): la lista de la fase con su papel.
  if (total === 0) {
    return (
      <section className="px-4 pb-2 pt-3.5">
        <div className="sec-head mb-2">
          <span className="kicker">Quién lo hace</span>
          <span className="sec-rule" />
        </div>
        <ul>
          {phase.muscles.map((m) => (
            <li key={m.muscleId} className="flex items-baseline justify-between gap-2 py-0.5 text-[13px]">
              <span className="text-fg">{props.nameOf(m.muscleId)}</span>
              <span className="tag" style={{ color: ROLE_TONE_CSS[m.role] }}>
                {ROM_ROLE_LABEL[m.role]}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const row = (id: string, small = false) => (
    <MuscleRow
      key={id}
      id={id}
      role={roleOf(id)}
      level={levelOf(id)}
      small={small}
      note={small ? undefined : phaseWhyNote(movement, phase, id, roleOf(id))}
      whyOpen={verNotas}
      {...props}
    />
  );

  return (
    <section ref={sectionRef} className="px-4 pb-1 pt-3">
      <div className="sec-head mb-1.5">
        <span className="kicker">Quién lo hace</span>
        <span className="sec-rule" />
        <button
          type="button"
          className="tag group inline-flex shrink-0 items-center gap-1 transition-colors hover:text-fg2"
          aria-expanded={modelo}
          onClick={() => setModelo((m) => !m)}
        >
          Modelo, no EMG
          <ChevronDownIcon size={12} className={`transition-transform ${modelo ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {modelo && <p className="mb-2 text-xs leading-snug text-fg2">{MODEL_NOTE}</p>}
      {aislado && (
        <p className="mb-2 flex flex-wrap items-baseline gap-x-2 text-xs text-fg2">
          <span className="kicker text-amber-300/80">Aislado</span>
          <span className="text-amber-100">{props.nameOf(aislado)}</span>
          <button type="button" className="link-quiet ml-auto" onClick={() => props.isolate(aislado)}>
            Mostrar el resto
          </button>
        </p>
      )}

      {all ? (
        <>
          <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-fg2">
            <span>
              Todo el gesto · <span className="num">{activos}</span> de{' '}
              <span className="num">{total}</span> trabajan
            </span>
            <button type="button" className="link-quiet ml-auto" onClick={() => setAll(false)}>
              Volver al trío
            </button>
          </p>
          {ROLE_ORDER.map((role) => {
            const ids = (movement.activations ?? [])
              .map((a) => a.muscleId)
              .filter((id) => roleOf(id) === role);
            if (ids.length === 0) return null;
            const n = ids.filter((id) => levelOf(id) > ACTIVE_EPS).length;
            return (
              <div key={role} className="mt-3">
                <p className="mb-1 flex items-center gap-2">
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0" style={{ backgroundColor: ROLE_TONE_CSS[role] }} />
                  <span className="kicker text-fg2">{ROM_ROLE_LABEL[role]}</span>
                  <span className="num text-[11px] text-fg3">
                    {n} de {ids.length}
                  </span>
                </p>
                <ul>{ids.map((id) => row(id, true))}</ul>
              </div>
            );
          })}
          <p className="mt-3 text-xs leading-snug text-fg3">{MODEL_NOTE}</p>
        </>
      ) : (
        <>
          <ul>{trio.map((id) => row(id))}</ul>
          <div className="mt-2 flex min-h-[18px] items-center justify-between gap-3">
            {/* Con las notas a la vista solas, el boton sobra: su hueco lo guarda
                un espaciador para que "Ver los N" no salte. */}
            {caben ? (
              <span aria-hidden="true" />
            ) : (
              <button
                type="button"
                className="link-quiet"
                aria-expanded={why}
                onClick={() => setWhy((w) => !w)}
              >
                Por qué
                <ChevronDownIcon size={12} className={`transition-transform ${why ? 'rotate-180' : ''}`} />
              </button>
            )}
            {total > trio.length && (
              <button type="button" className="link-quiet" aria-expanded={false} onClick={() => setAll(true)}>
                Ver los {total} · {activos} activos
                <ChevronDownIcon size={12} />
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
