// src/components/movement/MovementControls.tsx
//
// The movement lab's CONSOLE (bottom-left). It drives the skinned rig (RigModel,
// via rigChannel) by clinical movementId + side + SIGNED angle and owns playback;
// the live clinical READOUT (goniometer sectors, humero-escapulo-raquideo rhythm,
// protagonist muscle) lives in RhythmReadout (top-left), a read-only twin fed by
// the SAME rigChannel. Keeping the readout OUT of this panel is what stopped the
// old floating card from covering the model.
//
// This panel still computes the live per-muscle recruitment (activeMusclesAt) and
// pushes it as the scene highlight so the real rig meshes glow as the arc sweeps;
// it just no longer renders the muscle list itself.
//
// SHAPE: one instrument surface, sectioned by hairlines, never nested cards. The
// movements are a chip RAIL (a native <select> hid the size of the library and
// took two taps to browse), the settings are switches, and playback is icon
// transport. Copy carries no leading dashes or bullet glyphs: rank comes from
// type size and the kicker labels.
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
import { demoChannel, useActiveDemo } from './demoChannel';
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
import { LockGlyph, useFeatureGate } from '../account/PremiumGate';
import { FREE_MOVEMENT_QUOTA } from '../../auth/entitlements';
import { IconButton, Segmented, Switch } from '../ui/Controls';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  LoopIcon,
  NeutralIcon,
  PauseIcon,
  PlayIcon,
} from '../ui/Icons';

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
  /**
   * True when this console is a SECTION of the left column's single instrument
   * surface (MovementView stacks the readout above it). Embedded, it drops its
   * own panel chrome and, from `sm` up, its header: the gesture, the plane and
   * the angle are already the readout's headline right above, and printing them
   * twice was the main reason the column read as cluttered. Below `sm` the
   * readout is hidden, so the header comes back to carry that identity.
   */
  embedded?: boolean;
}

