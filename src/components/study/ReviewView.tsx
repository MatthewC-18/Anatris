// src/components/study/ReviewView.tsx
//
// "Repaso": la sesion de repeticion espaciada. En vez de pasar el mazo entero
// cada vez, se ensenan solo las tarjetas que TOCAN (las que estan a punto de
// olvidarse) mas un goteo diario de nuevas, y cada una se califica con las
// cuatro notas de Anki. La nota reprograma la tarjeta y alimenta la racha.
//
// La agenda pura vive en lib/srs.ts; la persistencia y la cola en
// lib/srsStore.ts; la racha en lib/streak.ts; las teclas en lib/studyKeys.ts.
// Este componente solo las conduce.
//
// -----------------------------------------------------------------------------
// QUE TIENE QUE ENTENDERSE DE UN VISTAZO
// -----------------------------------------------------------------------------
//   1. CUANTAS QUEDAN: una linea y una barra de 2 px encima de la tarjeta.
//   2. CUAL ES LA ACCION: debajo de la tarjeta hay siempre UNA cosa que hacer.
//      Primero "Mostrar respuesta"; despues, las cuatro notas.
//   3. QUE PASA AL CALIFICAR: cada nota lleva escrito el plazo que produce
//      ("10 min", "1 día", "4 días") y la linea de debajo dice lo que no cabe
//      en el boton: que "Otra vez" la repite en esta misma sesion.
//
// Los botones de nota eran cuatro bloques tenidos de rosa, ambar, verde y azul.
// En LAMINA el color no decora: son cuatro `.btn`, y solo "Bien" (la nota por
// defecto, la del espacio) lleva relleno. La barra de acciones va pegada al
// borde inferior (`sticky`) para que en un telefono las notas esten a la vista
// aunque la respuesta sea larga.

import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Muscle } from '../../types/muscle';
import { buildStudyCards, type StudyCard, type StudyCardKind } from '../../lib/studyEngine';
import {
  buildQueue,
  getCardSchedule,
  recordReview,
  type QueueItem,
} from '../../lib/srsStore';
import {
  formatInterval,
  previewIntervalDays,
  type CardSchedule,
  type Grade,
} from '../../lib/srs';
import { recordStreakActivity } from '../../lib/streak';
import { GRADE_KEYS, reviewKeyAction } from '../../lib/studyKeys';
import { useStudyKeys } from '../../hooks/useStudyKeys';
import { FlipCard } from './FlipCard';

interface ReviewViewProps {
  region: string;
  muscles: Muscle[];
  /** Called after every graded card so the parent dashboard can refresh. */
  onReviewed?: () => void;
  /**
   * Lleva a otra forma de repasar. Es la salida de los dos finales de esta
   * vista ("todo al dia" y "sesion completada"), que sin ella solo ofrecian
   * adelantar tarjetas.
   */
  onGoTo?: (tab: 'cases' | 'quiz') => void;
}

/** Per-session tally shown on the summary screen. */
interface SessionTally {
  /** Distinct cards finished (graded something other than "again", or the
   *  final grade of a re-queued card). */
  completed: number;
  /** New cards introduced this session. */
  newCards: number;
  /** Times "again" was pressed (i.e. lapses/restarts this session). */
  again: number;
}

const GRADE_LABEL: Record<Grade, string> = {
  again: 'Otra vez',
  hard: 'Difícil',
  good: 'Bien',
  easy: 'Fácil',
};

/** El rotulo de la esquina de la tarjeta: que dato se esta preguntando. */
const KIND_LABEL: Record<StudyCardKind, string> = {
  latin: 'Nombre en latín',
  origin: 'Origen',
  insertion: 'Inserción',
  innervation: 'Inervación',
  action: 'Acciones',
};

