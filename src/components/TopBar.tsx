// src/components/TopBar.tsx
//
// Slim top bar: wordmark, region module navigation, search trigger, and the
// app-level controls (Acerca de / Legal, Explorar / Aprender). Everything lives
// INSIDE the header flow now (no floating absolute-positioned controls), so the
// left nav and the right controls never overlap on narrow widths.
//
// The module nav is the SINGLE region selector: clicking an active module
// writes store.region, and every region-aware piece follows it. Modules without
// data yet are shown disabled.
//
// The app-level mode (Explorar/Aprender) and overlay (Acerca de/Legal) are
// owned by App.tsx and passed in as props, so the TopBar stays presentational
// for those and App keeps a single source of truth.

import { useEffect, useRef, useState } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';

export type AppMode = 'explore' | 'learn' | 'study';
export type Overlay = 'none' | 'about' | 'legal';

interface TopBarProps {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  setOverlay: (o: Overlay) => void;
}

// The spine is three first-class regions (peers of shoulder/elbow in the store)
// grouped under one "Columna" nav entry, because that is how the student thinks
// of it. The button opens a submenu that sets the store region to one of these.
const SPINE_SUBREGIONS: { label: string; region: string }[] = [
  { label: 'Cervical', region: 'cervical' },
  { label: 'Torácica', region: 'thoracic' },
  { label: 'Lumbar', region: 'lumbar' },
];
const SPINE_REGION_IDS = SPINE_SUBREGIONS.map((s) => s.region);

// Module nav entries. `region` is the store region id when wired; `enabled:false`
// modules are on the roadmap but have no data yet. `spine:true` marks the entry
// that opens the sub-region submenu instead of selecting a region directly.
const MODULES: {
  label: string;
  region: string | null;
  enabled: boolean;
  spine?: boolean;
}[] = [
  { label: 'Fundamentos', region: 'fundamentos', enabled: true },
  { label: 'Hombro', region: 'shoulder', enabled: true },
  { label: 'Codo', region: 'elbow', enabled: true },
  { label: 'Columna', region: null, enabled: true, spine: true },
  { label: 'Rodilla', region: 'knee', enabled: true },
];

export function TopBar({ mode, setMode, setOverlay }: TopBarProps) {
  const setPaletteOpen = useAnatomyStore((s) => s.setPaletteOpen);
  const region = useAnatomyStore((s) => s.region);
  const setRegion = useAnatomyStore((s) => s.setRegion);
  const clearSelection = useAnatomyStore((s) => s.clearSelection);
  const activeRegion = region ?? 'shoulder';

  // Spine submenu open/close. Local UI state only; nothing touches the store.
  const [spineOpen, setSpineOpen] = useState(false);
  const spineRef = useRef<HTMLDivElement>(null);

  // Close the submenu on any outside click or Escape.
  useEffect(() => {
    if (!spineOpen) return;
    const onDown = (e: MouseEvent) => {
      if (spineRef.current && !spineRef.current.contains(e.target as Node)) {
        setSpineOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSpineOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [spineOpen]);

  const spineActive = SPINE_REGION_IDS.includes(activeRegion);

  const selectRegion = (target: string) => {
    if (target === activeRegion) return;
    setRegion(target);
    clearSelection();
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-slate-800/60 bg-ink-950/90 px-4">
      {/* Wordmark */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-display text-base font-bold tracking-tight text-slate-50">
          Anatris
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      </div>

      {/* Module nav -- the single region selector. */}
      <nav className="flex shrink-0 items-center gap-1">
        {MODULES.map((m) => {
          // Spine entry: a button that opens a sub-region submenu.
          if (m.spine) {
            return (
              <div key={m.label} ref={spineRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSpineOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={spineOpen}
                  className={[
                    'flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    spineActive
                      ? 'bg-slate-800/60 text-slate-100'
                      : 'text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                >
                  {m.label}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`transition-transform ${spineOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {spineOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-50 mt-1 min-w-[9rem] overflow-hidden rounded-xl border border-slate-800/80 bg-ink-950/95 p-1 shadow-xl backdrop-blur"
                  >
                    {SPINE_SUBREGIONS.map((sub) => {
                      const isActive = sub.region === activeRegion;
                      return (
                        <button
                          key={sub.region}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            selectRegion(sub.region);
                            setSpineOpen(false);
                          }}
                          className={[
                            'block w-full rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-accent/20 text-accent'
                              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
                          ].join(' ')}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Regular module entry (single region or disabled roadmap item).
          const isActive = m.enabled && m.region === activeRegion;
          return (
            <button
              key={m.label}
              type="button"
              disabled={!m.enabled}
              title={m.enabled ? undefined : 'Proximamente'}
              onClick={() => {
                if (!m.enabled || m.region == null) return;
                if (m.region === activeRegion) return;
                setRegion(m.region);
                clearSelection();
              }}
              className={[
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-800/60 text-slate-100'
                  : m.enabled
                    ? 'text-slate-500 hover:text-slate-300'
                    : 'cursor-not-allowed text-slate-700',
              ].join(' ')}
            >
              {m.label}
            </button>
          );
        })}
      </nav>

      {/* Spacer pushes everything after it to the right. */}
      <div className="min-w-0 flex-1" />

      {/* Search trigger */}
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="hidden shrink-0 items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:border-slate-700 hover:text-slate-300 md:flex"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <span className="hidden lg:inline">Buscar estructura</span>
        <span className="kbd ml-2">{String.fromCharCode(0x2318)}K</span>
      </button>

      {/* App-level controls: Acerca de / Legal */}
      <button
        type="button"
        onClick={() => setOverlay('about')}
        className="hidden shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200 lg:block"
      >
        Acerca de
      </button>
      <button
        type="button"
        onClick={() => setOverlay('legal')}
        className="hidden shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200 lg:block"
      >
        Legal
      </button>

      {/* Mode toggle: Explorar / Aprender */}
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-800/60 bg-slate-900/60 p-1">
        <ModeButton id="explore" label="Explorar" mode={mode} setMode={setMode} />
        <ModeButton id="learn" label="Aprender" mode={mode} setMode={setMode} />
        <ModeButton id="study" label="Estudiar" mode={mode} setMode={setMode} />
      </div>
    </header>
  );
}

function ModeButton({
  id,
  label,
  mode,
  setMode,
}: {
  id: AppMode;
  label: string;
  mode: AppMode;
  setMode: (m: AppMode) => void;
}) {
  const isActive = mode === id;
  return (
    <button
      type="button"
      onClick={() => setMode(id)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-accent/20 text-accent'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
