// src/App.tsx
//
// Top-level layout: TopBar across the top, then a three-column body of
// Sidebar | Viewer (with floating toolbar) | SelectionPanel. Loads the
// anatomy index once, builds the muscle resolution from it, resolves which
// meshes belong to the current region, and passes the lookup maps down.

import { useMemo } from 'react';
import { useAnatomyIndex } from './hooks/useAnatomyIndex';
import { useMuscleResolution } from './hooks/useMuscleResolution';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Viewer3D } from './components/Viewer3D';
import { ViewToolbar } from './components/ViewToolbar';
import { SelectionPanel } from './components/SelectionPanel';
import { CommandPalette } from './components/CommandPalette';
import { REGIONS, resolveRegionMeshes } from './data/regiones';

export default function App() {
  const { index, byMesh, status, error } = useAnatomyIndex();
  const resolution = useMuscleResolution(index);

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
      <TopBar />
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
      <CommandPalette index={index} />
    </div>
  );
}

function IndexLoading() {
  return (
    <div className="flex h-full items-center justify-center viewer-bg">
      <p className="font-mono text-xs text-slate-600">Cargando índice anatómico…</p>
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
