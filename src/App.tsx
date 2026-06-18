// src/App.tsx
//
// Top-level layout. Two modes:
//   - "Explorar" (default): TopBar + body
//       Sidebar | Viewer (with floating toolbar) | SelectionPanel.
//   - "Aprender": the 7-phase pedagogical track (PhaseTrack).
//
// REGION:
//   - The region lives in the store (store.region). The single region switch is
//     the TopBar module nav; App reads store.region to restrict the 3D scene to
//     that region's meshes. Every region-aware piece follows store.region.
//
// CONTROLS:
//   - The TopBar now owns ALL header controls inline (module nav, search, Acerca
//     de / Legal, Explorar / Aprender). App passes mode/overlay setters down, so
//     nothing floats over the bar and the left/right controls never overlap.
//
// RESPONSIVE:
//   - Desktop (lg and up): three-column layout.
//   - Compact (below lg): the Viewer fills the screen; Sidebar and
//     SelectionPanel become slide-in drawers opened from floating buttons. In
//     "Aprender" the Viewer and PhaseTrack stack vertically.
//
// LEGAL / PRODUCT:
//   - A one-time medical-disclaimer GATE blocks the app until accepted.
//   - A persistent disclaimer BANNER sits under the TopBar at all times.
//   - "Acerca de" and "Legal" open the attribution / disclaimer screens as
//     overlays.

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useAnatomyIndex } from './hooks/useAnatomyIndex';
import { useMuscleResolution } from './hooks/useMuscleResolution';
import { useAnatomyStore } from './store/anatomyStore';
import { TopBar, type AppMode, type Overlay } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
// The 3D workspace (Viewer3D + MovementView) is the ONLY path that pulls in
// three.js / @react-three (~1.4 MB). It is code-split behind React.lazy so the
// marketing landing, pricing, disclaimer and study views — none of which touch
// three — load without downloading the 3D engine. See vite.config manualChunks.
const Viewer3D = lazy(() =>
  import('./components/Viewer3D').then((m) => ({ default: m.Viewer3D })),
);
import { ViewToolbar } from './components/ViewToolbar';
import { SelectionPanel } from './components/SelectionPanel';
import { CommandPalette } from './components/CommandPalette';
import { PhaseTrack } from './components/PhaseTrack';
import { StudyView } from './components/study/StudyView';
const MovementView = lazy(() =>
  import('./components/movement/MovementView').then((m) => ({
    default: m.MovementView,
  })),
);
import { AuthModal } from './components/account/AuthModal';
import { Paywall } from './components/account/Paywall';
import { LandingScreen } from './components/landing/LandingScreen';
import { Pricing } from './components/landing/Pricing';
import { useEntitlement } from './auth/AuthContext';
import { AttributionScreen } from './components/AttributionScreen';
import {
  MedicalDisclaimerBanner,
  MedicalDisclaimerScreen,
} from './components/MedicalDisclaimer';
import { OnboardingTour, readTourDone } from './components/OnboardingTour';
import { REGIONS, resolveRegionMeshes } from './data/regiones';

import { isConceptModule } from './data/conceptByRegion';

/** Which mobile drawer (if any) is open. Desktop never opens these. */
type Drawer = 'none' | 'sidebar' | 'selection';

/* ---------------------------------------------------------------------------
 * DISCLAIMER PERSISTENCE
 * ---------------------------------------------------------------------------
 * The medical-disclaimer acceptance is persisted in localStorage so returning
 * visitors are not re-prompted on every load. The stored value is a VERSION
 * string: bump DISCLAIMER_VERSION whenever the disclaimer text changes
 * materially, and every user will be asked to accept the new wording again.
 *
 * All access is wrapped in try/catch because localStorage can throw or be
 * absent (private browsing, disabled storage, SSR). On any failure we fail
 * "open to the gate": the disclaimer is shown for the current session rather
 * than crashing the app.
 * ------------------------------------------------------------------------ */
const DISCLAIMER_KEY = 'anatris.disclaimer.accepted';
const DISCLAIMER_VERSION = '1';

function readAccepted(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(DISCLAIMER_KEY) === DISCLAIMER_VERSION;
  } catch {
    return false;
  }
}
function writeAccepted(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(DISCLAIMER_KEY, DISCLAIMER_VERSION);
  } catch {
    // Storage unavailable (private mode, blocked, quota): acceptance simply
    // does not persist; the gate will reappear next session. Non-fatal.
  }
}

