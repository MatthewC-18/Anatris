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
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="glass-strong relative w-full max-w-lg overflow-hidden rounded-2xl animate-scale-in">
        <div className="flex items-center gap-3 border-b border-slate-800/60 px-4 py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar una estructura anatómica…"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
          />
          <span className="kbd">esc</span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
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
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    i === active ? 'bg-accent/10' : 'hover:bg-slate-800/30',
                  ].join(' ')}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${layer.dot}`} />
                  <span className="flex-1 truncate text-sm text-slate-200">
                    {formatShortName(entry.canonicalName)}
                  </span>
                  {entry.side !== 'center' && (
                    <span className="text-xs text-slate-500">
                      {SIDE_META[entry.side].label}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-600">{layer.label}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
