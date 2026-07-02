// src/components/movement/MovementControls.tsx
//
// Region-aware PREMIUM control panel for the movement lab. It drives the skinned
// rig (RigModel, via rigChannel) by clinical movementId + side + SIGNED angle,
// and reads the SAME live angle against the ROM phase data to show -- in sync --
// which phase of the arc the joint is in and which muscles work, by role. That
// synced "see the muscles change through the range" readout is the clinical
// payload that sets this apart from a plain animation.
//
// BIDIRECTIONAL: when a movement carries a labReverse arc (shoulder), the slider
// spans a SIGNED range through 0 (neutral marked) and STARTS at the opposite
// anatomical extreme -- a flexion begins in extension and sweeps to full flexion.
// Playback (rAF) sweeps the arc min<->max with speed / loop / return-to-neutral,
// and honors prefers-reduced-motion.
//
// It also feeds RigOverlays the active muscles (with role) so their REAL rig
// meshes glow in the scene, and toggles the rotation-axis marker.
//
// Mounted with key={region} by MovementView, so its initial state is derived
// straight from the active region with no cross-region staleness.
//
// UI strings Spanish LATAM; code/ids ASCII; no `any`.

import { useEffect, useMemo, useRef, useState } from 'react';
import { rigChannel, type RigHighlight } from './RigModel';
import { romForRegion } from '../../data/romByRegion';
import { getBoneControl, isDrivable, type Side } from '../../lib/boneMap';
import { ROM_ROLE_LABEL, type RomMuscleRole, type RomMovement } from '../../types/rom';
import {
  buildLabArc,
  phaseAtAngleIn,
  muscleNameById,
} from '../../lib/romPhaseAtAngle';

/** Tailwind classes per muscle role (amber / sky / violet, matching the app). */
const ROLE_STYLE: Record<RomMuscleRole, string> = {
  'prime-mover': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  assistant: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  stabilizer: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};
/** Solid dot color per role, for the always-on legend swatches. */
const ROLE_DOT: Record<RomMuscleRole, string> = {
  'prime-mover': 'bg-amber-400',
  assistant: 'bg-sky-400',
  stabilizer: 'bg-violet-400',
};

const SIDE_LABEL: Record<Side, string> = { R: 'Derecho', L: 'Izquierdo' };

/** Playback speeds in degrees/second. */
const SPEEDS = [
  { id: 'slow', label: 'Lento', dps: 40 },
  { id: 'normal', label: 'Normal', dps: 80 },
  { id: 'fast', label: 'Rápido', dps: 140 },
] as const;

/** Live subscription to prefers-reduced-motion. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

/** Always-visible, keyboard-focusable role legend (AA contrast). */
function RoleLegend() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1" aria-label="Leyenda de roles musculares">
      {(Object.keys(ROLE_DOT) as RomMuscleRole[]).map((role) => (
        <li
          key={role}
          tabIndex={0}
          aria-label={ROM_ROLE_LABEL[role]}
          className="flex items-center gap-1.5 rounded px-0.5 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <span className={`h-2 w-2 rounded-full ${ROLE_DOT[role]}`} aria-hidden="true" />
          {ROM_ROLE_LABEL[role]}
        </li>
      ))}
    </ul>
  );
}

interface MovementControlsProps {
  region: string | null;
}

