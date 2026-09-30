// src/components/CommandPalette.tsx
//
// Cmd/Ctrl+K (or "/"): one box that reaches EVERYTHING.
//
// -----------------------------------------------------------------------------
// WHY IT IS NO LONGER JUST A STRUCTURE SEARCH
// -----------------------------------------------------------------------------
// It used to search anatomy entries and nothing else, which made it the fastest
// way to find the supraspinatus and no help at all with the actual problem
// people have in this app: 9 modules x 4 modes = 36 places, reachable through
// two dropdowns and a segmented control that collapse differently at three
// breakpoints. Someone who could not find the movement lab could type "movi"
// into the one search box in the product and be told "Sin resultados".
//
// So the palette now indexes three things in one list:
//
//   IR A        -> the four modes of the current module
//   MÓDULOS     -> the nine regions, premium ones marked with a lock
//   ACCIONES    -> guide, shortcuts, evidence, plans
//   ESTRUCTURAS -> the anatomy index, as before
//
// Commands rank above structures on an equal match, because a user typing
// "hombro" wants the module, not a mesh whose canonical name contains it.
//
// EMPTY QUERY IS THE FEATURE. With nothing typed, the palette shows the
// navigation commands rather than 30 arbitrary meshes: opening it is then a way
// to see what the product contains, not just a faster way to type a name you
// already knew.
//
// Matching stays pure substring + token scoring, accent-insensitive, no
// dependency: "toracica" must find "Torácica" and "musculo" must find "Músculo".

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { useEntitlement } from '../auth/AuthContext';
import { formatShortName } from '../lib/formatName';
import { LAYER_META, SIDE_META } from '../lib/anatomyMeta';
import { MODE_NAV, REGION_NAV, regionLabel } from '../lib/navigation';
import { LockGlyph } from './account/PremiumGate';
import type { AnatomyEntry, AnatomyIndex } from '../types/anatomy';
import type { AppMode, Overlay } from './TopBar';

interface CommandPaletteProps {
  index: AnatomyIndex | null;
  /** The module the commands are relative to. */
  regionId: string;
  mode: AppMode;
  onGoMode: (mode: AppMode) => void;
  onGoRegion: (region: string) => void;
  onOpenOverlay: (overlay: Overlay) => void;
}

/** A navigation/action row. Structures are handled separately (see Row). */
interface Command {
  id: string;
  section: 'Ir a' | 'Módulos' | 'Acciones';
  label: string;
  hint: string;
  /** Extra words that should match this row without being shown. */
  keywords?: string;
  locked?: boolean;
  current?: boolean;
  run: () => void;
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

/**
 * Lowercase and strip diacritics. Without this the palette is unusable in its
 * own language: nobody reaches for the accent key mid-search, so "toracica"
 * found nothing and the fix "just type the accent" is not a fix.
 */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    // Combining diacritical marks, written as escapes so this source stays
    // ASCII (the repo has been bitten by an encoding incident before).
    .replace(/[\u0300-\u036f]/g, '');
}

function score(query: string, text: string): number {
  const q = fold(query);
  const t = fold(text);
  if (!q) return 0;
  const idx = t.indexOf(q);
  if (idx === -1) return -1;
  // Earlier match + shorter text scores higher.
  return 1000 - idx - text.length * 0.1;
}

