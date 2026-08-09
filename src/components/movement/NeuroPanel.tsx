// src/components/movement/NeuroPanel.tsx
//
// NEURO panel for the movement lab: the SEGMENTAL screen -- dermatome, myotome
// and deep tendon reflex per spinal nerve root -- for the region's limb (C5-T1
// upper, L2-S1 lower), with the myotome demonstrable as a real resisted movement
// on the 3D rig and the dermatome painted on an anatomical plate.
//
// -----------------------------------------------------------------------------
// DESIGN RULES. Read before adding anything here.
// -----------------------------------------------------------------------------
// This panel is the twin of OrthopedicTestsPanel and inherits its doctrine, which
// it had drifted out of: five type sizes down to 9px, three identical prose
// blocks for three clinically different things, a reflex whose NAME lived in a
// title attribute, and the rig demo -- the reason the panel is premium -- buried
// inside an expanded card. So:
//
// 1. THREE TYPE SIZES: 14px for a root's key movement, 13px for prose, 11px for
//    every label, caption and number (mono + tabular for the numbers). Nothing
//    smaller ships, on the panel or inside the plate's SVG.
//
// 2. COLOUR IS THE SEGMENTAL RAMP, AND NOTHING ELSE. A root's pigment (see
//    SEGMENT_PIGMENTS) identifies it on the plate, on its row's edge rule and on
//    its chip -- one colour, three places, so the plate and the list are visibly
//    the same object. Cyan is INTERACTIVE STATE only and never fills a
//    territory. Amber is reserved for what needs attention, which here means the
//    red flags and an unverified figure. There is no other colour.
//
// 3. NO BOX INSIDE A BOX. One instrument surface, sectioned by hairlines and
//    typographic rank.
//
// 4. THE THREE LANES ARE TOLD APART BY FORM, NOT HUE. Sensibilidad, fuerza and
//    reflejo each carry a glyph and a kicker; adding a third and fourth hue would
//    have collided with the muscle-role code (amber/sky/violet) and with the
//    tests panel's two-axis code (sky/emerald), and a dermatome would have ended
//    up looking like a prime mover.
//
// 5. THE RIG DEMO IS REACHABLE FROM THE COLLAPSED ROW, as the round icon button
//    the tests panel uses. Same control, same place, same vocabulary.
//
// 6. ABSENCE IS INFORMATION. C8, T1 and L5 have no deep tendon reflex of their
//    own, and that is precisely why L5 is missed. The panel SAYS so instead of
//    omitting the lane.
//
// 7. RED FLAGS SIT ABOVE THE ROOTS, where they cannot be scrolled past. A
//    segmental screen exists partly to catch what must not be treated.
//
// 8. THE SCREEN IS THE LIST, NOT A SECOND TABLE. Grading controls live inside the
//    lane they grade, and each row carries three state dots, so the five rows ARE
//    the root-by-axis grid at a glance. A separate matrix would have printed every
//    root twice on one surface, which breaks rule 3 and rule "say it once".
//
// 9. AMBER MEANS ABNORMAL, on the dots as everywhere else on this panel: it is
//    already the attention colour (red flags, unverified figures), and a row that
//    turns amber across all three axes is precisely the thing needing attention.
//    Recorded-and-normal is a quiet slate dot; not examined is a hollow ring,
//    because blank and normal are different clinical statements.
//
// LAYOUT: a full-height right-side sheet (mirrors the tests panel), plus a `bare`
// mode for the mobile bottom sheet. Data: src/data/neuro. UI Spanish LATAM; code
// and comments ASCII/English.

import { useEffect, useMemo, useRef, useState } from 'react';
import { neuroForRegion } from '../../data/neuro';
import { pigmentFor } from '../../data/neuro/plate';
import type { NerveRoot } from '../../types/neuro';
import { getReference, formatReference, type ReferenceId } from '../../data/references';
import { DermatomeMap } from './DermatomeMap';
import { NeuroScreenReadout } from './NeuroScreenReadout';
import { rigChannel } from './RigModel';
import { demoChannel, useActiveDemo } from './demoChannel';
import { EVENTS, track, trackChange } from '../../lib/analytics';
import {
  EMPTY_FINDING,
  REFLEX_SCALE,
  SENSATION_SCALE,
  STRENGTH_SCALE,
  isScreenEmpty,
  localizeRoot,
  screenSummary,
  type NeuroScreenState,
  type RootFinding,
} from '../../lib/neuroScreen';
import { ChevronDownIcon, CloseIcon, PlayIcon, StopIcon } from '../ui/Icons';

