// src/components/movement/RhythmReadout.tsx
//
// The movement lab's clinical READOUT, floated TOP-LEFT (in the margin, never
// over the model). It is the single home for the "support" content a physio
// reads while the joint sweeps, styled after the Universite Lyon anatomie3d
// "intervencion de los segmentos oseos en los 4 sectores" plates:
//
//   1. SECTOR GONIOMETER. A goniometer dial mapped to the movement's own signed
//      arc, with the clinical PHASES drawn as sectors (dividers + the active
//      sector lit), a needle, the 0 neutral tick and the big signed angle.
//   2. HUMERO-ESCAPULO-RAQUIDEO RHYTHM (shoulder elevation only). The cumulative
//      split of the elevation between glenohumeral (humero), scapula and trunk
//      (raquis) at the current angle, as a proportion bar + degrees + ratio --
//      exactly the Lyon "proporciones de intervencion" idea.
//   3. PROTAGONIST MUSCLE. The muscle carrying the movement right now, its role
//      and live recruitment %, plus the other active muscles in one line.
//
// READ-ONLY: it subscribes to the SAME rigChannel the controller drives
// (movementId + side + signed angleDeg) and recomputes everything with the SAME
// pure helpers (shoulderChain / romActivation / romPhaseAtAngle), so it never
// invents a claim and never drifts from the glow on the model. pointer-events-none
// = drag-through; renders null in the rest pose.
//
// UI strings Spanish LATAM; code/ids ASCII; no `any`.

import { useEffect, useMemo, useState } from 'react';
import { rigChannel, type RigCommand } from './RigModel';
import { movementById } from '../../data/romByRegion';
import { getBoneControl, type Side } from '../../lib/boneMap';
import { shoulderChain } from '../../lib/biomech/shoulderChain';
import { kneeScrewHome, type ScrewHomeZone } from '../../lib/biomech/kneeCoupling';
import { cervicalRotationSplit } from '../../lib/biomech/cervicalCoupling';
import { lumbopelvicRhythm } from '../../lib/biomech/lumbarCoupling';
import {
  buildLabArc,
  phaseAtAngleIn,
  muscleNameById,
} from '../../lib/romPhaseAtAngle';
import { activeMusclesAt, type ActiveMuscle } from '../../lib/romActivation';
import { ROM_ROLE_LABEL, type RomMuscleRole } from '../../types/rom';
import { getReference } from '../../data/references';
import type { Citation } from '../../types/muscleContent';
import { pathologyById } from '../../data/pathologies';

/** Role -> text color / swatch / chip (matches the app role palette). */
const ROLE_TEXT: Record<RomMuscleRole, string> = {
  'prime-mover': 'text-amber-300',
  assistant: 'text-sky-300',
  stabilizer: 'text-violet-300',
};
const ROLE_CHIP: Record<RomMuscleRole, string> = {
  'prime-mover': 'text-amber-300/90',
  assistant: 'text-sky-300/90',
  stabilizer: 'text-violet-300/90',
};
/** Left edge of the protagonist section: the role, as a color, without a box. */
const ROLE_CARD: Record<RomMuscleRole, string> = {
  'prime-mover': 'border-amber-400/70',
  assistant: 'border-sky-400/70',
  stabilizer: 'border-violet-400/70',
};

const SIDE_SHORT: Record<Side, string> = { R: 'Der.', L: 'Izq.' };

// Clinical-flag tones: a caution ("arco doloroso") vs a teaching pearl. Kept
// distinct from BOTH the muscle-role hues and the rhythm-segment hues so the
// three readouts never blur together.
const FLAG_TONE = {
  warn: {
    card: 'border-amber-400/70 bg-amber-500/[0.09]',
    dot: 'bg-amber-400',
    text: 'text-amber-200',
  },
  pearl: {
    card: 'border-teal-400/70 bg-teal-500/[0.09]',
    dot: 'bg-teal-400',
    text: 'text-teal-200',
  },
} as const;

// Knee screw-home zones: label + clinical note + chip/bar colors. The locked zone
// (near full extension) reads emerald (stable), the unlocking zone amber (popliteus
// working), the free zone slate (coupling spent).
const SCREW_ZONE: Record<
  ScrewHomeZone,
  { label: string; note: string; chip: string; bar: string }
