// src/components/RomPanel.tsx
//
// Range-of-motion (ROM) study panel. Lives in the Sidebar. Has TWO modes,
// toggled at the top:
//
//   "Por movimiento" (mode A): study a gesture. Pick a movement, walk its arc
//   phase by phase; the phase's muscles light up in 3D, colored by role.
//
//   "Por musculo" (mode B): study a muscle. Pick a muscle (from a list, or it
//   follows the muscle you already selected in the 3D / MuscleList); see every
//   movement + degree range where it participates, with its role in each. The
//   muscle lights up in 3D.
//
// REGION-AWARE: the movement list and the muscle universe both follow the
// active region (store.region) via romForRegion + musclesForRegion, so in the
// elbow module you study elbow movements and elbow muscles, and in the shoulder
// module the shoulder set -- never a mismatch between the cropped scene and the
// listed muscles. The same region muscle array is passed to buildRomNumbering
// so the chip numbers match the 3D pin numbers exactly.
//
// IDENTITY BRIDGE (list <-> 3D):
// Role color can't disambiguate same-role muscles (three violet stabilizers).
// Each highlighted muscle gets a STABLE NUMBER (buildRomNumbering, anatomical
// order) shown on its chip here and on a pin at its centroid in 3D. Hovering a
// chip sets romFocusMuscleId, which (a) reveals the muscle's name on its 3D pin
// and (b) intensifies it in 3D -- the hover "lupa" for pinpointing which one.
//
// Muscle ids in the ROM data are kebab-case and match the resolver's
// meshNamesByMuscleId, so we resolve straight to scene mesh names.
//
// ENCODING NOTE: to stay robust against copy/paste re-encoding accidents, the
// few non-ASCII glyphs this UI needs (degree sign, en dash, middle dot) live in
// one SYM constant built from char codes -- never typed as literals in JSX.

import { useEffect, useMemo } from 'react';
import { useAnatomyStore, type RomViewMode } from '../store/anatomyStore';
import { romForRegion } from '../data/romByRegion';
import {
  ROM_ROLE_LABEL,
  type RomMovement,
  type RomMuscleRole,
} from '../types/rom';
import { buildRomMuscleIndex, type RomParticipation } from '../lib/romIndex';
import { buildRomNumbering } from '../lib/romNumber';
import { musclesForRegion, musclesForRomLookup } from '../data/musclesByRegion';
import type { Muscle } from '../types/muscle';
import type { MuscleResolution } from '../lib/muscleResolver';

interface RomPanelProps {
  resolution: MuscleResolution;
}

// Non-ASCII glyphs, built from code points so they can never be corrupted by a
// bad copy/paste. DEG = degree sign, DASH = en dash, DOT = middle dot.
const SYM = {
  DEG: String.fromCharCode(0x00b0), // degrees
  DASH: String.fromCharCode(0x2013), // en dash, for ranges
  DOT: String.fromCharCode(0x00b7), // middle dot, separator
} as const;

/** Format a degree range like "15-90 deg" using the safe glyphs. */
function degRange(a: number, b: number): string {
  return `${a}${SYM.DEG}${SYM.DASH}${b}${SYM.DEG}`;
}

/** Format a single degree value like "90 deg". */
function deg(v: number): string {
  return `${v}${SYM.DEG}`;
}

// Role -> Tailwind classes for the muscle chips and the legend.
const ROLE_STYLE: Record<
  RomMuscleRole,
  { dot: string; text: string; ring: string; badge: string }
> = {
  'prime-mover': {
    dot: 'bg-accent',
    text: 'text-accent',
    ring: 'ring-accent/40',
    badge: 'bg-accent text-ink-950',
  },
  assistant: {
    dot: 'bg-sky-400',
    text: 'text-sky-300',
    ring: 'ring-sky-400/40',
    badge: 'bg-sky-400 text-ink-950',
  },
  stabilizer: {
    dot: 'bg-violet-400',
    text: 'text-violet-300',
    ring: 'ring-violet-400/40',
    badge: 'bg-violet-400 text-ink-950',
  },
};

