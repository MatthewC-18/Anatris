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

import { useEffect, useMemo, useState } from 'react';
import { RigViewer } from './RigViewer';
import {
  MobileLabSheet,
  type LabTab,
  type LabTabDef,
  type SheetDetent,
} from './MobileLabSheet';
import { useIsCompact } from '../../hooks/useIsCompact';
import { MovementControls } from './MovementControls';
import { RhythmReadout } from './RhythmReadout';
import { LayerControls } from './LayerControls';
import { DissectionPanel } from './DissectionPanel';
import { dissectChannel } from './dissectChannel';
import { demoChannel } from './demoChannel';
import { cameraChannel } from './cameraChannel';
import { LabViewBar } from './LabViewBar';
import { RecruitmentBand } from './RecruitmentBand';
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
import { CloseIcon, PersonIcon } from '../ui/Icons';

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
  // unmounts, so a new joint always opens with the full model. Releasing the
  // demo arbiter here too means a test/myotome demo can never survive a region
  // change and keep animating the rig behind the new region's console.
  //
  // The camera goes back to defaults with them: a user who pulled out to
  // "Cuerpo entero" to look at the trunk should not arrive at the knee still
  // zoomed out, and a pending view request must never cross a region boundary.
  useEffect(() => {
    dissectChannel.reset();
    demoChannel.stop();
    cameraChannel.reset();
    return () => {
      dissectChannel.reset();
      demoChannel.stop();
      cameraChannel.reset();
    };
  }, [region]);

  // PATIENT MODE: a clean, full-screen view (big 3D + one plain-language bar) the
  // physio turns toward the patient. Hides every clinical overlay. Reset on region
  // change so switching joints always returns to the clinician view.
  const [patientMode, setPatientMode] = useState(false);
  useEffect(() => setPatientMode(false), [region]);

  // ---------------------------------------------------------------------------
  // COMPACT LAYOUT
  // ---------------------------------------------------------------------------
  // Below lg the floating-instrument layout is abandoned entirely rather than
  // shrunk: see the note at the top of MobileLabSheet for why a 21.5rem column
  // and a right-hand stack cannot share 390px with the body they annotate.
  const compact = useIsCompact();
  const [sheetTab, setSheetTab] = useState<LabTab>('movimiento');
  const [detent, setDetent] = useState<SheetDetent>('peek');
  useEffect(() => setSheetTab('movimiento'), [region]);

  const sheetTabs = useMemo<LabTabDef[]>(() => {
    const tabs: LabTabDef[] = [
      {
        id: 'movimiento',
        label: 'Movimiento',
        render: () => (
          <MovementControls
            key={region ?? 'shoulder'}
            region={region}
            embedded
            inSheet
          />
        ),
      },
      { id: 'capas', label: 'Capas', render: () => <LayerControls embedded /> },
      {
        id: 'tests',
        label: 'Tests',
        locked: !testsGate.unlocked,
        onLocked: testsGate.requestUpgrade,
        render: () => (
          <OrthopedicTestsPanel
            key={`tests-${region ?? 'shoulder'}`}
            region={region}
            open
            bare
            onOpenChange={() => {}}
            onOpenEvidence={onOpenEvidence}
          />
        ),
      },
    ];
    if (hasNeuro(region)) {
      tabs.push({
        id: 'neuro',
        label: 'Neuro',
        locked: !neuroGate.unlocked,
        onLocked: neuroGate.requestUpgrade,
        render: () => (
          <NeuroPanel
            key={`neuro-${region ?? 'shoulder'}`}
            region={region}
            open
            bare
            onOpenChange={() => {}}
          />
        ),
      });
    }
    return tabs;
  }, [region, onOpenEvidence, testsGate, neuroGate]);

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

  // COMPACT, CLINICIAN VIEW: two rows. The scene owns a real rectangle and the
  // sheet owns everything else, so nothing is drawn on top of the body except
  // the dissection card (which is about the thing under it).
  if (compact && !patientMode) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="relative min-h-0 flex-1">
          {/* `refitKey` re-frames the model whenever the sheet resizes the
              canvas; without it the body keeps the framing it had when the
              sheet was a different height and the limb swings out of view. */}
          <RigViewer refitKey={detent} />
          {patientGate.unlocked ? (
            <button
              type="button"
              onClick={() => setPatientMode(true)}
              title="Vista simplificada para mostrar al paciente"
              className="pointer-events-auto absolute top-3 right-3 z-30 flex min-h-[36px] items-center gap-2 rounded-full border border-slate-700/80 bg-ink-950/85 px-3.5 text-xs font-medium text-slate-200 shadow-lg backdrop-blur"
            >
              <PersonIcon size={13} />
              Paciente
            </button>
          ) : (
            <button
              type="button"
              onClick={patientGate.requestUpgrade}
              title="Modo paciente: vista simplificada a pantalla completa (Premium)"
              className="pointer-events-auto absolute top-3 right-3 z-30 flex min-h-[36px] items-center gap-2 rounded-full border border-amber-500/30 bg-ink-950/85 px-3.5 text-xs font-medium text-amber-200 shadow-lg backdrop-blur"
            >
              <PersonIcon size={13} />
              Paciente
              <LockGlyph />
            </button>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-3">
            <DissectionPanel />
          </div>
        </div>

        <MobileLabSheet
          tabs={sheetTabs}
          active={sheetTab}
          onActiveChange={setSheetTab}
          detent={detent}
          onDetentChange={setDetent}
        />
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
          className="instrument pointer-events-auto absolute top-4 right-4 z-40 flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:text-white"
        >
          <CloseIcon size={14} />
          Salir del modo paciente
        </button>
      ) : !patientGate.unlocked ? (
        // Locked: the pill stays VISIBLE with a lock so the free user sees the
        // capability exists; clicking it goes straight to pricing.
        <button
          type="button"
          onClick={patientGate.requestUpgrade}
          title="Modo paciente: vista simplificada a pantalla completa (Premium)"
          className={`pointer-events-auto absolute top-3 left-3 z-30 flex items-center gap-2 rounded-full border border-amber-500/30 bg-ink-950/85 px-4 py-1.5 text-xs font-medium text-amber-200 shadow-lg backdrop-blur transition-colors hover:bg-amber-400/10 sm:left-1/2 sm:-translate-x-1/2 ${
            rightPanel !== 'none' ? 'hidden sm:flex' : ''
          }`}
        >
          <PersonIcon size={13} />
          Modo paciente
          <LockGlyph />
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
          className={`pointer-events-auto absolute top-3 left-3 z-30 flex -translate-x-0 items-center gap-2 rounded-full border border-slate-700/80 bg-ink-950/85 px-4 py-1.5 text-xs font-medium text-slate-200 shadow-lg backdrop-blur transition-colors hover:border-slate-600 hover:text-white sm:left-1/2 sm:-translate-x-1/2 ${
            rightPanel !== 'none' ? 'hidden sm:flex' : ''
          }`}
        >
          <PersonIcon size={13} />
          Modo paciente
        </button>
      )}

      {/* LEFT COLUMN — ONE instrument, two sections. The clinical readout (sector
          goniometer + rhythm + protagonist muscle) is the top section and the
          movement console the bottom one, divided by a hairline.

          They used to be two separate frosted cards stacked with a gap, which
          broke the design system's one-surface-per-corner rule and, worse,
          printed the same facts twice: the gesture appeared in both headers AND
          in the sector label, the angle in both the dial and the console header,
          the arc range in both the sector card and the console. Between the
          duplicates and the double chrome the column filled ~80% of a laptop
          screen and stopped being readable. One surface, one identity, each fact
          once.

          The readout stays drag-through (pointer-events-none) so the model can
          still be rotated over it; only the console takes the pointer. Below
          `sm` the readout is hidden and the console carries its own header.

          Patient mode replaces the whole column with the big centered bar. */}
      {patientMode ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
          <MovementControls key={region ?? 'shoulder'} region={region} patientMode />
        </div>
      ) : (
        <div className="pointer-events-none absolute top-3 bottom-3 left-3 z-20 flex w-[21.5rem] max-w-[calc(100vw-1.5rem)] flex-col justify-end">
          <div className="instrument pointer-events-none flex min-h-0 flex-col overflow-hidden animate-scale-in">
            <div className="hidden min-h-0 flex-1 overflow-hidden sm:flex sm:flex-col">
              <RhythmReadout region={region} embedded />
            </div>
            <div className="hairline hidden shrink-0 sm:block" />
            <div className="shrink-0">
              <MovementControls key={region ?? 'shoulder'} region={region} embedded />
            </div>
          </div>
        </div>
      )}

      {/* Clinician-only overlays: click-to-dissect card + the right-side stack
          (tests / neuro / layer peel). All hidden in patient mode. */}
      {!patientMode && (
        <>
          {/* Raised on phones so the dissection card clears the collapsed
              controls bar at the bottom and stays visible. From `lg` it also has
              to clear the bottom strip — by the view bar's height normally, and
              by the whole band's when the viewport is tall enough to show it
              (same breakpoint as the band itself, below). */}
          <div className="pointer-events-none absolute bottom-24 left-1/2 z-30 -translate-x-1/2 sm:bottom-3 lg:bottom-[4.5rem] lg:[@media(min-height:820px)]:bottom-[13rem]">
            <DissectionPanel />
          </div>

          {/* THE BOTTOM STRIP — the dead space, put to work.
              It starts where the console ends and runs to the right edge, so it
              occupies exactly the band of stage that was empty at every width
              (see the measurements in RecruitmentBand / labFraming). It yields to
              a right-hand sheet when one is open, because that sheet takes the
              full column height and the strip would otherwise slide under it.
              `lg` only: below that the compact layout owns the bottom with its
              sheet, and this would be fighting for the same pixels. */}
          <div
            className={`pointer-events-none absolute bottom-3 left-[22.5rem] z-20 hidden items-end justify-end gap-3 lg:flex ${
              rightPanel === 'none' ? 'right-3' : 'right-[23.5rem]'
            }`}
          >
            {/* The band needs vertical room the view bar does not. On a 1280x720
                laptop it ate 190px of a 640px stage and squeezed the model back
                down to the size this whole change set out to fix, so below
                ~820px of viewport it stands down and the camera controls — the
                part you cannot work without — keep the corner to themselves. */}
            <div className="hidden min-w-0 flex-1 [@media(min-height:820px)]:block">
              <RecruitmentBand region={region} />
            </div>
            <LabViewBar />
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
        className="instrument pointer-events-auto flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-200 transition-colors hover:text-amber-100"
      >
        {icon}
        {label}
        <LockGlyph />
      </button>
    );
  }

  return (
    <div className="instrument pointer-events-auto w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-slate-50">
          {icon}
          {label}
        </h2>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar"
          className="-mr-1 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100/[0.06] hover:text-slate-200"
        >
          <CloseIcon size={15} />
        </button>
      </div>
      <div className="hairline" />
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
