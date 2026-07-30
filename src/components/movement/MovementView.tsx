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
import {
  LockGlyph,
  PremiumTeaser,
  useFeatureGate,
} from '../account/PremiumGate';
import type { PremiumFeature } from '../../auth/entitlements';
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

  // Capability gates. These are premium in EVERY region, including the free
  // shoulder: they are what a physio uses in front of a patient, which is what
  // they actually pay for. See src/auth/entitlements.ts.
  const testsGate = useFeatureGate('orthopedic-tests');
  const neuroGate = useFeatureGate('neuro');
  const patientGate = useFeatureGate('patient-mode');

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
      ) : !patientGate.unlocked ? (
        // Locked: the pill stays VISIBLE with a lock so the free user sees the
        // capability exists; clicking it goes straight to pricing.
        <button
          type="button"
          onClick={patientGate.requestUpgrade}
          title="Modo paciente: vista simplificada a pantalla completa (Premium)"
          className={`pointer-events-auto absolute top-3 left-3 z-30 flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-ink-950/80 px-4 py-1.5 text-xs font-medium text-amber-200 shadow-lg backdrop-blur transition-colors hover:bg-amber-400/10 sm:left-1/2 sm:-translate-x-1/2 ${
            rightPanel !== 'none' ? 'hidden sm:flex' : ''
          }`}
        >
          <LockGlyph />
          Modo paciente
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
            {rightPanel !== 'neuro' &&
              (testsGate.unlocked ? (
                <OrthopedicTestsPanel
                  key={`tests-${region ?? 'shoulder'}`}
                  region={region}
                  open={rightPanel === 'tests'}
                  onOpenChange={(o) => setRightPanel(o ? 'tests' : 'none')}
                  onOpenEvidence={onOpenEvidence}
                />
              ) : (
                <LockedSheet
                  feature="orthopedic-tests"
                  label="Tests ortopédicos"
                  icon={<TestTubeGlyph />}
                  open={rightPanel === 'tests'}
                  onOpenChange={(o) => setRightPanel(o ? 'tests' : 'none')}
                  lines={[
                    'Sensibilidad, especificidad y razones de verosimilitud con su estudio de origen.',
                    'Demostración del test en el modelo 3D y nomograma de Fagan.',
                    'Clusters diagnósticos y modo examen para autoevaluarte.',
                  ]}
                />
              ))}
            {rightPanel !== 'tests' &&
              hasNeuro(region) &&
              (neuroGate.unlocked ? (
                <NeuroPanel
                  key={`neuro-${region ?? 'shoulder'}`}
                  region={region}
                  open={rightPanel === 'neuro'}
                  onOpenChange={(o) => setRightPanel(o ? 'neuro' : 'none')}
                />
              ) : (
                <LockedSheet
                  feature="neuro"
                  label="Neuro: dermatomas y miotomas"
                  icon={<NerveGlyph />}
                  open={rightPanel === 'neuro'}
                  onOpenChange={(o) => setRightPanel(o ? 'neuro' : 'none')}
                  lines={[
                    'Dermatoma, miotoma y reflejo de cada raíz nerviosa.',
                    'El miotoma demostrado sobre el rig, raíz por raíz.',
                    'Mapa esquemático de dermatomas para el examen neurológico.',
                  ]}
                />
              ))}
            {showLayers && <LayerControls />}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * LockedSheet
 * ---------------------------------------------------------------------------
 * Stands in for a premium right-side panel. Deliberately mirrors the real
 * panel's collapsed pill (same position, same shape, same slot in the stack) so
 * the free user sees the tool EXISTS and where it lives — then expands into a
 * teaser that says what it does. Hiding it instead would make the free app look
 * complete, which is exactly why nobody upgraded.
 * ------------------------------------------------------------------------ */
function LockedSheet({
  feature,
  label,
  icon,
  lines,
  open,
  onOpenChange,
}: {
  feature: PremiumFeature;
  label: string;
  icon: React.ReactNode;
  lines: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-500/30 bg-ink-950/90 px-3 py-2 text-xs font-semibold text-amber-200 shadow-2xl backdrop-blur transition-colors hover:bg-amber-400/10"
      >
        {icon}
        {label}
        <LockGlyph />
      </button>
    );
  }

  return (
    <div className="pointer-events-auto w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-800/70 bg-ink-950/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 px-4 py-3">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-slate-50">
          {icon}
          {label}
        </h2>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar"
          className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800/60 hover:text-slate-200"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="p-3">
        <PremiumTeaser feature={feature} title={label} lines={lines} compact />
      </div>
    </div>
  );
}

function TestTubeGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M9 3h6M10 3v13a2 2 0 0 0 4 0V3" strokeLinecap="round" />
      <path d="M10 12h4" strokeLinecap="round" />
    </svg>
  );
}

function NerveGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 4c4 0 3 8 7 8s3-8 7-8" strokeLinecap="round" />
      <path d="M5 20c4 0 3-8 7-8" strokeLinecap="round" />
    </svg>
  );
}