/** Namespace for this panel's demo ids on the shared demoChannel. */
const DEMO_NS = 'neuro:';

/** At most two roots can be held side by side; a third would stop comparing. */
const MAX_PICKED = 2;

/**
 * A reflex's short name, for the collapsed row.
 *
 * The data carries the full clinical name ("Reflejo rotuliano o patelar (L3 y
 * L4)") because that is what belongs in the detail. A row has room for the word
 * that identifies it, and the levels in the parenthesis are already the row it
 * sits on. Derived rather than authored twice: two spellings of the same reflex
 * in two fields is a data bug waiting to happen.
 */
function shortReflex(name: string): string {
  const core = name
    .replace(/^Reflejo\s+/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
  return core.charAt(0).toUpperCase() + core.slice(1);
}

// ---------------------------------------------------------------------------
// Glyphs. Design rule 4: the three lanes are told apart by form.
// ---------------------------------------------------------------------------

/** Key point: the ring-and-core pin the plate marks the ASIA point with. */
function PinGlyph({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.2" fill="none" stroke={color} strokeWidth="1.4" />
      <circle cx="6" cy="6" r="1.2" fill="#f8fafc" />
    </svg>
  );
}

/** Myotome: a limb sweeping against resistance. */
function MotionGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2.5 10.5V5A2.5 2.5 0 0 1 7 3.4" />
      <path d="M5.4 1.6 7.6 3.3 5.6 5" />
      <path d="M9.6 7.2v3.3" />
    </svg>
  );
}

/** Reflex: the hammer on the tendon. */
function HammerGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2 9.6 7.2 4.4" />
      <path d="M6 2.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8" />
      <path d="M1.4 10.6h1.6" />
    </svg>
  );
}

function AlertGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 1.4 11 10.6H1L6 1.4Z" />
      <path d="M6 4.8v2.4" />
      <path d="M6 9h.01" />
    </svg>
  );
}

function NerveIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 3v6a4 4 0 0 0 4 4h1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 21v-6a4 4 0 0 1 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="7" r="2" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="19" cy="11" r="2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Small presentational pieces. One component each, so a size cannot drift.
// ---------------------------------------------------------------------------

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{children}</span>
  );
}

/** One lane of the screen: glyph + kicker + prose. No card chrome (rule 3). */
function Lane({
  glyph,
  label,
  children,
}: {
  glyph: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-[2px] shrink-0 text-slate-500">{glyph}</span>
      <div className="min-w-0 flex-1">
        <Kicker>{label}</Kicker>
        <p className="mt-0.5 text-[13px] leading-relaxed text-slate-300">{children}</p>
      </div>
    </div>
  );
}

/**
 * A clinical scale as a segmented row.
 *
 * Two behaviours worth keeping. Clicking the selected grade CLEARS it, because
 * "not examined" is a real state of a screen and there has to be a way back to it
 * without reloading the panel. And the buttons are numbered with the scale's own
 * numbers (0-5 for strength, 0-4 for reflexes), never re-labelled "leve /
 * moderado": a physio already thinks in these numbers, and translating out of
 * their vocabulary and back is how a form starts feeling like paperwork.
 */