> = {
  locked: {
    label: 'Bloqueada',
    note: 'Rotación externa tibial máxima: los cruzados se tensan y bloquean la rodilla (bipedestación casi sin esfuerzo muscular).',
    chip: 'text-emerald-300',
    bar: '#34d399',
  },
  unlocking: {
    label: 'Desbloqueando',
    note: 'El poplíteo rota la tibia internamente y deshace el tornillo para que arranque la flexión.',
    chip: 'text-amber-300',
    bar: '#fbbf24',
  },
  free: {
    label: 'Libre',
    note: 'Pasados los ~30°, el tornillo ya está deshecho: la rotación acoplada es mínima y la rotación tibial pasa a ser voluntaria.',
    chip: 'text-slate-300',
    bar: '#64748b',
  },
};

/** Short source label from a phase's citations, e.g. "Kapandji, Oatis". Dedups
 *  and takes the lead surname so the sector card can name its source honestly
 *  without a full Vancouver string. */
function citeLabel(cites: Citation[]): string {
  const names: string[] = [];
  for (const c of cites) {
    const ref = getReference(c.ref);
    const name = ref ? ref.authors.split(/[ ,]/)[0] : c.ref;
    if (!names.includes(name)) names.push(name);
  }
  return names.join(', ');
}

// Segment colors for the humero-escapulo-raquideo rhythm bar (distinct from the
// muscle-role hues so the two readouts never get confused).
const SEG = {
  humerus: { hex: '#22d3ee', dot: 'bg-cyan-400', text: 'text-cyan-300', label: 'Húmero' },
  scapula: { hex: '#fbbf24', dot: 'bg-amber-400', text: 'text-amber-300', label: 'Escápula' },
  trunk: { hex: '#34d399', dot: 'bg-emerald-400', text: 'text-emerald-300', label: 'Tronco' },
} as const;

// --- Goniometer dial geometry. A top semicircle: t=0 at the left end, t=1 at the
// right, so the needle sweeps left->right as the angle grows.
const CX = 100;
const CY = 92;
const R = 76;

function polar(t: number, radius: number = R): { x: number; y: number } {
  const tt = t < 0 ? 0 : t > 1 ? 1 : t;
  const th = Math.PI * (1 - tt);
  return { x: CX + radius * Math.cos(th), y: CY - radius * Math.sin(th) };
}

/** Live viewport height, so the readout can shed its optional rows (clinical note,
 *  "también" line) on short screens and never overlap the bottom-left controller. */
