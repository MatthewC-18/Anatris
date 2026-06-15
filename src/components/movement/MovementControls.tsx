// src/components/movement/MovementControls.tsx
//
// Productized control panel for the shoulder movement lab. It drives the
// in-canvas rig through shoulderRigChannel (rigid bone rotation) AND, crucially,
// reads the live angle against the existing ROM phase data to show — in sync —
// which phase of the abduction arc the arm is in and which muscles are working,
// by role. That synced "see the muscles change through the range" readout is
// the clinical payload that sets this apart from a plain animation.

import { useEffect, useState } from 'react';
import {
  shoulderRigChannel,
  type RigState,
} from '../ShoulderRotationPrototype';
import { SHOULDER_ROM } from '../../data/shoulderRom';
import { ROM_ROLE_LABEL, type RomMuscleRole } from '../../types/rom';
import { phaseAtAngle, muscleNameById } from '../../lib/romPhaseAtAngle';

// The rig only rotates the humerus (no scapular upward rotation), so the honest
// glenohumeral ceiling is ~120 deg; beyond that elevation needs the scapula.
const MAX_ANGLE = 120;

const ABDUCTION = SHOULDER_ROM['glenohumeral-abduction'];

/** Tailwind classes per muscle role (amber / sky / violet, matching the app). */
const ROLE_STYLE: Record<RomMuscleRole, string> = {
  'prime-mover': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  assistant: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  stabilizer: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

export function MovementControls() {
  const initial = shoulderRigChannel.get();
  const [angle, setAngle] = useState<number>(initial.angleDeg);
  const [showMarkers, setShowMarkers] = useState<boolean>(initial.showMarkers);
  const [frameCamera, setFrameCamera] = useState<boolean>(initial.frameCamera);

  // Push UI state to the rig channel.
  useEffect(() => {
    const patch: Partial<RigState> = {
      angleDeg: angle,
      showMarkers,
      frameCamera,
    };
    shoulderRigChannel.set(patch);
  }, [angle, showMarkers, frameCamera]);

  // Return the arm to rest when leaving the lab so re-entry starts clean.
  useEffect(() => {
    return () => shoulderRigChannel.set({ angleDeg: 0 });
  }, []);

  const at = ABDUCTION ? phaseAtAngle(ABDUCTION, angle) : null;
  const beyondRig = angle >= MAX_ANGLE;

  return (
    <div className="pointer-events-auto w-[20rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-800/70 bg-ink-950/90 p-4 shadow-2xl backdrop-blur">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-slate-50">
          Abducción de hombro
        </h2>
        <span className="font-mono text-xs text-slate-500">{ABDUCTION?.plane}</span>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        Mueve el brazo derecho: los músculos activos se muestran como bandas que
        se acortan y engrosan al contraerse, coloreadas por su rol en cada tramo.
      </p>

      {/* Angle slider */}
      <div className="mb-1 flex items-baseline justify-between">
        <label htmlFor="abduction-angle" className="text-xs font-medium text-slate-400">
          Ángulo
        </label>
        <span className="font-display text-lg font-bold text-slate-100">
          {angle}°
        </span>
      </div>
      <input
        id="abduction-angle"
        type="range"
        min={0}
        max={MAX_ANGLE}
        step={1}
        value={angle}
        onChange={(e) => setAngle(Number(e.target.value))}
        className="w-full accent-accent"
      />

      {/* Live phase readout */}
      {at && (
        <div className="mt-3 rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">
              Fase {at.index + 1} / {at.total} · {at.phase.label}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              {at.phase.startDeg}–{at.phase.endDeg}°
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
            {at.phase.description}
          </p>

          <div className="mt-3 flex flex-col gap-1.5">
            {at.phase.muscles.map((m) => (
              <div key={m.muscleId} className="flex items-center gap-2">
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_STYLE[m.role]}`}
                >
                  {ROM_ROLE_LABEL[m.role]}
                </span>
                <span className="truncate text-xs text-slate-200">
                  {muscleNameById('shoulder', m.muscleId)}
                </span>
              </div>
            ))}
          </div>

          {beyondRig && (
            <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] leading-relaxed text-amber-200/90">
              Por encima de {MAX_ANGLE}° la elevación depende de la rotación
              superior de la escápula (ritmo escapulohumeral), que este modelo
              rígido aún no representa.
            </p>
          )}
        </div>
      )}

      {/* Options */}
      <div className="mt-3 flex flex-col gap-2">
        <Toggle label="Marcadores biomecánicos" checked={showMarkers} onChange={setShowMarkers} />
        <Toggle label="Encuadrar el hombro" checked={frameCamera} onChange={setFrameCamera} />
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-accent"
      />
      {label}
    </label>
  );
}
