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
import { useEntitlement } from '../auth/AuthContext';
import { isRegionPremium } from '../auth/entitlements';
import { AccountMenu } from './account/AccountMenu';
import { BrandMark } from './BrandMark';

export type AppMode = 'explore' | 'learn' | 'study' | 'movement';
export type Overlay = 'none' | 'about' | 'legal' | 'pricing' | 'guide' | 'evidence';

/** localStorage flag: hide the "new" dot on the Guía button once it's opened. */
const GUIDE_SEEN_KEY = 'anatris.guideSeen';
function readGuideSeen(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(GUIDE_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
function writeGuideSeen(): void {
  try {
    window.localStorage.setItem(GUIDE_SEEN_KEY, '1');
  } catch {
    /* storage unavailable: the dot simply reappears next session */
  }
}

interface TopBarProps {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  setOverlay: (o: Overlay) => void;
  /** Open the sign-in / sign-up modal. */
  onOpenAuth: () => void;
}

/** Small lock glyph appended to premium modules the user can't access yet. */
function LockGlyph() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="opacity-70"
      aria-label="Premium"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
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
  { label: 'Cadera', region: 'hip', enabled: true },
  { label: 'Rodilla', region: 'knee', enabled: true },
  { label: 'Tobillo', region: 'ankle', enabled: true },
];

// Flattened region list for the MOBILE dropdown (spine expanded into its three
// sub-regions), derived from MODULES + SPINE_SUBREGIONS so it stays in sync.
const MOBILE_REGIONS: { label: string; region: string }[] = MODULES.flatMap((m) =>
  m.spine
    ? SPINE_SUBREGIONS.map((s) => ({ label: s.label, region: s.region }))
    : m.region
      ? [{ label: m.label, region: m.region }]
      : [],
);

// The four app modes, for the MOBILE mode dropdown.
const MODE_ITEMS: { id: AppMode; label: string }[] = [
  { id: 'explore', label: 'Explorar' },
  { id: 'learn', label: 'Aprender' },
  { id: 'study', label: 'Estudiar' },
  { id: 'movement', label: 'Movimiento' },
];

export function TopBar({ mode, setMode, setOverlay, onOpenAuth }: TopBarProps) {
  const setPaletteOpen = useAnatomyStore((s) => s.setPaletteOpen);
  const region = useAnatomyStore((s) => s.region);
  const setRegion = useAnatomyStore((s) => s.setRegion);
  const clearSelection = useAnatomyStore((s) => s.clearSelection);
  const activeRegion = region ?? 'shoulder';
  const entitlement = useEntitlement();

  // "New" dot on the Guía button until the user opens it once.
  const [guideSeen, setGuideSeen] = useState<boolean>(() => readGuideSeen());
  const openGuide = () => {
    setGuideSeen(true);
    writeGuideSeen();
    setOverlay('guide');
  };

  /** A module shows a lock when it's premium and the user can't open it yet. */
  const showLock = (regionId: string) =>
    isRegionPremium(regionId) && !entitlement.canAccessRegion(regionId);

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
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-800/60 bg-ink-950/90 px-3 sm:gap-4 sm:px-4">
      {/* Wordmark (mark only on phones to save header width). */}
      <div className="flex shrink-0 items-center gap-2">
        <BrandMark className="h-5 w-5 text-slate-200" title="Anatris" />
        <span className="hidden font-display text-base font-bold tracking-tight text-slate-50 sm:inline">
          Anatris
        </span>
      </div>

      {/* Module nav -- the single region selector. Inline on desktop; on mobile
          it collapses into MobileRegionMenu (below) so the header fits. */}
      <MobileRegionMenu />
      <nav className="hidden shrink-0 items-center gap-1 min-[1860px]:flex">
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
                  {showLock('cervical') && <LockGlyph />}
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
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-800/60 text-slate-100'
                  : m.enabled
                    ? 'text-slate-500 hover:text-slate-300'
                    : 'cursor-not-allowed text-slate-700',
              ].join(' ')}
            >
              {m.label}
              {m.region && showLock(m.region) && <LockGlyph />}
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
        <span className="hidden min-[1860px]:inline">Buscar estructura</span>
        <span className="kbd ml-2">{String.fromCharCode(0x2318)}K</span>
      </button>

      {/* Guía: always-visible "where is everything?" hub (all breakpoints). */}
      <button
        type="button"
        onClick={openGuide}
        aria-label="Guía de la aplicación"
        className="relative flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/60 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-accent/40 hover:text-accent"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.2 9.3a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2.2-2.6 3.7" strokeLinecap="round" />
          <path d="M12 17.2h.01" strokeLinecap="round" />
        </svg>
        <span className="hidden min-[1860px]:inline">Guía</span>
        {!guideSeen && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-accent"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Upgrade entry point: only shown while the user is on the free tier. */}
      {!entitlement.isPremium && (
        <button
          type="button"
          onClick={() => setOverlay('pricing')}
          className="hidden shrink-0 rounded-lg bg-accent/15 px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/25 min-[1860px]:block"
        >
          Planes
        </button>
      )}

      {/* App-level controls: Acerca de / Legal */}
      <button
        type="button"
        onClick={() => setOverlay('about')}
        className="hidden shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200 min-[1860px]:block"
      >
        Acerca de
      </button>
      <button
        type="button"
        onClick={() => setOverlay('legal')}
        className="hidden shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200 min-[1860px]:block"
      >
        Legal
      </button>

      {/* Mode toggle: segmented control on desktop, dropdown on mobile. */}
      <MobileModeMenu mode={mode} setMode={setMode} />
      <div className="hidden shrink-0 items-center gap-1 rounded-xl border border-slate-800/60 bg-slate-900/60 p-1 min-[1860px]:flex">
        <ModeButton id="explore" label="Explorar" mode={mode} setMode={setMode} />
        <ModeButton id="learn" label="Aprender" mode={mode} setMode={setMode} />
        <ModeButton id="study" label="Estudiar" mode={mode} setMode={setMode} />
        <ModeButton id="movement" label="Movimiento" mode={mode} setMode={setMode} />
      </div>

      {/* Account / subscription */}
      <AccountMenu onOpenAuth={onOpenAuth} onOpenPricing={() => setOverlay('pricing')} />
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

/** Chevron that flips when its menu is open. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Close `set(false)` on any outside click or Escape while `open`. */
function useDismiss(
  open: boolean,
  ref: React.RefObject<HTMLElement>,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, ref, close]);
}

