// src/App.tsx
//
// Top-level layout. Two modes:
//   - "Explorar" (default): TopBar + three-column body
//       Sidebar | Viewer (with floating toolbar) | SelectionPanel.
//   - "Aprender": the 7-phase pedagogical track (PhaseTrack), shown wide.
// The mode toggle lives top-right for now; it can later move into TopBar.
//
// Loads the anatomy index once, builds the muscle resolution, resolves which
// meshes belong to the current region, and passes the lookup maps down.

import { useMemo, useState } from 'react';
import { useAnatomyIndex } from './hooks/useAnatomyIndex';
import { useMuscleResolution } from './hooks/useMuscleResolution';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Viewer3D } from './components/Viewer3D';
import { ViewToolbar } from './components/ViewToolbar';
import { SelectionPanel } from './components/SelectionPanel';
import { CommandPalette } from './components/CommandPalette';
import { PhaseTrack } from './components/PhaseTrack';
import { REGIONS, resolveRegionMeshes } from './data/regiones';

/** Which top-level mode the app is in. */
type AppMode = 'explore' | 'learn';

export default function App() {
  const { index, byMesh, status, error } = useAnatomyIndex();
  const resolution = useMuscleResolution(index);
  const [mode, setMode] = useState<AppMode>('explore');

  // Restrict the scene to the current region (for now: the shoulder). This is
  // what hides the head, abdomen, legs, etc. — only shoulder structures stay
  // visible. We resolve the region's keyword definition against the real mesh
  // names in the loaded index. When `byMesh` isn't ready yet this is null,
  // which makes the viewer show everything (its safe default).
  const regionMeshes = useMemo(() => {
    if (byMesh.size === 0) return null;
    return resolveRegionMeshes(REGIONS.shoulder, byMesh.keys());
  }, [byMesh]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink-950 text-slate-200">
      <div className="relative">
        <TopBar />
        {/* Mode toggle — floats over the TopBar's right side. Move into TopBar
            later if you prefer it inline. */}
        <div className="pointer-events-auto absolute right-4 top-1/2 z-30 -translate-y-1/2">
          <ModeToggle mode={mode} setMode={setMode} />
        </div>
      </div>

      {mode === 'learn' ? (
        <div className="flex min-h-0 flex-1">
          <Sidebar index={index} resolution={resolution} />
          <main className="min-w-0 flex-1">
            <PhaseTrack />
          </main>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <Sidebar index={index} resolution={resolution} />
          {/* Viewer column */}
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
          <SelectionPanel byMesh={byMesh} resolution={resolution} />
        </div>
      )}

      <CommandPalette index={index} />
    </div>
  );
}

/** Explore / Learn switch. */
function ModeToggle({
  mode,
  setMode,
}: {
  mode: AppMode;
  setMode: (m: AppMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-800/60 bg-slate-900/60 p-1 backdrop-blur">
      <ModeButton id="explore" label="Explorar" mode={mode} setMode={setMode} />
      <ModeButton id="learn" label="Aprender" mode={mode} setMode={setMode} />
    </div>
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
