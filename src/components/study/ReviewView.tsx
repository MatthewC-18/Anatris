// src/components/study/ReviewView.tsx
//
// "Repaso inteligente" — the spaced-repetition review session. This is the
// flagship premium study experience: instead of grinding the whole deck every
// time, the student is shown only the cards that are DUE (about to be forgotten)
// plus a humane daily trickle of new ones, and grades each with the four Anki
// grades. Each grade reschedules the card via the SRS engine and feeds the
// streak. The result is the same workflow medical/physio students already trust
// from Anki, built into the 3D anatomy tool so they never leave the app.
//
// Pure scheduling lives in lib/srs.ts; persistence + queue building in
// lib/srsStore.ts; the streak in lib/streak.ts. This component is just the UI
// that drives them.

import { useCallback, useMemo, useState } from 'react';
import type { Muscle } from '../../types/muscle';
import { buildStudyCards, type StudyCard } from '../../lib/studyEngine';
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

interface ReviewViewProps {
  region: string;
  muscles: Muscle[];
  /** Called after every graded card so the parent dashboard can refresh. */
  onReviewed?: () => void;
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

const GRADES: { grade: Grade; label: string; classes: string }[] = [
  {
    grade: 'again',
    label: 'Otra vez',
    classes: 'border-rose-700/50 bg-rose-950/30 text-rose-200 hover:bg-rose-900/40',
  },
  {
    grade: 'hard',
    label: 'Difícil',
    classes: 'border-amber-700/50 bg-amber-950/30 text-amber-200 hover:bg-amber-900/40',
  },
  {
    grade: 'good',
    label: 'Bien',
    classes:
      'border-emerald-700/50 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-900/40',
  },
  {
    grade: 'easy',
    label: 'Fácil',
    classes: 'border-sky-700/50 bg-sky-950/30 text-sky-200 hover:bg-sky-900/40',
  },
];

export function ReviewView({ region, muscles, onReviewed }: ReviewViewProps) {
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

  /* ----- Empty / all-caught-up state ----- */
  if (!current && !done) {
    return <CaughtUp region={region} allIds={allIds} onStudyAhead={() => resetSession(true)} />;
  }

  /* ----- Session summary ----- */
  if (done) {
    return (
      <SessionSummary
        tally={tally}
        region={region}
        allIds={allIds}
        onAgain={() => resetSession(false)}
        onStudyAhead={() => resetSession(true)}
      />
    );
  }

  // Remaining count for the progress readout (current card included).
  const remaining = queue.length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-6">
      {/* Progress + queue size */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-2">
          {current?.isNew ? (
            <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
              Nueva
            </span>
          ) : (
            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              Repaso
            </span>
          )}
          <span>{remaining} en cola</span>
        </span>
        <span>Hechas: {tally.completed}</span>
      </div>

      {/* Card */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="flex min-h-[16rem] w-full flex-col justify-center rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-8 text-left transition-colors hover:border-slate-700"
      >
        {!flipped ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="font-display text-2xl font-bold text-slate-50">
              {currentCard?.front}
            </span>
            {currentCard?.sub && (
              <span className="text-sm italic text-slate-500">{currentCard.sub}</span>
            )}
            {currentCard?.prompt && (
              <span className="mt-3 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                {currentCard.prompt}
              </span>
            )}
            <span className="mt-4 text-xs uppercase tracking-wide text-slate-600">
              Toca para revelar
            </span>
          </div>
        ) : (
          <dl className="flex flex-col gap-3">
            {currentCard?.facts.map((f) => (
              <div key={f.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-accent/80">
                  {f.label}
                </dt>
                <dd className="text-sm leading-relaxed text-slate-200">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </button>

      {/* Grade controls — only after the card is flipped, like Anki. */}
      {flipped ? (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map(({ grade: g, label, classes }) => {
            const days = currentSchedule ? previewIntervalDays(currentSchedule, g) : 0;
            return (
              <button
                key={g}
                type="button"
                onClick={() => grade(g)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors ${classes}`}
              >
                <span>{label}</span>
                <span className="text-[10px] font-normal opacity-80">
                  {formatInterval(days)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-xs text-slate-600">
          Responde mentalmente y luego gírala para calificar tu recuerdo.
        </p>
      )}
    </div>
  );
}

/* ===========================================================================
 * SUB-VIEWS
 * ======================================================================== */

/** Shown when there is nothing due right now. */
function CaughtUp({
  region,
  allIds,
  onStudyAhead,
}: {
  region: string;
  allIds: string[];
  onStudyAhead: () => void;
}) {
  const next = useMemo(() => nextDueLabel(region, allIds), [region, allIds]);
  const hasUnseen = useMemo(
    () => allIds.some((id) => getCardSchedule(region, id, Date.now()).last === 0),
    [region, allIds],
  );
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-2xl">
        ✓
      </div>
      <p className="font-display text-lg font-bold text-slate-50">¡Todo al día!</p>
      <p className="text-sm text-slate-400">
        {next
          ? `No hay cartas pendientes ahora. Tu próximo repaso es ${next}.`
          : 'No hay cartas pendientes ahora.'}
        {hasUnseen && ' Ya completaste tus cartas nuevas de hoy.'}
      </p>
      <button
        type="button"
        onClick={onStudyAhead}
        className="mt-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60"
      >
        Adelantar repaso
      </button>
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
}: {
  tally: SessionTally;
  region: string;
  allIds: string[];
  onAgain: () => void;
  onStudyAhead: () => void;
}) {
  const next = useMemo(() => nextDueLabel(region, allIds), [region, allIds]);
  const moreDue = useMemo(
    () => buildQueue(region, allIds, Date.now()).length > 0,
    [region, allIds],
  );
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-10 text-center">
      <p className="font-display text-sm font-semibold uppercase tracking-wide text-slate-500">
        Sesión completada
      </p>
      <p className="font-display text-5xl font-bold text-slate-50">{tally.completed}</p>
      <p className="text-sm text-slate-400">cartas repasadas</p>

      <div className="mt-2 flex gap-6 text-center">
        <SummaryStat label="Nuevas" value={tally.newCards} />
        <SummaryStat label="Repetidas" value={tally.again} />
      </div>

      {next && (
        <p className="mt-2 text-xs text-slate-500">Próximo repaso {next}.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        {moreDue ? (
          <button
            type="button"
            onClick={onAgain}
            className="rounded-lg bg-accent/20 px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
          >
            Seguir repasando
          </button>
        ) : (
          <button
            type="button"
            onClick={onStudyAhead}
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60"
          >
            Adelantar repaso
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-2xl font-bold text-slate-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-600">{label}</p>
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