/**
 * MOBILE/LAPTOP region selector: the 7-module inline nav + 4-mode segmented +
 * account need ~1808px, so below the custom `min-[1860px]` breakpoint the
 * regions collapse into this single dropdown (spine expanded into cervical/
 * torácica/lumbar). Only wide monitors (>=1860px) get the inline nav.
 */
function MobileRegionMenu() {
  const region = useAnatomyStore((s) => s.region);
  const setRegion = useAnatomyStore((s) => s.setRegion);
  const clearSelection = useAnatomyStore((s) => s.clearSelection);
  const entitlement = useEntitlement();
  const active = region ?? 'shoulder';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));

  const activeLabel = MOBILE_REGIONS.find((r) => r.region === active)?.label ?? 'Región';
  const showLock = (regionId: string) =>
    isRegionPremium(regionId) && !entitlement.canAccessRegion(regionId);

  return (
    <div ref={ref} className="relative shrink-0 min-[1860px]:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-lg bg-slate-800/60 px-2.5 py-1.5 text-sm font-medium text-slate-100"
      >
        {activeLabel}
        <Chevron open={open} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 max-h-[70vh] min-w-[10rem] overflow-y-auto rounded-xl border border-slate-800/80 bg-ink-950/95 p-1 shadow-xl backdrop-blur"
        >
          {MOBILE_REGIONS.map((r) => {
            const isActive = r.region === active;
            return (
              <button
                key={r.region}
                type="button"
                role="menuitem"
                onClick={() => {
                  if (r.region !== active) {
                    setRegion(r.region);
                    clearSelection();
                  }
                  setOpen(false);
                }}
                className={[
                  'flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent/20 text-accent'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100',
                ].join(' ')}
              >
                {r.label}
                {showLock(r.region) && <LockGlyph />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** MOBILE/LAPTOP mode selector: the 4-button segmented control moves into a
 *  dropdown below the `min-[1860px]` breakpoint so the header fits. Wide
 *  monitors keep the segmented control. */
function MobileModeMenu({
  mode,
  setMode,
}: {
  mode: AppMode;
  setMode: (m: AppMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, ref, () => setOpen(false));
  const label = MODE_ITEMS.find((m) => m.id === mode)?.label ?? 'Modo';

  return (
    <div ref={ref} className="relative shrink-0 min-[1860px]:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-lg border border-slate-800/60 bg-slate-900/60 px-2.5 py-1.5 text-sm font-medium text-accent"
      >
        {label}
        <Chevron open={open} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[9rem] overflow-hidden rounded-xl border border-slate-800/80 bg-ink-950/95 p-1 shadow-xl backdrop-blur"
        >
          {MODE_ITEMS.map((m) => {
            const isActive = m.id === mode;
            return (
              <button
                key={m.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMode(m.id);
                  setOpen(false);
                }}
                className={[
                  'block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent/20 text-accent'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100',
                ].join(' ')}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
