// src/components/movement/MovementControls.tsx
//
// Compact CONTROLLER for the movement lab (bottom-left). It drives the skinned
// rig (RigModel, via rigChannel) by clinical movementId + side + SIGNED angle and
// owns playback; the live clinical READOUT (goniometer sectors, humero-escapulo-
// raquideo rhythm, protagonist muscle) lives in RhythmReadout (top-left), a
// read-only twin fed by the SAME rigChannel. Keeping the readout OUT of this
// panel is what stopped the old floating card from covering the model.
//
// This panel still computes the live per-muscle recruitment (activeMusclesAt) and
// pushes it as the scene highlight so the real rig meshes glow as the arc sweeps;
// it just no longer renders the muscle list itself.
//
// BIDIRECTIONAL: when a movement carries a labReverse arc (shoulder), the slider
// spans a SIGNED range through 0 (neutral marked) and STARTS at the opposite
// anatomical extreme. Playback (rAF) sweeps min<->max with speed / loop, honors
// prefers-reduced-motion.
//
// Mounted with key={region} by MovementView, so its initial state is derived
// straight from the active region with no cross-region staleness.
//
// UI strings Spanish LATAM; code/ids ASCII; no `any`.

import { useEffect, useMemo, useRef, useState } from 'react';
import { rigChannel, type RigHighlight } from './RigModel';
import { romForRegion } from '../../data/romByRegion';
import { getBoneControl, isDrivable, type Side } from '../../lib/boneMap';
import type { RomMovement } from '../../types/rom';
import { buildLabArc, phaseAtAngleIn } from '../../lib/romPhaseAtAngle';
import { activeMusclesAt, type ActiveMuscle } from '../../lib/romActivation';
import { pathologiesForMovement, pathologyById } from '../../data/pathologies';
import { musclesForRomLookup } from '../../data/musclesByRegion';
import { REGIONS } from '../../data/regiones';
import { exportPatientCard, type PatientCardInfo } from '../../lib/patientExport';
import { patientInstruction } from '../../lib/patientPhrase';

const SIDE_LABEL: Record<Side, string> = { R: 'Derecho', L: 'Izquierdo' };

/** Playback speeds in degrees/second (clinical, unhurried pace). */
const SPEEDS = [
  { id: 'slow', label: 'Lento', dps: 12 },
  { id: 'normal', label: 'Normal', dps: 25 },
  { id: 'fast', label: 'Rápido', dps: 50 },
] as const;

/** Live subscription to prefers-reduced-motion. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
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

interface MovementControlsProps {
  region: string | null;
  /** When true, render the big, simplified PATIENT bar instead of the clinician
   *  panel (same underlying state, so toggling preserves the current pose). */
  patientMode?: boolean;
}