function Scale<T extends number>({
  options,
  value,
  onChange,
  legend,
}: {
  options: { value: T; label?: string; hint: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  /** What the scale is, for screen readers. Spanish. */
  legend: string;
}) {
  return (
    <div role="group" aria-label={legend} className="mt-1.5 flex gap-1">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(on ? null : o.value)}
            aria-pressed={on}
            aria-label={`${legend}: ${o.hint}`}
            title={o.hint}
            className={`min-w-0 flex-1 rounded border px-1 py-1 text-[11px] font-medium tabular-nums transition-colors ${
              o.label ? '' : 'font-mono'
            } ${
              on
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {o.label ?? o.value}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The row's three state dots: sensibilidad, fuerza, reflejo, in the same order as
 * the lanes below. Five of these rows are the screening grid (design rule 8), and
 * a row that goes amber across is the level (rule 9).
 */
function StateDots({ root, finding }: { root: NerveRoot; finding: RootFinding }) {
  const axes: { key: string; graded: boolean; abnormal: boolean; text: string }[] = [
    {
      key: 'S',
      graded: finding.sensation != null,
      abnormal: finding.sensation != null && finding.sensation < 2,
      text:
        finding.sensation == null
          ? 'sensibilidad sin explorar'
          : `sensibilidad ${SENSATION_SCALE.find((s) => s.value === finding.sensation)?.label?.toLowerCase()}`,
    },
    {
      key: 'F',
      graded: finding.strength != null,
      abnormal: finding.strength != null && finding.strength < 5,
      text: finding.strength == null ? 'fuerza sin explorar' : `fuerza ${finding.strength} de 5`,
    },
  ];
  if (root.reflex) {
    axes.push({
      key: 'R',
      graded: finding.reflex != null,
      // Both directions are abnormal: 0 is a root sign, 4 is a cord sign.
      abnormal: finding.reflex != null && finding.reflex !== 2,
      text: finding.reflex == null ? 'reflejo sin explorar' : `reflejo ${finding.reflex} de 4`,
    });
  }
  return (
    <span
      className="flex shrink-0 items-center gap-1"
      title={`${root.label} · ${axes.map((a) => a.text).join(', ')}`}
      aria-label={`${root.label}: ${axes.map((a) => a.text).join(', ')}`}
    >
      {axes.map((a) => (
        <span
          key={a.key}
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full border ${
            !a.graded
              ? 'border-slate-700'
              : a.abnormal
                ? 'border-amber-400 bg-amber-400'
                : 'border-slate-600 bg-slate-600'
          }`}
        />
      ))}
    </span>
  );
}

