// src/components/movement/NeuroRootRow.tsx
//
// One nerve root's row in the neuro panel: what it supplies, and the three things
// you examine to test it.
//
// -----------------------------------------------------------------------------
// WHO THIS IS FOR
// -----------------------------------------------------------------------------
// A STUDENT going over a class again, not a clinician who already knows the drill.
// That single fact decided most of what follows, because the first version was
// written for the expert:
//
// 1. A ROW OF BARE NUMBERS TEACHES NOTHING. "0 1 2 3 4 5" with the meanings hidden
//    in `title` attributes is unreadable on a phone and unguessable anywhere: which
//    end is good? Is 0 no contraction or no deficit? So every scale now carries its
//    ENDS as visible labels, and the moment a grade is picked that line is replaced
//    by what the grade means in words. One line of height, and the scale explains
//    itself.
//
// 2. THE REFLEX SCALE NEEDS THREE ANCHORS, NOT TWO. Normal sits in the MIDDLE of
//    0-4: both ends are abnormal, in opposite directions, and 4 is the one that
//    means "this is not a root problem at all". A two-ended label would have taught
//    the wrong shape.
//
// 3. EACH AXIS SAYS WHAT IT IS AND WHAT TO DO, in ONE line. "Fuerza · miotoma" is a
//    heading for someone who already knows what a myotome is, so under it sits "el
//    movimiento que gobierna; resistelo y compara con el lado sano". A first pass
//    had the definition and a separate question ("cuanta fuerza opone?") on two
//    lines, which said nearly the same thing twice and cost three lines of height
//    per root.
//
// 4. NOTHING IS SAID TWICE. The collapsed row already carries the key movement, the
//    short key point and the reflex's name; the expanded detail used to repeat all
//    three, which is three lines of scrolling per root for no information. The
//    detail now only adds what the summary lacks.
//
// Inherits the panel's doctrine (see NeuroPanel.tsx): three type sizes, the
// segmental pigment as the only data colour, cyan for interactive state, amber for
// what needs attention, and no box inside a box. Desde el sistema LAMINA
// (docs/sistema-lamina.md) eso se dice con sus piezas: el rotulo es `.kicker`
// (subido a 11 px, el suelo del panel), la escala es una regla subrayada (`.tab`)
// y no una fila de pastillas, el play es un boton cuadrado (`.btn-icon`) y la
// raiz se identifica con su punto de pigmento, no con una ficha tenida.
//
// Kept free of three.js on purpose, so it can be rendered standalone and looked at
// (scripts/harness). UI Spanish LATAM; code and comments ASCII/English.

import type { NerveRoot } from '../../types/neuro';
import { getReference, formatReference, type ReferenceId } from '../../data/references';
import {
  REFLEX_SCALE,
  SENSATION_SCALE,
  STRENGTH_SCALE,
  type RootFinding,
} from '../../lib/neuroScreen';
import { ChevronDownIcon, PlayIcon, StopIcon } from '../ui/Icons';

/**
 * A reflex's short name, for the collapsed row.
 *
 * The data carries the full clinical name ("Reflejo rotuliano o patelar (L3 y
 * L4)") because that is what belongs in the detail. A row has room for the word
 * that identifies it, and the levels in the parenthesis are already the row it
 * sits on. Derived rather than authored twice: two spellings of the same reflex
 * in two fields is a data bug waiting to happen.
 */
export function shortReflex(name: string): string {
  const core = name
    .replace(/^Reflejo\s+/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    // "Rotuliano o patelar" and "Braquiorradial o estilorradial" are two names for
    // one reflex, and on a row the second one only pushes the key point out of
    // view. The full name stays in the detail below.
    .replace(/\s+o\s+.*$/i, '')
    .trim();
  return core.charAt(0).toUpperCase() + core.slice(1);
}

// ---------------------------------------------------------------------------
// Glyphs. The three lanes are told apart by FORM, not by hue: a third and fourth
// colour here would collide with the muscle-role code (amber/sky/violet) and with
// the tests panel's two-axis code, and a dermatome would end up looking like a
// prime mover.
// ---------------------------------------------------------------------------

/** Key point: the ring-and-core pin the plate marks the ASIA point with. */
export function PinGlyph({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.2" fill="none" stroke={color} strokeWidth="1.4" />
      <circle cx="6" cy="6" r="1.2" fill="#f8fafc" />
    </svg>
  );
}

/** Myotome: a limb sweeping against resistance. */
export function MotionGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2.5 10.5V5A2.5 2.5 0 0 1 7 3.4" />
      <path d="M5.4 1.6 7.6 3.3 5.6 5" />
      <path d="M9.6 7.2v3.3" />
    </svg>
  );
}

