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

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useAnatomyIndex } from './hooks/useAnatomyIndex';
import { useMuscleResolution } from './hooks/useMuscleResolution';
import { usePremiumRegion } from './hooks/usePremiumRegion';
import { useAnatomyStore } from './store/anatomyStore';
import { TopBar, type AppMode, type Overlay } from './components/TopBar';
// CODE SPLITTING — what the ENTRY chunk is allowed to contain.
//
// The entry is what every visitor downloads before deciding anything, the
// marketing landing included. It had grown to 939 KB (234 KB gzip) because the
// components below are region-aware and statically pull in the clinical data
// registries (musclesByRegion, romByRegion, muscleContentByRegion,
// trackByRegion, clinicalCases, evidence...), which between them carry EVERY
// region -- so a visitor who had not signed up downloaded the knee, hip, ankle
// and spine content in full.
//
// They all render inside the body's <Suspense>, so deferring them is a drop-in.
// The entry now keeps only the app shell: TopBar, landing, pricing, auth, legal.
//
// NOTE: this fixes the DOWNLOAD, not the leak. The paid chunks are still
// reachable by anyone who asks for them; the gate stays client-side until the
// content is served behind a server-side entitlement check.
const Sidebar = lazy(() =>
  import('./components/Sidebar').then((m) => ({ default: m.Sidebar })),
);
// The 3D workspace (Viewer3D + MovementView) is the ONLY path that pulls in
// three.js / @react-three (~1.4 MB). It is code-split behind React.lazy so the
// marketing landing, pricing, disclaimer and study views — none of which touch
// three — load without downloading the 3D engine. See vite.config manualChunks.
const Viewer3D = lazy(() =>
  import('./components/Viewer3D').then((m) => ({ default: m.Viewer3D })),
);
import { ViewToolbar } from './components/ViewToolbar';
const SelectionPanel = lazy(() =>
  import('./components/SelectionPanel').then((m) => ({ default: m.SelectionPanel })),
);
import { CommandPalette } from './components/CommandPalette';
const PhaseTrack = lazy(() =>
  import('./components/PhaseTrack').then((m) => ({ default: m.PhaseTrack })),
);
const StudyView = lazy(() =>
  import('./components/study/StudyView').then((m) => ({ default: m.StudyView })),
);
const MovementView = lazy(() =>
  import('./components/movement/MovementView').then((m) => ({
    default: m.MovementView,
  })),
);
import { AuthModal } from './components/account/AuthModal';
import { Paywall } from './components/account/Paywall';
import { UpgradeProvider } from './components/account/PremiumGate';
import { LandingScreen } from './components/landing/LandingScreen';
import { Pricing } from './components/landing/Pricing';
import { useAuth, useEntitlement } from './auth/AuthContext';
import { AttributionScreen } from './components/AttributionScreen';
import {
  MedicalDisclaimerBanner,
  MedicalDisclaimerScreen,
} from './components/MedicalDisclaimer';
import { OnboardingTour, readTourDone } from './components/OnboardingTour';
import { LegalScreen } from './components/LegalScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GuideHub } from './components/GuideHub';
import RouteNotice from './components/RouteNotice';
const EvidenceScreen = lazy(() =>
  import('./components/EvidenceScreen').then((m) => ({ default: m.EvidenceScreen })),
);
import { REGIONS, resolveRegionMeshes, resolveRegionFocus } from './data/regiones';