export function MovementControls({ region, patientMode = false }: MovementControlsProps) {
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
  // Manual-resistance mode: draw the therapist's hands + force arrow opposing the
  // gesture and load the agonists harder. See RigOverlays / the readout below.
  const [resistance, setResistance] = useState(false);
  // Start collapsed on phones so the model is visible; expanded on desktop.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 639px)').matches;
  });
  // P1: active pathological preset (null = Normal). Only the elevation chain
  // supports it; reset to Normal whenever the movement changes.
  const [pathologyId, setPathologyId] = useState<string | null>(null);

  const movement: RomMovement | null =
    movements.find((m) => m.id === movementId) ?? null;
  const control = movementId ? getBoneControl(movementId) : undefined;
  const drivable = control != null && control.kind !== 'unsupported';
  const isSpine = control?.kind === 'spine';
  const regionName = (region && REGIONS[region]?.name) || movement?.joint || '';

  /** Cycle to the previous / next movement of this region (patient-mode arrows). */
  const goToMovement = (dir: -1 | 1) => {
    if (movements.length === 0) return;
    const idx = movements.findIndex((m) => m.id === movementId);
    const base = idx < 0 ? 0 : idx;
    const next = movements[(base + dir + movements.length) % movements.length];
    if (next) setMovementId(next.id);
  };

  // The continuous signed arc this movement sweeps in the lab.
  const arc = useMemo(() => (movement ? buildLabArc(movement) : null), [movement]);

  // Pathology presets available for THIS movement (empty = none). A preset may cap
  // the reachable max (ROM loss) or raise the reachable min (extension lag), so the
  // slider + playback bound to [effMin, effMax] instead of the full arc.
  const pathologyOptions = useMemo(
    () => pathologiesForMovement(movementId),
    [movementId],
  );
  const supportsPathology = pathologyOptions.length > 0;
  const pathology = supportsPathology ? pathologyById(pathologyId) : null;
  const cap = pathology?.rangeCapDeg ?? null;
  const floor = pathology?.rangeFloorDeg ?? null;
  // Structures implicated by the active pathology, to emphasize in the scene.
  const implicated = useMemo(
    () => (supportsPathology ? pathologyById(pathologyId)?.implicated ?? [] : []),
    [supportsPathology, pathologyId],
  );
  const effMax = arc ? (cap != null ? Math.min(arc.max, cap) : arc.max) : 0;
  const effMin = arc ? (floor != null ? Math.max(arc.min, floor) : arc.min) : 0;

  // Live per-muscle recruitment at the current angle (premium activation model).
  // Falls back to the current phase's muscle list (level 1) for movements without
  // activation envelopes. Pushed to the rig as the scene highlight (auto glow).
  const liveMuscles: ActiveMuscle[] = useMemo(() => {
    if (!movement) return [];
    const active = activeMusclesAt(movement, angle);
    if (active.length > 0) return active;
    const phase = arc ? phaseAtAngleIn(arc.phases, angle) : null;
    return (phase?.phase.muscles ?? []).map((m) => ({
      muscleId: m.muscleId,
      role: m.role,
      level: 1,
      note: m.note,
    }));
  }, [movement, angle, arc]);

  // muscleId -> Spanish name, so the resistance readout can list which muscles the
  // therapist is loading (the glow shows WHERE; the readout says WHO + how).
  const muscleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of musclesForRomLookup(region)) map.set(m.id, m.name);
    return map;
  }, [region]);

  // Prime movers loaded under manual resistance, by name (deduped, max 3 shown).
  const resistedNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const m of liveMuscles) {
      if (m.role !== 'prime-mover') continue;
      const name = muscleNameById.get(m.muscleId);
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
    return names;
  }, [liveMuscles, muscleNameById]);

  // --- Patient export ("Exportar para paciente"): capture the current pose into a
  // clean, plain-language PNG handout the physio can print or send. Client-side. ---
  const [note, setNote] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const onExport = async () => {
    if (!movement) return;
    const prime =
      resistedNames.length > 0
        ? resistedNames
        : [
            ...new Set(
              liveMuscles.map((m) => muscleNameById.get(m.muscleId) ?? m.muscleId),
            ),
          ];
    const rng = movement.totalRangeDeg;
    const facts: PatientCardInfo['facts'] = [
      { label: 'Zona', value: regionName },
      {
        label: 'Movimiento',
        value: movement.plane
          ? `${movement.name} (plano ${movement.plane.toLowerCase()})`
          : movement.name,
      },
      { label: 'Lado', value: SIDE_LABEL[side] },
      {
        label: 'Rango objetivo',
        value: `${Math.round(rng.min)}–${Math.round(rng.max)}°`,
      },
    ];
    if (prime.length > 0) {
      facts.push({ label: 'Músculos', value: prime.slice(0, 4).join(', ') });
    }
    const info: PatientCardInfo = {
      title: `${movement.name} · ${regionName}`,
      instruction: patientInstruction(movement, regionName),
      note,
      facts,
      fileStem: `anatris-${region ?? 'lab'}-${movement.id}`,
    };
    setExporting(true);
    setExportMsg(null);
    try {
      await exportPatientCard(info);
      setExportMsg('Imagen descargada ✓');
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : 'No se pudo exportar.');
    } finally {
      setExporting(false);
      window.setTimeout(() => setExportMsg(null), 4000);
    }
  };

  // Reset the angle to the gesture's anatomical START whenever the movement
  // changes, stop any playback, and clear the pathology back to Normal.
  useEffect(() => {
    setPlaying(false);
    setAngle(arc ? arc.startDeg : 0);
    setPathologyId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementId]);

  // Pathology range clamp: if the reachable window shrinks past the current angle
  // (selecting a preset that caps the max or floors the min), pull the pose into it.
  useEffect(() => {
    setAngle((a) => (a > effMax ? effMax : a < effMin ? effMin : a));
  }, [effMax, effMin]);

  // --- Push the live state to the rig (drive + scene highlight + markers).
  useEffect(() => {
    if (!drivable || !arc) {
      rigChannel.set({ movementId: null, angleDeg: 0, highlight: [], showMarkers, implicated: [] });
      return;
    }
    // Under manual resistance the agonists recruit harder, so brighten the glow
    // (clamped to 1). Reflects the extra effort the therapist demands.
    const levelBoost = resistance ? 1.4 : 1;
    const highlight: RigHighlight[] = liveMuscles.map((m) => ({
      muscleId: m.muscleId,
      role: m.role,
      level: Math.min(1, (m.level ?? 1) * levelBoost),
    }));
    rigChannel.set({
      movementId,
      side,
      angleDeg: Math.max(effMin, Math.min(angle, effMax)),
      highlight,
      showMarkers,
      pathologyId: supportsPathology ? pathologyId : null,
      implicated,
      resistance,
    });
  }, [
    movementId,
    side,
    angle,
    drivable,
    arc,
    showMarkers,
    liveMuscles,
    supportsPathology,
    pathologyId,
    effMax,
    effMin,
    implicated,
    resistance,
  ]);

  // Return to rest when leaving the lab so re-entry starts clean.
  useEffect(() => {
    return () => rigChannel.set({ movementId: null, angleDeg: 0, highlight: [], implicated: [] });
  }, []);

  // --- Playback loop (requestAnimationFrame). Sweeps min<->max; loops or stops
  // after one bounce; honored only when reduced motion is OFF.
  const rafRef = useRef<number>(0);
  const dirRef = useRef<1 | -1>(1);
  const lastTsRef = useRef<number>(0);
  useEffect(() => {
    if (!playing || !arc || reducedMotion) return;
    const min = effMin; // pathology floor bounds the sweep (extension lag)
    const max = effMax; // pathology cap bounds the sweep (ROM loss)
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
  }, [playing, arc, speedIdx, loop, reducedMotion, effMax, effMin]);

  const togglePlay = () => {
    if (!arc) return;
    if (reducedMotion) {
      setAngle((prev) => (prev <= (effMin + effMax) / 2 ? effMax : effMin));
      return;
    }
    if (!playing) {
      dirRef.current = angle <= effMin + 0.5 ? 1 : angle >= effMax - 0.5 ? -1 : dirRef.current;
    }
    setPlaying((p) => !p);
  };

  const returnToNeutral = () => {
    setPlaying(false);
    setAngle(0);
  };

  const displayAngle = Math.round(angle);
  const gestureName =
    arc && angle < 0 && movement?.labReverse ? movement.labReverse.name : movement?.name;

  // ---- PATIENT MODE: one big, plain-language bar (same state as the clinician
  // panel, so entering/leaving keeps the current pose). Rendered by MovementView
  // centered at the bottom; the clinician overlays are hidden while it is on. ----
  if (patientMode) {
    const sliderVal = Math.round(Math.max(effMin, Math.min(angle, effMax)));
    return (
      <div className="pointer-events-auto w-[min(94vw,54rem)] rounded-2xl border border-slate-700/60 bg-ink-950/85 px-5 py-4 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => goToMovement(-1)}
            aria-label="Ejercicio anterior"
            className="shrink-0 rounded-full border border-slate-700 px-3.5 py-2 text-xl leading-none text-slate-300 transition-colors hover:bg-slate-800"
          >
            ‹
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {regionName}
            </div>
            <div className="truncate text-lg font-bold text-white sm:text-2xl">
              {movement?.name}
            </div>
            {movement && (
              <p className="mt-1 text-sm text-slate-300 sm:text-lg">
                {patientInstruction(movement, regionName)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => goToMovement(1)}
            aria-label="Siguiente ejercicio"
            className="shrink-0 rounded-full border border-slate-700 px-3.5 py-2 text-xl leading-none text-slate-300 transition-colors hover:bg-slate-800"
          >
            ›
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!drivable}
            className="shrink-0 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:opacity-50 sm:text-base"
          >
            {playing ? '⏸ Pausar' : '▶ Ver movimiento'}
          </button>
          <input
            type="range"
            min={effMin}
            max={effMax}
            step={1}
            value={sliderVal}
            onChange={(e) => {
              setPlaying(false);
              setAngle(Number(e.target.value));
            }}
            aria-label="Ángulo del movimiento"
            className="h-2.5 flex-1 cursor-pointer accent-sky-500"
          />
          <span className="w-14 shrink-0 text-right font-mono text-base text-slate-100">
            {displayAngle}°
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto w-[21rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-800/70 bg-ink-950/90 shadow-2xl backdrop-blur">
      {/* Header = the always-visible handle bar. On phones the whole title
          toggles collapse, and a play/pause + chevron sit on the right so the
          user can run the movement with the panel collapsed and the model in
          full view. On desktop the title is inert and the panel stays open. */}
      <div className="flex items-center justify-between gap-2 p-3 pb-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="min-w-0 flex-1 text-left lg:pointer-events-none"
        >
          <h2 className="font-display text-sm font-bold text-slate-50">
            Laboratorio de movimiento
          </h2>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {gestureName ?? 'Selecciona un movimiento'}
            {movement?.plane ? ` · plano ${movement.plane.toLowerCase()}` : ''}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {drivable && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1 text-right leading-none">
              <span className="font-display text-base font-bold tabular-nums text-slate-100">
                {displayAngle}
                <span className="text-xs text-slate-400">°</span>
              </span>
            </div>
          )}
          {drivable && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pausar' : 'Reproducir'}
              className="rounded-lg bg-accent/20 px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/30 lg:hidden"
            >
              {reducedMotion ? '↹' : playing ? '⏸' : '▶'}
            </button>
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

      {/* Body (collapsible on mobile so it never covers the gesture). On phones
          it is also height-capped + scrollable so the expanded panel can't grow
          tall enough to overlap the right-side stack; desktop is unchanged. */}
      <div
        className={`${collapsed ? 'hidden' : 'block'} max-h-[46vh] overflow-y-auto px-3 pb-3 sm:max-h-none sm:overflow-visible lg:block`}
      >
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
              Arco en el modelo
            </label>
          </div>
        )}

        {/* MANUAL RESISTANCE toggle -- the physio's interaction (hands + force
            arrow opposing the gesture). Hidden for the spine (the limb joints
            drive the 3D hands). */}
        {drivable && !isSpine && (
          <button
            type="button"
            onClick={() => setResistance((r) => !r)}
            aria-pressed={resistance}
            className={`mt-3 flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
              resistance
                ? 'border-[#ff8c1a]/50 bg-[#ff8c1a]/12 text-[#ffcf9a]'
                : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M10 3v9" strokeLinecap="round" />
              <path d="M6.5 8.5L10 12l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 15.5h12" strokeLinecap="round" />
            </svg>
            <span className="flex-1 text-xs font-semibold">Resistencia manual</span>
            <span
              className={`text-[10px] font-bold uppercase ${
                resistance ? 'text-[#ff8c1a]' : 'text-slate-600'
              }`}
            >
              {resistance ? 'On' : 'Off'}
            </span>
          </button>
        )}
        {drivable && !isSpine && resistance && (
          <div className="mt-2 rounded-lg border border-[#ff8c1a]/25 bg-[#ff8c1a]/8 px-2.5 py-2 text-[10px] leading-snug text-[#ffcf9a]/90">
            <p className="font-semibold text-[#ffcf9a]">Prueba resistida — cómo se hace</p>
            <p className="mt-1">
              <span className="text-[#7ef0c4]">1.</span> Pídele al paciente que realice{' '}
              <span className="font-semibold">{(gestureName ?? 'el movimiento').toLowerCase()}</span>.
            </p>
            <p className="mt-0.5">
              <span className="text-[#ffb877]">2.</span> Aplica resistencia con la mano en el segmento distal
              (donde se apoya la <span className="font-semibold">mano del fisio</span> en el modelo), oponiéndote al movimiento.
            </p>
            <p className="mt-1 text-[#ffe0bf]/80">
              Contracción {playing ? 'concéntrica contra resistencia' : 'isométrica (posición mantenida)'}
              {resistedNames.length > 0 && (
                <> · trabaja: <span className="font-semibold">{resistedNames.join(', ')}</span></>
              )}
            </p>
          </div>
        )}

        {/* P1: Normal vs Patologico. Shown for any movement that has presets
            (shoulder elevation, knee flexo-extension, ...). */}
        {drivable && supportsPathology && (
          <div className="mt-3">
            <span className="text-xs font-medium text-slate-400">Estado</span>
            <div className="mt-1 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setPathologyId(null)}
                className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                  pathologyId === null
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                    : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Normal
              </button>
              {pathologyOptions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPathologyId(p.id)}
                  className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                    pathologyId === p.id
                      ? 'border-amber-500/45 bg-amber-500/15 text-amber-200'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {p.chip}
                </button>
              ))}
            </div>
            {pathology && (
              <p className="mt-1.5 text-[10px] leading-snug text-amber-200/80">
                {pathology.summary}
              </p>
            )}
          </div>
        )}

        {/* Unsupported movement notice */}
        {control?.kind === 'unsupported' && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] leading-relaxed text-amber-200/90">
            {control.reason}
          </p>
        )}

        {/* Slider */}
        {drivable && arc && (
          <>
            <input
              id="mov-angle"
              type="range"
              min={effMin}
              max={effMax}
              step={1}
              value={Math.round(Math.max(effMin, Math.min(angle, effMax)))}
              onChange={(e) => {
                setPlaying(false);
                setAngle(Number(e.target.value));
              }}
              aria-label="Ángulo del movimiento"
              className="mt-3 w-full accent-accent"
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

        {/* PATIENT EXPORT: snapshot the current pose into a plain-language PNG the
            physio can hand to the patient. Turns the lab into a consultation tool. */}
        <div className="mt-3 border-t border-slate-800/70 pt-3">
          <label
            htmlFor="patient-note"
            className="block text-[11px] font-medium text-slate-400"
          >
            Nota para el paciente (opcional)
          </label>
          <textarea
            id="patient-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Ej.: 3 series de 10, 2 veces al día, sin dolor."
            className="mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={onExport}
            disabled={exporting || !movement}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? 'Generando…' : '⬇  Exportar para paciente (PNG)'}
          </button>
          {exportMsg && (
            <p className="mt-1 text-center text-[10px] text-slate-400">{exportMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
