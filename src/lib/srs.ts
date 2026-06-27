// src/lib/srs.ts
//
// Spaced-repetition scheduler — the "modern learning" core of the study module.
// This is the same family of algorithm that powers Anki (SM-2), the de-facto
// standard tool medical and physiotherapy students use to memorize anatomy. It
// is what turns a one-shot flashcard deck into a study system that schedules
// each fact for review at the exact moment it is about to be forgotten, so the
// student spends time only on what is slipping.
//
// Design notes
// ------------
// - PURE and DETERMINISTIC: `schedule(prev, grade, now)` is a referentially
//   transparent function of its inputs. No I/O, no Date.now() inside — the
//   caller passes `now` so it can be tested and so a whole session shares one
//   clock. Persistence lives in srsStore.ts.
// - A simplified SM-2 with four grades (Again / Hard / Good / Easy), matching
//   what students already know from Anki, plus short "learning steps" for brand
//   new cards so a card isn't thrown a week out the very first time it's seen.
// - Intervals are in DAYS (fractional for the sub-day learning steps). The due
//   timestamp is epoch milliseconds so it round-trips through JSON cleanly.

/** The four review grades, ordered from worst to best recall. */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

/**
 * The scheduling state we persist for a single card. Mirrors the SM-2 variables
 * (ease, interval, reps) plus bookkeeping the UI surfaces (lapses, timestamps).
 */
