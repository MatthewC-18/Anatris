// src/components/movement/NeuroPanel.tsx
//
// NEURO panel for the movement lab: dermatomes, myotomes and deep tendon
// reflexes by spinal nerve root, for the region's limb (C5-T1 upper, L2-S1
// lower). The premium integration nobody does well: the MYOTOME can be
// DEMONSTRATED as a real resisted movement on the 3D rig (rigChannel), and the
// DERMATOME lights up on a schematic figure as you pick a root.
//
// Mirrors OrthopedicTestsPanel: a collapsed button that expands to a full-height
// right-side sheet. UI Spanish LATAM; code ASCII. Data: src/data/neuro.

import { useEffect, useMemo, useRef, useState } from 'react';
import { neuroForRegion } from '../../data/neuro';
import type { NerveRoot } from '../../types/neuro';
import { getReference, formatReference, type ReferenceId } from '../../data/references';
import { DermatomeMap } from './DermatomeMap';
import { rigChannel } from './RigModel';
import { demoChannel, useActiveDemo } from './demoChannel';
import { ChevronDownIcon, CloseIcon, PlayIcon, StopIcon } from '../ui/Icons';

/** Namespace for this panel's demo ids on the shared demoChannel. */
const DEMO_NS = 'neuro:';

/** Labelled prose block (no card chrome), matching the tests panel. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <p className="text-xs leading-relaxed text-slate-300">{children}</p>
    </div>
  );
}

function RootRow({
  root,
  expanded,
  onToggle,
  demoing,
  onDemo,
}: {
  root: NerveRoot;
  expanded: boolean;
  onToggle: () => void;
  demoing: boolean;
  onDemo: () => void;
}) {
  return (
    <div
      className={`border-l-2 pl-3 pr-1 transition-colors ${
        expanded ? 'border-accent/70 bg-slate-800/25' : 'border-slate-700/70 hover:bg-slate-800/25'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 py-1.5 text-left"
      >
        <span className="flex h-6 w-9 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-900/60 font-mono text-[11px] font-bold text-slate-200">
          {root.label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-100">
            {root.myotome.action}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">
            {root.dermatome.keyPoint}
          </span>
        </span>
        {root.reflex && (
          <span
            className="shrink-0 rounded-full border border-slate-700 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400"
            title={root.reflex.name}
          >
            reflejo
          </span>
        )}
        <ChevronDownIcon
          size={12}
          className={`shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="space-y-2.5 pb-3 pt-1">
          <Field label="Dermatoma">
            {root.dermatome.area}
            <br />
            <span className="text-slate-400">Punto clave: {root.dermatome.keyPoint}</span>
          </Field>
          <Field label="Miotoma">
            {root.myotome.action} <span className="text-slate-400">({root.myotome.muscles})</span>
          </Field>
          {root.reflex && (
            <Field label="Reflejo">
              <span className="text-slate-200">{root.reflex.name}.</span> {root.reflex.elicitation}
            </Field>
          )}

          {/* Rig demo of the myotome, or an honest note when not riggable. */}
          {root.demo ? (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onDemo}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  demoing
                    ? 'bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/40'
                    : 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/40 hover:bg-accent/25'
                }`}
              >
                {demoing ? <StopIcon size={11} /> : <PlayIcon size={11} />}
                {demoing ? 'Detener' : 'Demostrar miotoma'}
              </button>
            </div>
          ) : (
            root.demoNote && <p className="text-[10px] text-slate-500">{root.demoNote}</p>
          )}
          {root.demo?.note && (
            <p className="text-[10px] text-slate-500">En el modelo: {root.demo.note}</p>
          )}

          {root.pearl && <p className="text-[11px] italic text-slate-400">💡 {root.pearl}</p>}

          <div>
            {root.cite.map((c) => {
              const ref = getReference(c.ref as ReferenceId);
              if (!ref) return null;
              return (
                <p key={c.ref} className="text-[10px] leading-snug text-slate-500">
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

export function NeuroPanel({
  region,
  open,
  onOpenChange,
}: {
  region: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const set = useMemo(() => neuroForRegion(region), [region]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // The demoChannel arbiter owns which demo (if any) animates the rig. Deriving
  // demoId from it (instead of local state) means a demo started here stops
  // cleanly the moment the console or the tests panel reclaims the rig.
  const activeDemo = useActiveDemo();
  const demoId = activeDemo?.startsWith(DEMO_NS) ? activeDemo.slice(DEMO_NS.length) : null;

  const byId = useMemo(
    () => new Map((set?.roots ?? []).map((r) => [r.id, r])),
    [set],
  );

  // The dermatome map highlights the expanded (or hovered) root.
  const activeRoot = expandedId;

  const startDemo = (r: NerveRoot) => {
    if (r.demo) demoChannel.start(DEMO_NS + r.id);
  };
  const stopDemo = () => demoChannel.stop();

  // ANIMATE the active myotome demo on the rig: sweep 0 -> target -> 0 with holds
  // (same pattern as OrthopedicTestsPanel). Honors prefers-reduced-motion.
  const rafRef = useRef(0);
  useEffect(() => {
    if (!demoId) return;
    const d = byId.get(demoId)?.demo;
    if (!d) return;
    const side = d.side ?? 'R';
    const target = d.angleDeg;
    const highlight = d.highlightMuscleId
      ? [{ muscleId: d.highlightMuscleId, role: 'prime-mover' as const, level: 1 }]
      : [];
    const push = (deg: number) =>
      rigChannel.set({
        movementId: d.movementId,
        side,
        angleDeg: deg,
        highlight,
        showMarkers: false,
        ghostSkin: true,
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

    const DPS = 55;
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
          holdUntil = ts + 1000;
        } else if (angle <= 0) {
          angle = 0;
          dir = 1;
          holdUntil = ts + 450;
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

  if (!open) {
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

  return (
    <div className="instrument pointer-events-auto flex min-h-0 w-[24rem] max-w-[calc(100vw-2rem)] flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/60 px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 font-display text-sm font-bold text-slate-50">
            <NerveIcon />
            {set.title}
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">{set.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar neuro"
          className="-mr-1 shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100/[0.06] hover:text-slate-200"
        >
          <CloseIcon size={15} />
        </button>
      </div>

      {/* Dermatome map */}
      <div className="border-b border-slate-800/60 px-4 py-3">
        <DermatomeMap figure={set.figure} activeRoot={activeRoot} />
      </div>

      {/* Roots list */}
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {set.roots.map((r) => (
          <RootRow
            key={r.id}
            root={r}
            expanded={expandedId === r.id}
            onToggle={() => setExpandedId((cur) => (cur === r.id ? null : r.id))}
            demoing={demoId === r.id}
            onDemo={() => (demoId === r.id ? stopDemo() : startDemo(r))}
          />
        ))}
        <p className="px-4 py-3 text-[10px] leading-snug text-slate-600">
          Los mapas dermatómicos y las raíces de los reflejos varían entre autores
          (ASIA, Keegan). Úsalo como guía de razonamiento segmentario, no como
          límite exacto. Contenido educativo.
        </p>
      </div>
    </div>
  );
}

function NerveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3v6a4 4 0 0 0 4 4h1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 21v-6a4 4 0 0 1 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="7" r="2" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="19" cy="11" r="2" />
    </svg>
  );
}
