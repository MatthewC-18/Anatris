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

import { useEffect, useMemo, useState } from 'react';
import { useAnatomyIndex } from './hooks/useAnatomyIndex';
import { useMuscleResolution } from './hooks/useMuscleResolution';
import { useAnatomyStore } from './store/anatomyStore';
import { TopBar, type AppMode, type Overlay } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Viewer3D } from './components/Viewer3D';
import { ViewToolbar } from './components/ViewToolbar';
import { SelectionPanel } from './components/SelectionPanel';
import { CommandPalette } from './components/CommandPalette';
import { PhaseTrack } from './components/PhaseTrack';
import { AttributionScreen } from './components/AttributionScreen';
import {
  MedicalDisclaimerBanner,
  MedicalDisclaimerScreen,
} from './components/MedicalDisclaimer';
import { REGIONS, resolveRegionMeshes } from './data/regiones';

/** Which mobile drawer (if any) is open. Desktop never opens these. */
type Drawer = 'none' | 'sidebar' | 'selection';

/* ---------------------------------------------------------------------------
 * PERSISTENCE HOOK (production wiring point)
 * ---------------------------------------------------------------------------
 * Replace these two helpers with real persistence (e.g. localStorage) to keep
 * the disclaimer accepted across visits. Kept as no-ops so this file stays
 * portable.
 * ------------------------------------------------------------------------ */
function readAccepted(): boolean {
  return false;
}
function writeAccepted(): void {
  // no-op placeholder; see PERSISTENCE HOOK above.
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
  const [accepted, setAccepted] = useState<boolean>(() => readAccepted());
  const compact = useIsCompact();

  // Active region lives in the store; the TopBar module nav is the single
  // switch. Default to the shoulder on first mount if unset.
  const region = useAnatomyStore((s) => s.region);
  const setRegion = useAnatomyStore((s) => s.setRegion);
  const regionId = region ?? 'shoulder';

  useEffect(() => {
    if (region == null) setRegion('shoulder');
  }, [region, setRegion]);

  // Close any open drawer when growing back to desktop.
  useEffect(() => {
    if (!compact) setDrawer('none');
  }, [compact]);

  // Restrict the scene to the current region (hides head, abdomen, legs, ...).
  const regionMeshes = useMemo(() => {
    if (byMesh.size === 0) return null;
    const def = REGIONS[regionId] ?? REGIONS.shoulder;
    return resolveRegionMeshes(def, byMesh.keys());
  }, [byMesh, regionId]);

  function acceptDisclaimer(): void {
    writeAccepted();
    setAccepted(true);
  }

  if (!accepted) {
    return <DisclaimerGate onAccept={acceptDisclaimer} />;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink-950 text-slate-200">
      <TopBar mode={mode} setMode={setMode} setOverlay={setOverlay} />

      {/* Persistent educational disclaimer. */}
      <div className="shrink-0 px-4 py-2">
        <MedicalDisclaimerBanner />
      </div>

      {mode === 'learn' ? (
        <div className="flex min-h-0 flex-1">
          <div className="hidden lg:flex">
            <Sidebar index={index} resolution={resolution} />
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
          <div className="hidden lg:flex">
            <Sidebar index={index} resolution={resolution} />
          </div>
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
          <div className="hidden lg:flex">
            <SelectionPanel byMesh={byMesh} resolution={resolution} />
          </div>
        </div>
      )}

      {/* Compact-only floating buttons to open the drawers. */}
      {compact && (
        <>
          <button
            type="button"
            onClick={() => setDrawer('sidebar')}
            className="fixed bottom-4 left-4 z-30 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-sm font-medium text-slate-200 shadow-lg backdrop-blur"
          >
            <PanelIcon />
            Controles
          </button>
          {mode === 'explore' && (
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
          />
        </DrawerShell>
      )}
      {drawer === 'selection' && (
        <DrawerShell side="right" onClose={() => setDrawer('none')}>
          <SelectionPanel byMesh={byMesh} resolution={resolution} />
        </DrawerShell>
      )}

      <CommandPalette index={index} />

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
