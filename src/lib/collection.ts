// src/lib/collection.ts
//
// "Mi colección": the user's own saved muscles, tests, movements and cases,
// each with an optional free-text note.
//
// WHY THIS EXISTS: the app had nowhere for the user to leave a trace of their
// own work. A professional who cannot save anything consults the tool and
// leaves; retention in a reference product comes from the content the USER
// creates inside it. It is also the first honest reason to make an account that
// has nothing to do with paying.
//
// LOCAL-FIRST, SYNCED FOR FREE: the blob rides along in the existing
// StudySnapshot (studyState.ts), so it inherits the whole account-sync
// machinery — pull, monotonic merge, debounced push — without a new table, a
// new endpoint or a new failure mode. Offline it simply stays local.
//
// MERGE SEMANTICS: per item, last write wins by `updatedAt`, and deletions are
// TOMBSTONES rather than removals. Deleting by absence would be broken here:
// device A deletes an item, device B still has it, the merge is a union — and
// the item comes back from the dead. A tombstone is a write like any other, so
// it merges by the same rule and the deletion sticks.
//
// Same fail-open localStorage discipline as the rest of the app.

/** What kind of thing was saved. Determines where "abrir" navigates to. */
export type CollectionKind = 'muscle' | 'test' | 'movement' | 'case';

export interface CollectionItem {
  /** `${kind}:${region}:${id}` — stable, and unique across regions. */
  key: string;
  kind: CollectionKind;
  /** Region id the item belongs to, so the app can jump back to it. */
  region: string;
  /** The muscle / test / movement / case id within that region. */
  id: string;
  /**
   * Display name captured AT SAVE TIME. Denormalised on purpose: a premium
   * region's content is not loaded until that region is opened, so resolving
   * the name lazily would render a collection full of blanks.
   */
  label: string;
  /** The user's own note. Empty string = saved without a note. */
  note: string;
  savedAt: number;
  /** Last change (save, note edit, or delete). Drives the merge. */
  updatedAt: number;
  /** Tombstone: when set, the item is deleted. See the merge note above. */
  deletedAt?: number;
}

export interface CollectionBlob {
  items: Record<string, CollectionItem>;
}

/** localStorage key. Exported so studyState can read/write the same blob. */
export const COLLECTION_KEY = 'anatris.collection';

export const EMPTY_COLLECTION: CollectionBlob = { items: {} };

/** Build the composite key for an item. */
export function collectionKey(kind: CollectionKind, region: string, id: string): string {
  return `${kind}:${region}:${id}`;
}

/* ---------------------------------------------------------------------------
 * Persistence (fail-open: storage can throw or be absent)
 * ------------------------------------------------------------------------ */

export function readCollection(): CollectionBlob {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return EMPTY_COLLECTION;
    const raw = window.localStorage.getItem(COLLECTION_KEY);
    if (!raw) return EMPTY_COLLECTION;
    const parsed = JSON.parse(raw) as CollectionBlob;
    return parsed && typeof parsed === 'object' && parsed.items
      ? parsed
      : EMPTY_COLLECTION;
  } catch {
    return EMPTY_COLLECTION;
  }
}

export function writeCollection(blob: CollectionBlob): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(COLLECTION_KEY, JSON.stringify(blob));
  } catch {
    /* storage unavailable: the collection stays in memory for this session. */
  }
}

/* ---------------------------------------------------------------------------
 * Pure operations. Each returns a NEW blob so callers can diff/merge freely.
 * ------------------------------------------------------------------------ */

/** True when the item is saved and not tombstoned. */
export function isSaved(blob: CollectionBlob, key: string): boolean {
  const it = blob.items[key];
  return it != null && it.deletedAt == null;
}

/** Save an item (or resurrect a deleted one, keeping its old note). */
export function saveItem(
  blob: CollectionBlob,
  input: { kind: CollectionKind; region: string; id: string; label: string },
  now: number,
): CollectionBlob {
  const key = collectionKey(input.kind, input.region, input.id);
  const prev = blob.items[key];
  const item: CollectionItem = {
    key,
    kind: input.kind,
    region: input.region,
    id: input.id,
    label: input.label,
    // Resurrecting keeps whatever note the user had written before.
    note: prev?.note ?? '',
    savedAt: prev?.savedAt ?? now,
    updatedAt: now,
  };
  return { items: { ...blob.items, [key]: item } };
}

/** Delete an item by tombstone (see the merge note at the top). */
export function removeItem(blob: CollectionBlob, key: string, now: number): CollectionBlob {
  const prev = blob.items[key];
  if (!prev) return blob;
  return {
    items: { ...blob.items, [key]: { ...prev, deletedAt: now, updatedAt: now } },
  };
}

/** Toggle saved/not-saved. */
export function toggleItem(
  blob: CollectionBlob,
  input: { kind: CollectionKind; region: string; id: string; label: string },
  now: number,
): CollectionBlob {
  const key = collectionKey(input.kind, input.region, input.id);
  return isSaved(blob, key)
    ? removeItem(blob, key, now)
    : saveItem(blob, input, now);
}

/** Set (or clear) the note on a saved item. No-op for unknown keys. */
export function setNote(
  blob: CollectionBlob,
  key: string,
  note: string,
  now: number,
): CollectionBlob {
  const prev = blob.items[key];
  if (!prev) return blob;
  return { items: { ...blob.items, [key]: { ...prev, note, updatedAt: now } } };
}

/**
 * The live items, newest first. Tombstones never surface.
 * @param region optional filter; omit for everything.
 */
export function listItems(blob: CollectionBlob, region?: string): CollectionItem[] {
  return Object.values(blob.items)
    .filter((i) => i.deletedAt == null && (region == null || i.region === region))
    .sort((a, b) => b.savedAt - a.savedAt);
}

/** How many live items (optionally within one region). */
export function countItems(blob: CollectionBlob, region?: string): number {
  return listItems(blob, region).length;
}

/* ---------------------------------------------------------------------------
 * MERGE — monotonic, commutative, idempotent (same contract as studyState).
 * ------------------------------------------------------------------------ */

/**
 * Reconcile two collections. Per key the later `updatedAt` wins, so an edit on
 * one device and a delete on another resolve by recency rather than by which
 * device happened to sync last. Ties keep `a`, which makes the function
 * deterministic (and the tie case is a same-millisecond write, i.e. the same
 * action echoed back).
 */
export function mergeCollections(a: CollectionBlob, b: CollectionBlob): CollectionBlob {
  const items: Record<string, CollectionItem> = { ...a.items };
  for (const [key, remote] of Object.entries(b.items)) {
    const local = items[key];
    if (!local || remote.updatedAt > local.updatedAt) items[key] = remote;
  }
  return { items };
}

/**
 * Drop tombstones that are old enough that every device has certainly seen
 * them. Without this the blob grows forever with deleted rows. 90 days is far
 * beyond any realistic offline gap, and reviving a 3-month-old deletion is a
 * price worth paying for a payload that stays small.
 */
export function pruneTombstones(blob: CollectionBlob, now: number, maxAgeMs = 90 * 24 * 3600_000): CollectionBlob {
  const items: Record<string, CollectionItem> = {};
  for (const [key, item] of Object.entries(blob.items)) {
    if (item.deletedAt != null && now - item.deletedAt > maxAgeMs) continue;
    items[key] = item;
  }
  return { items };
}
