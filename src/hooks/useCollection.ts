// src/hooks/useCollection.ts
//
// React access to "Mi colección". The blob lives in localStorage (lib/collection.ts)
// and is read synchronously by several unrelated panels — the muscle sheet, the
// tests panel, the study view — which each need to re-render when ANY of them
// changes something. A plain `useState` per component would leave the others
// showing a stale bookmark icon.
//
// So this is a tiny module-level subscription, the same one-writer/many-readers
// pattern the movement lab already uses (rigChannel, layerChannel): every hook
// instance subscribes, any mutation notifies all of them.
//
// Cross-TAB changes are picked up too, via the `storage` event, so saving on one
// tab does not leave another tab lying about what is saved.

import { useCallback, useEffect, useState } from 'react';
import {
  COLLECTION_KEY,
  collectionKey,
  isSaved as isSavedIn,
  listItems,
  readCollection,
  removeItem,
  setNote as setNoteIn,
  toggleItem,
  writeCollection,
  type CollectionBlob,
  type CollectionItem,
  type CollectionKind,
} from '../lib/collection';

type Listener = (blob: CollectionBlob) => void;

let current: CollectionBlob | null = null;
const listeners = new Set<Listener>();

function get(): CollectionBlob {
  if (current == null) current = readCollection();
  return current;
}

function commit(next: CollectionBlob): void {
  current = next;
  writeCollection(next);
  for (const l of listeners) l(next);
}

/** Adopt a blob written by someone else (another tab, or the account merge). */
function adoptExternal(): void {
  current = readCollection();
  for (const l of listeners) l(current);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === COLLECTION_KEY) adoptExternal();
  });
}

export interface UseCollection {
  items: CollectionItem[];
  /** Live count, respecting the region filter. */
  count: number;
  isSaved: (kind: CollectionKind, region: string, id: string) => boolean;
  toggle: (input: {
    kind: CollectionKind;
    region: string;
    id: string;
    label: string;
  }) => void;
  remove: (key: string) => void;
  setNote: (key: string, note: string) => void;
  /** Re-read from storage — call after an account sync merges remote data in. */
  refresh: () => void;
}

/**
 * @param region optional filter for `items`/`count`; omit for the whole
 *   collection. Saving/removing is never filtered.
 */
export function useCollection(region?: string): UseCollection {
  const [blob, setBlob] = useState<CollectionBlob>(get);

  useEffect(() => {
    const l: Listener = (b) => setBlob(b);
    listeners.add(l);
    // Another hook instance may have mutated it between render and effect.
    setBlob(get());
    return () => {
      listeners.delete(l);
    };
  }, []);

  const isSaved = useCallback(
    (kind: CollectionKind, r: string, id: string) =>
      isSavedIn(blob, collectionKey(kind, r, id)),
    [blob],
  );

  const toggle = useCallback(
    (input: { kind: CollectionKind; region: string; id: string; label: string }) => {
      commit(toggleItem(get(), input, Date.now()));
    },
    [],
  );

  const remove = useCallback((key: string) => {
    commit(removeItem(get(), key, Date.now()));
  }, []);

  const setNote = useCallback((key: string, note: string) => {
    commit(setNoteIn(get(), key, note, Date.now()));
  }, []);

  const items = listItems(blob, region);

  return { items, count: items.length, isSaved, toggle, remove, setNote, refresh: adoptExternal };
}