export interface CardSchedule {
  /** Consecutive correct reviews since the last lapse. 0 = still learning. */
  reps: number;
  /** Times the card was forgotten after having graduated (clinical "weak spot"). */
  lapses: number;
  /** SM-2 ease factor. Starts at 2.5; never drops below 1.3. */
  ease: number;
  /** Current interval in days (fractional while in learning steps). */
  intervalDays: number;
  /** Epoch ms when the card next becomes due. */
  due: number;
  /** Epoch ms of the last review (0 = never reviewed). */
  last: number;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Starting ease, identical to SM-2 / Anki defaults. */
const START_EASE = 2.5;
/** Ease can never fall below this, or intervals would collapse. */
const MIN_EASE = 1.3;
/** A card whose interval reaches this many days is considered "mature". */
export const MATURE_DAYS = 21;

/**
 * Sub-day learning step (in days) for a brand-new card. A new card graded
 * "good" sits at this 10-minute step once, then graduates to its first real
 * (1-day) interval on the next "good" — the same short learning phase Anki uses
 * so a card isn't thrown a week out the very first time it is seen.
 */
const LEARNING_STEPS = [10 / (60 * 24)];

/** The fresh state for a card that has never been reviewed. */
export function freshCard(now: number): CardSchedule {
  return {
    reps: 0,
    lapses: 0,
    ease: START_EASE,
    intervalDays: 0,
    due: now,
    last: 0,
  };
}

/** Clamp a value into [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the next scheduling state for a card given the grade the student
 * assigned. `now` is epoch ms; pass the same value for a whole session.
 *
 * Learning (reps === 0):
 *   - again → restart at the first learning step (10 min)
 *   - hard  → hold at the first learning step
 *   - good  → advance one learning step; graduating off the last step gives a
 *             1-day interval and counts as the first rep
 *   - easy  → graduate immediately to a 4-day interval
 *
 * Review (reps >= 1):
 *   - again → lapse: ease penalised, interval reset to ~1 day, back to learning
 *   - hard  → interval × 1.2, ease −0.15
 *   - good  → interval × ease
 *   - easy  → interval × ease × 1.3, ease +0.15
 */
export function schedule(prev: CardSchedule, grade: Grade, now: number): CardSchedule {
  const reviewing = prev.reps >= 1;

  if (!reviewing) {
    return scheduleLearning(prev, grade, now);
  }

  let ease = prev.ease;
  let intervalDays: number;
  let reps = prev.reps;
  let lapses = prev.lapses;

  switch (grade) {
    case 'again':
      // Forgot a graduated card: a "lapse". Penalise ease, drop back into the
      // learning queue with a short interval so it is re-earned, not lost.
      lapses += 1;
      reps = 0;
      ease = clamp(ease - 0.2, MIN_EASE, 3.5);
      intervalDays = LEARNING_STEPS[0];
      break;
    case 'hard':
      ease = clamp(ease - 0.15, MIN_EASE, 3.5);
      intervalDays = Math.max(prev.intervalDays * 1.2, prev.intervalDays + 0.1);
      reps += 1;
      break;
    case 'good':
      intervalDays = prev.intervalDays * ease;
      reps += 1;
      break;
    case 'easy':
      ease = clamp(ease + 0.15, MIN_EASE, 3.5);
      intervalDays = prev.intervalDays * ease * 1.3;
      reps += 1;
      break;
  }

  return finalize(intervalDays, ease, reps, lapses, now);
}

/** Scheduling branch for cards still in the learning steps (reps === 0). */
function scheduleLearning(prev: CardSchedule, grade: Grade, now: number): CardSchedule {
  switch (grade) {
    case 'again':
      return finalizeLearning(LEARNING_STEPS[0], prev, now);
    case 'hard':
      // Hold at the first step (repeat soon) but don't fully reset progress.
      return finalizeLearning(LEARNING_STEPS[0], prev, now);
    case 'good': {
      // Advance one learning step; graduating gives the first real interval.
      const stepIndex = LEARNING_STEPS.indexOf(prev.intervalDays);
      const next = stepIndex + 1;
      if (next < LEARNING_STEPS.length) {
        return finalizeLearning(LEARNING_STEPS[next], prev, now);
      }
      return finalize(1, prev.ease, 1, prev.lapses, now);
    }
    case 'easy':
      // Skip the remaining steps: graduate straight to a 4-day interval.
      return finalize(4, prev.ease, 1, prev.lapses, now);
  }
}

/** Build a state that is still inside the learning steps (reps stays 0). */
function finalizeLearning(stepDays: number, prev: CardSchedule, now: number): CardSchedule {
  return {
    reps: 0,
    lapses: prev.lapses,
    ease: prev.ease,
    intervalDays: stepDays,
    due: now + stepDays * DAY_MS,
    last: now,
  };
}

/** Build a graduated/review state, rounding multi-day intervals to whole days. */
function finalize(
  intervalDays: number,
  ease: number,
  reps: number,
  lapses: number,
  now: number,
): CardSchedule {
  // Whole-day rounding for anything a day or longer keeps the "in N days"
  // preview honest and avoids 6.97-day intervals.
  const rounded = intervalDays >= 1 ? Math.round(intervalDays) : intervalDays;
  return {
    reps,
    lapses,
    ease,
    intervalDays: rounded,
    due: now + rounded * DAY_MS,
    last: now,
  };
}

/**
 * The interval (in days) a given grade WOULD produce, without committing it.
 * Drives the "<10 min / 1 día / 3 días …" hints under each grade button so the
 * student can see the consequence of their answer, exactly like Anki.
 */
export function previewIntervalDays(prev: CardSchedule, grade: Grade): number {
  // Reuse the real scheduler with a fixed clock so the preview can't drift from
  // what actually gets stored.
  const fixed = 0;
  return schedule(prev, grade, fixed).intervalDays;
}

/** A card is "mature" once its interval reaches MATURE_DAYS — long-term memory. */
export function isMature(card: CardSchedule): boolean {
  return card.intervalDays >= MATURE_DAYS;
}

/** True when the card is due for review at `now` (new cards are always due). */
export function isDue(card: CardSchedule, now: number): boolean {
  return card.due <= now;
}

/** Human, Spanish label for an interval in days ("10 min", "1 día", "3 días"). */
export function formatInterval(days: number): string {
  if (days < 1) {
    const minutes = Math.round(days * 24 * 60);
    return `${minutes} min`;
  }
  const whole = Math.round(days);
  if (whole === 1) return '1 día';
  if (whole < 30) return `${whole} días`;
  if (whole < 365) {
    const months = Math.round(whole / 30);
    return months === 1 ? '1 mes' : `${months} meses`;
  }
  const years = (whole / 365).toFixed(1).replace('.0', '');
  return `${years} año${years === '1' ? '' : 's'}`;
}