export function MovementControls({ region }: MovementControlsProps) {
  const movements = useMemo(() => romForRegion(region), [region]);
  const reducedMotion = usePrefersReducedMotion();

  const [movementId, setMovementId] = useState<string>(() => {
    const drivable = movements.find((m) => isDrivable(m.id));
    return (drivable ?? movements[0])?.id ?? '';
  });
  const [side, setSide] = useState<Side>('R');
  const [angle, setAngle] = useState<number>(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [showMarkers, setShowMarkers] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState<RigHighlight | null>(null);

  const movement: RomMovement | null =
    movements.find((m) => m.id === movementId) ?? null;
  const control = movementId ? getBoneControl(movementId) : undefined;
  const drivable = control != null && control.kind !== 'unsupported';
  const isSpine = control?.kind === 'spine';
  const muscleRegion = movement?.region ?? region ?? 'shoulder';

  // The continuous signed arc this movement sweeps in the lab.
  const arc = useMemo(() => (movement ? buildLabArc(movement) : null), [movement]);
  const at = arc ? phaseAtAngleIn(arc.phases, angle) : null;

  // Reset the angle to the gesture's anatomical START whenever the movement
  // changes, and stop any playback.
  useEffect(() => {
    setPlaying(false);
    setAngle(arc ? arc.startDeg : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementId]);

  // --- Push the live state to the rig (drive + scene highlight + markers).
  useEffect(() => {
    if (!drivable || !arc) {
      rigChannel.set({ movementId: null, angleDeg: 0, highlight: [], showMarkers });
      return;
    }
    const phase = phaseAtAngleIn(arc.phases, angle);
    const highlight: RigHighlight[] = hovered
      ? [hovered]
      : (phase?.phase.muscles ?? []).map((m) => ({
          muscleId: m.muscleId,
          role: m.role,
        }));
    rigChannel.set({ movementId, side, angleDeg: angle, highlight, showMarkers });
  }, [movementId, side, angle, drivable, arc, showMarkers, hovered]);

  // Return to rest when leaving the lab so re-entry starts clean.
  useEffect(() => {
    return () => rigChannel.set({ movementId: null, angleDeg: 0, highlight: [] });
  }, []);

  // --- Playback loop (requestAnimationFrame). Sweeps min<->max; loops or stops
  // after one bounce; honored only when reduced motion is OFF.
  const rafRef = useRef<number>(0);
  const dirRef = useRef<1 | -1>(1);
  const lastTsRef = useRef<number>(0);
  useEffect(() => {
    if (!playing || !arc || reducedMotion) return;
    const { min, max } = arc;
    const dps = SPEEDS[speedIdx].dps;
    lastTsRef.current = 0;
    const tick = (ts: number) => {
      if (lastTsRef.current === 0) lastTsRef.current = ts;
      const dt = Math.min(0.05, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      setAngle((prev) => {
        let next = prev + dirRef.current * dps * dt;
        if (next >= max) {
          next = max;
          dirRef.current = -1;
        } else if (next <= min) {
          next = min;
          if (loop) {
            dirRef.current = 1;
          } else {
            // one full bounce done -> stop at the start extreme
            window.cancelAnimationFrame(rafRef.current);
            setPlaying(false);
            return min;
          }
        }
        return next;
      });
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafRef.current);
  }, [playing, arc, speedIdx, loop, reducedMotion]);

  const togglePlay = () => {
    if (!arc) return;
    if (reducedMotion) {
      // No continuous motion: jump to the opposite extreme.
      setAngle((prev) => (prev <= (arc.min + arc.max) / 2 ? arc.max : arc.min));
      return;
    }
    // When (re)starting from an extreme, sweep inward correctly.
    if (!playing) {
      dirRef.current = angle <= arc.min + 0.5 ? 1 : angle >= arc.max - 0.5 ? -1 : dirRef.current;
    }
    setPlaying((p) => !p);
  };

  const returnToNeutral = () => {
    setPlaying(false);
    setAngle(0);
  };

  // Arc geometry for the progress bar (percent along min..max).
  const pct = (v: number): number => {
    if (!arc || arc.max === arc.min) return 0;
    return ((v - arc.min) / (arc.max - arc.min)) * 100;
  };

  const displayAngle = Math.round(angle);
  const gestureName =
    arc && angle < 0 && movement?.labReverse ? movement.labReverse.name : movement?.name;

  return (
    <div className="pointer-events-auto w-[21rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-800/70 bg-ink-950/90 shadow-2xl backdrop-blur">
      {/* Header / goniometer */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <h2 className="font-display text-sm font-bold text-slate-50">
            Laboratorio de movimiento
          </h2>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {gestureName ?? 'Selecciona un movimiento'}
            {movement?.plane ? ` · plano ${movement.plane.toLowerCase()}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {drivable && (
            <div className="text-right leading-none">
              <div className="font-display text-2xl font-bold tabular-nums text-slate-100">
                {displayAngle}
                <span className="text-base text-slate-400">°</span>
              </div>
              {at && (
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
                  Fase {at.index + 1}/{at.total}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expandir panel' : 'Colapsar panel'}
            aria-expanded={!collapsed}
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-800 lg:hidden"
          >
            {collapsed ? '▸' : '▾'}
          </button>
        </div>
      </div>

      {/* Body (collapsible on mobile so it never covers the gesture) */}
      <div className={`${collapsed ? 'hidden' : 'block'} px-4 pb-4`}>
        {/* Movement selector */}
        <label className="text-xs font-medium text-slate-400" htmlFor="mov-select">
          Movimiento
        </label>
        <select
          id="mov-select"
          value={movementId}
          onChange={(e) => setMovementId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:border-accent focus:outline-none"
        >
          {movements.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
              {m.labReverse ? ` / ${m.labReverse.name}` : ''}
              {!isDrivable(m.id) ? ' (no disponible)' : ''}
            </option>
          ))}
        </select>

        {/* Side toggle (paired limbs only) + markers toggle */}
        {drivable && (
          <div className="mt-3 flex items-center justify-between gap-2">
            {!isSpine ? (
              <div>
                <span className="text-xs font-medium text-slate-400">Lado</span>
                <div className="mt-1 inline-flex overflow-hidden rounded-lg border border-slate-700">
                  {(['R', 'L'] as Side[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSide(s)}
                      className={`px-3 py-1 text-xs font-medium transition-colors ${
                        side === s
                          ? 'bg-accent/20 text-accent'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {SIDE_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <span />
            )}
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={showMarkers}
                onChange={(e) => setShowMarkers(e.target.checked)}
                className="accent-accent"
              />
              Eje de rotación
            </label>
          </div>
        )}

        {/* Unsupported movement notice */}
        {control?.kind === 'unsupported' && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] leading-relaxed text-amber-200/90">
            {control.reason}
          </p>
        )}

        {/* Slider + goniometer arc */}
        {drivable && arc && (
          <>
            <div className="mt-3 mb-1 flex items-baseline justify-between">
              <span className="text-xs font-medium text-slate-400">
                Recorrido {arc.bidirectional ? '(rango firmado)' : ''}
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {arc.min}° … {arc.max}°
              </span>
            </div>

            {/* Arc progress bar: phase-boundary ticks + neutral (0) marker. */}
            <div className="relative mb-1 h-2 w-full rounded-full bg-slate-800">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent/60"
                style={{ width: `${pct(angle)}%` }}
              />
              {/* Phase boundary ticks */}
              {arc.phases.map((p) => (
                <span
                  key={`b-${p.endDeg}`}
                  className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-slate-600"
                  style={{ left: `${pct(p.endDeg)}%` }}
                  aria-hidden="true"
                />
              ))}
              {/* Neutral (0) marker */}
              {arc.min < 0 && arc.max > 0 && (
                <span
                  className="absolute -top-1 bottom-[-0.35rem] w-px bg-emerald-400/80"
                  style={{ left: `${pct(0)}%` }}
                  aria-hidden="true"
                />
              )}
              {/* Thumb */}
              <span
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-ink-950 shadow"
                style={{ left: `${pct(angle)}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="mb-1 flex justify-between text-[10px] text-slate-500">
              <span>{arc.min}°</span>
              {arc.min < 0 && arc.max > 0 && <span className="text-emerald-400/90">0° neutra</span>}
              <span>{arc.max}°</span>
            </div>

            <input
              id="mov-angle"
              type="range"
              min={arc.min}
              max={arc.max}
              step={1}
              value={Math.round(angle)}
              onChange={(e) => {
                setPlaying(false);
                setAngle(Number(e.target.value));
              }}
              aria-label="Ángulo del movimiento"
              className="w-full accent-accent"
            />

            {/* Playback controls */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/30"
              >
                {reducedMotion ? 'Alternar extremo' : playing ? '⏸ Pausar' : '▶ Reproducir'}
              </button>
              <button
                type="button"
                onClick={returnToNeutral}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-slate-800"
              >
                Volver a neutra
              </button>
              {!reducedMotion && (
                <>
                  <label className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={loop}
                      onChange={(e) => setLoop(e.target.checked)}
                      className="accent-accent"
                    />
                    Bucle
                  </label>
                  <select
                    value={speedIdx}
                    onChange={(e) => setSpeedIdx(Number(e.target.value))}
                    aria-label="Velocidad de reproducción"
                    className="rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 focus:border-accent focus:outline-none"
                  >
                    {SPEEDS.map((s, i) => (
                      <option key={s.id} value={i}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            {reducedMotion && (
              <p className="mt-1 text-[10px] text-slate-500">
                Animación reducida por preferencia del sistema.
              </p>
            )}
          </>
        )}

        {/* Live phase readout (premium, synced, with notes + hover highlight) */}
        {drivable && at && (
          <div className="mt-3 rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                {at.phase.label}
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
                <button
                  type="button"
                  key={m.muscleId}
                  onMouseEnter={() => setHovered({ muscleId: m.muscleId, role: m.role })}
                  onFocus={() => setHovered({ muscleId: m.muscleId, role: m.role })}
                  onMouseLeave={() => setHovered(null)}
                  onBlur={() => setHovered(null)}
                  className="flex items-start gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-slate-800/60 focus:bg-slate-800/60 focus:outline-none"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_STYLE[m.role]}`}
                  >
                    {ROM_ROLE_LABEL[m.role]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-slate-200">
                      {muscleNameById(muscleRegion, m.muscleId)}
                    </span>
                    {m.note && (
                      <span className="block text-[11px] leading-snug text-slate-500">
                        {m.note}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>

            <RoleLegend />
          </div>
        )}
      </div>
    </div>
  );
}