/** Reflex: the hammer on the tendon. */
export function HammerGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2 9.6 7.2 4.4" />
      <path d="M6 2.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8" />
      <path d="M1.4 10.6h1.6" />
    </svg>
  );
}

/** El rotulo de LAMINA (`.kicker`) a 11 px: la regla 1 del panel no baja de ahi. */
export function Kicker({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`kicker text-[11px] ${className}`}>{children}</span>;
}

/**
 * La identidad de la raiz: su nombre en mono y un punto de su pigmento.
 *
 * Era una ficha de 36x24 con borde y fondo tenido del pigmento, es decir una
 * pastilla de color por fila, que es lo que LAMINA quita. El pigmento sigue
 * diciendo lo mismo (es la misma raiz en el cuerpo, en el esquema y en la
 * lista: regla 2 del panel), pero en un punto, que es una muestra y no un
 * recuadro.
 */
export function RootChip({
  root,
  pigment,
  on,
}: {
  root: string;
  pigment: string;
  on: boolean;
}) {
  return (
    <span className="flex w-10 shrink-0 items-center gap-1.5">
      <span
        className="h-2 w-2 shrink-0 rounded-full transition-opacity"
        style={{ backgroundColor: pigment, opacity: on ? 1 : 0.6 }}
        aria-hidden="true"
      />
      <span className={`num text-[11px] font-bold ${on ? 'text-fg' : 'text-fg2'}`}>{root}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// The scales.
// ---------------------------------------------------------------------------

/** Where a scale's ends (and middle, for reflexes) sit and what they mean. */
interface ScaleAnchors {
  left: string;
  middle?: string;
  right: string;
}

/**
 * A clinical scale that explains itself.
 *
 * The numbers ARE the clinical vocabulary (0-5 for strength, 0-4 for reflexes) and
 * are kept: a physio thinks in them, and a student has to learn them. What is added
 * is everything needed to use them without being told -- the question being asked,
 * the meaning of each end, and the meaning of the pick.
 *
 * Clicking the selected grade clears it, because "not examined" is a real state of
 * a screen and there has to be a way back to it.
 */
function Scale<T extends number>({
  options,
  anchors,
  value,
  onChange,
  legend,
}: {
  options: { value: T; label?: string; hint: string }[];
  anchors: ScaleAnchors;
  value: T | null;
  onChange: (v: T | null) => void;
  /** Screen-reader name for the group. Spanish. */
  legend: string;
}) {
  const picked = options.find((o) => o.value === value);
  return (
    <div className="mt-1.5">
      {/* LA ESCALA ES UNA REGLA, NO SEIS PASTILLAS. Los grados se leen sobre un
          filo de base, como las marcas de un goniometro, y el elegido se
          subraya en el color de estado (`.tab` + `is-active`). Cada grado ocupa
          su parte del ancho, asi que el blanco tactil no encoge. */}
      <div role="group" aria-label={legend} className="tabs gap-0">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(on ? null : o.value)}
              aria-pressed={on}
              aria-label={`${legend}: ${o.hint}`}
              title={o.hint}
              className={`tab min-w-0 flex-1 justify-center py-1.5 text-[11px] ${
                o.label ? '' : 'num'
              } ${on ? 'is-active font-semibold' : ''}`}
            >
              {o.label ?? o.value}
            </button>
          );
        })}
      </div>

      {/* ONE line, two jobs: the scale's anchors until a grade is picked, then what
          that grade means. Teaches the scale without costing height. */}
      {picked ? (
        <p className="mt-1 text-[11px] leading-snug text-brand">{picked.hint}</p>
      ) : (
        <div className="mt-1 flex items-baseline justify-between gap-2 text-[11px] leading-snug text-fg3">
          <span>{anchors.left}</span>
          {anchors.middle && <span className="text-fg2">{anchors.middle}</span>}
          <span>{anchors.right}</span>
        </div>
      )}
    </div>
  );
}