import { isConceptModule, conceptForRegion } from './data/conceptByRegion';
import { ConceptStage } from './components/ConceptStage';
import { EVENTS, track, trackChange } from './lib/analytics';
import { DEFAULT_REGION, readRoute, writeRoute } from './lib/routing';

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
  // A deep link decides the opening mode, so it can't be a plain 'explore'.
  const [mode, setMode] = useState<AppMode>(() => readRoute()?.mode ?? 'explore');
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [drawer, setDrawer] = useState<Drawer>('none');
  const [authOpen, setAuthOpen] = useState<boolean>(false);
  const [accepted, setAccepted] = useState<boolean>(() => readAccepted());
  // A shared link (a colleague sending /rodilla/movimiento) means the visitor
  // came for a specific thing, not for the pitch — send them straight in.
  const [entered, setEntered] = useState<boolean>(
    () => readEntered() || readRoute() != null,
  );
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

  // The section being read, resolved ONCE here and handed to both halves of the
  // concept layout: the stage needs it to frame the 3D and title the scene, the
  // reading column to render its prose. Falls back to the first section so the
  // module always opens on something.
  const conceptSectionId = useAnatomyStore((s) => s.conceptSectionId);
  const conceptSection = useMemo(() => {
    const track = conceptForRegion(region);
    const sections = track?.sections ?? [];
    const i = Math.max(
      0,
      sections.findIndex((s) => s.id === conceptSectionId),
    );
    return { section: sections[i], index: i + 1, total: sections.length };
  }, [region, conceptSectionId]);

  // Subscription gate: premium regions (everything but the shoulder and
  // Fundamentos) require an active subscription. When locked, the body is
  // replaced by the Paywall regardless of the current mode.
  const locked = !entitlement.canAccessRegion(regionId);

  // CONTENT gate, distinct from the ACCESS gate above. A premium region's
  // clinical library is no longer bundled: it is fetched from the
  // entitlement-checked `content` edge function. The workspace must not mount
  // until it has arrived, because the registries are read synchronously — a
  // premature mount would render an empty region rather than wait.
  //
  // 'denied' means the server refused (no live subscription), which is the same
  // outcome as `locked` and shows the same Paywall; the client-side flag can be
  // spoofed, this cannot.
  const contentState = usePremiumRegion(locked ? null : regionId);
  const contentPending = contentState === 'loading' || contentState === 'idle';
  const contentDenied = contentState === 'denied';

  // ROUTE -> STATE, once on mount. A deep link (/rodilla/movimiento) sets the
  // region; anything else settles on the default. Runs before the URL sync
  // below so the first write is a replace, not a spurious history entry.
  useEffect(() => {
    if (region != null) return;
    setRegion(readRoute()?.region ?? DEFAULT_REGION);
  }, [region, setRegion]);

  // STATE -> ROUTE. The first write replaces (normalizing `/` into
  // `/hombro/explorar` must not create an entry the user's Back button gets
  // stuck on); every later region/mode change pushes, so Back retraces the path
  // they actually walked.
  const routeSyncedRef = useRef(false);
  useEffect(() => {
    if (region == null) return;
    writeRoute({ region, mode }, { replace: !routeSyncedRef.current });
    routeSyncedRef.current = true;
  }, [region, mode]);

  // PRODUCT ANALYTICS: which region and which mode people actually use.
  //
  // This rides on the same (region, mode) pair the router syncs, so it covers
  // every way of getting there — TopBar, deep link, Back button — with one
  // effect instead of a dozen onClick handlers. `trackChange` collapses the
  // re-renders, so a user who reads the shoulder for ten minutes is one
  // `region_opened`, not one per render.
  useEffect(() => {
    if (region == null) return;
    trackChange(EVENTS.regionOpened, { region });
    trackChange(EVENTS.modeOpened, { mode, region });
  }, [region, mode]);

  // ROUTE -> STATE on Back/Forward.
  useEffect(() => {
    const onPop = () => {
      const next = readRoute();
      if (!next) return;
      setRegion(next.region);
      setMode(next.mode);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setRegion]);

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

  // Hero-framing focus: the compact joint-core the camera should open on for
  // long-limb regions (knee/elbow). null = frame the full region bounds.
  const regionFocusMeshes = useMemo(() => {
    if (byMesh.size === 0 || concept) return null;
    const def = REGIONS[regionId] ?? REGIONS.shoulder;
    return resolveRegionFocus(def, byMesh.keys());
  }, [byMesh, regionId, concept]);

  function acceptDisclaimer(): void {
    writeAccepted();
    setAccepted(true);
  }

  function enterApp(): void {
    writeEntered();
    setEntered(true);
    track(EVENTS.enterApp);
  }

  // ORDER: LANDING FIRST, THEN THE LEGAL GATE.
  //
  // This used to be the other way round, and it cost the product its first
  // impression: a visitor arriving from a shared link (WhatsApp is the real
  // channel here) hit a full-screen wall of medical-legal text before seeing a
  // single pixel of what Anatris is. The landing is MARKETING — it carries no
  // clinical guidance, and it already states in the hero and the footer that
  // this is an educational tool that does not replace clinical judgement.
  //
  // Consent is NOT weakened: the gate still blocks the actual tool, so nobody
  // reaches a muscle sheet, a ROM figure or an orthopedic test without having
  // accepted. It just no longer blocks the sales pitch. Deep links
  // (/rodilla/movimiento) set `entered`, so they skip the landing and land on
  // the gate — consent before the tool, exactly as before.
  if (!entered && !entitlement.isPremium) {
    return (
      <>
        <LandingScreen onEnter={enterApp} onOpenAuth={() => setAuthOpen(true)} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        <CheckoutToast />
      </>
    );
  }

  if (!accepted) {
    return <DisclaimerGate onAccept={acceptDisclaimer} />;
  }

  // "Evidencia" is a premium capability, so the lab's link to it routes through
  // the paywall instead of opening the overlay when the plan doesn't cover it.
  const openEvidence = () => {
    const allowed = entitlement.canUseFeature('evidence');
    if (allowed) track(EVENTS.evidenceOpened, { region: regionId });
    setOverlay(allowed ? 'evidence' : 'pricing');
  };

  // The TopBar's overlay setter, wrapped so the guide reports itself. Going
  // through one setter beats sprinkling `track` across every button that can
  // open it (TopBar, GuideHub, the tour).
  const openOverlay = (next: Overlay) => {
    if (next === 'guide') track(EVENTS.guideOpened, { region: regionId, mode });
    setOverlay(next);
  };

  return (
    <UpgradeProvider onOpenPricing={() => setOverlay('pricing')}>
    {/* `theme-ink` pins the product to the instrument theme, so the surfaces
        shared with the public site (Pricing, Paywall, AuthModal) resolve their
        semantic tokens to ink here and to paper there. See index.css. */}
    <div className="theme-ink flex h-screen w-screen flex-col overflow-hidden bg-ink-950 text-slate-200">
      <TopBar
        mode={mode}
        setMode={setMode}
        setOverlay={openOverlay}
        onOpenAuth={() => setAuthOpen(true)}
      />

      {/* Persistent educational disclaimer. */}
      <div className="shrink-0 px-3 py-1 sm:px-4">
        <MedicalDisclaimerBanner />
      </div>

      {/* The 3D views below are lazy-loaded; IndexLoading covers the brief
          chunk fetch the first time the workspace is shown. A scoped
          ErrorBoundary keeps a 3D crash from blanking the whole app and lets
          the user recover by switching region/mode (resetKeys). */}
      <ErrorBoundary variant="inline" label="la vista 3D" resetKeys={[regionId, mode]}>
      <Suspense fallback={<IndexLoading />}>
      {locked || contentDenied ? (
        // SUBSCRIPTION GATE: this region needs premium. Replace the whole body
        // with the upgrade funnel; the TopBar stays so the user can switch back
        // to a free region (Hombro / Fundamentos).
        //
        // `contentDenied` is the SERVER's answer. It lands here too, so a user
        // who got past the client-side flag still sees the paywall and not an
        // empty region.
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-hidden">
            <Paywall region={regionId} onOpenAuth={() => setAuthOpen(true)} />
          </main>
        </div>
      ) : contentPending ? (
        // The region's clinical library is on its way. Same loader the anatomy
        // index uses, so the wait reads as one continuous load.
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-hidden">
            <ContentLoading />
          </main>
        </div>
      ) : contentState === 'error' ? (
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-hidden">
            <ContentError />
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
                onOpenEvidence={openEvidence}
              />
            )}
          </main>
        </div>
      ) : mode === 'learn' && concept ? (
        // CONCEPTUAL module (Fundamentos): the 3D overlay (planes/axes) is
        // inseparable from the text, so we ALWAYS show the live model beside
        // the concept renderer. Desktop: ConceptStage | ConceptTrack side by
        // side. Compact: stage on top (45vh), ConceptTrack below. No Sidebar /
        // SelectionPanel here -- there are no muscles to list.
        //
        // The stage (ConceptStage) is what makes that half do work: it titles
        // the section, applies its camera view + overlay, carries the layer and
        // view controls (unreachable here otherwise, which is how the module
        // could end up stuck on a bare skeleton) and shows the section's
        // schematic full-size when it has no 3D content.
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto lg:overflow-hidden">
            <div className="flex min-h-0 flex-col lg:h-full lg:flex-row">
              <div className="h-[45vh] shrink-0 lg:h-full lg:min-w-0 lg:flex-1 lg:border-r lg:border-slate-800/60">
                {status === 'error' ? (
                  <IndexError message={error} />
                ) : status === 'loading' ? (
                  <IndexLoading />
                ) : (
                  <ConceptStage
                    section={conceptSection.section}
                    index={conceptSection.index}
                    total={conceptSection.total}
                  >
                    <Viewer3D
                      byMesh={byMesh}
                      regionMeshes={regionMeshes}
                      resolution={resolution}
                    />
                  </ConceptStage>
                )}
              </div>
              <div className="min-h-0 flex-1 lg:h-full lg:w-[440px] lg:flex-none xl:w-[520px]">
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
                    regionFocusMeshes={regionFocusMeshes}
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
                  regionFocusMeshes={regionFocusMeshes}
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
      </ErrorBoundary>

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
      {/* The drawers live OUTSIDE the body's Suspense, so the lazy panels need
          their own boundary here. */}
      {drawer === 'sidebar' && (
        <DrawerShell side="left" onClose={() => setDrawer('none')}>
          <Suspense fallback={<PanelLoading />}>
            <Sidebar
              index={index}
              resolution={resolution}
              onNavigate={() => setDrawer('none')}
              onOpenPhase={() => setMode('learn')}
            />
          </Suspense>
        </DrawerShell>
      )}
      {drawer === 'selection' && (
        <DrawerShell side="right" onClose={() => setDrawer('none')}>
          <Suspense fallback={<PanelLoading />}>
            <SelectionPanel byMesh={byMesh} resolution={resolution} />
          </Suspense>
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
        <OverlayShell title="Créditos y licencias" onClose={() => setOverlay('none')}>
          <AttributionScreen />
        </OverlayShell>
      )}
      {overlay === 'legal' && (
        <OverlayShell title="Legal" onClose={() => setOverlay('none')}>
          <LegalScreen defaultTab="terminos" />
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
      {/* Someone arrived on an address we do not serve: say so and offer a way
          out, instead of silently rewriting the URL under them. */}
      <RouteNotice
        landedRegion={regionId}
        onGo={(r, m) => {
          setRegion(r);
          setMode(m);
          setOverlay('none');
          setDrawer('none');
        }}
      />
      {overlay === 'guide' && (
        <OverlayShell title="Guía rápida" onClose={() => setOverlay('none')}>
          <GuideHub
            mode={mode}
            regionId={regionId}
            onGo={(m) => {
              setMode(m);
              setOverlay('none');
            }}
            onReopenTour={() => {
              setOverlay('none');
              setTourDone(false);
            }}
            onOpenPricing={() => setOverlay('pricing')}
            onOpenEvidence={openEvidence}
            onOpenOverlay={setOverlay}
            onClose={() => setOverlay('none')}
          />
        </OverlayShell>
      )}
      {overlay === 'evidence' && (
        <OverlayShell title="Evidencia clínica" onClose={() => setOverlay('none')}>
          <Suspense fallback={<PanelLoading />}>
            <EvidenceScreen region={regionId} />
          </Suspense>
        </OverlayShell>
      )}

      <CheckoutToast />
    </div>
    </UpgradeProvider>
  );
}

/* ---------------------------------------------------------------------------
 * Checkout toast: a soft, auto-dismissing notice after returning from Stripe.
 * Currently only the 'cancel' case (abandoned checkout); success unlocks the
 * app on its own via the AuthContext poll.
 * ------------------------------------------------------------------------ */
function CheckoutToast() {
  const { checkoutNotice, clearCheckoutNotice } = useAuth();

  useEffect(() => {
    if (!checkoutNotice) return;
    const t = window.setTimeout(clearCheckoutNotice, 6000);
    return () => window.clearTimeout(t);
  }, [checkoutNotice, clearCheckoutNotice]);

  if (checkoutNotice !== 'cancel') return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-2.5 text-sm text-slate-200 shadow-xl backdrop-blur">
      <span>Pago cancelado. Sigues en el plan gratuito.</span>
      <button
        type="button"
        onClick={clearCheckoutNotice}
        aria-label="Cerrar aviso"
        className="rounded-md p-0.5 text-slate-500 transition-colors hover:text-slate-200"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Disclaimer acceptance gate (first run).
 * ------------------------------------------------------------------------ */
function DisclaimerGate({ onAccept }: { onAccept: () => void }) {
  // THIS SCREEN BLOCKS THE ENTIRE APP, so it is built to be impossible to get
  // stuck on. It used to be `h-screen` + `overflow-hidden` with the button in a
  // pinned footer; on a phone that container is taller than the visible
  // viewport (see the h-screen note in index.css), which put the button off
  // screen with no way to scroll to it. The app simply could not be entered.
  //
  // `position: fixed` + `inset-0`, NOT `h-screen`.
  //
  // Viewport units were the wrong tool twice over. `100vh` is the large
  // viewport on mobile, so the box ran taller than the screen; `100dvh` fixes
  // that but still leaves the gate as a normal child of #root, which is
  // `height: 100%` inside a `body` that is `overflow: hidden` -- so if those two
  // heights ever disagree, the bottom of the gate is clipped away with no
  // scrollbar to recover it. That is a lot of assumptions for the one screen
  // that stands between a visitor and the entire product.
  //
  // A fixed, inset-0 element is measured against the viewport itself. It cannot
  // be clipped by #root's height or by the body's overflow, and it needs no
  // viewport-unit support to be exactly as tall as the screen. Inside it, one
  // scroll region carries the notice with the action bar stuck to its bottom
  // edge, so the button is on screen whether the text overflows or not.
  return (
    <div className="theme-ink fixed inset-0 z-50 flex flex-col bg-ink-950 text-slate-200">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <MedicalDisclaimerScreen />
        <div className="sticky bottom-0 border-t border-slate-800/60 bg-ink-950/95 px-6 pt-4 backdrop-blur pb-safe">
          <div className="mx-auto flex max-w-2xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-slate-500">
              Al continuar confirmas que has leído este aviso y que usarás la
              aplicación solo con fines educativos.
            </p>
            <button
              type="button"
              onClick={onAccept}
              className="shrink-0 rounded-lg bg-brand-fill px-5 py-3 text-sm font-semibold text-brand-on transition-colors hover:bg-brand-deep"
            >
              Acepto y continúo
            </button>
          </div>
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
      <p className="font-mono text-xs text-slate-600">Cargando índice anatómico...</p>
    </div>
  );
}

/** Waiting on a premium region's clinical library from the content endpoint. */
function ContentLoading() {
  return (
    <div className="flex h-full items-center justify-center viewer-bg">
      <p className="font-mono text-xs text-slate-600">Cargando contenido clínico...</p>
    </div>
  );
}

/**
 * The content endpoint failed for a reason that is NOT "you have not paid"
 * (network, function down). Says so plainly instead of showing an empty region,
 * which would read as missing content and make the product look broken.
 */
function ContentError() {
  return (
    <div className="flex h-full items-center justify-center viewer-bg px-6">
      <div className="max-w-sm rounded-xl border border-rose-900/40 bg-rose-950/20 px-5 py-4 text-center">
        <p className="text-sm font-medium text-rose-300">
          No se pudo cargar el contenido clínico de esta región.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Revisa tu conexión y vuelve a intentarlo. Si el problema sigue, cambia
          de región y vuelve a entrar.
        </p>
      </div>
    </div>
  );
}

/** Fallback for a lazy panel rendered outside the body's Suspense. */
function PanelLoading() {
  return (
    <div className="flex h-full min-h-[8rem] items-center justify-center px-6 py-8">
      <p className="font-mono text-xs text-slate-600">Cargando...</p>
    </div>
  );
}

function IndexError({ message }: { message: string | null }) {
  return (
    <div className="flex h-full items-center justify-center viewer-bg">
      <div className="max-w-sm rounded-xl border border-rose-900/40 bg-rose-950/20 px-5 py-4 text-center">
        <p className="text-sm font-medium text-rose-300">
          No se pudo cargar el índice anatómico.
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
