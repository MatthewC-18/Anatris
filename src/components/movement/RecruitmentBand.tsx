// src/components/movement/RecruitmentBand.tsx
//
// The muscle-recruitment band that fills the bottom of the movement stage.
//
// WHY IT EXISTS
//
// Two problems, one answer.
//
// 1. THE EMPTY STAGE. A standing body is roughly 1:3 and the canvas is roughly
//    4:3, so even with the camera framed on the joint (labFraming.ts) the stage
//    keeps two tall empty gutters. Measured before any of this, the model's
//    silhouette covered 5.4% of the canvas at 1920x1080. Space that wide and
//    short wants a chart, not another panel.
//
// 2. THE PRODUCT'S BEST IDEA WAS A FOOTNOTE. The whole pitch is "move the joint
//    and see who works, how hard, and where". That answer was being delivered as
//    one clipped 10.5px line in the readout — "También Dorsal ancho 90%, Redondo
//    mayor 70%, Subescapular 40%" — which states the values at ONE angle and
//    says nothing about where each muscle enters, peaks or drops out. That is
//    the interesting part, it is already in the data (RomMuscleActivation), and
//    it needs WIDTH, which is exactly what the stage has spare.
//
// So: one lane per muscle, its activation envelope drawn across the whole arc,
// with a playhead on the live angle. At a glance — "the supraspinatus leads to
// 30 deg, then the deltoid takes over" — which is the sentence a physio says out
// loud to a patient.
//
// PERFORMANCE: THE PLAYHEAD IS NOT REACT STATE
//
// rigChannel publishes on every animation frame during playback. Re-rendering
// this component from that would add a full reconcile of ~7 lanes at 30-60 Hz on
// top of the CPU skinning of 1300+ meshes — the exact cost MovementControls
// throttles itself to avoid. So React renders the lanes ONCE per movement, and a
// plain subscription writes the playhead offset and the live percentages
// straight onto the DOM nodes. Same discipline as AtlasLabels.
//
// Movements with no activation envelopes fall back to the arc's PHASE strip,
// which is real teaching content rather than an empty box.
//
// UI strings Spanish LATAM; ASCII-only identifiers; no `any`.

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { rigChannel, type RigCommand } from './RigModel';
import { romForRegion } from '../../data/romByRegion';
import { buildLabArc, muscleNameById } from '../../lib/romPhaseAtAngle';
import { levelAt } from '../../lib/romActivation';
import type { RomMuscleRole } from '../../types/rom';

/**
 * How many lanes the band shows, ordered by peak recruitment so the ones that
 * get dropped are genuinely the bit players.
 *
 * Seven at 18px each. Two failed settings got us here: seven at 14px made every
 * envelope read as a solid bar rather than a curve, losing the one thing the
 * chart is for (WHERE a muscle enters and peaks); five at 20px read beautifully
 * but shoulder abduction carries TEN envelopes, so the cut dropped the latissimus
 * while the readout beside it was announcing that same muscle at 90%. A chart
 * that contradicts the panel next to it is worse than a cramped one.
 *
 * Anything past seven is listed as a count instead (see `hiddenCount`).
 */
const MAX_LANES = 7;

/** Samples per envelope. 64 is smooth at any width the stage can be. */
const SAMPLES = 64;

/** Lane fill / stroke per role. Mirrors the `role` palette in tailwind.config. */
const ROLE_COLOR: Record<RomMuscleRole, string> = {
  'prime-mover': '#f59e0b',
  assistant: '#38bdf8',
  stabilizer: '#a78bfa',
};

const ROLE_SHORT: Record<RomMuscleRole, string> = {
  'prime-mover': 'Motor',
  assistant: 'Asistente',
  stabilizer: 'Estabilizador',
};

interface Lane {
  muscleId: string;
  name: string;
  role: RomMuscleRole;
  /** Filled-area path in a 0..100 x 0..10 viewBox, stretched by the browser. */
  area: string;
  /** Just the envelope's top edge, so the stroke doesn't outline the baseline. */
  line: string;
  /** The envelope, kept so the imperative tick can read the live level. */
  curve: { deg: number; level: number }[];
  /** Where this muscle peaks, in degrees — the lane's headline fact. */
  peakDeg: number;
}