export function ReviewView({ region, muscles, onReviewed, onGoTo }: ReviewViewProps) {
  // All cards available for this region, indexed by id for O(1) lookup.
  const cardsById = useMemo(() => {
    const map = new Map<string, StudyCard>();
    for (const c of buildStudyCards(muscles)) map.set(c.id, c);
    return map;
  }, [muscles]);
  const allIds = useMemo(() => Array.from(cardsById.keys()), [cardsById]);

  const [queue, setQueue] = useState<QueueItem[]>(() =>
    buildQueue(region, allIds, Date.now()),
  );
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [tally, setTally] = useState<SessionTally>({ completed: 0, newCards: 0, again: 0 });
  // Bumped on every grade so the interval previews re-read the latest schedule.
  const [reviewTick, setReviewTick] = useState(0);

  // Rebuild the queue when the region/deck or the seed changes.
  const resetSession = useCallback(
    (force: boolean) => {
      const now = Date.now();
      const next = force ? buildForcedQueue(region, allIds, now) : buildQueue(region, allIds, now);
      setQueue(next);
      setFlipped(false);
      setDone(false);
      setTally({ completed: 0, newCards: 0, again: 0 });
      setReviewTick((t) => t + 1);
    },
    [region, allIds],
  );

  const current = queue[0];
  const currentCard = current ? cardsById.get(current.cardId) ?? null : null;

  // The stored schedule for the current card, re-read after each grade so the
  // interval previews under the grade buttons are always honest.
  const currentSchedule: CardSchedule | null = useMemo(() => {
    if (!current) return null;
    return getCardSchedule(region, current.cardId, Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.cardId, reviewTick, region]);

  function grade(g: Grade) {
    if (!current) return;
    const now = Date.now();
    recordReview(region, current.cardId, g, now, current.isNew);
    recordStreakActivity(now);
    onReviewed?.();

    setTally((t) => ({
      completed: t.completed + (g === 'again' ? 0 : 1),
      newCards: t.newCards + (current.isNew ? 1 : 0),
      again: t.again + (g === 'again' ? 1 : 0),
    }));

    // "Otra vez": re-queue the card to the end (no longer new) so it is seen
    // again this session before finishing. Any other grade completes it.
    const [head, ...rest] = queue;
    const next = g === 'again' ? [...rest, { cardId: head.cardId, isNew: false }] : rest;
    setQueue(next);
    if (next.length === 0) setDone(true);
    setFlipped(false);
    setReviewTick((t) => t + 1);
  }

  // TECLADO: espacio o Intro muestran la respuesta y, ya a la vista, valen por
  // "Bien"; 1 a 4 son las cuatro notas. Ver lib/studyKeys.ts.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useStudyKeys(rootRef, (key) => {
    if (!current || !currentCard || done) return false;
    const action = reviewKeyAction(key, flipped);
    if (!action) return false;
    if (action.type === 'flip') setFlipped(true);
    else grade(action.grade);
    return true;
  });

  /* ----- Session summary ----- */
  if (done) {
    return (
      <SessionSummary
        tally={tally}
        region={region}
        allIds={allIds}
        onAgain={() => resetSession(false)}
        onStudyAhead={() => resetSession(true)}
        onGoTo={onGoTo}
      />
    );
  }

  /* ----- Empty / all-caught-up state ----- */
  if (!current || !currentCard) {
    return (
      <CaughtUp
        region={region}
        allIds={allIds}
        onStudyAhead={() => resetSession(true)}
        onGoTo={onGoTo}
      />
    );
  }

  // Remaining count for the progress readout (current card included).
  const remaining = queue.length;
  const sessionPct = Math.round((tally.completed / (tally.completed + remaining)) * 100);

  return (
    <div ref={rootRef} className="mx-auto flex max-w-2xl flex-col px-6 pt-5">
      {/* 1. Cuantas quedan. */}
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-fg2">
          <span className="num font-medium text-fg">{remaining}</span>{' '}
          {remaining === 1 ? 'tarjeta por repasar' : 'tarjetas por repasar'}
        </p>
        <p className="tag">
          {tally.completed} {tally.completed === 1 ? 'hecha' : 'hechas'}
        </p>
      </div>
      <div
        className="meter mb-4 mt-2 text-brand"
        style={{ '--v': sessionPct } as CSSProperties}
        role="progressbar"
        aria-label="Avance de la sesión"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={sessionPct}
      />

      <FlipCard
        kicker={KIND_LABEL[currentCard.kind]}
        status={current.isNew ? 'Nueva' : 'Repaso'}
        front={currentCard.front}
        sub={currentCard.sub}
        prompt={currentCard.prompt}
        facts={currentCard.facts}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
      />

      {/* 2 y 3. La accion, y lo que pasa despues. */}
      <div className="sticky bottom-0 -mx-6 bg-page px-6 pb-4 pt-3">
        {flipped ? (
          <>
            <div
              role="group"
              aria-label="Califica tu recuerdo"
              className="grid grid-cols-4 gap-2"
            >
              {GRADE_KEYS.map((g) => {
                const days = currentSchedule ? previewIntervalDays(currentSchedule, g) : 0;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => grade(g)}
                    className={`btn h-auto min-h-[44px] flex-col gap-1 px-1 py-2 ${
                      g === 'good' ? 'btn-primary' : 'btn-line'
                    }`}
                  >
                    <span>{GRADE_LABEL[g]}</span>
                    <span className="num text-[10px] font-normal opacity-80">
                      {formatInterval(days)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-fg3">
              Cada nota indica cuándo vuelve la tarjeta. «Otra vez» la repite en
              esta misma sesión.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="btn btn-primary h-auto min-h-[44px] w-full"
            >
              Mostrar respuesta
            </button>
            <p className="mt-2.5 text-xs leading-relaxed text-fg3">
              Responde mentalmente y luego muestra la respuesta para calificar tu
              recuerdo.
            </p>
          </>
        )}
        <KeyHints />
      </div>
    </div>
  );
}

/* ===========================================================================
 * SUB-VIEWS
 * ======================================================================== */

/**
 * Los atajos, a la vista. Solo donde hay raton (`hover: hover`): en una
 * pantalla tactil no hay teclado que anunciar y la linea le quitaria sitio a la
 * tarjeta.
 */
function KeyHints() {
  return (
    <p className="mt-2 hidden items-center gap-1.5 text-[11px] text-fg3 [@media(hover:hover)]:flex">
      <span className="kbd">Espacio</span>
      <span>muestra la respuesta y vale por «Bien»</span>
      <span aria-hidden="true">·</span>
      <span className="kbd">1</span>
      <span>a</span>
      <span className="kbd">4</span>
      <span>califican</span>
    </p>
  );
}

/** Shown when there is nothing due right now. */
function CaughtUp({
  region,
  allIds,
  onStudyAhead,
  onGoTo,
}: {
  region: string;
  allIds: string[];
  onStudyAhead: () => void;
  onGoTo?: (tab: 'cases' | 'quiz') => void;
}) {
  const next = useMemo(() => nextDueLabel(region, allIds), [region, allIds]);
  const hasUnseen = useMemo(
    () => allIds.some((id) => getCardSchedule(region, id, Date.now()).last === 0),
    [region, allIds],
  );
  return (
    <div className="mx-auto flex max-w-2xl flex-col px-6 py-10">
      <p className="kicker">Repaso</p>
      <p className="mt-2 font-display text-xl font-semibold text-fg">Todo al día</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-fg2">
        {next
          ? `No hay tarjetas pendientes ahora. Tu próximo repaso es ${next}.`
          : 'No hay tarjetas pendientes ahora.'}
        {hasUnseen && ' Ya completaste tus tarjetas nuevas de hoy.'}
      </p>
      <NextSteps onStudyAhead={onStudyAhead} onGoTo={onGoTo} />
    </div>
  );
}

/** End-of-session summary with the day's tally and the streak. */
function SessionSummary({
  tally,
  region,
  allIds,
  onAgain,
  onStudyAhead,
  onGoTo,
}: {
  tally: SessionTally;
  region: string;
  allIds: string[];
  onAgain: () => void;
  onStudyAhead: () => void;
  onGoTo?: (tab: 'cases' | 'quiz') => void;
}) {
  const next = useMemo(() => nextDueLabel(region, allIds), [region, allIds]);
  const moreDue = useMemo(
    () => buildQueue(region, allIds, Date.now()).length > 0,
    [region, allIds],
  );
  return (
    <div className="mx-auto flex max-w-2xl flex-col px-6 py-10">
      <p className="kicker">Sesión completada</p>
      {/* Una fila partida por filos, como la de la cabecera: la cifra que
          importa mas grande y las otras dos a su lado. */}
      <dl className="mt-4 flex">
        <SummaryStat
          label={tally.completed === 1 ? 'Tarjeta repasada' : 'Tarjetas repasadas'}
          value={tally.completed}
          lead
        />
        <SummaryStat label="Nuevas" value={tally.newCards} />
        <SummaryStat label="Repetidas" value={tally.again} />
      </dl>

      {next && <p className="mt-5 text-sm text-fg2">Tu próximo repaso es {next}.</p>}

      {moreDue ? (
        <div className="mt-5">
          <button type="button" onClick={onAgain} className="btn btn-primary">
            Seguir repasando
          </button>
        </div>
      ) : (
        <NextSteps onStudyAhead={onStudyAhead} onGoTo={onGoTo} />
      )}
    </div>
  );
}

function SummaryStat({ label, value, lead }: { label: string; value: number; lead?: boolean }) {
  return (
    <div
      className={`flex flex-col justify-end ${
        lead ? 'pr-5' : 'border-l border-line/75 px-5'
      }`}
    >
      <dt className="kicker order-2 mt-2">{label}</dt>
      <dd className={`readout order-1 ${lead ? 'text-5xl' : 'text-2xl'}`}>{value}</dd>
    </div>
  );
}

/**
 * Que hacer cuando no queda nada pendiente. Antes la unica salida era
 * "Adelantar repaso"; quien no queria adelantar se quedaba mirando una marca
 * de verificacion. Ahora se ofrecen tambien las otras dos formas de trabajar
 * la region, que no dependen de la agenda.
 */
function NextSteps({
  onStudyAhead,
  onGoTo,
}: {
  onStudyAhead: () => void;
  onGoTo?: (tab: 'cases' | 'quiz') => void;
}) {
  return (
    <div className="mt-6">
      <div className="sec-head">
        <span className="kicker">Mientras tanto</span>
        <span className="sec-rule" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onGoTo && (
          <>
            <button type="button" onClick={() => onGoTo('cases')} className="btn btn-line">
              Resolver un caso
            </button>
            <button type="button" onClick={() => onGoTo('quiz')} className="btn btn-line">
              Hacer un cuestionario
            </button>
          </>
        )}
        <button type="button" onClick={onStudyAhead} className="btn btn-quiet">
          Adelantar repaso
        </button>
      </div>
      <p className="mt-3 max-w-md text-xs leading-relaxed text-fg3">
        Adelantar repasa ahora tarjetas que todavía no tocan y las reprograma
        desde hoy.
      </p>
    </div>
  );
}

/* ===========================================================================
 * HELPERS
 * ======================================================================== */

/**
 * A "study ahead" queue ignoring due dates and the daily new cap: every card,
 * seen ones first. Lets a motivated student push past the schedule when they
 * have nothing due — without ever losing the underlying SRS schedule.
 */
function buildForcedQueue(region: string, allIds: string[], now: number): QueueItem[] {
  const seen: { id: string; due: number }[] = [];
  const fresh: string[] = [];
  for (const id of allIds) {
    const card = getCardSchedule(region, id, now);
    if (card.last === 0) fresh.push(id);
    else seen.push({ id, due: card.due });
  }
  seen.sort((a, b) => a.due - b.due);
  return [
    ...seen.map((s) => ({ cardId: s.id, isNew: false })),
    ...fresh.map((id) => ({ cardId: id, isNew: true })),
  ];
}

/** Relative Spanish label for the soonest upcoming due card ("mañana", "en 3 días"). */
function nextDueLabel(region: string, allIds: string[]): string | null {
  const now = Date.now();
  let soonest: number | null = null;
  for (const id of allIds) {
    const card = getCardSchedule(region, id, now);
    if (card.last === 0) continue; // unseen cards aren't "scheduled" yet
    if (card.due > now && (soonest == null || card.due < soonest)) soonest = card.due;
  }
  if (soonest == null) return null;
  const days = Math.ceil((soonest - now) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'hoy';
  if (days === 1) return 'mañana';
  return `en ${formatInterval(days)}`;
}
