// src/lib/studyProgress.ts
//
// Lightweight per-region study progress, persisted in localStorage. This is the
// seed of the future account-backed progress sync: the shape here is what a
// backend would store per user. All access is wrapped in try/catch because
// localStorage can throw or be absent (private browsing, disabled storage).

export interface RegionProgress {
  /** Best quiz score as a 0-100 percentage. */
  quizBest: number;
  /** How many quiz sessions have been completed. */
  quizAttempts: number;
  /** How many flashcards have been graded "la sabía". */
  cardsKnown: number;
}

type ProgressMap = Record<string, RegionProgress>;

/** localStorage key for per-region study progress. Exported for cloud sync. */
export const PROGRESS_KEY = 'anatris.study.progress';

const EMPTY: RegionProgress = { quizBest: 0, quizAttempts: 0, cardsKnown: 0 };

function readAll(): ProgressMap {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: ProgressMap): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable: progress simply doesn't persist. Non-fatal.
  }
}

/** Read the stored progress for a region (zeros if never studied). */
export function getProgress(region: string): RegionProgress {
  return readAll()[region] ?? { ...EMPTY };
}

/** Record a finished quiz: bumps attempts and keeps the best score. */
export function recordQuiz(region: string, scorePct: number): RegionProgress {
  const map = readAll();
  const prev = map[region] ?? { ...EMPTY };
  const next: RegionProgress = {
    quizBest: Math.max(prev.quizBest, Math.round(scorePct)),
    quizAttempts: prev.quizAttempts + 1,
    cardsKnown: prev.cardsKnown,
  };
  map[region] = next;
  writeAll(map);
  return next;
}

/** Record graded flashcards from a deck review. */
export function recordCards(region: string, known: number): RegionProgress {
  const map = readAll();
  const prev = map[region] ?? { ...EMPTY };
  const next: RegionProgress = {
    ...prev,
    cardsKnown: prev.cardsKnown + Math.max(0, known),
  };
  map[region] = next;
  writeAll(map);
  return next;
}
