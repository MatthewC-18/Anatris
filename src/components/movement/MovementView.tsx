// src/components/movement/MovementView.tsx
//
// "Movimiento" mode body: the live 3D model with the shoulder movement rig
// mounted, plus the control panel overlaid. Only the shoulder is rigged today,
// so other regions get an honest "coming soon" state with a shortcut back to
// the shoulder.

import { useEffect } from 'react';
import { Viewer3D } from '../Viewer3D';
import { MovementControls } from './MovementControls';
import { useAnatomyStore } from '../../store/anatomyStore';
import { ANATOMICAL_LAYERS, SECONDARY_LAYERS } from '../../lib/anatomyMeta';
import type { AnatomyLayer } from '../../types/anatomy';
import type { AnatomyEntry } from '../../types/anatomy';
import type { MuscleResolution } from '../../lib/muscleResolver';

interface MovementViewProps {
  region: string | null;
  byMesh: Map<string, AnatomyEntry>;
  regionMeshes?: Set<string> | null;
  resolution: MuscleResolution;
}

// In the movement lab the detailed muscle meshes can't deform, so showing them
// (even faded) just clutters and occludes the gesture. We restrict the scene to
// a CLEAN SKELETON (bones + ligaments) and let the deforming muscle BANDS be the
// muscle representation — the Muscle&Motion-style "clear skeleton + simplified
// active muscles" read. The previous layer set is restored on exit.
const MOVEMENT_LAYERS = new Set<AnatomyLayer>(['bones', 'ligaments']);
const ALL_LAYERS: AnatomyLayer[] = [...ANATOMICAL_LAYERS, ...SECONDARY_LAYERS];

export function MovementView({
  region,
  byMesh,
  regionMeshes,
  resolution,
}: MovementViewProps) {
  const setRegion = useAnatomyStore((s) => s.setRegion);
  const isShoulder = (region ?? 'shoulder') === 'shoulder';

  // Switch to the clean skeleton view while the lab is open; restore on exit.
  useEffect(() => {
    if (!isShoulder) return;
    const store = useAnatomyStore.getState();
    const prev = new Set(store.activeLayers);
    ALL_LAYERS.forEach((l) => store.setLayer(l, MOVEMENT_LAYERS.has(l)));
    return () => {
      const s = useAnatomyStore.getState();
      ALL_LAYERS.forEach((l) => s.setLayer(l, prev.has(l)));
    };
  }, [isShoulder]);

  if (!isShoulder) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-base font-semibold text-slate-200">
            El laboratorio de movimiento está disponible para el Hombro
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Estamos preparando codo, rodilla y columna. Por ahora puedes estudiar
            la abducción glenohumeral con músculos activos por fase.
          </p>
          <button
            type="button"
            onClick={() => setRegion('shoulder')}
            className="mt-4 rounded-lg bg-accent/20 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
          >
            Ir al hombro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Viewer3D
        byMesh={byMesh}
        regionMeshes={regionMeshes}
        resolution={resolution}
        movement
      />
      {/* Control panel overlaid bottom-left; the wrapper is click-through so the
          canvas stays draggable around it. */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-20">
        <MovementControls />
      </div>
    </div>
  );
}
