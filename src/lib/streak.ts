// src/lib/streak.ts
//
// Daily study streak + daily goal — the engagement layer that keeps students
// coming back. A visible streak (the "don't break the chain" loop popularised by
// Duolingo) is one of the cheapest, highest-retention features a study product
// can ship, and it is exactly what a paying student expects from a premium tool.
//
// Persistence is localStorage with the same fail-open discipline used elsewhere
// in the app: every access is wrapped so private browsing / disabled storage can
// never crash the study session — the streak just doesn't persist.

/** How many card reviews count as "goal met" for the day. */
export const DAILY_GOAL = 20;

export interface StreakState {
  /** Consecutive days (up to and including today) with at least one review. */
  current: number;
  /** Best streak ever reached. */
  longest: number;
  /** YYYY-MM-DD of the last day a review was recorded ('' = never). */
  lastDay: string;
  /** Reviews graded today (resets at midnight, local time). */
  reviewedToday: number;
  /** Lifetime reviews graded across all regions. */
  totalReviews: number;
}

const KEY = 'anatris.streak.v1';

const EMPTY: StreakState = {
  current: 0,
  longest: 0,
  lastDay: '',
  reviewedToday: 0,
  totalReviews: 0,
};

/** Local-time day key (YYYY-MM-DD). Shared with srsStore for daily new-card caps. */
export function dayKey(now: number): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** The day key for the day before `now`. */
function yesterdayKey(now: number): string {
  return dayKey(now - 24 * 60 * 60 * 1000);
}

function read(): StreakState {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { ...EMPTY };
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<StreakState>) };
  } catch {
    return { ...EMPTY };
  }
}

function write(state: StreakState): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: the streak simply doesn't persist. Non-fatal.
  }
}

/**
 * Read the streak NORMALISED to `now`: if the last activity was before
 * yesterday the chain is broken, so we report `current: 0` and `reviewedToday:
 * 0` without waiting for the next review to rewrite storage. The stored
 * `longest` is always preserved.
 */
export function getStreak(now: number): StreakState {
  const s = read();
  const today = dayKey(now);
  const yesterday = yesterdayKey(now);

  if (s.lastDay === today) return s;
  if (s.lastDay === yesterday) {
    // Streak still alive but nothing done yet today.
    return { ...s, reviewedToday: 0 };
  }
  // Gap of a day or more (or never): chain broken.
  return { ...s, current: 0, reviewedToday: 0 };
}

/**
 * Record one graded review and return the updated, normalised streak. Call once
 * per card the student grades. Extends the streak on the first review of a new
 * day, leaves it untouched on later reviews the same day.
 */
export function recordStreakActivity(now: number): StreakState {
  const stored = read();
  const today = dayKey(now);
  const yesterday = yesterdayKey(now);

  let current: number;
  let reviewedToday: number;

  if (stored.lastDay === today) {
    current = stored.current || 1;
    reviewedToday = stored.reviewedToday + 1;
  } else if (stored.lastDay === yesterday) {
    current = stored.current + 1;
    reviewedToday = 1;
  } else {
    current = 1;
    reviewedToday = 1;
  }

  const next: StreakState = {
    current,
    longest: Math.max(stored.longest, current),
    lastDay: today,
    reviewedToday,
    totalReviews: stored.totalReviews + 1,
  };
  write(next);
  return next;
}