export function RomPanel({ resolution }: RomPanelProps) {
  const romViewMode = useAnatomyStore((s) => s.romViewMode);
  const setRomViewMode = useAnatomyStore((s) => s.setRomViewMode);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-600">
          Rango de movimiento
        </p>
      </div>

      {/* Mode toggle */}
      <div className="mb-3 flex gap-1 rounded-xl bg-slate-900/60 p-1">
        {(
          [
            { value: 'movement', label: 'Por movimiento' },
            { value: 'muscle', label: 'Por musculo' },
          ] as Array<{ value: RomViewMode; label: string }>
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRomViewMode(opt.value)}
            className={[
              'flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all',
              romViewMode === opt.value
                ? 'bg-accent text-ink-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {romViewMode === 'movement' ? (
        <MovementView resolution={resolution} />
      ) : (
        <MuscleView resolution={resolution} />
      )}
    </div>
  );
}

/* ===========================================================================
 * Shared bits
 * ======================================================================== */

// Compact role legend so a student reads color -> meaning without guessing.
function RoleLegend() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-900/40 px-2.5 py-2">
      {(['prime-mover', 'assistant', 'stabilizer'] as RomMuscleRole[]).map(
        (role) => (
          <span key={role} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${ROLE_STYLE[role].dot}`} />
            <span className="text-[10px] text-slate-400">
              {ROM_ROLE_LABEL[role]}
            </span>
          </span>
        ),
      )}
    </div>
  );
}

// Small numbered badge mirroring the 3D pin.
function NumberBadge({
  n,
  role,
  focused,
}: {
  n: number;
  role: RomMuscleRole;
  focused: boolean;
}) {
  const style = ROLE_STYLE[role];
  return (
    <span
      className={[
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition-all',
        style.badge,
        focused ? 'ring-2 ring-white/80 scale-110' : 'ring-1 ring-white/30',
      ].join(' ')}
    >
      {n}
    </span>
  );
}

/* ===========================================================================
 * MODE A -- study a gesture
 * ======================================================================== */

function MovementView({ resolution }: { resolution: MuscleResolution }) {
  const region = useAnatomyStore((s) => s.region);
  const romSelection = useAnatomyStore((s) => s.romSelection);
  const setRomPhase = useAnatomyStore((s) => s.setRomPhase);
  const clearRom = useAnatomyStore((s) => s.clearRom);
  const requestFocus = useAnatomyStore((s) => s.requestFocus);

  // Movement list for the active region.
  const movements = useMemo(() => romForRegion(region), [region]);

  // The active movement id falls back to the region's first movement. If the
  // current selection belongs to another region (after a region switch), it
  // won't be found and we fall back cleanly.
  const selectedInRegion =
    romSelection && movements.some((m) => m.id === romSelection.movementId)
      ? romSelection.movementId
      : null;
  const activeMovementId = selectedInRegion ?? movements[0]?.id;
  const movement = useMemo(
    () => movements.find((m) => m.id === activeMovementId) ?? null,
    [movements, activeMovementId],
  );

  if (!movement) return null;

  const activePhaseIndex =
    selectedInRegion === movement.id ? romSelection!.phaseIndex : null;

  // Resolve a phase's muscles to (a) a muscleId->role map for highlighting and
  // (b) the union of their scene mesh names for the camera focus.
  function selectPhase(m: RomMovement, phaseIndex: number) {
    const phase = m.phases[phaseIndex];
    if (!phase) return;

    const roleByMuscle = new Map<string, RomMuscleRole>();
    const meshNames: string[] = [];

    for (const ref of phase.muscles) {
      if (!roleByMuscle.has(ref.muscleId))
        roleByMuscle.set(ref.muscleId, ref.role);
      const names = resolution.meshNamesByMuscleId.get(ref.muscleId);
      if (names) meshNames.push(...names);
    }

    setRomPhase(m.id, phaseIndex, roleByMuscle);
    if (meshNames.length > 0) requestFocus(meshNames);
  }

  function handleSelectMovement(m: RomMovement) {
    if (m.id === movement?.id) return;
    selectPhase(m, 0);
  }

  return (
    <div>
      <RoleLegend />

      {/* Movement selector */}
      <div className="mb-3 flex flex-wrap gap-1">
        {movements.map((m) => {
          const on = m.id === movement.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelectMovement(m)}
              className={[
                'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                on
                  ? 'bg-accent text-ink-950 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              {m.name}
            </button>
          );
        })}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[11px] text-slate-500">
          {degRange(movement.totalRangeDeg.min, movement.totalRangeDeg.max)}
          {movement.plane ? ` ${SYM.DOT} ${movement.plane.toLowerCase()}` : ''}
        </p>
        {activePhaseIndex !== null && (
          <button
            type="button"
            onClick={clearRom}
            className="text-[11px] text-slate-500 transition-colors hover:text-slate-300"
          >
            Quitar
          </button>
        )}
      </div>

      <ArcBar
        movement={movement}
        activePhaseIndex={activePhaseIndex}
        onSelectPhase={(i) => selectPhase(movement, i)}
      />

      {activePhaseIndex !== null && (
        <PhaseDetail
          movement={movement}
          phaseIndex={activePhaseIndex}
          muscles={musclesForRomLookup(region)}
        />
      )}
    </div>
  );
}

function ArcBar({
  movement,
  activePhaseIndex,
  onSelectPhase,
}: {
  movement: RomMovement;
  activePhaseIndex: number | null;
  onSelectPhase: (phaseIndex: number) => void;
}) {
  const total = movement.totalRangeDeg.max - movement.totalRangeDeg.min || 1;

  return (
    <div>
      {/* Proportional bar -- numbers only, never overflows. */}
      <div className="flex h-8 w-full overflow-hidden rounded-lg bg-slate-900/60">
        {movement.phases.map((phase, i) => {
          const span = phase.endDeg - phase.startDeg;
          const pct = (span / total) * 100;
          const on = i === activePhaseIndex;
          return (
            <button
              key={`${phase.startDeg}-${phase.endDeg}`}
              type="button"
              onClick={() => onSelectPhase(i)}
              style={{ width: `${pct}%` }}
              title={`${phase.label} ${SYM.DOT} ${degRange(phase.startDeg, phase.endDeg)}`}
              className={[
                'flex min-w-0 items-center justify-center border-r border-ink-950/60 transition-colors last:border-r-0',
                on
                  ? 'bg-accent text-ink-950'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200',
              ].join(' ')}
            >
              <span className="text-[11px] font-bold tabular-nums">{i + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Degree ticks aligned to the real phase boundaries. */}
      <div className="mt-1 flex w-full justify-between font-mono text-[10px] text-slate-600">
        <span>{deg(movement.totalRangeDeg.min)}</span>
        {movement.phases.slice(0, -1).map((phase) => (
          <span key={`tick-${phase.endDeg}`}>{deg(phase.endDeg)}</span>
        ))}
        <span>{deg(movement.totalRangeDeg.max)}</span>
      </div>

      {/* Readable phase legend: number + label + range, one row each. */}
      <ul className="mt-2 flex flex-col gap-1">
        {movement.phases.map((phase, i) => {
          const on = i === activePhaseIndex;
          return (
            <li key={`legend-${phase.startDeg}-${phase.endDeg}`}>
              <button
                type="button"
                onClick={() => onSelectPhase(i)}
                className={[
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                  on
                    ? 'bg-accent/15 ring-1 ring-accent/40'
                    : 'hover:bg-slate-900/60',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums',
                    on
                      ? 'bg-accent text-ink-950'
                      : 'bg-slate-800 text-slate-300',
                  ].join(' ')}
                >
                  {i + 1}
                </span>
                <span
                  className={[
                    'flex-1 truncate text-xs font-medium',
                    on ? 'text-accent' : 'text-slate-300',
                  ].join(' ')}
                >
                  {phase.label}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-slate-500">
                  {degRange(phase.startDeg, phase.endDeg)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PhaseDetail({
  movement,
  phaseIndex,
  muscles,
}: {
  movement: RomMovement;
  phaseIndex: number;
  muscles: Muscle[];
}) {
  const phase = movement.phases[phaseIndex];

  const numbering = useMemo(() => {
    if (!phase) return new Map<string, number>();
    return buildRomNumbering(phase.muscles.map((r) => r.muscleId), muscles);
  }, [phase, muscles]);

  if (!phase) return null;

  return (
    <div className="mt-3 rounded-xl bg-slate-900/40 p-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-slate-200">{phase.label}</h4>
        <span className="font-mono text-[11px] text-slate-500">
          {degRange(phase.startDeg, phase.endDeg)}
        </span>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        {phase.description}
      </p>

      <ul className="flex flex-col gap-1.5">
        {phase.muscles.map((ref) => (
          <MuscleChip
            key={ref.muscleId}
            muscleId={ref.muscleId}
            role={ref.role}
            note={ref.note}
            number={numbering.get(ref.muscleId) ?? 0}
            muscles={muscles}
          />
        ))}
      </ul>
    </div>
  );
}

/* ===========================================================================
 * MODE B -- study a muscle
 * ======================================================================== */

function MuscleView({ resolution }: { resolution: MuscleResolution }) {
  const region = useAnatomyStore((s) => s.region);
  const romMuscleId = useAnatomyStore((s) => s.romMuscleId);
  const selectedMuscleId = useAnatomyStore((s) => s.selectedMuscleId);
  const setRomMuscle = useAnatomyStore((s) => s.setRomMuscle);
  const clearRom = useAnatomyStore((s) => s.clearRom);
  const requestFocus = useAnatomyStore((s) => s.requestFocus);

  // The movement list + inverse index for the active region.
  const movements = useMemo(() => romForRegion(region), [region]);
  const romIndex = useMemo(() => buildRomMuscleIndex(movements), [movements]);

  // Region's muscle universe, for Spanish names; only those with ROM data are
  // offered.
  const regionMuscles = musclesForRegion(region);
  const pickable = useMemo(() => {
    return regionMuscles
      .filter((m) => romIndex.has(m.id))
      .map((m) => ({ id: m.id, name: m.name }));
  }, [regionMuscles, romIndex]);

  function studyMuscle(muscleId: string) {
    const parts = romIndex.get(muscleId) ?? [];
    const role = bestRole(parts);
    const highlight = new Map<string, RomMuscleRole>([[muscleId, role]]);
    setRomMuscle(muscleId, highlight);
    const names = resolution.meshNamesByMuscleId.get(muscleId);
    if (names && names.length > 0) requestFocus(names);
  }

  // Mode B follows the muscle selected elsewhere (3D click / MuscleList), but
  // only if that muscle has ROM data IN THIS REGION.
  useEffect(() => {
    if (
      selectedMuscleId != null &&
      selectedMuscleId !== romMuscleId &&
      romIndex.has(selectedMuscleId)
    ) {
      studyMuscle(selectedMuscleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMuscleId, romIndex]);

  // If the studied muscle isn't in this region's index (after a region switch),
  // treat it as none so we don't show stale cross-region data.
  const activeId =
    romMuscleId && romIndex.has(romMuscleId) ? romMuscleId : null;
  const participations = activeId ? romIndex.get(activeId) ?? [] : [];
  const activeName =
    pickable.find((m) => m.id === activeId)?.name ?? activeId ?? '';
  const activeRole = activeId ? bestRole(participations) : null;

  return (
    <div>
      <RoleLegend />

      {/* Muscle picker */}
      <div className="mb-3 flex flex-wrap gap-1">
        {pickable.map((m) => {
          const on = m.id === activeId;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => studyMuscle(m.id)}
              className={[
                'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                on
                  ? 'bg-accent text-ink-950 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              {m.name}
            </button>
          );
        })}
      </div>

      {activeId == null ? (
        <p className="rounded-xl bg-slate-900/40 px-3 py-4 text-center text-xs text-slate-500">
          Elige un musculo para ver en que movimientos y rangos participa.
        </p>
      ) : (
        <div className="rounded-xl bg-slate-900/40 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {activeRole && (
                <NumberBadge n={1} role={activeRole} focused={false} />
              )}
              <h4 className="text-sm font-semibold text-slate-200">
                {activeName}
              </h4>
            </div>
            <button
              type="button"
              onClick={clearRom}
              className="text-[11px] text-slate-500 transition-colors hover:text-slate-300"
            >
              Quitar
            </button>
          </div>

          {participations.length === 0 ? (
            <p className="text-xs text-slate-500">
              Sin datos de movimiento para este musculo.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {participations.map((p, i) => (
                <ParticipationRow
                  key={`${p.movementId}-${p.phaseIndex}-${i}`}
                  part={p}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ParticipationRow({ part }: { part: RomParticipation }) {
  const style = ROLE_STYLE[part.role];
  return (
    <li className={`rounded-lg bg-slate-950/40 px-2.5 py-2 ring-1 ${style.ring}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
        <span className="flex-1 text-xs font-medium text-slate-200">
          {part.movementName}
        </span>
        <span className="font-mono text-[10px] text-slate-500">
          {degRange(part.startDeg, part.endDeg)}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-2 pl-4">
        <span className={`text-[10px] font-medium ${style.text}`}>
          {ROM_ROLE_LABEL[part.role]}
        </span>
        <span className="text-[10px] text-slate-600">
          {SYM.DOT} {part.phaseLabel}
        </span>
      </div>
      {part.note && (
        <p className="mt-1 pl-4 text-[11px] leading-snug text-slate-500">
          {part.note}
        </p>
      )}
    </li>
  );
}

/* ===========================================================================
 * SHARED
 * ======================================================================== */

function MuscleChip({
  muscleId,
  role,
  note,
  number,
  muscles,
}: {
  muscleId: string;
  role: RomMuscleRole;
  note?: string;
  number: number;
  muscles: Muscle[];
}) {
  const style = ROLE_STYLE[role];
  const romFocusMuscleId = useAnatomyStore((s) => s.romFocusMuscleId);
  const setRomFocusMuscle = useAnatomyStore((s) => s.setRomFocusMuscle);
  const focused = romFocusMuscleId === muscleId;

  const name = useMemo(
    () => muscles.find((m) => m.id === muscleId)?.name ?? muscleId,
    [muscles, muscleId],
  );

  return (
    <li
      onMouseEnter={() => setRomFocusMuscle(muscleId)}
      onMouseLeave={() => setRomFocusMuscle(null)}
      className={[
        'cursor-default rounded-lg bg-slate-950/40 px-2.5 py-2 ring-1 transition-all',
        focused ? 'ring-2 ring-white/50 bg-slate-900/60' : style.ring,
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <NumberBadge n={number} role={role} focused={focused} />
        <span className="flex-1 text-xs font-medium text-slate-200">{name}</span>
        <span className={`text-[10px] font-medium ${style.text}`}>
          {ROM_ROLE_LABEL[role]}
        </span>
      </div>
      {note && (
        <p className="mt-1 pl-7 text-[11px] leading-snug text-slate-500">
          {note}
        </p>
      )}
    </li>
  );
}

function bestRole(parts: RomParticipation[]): RomMuscleRole {
  const order: Record<RomMuscleRole, number> = {
    'prime-mover': 3,
    assistant: 2,
    stabilizer: 1,
  };
  let best: RomMuscleRole = 'stabilizer';
  for (const p of parts) {
    if (order[p.role] > order[best]) best = p.role;
  }
  return best;
}