export function CommandPalette({
  index,
  regionId,
  mode,
  onGoMode,
  onGoRegion,
  onOpenOverlay,
}: CommandPaletteProps) {
  const open = useAnatomyStore((s) => s.paletteOpen);
  const setOpen = useAnatomyStore((s) => s.setPaletteOpen);
  const selectMesh = useAnatomyStore((s) => s.selectMesh);
  const entitlement = useEntitlement();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Global Cmd/Ctrl+K to open, Esc to close. ("/" is handled by the app-level
  // shortcut hook, which knows whether something else owns the keyboard.)
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

  const commands = useMemo<Command[]>(() => {
    const close = (fn: () => void) => () => {
      setOpen(false);
      fn();
    };

    const modes: Command[] = MODE_NAV.map((m) => ({
      id: `mode:${m.id}`,
      section: 'Ir a',
      label: m.label,
      hint: m.tagline,
      keywords: m.promise,
      current: m.id === mode,
      run: close(() => onGoMode(m.id)),
    }));

    const regions: Command[] = REGION_NAV.map((r) => ({
      id: `region:${r.id}`,
      section: 'Módulos',
      label: r.label,
      hint: r.spine ? 'Columna' : 'Módulo',
      current: r.id === regionId,
      locked: !entitlement.canAccessRegion(r.id),
      run: close(() => onGoRegion(r.id)),
    }));

    const actions: Command[] = [
      {
        id: 'action:guide',
        section: 'Acciones',
        label: 'Guía rápida',
        hint: 'Dónde está cada cosa',
        keywords: 'ayuda perdido mapa tour',
        run: close(() => onOpenOverlay('guide')),
      },
      {
        id: 'action:shortcuts',
        section: 'Acciones',
        label: 'Atajos de teclado',
        hint: 'La lista completa',
        keywords: 'teclas shortcuts',
        run: close(() => onOpenOverlay('shortcuts')),
      },
      {
        id: 'action:evidence',
        section: 'Acciones',
        label: 'Evidencia clínica',
        hint: `Fuentes de ${regionLabel(regionId)}`,
        keywords: 'referencias citas pubmed bibliografia',
        locked: !entitlement.canUseFeature('evidence'),
        run: close(() => onOpenOverlay('evidence')),
      },
      {
        id: 'action:pricing',
        section: 'Acciones',
        label: 'Planes y precios',
        hint: 'Qué incluye Premium',
        keywords: 'suscripcion pagar premium',
        run: close(() => onOpenOverlay('pricing')),
      },
    ];

    return [...modes, ...regions, ...actions];
  }, [mode, regionId, entitlement, onGoMode, onGoRegion, onOpenOverlay, setOpen]);

  const structures = useMemo(() => {
    if (!index) return [];
    return dedupeByCanonical(
      index.entries.filter((e) => e.layer !== 'reference' && e.layer !== 'uncategorized'),
    );
  }, [index]);

  /** The rendered list: commands first, then matching structures. */
  const results = useMemo(() => {
    const q = query.trim();

    const matchedCommands = q
      ? commands
          .map((c) => ({
            c,
            s: Math.max(
              score(q, c.label),
              // Keywords match at a discount so a label hit always wins.
              c.keywords ? score(q, c.keywords) - 400 : -1,
            ),
          }))
          .filter((r) => r.s > 0)
          .sort((a, b) => b.s - a.s)
          .map((r) => r.c)
      : commands;

    const matchedStructures = q
      ? structures
          .map((e) => ({ e, s: score(q, formatShortName(e.canonicalName)) }))
          .filter((r) => r.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, 30)
          .map((r) => r.e)
      : // With no query the point is to show what the app CONTAINS, so the
        // commands carry the list and structures only hint that they are here.
        structures.slice(0, 6);

    return { commands: matchedCommands, structures: matchedStructures };
  }, [query, commands, structures]);

  /** Flat order for arrow-key navigation across both groups. */
  const flat = useMemo(
    () => [
      ...results.commands.map((c) => ({ kind: 'command' as const, c })),
      ...results.structures.map((e) => ({ kind: 'structure' as const, e })),
    ],
    [results],
  );

  useEffect(() => setActive(0), [query]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  if (!open) return null;

  const runIndex = (i: number) => {
    const item = flat[i];
    if (!item) return;
    if (item.kind === 'command') item.c.run();
    else {
      selectMesh(item.e.meshName);
      setOpen(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runIndex(active);
    }
  };

  let cursor = 0;

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
            placeholder="Busca una región, un modo o una estructura…"
            aria-label="Buscar en la aplicación"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
          />
          <span className="kbd">esc</span>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {flat.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              Sin resultados para “{query}”.
            </p>
          ) : (
            <>
              {(['Ir a', 'Módulos', 'Acciones'] as const).map((section) => {
                const rows = results.commands.filter((c) => c.section === section);
                if (rows.length === 0) return null;
                return (
                  <div key={section}>
                    <SectionLabel>{section}</SectionLabel>
                    {rows.map((c) => {
                      const i = cursor++;
                      return (
                        <CommandRow
                          key={c.id}
                          command={c}
                          active={i === active}
                          onHover={() => setActive(i)}
                          onRun={() => runIndex(i)}
                        />
                      );
                    })}
                  </div>
                );
              })}

              {results.structures.length > 0 && (
                <div>
                  <SectionLabel>
                    {query.trim() ? 'Estructuras' : 'Estructuras · escribe un nombre'}
                  </SectionLabel>
                  {results.structures.map((entry) => {
                    const i = cursor++;
                    return (
                      <StructureRow
                        key={`${entry.meshName}-${i}`}
                        entry={entry}
                        active={i === active}
                        onHover={() => setActive(i)}
                        onRun={() => runIndex(i)}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-slate-800/60 px-4 py-2 text-[11px] text-slate-600">
          <span className="flex items-center gap-1">
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> moverte
          </span>
          <span className="flex items-center gap-1">
            <span className="kbd">↵</span> abrir
          </span>
          <span className="ml-auto flex items-center gap-1">
            <span className="kbd">?</span> atajos
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
      {children}
    </p>
  );
}

function CommandRow({
  command,
  active,
  onHover,
  onRun,
}: {
  command: Command;
  active: boolean;
  onHover: () => void;
  onRun: () => void;
}) {
  return (
    <button
      type="button"
      data-active={active}
      onClick={onRun}
      onMouseEnter={onHover}
      className={[
        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
        active ? 'bg-accent/10' : 'hover:bg-slate-800/30',
      ].join(' ')}
    >
      <span className="flex-1 truncate text-sm text-slate-200">{command.label}</span>
      {/* A locked row is still shown and still navigable: it lands on the
          paywall, which is the whole point of marking it rather than hiding it. */}
      {command.locked && <LockGlyph className="shrink-0 text-amber-300" />}
      {command.current && (
        <span className="shrink-0 rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
          aquí
        </span>
      )}
      <span className="shrink-0 text-[11px] text-slate-600">{command.hint}</span>
    </button>
  );
}

function StructureRow({
  entry,
  active,
  onHover,
  onRun,
}: {
  entry: AnatomyEntry;
  active: boolean;
  onHover: () => void;
  onRun: () => void;
}) {
  const layer = LAYER_META[entry.layer];
  return (
    <button
      type="button"
      data-active={active}
      onClick={onRun}
      onMouseEnter={onHover}
      className={[
        'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
        active ? 'bg-accent/10' : 'hover:bg-slate-800/30',
      ].join(' ')}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${layer.dot}`} />
      <span className="flex-1 truncate text-sm text-slate-200">
        {formatShortName(entry.canonicalName)}
      </span>
      {entry.side !== 'center' && (
        <span className="shrink-0 text-xs text-slate-500">{SIDE_META[entry.side].label}</span>
      )}
      <span className="shrink-0 text-[11px] text-slate-600">{layer.label}</span>
    </button>
  );
}