function useViewportHeight(): number {
  const [h, setH] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 900,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const on = () => setH(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return h;
}

/** SVG arc path along the dial radius between two fractions (both <= a semicircle). */
function arcPath(t0: number, t1: number, radius: number = R): string {
  const a = polar(t0, radius);
  const b = polar(t1, radius);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/** One coloured segment of a "reparto" split bar. */
interface SplitSeg {
  label: string;
  /** Contribution in degrees (shown in the legend). */
  deg: number;
  /** Share 0..100 (bar width). */
  pct: number;
  /** Bar fill hex. */
  hex: string;
  /** Legend dot bg class. */
  dot: string;
  /** Legend value text class. */
  text: string;
}

/**
 * Compact 2-segment "reparto" card (bar + legend + optional note + source) — the
 * shared shell behind the cervical C1-C2 split and the lumbopelvic rhythm, styled
 * to match the shoulder humero-escapulo rhythm card.
 */
function SegmentSplitCard({
  title,
  ratio,
  segs,
  note,
  source,
  showNote,
}: {
  title: string;
  ratio?: string;
  segs: SplitSeg[];
  note?: string;
  source: string;
  showNote: boolean;
}): JSX.Element {
  return (
    <>
      <div className="hairline" />
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="kicker">{title}</span>
          {ratio && (
            <span className="font-mono text-[11px] font-semibold tabular-nums text-amber-200">
              {ratio}
            </span>
          )}
        </div>
        <div
          className="mt-2 flex h-[5px] w-full gap-[2px] overflow-hidden rounded-full bg-slate-800/80"
          aria-hidden="true"
        >
          {segs.map((s) => (
            <span
              key={s.label}
              className="h-full rounded-full transition-[width] duration-150"
              style={{ width: `${s.pct}%`, backgroundColor: s.hex }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-1">
          {segs.map((s) => (
            <span key={s.label} className="flex items-baseline gap-1.5">
              <span className={`h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full ${s.dot}`} />
              <span className="text-[10px] text-slate-400">{s.label}</span>
              <span className={`font-mono text-[12px] font-semibold tabular-nums ${s.text}`}>
                {Math.round(s.deg)}°
              </span>
            </span>
          ))}
        </div>
        {showNote && note && (
          <p className="mt-2 text-[10.5px] leading-snug text-slate-400">{note}</p>
        )}
        <p className="mt-2 text-[9px] tracking-[0.08em] text-slate-600">Fuente: {source}</p>
      </div>
    </>
  );
}

interface RhythmReadoutProps {
  region: string | null;
  /**
   * True when this readout is the TOP SECTION of the left column's single
   * instrument surface (the console is the bottom section). Embedded, it drops
   * its own panel chrome so the column reads as one instrument instead of two
   * stacked cards, and it keeps its header even with no muscle data, because
   * that header is the whole panel's identity.
   */
  embedded?: boolean;
}

export function RhythmReadout({ region, embedded = false }: RhythmReadoutProps) {
  const [cmd, setCmd] = useState<
    Pick<RigCommand, 'movementId' | 'side' | 'angleDeg' | 'pathologyId' | 'demo'>
  >(() => {
    const c = rigChannel.get();
    return {
      movementId: c.movementId,
      side: c.side,
      angleDeg: c.angleDeg,
      pathologyId: c.pathologyId ?? null,
      demo: c.demo ?? null,
    };
  });
  useEffect(() => {
    return rigChannel.subscribe((c) =>
      setCmd((prev) =>
        prev.movementId === c.movementId &&
        prev.side === c.side &&
        prev.angleDeg === c.angleDeg &&
        (prev.pathologyId ?? null) === (c.pathologyId ?? null) &&
        (prev.demo ?? null) === (c.demo ?? null)
          ? prev
          : {
              movementId: c.movementId,
              side: c.side,
              angleDeg: c.angleDeg,
              pathologyId: c.pathologyId ?? null,
              demo: c.demo ?? null,
            },
      ),
    );
  }, []);

  const movement = useMemo(() => movementById(cmd.movementId), [cmd.movementId]);
  const control = cmd.movementId ? getBoneControl(cmd.movementId) : undefined;
  const drivable = !!movement && !!control && control.kind !== 'unsupported';
  const isSpine = control?.kind === 'spine';
  const isChain = control?.kind === 'chain';
  // Why the model is not standing at anatomical zero. Shoulder rotation opens
  // with the elbow at 90 because that is the position it is READ in, and a user
  // who is not told that just sees a bent elbow they did not ask for.
  const examPosture = control?.kind === 'joint' ? control.posture?.[0] : undefined;
  const arc = useMemo(() => (movement ? buildLabArc(movement) : null), [movement]);
  const muscleRegion = movement?.region ?? region ?? 'shoulder';
  const angle = cmd.angleDeg;
  // P1: active pathological preset (null = Normal). Alters the rhythm below.
  const pathology = pathologyById(cmd.pathologyId);

  const at = arc ? phaseAtAngleIn(arc.phases, angle) : null;

  // Live per-muscle recruitment, strongest first (phase-list fallback, motors
  // first). Same model the controller pushes to the scene glow.
  const live: ActiveMuscle[] = useMemo(() => {
    if (!movement) return [];
    const active = activeMusclesAt(movement, angle);
    if (active.length > 0) return active;
    const phase = arc ? phaseAtAngleIn(arc.phases, angle) : null;
    const rank: Record<RomMuscleRole, number> = {
      'prime-mover': 0,
      assistant: 1,
      stabilizer: 2,
    };
    return (phase?.phase.muscles ?? [])
      .map((m) => ({ muscleId: m.muscleId, role: m.role, level: 1, note: m.note }))
      .sort((a, b) => rank[a.role] - rank[b.role]);
  }, [movement, angle, arc]);

  // Humero-escapulo-raquideo split (cumulative at the current angle). Only the
  // shoulder elevation chain decomposes this, and only above neutral.
  const rhythm = useMemo(() => {
    if (!isChain || angle <= 0) return null;
    const r = shoulderChain(angle, cmd.side, pathology?.shoulderMod).readout;
    const gh = Math.max(0, r.ghDeg);
    const sc = Math.max(0, r.scapulaDeg);
    const tr = Math.max(0, r.trunkDeg);
    const total = gh + sc + tr;
    if (total <= 0) return null;
    // When a pathology is active, keep the NORMAL ratio at this angle as a
    // reference so the alteration reads as "X:1 vs normal Y:1".
    const normalRatio = pathology ? shoulderChain(angle, cmd.side).readout.ratio : null;
    return {
      gh,
      sc,
      tr,
      ratio: r.ratio,
      normalRatio,
      ghPct: (gh / total) * 100,
      scPct: (sc / total) * 100,
      trPct: (tr / total) * 100,
    };
  }, [isChain, angle, cmd.side, pathology]);

  // Knee screw-home coupling (the knee's "rhythm equivalent"): the automatic tibial
  // rotation locked to sagittal flexion/extension. Only for the knee sagittal
  // gestures; the transverse tibial-rotation movements don't show it.
  const isKneeSagittal =
    cmd.movementId === 'knee-flexion' || cmd.movementId === 'knee-extension';
  const screwHome = useMemo(
    () => (isKneeSagittal ? kneeScrewHome(angle) : null),
    [isKneeSagittal, angle],
  );

  // Cervical rotation split (atlanto-axial vs subaxial) and lumbopelvic rhythm —
  // the "rhythm equivalents" for the neck and the trunk. Each only on its gesture.
  const cervicalSplit = useMemo(
    () => (cmd.movementId === 'cervical-rotation' ? cervicalRotationSplit(angle) : null),
    [cmd.movementId, angle],
  );
  const lumboPelvic = useMemo(
    () => (cmd.movementId === 'lumbar-flexion' ? lumbopelvicRhythm(angle) : null),
    [cmd.movementId, angle],
  );

  // Read viewport height BEFORE any early return so hook order stays stable.
  const vh = useViewportHeight();

  if (!drivable || !arc) return null;

  // With no activation data the panel still carries the gesture and the dial;
  // only the protagonist section drops out. (Returning null there would have
  // left the embedded console headerless.)
  const hero = live[0] ?? null;
  const others = live.slice(1, 4);

  // Optional rows are shed on short viewports so the readout never collides with
  // the bottom-left controller; on normal screens the full clinical detail shows.
  const showDescription = vh >= 780;
  const showAlso = vh >= 850;
  // On laptop-height screens the readout shares its column with the console, so it
  // tightens: smaller dial, tighter sections and no per-section source lines (the
  // full attribution lives in the region's "Evidencia" screen). The EMG framing at
  // the foot is never shed.
  const compact = vh < 860;
  const padY = compact ? 'py-2' : 'py-3';

  const displayAngle = Math.round(angle);
  const gestureName =
    angle < 0 && movement?.labReverse ? movement.labReverse.name : movement?.name;

  // A maneuver is being DEMONSTRATED (orthopedic test / myotome). While it runs
  // the angle sweeps, so every per-angle reading below — the sector, the rhythm,
  // the recruited muscles and their percentages — would recompute on every frame
  // and be unreadable. The panel switches to a FIXED description of the maneuver
  // instead; the dial keeps showing the live angle, because motion is what a dial
  // is for.
  const demo = cmd.demo ?? null;

  // Dial mapping.
  const span = arc.max - arc.min;
  const t = span === 0 ? 0 : (angle - arc.min) / span;
  const clampT = t < 0 ? 0 : t > 1 ? 1 : t;
  const knob = polar(clampT, R);
  const needle = polar(clampT, R - 14);
  const bidir = arc.min < 0 && arc.max > 0;
  const neutralT = bidir ? (0 - arc.min) / span : null;
  const neutralInner = neutralT != null ? polar(neutralT, R - 6) : null;
  const neutralOuter = neutralT != null ? polar(neutralT, R + 8) : null;

  // Phase sectors along the dial.
  const sectorT = (deg: number) => (span === 0 ? 0 : (deg - arc.min) / span);

  return (
    // A column, so the pieces that must never be lost (the gesture header, the
    // goniometer, the protagonist muscle and the EMG framing) keep their space and
    // only the middle clinical prose gives way when the viewport is short.
    <div
      className={`pointer-events-none flex max-h-full w-full flex-col overflow-hidden ${
        embedded ? '' : 'instrument animate-scale-in'
      }`}
    >
      {/* Header: live indicator, gesture, plane and side. */}
      <div className={`shrink-0 px-4 ${compact ? 'pt-3 pb-2.5' : 'pt-3.5 pb-3'}`}>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <span className="kicker text-slate-400">
            {demo ? 'Demostración' : 'Análisis en vivo'}
          </span>
        </div>

        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-display text-[15px] font-semibold leading-tight text-slate-50">
              {demo ? demo.label : gestureName}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-slate-500">
              {demo ? gestureName : movement?.joint}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1 text-[9px] font-semibold uppercase tracking-[0.12em]">
            {movement?.plane && <span className="text-slate-500">{movement.plane}</span>}
            {!isSpine && <span className="text-accent">{SIDE_SHORT[cmd.side]}</span>}
          </div>
        </div>
      </div>

      {/* P1: pathological state banner — what preset is active and WHY it hurts,
          with the implicated structure and its source. Amber = caution. */}
      {pathology && (
        <div className={`shrink-0 border-l-2 border-amber-400/70 bg-amber-500/[0.08] px-4 ${padY}`}>
          <div className="flex items-center gap-2">
            <span className="kicker text-amber-300/80">Patológico</span>
            <span className="min-w-0 truncate text-[11px] font-semibold text-amber-100">
              {pathology.name}
            </span>
          </div>
          <p
            className="mt-1.5 text-[10.5px] leading-snug text-amber-100/85"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: showDescription ? 3 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {pathology.whyItHurts}
          </p>
          {pathology.implicated.length > 0 && (
            <p className="mt-1.5 text-[10px] text-amber-200/70">
              Estructura clave:{' '}
              {pathology.implicated
                .map((id) => muscleNameById(muscleRegion, id))
                .join(', ')}
            </p>
          )}
          {!compact && (
            <p className="mt-1.5 text-[9px] tracking-[0.08em] text-amber-200/50">
              Fuente: {citeLabel(pathology.cite)}
            </p>
          )}
        </div>
      )}

      {/* Examination position: why the model does not start at anatomical zero. */}
      {examPosture && (
        <div className={`shrink-0 border-l-2 border-sky-400/60 bg-sky-500/[0.07] px-4 ${padY}`}>
          <div className="flex items-center gap-2">
            <span className="kicker text-sky-300/80">Posición de exploración</span>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-snug text-sky-100/85">
            {examPosture.reason}
          </p>
        </div>
      )}

      {/* Sector goniometer + big signed angle */}
      <div className="hairline" />
      <div
        className={`relative mx-auto w-full shrink-0 max-w-[208px] ${compact ? 'mt-1.5 h-[62px]' : 'mt-2 h-[74px]'}`}
      >
        <svg viewBox="0 0 200 100" className="h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="rr-arc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="55%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>
          </defs>

          {/* Track */}
          <path d={arcPath(0, 1)} fill="none" stroke="#1e293b" strokeWidth={9} strokeLinecap="round" />

          {/* Active sector highlight (the phase the current angle is in) */}
          {at && (
            <path
              d={arcPath(sectorT(at.phase.startDeg), sectorT(at.phase.endDeg))}
              fill="none"
              stroke="#0e7490"
              strokeOpacity={0.55}
              strokeWidth={9}
            />
          )}

          {/* Progress up to the current angle */}
          <path
            d={arcPath(0, 1)}
            fill="none"
            stroke="url(#rr-arc)"
            strokeWidth={9}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={(1 - clampT) * 100}
            style={{ transition: 'stroke-dashoffset 150ms ease-out' }}
          />

          {/* Sector divider ticks at every phase boundary */}
          {arc.phases.map((p) => {
            const a = polar(sectorT(p.endDeg), R - 5);
            const b = polar(sectorT(p.endDeg), R + 5);
            return (
              <line
                key={`div-${p.endDeg}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#0b1120"
                strokeWidth={2}
              />
            );
          })}

          {/* Neutral (0 deg) tick */}
          {neutralInner && neutralOuter && (
            <line
              x1={neutralInner.x}
              y1={neutralInner.y}
              x2={neutralOuter.x}
              y2={neutralOuter.y}
              stroke="#34d399"
              strokeWidth={2}
              strokeLinecap="round"
            />
          )}

          {/* Needle + hub + knob */}
          <line
            x1={CX}
            y1={CY}
            x2={needle.x}
            y2={needle.y}
            stroke="#e2e8f0"
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ transition: 'all 150ms ease-out' }}
          />
          <circle cx={CX} cy={CY} r={4.5} fill="#0b1120" stroke="#475569" strokeWidth={1.5} />
          <circle
            cx={knob.x}
            cy={knob.y}
            r={5}
            fill="#22d3ee"
            stroke="#0b1120"
            strokeWidth={2}
            style={{ transition: 'all 150ms ease-out' }}
          />
        </svg>

        {/* Big signed angle, seated in the dial opening */}
        <div className="pointer-events-none absolute inset-x-0 top-[54%] flex -translate-y-1/2 flex-col items-center">
          <div className="font-display text-[1.65rem] font-bold leading-none tabular-nums text-slate-50">
            {displayAngle}
            <span className="text-lg text-slate-400">°</span>
          </div>
        </div>
      </div>

      {/* SECTOR CLÍNICO — the clinical "why" of the current sector, promoted from a
          clamped footnote to a protagonist card: sector label + scale, an optional
          clinical flag banner (arco doloroso / pearl), the biomechanical prose and
          its source. The flag is tiny and always shows; the prose is shed on short
          viewports so the panel height stays bounded. */}
      {/* Shrinkable middle: sector prose and the coupling readouts. On a short
          screen this is what gives way, so its last few pixels fade out: a cut
          line reads as a rendering bug, a fade reads as "there is more". When
          nothing is clipped the fade lands on the section's padding and is
          invisible. */}
      <div
        className="min-h-0 flex-1 overflow-hidden"
        style={{
          maskImage: 'linear-gradient(180deg, #000 calc(100% - 14px), transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 14px), transparent)',
        }}
      >
      {/* DEMO CARD. Fixed for the whole maneuver: what position is being held,
          on what structure, and — for a resisted test — where the physio pushes.
          This is what replaces the per-frame analysis while a demo runs. */}
      {demo && (
        <>
          <div className="hairline" />
          <div className={`px-4 ${padY}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="kicker">Posición de prueba</span>
              <span className="font-mono text-[13px] font-semibold tabular-nums text-accent">
                {Math.round(demo.targetDeg)}°
              </span>
            </div>
            {demo.structure && (
              <p className="mt-1.5 text-[11px] leading-snug text-slate-300">
                Evalúa <span className="font-semibold text-slate-100">{demo.structure}</span>
              </p>
            )}

            {demo.resisted && (
              <div className="mt-2 border-l-2 border-[#ffb877]/70 bg-[#ffb877]/[0.09] py-1.5 pl-2.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#ffb877]">
                  Prueba resistida
                </span>
                <ol className="mt-1 space-y-1 text-[10.5px] leading-snug text-slate-200">
                  <li>1. El paciente sostiene la posición y empuja.</li>
                  <li>
                    2. Aplica resistencia en el segmento distal, donde se apoya la mano
                    del fisio en el modelo.
                  </li>
                </ol>
              </div>
            )}

            {showDescription && demo.note && (
              <p className="mt-2 text-[10.5px] leading-snug text-slate-400">{demo.note}</p>
            )}
          </div>
        </>
      )}

      {at && !demo && (
        <>
          <div className="hairline" />
          <div className={`px-4 ${padY}`}>
            {/* Sector label only. The figure that used to sit at the right was
                the FULL arc, not this sector's range, so next to a sector name
                it read as a contradiction — and the console prints the arc a
                few rows below anyway. */}
            <span className="block text-[12px] font-semibold leading-tight text-accent">
              {at.phase.label}
            </span>

            {/* Clinical flag (caution / pearl): a tinted band with a colored edge,
                not a box inside a box. */}
            {at.phase.flag && (
              <div
                className={`mt-2 flex items-start gap-2 border-l-2 py-1 pl-2.5 ${FLAG_TONE[at.phase.flag.tone].card}`}
              >
                <span className="min-w-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.1em] ${FLAG_TONE[at.phase.flag.tone].text}`}
                  >
                    {at.phase.flag.label}
                  </span>
                  {at.phase.flag.detail && (
                    <span className="mt-0.5 block text-[10.5px] leading-snug text-slate-200">
                      {at.phase.flag.detail}
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Biomechanical prose (inline clamp; shed on short viewports). */}
            {showDescription && at.phase.description && (
            <p
              className="mt-2 text-[11px] leading-snug text-slate-300"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {at.phase.description}
            </p>
          )}

            {/* Source of the sector claim (honest attribution, not a footnote). */}
            {!compact && at.phase.cite.length > 0 && (
              <p className="mt-2 text-[9px] tracking-[0.08em] text-slate-600">
                Fuente: {citeLabel(at.phase.cite)}
              </p>
            )}
          </div>
        </>
      )}

      {/* Humero-escapulo-raquideo rhythm (shoulder elevation only) */}
      {rhythm && !demo && (
        <>
          <div className="hairline" />
          <div className={`px-4 ${padY}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="kicker">Ritmo húmero-escápulo-raquídeo</span>
              <span className="font-mono text-[11px] font-semibold tabular-nums text-amber-200">
                {rhythm.ratio}
                {rhythm.normalRatio && (
                  <span className="ml-1 font-normal text-slate-500">
                    de {rhythm.normalRatio} normal
                  </span>
                )}
              </span>
            </div>
            {/* Proportion bar */}
            <div className="mt-2 flex h-[5px] w-full gap-[2px] overflow-hidden rounded-full bg-slate-800/80" aria-hidden="true">
              <span className="h-full rounded-full transition-[width] duration-150" style={{ width: `${rhythm.ghPct}%`, backgroundColor: SEG.humerus.hex }} />
              <span className="h-full rounded-full transition-[width] duration-150" style={{ width: `${rhythm.scPct}%`, backgroundColor: SEG.scapula.hex }} />
              <span className="h-full rounded-full transition-[width] duration-150" style={{ width: `${rhythm.trPct}%`, backgroundColor: SEG.trunk.hex }} />
            </div>
            {/* Legend + degrees (single compact row) */}
            <div className="mt-2 flex items-center justify-between gap-1">
              {([
                { s: SEG.humerus, deg: rhythm.gh },
                { s: SEG.scapula, deg: rhythm.sc },
                { s: SEG.trunk, deg: rhythm.tr },
              ] as const).map(({ s, deg }) => (
                <span key={s.label} className="flex items-baseline gap-1.5">
                  <span className={`h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full ${s.dot}`} />
                  <span className="text-[10px] text-slate-400">{s.label}</span>
                  <span className={`font-mono text-[12px] font-semibold tabular-nums ${s.text}`}>
                    {Math.round(deg)}°
                  </span>
                </span>
              ))}
            </div>
            {/* Source: the joint split is Inman's scapulohumeral rhythm; the trunk
                share above 150° is Kapandji's phase-3 spine contribution. */}
            {!compact && (
              <p className="mt-2 text-[9px] tracking-[0.08em] text-slate-600">
                Fuente: Inman, Kapandji
              </p>
            )}
          </div>
        </>
      )}

      {/* Knee screw-home coupling — the knee's "rhythm equivalent": the coupled
          automatic tibial external rotation that locks the joint in extension. */}
      {screwHome && !demo && (
        <>
          <div className="hairline" />
          <div className={`px-4 ${padY}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="kicker">Mecanismo de tornillo</span>
              <span
                className={`shrink-0 text-[10px] font-semibold ${SCREW_ZONE[screwHome.zone].chip}`}
              >
                {SCREW_ZONE[screwHome.zone].label}
              </span>
            </div>
            {/* Coupled tibial external rotation (0..15 deg). */}
            <div className="mt-2 flex items-center gap-2">
              <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-slate-800/80" aria-hidden="true">
                <span
                  className="block h-full rounded-full transition-[width] duration-150"
                  style={{
                    width: `${(screwHome.tibialErDeg / 15) * 100}%`,
                    backgroundColor: SCREW_ZONE[screwHome.zone].bar,
                  }}
                />
              </div>
              <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-slate-200">
                {screwHome.tibialErDeg.toFixed(1)}°
                <span className="ml-1 font-sans text-[10px] font-normal text-slate-500">
                  RE tibial
                </span>
              </span>
            </div>
            {showDescription && (
              <p className="mt-2 text-[10.5px] leading-snug text-slate-400">
                {SCREW_ZONE[screwHome.zone].note}
              </p>
            )}
            {!compact && (
              <p className="mt-2 text-[9px] tracking-[0.08em] text-slate-600">
                Fuente: Kapandji, Oatis
              </p>
            )}
          </div>
        </>
      )}

      {/* Cervical rotation split — the neck's rhythm equivalent (C1-C2 vs C2-C7). */}
      {cervicalSplit && !demo && (
        <SegmentSplitCard
          title="Reparto de la rotación"
          ratio={cervicalSplit.ratio}
          showNote={showDescription}
          note="La articulación atlanto-axoidea (C1-C2) aporta ~la mitad de la rotación cervical y lidera el inicio; los segmentos C2-C7 completan el arco."
          source="Kapandji, Oatis"
          segs={[
            {
              label: 'C1-C2',
              deg: cervicalSplit.c1c2Deg,
              pct: cervicalSplit.c1c2Pct,
              hex: '#a78bfa',
              dot: 'bg-violet-400',
              text: 'text-violet-300',
            },
            {
              label: 'C2-C7',
              deg: cervicalSplit.subaxialDeg,
              pct: cervicalSplit.subaxialPct,
              hex: '#38bdf8',
              dot: 'bg-sky-400',
              text: 'text-sky-300',
            },
          ]}
        />
      )}

      {/* Lumbopelvic rhythm — the trunk's rhythm equivalent (lumbar spine + pelvis). */}
      {lumboPelvic && !demo && (
        <SegmentSplitCard
          title="Ritmo lumbopélvico"
          ratio={lumboPelvic.ratio}
          showNote={showDescription}
          note={
            lumboPelvic.leader === 'lumbar'
              ? 'El raquis lumbar lidera el inicio del gesto (invierte la lordosis); la pelvis aún apenas rota.'
              : lumboPelvic.leader === 'pelvis'
                ? 'La pelvis (flexión de cadera) domina ya el gesto; el raquis lumbar aporta menos.'
                : 'Lumbar y pelvis se reparten el gesto de forma pareja.'
          }
          source="Kapandji, Oatis"
          segs={[
            {
              label: 'Lumbar',
              deg: lumboPelvic.lumbarDeg,
              pct: lumboPelvic.lumbarPct,
              hex: '#fbbf24',
              dot: 'bg-amber-400',
              text: 'text-amber-300',
            },
            {
              label: 'Pelvis',
              deg: lumboPelvic.pelvicDeg,
              pct: lumboPelvic.pelvicPct,
              hex: '#34d399',
              dot: 'bg-emerald-400',
              text: 'text-emerald-300',
            },
          ]}
        />
      )}

      </div>

      {/* Protagonist muscle. The role reads as a colored edge plus a word, so the
          muscle's name and its recruitment stay the largest things here. */}
      {/* Hidden during a demo: the recruited muscles and their percentages are
          per-angle values, so on a sweep they flicker. The demo card above names
          the structure under test instead, and the model still glows it. */}
      {hero && !demo && (
        <>
      <div className="hairline" />
      <div className={`shrink-0 border-l-2 px-4 ${padY} ${ROLE_CARD[hero.role]}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="kicker">Músculo protagonista</span>
          <span className={`shrink-0 text-[10px] font-semibold ${ROLE_CHIP[hero.role]}`}>
            {ROM_ROLE_LABEL[hero.role]}
          </span>
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <span className="min-w-0 flex-1 truncate font-display text-[17px] font-semibold leading-tight text-slate-50">
            {muscleNameById(muscleRegion, hero.muscleId)}
          </span>
          <span className={`shrink-0 font-display text-xl font-bold tabular-nums ${ROLE_TEXT[hero.role]}`}>
            {Math.round(hero.level * 100)}
            <span className="text-xs font-medium text-slate-500">%</span>
          </span>
        </div>

        {/* Other active muscles (one compact line). Shed on short viewports. */}
        {showAlso && others.length > 0 && hero && (
          <p className="mt-2 text-[10.5px] leading-snug text-slate-400">
            <span className="text-slate-500">También </span>
            {others.map((m, i) => (
              <span key={m.muscleId}>
                <span className={ROLE_TEXT[m.role]}>{muscleNameById(muscleRegion, m.muscleId)}</span>
                <span className="tabular-nums text-slate-500"> {Math.round(m.level * 100)}%</span>
                {i < others.length - 1 ? <span className="text-slate-600">, </span> : null}
              </span>
            ))}
          </p>
        )}
      </div>
        </>
      )}

      {/* HONEST FRAMING (G3): the %/ratios above are a recruitment MODEL grounded
          in standard kinesiology, never a measured EMG. Shown whenever a number
          is on screen, so it can never be read as a measurement — on the short
          viewports where the column is tightest it says so in one line instead
          of three. A demo shows no percentages, so it carries no such claim. */}
      {!demo && (
        <>
          <div className="hairline" />
          <p className="shrink-0 px-4 py-2 text-[9px] leading-tight text-slate-600">
            {compact
              ? 'Modelo de reclutamiento, no medición EMG.'
              : 'Porcentajes y proporciones: modelo de reclutamiento (Kapandji, Oatis, Neumann), no medición EMG.'}
          </p>
        </>
      )}
    </div>
  );
}
