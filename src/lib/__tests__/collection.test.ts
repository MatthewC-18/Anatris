// src/lib/__tests__/collection.test.ts
//
// The merge is where a collection silently loses a user's work, and the failure
// is asymmetric: a bug that keeps too much is an annoyance, a bug that drops a
// note the user wrote is unrecoverable. So the merge gets the tests, not the
// getters.
//
// The specific trap these cover: DELETING BY ABSENCE. If a removed item were
// simply dropped from the blob, the merge (a union) would resurrect it from any
// device that still had it — the classic distributed-delete bug. Tombstones are
// what make deletion a write like any other, and `mergeCollections` has to
// honour them by recency.

import { describe, expect, it } from 'vitest';
import {
  EMPTY_COLLECTION,
  collectionKey,
  isSaved,
  listItems,
  mergeCollections,
  pruneTombstones,
  removeItem,
  saveItem,
  setNote,
  toggleItem,
  type CollectionBlob,
} from '../collection';

const item = { kind: 'muscle' as const, region: 'knee', id: 'popliteus', label: 'Poplíteo' };
const KEY = collectionKey('muscle', 'knee', 'popliteus');

describe('basic operations', () => {
  it('saves, reads back and removes', () => {
    let blob = saveItem(EMPTY_COLLECTION, item, 1000);
    expect(isSaved(blob, KEY)).toBe(true);
    expect(listItems(blob)).toHaveLength(1);

    blob = removeItem(blob, KEY, 2000);
    expect(isSaved(blob, KEY)).toBe(false);
    expect(listItems(blob)).toHaveLength(0);
    // The tombstone is still there — that is the point.
    expect(blob.items[KEY].deletedAt).toBe(2000);
  });

  it('toggles both ways', () => {
    let blob = toggleItem(EMPTY_COLLECTION, item, 1000);
    expect(isSaved(blob, KEY)).toBe(true);
    blob = toggleItem(blob, item, 2000);
    expect(isSaved(blob, KEY)).toBe(false);
  });

  it('keeps the note when an item is deleted and saved again', () => {
    // Re-saving after an accidental delete must not silently destroy what the
    // user wrote; that would be the worst possible surprise in this feature.
    let blob = saveItem(EMPTY_COLLECTION, item, 1000);
    blob = setNote(blob, KEY, 'Desbloquea la rodilla', 1100);
    blob = removeItem(blob, KEY, 1200);
    blob = saveItem(blob, item, 1300);
    expect(blob.items[KEY].note).toBe('Desbloquea la rodilla');
    expect(blob.items[KEY].savedAt).toBe(1000);
  });

  it('filters by region', () => {
    let blob = saveItem(EMPTY_COLLECTION, item, 1000);
    blob = saveItem(
      blob,
      { kind: 'test', region: 'shoulder', id: 'neer', label: 'Test de Neer' },
      1100,
    );
    expect(listItems(blob, 'knee')).toHaveLength(1);
    expect(listItems(blob, 'shoulder')).toHaveLength(1);
    expect(listItems(blob)).toHaveLength(2);
  });
});

describe('mergeCollections', () => {
  it('is commutative and idempotent', () => {
    const a = saveItem(EMPTY_COLLECTION, item, 1000);
    const b = saveItem(
      EMPTY_COLLECTION,
      { kind: 'test', region: 'shoulder', id: 'neer', label: 'Test de Neer' },
      1100,
    );
    expect(mergeCollections(a, b)).toEqual(mergeCollections(b, a));
    expect(mergeCollections(mergeCollections(a, b), b)).toEqual(mergeCollections(a, b));
  });

  it('keeps the more recent edit of the same item', () => {
    const older = setNote(saveItem(EMPTY_COLLECTION, item, 1000), KEY, 'viejo', 1100);
    const newer = setNote(saveItem(EMPTY_COLLECTION, item, 1000), KEY, 'nuevo', 1200);
    expect(mergeCollections(older, newer).items[KEY].note).toBe('nuevo');
    expect(mergeCollections(newer, older).items[KEY].note).toBe('nuevo');
  });

  it('does NOT resurrect an item deleted on the other device', () => {
    // Device A saves; device B (which had it) deletes later. The union must not
    // bring it back.
    const deviceA = saveItem(EMPTY_COLLECTION, item, 1000);
    const deviceB = removeItem(saveItem(EMPTY_COLLECTION, item, 1000), KEY, 2000);

    expect(isSaved(mergeCollections(deviceA, deviceB), KEY)).toBe(false);
    expect(isSaved(mergeCollections(deviceB, deviceA), KEY)).toBe(false);
  });

  it('lets a later re-save win over an earlier delete', () => {
    const deleted = removeItem(saveItem(EMPTY_COLLECTION, item, 1000), KEY, 2000);
    const resaved = saveItem(deleted, item, 3000);
    expect(isSaved(mergeCollections(deleted, resaved), KEY)).toBe(true);
    expect(isSaved(mergeCollections(resaved, deleted), KEY)).toBe(true);
  });

  it('treats a missing collection as empty rather than as a wipe', () => {
    const a = saveItem(EMPTY_COLLECTION, item, 1000);
    expect(mergeCollections(a, EMPTY_COLLECTION).items[KEY]).toBeDefined();
  });
});

describe('pruneTombstones', () => {
  const DAY = 24 * 3600_000;
  // A realistic epoch, not a small integer: the window is 90 DAYS, so a `now`
  // of 100_000_000 is itself younger than the window and nothing would ever
  // look stale.
  const NOW = Date.UTC(2026, 7, 7);

  it('keeps a tombstone inside the window', () => {
    const fresh = removeItem(saveItem(EMPTY_COLLECTION, item, 1), KEY, NOW - 30 * DAY);
    expect(pruneTombstones(fresh, NOW).items[KEY]).toBeDefined();
  });

  it('drops a tombstone past the window', () => {
    const stale = removeItem(saveItem(EMPTY_COLLECTION, item, 1), KEY, NOW - 120 * DAY);
    expect(pruneTombstones(stale, NOW).items[KEY]).toBeUndefined();
  });

  it('never drops a live item, however old', () => {
    const blob: CollectionBlob = saveItem(EMPTY_COLLECTION, item, 1);
    expect(pruneTombstones(blob, NOW).items[KEY]).toBeDefined();
  });
});
