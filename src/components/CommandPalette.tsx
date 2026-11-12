// src/components/CommandPalette.tsx
//
// Cmd/Ctrl+K fuzzy-ish search over all anatomy entries by canonical name.
// Selecting a result selects the mesh, frames nothing (keeps current view),
// and closes the palette. Pure substring + token scoring; no dependency.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { formatShortName } from '../lib/formatName';
import { LAYER_META, SIDE_META } from '../lib/anatomyMeta';
import type { AnatomyEntry, AnatomyIndex } from '../types/anatomy';

interface CommandPaletteProps {
  index: AnatomyIndex | null;
}

/** Deduplicate entries by canonical name for a cleaner result list. */
function dedupeByCanonical(entries: AnatomyEntry[]): AnatomyEntry[] {
  const seen = new Set<string>();
  const out: AnatomyEntry[] = [];
  for (const e of entries) {
    const key = `${e.canonicalName}|${e.side}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function score(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 0;
  const idx = t.indexOf(q);
  if (idx === -1) return -1;
  // Earlier match + shorter text scores higher.
  return 1000 - idx - text.length * 0.1;
}

export function CommandPalette({ index }: CommandPaletteProps) {
  const open = useAnatomyStore((s) => s.paletteOpen);
  const setOpen = useAnatomyStore((s) => s.setPaletteOpen);
  const selectMesh = useAnatomyStore((s) => s.selectMesh);

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Global Cmd/Ctrl+K to open, Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const candidates = useMemo(() => {
    if (!index) return [];
    return dedupeByCanonical(
      index.entries.filter((e) => e.layer !== 'reference' && e.layer !== 'uncategorized'),
    );
  }, [index]);

  const results = useMemo(() => {
    if (!query.trim()) return candidates.slice(0, 30);
    return candidates
      .map((e) => ({ e, s: score(query, formatShortName(e.canonicalName)) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((r) => r.e);
  }, [query, candidates]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const choose = (entry: AnatomyEntry) => {
    selectMesh(entry.meshName);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) choose(results[active]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-page/80"
        onClick={() => setOpen(false)}
      />

      {/* Panel. LAMINA: la paleta flota de verdad, asi que lleva superficie
          (`.instrument`: grafito opaco, filo de 1 px, 6 px de radio). Dentro no
          hay cajas: las filas van de borde a borde y la activa se marca con el
          mismo velo con que responde un boton. */}
      <div className="instrument relative mx-3 w-full max-w-lg overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-fg3" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar una estructura anatómica…"
            className="min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg3 focus:outline-none"
          />
          <span className="kbd">esc</span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-fg3">
              Sin resultados para “{query}”.
            </p>
          ) : (
            results.map((entry, i) => {
              const layer = LAYER_META[entry.layer];
              return (
                <button
                  key={`${entry.meshName}-${i}`}
                  type="button"
                  onClick={() => choose(entry)}
                  onMouseEnter={() => setActive(i)}
                  className={[
                    'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
                    i === active ? 'bg-fg/[0.06] text-fg' : 'text-fg2',
                  ].join(' ')}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${layer.dot}`} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {formatShortName(entry.canonicalName)}
                  </span>
                  <span className="tag shrink-0">
                    {entry.side !== 'center'
                      ? `${layer.label} · ${SIDE_META[entry.side].label}`
                      : layer.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
