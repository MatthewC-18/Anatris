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
import { DermatomeMap } from './DermatomeMap';
import { NeuroScreenReadout } from './NeuroScreenReadout';
import { rigChannel } from './RigModel';
import { demoChannel, useActiveDemo } from './demoChannel';
import { EVENTS, track, trackChange } from '../../lib/analytics';
import {
  EMPTY_FINDING,
  isScreenEmpty,
  localizeRoot,
  screenSummary,
  type NeuroScreenState,
  type RootFinding,
} from '../../lib/neuroScreen';
import { neuroSkinChannel } from './neuroSkinChannel';
import { clearScreen, readScreen, writeScreen } from './neuroScreenStore';
import { HowToUse, Kicker, NeuroRootRow, shortReflex } from './NeuroRootRow';
import { ChevronDownIcon, CloseIcon } from '../ui/Icons';

/** Namespace for this panel's demo ids on the shared demoChannel. */
const DEMO_NS = 'neuro:';

/** At most two roots can be held side by side; a third would stop comparing. */
const MAX_PICKED = 2;

// ---------------------------------------------------------------------------
// Glyphs kept HERE: only the ones this file still uses. The three lane glyphs moved
// to NeuroRootRow with the lanes they label.
// ---------------------------------------------------------------------------

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

/**
 * Put text on the clipboard, or report that it could not be done.
 *
 * Two paths on purpose: the modern API, then the old selection trick for the
 * contexts it refuses to run in (plain http, denied permission). Returns a boolean
 * rather than throwing, because the caller's job is to tell the user whether their
 * record made it out -- not to swallow the failure, which looks exactly like a
 * broken button.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    // Off-screen but still selectable, and readOnly so no keyboard opens on a phone
    // while it is briefly in the document.
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
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
   * Mirrored into neuroScreenStore rather than living here alone: the mobile sheet
   * renders one tab at a time, so this panel unmounts when the user goes to look
   * at the model and a half-finished exam used to vanish. See that module for why
   * it is in memory and not on disk.
   */
  const [screen, setScreen] = useState<NeuroScreenState>(() =>
    set ? readScreen(set.id) : {},
  );
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

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

  /**
   * Publish the selection to the 3D body, so the same root that is highlighted on
   * the plate is painted on the rig's own skin (see NeuroSkinLayer).
   *
   * Only while the panel is OPEN: a dermatome left glowing on the model behind a
   * closed panel is paint nobody asked for. Cleared on unmount for the same reason.
   */
  useEffect(() => {
    if (!open || !set) {
      neuroSkinChannel.clear();
      return;
    }
    neuroSkinChannel.set({ figure: set.figure, roots: picked });
  }, [open, set, picked]);

  useEffect(() => () => neuroSkinChannel.clear(), []);

  const byId = useMemo(() => new Map((set?.roots ?? []).map((r) => [r.id, r])), [set]);

  const pick = (id: string) => {
    setPicked((cur) => {
      if (!compare) return cur.length === 1 && cur[0] === id ? [] : [id];
      if (cur.includes(id)) return cur.filter((r) => r !== id);
      // FIFO once full, so a third pick means "compare with this one instead".
      return [...cur, id].slice(-MAX_PICKED);
    });
  };

  /** Single door to the screen state, so the store can never fall out of step. */
  const updateScreen = (next: (cur: NeuroScreenState) => NeuroScreenState) => {
    setScreen((cur) => {
      const value = next(cur);
      if (set) writeScreen(set.id, value);
      return value;
    });
  };

  const grade = (id: string, patch: Partial<RootFinding>) => {
    // Counts screens STARTED, not taps: fired on the transition out of an empty
    // screen. Read and fired OUTSIDE the updater -- React is free to call an
    // updater more than once (StrictMode does, in development), so a side effect
    // in there is a double-counted event waiting to happen. `screen` is current
    // here because this only runs from an event handler.
    if (isScreenEmpty(screen)) track(EVENTS.neuroScreenGraded, { region });
    updateScreen((cur) => ({ ...cur, [id]: { ...(cur[id] ?? EMPTY_FINDING), ...patch } }));
  };

  const copySummary = async () => {
    if (!set) return;
    const text = screenSummary(set.roots, screen, set.title);
    if (!text) return;
    // The async Clipboard API needs a secure context and a granted permission,
    // and a clinic laptop on plain http has neither. The legacy execCommand path
    // is the fallback because a screen you cannot get out of the app is a screen
    // nobody will use. A prompt() was the first fallback and is not one: it
    // collapses a multi-line record into a single input and some browsers block it.
    const ok = await writeToClipboard(text);
    if (!ok) {
      setCopyFailed(true);
      window.setTimeout(() => setCopyFailed(false), 4000);
      return;
    }
    setCopied(true);
    track(EVENTS.neuroScreenCopied, { region, roots: set.roots.length });
    window.setTimeout(() => setCopied(false), 1800);
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
  // Every root pending against its primary source -- which is how the set ships.
  // Stated once below instead of stamped on all ten rows.
  const allPending = set.roots.every((r) => r.cite.every((c) => !c.verified));
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
        {/* The 3D layer is silent by design -- it just paints -- so it needs one
            line to be discoverable, and that line is also where its limit is
            stated. The rig has no per-dermatome geometry: it is painted by named
            skin REGION, which is why the plate above keeps the finger-level
            detail. See NeuroSkinLayer. */}
        {picked.length > 0 && (
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            También se pinta sobre la piel del modelo 3D, por regiones. Gíralo para verlo.
          </p>
        )}
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
            onClear={() => {
              if (set) clearScreen(set.id);
              setScreen({});
            }}
            onCopy={copySummary}
            copied={copied}
            copyFailed={copyFailed}
          />
        )}
        {set.roots.map((r) => (
          <NeuroRootRow
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
            showVerifyMark={!allPending}
          />
        ))}
        {!screenStarted && <HowToUse />}
        {allPending && (
          <p className="px-4 pt-3 text-[11px] leading-snug text-slate-600">
            Los valores de esta pantalla siguen pendientes de cotejo contra la fuente
            primaria (ASIA/ISNCSCI y Magee).
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