export function MovementControls({
  region,
  patientMode = false,
  embedded = false,
}: MovementControlsProps) {
  const movements = useMemo(() => romForRegion(region), [region]);
  const reducedMotion = usePrefersReducedMotion();

  // CAPABILITY GATES. The free tier drives a DEMO of the lab (the first drivable
  // movement) so the rig proves itself, but the tools a physio uses in front of a
  // patient -- the full arc library, pathological presets -- are premium. Locked
  // entries stay listed with a lock, never hidden.
  const labGate = useFeatureGate('movement-full');
  const pathologyGate = useFeatureGate('pathologies');

  /** Movement ids the current plan may drive. */
  const allowedIds = useMemo(() => {
    if (labGate.unlocked) return null; // null = no restriction
    const free = movements.filter((m) => isDrivable(m.id)).slice(0, FREE_MOVEMENT_QUOTA);
    return new Set(free.map((m) => m.id));
  }, [labGate.unlocked, movements]);

  const isLockedMovement = (id: string) => allowedIds != null && !allowedIds.has(id);

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
  // A test/myotome demo animating the rig (demoChannel). While one runs, the
  // console pauses its playback and stops pushing rigChannel so the two rAF
  // loops never fight over the pose (play general -> play demo used to stutter).
  const activeDemo = useActiveDemo();
  useEffect(() => {
    if (activeDemo) setPlaying(false);
  }, [activeDemo]);
  /** Stop any running demo so the console owns the rig again. */
  const claimRig = () => demoChannel.stop();
  // Start collapsed on phones so the model is visible; expanded on desktop.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 639px)').matches;
  });
  // Session settings (markers, clinical state) fold away unless the screen is
  // tall enough to show them without the console reaching the readout.
  const [settingsOpen, setSettingsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-height: 900px)').matches;
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

  // muscleId -> Spanish name, so the patient export can list the working muscles
  // (the glow shows WHERE; the card says WHO).
  const muscleNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of musclesForRomLookup(region)) map.set(m.id, m.name);
    return map;
  }, [region]);

  // Prime movers at the current angle, by name (deduped; feeds the export card).
  const primeMoverNames = useMemo(() => {
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
  // clean, plain-language PNG handout the physio can print or send. Client-side.
  // Folded away behind one row until asked for, so the console's resting state is
  // the movement itself and not a form. ---
  const [note, setNote] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const onExport = async () => {
    if (!movement) return;
    const prime =
      primeMoverNames.length > 0
        ? primeMoverNames
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
        value: `${Math.round(rng.min)} a ${Math.round(rng.max)}°`,
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
      setExportMsg('Imagen descargada');
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : 'No se pudo exportar.');
    } finally {
      setExporting(false);
      window.setTimeout(() => setExportMsg(null), 4000);
    }
  };

  // Reset the angle to the gesture's anatomical START whenever the movement
  // changes, stop any playback (and any demo), and clear the pathology back to
  // Normal.
  useEffect(() => {
    claimRig();
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
    // A demo (orthopedic test / myotome) owns the rig right now; pushing here
    // would fight its rAF loop frame by frame. When it releases, activeDemo
    // flips to null and this effect re-pushes the console's state.
    if (activeDemo) return;
    if (!drivable || !arc) {
      rigChannel.set({
        movementId: null,
        angleDeg: 0,
        highlight: [],
        showMarkers,
        implicated: [],
        ghostSkin: false,
        resistance: false,
        demo: null,
      });
      return;
    }
    const highlight: RigHighlight[] = liveMuscles.map((m) => ({
      muscleId: m.muscleId,
      role: m.role,
      level: Math.min(1, m.level ?? 1),
    }));
    rigChannel.set({
      movementId,
      side,
      angleDeg: Math.max(effMin, Math.min(angle, effMax)),
      highlight,
      showMarkers,
      pathologyId: supportsPathology ? pathologyId : null,
      implicated,
      // rigChannel patches state, so explicitly clear everything only a demo
      // sets (glass skin, the therapist's resisting hand, the maneuver card).
      ghostSkin: false,
      resistance: false,
      demo: null,
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
    activeDemo,
  ]);

  // Return to rest when leaving the lab so re-entry starts clean, including the
  // demo-only flags (a demo running at unmount would otherwise leave the glass
  // skin and the resisting hand stuck on the model).
  useEffect(() => {
    return () =>
      rigChannel.set({
        movementId: null,
        angleDeg: 0,
        highlight: [],
        implicated: [],
        ghostSkin: false,
        resistance: false,
        demo: null,
      });
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
    claimRig();
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
    claimRig();
    setPlaying(false);
    setAngle(0);
  };

  const displayAngle = Math.round(angle);
  const gestureName =
    arc && angle < 0 && movement?.labReverse ? movement.labReverse.name : movement?.name;

  const sliderVal = Math.round(Math.max(effMin, Math.min(angle, effMax)));
  const span = effMax - effMin;
  const fillPct = span > 0 ? ((sliderVal - effMin) / span) * 100 : 0;
  // Where 0° sits on a signed arc, so the neutral position is legible on the track.
  const neutralPct = span > 0 && effMin < 0 && effMax > 0 ? ((0 - effMin) / span) * 100 : null;

  // What the folded settings row reports, so nothing active is ever hidden.
  const settingsSummary =
    [pathology?.chip, showMarkers ? null : 'Sin arco 3D'].filter(Boolean).join(', ') ||
    null;

  const playLabel = reducedMotion
    ? 'Alternar entre los extremos'
    : playing
      ? 'Pausar'
      : 'Reproducir el movimiento';

  // ---- PATIENT MODE: one big, plain-language bar (same state as the clinician
  // panel, so entering/leaving keeps the current pose). Rendered by MovementView
  // centered at the bottom; the clinician overlays are hidden while it is on. ----
  if (patientMode) {
    return (
      <div className="instrument pointer-events-auto w-[min(94vw,54rem)] px-5 py-4">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => goToMovement(-1)} label="Ejercicio anterior">
            <ChevronLeftIcon size={18} />
          </IconButton>
          <div className="min-w-0 flex-1 text-center">
            <div className="kicker">{regionName}</div>
            <div className="mt-1 truncate font-display text-lg font-bold text-white sm:text-2xl">
              {movement?.name}
            </div>
            {movement && (
              <p className="mt-1 text-sm leading-snug text-slate-300 sm:text-lg">
                {patientInstruction(movement, regionName)}
              </p>
            )}
          </div>
          <IconButton onClick={() => goToMovement(1)} label="Siguiente ejercicio">
            <ChevronRightIcon size={18} />
          </IconButton>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!drivable}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-ink-950 shadow-[0_0_22px_-6px_rgba(34,211,238,0.75)] transition-colors hover:bg-accent-soft disabled:opacity-50 sm:text-base"
          >
            {playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            {playing ? 'Pausar' : 'Ver movimiento'}
          </button>
          <input
            type="range"
            min={effMin}
            max={effMax}
            step={1}
            value={sliderVal}
            onChange={(e) => {
              claimRig();
              setPlaying(false);
              setAngle(Number(e.target.value));
            }}
            aria-label="Ángulo del movimiento"
            className="range-clinical range-lg flex-1"
            style={{ ['--fill' as string]: fillPct }}
          />
          <span className="w-16 shrink-0 text-right font-display text-2xl font-bold tabular-nums text-slate-100">
            {displayAngle}
            <span className="text-base text-slate-500">°</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-auto w-full overflow-hidden ${embedded ? '' : 'instrument'}`}
    >
      {/* HEADER. Doubles as the collapse handle on phones. Embedded, it only
          exists below `sm`, where the readout above is hidden and this line is
          the panel's only identity. */}
      <div
        className={`flex items-start gap-3 px-4 pt-3.5 pb-3 ${embedded ? 'sm:hidden' : ''}`}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="min-w-0 flex-1 text-left lg:pointer-events-none"
        >
          <span className="kicker block truncate">
            {regionName || 'Laboratorio'}
            {movement?.plane ? `, plano ${movement.plane.toLowerCase()}` : ''}
          </span>
          <h2 className="mt-1.5 truncate font-display text-[15px] font-semibold leading-tight text-slate-50">
            {gestureName ?? 'Selecciona un movimiento'}
          </h2>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {drivable && (
            <span className="font-display text-[26px] font-bold leading-none tabular-nums text-slate-50">
              {displayAngle}
              <span className="text-base font-medium text-slate-500">°</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expandir panel' : 'Colapsar panel'}
            aria-expanded={!collapsed}
            className="-mr-1 ml-1 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100/[0.06] hover:text-slate-200 lg:hidden"
          >
            <ChevronDownIcon size={14} className={collapsed ? '-rotate-90' : ''} />
          </button>
        </div>
      </div>

      {/* Transport stays reachable while collapsed on phones, so the movement can
          run with the model in full view. */}
      {collapsed && drivable && (
        <div className="flex items-center gap-2 px-4 pb-3 lg:hidden">
          <IconButton onClick={togglePlay} label={playLabel} variant="primary">
            {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
          </IconButton>
          <input
            type="range"
            min={effMin}
            max={effMax}
            step={1}
            value={sliderVal}
            onChange={(e) => {
              claimRig();
              setPlaying(false);
              setAngle(Number(e.target.value));
            }}
            aria-label="Ángulo del movimiento"
            className="range-clinical flex-1"
            style={{ ['--fill' as string]: fillPct }}
          />
        </div>
      )}

      <div
        // Height-capped and scrollable at EVERY size, not just on phones. The
        // console shares its column with the readout, so an unbounded body (open
        // settings on a laptop) squeezed the readout down to a sliver.
        className={`${collapsed ? 'hidden' : 'block'} max-h-[34vh] overflow-y-auto sm:max-h-[36vh] ${embedded ? 'sm:block' : 'lg:block'}`}
      >
        {/* MOVEMENT RAIL. Every arc of the region in one strip, so the library's
            size is visible at a glance. Premium arcs stay listed with a lock and
            open pricing when tapped, rather than being hidden. */}
        <div className="hairline" />
        <div className="px-4 py-3">
          <span className="kicker">Movimiento</span>
          <div className="rail mt-2 -mx-1 px-1 pb-0.5">
            {movements.map((m) => {
              const unavailable = !isDrivable(m.id);
              const locked = isLockedMovement(m.id);
              const active = m.id === movementId;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => {
                    if (unavailable) return;
                    if (locked) {
                      labGate.requestUpgrade();
                      return;
                    }
                    setMovementId(m.id);
                  }}
                  aria-label={
                    unavailable
                      ? `${m.name}, todavía no disponible en el rig`
                      : locked
                        ? `${m.name}, disponible en Premium`
                        : m.name
                  }
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/40'
                      : unavailable
                        ? 'text-slate-600'
                        : locked
                          ? 'text-amber-200/80 ring-1 ring-inset ring-amber-500/25 hover:bg-amber-400/10'
                          : 'text-slate-400 ring-1 ring-inset ring-slate-700/70 hover:bg-slate-100/[0.06] hover:text-slate-200'
                  }`}
                >
                  {m.name}
                  {locked && <LockGlyph />}
                </button>
              );
            })}
          </div>
          {allowedIds != null && (
            <button
              type="button"
              onClick={labGate.requestUpgrade}
              className="mt-2 flex w-full items-center gap-2 text-left text-[10.5px] leading-snug text-amber-200/85 transition-colors hover:text-amber-100"
            >
              <LockGlyph className="shrink-0" />
              <span>
                Versión gratuita con un movimiento de demostración. Premium abre los{' '}
                {movements.filter((m) => isDrivable(m.id)).length} arcos de esta región.
              </span>
            </button>
          )}
        </div>

        {/* Unsupported movement notice */}
        {control?.kind === 'unsupported' && (
          <>
            <div className="hairline" />
            <p className="px-4 py-3 text-[11px] leading-relaxed text-amber-200/85">
              {control.reason}
            </p>
          </>
        )}

        {/* ARC. Slider, neutral mark, transport, speed. */}
        {drivable && arc && (
          <>
            <div className="hairline" />
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="kicker">
                  Arco {Math.round(effMin)}° a {Math.round(effMax)}°
                </span>
                {!isSpine && (
                  <Segmented
                    ariaLabel="Lado del cuerpo"
                    size="xs"
                    value={side}
                    onChange={(s) => {
                      claimRig();
                      setSide(s);
                    }}
                    options={[
                      { value: 'R' as Side, label: SIDE_LABEL.R },
                      { value: 'L' as Side, label: SIDE_LABEL.L },
                    ]}
                  />
                )}
              </div>
              <div className="relative mt-2">
                <input
                  id="mov-angle"
                  type="range"
                  min={effMin}
                  max={effMax}
                  step={1}
                  value={sliderVal}
                  onChange={(e) => {
                    claimRig();
                    setPlaying(false);
                    setAngle(Number(e.target.value));
                  }}
                  aria-label="Ángulo del movimiento"
                  className="range-clinical"
                  style={{ ['--fill' as string]: fillPct }}
                />
                {neutralPct != null && (
                  <span
                    className="pointer-events-none absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
                    style={{ left: `${neutralPct}%` }}
                    aria-hidden="true"
                  >
                    <span className="h-1.5 w-px bg-clinical-soft/70" />
                    <span className="mt-0.5 font-mono text-[9px] text-clinical-soft/70">0</span>
                  </span>
                )}
              </div>

              <div className={`flex items-center gap-1.5 ${neutralPct != null ? 'mt-3.5' : 'mt-2'}`}>
                <IconButton onClick={togglePlay} label={playLabel} variant="primary">
                  {playing ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
                </IconButton>
                <IconButton onClick={returnToNeutral} label="Volver a la posición neutra">
                  <NeutralIcon size={15} />
                </IconButton>
                {!reducedMotion && (
                  <>
                    <IconButton
                      onClick={() => setLoop((l) => !l)}
                      label={loop ? 'Bucle activado' : 'Bucle desactivado'}
                      className={loop ? 'text-accent' : ''}
                    >
                      <LoopIcon size={15} />
                    </IconButton>
                    <div className="ml-auto">
                      <Segmented
                        ariaLabel="Velocidad de reproducción"
                        size="xs"
                        value={speedIdx}
                        onChange={setSpeedIdx}
                        options={SPEEDS.map((s, i) => ({ value: i, label: s.label }))}
                      />
                    </div>
                  </>
                )}
              </div>
              {reducedMotion && (
                <p className="mt-2 text-[10px] text-slate-500">
                  Animación reducida por preferencia del sistema.
                </p>
              )}
            </div>
          </>
        )}

        {/* TRIAL SETTINGS. What a physio sets once per session (markers, the
            clinical state) folds behind one row, so the console at rest is the
            movement and nothing else. The old panel showed all of it at once and
            grew tall enough to climb over the model and the readout. */}
        {drivable && (
          <>
            <div className="hairline" />
            <div className="px-4 py-2">
              {/* One footer row holds both drawers, so the console's resting
                  height stays about a third of the column. */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen((o) => !o);
                    setExportOpen(false);
                  }}
                  aria-expanded={settingsOpen}
                  className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-slate-400 transition-colors hover:text-slate-200"
                >
                  <span className="shrink-0 text-xs font-medium">Ajustes</span>
                  {!settingsOpen && settingsSummary && (
                    <span className="truncate text-[10px] text-slate-500">{settingsSummary}</span>
                  )}
                  <ChevronDownIcon
                    size={13}
                    className={`ml-auto shrink-0 text-slate-600 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <span className="mx-3 h-4 w-px shrink-0 bg-slate-100/10" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => {
                    setExportOpen((o) => !o);
                    setSettingsOpen(false);
                  }}
                  aria-expanded={exportOpen}
                  className="flex shrink-0 items-center gap-2 py-1.5 text-slate-400 transition-colors hover:text-slate-200"
                >
                  <DownloadIcon size={13} />
                  <span className="text-xs font-medium">Exportar</span>
                </button>
              </div>

              {exportOpen && (
                <div className="pb-1">
                  <textarea
                    id="patient-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    aria-label="Nota para el paciente"
                    placeholder="Nota opcional. Por ejemplo: 3 series de 10, dos veces al día, sin dolor."
                    className="mt-1 w-full resize-none rounded-lg border border-slate-700/70 bg-slate-950/60 px-2.5 py-2 text-[11px] leading-snug text-slate-200 placeholder:text-slate-600 focus:border-accent/60 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={onExport}
                    disabled={exporting || !movement}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100/[0.08] px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-100/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <DownloadIcon size={13} />
                    {exporting ? 'Generando la imagen' : 'Descargar la ficha en PNG'}
                  </button>
                  {exportMsg && (
                    <p className="mt-1.5 text-center text-[10px] text-slate-400">{exportMsg}</p>
                  )}
                </div>
              )}

              {settingsOpen && (
                <div className="pb-1">
                  <Switch
                    checked={showMarkers}
                    onChange={() => setShowMarkers((v) => !v)}
                    label="Arco sobre el modelo"
                    hint="Dibuja el recorrido y los marcadores en 3D"
                  />

                  {supportsPathology && (
                    <div className="mt-2">
                      <span className="kicker">Estado clínico</span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            claimRig();
                            setPathologyId(null);
                          }}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            pathologyId === null
                              ? 'bg-clinical/15 text-clinical-soft ring-1 ring-inset ring-clinical/40'
                              : 'text-slate-400 ring-1 ring-inset ring-slate-700/70 hover:bg-slate-100/[0.06]'
                          }`}
                        >
                          Normal
                        </button>
                        {pathologyOptions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={
                              pathologyGate.unlocked
                                ? () => {
                                    claimRig();
                                    setPathologyId(p.id);
                                  }
                                : pathologyGate.requestUpgrade
                            }
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                              !pathologyGate.unlocked
                                ? 'text-amber-200/80 ring-1 ring-inset ring-amber-500/25 hover:bg-amber-400/10'
                                : pathologyId === p.id
                                  ? 'bg-amber-500/15 text-amber-200 ring-1 ring-inset ring-amber-500/45'
                                  : 'text-slate-400 ring-1 ring-inset ring-slate-700/70 hover:bg-slate-100/[0.06]'
                            }`}
                          >
                            {p.chip}
                            {!pathologyGate.unlocked && <LockGlyph />}
                          </button>
                        ))}
                      </div>
                      {pathology && (
                        <p className="mt-2 text-[10.5px] leading-snug text-amber-200/80">
                          {pathology.summary}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