export function RecruitmentBand({ region }: { region: string | null }) {
  // Only the identity of the movement drives a re-render. The angle does NOT:
  // see the performance note above.
  const movementId = useMovementId();

  const model = useMemo(() => {
    if (!movementId) return null;
    const movement = romForRegion(region).find((m) => m.id === movementId);
    if (!movement) return null;
    const arc = buildLabArc(movement);
    const span = arc.max - arc.min;
    if (span <= 0) return null;

    const acts = movement.activations ?? [];
    const hiddenCount = Math.max(0, acts.length - MAX_LANES);
    const lanes: Lane[] = acts
      .map((a) => {
        let peakDeg = arc.min;
        let peak = -1;
        const pts: string[] = [];
        for (let i = 0; i < SAMPLES; i++) {
          const t = i / (SAMPLES - 1);
          const deg = arc.min + t * span;
          const lvl = levelAt(a.curve, deg);
          if (lvl > peak) {
            peak = lvl;
            peakDeg = deg;
          }
          pts.push(`${(t * 100).toFixed(2)},${(10 - lvl * 10).toFixed(2)}`);
        }
        return {
          muscleId: a.muscleId,
          name: muscleNameById(region ?? '', a.muscleId),
          role: a.role,
          area: `M0,10 L${pts.join(' L')} L100,10 Z`,
          line: `M${pts.join(' L')}`,
          curve: a.curve,
          peakDeg,
          peak,
        };
      })
      // Strongest envelope first, so the protagonist is the top lane and the
      // ones cut by MAX_LANES are the quietest.
      .sort((x, y) => y.peak - x.peak)
      .slice(0, MAX_LANES);

    return { movement, arc, span, lanes, hiddenCount };
  }, [movementId, region]);

  const playheadRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef<HTMLSpanElement>(null);
  const pctRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Imperative tick: one style write for the playhead plus one text write per
  // lane, straight onto the DOM. No React state, so playback costs nothing here.
  useEffect(() => {
    if (!model) return;
    const { arc, span, lanes } = model;

    const paint = (cmd: RigCommand): void => {
      const deg = Math.max(arc.min, Math.min(cmd.angleDeg, arc.max));
      const pct = ((deg - arc.min) / span) * 100;
      if (playheadRef.current) playheadRef.current.style.left = `${pct}%`;
      if (angleRef.current) angleRef.current.textContent = `${Math.round(deg)}°`;
      for (let i = 0; i < lanes.length; i++) {
        const el = pctRefs.current[i];
        if (!el) continue;
        const lvl = Math.round(levelAt(lanes[i].curve, deg) * 100);
        el.textContent = `${lvl}%`;
        // Dim a lane that is currently silent, so the eye goes to who is working
        // right now without the band having to re-render.
        el.parentElement?.style.setProperty('opacity', lvl < 3 ? '0.35' : '1');
      }
    };

    paint(rigChannel.get());
    return rigChannel.subscribe(paint);
  }, [model]);

  if (!model) return null;
  const { movement, arc, lanes, hiddenCount } = model;

  // No activation envelopes for this movement: show the arc's phases instead of
  // an empty frame. Still the most useful thing this strip can say.
  if (lanes.length === 0) {
    return (
      <BandShell title="Fases del arco" angleRef={angleRef}>
        <div className="relative">
          <div className="flex h-6 gap-px overflow-hidden rounded-md">
            {arc.phases.map((p, i) => {
              const w = ((p.endDeg - p.startDeg) / (arc.max - arc.min)) * 100;
              return (
                <div
                  key={`${p.label}-${i}`}
                  className="flex min-w-0 items-center justify-center bg-slate-100/[0.06] px-2"
                  style={{ width: `${Math.max(w, 2)}%` }}
                  title={`${p.label} · ${Math.round(p.startDeg)}° a ${Math.round(p.endDeg)}°`}
                >
                  <span className="truncate text-[10px] text-slate-400">{p.label}</span>
                </div>
              );
            })}
          </div>
          <Playhead innerRef={playheadRef} />
        </div>
        <AxisRow arc={arc} />
      </BandShell>
    );
  }

  return (
    <BandShell
      title="Reclutamiento muscular"
      subtitle={movement.name}
      angleRef={angleRef}
    >
      <div className="flex gap-3">
        {/* Names + live level. Fixed width so every lane lines up. */}
        <div className="w-[9.5rem] shrink-0">
          {lanes.map((l, i) => (
            <div
              key={l.muscleId}
              className="flex h-[18px] items-center gap-1.5 transition-opacity"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: ROLE_COLOR[l.role] }}
                title={ROLE_SHORT[l.role]}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-[11px] text-slate-300" title={l.name}>
                {l.name}
              </span>
              <span
                ref={(el) => {
                  pctRefs.current[i] = el;
                }}
                className="shrink-0 font-mono text-[10px] tabular-nums text-slate-500"
              >
                0%
              </span>
            </div>
          ))}
        </div>

        {/* Envelopes. The viewBox is stretched horizontally on purpose — there is
            no text inside, so non-uniform scaling costs nothing and saves a
            ResizeObserver on a element that resizes with every panel. */}
        <div className="relative min-w-0 flex-1">
          {lanes.map((l) => (
            <div
              key={l.muscleId}
              className="h-[18px] border-b border-slate-100/[0.06] py-[2px] last:border-b-0"
            >
              <svg
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
                className="h-full w-full"
                aria-hidden="true"
              >
                <path d={l.area} fill={ROLE_COLOR[l.role]} fillOpacity={0.26} />
                {/* Only the TOP edge is stroked, not the closing baseline: a
                    stroked `Z` draws a bright rule under every lane and the band
                    turns into a stack of boxes. */}
                <path
                  d={l.line}
                  fill="none"
                  stroke={ROLE_COLOR[l.role]}
                  strokeOpacity={0.9}
                  strokeWidth={1.25}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          ))}
          <Playhead innerRef={playheadRef} />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="w-[9.5rem] shrink-0">
          {hiddenCount > 0 && (
            <span className="text-[9px] text-slate-600">
              +{hiddenCount} músculo{hiddenCount > 1 ? 's' : ''} menor
              {hiddenCount > 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <AxisRow arc={arc} />
        </div>
      </div>
    </BandShell>
  );
}

/**
 * Which movement is loaded, and nothing else.
 *
 * A PRIMITIVE snapshot, deliberately: `useSyncExternalStore` compares with
 * Object.is, so returning a fresh object or tuple would report a change on every
 * one of the ~60 commands a second playback emits and re-render the whole band —
 * exactly what the imperative playhead exists to avoid. A string compares equal
 * and React bails out, so this only re-renders when the user picks another arc.
 *
 * The side is not part of it: activation envelopes and muscle names are the same
 * for both limbs, so the lanes are unchanged by a left/right flip.
 */
function useMovementId(): string | null {
  return useSyncExternalStore(
    rigChannel.subscribe,
    () => rigChannel.get().movementId,
    () => rigChannel.get().movementId,
  );
}

function Playhead({ innerRef }: { innerRef: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={innerRef}
      className="pointer-events-none absolute inset-y-0 w-px bg-slate-100/80"
      style={{ left: '0%' }}
      aria-hidden="true"
    >
      <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-slate-100" />
    </div>
  );
}

function AxisRow({ arc }: { arc: { min: number; max: number } }) {
  const span = arc.max - arc.min;
  const zeroPct = arc.min < 0 && arc.max > 0 ? ((0 - arc.min) / span) * 100 : null;
  return (
    <div className="relative mt-1 h-3">
      <span className="absolute left-0 font-mono text-[9px] text-slate-600">
        {Math.round(arc.min)}°
      </span>
      {zeroPct != null && (
        <span
          className="absolute -translate-x-1/2 font-mono text-[9px] text-clinical-soft/70"
          style={{ left: `${zeroPct}%` }}
        >
          0°
        </span>
      )}
      <span className="absolute right-0 font-mono text-[9px] text-slate-600">
        {Math.round(arc.max)}°
      </span>
    </div>
  );
}

function BandShell({
  title,
  subtitle,
  angleRef,
  children,
}: {
  title: string;
  subtitle?: string;
  angleRef: React.Ref<HTMLSpanElement>;
  children: React.ReactNode;
}) {
  return (
    <div className="instrument pointer-events-auto w-full overflow-hidden px-4 py-2.5">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="kicker">{title}</span>
        {subtitle && (
          <span className="min-w-0 truncate text-[10px] text-slate-500">{subtitle}</span>
        )}
        <span
          ref={angleRef}
          className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-slate-300"
        >
          0°
        </span>
      </div>
      {children}
    </div>
  );
}
