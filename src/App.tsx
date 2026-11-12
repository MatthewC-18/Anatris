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
//     SelectionPanel become slide-in drawers ("Índice" and "Ficha") opened from
//     the bar at the foot of the stage. In "Aprender" the Viewer and PhaseTrack
//     stack vertically.
//
// LEGAL / PRODUCT:
//   - A one-time medical-disclaimer GATE blocks the app until accepted.
//   - A persistent disclaimer BANNER sits under the TopBar at all times.
//   - "Acerca de" and "Legal" open the attribution / disclaimer screens as
//     overlays.
//
// SIN CAJAS (sistema LAMINA, docs/sistema-lamina.md):
//   El armazon dibujaba siete recuadros propios (`npm run audit-surfaces`: 4
//   cajas, 1 bloque y 2 pastillas): dos capsulas flotando sobre el modelo para
//   abrir los cajones, el aviso de pago cancelado, dos tarjetas rosas de error
//   y el cascaron de las superposiciones con 16 px de radio. Ahora las puertas
//   de los cajones son texto en la barra del escenario (`.stage-bar`), los
//   estados de carga y de error son texto suelto con una regla a la izquierda,
//   y lo unico que lleva superficie es lo que flota de verdad: los dialogos
//   (`.instrument`).
//
// TECLADO:
//   Las superposiciones y los cajones son dialogos de verdad (`useDialogFocus`):
//   el foco entra, da la vuelta dentro, Escape cierra y el foco vuelve al boton
//   que los abrio. Antes solo se cerraban con el raton.

import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useAnatomyIndex } from './hooks/useAnatomyIndex';
import { useMuscleResolution } from './hooks/useMuscleResolution';
import { usePremiumRegion } from './hooks/usePremiumRegion';
import { useAnatomyStore } from './store/anatomyStore';
import { warmModelForMode } from './lib/modelWarm';
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
import { LoaderVideo } from './components/LoaderVideo';
import { setLoaderSlot } from './components/movement/loaderSlot';
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
import { documentTitleFor, settledMode } from './lib/shellRoute';
import { useDialogFocus } from './hooks/useDialogFocus';
import { useIsCompact } from './hooks/useIsCompact';

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

