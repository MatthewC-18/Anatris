// src/lib/srsStore.ts
//
// Persistence + queue-building for the spaced-repetition study system. The pure
// scheduling math lives in srs.ts; this module is the stateful seam: it stores
// each card's schedule per region in localStorage, enforces a daily new-card
// cap (so a student is never dumped 60 unseen cards at once), and assembles the
// ordered review queue the ReviewView walks through.
//
// The persisted shape mirrors what an account-backed backend would store per
// user, so syncing progress to the cloud later is a transport swap, not a
// rewrite. Same fail-open localStorage discipline as the rest of the app.

import {
  freshCard,
  isMature,
  schedule,
  type CardSchedule,
  type Grade,
} from './srs';
import { dayKey } from './streak';

/** New cards introduced per region per day. Keeps sessions humane. */
export const NEW_PER_DAY = 12;

/** Per-region persisted deck: each card's schedule + the daily new-card meter. */
interface DeckRecord {
  cards: Record<string, CardSchedule>;
  /** Day key the `newToday` counter belongs to. */
  newDate: string;
  /** New cards already introduced today (for the NEW_PER_DAY cap). */
  newToday: number;
}

interface SrsStore {
  decks: Record<string, DeckRecord>;
}

const KEY = 'anatris.srs.v1';

function emptyDeck(): DeckRecord {
  return { cards: {}, newDate: '', newToday: 0 };
}

function read(): SrsStore {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { decks: {} };
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SrsStore) : { decks: {} };
  } catch {
    return { decks: {} };
  }
}

function write(store: SrsStore): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Storage unavailable: schedules simply don't persist. Non-fatal.
  }
}

/** Read a deck, resetting its daily new-card meter when the day has rolled over. */
function readDeck(store: SrsStore, region: string, now: number): DeckRecord {
  const deck = store.decks[region] ?? emptyDeck();
  const today = dayKey(now);
  if (deck.newDate !== today) {
    return { ...deck, newDate: today, newToday: 0 };
  }
  return deck;
}

/** The stored schedule for a card, or a fresh (never-seen) one. */
export function getCardSchedule(region: string, cardId: string, now: number): CardSchedule {
  const deck = read().decks[region];
  return deck?.cards[cardId] ?? freshCard(now);
}

/**
 * Commit a graded review: schedule the card forward and persist it. `wasNew`
 * (the card had never been reviewed before this grade) consumes one slot of the
 * daily new-card allowance. Returns the new schedule.
 */
export function recordReview(
  region: string,
  cardId: string,
  grade: Grade,
  now: number,
  wasNew: boolean,
): CardSchedule {
  const store = read();
  const deck = readDeck(store, region, now);
  const prev = deck.cards[cardId] ?? freshCard(now);
  const next = schedule(prev, grade, now);

  deck.cards = { ...deck.cards, [cardId]: next };
  if (wasNew) deck.newToday += 1;
  store.decks[region] = deck;
  write(store);
  return next;
}

/** One entry in the review queue: the card id and whether it's brand new. */
export interface QueueItem {
  cardId: string;
  isNew: boolean;
}

/**
 * Build the ordered review queue for a region from the full list of available
 * card ids. Due (already-seen) cards come first, soonest-due first; then up to
 * the remaining daily allowance of brand-new cards. Cards scheduled into the
 * future are skipped. `allCardIds` is the deck the study engine generated, so
 * adding muscles to a region grows the queue automatically.
 */
export function buildQueue(region: string, allCardIds: string[], now: number): QueueItem[] {
  const deck = readDeck(read(), region, now);

  const due: { id: string; due: number }[] = [];
  const fresh: string[] = [];
  for (const id of allCardIds) {
    const card = deck.cards[id];
    if (!card) {
      fresh.push(id);
    } else if (card.due <= now) {
      due.push({ id, due: card.due });
    }
  }
  due.sort((a, b) => a.due - b.due);

  const newAllowance = Math.max(0, NEW_PER_DAY - deck.newToday);
  const queue: QueueItem[] = due.map((d) => ({ cardId: d.id, isNew: false }));
  for (const id of fresh.slice(0, newAllowance)) {
    queue.push({ cardId: id, isNew: true });
  }
  return queue;
}

/** Aggregate, at-a-glance stats for a region's deck (drives the dashboard). */
export interface DeckStats {
  /** Total cards available in the region. */
  total: number;
  /** Cards seen at least once. */
  seen: number;
  /** Cards never seen. */
  unseen: number;
  /** Reviews waiting right now (due seen-cards + today's new allowance). */
  toReview: number;
  /** Cards with a mature (>= 21 day) interval — long-term memory. */
  mature: number;
  /** Mastery as mature / total, 0-100. */
  masteryPct: number;
  /** Soonest future due timestamp among scheduled cards (null if none ahead). */
  nextDue: number | null;
}

/** Compute deck stats for a region given its full card-id list. */
export function getDeckStats(region: string, allCardIds: string[], now: number): DeckStats {
  const deck = readDeck(read(), region, now);
  const total = allCardIds.length;

  let seen = 0;
  let mature = 0;
  let dueSeen = 0;
  let unseen = 0;
  let nextDue: number | null = null;

  for (const id of allCardIds) {
    const card = deck.cards[id];
    if (!card) {
      unseen += 1;
      continue;
    }
    seen += 1;
    if (isMature(card)) mature += 1;
    if (card.due <= now) {
      dueSeen += 1;
    } else if (nextDue == null || card.due < nextDue) {
      nextDue = card.due;
    }
  }

  const newAllowance = Math.max(0, NEW_PER_DAY - deck.newToday);
  const toReview = dueSeen + Math.min(unseen, newAllowance);
  const masteryPct = total === 0 ? 0 : Math.round((mature / total) * 100);

  return { total, seen, unseen, toReview, mature, masteryPct, nextDue };
}
