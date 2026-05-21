// src/hooks/useAnatomyIndex.ts
//
// Loads /anatomy-index.json once at runtime and exposes:
//   - index: the raw AnatomyIndex (or null while loading)
//   - byMesh: Map<meshName, AnatomyEntry> for O(1) lookups by runtime name
//   - status: 'loading' | 'ready' | 'error'
//
// The map keys are the runtime THREE.Mesh.name strings, which the build
// script guarantees to match what the viewer sees.

import { useEffect, useMemo, useState } from 'react';
import type { AnatomyEntry, AnatomyIndex } from '../types/anatomy';

type Status = 'loading' | 'ready' | 'error';

interface UseAnatomyIndexResult {
  index: AnatomyIndex | null;
  byMesh: Map<string, AnatomyEntry>;
  status: Status;
  error: string | null;
}

export function useAnatomyIndex(): UseAnatomyIndexResult {
  const [index, setIndex] = useState<AnatomyIndex | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    fetch('/anatomy-index.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<AnatomyIndex>;
      })
      .then((data) => {
        if (cancelled) return;
        setIndex(data);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const byMesh = useMemo(() => {
    const map = new Map<string, AnatomyEntry>();
    if (index) {
      for (const entry of index.entries) {
        // First write wins; duplicates (bilateral instances sharing a runtime
        // name) keep the first entry, which is fine for metadata display.
        if (!map.has(entry.meshName)) map.set(entry.meshName, entry);
      }
    }
    return map;
  }, [index]);

  return { index, byMesh, status, error };
}