// "Compacto" (por debajo de lg, 1024 px) sale de src/hooks/useIsCompact.ts. Aqui
// habia una copia local del hook, la misma que su cabecera da por retirada.

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

  // DOS PREGUNTAS QUE EL ARMAZON SE HACIA EN CADA EFECTO, Y CONTESTABA DISTINTO.
  //   `inApp`     la landing ya quedo atras (entro, o es suscriptor y se la salta)
  //   `toolShown` ademas acepto el aviso: la herramienta esta en pantalla
  // Los efectos de abajo (ruta, titulo, analitica, precarga del modelo) corrian
  // tambien con la landing o el aviso en pantalla, y de ahi salian tres
  // defectos que estan explicados en cada uno.
  const inApp = entered || entitlement.isPremium;
  const toolShown = inApp && accepted;

  // EL MODELO 3D EMPIEZA A BAJAR AQUÍ, no cuando el visor existe.
  //
  // Medido: la petición del rig arrancaba a los dos segundos de abrir el
  // laboratorio, porque hasta entonces nadie la había hecho -- primero el
  // bundle, luego la ruta, luego el trozo diferido de MovementView, luego
  // RigViewer, luego Suspense, y por fin RigModel pedía 9 MB. Sabiendo el modo
  // ya se sabe qué archivo hace falta, así que se pide en paralelo con el resto.
  //
  // Condicionado a `accepted` y `entered` a propósito: 9 MB traídos para
  // alguien que todavía está leyendo el aviso médico, y que puede cerrarlo, son
  // ancho de banda que paga el proyecto y no usa nadie. Ver src/lib/modelWarm.ts.
  //
  // `toolShown` y no `accepted && entered`: un suscriptor en un navegador nuevo
  // se salta la landing sin pasar por `enterApp`, asi que `entered` es falso
  // para el y la precarga no arrancaba nunca. Justo el que paga esperaba mas.
  useEffect(() => {
    if (!toolShown) return;
    warmModelForMode(mode);
  }, [toolShown, mode]);

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

  // El modo en el que la aplicacion se va a QUEDAR. Solo difiere de `mode` un
  // instante: Fundamentos abierto en Explorar, que el efecto de mas abajo
  // corrige a Aprender. Ver src/lib/shellRoute.ts.
  const shownMode = settledMode(region, mode);

  // STATE -> ROUTE. The first write replaces (normalizing `/` into
  // `/hombro/explorar` must not create an entry the user's Back button gets
  // stuck on); every later region/mode change pushes, so Back retraces the path
  // they actually walked.
  //
  // DOS COSAS QUE ESTE EFECTO HACIA Y NO DEBIA:
  //
  // 1. ESCRIBIA CON LA LANDING EN PANTALLA. Los efectos corren aunque el
  //    render devuelva la landing, asi que quien abria `/` veia la landing con
  //    la direccion ya cambiada a `/hombro/explorar`. Y `entered` arranca en
  //    `readRoute() != null`: recargar esa pagina, o pegarle el enlace a un
  //    colega, saltaba la landing y aterrizaba en el aviso legal a pantalla
  //    completa, que es justo lo que el orden "landing primero" queria evitar.
  //    Ademas RouteNotice lee la direccion al montarse, y se monta al entrar:
  //    para entonces una direccion equivocada ya estaba reescrita y el aviso de
  //    "esa pagina no existe" no salia nunca a un visitante nuevo. Ahora la
  //    direccion no se toca hasta que la landing queda atras (`inApp`).
  //
  // 2. ESCRIBIA UNA RUTA QUE IBA A CORREGIR. Con Fundamentos en Explorar
  //    apilaba `/fundamentos/explorar` y despues `/fundamentos/aprender`, y la
  //    primera rebota a la segunda: Atras no salia de Fundamentos. Ahora espera
  //    al modo asentado.
  const routeSyncedRef = useRef(false);
  useEffect(() => {
    if (region == null || !inApp) return;
    if (shownMode !== mode) return;
    writeRoute({ region, mode }, { replace: !routeSyncedRef.current });
    routeSyncedRef.current = true;
  }, [region, mode, shownMode, inApp]);

  // EL TITULO DE LA PESTANA DICE DONDE ESTAS: "Rodilla · Movimiento | Anatris".
  // No se asignaba en ningun sitio, asi que las 36 rutas se llamaban igual en
  // la pestana, en el historial del navegador y en los marcadores. Solo con la
  // herramienta en pantalla: la landing y el aviso conservan el de index.html.
  useEffect(() => {
    if (region == null || !toolShown) return;
    document.title = documentTitleFor(region, shownMode);
  }, [region, shownMode, toolShown]);

  // PRODUCT ANALYTICS: which region and which mode people actually use.
  //
  // This rides on the same (region, mode) pair the router syncs, so it covers
  // every way of getting there — TopBar, deep link, Back button — with one
  // effect instead of a dozen onClick handlers. `trackChange` collapses the
  // re-renders, so a user who reads the shoulder for ten minutes is one
  // `region_opened`, not one per render.
  //
  // Solo con la herramienta en pantalla: corria tambien sobre la landing, y
  // cada visita a la portada contaba como un "hombro abierto en Explorar" de
  // alguien que no habia abierto nada.
  useEffect(() => {
    if (region == null || !toolShown) return;
    if (shownMode !== mode) return;
    trackChange(EVENTS.regionOpened, { region });
    trackChange(EVENTS.modeOpened, { mode, region });
  }, [region, mode, shownMode, toolShown]);

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
    if (shownMode !== mode) setMode(shownMode);
  }, [shownMode, mode]);

  // Close any open drawer when growing back to desktop.
  useEffect(() => {
    if (!compact) setDrawer('none');
  }, [compact]);

  // EL BUSCADOR SUSTITUYE A LO QUE HAYA ABIERTO. Vive por debajo de las
  // superposiciones (mismo z-50, antes en el arbol), asi que Ctrl+K con la guia
  // o los planes abiertos lo abria DETRAS de ellos, con el foco en un campo que
  // no se veia: se escribia a ciegas. Abrirlo cierra la superposicion y el
  // cajon, que es ademas lo que la propia guia promete ("Ctrl K: buscar").
  const paletteOpen = useAnatomyStore((s) => s.paletteOpen);
  useEffect(() => {
    if (!paletteOpen) return;
    setOverlay('none');
    setDrawer('none');
  }, [paletteOpen]);

  // Hay algo seleccionado en Explorar: lo usa la puerta de la ficha en la vista
  // compacta para avisar de que ya tiene contenido.
  const hasSelection = useAnatomyStore(
    (s) => s.selectedMeshName != null || s.selectedMuscleId != null || s.selectedBoneId != null,
  );

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
  if (!inApp) {
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

  // EL ESPACIO DE TRABAJO ESTA EN PANTALLA: ni el muro de pago, ni la carga del
  // contenido clinico, ni su error. Las puertas de los cajones solo se pintan
  // entonces. Antes miraban solo `locked`, asi que con el contenido de una
  // region de pago todavia bajando (o con su error en pantalla) los dos botones
  // flotaban sobre el cartel y abrian un indice y una ficha vacios.
  const workspaceShown =
    !locked && !contentDenied && !contentPending && contentState !== 'error';

  return (
    <UpgradeProvider onOpenPricing={() => setOverlay('pricing')}>
    {/* `theme-ink` pins the product to the instrument theme, so the surfaces
        shared with the public site (Pricing, Paywall, AuthModal) resolve their
        semantic tokens to ink here and to paper there. See index.css. */}
    <div className="theme-ink flex h-screen w-screen flex-col overflow-hidden bg-page text-fg">
      <TopBar
        mode={mode}
        setMode={setMode}
        setOverlay={openOverlay}
        onOpenAuth={() => setAuthOpen(true)}
      />

      {/* Persistent educational disclaimer: una linea bajo la barra, con el
          mismo filo que separa todo lo demas. */}
      <div className="shrink-0 border-b border-line/75 px-3 py-[3px] sm:px-4">
        <MedicalDisclaimerBanner />
      </div>

      {/* The 3D views below are lazy-loaded; IndexLoading covers the brief
          chunk fetch the first time the workspace is shown. A scoped
          ErrorBoundary keeps a 3D crash from blanking the whole app and lets
          the user recover by switching region/mode (resetKeys). */}
      <ErrorBoundary variant="inline" label="la vista 3D" resetKeys={[regionId, mode]}>
      <Suspense fallback={<IndexLoading mode={mode} />}>
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
            <ContentLoading mode={mode} />
          </main>
        </div>
      ) : contentState === 'error' ? (
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-hidden">
            <ContentError onGoFree={() => setRegion(DEFAULT_REGION)} />
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
          {/* `setLoaderSlot`: la pantalla de carga del cuerpo se pinta AQUI, en
              toda la zona y no solo en el escenario, que es el mismo rectangulo
              que la espera de arriba (ver movement/loaderSlot.ts). */}
          <main ref={setLoaderSlot} className="relative min-w-0 flex-1">
            {/* EL LABORATORIO NO ESPERA AL INDICE DE EXPLORAR, Y NO DEBIA.
                Esto estaba envuelto en `status === 'loading' ? <IndexLoading/>`,
                es decir: el modo Movimiento se quedaba en "Cargando indice
                anatomico..." --pantalla vacia-- hasta que bajaba
                /anatomy-index.json. Ese indice describe el modelo de EXPLORAR
                (public/modelo-opt.dec.glb, 6.316 mallas), no el rig del
                laboratorio (public/cuerpo-rig.opt.glb, 2.659). Y MovementView
                no lo usa: sus props `byMesh`, `regionMeshes` y `resolution` son
                opcionales y no se leen en ninguna linea del fichero, como dice
                su propia cabecera.
                Visto en pantalla: al cambiar de pestana con el panel ya cargado,
                el laboratorio entero desaparecia y volvia el cartel del indice,
                y con el una recarga completa del rig. */}
            <MovementView region={region} onOpenEvidence={openEvidence} />
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
              <div className="h-[45vh] shrink-0 lg:h-full lg:min-w-0 lg:flex-1 lg:border-r lg:border-line/75">
                {status === 'error' ? (
                  <IndexError message={error} onOpenLab={() => setMode('movement')} />
                ) : status === 'loading' ? (
                  <IndexLoading mode={mode} />
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
                  <IndexError message={error} onOpenLab={() => setMode('movement')} />
                ) : status === 'loading' ? (
                  <IndexLoading mode={mode} />
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
              <IndexError message={error} onOpenLab={() => setMode('movement')} />
            ) : status === 'loading' ? (
              <IndexLoading mode={mode} />
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

      {/* VISTA COMPACTA: LAS DOS PUERTAS A LOS MARGENES, EN LA BARRA DEL
          ESCENARIO. Eran dos capsulas con borde, sombra y desenfoque flotando
          sobre el modelo, y se llamaban "Controles" y "Detalle", que no dicen
          que hay dentro. Ahora son texto al pie del escenario, sobre el velo de
          `.stage-bar`, y llevan el nombre de lo que abren: el INDICE de la
          region (musculos, huesos, nervios, capas) y la FICHA de lo que este
          seleccionado, que son los nombres que usa el sistema para los dos
          margenes (docs/sistema-lamina.md).

          La barra mide 24 px de velo + 44 px de boton + el margen de
          `pb-safe`: los botones quedan por debajo de los 76 px (4.75rem) que
          ViewToolbar deja libres al pie en la vista compacta, que es la medida
          que evita que las vistas de camara queden tapadas.

          El punto de la ficha avisa de que ya hay algo que leer: en un telefono
          tocar una estructura la resalta en el modelo, pero nada junto al boton
          decia que su ficha estaba esperando detras. */}
      {compact && workspaceShown && !concept && (mode === 'explore' || mode === 'learn') && (
        <div className="stage-bar pb-safe fixed inset-x-0 bottom-0 z-30 justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setDrawer('sidebar')}
            aria-haspopup="dialog"
            className="btn btn-quiet h-11 px-3 text-fg"
          >
            <PanelIcon />
            Índice
          </button>
          {mode === 'explore' && (
            <button
              type="button"
              onClick={() => setDrawer('selection')}
              aria-haspopup="dialog"
              className="btn btn-quiet h-11 px-3 text-fg"
            >
              {hasSelection && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              )}
              Ficha
              {hasSelection && <span className="sr-only">(hay una estructura seleccionada)</span>}
              <InfoIcon />
            </button>
          )}
        </div>
      )}

      {/* Mobile drawers. */}
      {/* The drawers live OUTSIDE the body's Suspense, so the lazy panels need
          their own boundary here. */}
      {drawer === 'sidebar' && (
        <DrawerShell side="left" title="Índice" onClose={() => setDrawer('none')}>
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
        <DrawerShell side="right" title="Ficha" onClose={() => setDrawer('none')}>
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
    // Flota de verdad (es un aviso que se va solo), asi que lleva superficie.
    // `theme-ink` en el propio elemento porque tambien se pinta sobre la
    // landing, que puede estar en papel: sin el, `text-fg` resolveria al texto
    // oscuro del papel sobre el grafito de `.instrument` y no se leeria.
    <div
      role="status"
      className="theme-ink instrument fixed bottom-4 left-1/2 z-[80] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 py-1.5 pl-4 pr-1.5 text-sm text-fg"
    >
      <span>Pago cancelado. Sigues en el plan gratuito.</span>
      <button
        type="button"
        onClick={clearCheckoutNotice}
        aria-label="Cerrar aviso"
        className="btn btn-quiet btn-icon shrink-0"
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
    <div className="theme-ink fixed inset-0 z-50 flex flex-col bg-page text-fg">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <MedicalDisclaimerScreen />
        {/* La barra es opaca: iba al 95% con desenfoque, y el texto del aviso
            se transparentaba por debajo del boton que hay que leer para pulsar. */}
        <div className="pb-safe sticky bottom-0 border-t border-line/75 bg-page px-6 pt-4">
          <div className="mx-auto flex max-w-2xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-fg3">
              Al continuar confirmas que has leído este aviso y que usarás la
              aplicación solo con fines educativos.
            </p>
            <button
              type="button"
              onClick={onAccept}
              className="btn btn-primary h-11 shrink-0 px-5 text-sm"
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
 *
 * ES EL MARGEN, QUE ENTRA DESDE SU LADO: mismas clases que un margen acoplado
 * (`.margin`, con el filo del lado del escenario), sin sombra ni radio. Lleva
 * el nombre de lo que contiene en la cabecera, porque un cajon sin titulo
 * obligaba a leer su contenido para saber cual de los dos se habia abierto.
 *
 * Es un dialogo (`useDialogFocus`): antes solo se cerraba tocando fuera o
 * acertando al aspa; con teclado no habia forma, y el foco se quedaba en el
 * boton de debajo. El velo ya no es un <button>: eran dos controles "Cerrar"
 * seguidos para un lector de pantalla, uno de ellos del tamano de la pantalla.
 * ------------------------------------------------------------------------ */
function DrawerShell({
  side,
  title,
  onClose,
  children,
}: {
  side: 'left' | 'right';
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useDialogFocus(panel, { onEscape: onClose, yieldToSearch: true });

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={[
          'margin absolute top-0 z-10 h-full max-w-[85vw] outline-none',
          side === 'left' ? 'margin-l left-0' : 'margin-r right-0',
        ].join(' ')}
      >
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-line/75 pl-4">
          <span className="kicker">{title}</span>
          {/* 44 px: es lo que se toca con el pulgar para salir. */}
          <button
            type="button"
            onClick={onClose}
            aria-label={`Cerrar ${title.toLowerCase()}`}
            className="btn btn-quiet btn-icon h-11 w-11"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Generic overlay shell.
 *
 * Una superficie flotante (`.instrument`): la guia, los planes, lo legal, los
 * creditos y la evidencia. Era un recuadro de 16 px de radio con sombra de
 * 50 px y el fondo desenfocado. Y no era un dialogo: sin `role`, sin Escape,
 * sin mover el foco. Ahora lo es (`useDialogFocus`).
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
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogFocus(panel, { onEscape: onClose, yieldToSearch: true });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="instrument relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden outline-none"
      >
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-line/75 pl-5 pr-1.5">
          <h2 id={titleId} className="font-display text-sm font-semibold text-fg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-quiet btn-icon"
            aria-label="Cerrar"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

/* ---- Small inline icons (no extra deps) ---- */
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
function PanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" strokeLinecap="round" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * ESTADOS DEL ESCENARIO: cargando y error.
 *
 * Texto sobre el escenario, sin recuadro. Los de carga son una anotacion
 * (`.stage-note`) en `text-fg2`: iban en `slate-600` (#525761) sobre el fondo
 * del visor (#0b1120 a #070b14), que da entre 2,6:1 y 2,7:1 de contraste, o
 * sea un cartel que casi no se veia justo mientras no hay otra cosa que mirar.
 * Con `fg2` son 6,8:1 a 7,1:1. Los de error eran dos tarjetas rosas; ahora son
 * rotulo, titulo y una nota con la regla a la izquierda, y SIEMPRE traen una
 * salida.
 * ------------------------------------------------------------------------ */
// Y CON LA PANTALLA DE CARGA DE TODA LA APLICACION (`.carga` en index.css, el
// video de src/components/LoaderVideo.tsx): la misma lamina que la del
// laboratorio, en el mismo rectangulo, con el mismo titulo. Al entrar al
// laboratorio esta espera (el trozo de codigo del laboratorio) y la del cuerpo
// se encadenan sin que se mueva nada: el video sigue, el titulo se queda y solo
// cambia el estado de debajo. Antes eran dos pantallas distintas: una de solo
// video a toda la anchura y otra mas pequena con las fases.
//
// Aparece a los 400 ms (`.carga-retardo`): casi todas estas esperas son cortas,
// y un video que asoma y se va en un parpadeo es peor que nada.
const WAIT_TITLE: Record<AppMode, string> = {
  movement: 'Laboratorio de movimiento',
  explore: 'Atlas anatómico',
  learn: 'Aprender',
  study: 'Repasar',
};

function StageWait({ title, status }: { title: string; status: string }) {
  return (
    <div className="viewer-bg relative h-full">
      <div className="carga carga-retardo">
        <div className="carga-video">
          <div className="carga-acercar">
            <LoaderVideo />
          </div>
        </div>
        <div className="carga-texto">
          <p className="carga-marca">Anatris</p>
          <p className="carga-titulo">{title}</p>
          <div className="carga-linea" aria-hidden>
            <span className="carga-lanzadera" />
          </div>
          <p role="status" className="carga-estado">
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}

function IndexLoading({ mode = 'explore' }: { mode?: AppMode }) {
  return (
    <StageWait
      title={WAIT_TITLE[mode] ?? 'Anatris'}
      status={mode === 'movement' ? 'Abriendo el laboratorio' : 'Cargando el índice anatómico'}
    />
  );
}

/** Waiting on a premium region's clinical library from the content endpoint. */
function ContentLoading({ mode = 'explore' }: { mode?: AppMode }) {
  return <StageWait title={WAIT_TITLE[mode] ?? 'Anatris'} status="Cargando el contenido clínico" />;
}

/** Fallback for a lazy panel rendered outside the body's Suspense. */
function PanelLoading() {
  return (
    <div className="flex h-full min-h-[8rem] items-center justify-center px-6 py-8">
      <p role="status" className="stage-note text-fg2">
        Cargando
      </p>
    </div>
  );
}

function StageError({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="viewer-bg flex h-full items-center justify-center px-6">
      <div role="alert" className="w-full max-w-sm">
        <p className="kicker text-rose-300">No se pudo cargar</p>
        <p className="mt-2 font-display text-base font-semibold leading-snug text-fg">{title}</p>
        <div className="note mt-3 border-rose-400/70">{children}</div>
        <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

/** Recargar conserva la pantalla: la region y el modo viajan en la direccion. */
function ReloadButton() {
  return (
    <button type="button" onClick={() => window.location.reload()} className="btn btn-line">
      Reintentar
    </button>
  );
}

/**
 * The content endpoint failed for a reason that is NOT "you have not paid"
 * (network, function down). Says so plainly instead of showing an empty region,
 * which would read as missing content and make the product look broken.
 *
 * DECIA "VUELVE A INTENTARLO" Y NO HABIA CON QUE. El estado 'error' de
 * usePremiumRegion no se reintenta solo, y la pantalla no traia ningun boton:
 * la unica salida era adivinar que habia que cambiar de region y volver. Ahora
 * hay dos: reintentar (recarga, y la direccion devuelve a esta misma region) y
 * seguir en el hombro, cuyo contenido va en el paquete de la aplicacion y no
 * pasa por ese servicio.
 */
function ContentError({ onGoFree }: { onGoFree: () => void }) {
  return (
    <StageError
      title="El contenido clínico de esta región no ha llegado."
      actions={
        <>
          <ReloadButton />
          <button type="button" onClick={onGoFree} className="btn btn-quiet">
            Seguir en el hombro
          </button>
        </>
      }
    >
      Suele ser la conexión. Reintenta; si sigue igual, el hombro no depende de
      esta descarga: su contenido viene con la aplicación.
    </StageError>
  );
}

/**
 * El indice de Explorar no cargo.
 *
 * LE DECIA AL CLIENTE QUE EJECUTARA `npm run build-anatomy`. Es el mensaje de
 * quien desarrolla, y estaba en la pantalla de quien paga. La pista de
 * desarrollo sigue, pero solo en desarrollo (Vite la quita del paquete de
 * produccion); al usuario se le ofrece reintentar y el laboratorio, que no usa
 * este indice (ver la nota junto a MovementView en el cuerpo de App).
 */
function IndexError({
  message,
  onOpenLab,
}: {
  message: string | null;
  onOpenLab: () => void;
}) {
  return (
    <StageError
      title="El índice del atlas no ha llegado."
      actions={
        <>
          <ReloadButton />
          <button type="button" onClick={onOpenLab} className="btn btn-quiet">
            Abrir Movimiento
          </button>
        </>
      }
    >
      Suele ser la conexión. El modo Movimiento no depende de este índice y
      puede abrirse mientras tanto.
      <span className="num mt-1.5 block text-[11px] text-fg3">
        {message ?? 'Error desconocido'}
      </span>
      {import.meta.env.DEV && (
        <span className="mt-1.5 block text-[11px] text-fg3">
          Desarrollo: comprueba que exista <code>public/anatomy-index.json</code> o
          ejecuta <code>npm run build-anatomy</code>.
        </span>
      )}
    </StageError>
  );
}