/**
 * The row's three state dots: sensibilidad, fuerza, reflejo, in the same order as
 * the lanes below. Five of these rows are the screening grid at a glance, and a row
 * that goes amber across is the level.
 */
export function StateDots({ root, finding }: { root: NerveRoot; finding: RootFinding }) {
  const axes: {
    key: string;
    graded: boolean;
    abnormal: boolean;
    text: string;
    absent?: boolean;
  }[] = [
    {
      key: 'S',
      graded: finding.sensation != null,
      abnormal: finding.sensation != null && finding.sensation < 2,
      text:
        finding.sensation == null
          ? 'sensibilidad sin explorar'
          : `sensibilidad ${SENSATION_SCALE.find(
              (s) => s.value === finding.sensation,
            )?.label?.toLowerCase()}`,
    },
    {
      key: 'F',
      graded: finding.strength != null,
      abnormal: finding.strength != null && finding.strength < 5,
      text: finding.strength == null ? 'fuerza sin explorar' : `fuerza ${finding.strength} de 5`,
    },
  ];
  axes.push(
    root.reflex
      ? {
          key: 'R',
          graded: finding.reflex != null,
          // Both directions are abnormal: 0 is a root sign, 4 is a cord sign.
          abnormal: finding.reflex != null && finding.reflex !== 2,
          text:
            finding.reflex == null ? 'reflejo sin explorar' : `reflejo ${finding.reflex} de 4`,
        }
      : // Not a hole: C8, T1 and L5 HAVE no reflex, and a dash says so while
        // keeping the five rows' dots in one column. Leaving the slot empty made
        // the grid ragged and the absence invisible.
        { key: 'R', graded: false, abnormal: false, text: 'sin reflejo propio', absent: true },
  );
  return (
    <span
      className="flex shrink-0 items-center gap-1"
      title={`${root.label} · ${axes.map((a) => a.text).join(', ')}`}
      aria-label={`${root.label}: ${axes.map((a) => a.text).join(', ')}`}
    >
      {axes.map((a) =>
        a.absent ? (
          <span key={a.key} aria-hidden="true" className="h-[1.5px] w-2 rounded-full bg-fg3/70" />
        ) : (
          <span
            key={a.key}
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full border ${
              !a.graded
                ? 'border-fg3/70'
                : a.abnormal
                  ? 'border-amber-400 bg-amber-400'
                  : 'border-fg3 bg-fg3'
            }`}
          />
        ),
      )}
    </span>
  );
}

/** One lane of the screen: glyph + heading + content. No card chrome. */
function Lane({
  glyph,
  label,
  what,
  children,
}: {
  glyph: React.ReactNode;
  label: string;
  /** What this axis IS, for someone meeting the word for the first time. */
  what: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-[1px] shrink-0 text-fg3">{glyph}</span>
      <div className="min-w-0 flex-1">
        <Kicker>{label}</Kicker>
        <p className="mt-1 text-[11px] leading-snug text-fg3">{what}</p>
        <div className="mt-0.5 text-[13px] leading-relaxed text-fg2">{children}</div>
      </div>
    </div>
  );
}

/**
 * What this panel is, for someone who has just met the words.
 *
 * The panel used to open on a plate, five rows of clinical shorthand and a strip of
 * bare numbers -- readable only to someone who already knew the exam. Its actual
 * audience is a student going over a class again, so it opens by naming the three
 * things it screens and saying what to do.
 *
 * DISMISSED ONCE, REMEMBERED, AND RE-OPENABLE, exactly as the tests panel's own
 * guide behaves (same "Guía" toggle in the header, same "Entendido" to close, same
 * versioned key). Two reasons it is not merely tied to the empty screen: the screen
 * empties every time "Limpiar" is pressed, so scaffolding a student has outgrown
 * would keep coming back; and help that cannot be reopened is help you have to
 * remember the first time.
 */
export function HowToUse({ onDismiss }: { onDismiss: () => void }) {
  const rows: [React.ReactNode, string, string][] = [
    [<PinGlyph key="s" color="currentColor" />, 'Dermatoma', 'la piel que inerva una raíz'],
    [<MotionGlyph key="m" />, 'Miotoma', 'el movimiento que gobierna'],
    [<HammerGlyph key="r" />, 'Reflejo', 'la respuesta al percutir su tendón'],
  ];
  return (
    // Una seccion con rotulo y filo, en el plano de la lista que explica.
    <section className="sec">
      <div className="sec-head">
        <Kicker>Cómo se explora una raíz</Kicker>
        <span className="sec-rule" />
        <button type="button" onClick={onDismiss} className="btn btn-quiet btn-sm text-[11px]">
          Entendido
        </button>
      </div>
      <ul className="space-y-1">
        {rows.map(([glyph, term, meaning]) => (
          <li key={term} className="flex items-baseline gap-2 text-[13px] leading-snug">
            <span className="mt-[3px] shrink-0 text-fg3">{glyph}</span>
            <span className="text-fg2">
              <span className="font-semibold text-fg">{term}</span>: {meaning}.
            </span>
          </li>
        ))}
      </ul>
      {/* LA GUIA DESCRIBE LA PANTALLA QUE HAY. Decia "pulsa el boton redondo"
          (el play ya es cuadrado) y "toca la lamina para saltar de un
          territorio a su raiz", cuando la carta esta ahora sobre el cuerpo y
          sus rotulos eligen raiz igual que la lista (neuroPickBus). */}
      <p className="mt-2 text-[13px] leading-relaxed text-fg2">
        Abre una raíz para verlas con su escala, pulsa su botón de play para ver el
        movimiento en el modelo, y toca el nombre de una raíz sobre el cuerpo para
        elegirla igual que en la lista. Si registras lo que exploras, el panel te
        dice qué nivel lo explica.
      </p>
    </section>
  );
}

export function NeuroRootRow({
  root,
  pigment,
  picked,
  expanded,
  onPick,
  demoing,
  onDemo,
  finding,
  onGrade,
  showVerifyMark,
}: {
  root: NerveRoot;
  pigment: string;
  picked: boolean;
  expanded: boolean;
  onPick: () => void;
  demoing: boolean;
  onDemo: () => void;
  finding: RootFinding;
  onGrade: (patch: Partial<RootFinding>) => void;
  /**
   * Whether to mark THIS root's citations as pending. When every root is pending --
   * how the set ships -- the panel says it once instead of stamping ten rows.
   */
  showVerifyMark: boolean;
}) {
  const reflexWord = root.reflex ? shortReflex(root.reflex.name) : null;
  return (
    <div
      // La raiz elegida se lee por su regla de pigmento a la izquierda, que
      // baja hasta el final de su detalle. Llevaba ademas un fondo tenido
      // (un recuadro sin borde alrededor de la fila abierta): fuera.
      className={`border-l-2 pl-3 pr-1 transition-colors ${picked ? '' : 'border-line'}`}
      style={picked ? { borderColor: pigment } : undefined}
    >
      {/* LA FILA A 19rem: LOS BOTONES SOLO EN LA LINEA DEL MOVIMIENTO.
          Antes las dos lineas de la fila (movimiento y, debajo, punto clave y
          reflejo) compartian ancho con los puntos de estado, el play y el
          chevron. En el margen de 304 px, con la lista sangrada bajo su rotulo,
          la fila tiene 254 px; quitando el nombre de la raiz (48 con su hueco),
          los puntos (28), el play (32), el chevron (26) y los huecos, quedaban
          unos 96 px de texto: "Abducción del hombro y flexión de codo." se
          cortaba a las dos lineas y "Articulación acromioclavicular" (unos
          170 px a 11 px, con `whitespace-nowrap`) se salia por debajo de los
          botones. Cuentas hechas con las medidas de las clases, no en
          pantalla. Ahora el movimiento tiene 132 px y parte las lineas que
          necesite (sin recorte: es lo mas importante que dice la fila), y la
          segunda linea, con los puntos de estado a la derecha, ocupa todo el
          ancho bajo el texto. */}
      <div className="flex items-start gap-2 pt-2">
        <button
          type="button"
          onClick={onPick}
          aria-expanded={expanded}
          aria-pressed={picked}
          className="flex min-w-0 flex-1 items-start gap-2 py-1 text-left"
        >
          <span className="mt-[3px]">
            <RootChip root={root.label} pigment={pigment} on={picked} />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-fg">
            {root.myotome.action}
          </span>
        </button>

        {/* The rig demo lives HERE, not inside the detail: it is the reason the
            panel is premium and the last place a new user looks is inside a card
            they have not opened yet. Same control the tests panel uses: un boton
            cuadrado que se ve como boton en reposo (`btn-line`) y se rellena
            mientras corre (`btn-primary`). Era un circulo con borde. */}
        {root.demo && (
          <button
            type="button"
            onClick={onDemo}
            aria-label={
              demoing
                ? `Detener el miotoma ${root.label}`
                : `Ver el movimiento de ${root.label} en el modelo`
            }
            title={
              demoing
                ? 'Detener el movimiento'
                : 'Ver este movimiento en el modelo 3D'
            }
            className={`btn btn-icon shrink-0 ${
              demoing ? 'btn-primary' : 'btn-line hover:text-brand'
            }`}
          >
            {demoing ? <StopIcon size={12} /> : <PlayIcon size={12} />}
          </button>
        )}
        {/* EL CHEVRON PROMETIA UN CLIC QUE NO HACIA NADA. Era un icono suelto
            fuera del boton de la fila: tenia forma de "desplegar" y pulsarlo no
            desplegaba. Ahora responde igual que la fila; el teclado y el lector
            ya tienen el boton de la fila (con `aria-expanded`), asi que este no
            entra en el orden de tabulacion. */}
        <button
          type="button"
          onClick={onPick}
          tabIndex={-1}
          aria-hidden="true"
          className="btn btn-quiet btn-sm btn-icon mt-[3px] shrink-0 text-fg3"
        >
          <ChevronDownIcon
            size={12}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* La segunda linea, a todo el ancho bajo el texto (sangrada 48 px, lo
          que mide el nombre de la raiz con su hueco). Pulsarla elige la raiz
          igual que el movimiento: es un blanco mas grande, no un tercer boton. */}
      <div onClick={onPick} className="flex cursor-pointer items-center gap-2 pb-2 pl-12 pr-1">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-fg3">
          {/* The KEY POINT holds and the reflex name gives way: with it the
              other way round, "Braquiorradial o estilorradial" shrank C6's key
              point to "Pul...", which is the one word on the row a student is
              trying to memorise. Y si no caben los dos, el reflejo baja a la
              linea siguiente; el martillo ya los separa, sin punto medio que
              quede colgando. */}
          <span className="min-w-0">{root.dermatome.keyPointShort ?? root.dermatome.keyPoint}</span>
          {reflexWord && (
            <span className="flex min-w-0 items-center gap-1">
              <HammerGlyph />
              <span className="truncate">{reflexWord}</span>
            </span>
          )}
        </span>
        <StateDots root={root} finding={finding} />
      </div>

      {expanded && (
        <div className="space-y-2.5 pb-3 pt-0.5">
          {/* The summary line above already gives the key point, so this lane adds
              the TERRITORY, which is the part a student is trying to learn. */}
          <Lane
            glyph={<PinGlyph color={pigment} />}
            label="Sensibilidad · dermatoma"
            what="La piel que inerva. Compárala con el lado sano."
          >
            {root.dermatome.area}
            <Scale
              legend={`Sensibilidad en el punto clave de ${root.label}`}
              anchors={{ left: 'no siente', right: 'igual que el lado sano' }}
              options={SENSATION_SCALE}
              value={finding.sensation}
              onChange={(v) => onGrade({ sensation: v })}
            />
          </Lane>

          {/* Likewise: the action is the row's title, so this lane adds the MUSCLES. */}
          <Lane
            glyph={<MotionGlyph />}
            label="Fuerza · miotoma"
            what="El movimiento que gobierna. Resístelo y compara."
          >
            {root.myotome.muscles}
            {/* LAS DOS LECTURAS, SEPARADAS.
                `action` y `muscles` son el miotoma de la exploracion corriente;
                ISNCSCI es mas estrecho y la pantalla lo daba por el mismo.
                Ponerlos juntos y rotulados es lo que deja de mentir: C5 se
                explora por abduccion de hombro, pero se PUNTUA por los flexores
                de codo. Ver el comentario de `Myotome.asiaKey`. */}
            {root.myotome.asiaKey && (
              <span className="mt-1.5 block text-[11px] leading-snug text-fg2">
                <span className="text-fg3">Músculo clave ISNCSCI. </span>
                <span className="text-fg">{root.myotome.asiaKey}</span>
              </span>
            )}
            {root.myotome.asiaNonKey && (
              <span className="mt-0.5 block text-[11px] leading-snug text-fg3">
                Otros movimientos de esta raíz, que ISNCSCI no usa para puntuar.{' '}
                {root.myotome.asiaNonKey}
              </span>
            )}
            {/* No "En el modelo:" prefix: every one of these notes already opens
                with it, and the two together read "En el modelo: En el modelo se
                muestra...".
                Y MIENTRAS SU DEMO CORRE, LA NOTA NO SE REPITE AQUI: la dice la
                franja "En el modelo ahora" del panel, que es donde se lee lo
                que el demo esta ensenando. Con la fila abierta y el play
                pulsado salia dos veces en la misma columna. Antes de pulsar si
                va: es lo que dice que va a ensenar el play. */}
            {root.demo?.note && !demoing && (
              <span className="mt-1 block text-[11px] leading-snug text-fg3">{root.demo.note}</span>
            )}
            {!root.demo && root.demoNote && (
              <span className="mt-1 block text-[11px] leading-snug text-fg3">{root.demoNote}</span>
            )}
            <Scale
              legend={`Fuerza del miotoma ${root.label}, escala 0 a 5`}
              anchors={{ left: '0 ninguna', right: '5 normal' }}
              options={STRENGTH_SCALE}
              value={finding.strength}
              onChange={(v) => onGrade({ strength: v })}
            />
          </Lane>

          {/* Absence is information: C8, T1 and L5 have no reflex of their own, and
              that is precisely why L5 is the root that gets missed. */}
          <Lane
            glyph={<HammerGlyph />}
            label="Reflejo"
            what="Al percutir su tendón. Lo normal es 2, en medio."
          >
            {root.reflex ? (
              <>
                <span className="text-fg">{root.reflex.name}.</span>{' '}
                {root.reflex.elicitation}
                <Scale
                  legend={`Reflejo de ${root.label}, escala 0 a 4`}
                  anchors={{ left: '0 abolido', middle: '2 normal', right: '4 clonus' }}
                  options={REFLEX_SCALE}
                  value={finding.reflex}
                  onChange={(v) => onGrade({ reflex: v })}
                />
              </>
            ) : (
              <span className="text-fg2">
                Esta raíz no tiene reflejo profundo propio, así que el dermatoma y la
                fuerza cargan todo el peso del tamizaje.
              </span>
            )}
          </Lane>

          {/* Rotulo + filo, no un filo encima de un rotulo suelto. */}
          {root.mimic && (
            <div className="pt-1">
              <div className="flex items-center gap-2.5">
                <Kicker>No confundir con</Kicker>
                <span className="sec-rule" />
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-fg2">
                <span className="text-fg">{root.mimic.nerve}.</span>{' '}
                {root.mimic.discriminator}
              </p>
            </div>
          )}

          {root.pearl && <p className="note text-[13px] leading-relaxed">{root.pearl}</p>}

          <div>
            {root.cite.map((c) => {
              const ref = getReference(c.ref as ReferenceId);
              if (!ref) return null;
              return (
                <p key={c.ref} className="text-[11px] leading-snug text-fg3">
                  {formatReference(ref)}{' '}
                  {showVerifyMark && !c.verified && (
                    <span
                      className="text-amber-500/80"
                      title="Valores por verificar contra la fuente primaria"
                    >
                      · por verificar
                    </span>
                  )}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