/* ---------------------------------------------------------------------------
 * LANDING ("entered") PERSISTENCE
 * ---------------------------------------------------------------------------
 * The marketing landing is shown once per visitor (after the legal gate) as the
 * sales funnel. Once they choose to enter the app — free or via checkout — we
 * remember it so returning visitors land straight in the app. Same fail-open
 * localStorage discipline as the disclaimer above.
 * ------------------------------------------------------------------------ */
const ENTERED_KEY = 'anatris.entered';

function readEntered(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(ENTERED_KEY) === '1';
  } catch {
    return false;
  }
}
function writeEntered(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(ENTERED_KEY, '1');
  } catch {
    // Non-fatal: the landing simply reappears next session.
  }
}

/** True when the viewport is below the lg breakpoint (Tailwind lg = 1024px). */
function useIsCompact(): boolean {
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return compact;
}

export default function App() {
  const { index, byMesh, status, error } = useAnatomyIndex();
  const resolution = useMuscleResolution(index);
  const [mode, setMode] = useState<AppMode>('explore');
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [drawer, setDrawer] = useState<Drawer>('none');
  const [authOpen, setAuthOpen] = useState<boolean>(false);
  const [accepted, setAccepted] = useState<boolean>(() => readAccepted());
    const [entered, setEntered] = useState<boolean>(() => readEntered());
  const [tourDone, setTourDone] = useState<boolean>(() => readTourDone());
  const compact = useIsCompact();
  const entitlement = useEntitlement();

  // Active region lives in the store; the TopBar module nav is the single
  // switch. Default to the shoulder on first mount if unset.
  const region = useAnatomyStore((s) => s.region);
  const setRegion = useAnatomyStore((s) => s.setRegion);
  const regionId = region ?? 'shoulder';

  // Conceptual modules (Fundamentos) are not anatomical regions: they have no
  // muscle list, no ROM, no 7 phases. They are taught as reading + diagrams +
  // an optional planes/axes overlay over the WHOLE body, which is exactly the
  // "Aprender" experience. So entering a concept module forces Aprender, and
  // the muscle-centric panels (Sidebar / SelectionPanel) are hidden for it.
  const concept = isConceptModule(region);

  // Subscription gate: premium regions (everything but the shoulder and
  // Fundamentos) require an active subscription. When locked, the body is
  // replaced by the Paywall regardless of the current mode.
  const locked = !entitlement.canAccessRegion(regionId);

  useEffect(() => {
    if (region == null) setRegion('shoulder');
  }, [region, setRegion]);

  // Entering a conceptual module (Fundamentos) snaps to "Aprender": the concept
  // renderer (with its "Ver en 3D" overlay action) only lives in that mode.
  useEffect(() => {
    if (concept && mode === 'explore') setMode('learn');
  }, [concept, mode]);

  // Close any open drawer when growing back to desktop.
  useEffect(() => {
    if (!compact) setDrawer('none');
  }, [compact]);

  // Restrict the scene to the current region (hides head, abdomen, legs, ...).
  const regionMeshes = useMemo(() => {
    if (byMesh.size === 0) return null;
    // Concept modules show the whole body (null = no region restriction).
    if (concept) return null;
    const def = REGIONS[regionId] ?? REGIONS.shoulder;
    return resolveRegionMeshes(def, byMesh.keys());
  }, [byMesh, regionId, concept]);

  function acceptDisclaimer(): void {
    writeAccepted();
    setAccepted(true);
  }

  function enterApp(): void {
    writeEntered();
    setEntered(true);
  }

  if (!accepted) {
    return <DisclaimerGate onAccept={acceptDisclaimer} />;
  }

  // Marketing landing (sales funnel): shown once, after the legal gate, to
  // visitors who haven't entered yet and aren't already premium. Premium users
  // (returning subscribers) always skip straight to the app.
  if (!entered && !entitlement.isPremium) {
    return (
      <>
        <LandingScreen onEnter={enterApp} onOpenAuth={() => setAuthOpen(true)} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink-950 text-slate-200">
      <TopBar
        mode={mode}
        setMode={setMode}
        setOverlay={setOverlay}
        onOpenAuth={() => setAuthOpen(true)}
      />

      {/* Persistent educational disclaimer. */}
      <div className="shrink-0 px-4 py-2">
        <MedicalDisclaimerBanner />
      </div>

      {/* The 3D views below are lazy-loaded; IndexLoading covers the brief
          chunk fetch the first time the workspace is shown. */}
      <Suspense fallback={<IndexLoading />}>
      {locked ? (
        // SUBSCRIPTION GATE: this region needs premium. Replace the whole body
        // with the upgrade funnel; the TopBar stays so the user can switch back
        // to a free region (Hombro / Fundamentos).
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-hidden">
            <Paywall region={regionId} onOpenAuth={() => setAuthOpen(true)} />
          </main>
        </div>
      ) : mode === 'study' ? (
        // STUDY mode: generated quiz + flashcards over the active region's
        // muscles. No 3D scene, sidebar or selection panel -- it's a focused
        // recall experience that fills the body.
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-hidden">
            <StudyView region={region} isConcept={concept} />
          </main>
        </div>
      ) : mode === 'movement' ? (
        // MOVEMENT lab: the live 3D model with the shoulder rig + control panel.
        <div className="flex min-h-0 flex-1">
          <main className="relative min-w-0 flex-1">
            {status === 'error' ? (
              <IndexError message={error} />
            ) : status === 'loading' ? (
              <IndexLoading />
            ) : (
              <MovementView
                region={region}
                byMesh={byMesh}
                regionMeshes={regionMeshes}
                resolution={resolution}
              />
            )}
          </main>
        </div>
      ) : mode === 'learn' && concept ? (
        // CONCEPTUAL module (Fundamentos): the 3D overlay (planes/axes) is
        // inseparable from the text, so we ALWAYS show the live model beside
        // the concept renderer. Desktop: Viewer | ConceptTrack side by side.
        // Compact: Viewer on top (45vh), ConceptTrack below. No Sidebar /
        // SelectionPanel here -- there are no muscles to list.
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto lg:overflow-hidden">
            <div className="flex min-h-0 flex-col lg:h-full lg:flex-row">
              <div className="h-[45vh] shrink-0 lg:h-full lg:flex-1 lg:border-r lg:border-slate-800/60">
                {status === 'error' ? (
                  <IndexError message={error} />
                ) : status === 'loading' ? (
                  <IndexLoading />
                ) : (
                  <Viewer3D
                    byMesh={byMesh}
                    regionMeshes={regionMeshes}
                    resolution={resolution}
                  />
                )}
              </div>
              <div className="min-h-0 flex-1 lg:h-full lg:w-[480px] lg:flex-none">
                <PhaseTrack />
              </div>
            </div>
          </main>
        </div>
      ) : mode === 'learn' ? (
        <div className="flex min-h-0 flex-1">
          <div className="hidden lg:flex">
            <Sidebar
              index={index}
              resolution={resolution}
              onOpenPhase={() => setMode('learn')}
            />
          </div>
          <main className="min-w-0 flex-1 overflow-y-auto lg:overflow-hidden">
            <div className="flex min-h-0 flex-col lg:h-full">
              <div className="h-[45vh] shrink-0 lg:hidden">
                {status === 'error' ? (
                  <IndexError message={error} />
                ) : status === 'loading' ? (
                  <IndexLoading />
                ) : (
                  <Viewer3D
                    byMesh={byMesh}
                    regionMeshes={regionMeshes}
                    resolution={resolution}
                  />
                )}
              </div>
              <div className="min-h-0 flex-1 lg:h-full">
                <PhaseTrack />
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {!concept && (
            <div className="hidden lg:flex">
              <Sidebar
              index={index}
              resolution={resolution}
              onOpenPhase={() => setMode('learn')}
            />
            </div>
          )}
          <main className="relative min-w-0 flex-1">
            {status === 'error' ? (
              <IndexError message={error} />
            ) : status === 'loading' ? (
              <IndexLoading />
            ) : (
              <>
                <Viewer3D
                  byMesh={byMesh}
                  regionMeshes={regionMeshes}
                  resolution={resolution}
                />
                <ViewToolbar />
              </>
            )}
          </main>
          {!concept && (
            <div className="hidden lg:flex">
              <SelectionPanel byMesh={byMesh} resolution={resolution} />
            </div>
          )}
        </div>
      )}
      </Suspense>

      {/* Compact-only floating buttons to open the drawers. */}
      {compact && mode !== 'study' && mode !== 'movement' && !locked && (
        <>
          {!concept && (
            <button
              type="button"
              onClick={() => setDrawer('sidebar')}
              className="fixed bottom-4 left-4 z-30 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-sm font-medium text-slate-200 shadow-lg backdrop-blur"
            >
              <PanelIcon />
              Controles
            </button>
          )}
          {!concept && mode === 'explore' && (
            <button
              type="button"
              onClick={() => setDrawer('selection')}
              className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-sm font-medium text-slate-200 shadow-lg backdrop-blur"
            >
              Detalle
              <InfoIcon />
            </button>
          )}
        </>
      )}

      {/* Mobile drawers. */}
      {drawer === 'sidebar' && (
        <DrawerShell side="left" onClose={() => setDrawer('none')}>
          <Sidebar
            index={index}
            resolution={resolution}
            onNavigate={() => setDrawer('none')}
            onOpenPhase={() => setMode('learn')}
          />
        </DrawerShell>
      )}
      {drawer === 'selection' && (
        <DrawerShell side="right" onClose={() => setDrawer('none')}>
          <SelectionPanel byMesh={byMesh} resolution={resolution} />
        </DrawerShell>
      )}

            <CommandPalette index={index} />

      {!tourDone && (
        <OnboardingTour onDone={() => setTourDone(true)} />
      )}

      {/* Auth / subscription modal. */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Overlays: credits / legal. */}
      {overlay === 'about' && (
        <OverlayShell title="Creditos y licencias" onClose={() => setOverlay('none')}>
          <AttributionScreen />
        </OverlayShell>
      )}
      {overlay === 'legal' && (
        <OverlayShell title="Aviso legal" onClose={() => setOverlay('none')}>
          <MedicalDisclaimerScreen />
        </OverlayShell>
      )}
      {overlay === 'pricing' && (
        <OverlayShell title="Planes" onClose={() => setOverlay('none')}>
          <div className="px-5 py-6">
            <Pricing
              onChooseFree={() => setOverlay('none')}
              onOpenAuth={() => {
                setOverlay('none');
                setAuthOpen(true);
              }}
            />
          </div>
        </OverlayShell>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Disclaimer acceptance gate (first run).
 * ------------------------------------------------------------------------ */
function DisclaimerGate({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink-950 text-slate-200">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MedicalDisclaimerScreen />
      </div>
      <div className="shrink-0 border-t border-slate-800/60 bg-ink-950/90 px-6 py-4">
        <div className="mx-auto flex max-w-2xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-slate-500">
            Al continuar confirmas que has leido este aviso y que usaras la
            aplicacion solo con fines educativos.
          </p>
          <button
            type="button"
            onClick={onAccept}
            className="shrink-0 rounded-lg bg-accent/20 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
          >
            Acepto y continuo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Slide-in drawer shell for compact screens.
 * ------------------------------------------------------------------------ */
function DrawerShell({
  side,
  onClose,
  children,
}: {
  side: 'left' | 'right';
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        className={[
          'absolute top-0 z-10 flex h-full max-w-[85vw] flex-col bg-ink-950 shadow-2xl',
          side === 'left' ? 'left-0' : 'right-0',
        ].join(' ')}
      >
        <div className="flex shrink-0 items-center justify-end border-b border-slate-800/60 px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-200"
            aria-label="Cerrar"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Generic overlay shell.
 * ------------------------------------------------------------------------ */
function OverlayShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800/60 bg-ink-950 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800/60 px-5 py-3">
          <span className="font-display text-sm font-semibold text-slate-200">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-200"
            aria-label="Cerrar"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ---- Small inline icons (no extra deps) ---- */
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
function PanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" strokeLinecap="round" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}

function IndexLoading() {
  return (
    <div className="flex h-full items-center justify-center viewer-bg">
      <p className="font-mono text-xs text-slate-600">Cargando indice anatomico...</p>
    </div>
  );
}

function IndexError({ message }: { message: string | null }) {
  return (
    <div className="flex h-full items-center justify-center viewer-bg">
      <div className="max-w-sm rounded-xl border border-rose-900/40 bg-rose-950/20 px-5 py-4 text-center">
        <p className="text-sm font-medium text-rose-300">
          No se pudo cargar el indice anatomico.
        </p>
        <p className="mt-1 font-mono text-xs text-slate-500">
          {message ?? 'Error desconocido'}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Verifica que <code className="text-slate-400">public/anatomy-index.json</code>{' '}
          exista. Si no, ejecuta <code className="text-slate-400">npm run build-anatomy</code>.
        </p>
      </div>
    </div>
  );
}
