// src/components/TopBar.tsx
//
// Slim top bar: wordmark, region module navigation, search trigger, and the
// app-level controls (Guía, Planes, Explorar / Aprender / Estudiar / Movimiento).
// Everything lives INSIDE the header flow (no floating absolute-positioned
// controls), so the left nav and the right controls never overlap.
//
// The module nav is the SINGLE region selector: clicking an active module
// writes store.region, and every region-aware piece follows it.
//
// The app-level mode and overlay are owned by App.tsx and passed in as props, so
// the TopBar stays presentational for those and App keeps a single source of truth.
//
// RESPONSIVE PRIORITY (this is a product decision, not just layout):
//   The four MODES are the primary navigation and the only place the breadth of
//   the product is visible -- a physio who never sees "Movimiento" never learns
//   the app has a movement lab. So the mode switcher is a segmented control from
//   `lg` (1024px) up, and the upgrade CTA shows from `sm` up. Previously both
//   were gated behind `min-[1860px]`, which meant that on a 1440px laptop -- the
//   most common width -- a visitor saw neither the modes nor any way to
//   subscribe. What yields instead is chrome nobody navigates by: "Acerca de"
//   and "Legal" now live in the account menu and the Guía hub.

import { useEffect, useRef, useState } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { useEntitlement } from '../auth/AuthContext';
import { isRegionPremium } from '../auth/entitlements';
import { LockGlyph } from './account/PremiumGate';
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

/**
 * The command-palette shortcut as this platform writes it. The handler accepts
 * both meta and ctrl (CommandPalette), but the LABEL used to be a hard-coded Mac
 * glyph, so Windows and Linux users were told to press a key their keyboard does
 * not have.
 */
export function shortcutLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl K';
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
      ?.platform ??
    navigator.platform ??
    '';
  const isApple = /mac|iphone|ipad|ipod/i.test(platform);
  return isApple ? `${String.fromCharCode(0x2318)}K` : 'Ctrl K';
}

interface TopBarProps {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  setOverlay: (o: Overlay) => void;
  /** Open the sign-in / sign-up modal. */
  onOpenAuth: () => void;
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

// Flattened region list for the compact dropdown (spine expanded into its three
// sub-regions), derived from MODULES + SPINE_SUBREGIONS so it stays in sync.
const MOBILE_REGIONS: { label: string; region: string }[] = MODULES.flatMap((m) =>
  m.spine
    ? SPINE_SUBREGIONS.map((s) => ({ label: s.label, region: s.region }))
    : m.region
      ? [{ label: m.label, region: m.region }]
      : [],
);

// The four app modes.
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
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-800/60 bg-ink-950/90 px-3 sm:gap-3 sm:px-4">
      {/* Wordmark (mark only on phones to save header width). */}
      <div className="flex shrink-0 items-center gap-2">
        <BrandMark className="h-5 w-5 text-slate-200" title="Anatris" />
        <h1 className="hidden font-display text-base font-bold tracking-tight text-slate-50 sm:inline">
          Anatris
        </h1>
      </div>

      {/* Module nav -- the single region selector. Inline on very wide monitors;
          a labelled dropdown everywhere else. */}
      <CompactRegionMenu />
      <nav
        aria-label="Región anatómica"
        className="hidden shrink-0 items-center gap-1 min-[1860px]:flex"
      >
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
                  aria-current={spineActive ? 'true' : undefined}
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
                          aria-current={isActive ? 'true' : undefined}
                          onClick={() => {
                            selectRegion(sub.region);
                            setSpineOpen(false);
                          }}
                          className={[
                            'block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
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
              title={m.enabled ? undefined : 'Próximamente'}
              aria-current={isActive ? 'true' : undefined}
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
        aria-label="Buscar estructura"
        className="hidden shrink-0 items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/60 px-2.5 py-1.5 text-sm text-slate-500 transition-colors hover:border-slate-700 hover:text-slate-300 md:flex"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <span className="hidden min-[1860px]:inline">Buscar estructura</span>
        <span className="kbd ml-1">{shortcutLabel()}</span>
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
        <span className="hidden lg:inline">Guía</span>
        {!guideSeen && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-accent"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Upgrade entry point: shown while the user is on the free tier, from `sm`
          up. This is the ONLY always-reachable sales surface in the app shell. */}
      {!entitlement.isPremium && (
        <button
          type="button"
          onClick={() => setOverlay('pricing')}
          className="hidden shrink-0 rounded-lg bg-accent/15 px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/25 sm:block"
        >
          Hazte Premium
        </button>
      )}

      {/* Mode switcher: segmented control from lg up, dropdown below. */}
      <CompactModeMenu mode={mode} setMode={setMode} />
      <div
        role="tablist"
        aria-label="Modo de trabajo"
        className="hidden shrink-0 items-center gap-0.5 rounded-xl border border-slate-800/60 bg-slate-900/60 p-1 lg:flex"
      >
        {MODE_ITEMS.map((m) => (
          <ModeButton key={m.id} id={m.id} label={m.label} mode={mode} setMode={setMode} />
        ))}
      </div>

      {/* Account / subscription. Also carries Acerca de / Legal, which used to
          take ~140px of header width for links nobody navigates by. */}
      <AccountMenu
        onOpenAuth={onOpenAuth}
        onOpenPricing={() => setOverlay('pricing')}
        onOpenOverlay={setOverlay}
      />
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
      role="tab"
      aria-selected={isActive}
      onClick={() => setMode(id)}
      className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors xl:px-3 ${
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
 * Region selector for everything below the inline nav's `min-[1860px]`. Carries
 * a "Región" caption so it can't be mistaken for the adjacent mode dropdown --
 * two bare chevrons side by side used to read as one control.
 */
function CompactRegionMenu() {
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
        aria-label={`Región: ${activeLabel}`}
        className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-2.5 py-1.5 text-sm font-medium text-slate-100"
      >
        <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:inline">
          Región
        </span>
        {activeLabel}
        <Chevron open={open} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 max-h-[70vh] min-w-[11rem] overflow-y-auto rounded-xl border border-slate-800/80 bg-ink-950/95 p-1 shadow-xl backdrop-blur"
        >
          {MOBILE_REGIONS.map((r) => {
            const isActive = r.region === active;
            return (
              <button
                key={r.region}
                type="button"
                role="menuitem"
                aria-current={isActive ? 'true' : undefined}
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
                <span className="flex-1">{r.label}</span>
                {showLock(r.region) && <LockGlyph className="text-amber-300" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Mode selector below `lg`, where the segmented control no longer fits. */
function CompactModeMenu({
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
    <div ref={ref} className="relative shrink-0 lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Modo: ${label}`}
        className="flex items-center gap-1.5 rounded-lg border border-slate-800/60 bg-slate-900/60 px-2.5 py-1.5 text-sm font-medium text-accent"
      >
        <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:inline">
          Modo
        </span>
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
                aria-current={isActive ? 'true' : undefined}
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
