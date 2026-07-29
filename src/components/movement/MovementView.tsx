// src/components/movement/MovementView.tsx
//
// "Movimiento" mode body: the skinned biomechanical rig (cuerpo-rig.glb) with a
// region-aware control panel overlaid. The rig drives REAL skeletal deformation
// for the shoulder, elbow, knee and the 25-vertebra spine, replacing the old
// rigid-bone-rotation prototype that only abducted the shoulder.
//
// The legacy props (byMesh / regionMeshes / resolution) are kept in the
// signature so the App call site is unchanged, but the rig lab is self-contained
// and does not consume them.

import { useEffect, useState } from 'react';
import { RigViewer } from './RigViewer';
import { MovementControls } from './MovementControls';
import { RhythmReadout } from './RhythmReadout';
import { LayerControls } from './LayerControls';
import { DissectionPanel } from './DissectionPanel';
import { dissectChannel } from './dissectChannel';
import { OrthopedicTestsPanel } from './OrthopedicTestsPanel';
import { NeuroPanel } from './NeuroPanel';
import { romForRegion } from '../../data/romByRegion';
import { hasNeuro } from '../../data/neuro';
import { isDrivable } from '../../lib/boneMap';
import { useAnatomyStore } from '../../store/anatomyStore';
import type { AnatomyEntry } from '../../types/anatomy';
import type { MuscleResolution } from '../../lib/muscleResolver';

interface MovementViewProps {
  region: string | null;
  byMesh?: Map<string, AnatomyEntry>;
  regionMeshes?: Set<string> | null;
  resolution?: MuscleResolution;
  /** Open the region's "Evidencia" overlay (all sources + PubMed links). */
  onOpenEvidence?: () => void;
}

export function MovementView({ region, onOpenEvidence }: MovementViewProps) {
  const setRegion = useAnatomyStore((s) => s.setRegion);
  const hasDrivable = romForRegion(region).some((m) => isDrivable(m.id));

  // The right column shows ONE expandable sheet at a time (tests or neuro) plus
  // the layer peel. Whichever sheet is open takes the FULL column height and
  // hides the layer panel and the other sheet's collapsed button. Reset on
  // region change so switching joints starts collapsed.
  const [rightPanel, setRightPanel] = useState<'none' | 'tests' | 'neuro'>('none');
  useEffect(() => setRightPanel('none'), [region]);
  const showLayers = rightPanel === 'none';

  // Reset any click-to-dissect peel when the studied region changes or the lab
  // unmounts, so a new joint always opens with the full model.
  useEffect(() => {
    dissectChannel.reset();
    return () => dissectChannel.reset();
  }, [region]);

  // PATIENT MODE: a clean, full-screen view (big 3D + one plain-language bar) the
  // physio turns toward the patient. Hides every clinical overlay. Reset on region
  // change so switching joints always returns to the clinician view.
  const [patientMode, setPatientMode] = useState(false);
  useEffect(() => setPatientMode(false), [region]);

  if (!hasDrivable) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-base font-semibold text-slate-200">
            El laboratorio de movimiento aún no cubre esta región
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Ya están disponibles hombro, codo, cadera, rodilla, tobillo y
            columna. Empieza por el hombro para ver el rig en acción.
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
      <RigViewer />

      {/* PATIENT-MODE toggle. In the clinician view it's a discreet pill top-center;
          in patient mode it becomes the "Salir" button top-right (the right stack is
          hidden, so that corner is free). */}
      {patientMode ? (
        <button
          type="button"
          onClick={() => setPatientMode(false)}
          className="pointer-events-auto absolute top-4 right-4 z-40 rounded-lg border border-slate-600 bg-ink-950/85 px-3 py-2 text-sm font-medium text-slate-200 shadow-lg backdrop-blur transition-colors hover:bg-slate-800"
        >
          ✕ Salir del modo paciente
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPatientMode(true)}
          title="Vista simplificada para mostrar al paciente"
          // Top-LEFT on phones (the RhythmReadout there is hidden < sm, so the
          // corner is free) to avoid overlapping the top-right Tests pill;
          // top-center from sm up. Hidden on phones while a right sheet
          // (tests/neuro) is open so it never sits under that sheet's header.
          className={`pointer-events-auto absolute top-3 left-3 z-30 -translate-x-0 rounded-full border border-slate-700 bg-ink-950/80 px-4 py-1.5 text-xs font-medium text-slate-200 shadow-lg backdrop-blur transition-colors hover:bg-slate-800 sm:left-1/2 sm:-translate-x-1/2 ${
            rightPanel !== 'none' ? 'hidden sm:block' : ''
          }`}
        >
          👤 Modo paciente
        </button>
      )}

      {/* Clinical readout (sector goniometer + humero-escapulo-raquideo rhythm +
          protagonist muscle), floated TOP-LEFT in the margin so it never covers
          the model. Fully drag-through (pointer-events-none), renders nothing in
          the rest pose, and reads the same rigChannel the controller drives so it
          never drifts from the glow. Hidden in patient mode. */}
      {!patientMode && (
        <div className="pointer-events-none absolute top-3 left-3 z-20 hidden sm:block">
          <RhythmReadout region={region} />
        </div>
      )}

      {/* The movement controller. Same instance/state in both modes (so toggling
          keeps the current pose); only the wrapper placement changes -- compact
          bottom-left for the clinician, big and centered for the patient. */}
      <div
        className={
          patientMode
            ? 'pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4'
            : 'pointer-events-none absolute bottom-3 left-3 z-20'
        }
      >
        <MovementControls key={region ?? 'shoulder'} region={region} patientMode={patientMode} />
      </div>

      {/* Clinician-only overlays: click-to-dissect card + the right-side stack
          (tests / neuro / layer peel). All hidden in patient mode. */}
      {!patientMode && (
        <>
          {/* Raised on phones so the dissection card clears the collapsed
              controls bar at the bottom and stays visible. */}
          <div className="pointer-events-none absolute bottom-24 left-1/2 z-30 -translate-x-1/2 sm:bottom-3">
            <DissectionPanel />
          </div>
          <div className="pointer-events-none absolute top-4 right-4 bottom-4 z-20 flex flex-col items-end gap-3">
            {rightPanel !== 'neuro' && (
              <OrthopedicTestsPanel
                key={`tests-${region ?? 'shoulder'}`}
                region={region}
                open={rightPanel === 'tests'}
                onOpenChange={(o) => setRightPanel(o ? 'tests' : 'none')}
                onOpenEvidence={onOpenEvidence}
              />
            )}
            {rightPanel !== 'tests' && hasNeuro(region) && (
              <NeuroPanel
                key={`neuro-${region ?? 'shoulder'}`}
                region={region}
                open={rightPanel === 'neuro'}
                onOpenChange={(o) => setRightPanel(o ? 'neuro' : 'none')}
              />
            )}
            {showLayers && <LayerControls />}
          </div>
        </>
      )}
    </div>
  );
}