/** The root's identity chip: mono, in its segmental pigment. */
function RootChip({ root, pigment, on }: { root: string; pigment: string; on: boolean }) {
  return (
    <span
      className="flex h-6 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-bold transition-colors"
      style={{
        borderColor: on ? pigment : 'rgba(148,163,184,0.28)',
        backgroundColor: on ? `${pigment}33` : 'rgba(15,22,38,0.6)',
        color: on ? '#e2e8f0' : '#94a3b8',
      }}
    >
      {root}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Red flags (design rule 7).
// ---------------------------------------------------------------------------

function RedFlags({ flags }: { flags: { label: string; detail: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-800/60 px-4 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="shrink-0 text-amber-400/90">
          <AlertGlyph />
        </span>
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-300/90">
          Antes de tratar · banderas rojas
        </span>
        <span className="font-mono text-[11px] tabular-nums text-amber-400/70">{flags.length}</span>
        <ChevronDownIcon
          size={12}
          className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 pb-1">
          {flags.map((f) => (
            <li key={f.label} className="border-l-2 border-amber-500/40 pl-2.5">
              <span className="block text-[13px] font-semibold text-amber-200/90">{f.label}</span>
              <span className="block text-[13px] leading-relaxed text-slate-400">{f.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare readout: what actually separates two neighbouring roots.
//
// This is the panel's counterpart to the tests panel's Fagan block -- the piece
// that reasons instead of listing. C6 and C7 overlap in the hand and share a limb;
// what tells them apart is three lines (key point, key movement, reflex), and
// putting those three side by side is the whole bedside decision.
// ---------------------------------------------------------------------------

function CompareBlock({
  figure,
  a,
  b,
}: {
  figure: 'upper-limb' | 'lower-limb';
  a: NerveRoot;
  b: NerveRoot;
}) {
  const rows: [string, string, string][] = [
    [
      'Punto clave',
      a.dermatome.keyPointShort ?? a.dermatome.keyPoint,
      b.dermatome.keyPointShort ?? b.dermatome.keyPoint,
    ],
    ['Movimiento', a.myotome.action, b.myotome.action],
    [
      'Reflejo',
      a.reflex ? shortReflex(a.reflex.name) : 'Sin reflejo propio',
      b.reflex ? shortReflex(b.reflex.name) : 'Sin reflejo propio',
    ],
  ];
  return (
    <div className="border-t border-slate-800/60 px-4 py-3">
      <Kicker>Qué las separa</Kicker>
      <div className="mt-2 grid grid-cols-[4.5rem_1fr_1fr] gap-x-2.5 gap-y-2">
        <span />
        {[a, b].map((r) => (
          <span key={r.id} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: pigmentFor(figure, r.id) }}
              aria-hidden="true"
            />
            <span className="font-mono text-[11px] font-bold text-slate-200">{r.label}</span>
          </span>
        ))}
        {rows.map(([label, va, vb]) => (
          <div key={label} className="contents">
            <span className="text-[11px] leading-snug text-slate-500">{label}</span>
            <span className="text-[13px] leading-snug text-slate-300">{va}</span>
            <span className="text-[13px] leading-snug text-slate-300">{vb}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A root's row: collapsed summary + the three lanes when open.
// ---------------------------------------------------------------------------

function RootRow({
  root,
  pigment,
  picked,
  expanded,
  onPick,
  demoing,
  onDemo,
  finding,
  onGrade,
}: {
  root: NerveRoot;
  pigment: string;
  picked: boolean;
  expanded: boolean;
  onPick: () => void;
  demoing: boolean;
  onDemo: () => void;
  finding: RootFinding;
  onGrade: (patch: Partial<RootFinding>) => void;
}) {
  const reflexWord = root.reflex ? shortReflex(root.reflex.name) : null;
  return (
    <div
      className="border-l-2 pl-3 pr-2 transition-colors"
      style={{
        borderColor: picked ? pigment : 'rgba(51,65,85,0.7)',
        backgroundColor: picked ? 'rgba(30,41,59,0.28)' : undefined,
      }}
    >
      <div className="flex items-center gap-2 py-2">
        <button
          type="button"
          onClick={onPick}
          aria-expanded={expanded}
          aria-pressed={picked}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <RootChip root={root.label} pigment={pigment} on={picked} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-100">
              {root.myotome.action}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="truncate">
                {root.dermatome.keyPointShort ?? root.dermatome.keyPoint}
              </span>
              {reflexWord && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="flex shrink-0 items-center gap-1 truncate">
                    <HammerGlyph />
                    {reflexWord}
                  </span>
                </>
              )}
            </span>
          </span>
        </button>

        {/* Design rule 8: three dots per row, five rows, and the grid is legible
            without opening anything. */}
        <StateDots root={root} finding={finding} />

        {/* Design rule 5: the rig demo lives HERE, not inside the detail. Same
            round control the tests panel uses for its maneuvers. */}
        {root.demo && (
          <button
            type="button"
            onClick={onDemo}
            aria-label={
              demoing
                ? `Detener el miotoma ${root.label}`
                : `Demostrar el miotoma ${root.label} en el modelo`
            }
            title={
              demoing ? 'Detener el movimiento' : 'Reproducir el movimiento resistido en el modelo 3D'
            }
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
              demoing
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-slate-700 text-slate-400 hover:border-accent/60 hover:text-accent'
            }`}
          >
            {demoing ? <StopIcon size={12} /> : <PlayIcon size={12} />}
          </button>
        )}
        <ChevronDownIcon
          size={12}
          className={`shrink-0 text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {expanded && (
        <div className="space-y-3 pb-3.5 pt-0.5">
          <Lane glyph={<PinGlyph color={pigment} />} label="Sensibilidad · dermatoma">
            {root.dermatome.area}{' '}
            <span className="text-slate-400">Punto clave: {root.dermatome.keyPoint}</span>
            <Scale
              legend={`Sensibilidad en el punto clave de ${root.label}`}
              options={SENSATION_SCALE}
              value={finding.sensation}
              onChange={(v) => onGrade({ sensation: v })}
            />
          </Lane>

          <Lane glyph={<MotionGlyph />} label="Fuerza · miotoma">
            {root.myotome.action} <span className="text-slate-400">({root.myotome.muscles})</span>
            {root.demo?.note && (
              <span className="mt-1 block text-[11px] text-slate-500">
                En el modelo: {root.demo.note}
              </span>
            )}
            {!root.demo && root.demoNote && (
              <span className="mt-1 block text-[11px] text-slate-500">{root.demoNote}</span>
            )}
            <Scale
              legend={`Fuerza del miotoma ${root.label}, escala 0 a 5`}
              options={STRENGTH_SCALE}
              value={finding.strength}
              onChange={(v) => onGrade({ strength: v })}
            />
          </Lane>

          {/* Design rule 6: absence is information, so the lane always exists. */}
          <Lane glyph={<HammerGlyph />} label="Reflejo">
            {root.reflex ? (
              <>
                <span className="text-slate-200">{root.reflex.name}.</span>{' '}
                {root.reflex.elicitation}
                <Scale
                  legend={`Reflejo de ${root.label}, escala 0 a 4`}
                  options={REFLEX_SCALE}
                  value={finding.reflex}
                  onChange={(v) => onGrade({ reflex: v })}
                />
              </>
            ) : (
              <span className="text-slate-400">
                Esta raíz no tiene reflejo profundo propio, así que el dermatoma y la fuerza
                cargan todo el peso del tamizaje.
              </span>
            )}
          </Lane>

          {root.mimic && (
            <div className="border-t border-slate-800/70 pt-2.5">
              <Kicker>No confundir con</Kicker>
              <p className="mt-0.5 text-[13px] leading-relaxed text-slate-300">
                <span className="text-slate-200">{root.mimic.nerve}.</span>{' '}
                {root.mimic.discriminator}
              </p>
            </div>
          )}

          {root.pearl && (
            <p className="text-[13px] leading-relaxed text-slate-400">{root.pearl}</p>
          )}

          <div>
            {root.cite.map((c) => {
              const ref = getReference(c.ref as ReferenceId);
              if (!ref) return null;
              return (
                <p key={c.ref} className="text-[11px] leading-snug text-slate-600">
                  {formatReference(ref)}{' '}
                  {!c.verified && (
                    <span
                      className="text-amber-500/80"
                      title="Valores por verificar contra la fuente primaria"
                    >
                      · por verificar
                    </span>
                  )}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function NeuroPanel({
  region,
  open,
  onOpenChange,
  bare = false,
}: {
  region: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Render inside the compact bottom sheet: no frosted panel, no fixed width,
   *  no close button. See the same flag on OrthopedicTestsPanel. */
  bare?: boolean;
}) {
  const set = useMemo(() => neuroForRegion(region), [region]);
  /**
   * Selected roots, 0..2. One entry expands that root's detail; two put them
   * side by side in the compare block instead. Keeping ONE piece of state for
   * both means the plate, the rows and the readout can never disagree about
   * what is selected.
   */
  const [picked, setPicked] = useState<string[]>([]);
  const [compare, setCompare] = useState(false);
  /**
   * What has been recorded, root by root.
   *
   * Component state, and deliberately scoped to ONE limb: MovementView keys this
   * panel by region, so switching from the knee to the shoulder starts a new
   * screen instead of carrying lumbosacral findings onto a cervical figure. A
   * screen belongs to one examination.
   */
  const [screen, setScreen] = useState<NeuroScreenState>({});
  const [copied, setCopied] = useState(false);

  // The demoChannel arbiter owns which demo (if any) animates the rig. Deriving
  // demoId from it (instead of local state) means a demo started here stops
  // cleanly the moment the console or the tests panel reclaims the rig.
  const activeDemo = useActiveDemo();
  const demoId = activeDemo?.startsWith(DEMO_NS) ? activeDemo.slice(DEMO_NS.length) : null;

  // Is the neuro panel used at all, and in which regions? It is premium, so the
  // answer decides whether it earns its place in the pitch.
  useEffect(() => {
    if (open) trackChange(EVENTS.neuroOpened, { region });
  }, [open, region]);

  const byId = useMemo(() => new Map((set?.roots ?? []).map((r) => [r.id, r])), [set]);

  const pick = (id: string) => {
    setPicked((cur) => {
      if (!compare) return cur.length === 1 && cur[0] === id ? [] : [id];
      if (cur.includes(id)) return cur.filter((r) => r !== id);
      // FIFO once full, so a third pick means "compare with this one instead".
      return [...cur, id].slice(-MAX_PICKED);
    });
  };

  const grade = (id: string, patch: Partial<RootFinding>) => {
    setScreen((cur) => {
      // Counts screens STARTED, not taps: fired only on the transition out of an
      // empty screen.
      if (isScreenEmpty(cur)) track(EVENTS.neuroScreenGraded, { region });
      return { ...cur, [id]: { ...(cur[id] ?? EMPTY_FINDING), ...patch } };
    });
  };

  const copySummary = async () => {
    if (!set) return;
    const text = screenSummary(set.roots, screen, set.title);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      track(EVENTS.neuroScreenCopied, { region, roots: set.roots.length });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused (insecure context, denied permission).
      // Staying silent here would look like the button is broken, and there is no
      // second channel for the text, so say so plainly.
      window.prompt('Copia el tamizaje:', text);
    }
  };

  const startDemo = (r: NerveRoot) => {
    if (r.demo) demoChannel.start(DEMO_NS + r.id);
  };
  const stopDemo = () => demoChannel.stop();

  // ANIMATE the active myotome demo on the rig: sweep 0 -> target -> 0 with holds
  // (same pattern as OrthopedicTestsPanel). Honors prefers-reduced-motion.
  const rafRef = useRef(0);
  useEffect(() => {
    if (!demoId) return;
    const root = byId.get(demoId);
    const d = root?.demo;
    if (!root || !d) return;
    const side = d.side ?? 'R';
    const target = d.angleDeg;
    const highlight = d.highlightMuscleId
      ? [{ muscleId: d.highlightMuscleId, role: 'prime-mover' as const, level: 1 }]
      : [];
    // Built ONCE per demo, not per frame: the readout compares it by identity to
    // decide whether anything changed.
    const demoInfo = {
      label: `Miotoma ${root.label}`,
      targetDeg: target,
      structure: root.myotome.action,
      note: d.note,
    };
    const push = (deg: number) =>
      rigChannel.set({
        movementId: d.movementId,
        side,
        angleDeg: deg,
        highlight,
        showMarkers: false,
        ghostSkin: true,
        // Fixed for the whole demo, so the readout describes the myotome
        // instead of recomputing (and flickering) its analysis every frame.
        demo: demoInfo,
      });
    // On stop, RELEASE the channel (only if this demo still owns it): the
    // console reacts by re-pushing its own live state, which restores the pose
    // and clears the demo-only ghostSkin flag.
    const release = () => demoChannel.stop(DEMO_NS + demoId);

    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      push(target);
      return release;
    }

    // Claim the rig straight away, before the first animation frame, so the
    // readout switches to the myotome the moment the button is pressed.
    push(0);

    // Exam pace (same as the orthopedic-test demos): slow enough to follow, with
    // a long hold at the tested position so it can actually be read.
    const DPS = 26;
    const HOLD_AT_TARGET_MS = 2800;
    const HOLD_AT_REST_MS = 800;
    let last = 0;
    let dir: 1 | -1 = 1;
    let angle = 0;
    let holdUntil = 0;
    const step = (ts: number) => {
      if (!last) last = ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      if (holdUntil) {
        if (ts >= holdUntil) holdUntil = 0;
      } else {
        angle += dir * DPS * dt;
        if (angle >= target) {
          angle = target;
          dir = -1;
          holdUntil = ts + HOLD_AT_TARGET_MS;
        } else if (angle <= 0) {
          angle = 0;
          dir = 1;
          holdUntil = ts + HOLD_AT_REST_MS;
        }
      }
      push(angle);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      release();
    };
  }, [demoId, byId]);

  if (!set) return null;

  if (!open && !bare) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="instrument pointer-events-auto flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:text-white"
      >
        <NerveIcon />
        Neuro: dermatomas y miotomas
        <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">
          {set.roots.length}
        </span>
      </button>
    );
  }

  const pickedRoots = picked
    .map((id) => byId.get(id))
    .filter((r): r is NerveRoot => Boolean(r));
  const comparing = pickedRoots.length === MAX_PICKED;
  const screenStarted = !isScreenEmpty(screen);
  const localization = localizeRoot(set.roots, screen);

  return (
    <div
      className={
        bare
          ? 'flex min-h-0 w-full flex-1 flex-col'
          : 'instrument pointer-events-auto flex min-h-0 w-[24rem] max-w-[calc(100vw-2rem)] flex-1 flex-col overflow-hidden'
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/60 px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-slate-50">
            <NerveIcon />
            {set.title}
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">{set.subtitle}</p>
        </div>
        {!bare && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar neuro"
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100/[0.06] hover:text-slate-200"
          >
            <CloseIcon size={15} />
          </button>
        )}
      </div>

      {set.redFlags && set.redFlags.length > 0 && <RedFlags flags={set.redFlags} />}

      {/* The plate. Clicking a territory selects its root, so the figure is an
          input and not an illustration. */}
      <div className="border-b border-slate-800/60 px-4 pb-3 pt-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Kicker>Dermatomas · esquema orientativo</Kicker>
          <button
            type="button"
            onClick={() => {
              setCompare((v) => !v);
              // Leaving compare mode keeps the first pick, so the plate does not
              // blank out and the panel lands on a single root's detail.
              setPicked((cur) => (compare ? cur.slice(0, 1) : cur));
            }}
            aria-pressed={compare}
            title="Sostener dos raíces vecinas a la vez para ver el solapamiento"
            className={`shrink-0 rounded border px-2 py-1 text-[11px] font-medium transition-colors ${
              compare
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            Comparar
          </button>
        </div>
        <DermatomeMap
          figure={set.figure}
          activeRoots={picked}
          onSelectRoot={pick}
          keyPointFor={(id) => byId.get(id)?.dermatome.keyPointShort}
        />
      </div>

      {comparing && (
        <CompareBlock figure={set.figure} a={pickedRoots[0]} b={pickedRoots[1]} />
      )}

      {/* Roots, and above them the conclusion they feed.
          The readout sits at the TOP of the scroll region rather than after the
          five rows: it is the panel's answer, and an answer found only after
          scrolling past everything reads as a footnote. It scrolls, though -- the
          fixed area above is already carrying the plate. */}
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {screenStarted && (
          <NeuroScreenReadout
            figure={set.figure}
            localization={localization}
            onShowLevel={(ids) => {
              // A tie proposes two levels, so showing it means turning compare on:
              // the plate can hold two territories and this is exactly the case
              // that needs it.
              setPicked(ids.slice(0, MAX_PICKED));
              setCompare(ids.length > 1);
            }}
            onClear={() => setScreen({})}
            onCopy={copySummary}
            copied={copied}
          />
        )}
        {set.roots.map((r) => (
          <RootRow
            key={r.id}
            root={r}
            pigment={pigmentFor(set.figure, r.id)}
            picked={picked.includes(r.id)}
            expanded={!comparing && picked.includes(r.id)}
            onPick={() => pick(r.id)}
            demoing={demoId === r.id}
            onDemo={() => (demoId === r.id ? stopDemo() : startDemo(r))}
            finding={screen[r.id] ?? EMPTY_FINDING}
            onGrade={(patch) => grade(r.id, patch)}
          />
        ))}
        {!screenStarted && (
          <p className="px-4 pb-1 pt-2 text-[11px] leading-snug text-slate-500">
            Abre una raíz y registra sensibilidad, fuerza y reflejo: el panel te dirá
            qué nivel explica mejor lo que encuentres.
          </p>
        )}
        <p className="px-4 py-3 text-[11px] leading-snug text-slate-600">
          Los mapas dermatómicos y las raíces de los reflejos varían entre autores
          (ASIA, Keegan). Úsalo como guía de razonamiento segmentario, no como
          límite exacto. Contenido educativo.
        </p>
      </div>
    </div>
  );
}
