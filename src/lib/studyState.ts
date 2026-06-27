// src/lib/studyState.ts
//
// Unified, serialisable snapshot of ALL local study progress (SRS schedules,
// streak, per-region quiz/flashcard progress) plus the merge logic that lets two
// devices reconcile without a server clock fight. This is the foundation of
// account sync: `exportStudyState()` produces the payload to upload, and
// `importStudyState()` merges a downloaded payload back into localStorage.
//
// Merge philosophy: LAST-WRITE-WINS at the finest grain we can, using values
// that only ever grow:
//   - SRS cards merge per card by the later `last` review timestamp.
//   - Streak/progress fields merge by max (reviews, best score, streak length).
// Monotonic merges are commutative and idempotent, so syncing the same state
// twice — or in either order — converges to the same result. No data is lost.
//
// The cloud transport itself (Supabase) implements the StudyCloud interface
// below; this module stays provider-agnostic and fully unit-testable.

import { SRS_KEY } from './srsStore';
import { STREAK_KEY, type StreakState } from './streak';
import { PROGRESS_KEY, type RegionProgress } from './studyProgress';
import type { CardSchedule } from './srs';

/* ----- Raw persisted shapes (mirrors the three stores) ----- */
interface SrsDeck {
  cards: Record<string, CardSchedule>;
  newDate: string;
  newToday: number;
}
interface SrsBlob {
  decks: Record<string, SrsDeck>;
}
type ProgressBlob = Record<string, RegionProgress>;

/** Everything needed to restore a user's study progress on another device. */
export interface StudySnapshot {
  version: 1;
  /** When this snapshot was produced (epoch ms). */
  updatedAt: number;
  srs: SrsBlob;
  streak: StreakState | null;
  progress: ProgressBlob;
}

/**
 * Transport contract for syncing a StudySnapshot to a user's account. Provider
 * implementations (e.g. Supabase) live behind the auth seam; both methods are
 * best-effort and may reject — callers always guard.
 */
export interface StudyCloud {
  /** Download the stored snapshot for a user, or null if none exists yet. */
  pull(userId: string): Promise<StudySnapshot | null>;
  /** Upload (upsert) the snapshot for a user. */
  push(userId: string, snap: StudySnapshot): Promise<void>;
}

/* ===========================================================================
 * localStorage helpers (fail-open)
 * ======================================================================== */

function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: non-fatal. */
  }
}

/* ===========================================================================
 * EXPORT
 * ======================================================================== */

/** Bundle the current local study progress into one uploadable snapshot. */
export function exportStudyState(): StudySnapshot {
  return {
    version: 1,
    updatedAt: Date.now(),
    srs: readJson<SrsBlob>(SRS_KEY, { decks: {} }),
    streak: readJson<StreakState | null>(STREAK_KEY, null),
    progress: readJson<ProgressBlob>(PROGRESS_KEY, {}),
  };
}

/* ===========================================================================
 * PURE MERGES (commutative, idempotent, monotonic)
 * ======================================================================== */

/** Merge two SRS blobs, keeping each card's later review and the newer day meter. */
export function mergeSrs(a: SrsBlob, b: SrsBlob): SrsBlob {
  const decks: Record<string, SrsDeck> = {};
  const regions = new Set([...Object.keys(a.decks), ...Object.keys(b.decks)]);

  for (const region of regions) {
    const da = a.decks[region];
    const db = b.decks[region];
    if (!da) { decks[region] = db; continue; }
    if (!db) { decks[region] = da; continue; }

    const cards: Record<string, CardSchedule> = {};
    const ids = new Set([...Object.keys(da.cards), ...Object.keys(db.cards)]);
    for (const id of ids) {
      const ca = da.cards[id];
      const cb = db.cards[id];
      if (!ca) cards[id] = cb;
      else if (!cb) cards[id] = ca;
      // Keep the card reviewed most recently (or the more-scheduled one on ties).
      else cards[id] = cb.last > ca.last ? cb : ca.last > cb.last ? ca : (cb.due >= ca.due ? cb : ca);
    }

    // Daily new-card meter: keep the more recent day; same day -> the higher
    // count (so the cap is never under-counted across devices).
    let newDate: string;
    let newToday: number;
    if (da.newDate === db.newDate) {
      newDate = da.newDate;
      newToday = Math.max(da.newToday, db.newToday);
    } else if (da.newDate > db.newDate) {
      newDate = da.newDate;
      newToday = da.newToday;
    } else {
      newDate = db.newDate;
      newToday = db.newToday;
    }
    decks[region] = { cards, newDate, newToday };
  }
  return { decks };
}

/** Merge two streaks by taking the strongest/most-recent of each field. */
export function mergeStreak(a: StreakState | null, b: StreakState | null): StreakState | null {
  if (!a) return b;
  if (!b) return a;
  const lastDay = a.lastDay >= b.lastDay ? a.lastDay : b.lastDay;
  // reviewedToday only counts for whichever record owns the latest day.
  const reviewedToday =
    a.lastDay === b.lastDay
      ? Math.max(a.reviewedToday, b.reviewedToday)
      : lastDay === a.lastDay
        ? a.reviewedToday
        : b.reviewedToday;
  return {
    current: Math.max(a.current, b.current),
    longest: Math.max(a.longest, b.longest),
    totalReviews: Math.max(a.totalReviews, b.totalReviews),
    lastDay,
    reviewedToday,
  };
}

/** Merge two progress maps region-by-region, taking the best of each metric. */
export function mergeProgress(a: ProgressBlob, b: ProgressBlob): ProgressBlob {
  const out: ProgressBlob = {};
  const regions = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const region of regions) {
    const pa = a[region];
    const pb = b[region];
    if (!pa) { out[region] = pb; continue; }
    if (!pb) { out[region] = pa; continue; }
    out[region] = {
      quizBest: Math.max(pa.quizBest, pb.quizBest),
      quizAttempts: Math.max(pa.quizAttempts, pb.quizAttempts),
      cardsKnown: Math.max(pa.cardsKnown, pb.cardsKnown),
    };
  }
  return out;
}

/** Merge two full snapshots. Pure; used by importStudyState and tests. */
export function mergeSnapshots(local: StudySnapshot, remote: StudySnapshot): StudySnapshot {
  return {
    version: 1,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    srs: mergeSrs(local.srs, remote.srs),
    streak: mergeStreak(local.streak, remote.streak),
    progress: mergeProgress(local.progress, remote.progress),
  };
}

/* ===========================================================================
 * IMPORT
 * ======================================================================== */

/**
 * Merge a downloaded snapshot into local storage and persist the result. Returns
 * the merged snapshot (handy for immediately re-uploading the reconciled state).
 */
export function importStudyState(remote: StudySnapshot): StudySnapshot {
  const merged = mergeSnapshots(exportStudyState(), remote);
  writeJson(SRS_KEY, merged.srs);
  if (merged.streak) writeJson(STREAK_KEY, merged.streak);
  writeJson(PROGRESS_KEY, merged.progress);
  return merged;
}
