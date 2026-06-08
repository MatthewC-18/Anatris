// src/components/ConceptTrackView.tsx
//
// Renderer for CONCEPTUAL modules (e.g. Fundamentos). Unlike PhaseTrack, which
// walks a region's muscles through 7 anatomical phases, a ConceptTrack is a
// flat ordered list of teaching SECTIONS (planes, axes, nomenclature,
// contraction types, levers, kinetic chains). This view:
//   - shows a left rail of section tabs (numbered, like the 7-phase strip),
//   - renders the active section's sourced prose + optional key-term glossary,
//   - offers an optional "Ver en 3D" action that asks the viewer to overlay the
//     anatomical planes/axes on the live model (reusing the existing camera
//     system) - done DEFENSIVELY so it is a no-op until that store action is
//     wired, never a crash,
//   - renders small built-in SVG diagrams for the 2D concepts (contraction
//     types, lever classes, kinetic chains).
//
// Styling reuses the project tokens (slate/ink/accent, glass, font-display) so
// it matches PhaseTrack and SelectionPanel.

import { useState } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { Sourced } from './MuscleContentSections';
import type {
  ConceptTrack,
  ConceptSection,
  ConceptDiagram,
} from '../types/concept';

interface ConceptTrackViewProps {
  track: ConceptTrack;
}

export function ConceptTrackView({ track }: ConceptTrackViewProps) {
  const [activeId, setActiveId] = useState<string>(
    track.sections[0]?.id ?? '',
  );
  const active =
    track.sections.find((s) => s.id === activeId) ?? track.sections[0];

  return (
    <section className="flex h-full w-full flex-col bg-ink-900/40">
      {/* Section tab strip (numbered, like the 7-phase strip). */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-800/60 px-3 py-2">
        {track.sections.map((s, i) => {
          const isActive = s.id === active?.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveId(s.id)}
              title={s.summary}
              className={`group flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isActive
                    ? 'bg-accent/30 text-accent'
                    : 'bg-slate-800/70 text-slate-400'
                }`}
              >
                {i + 1}
              </span>
              <span className="font-medium">{s.title}</span>
            </button>
          );
        })}
      </div>

      {/* Module intro */}
      <div className="shrink-0 px-5 pt-4">
        <h2 className="font-display text-lg font-semibold text-slate-50">
          {track.conceptName}
        </h2>
        <div className="mt-1 text-sm leading-relaxed text-slate-400">
          <Sourced item={track.intro} />
        </div>
      </div>

      {/* Active section body */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-4">
        {active && <SectionBody section={active} />}
      </div>
    </section>
  );
}

/* ===========================================================================
 * SECTION BODY
 * ======================================================================== */

function SectionBody({ section }: { section: ConceptSection }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-base font-semibold text-slate-100">
          {section.title}
        </h3>
        <p className="mt-0.5 text-sm text-slate-500">{section.summary}</p>
      </div>

      {/* Optional 3D overlay action (planes / axes over the live model). */}
      {section.view && section.view.overlay !== 'none' && (
        <ConceptViewButton section={section} />
      )}

      {/* Teaching prose, each paragraph sourced. */}
      <div className="flex flex-col gap-3">
        {section.body.map((para, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-800/60 bg-slate-900/30 p-3 text-sm leading-relaxed text-slate-300"
          >
            <Sourced item={para} />
          </div>
        ))}
      </div>

      {/* Optional inline 2D diagram. */}
      {section.diagram && section.diagram !== 'none' && (
        <ConceptDiagramView kind={section.diagram} />
      )}

      {/* Optional key-term glossary. */}
      {section.terms && section.terms.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Términos clave
          </h4>
          <dl className="grid gap-2 sm:grid-cols-2">
            {section.terms.map((t) => (
              <div
                key={t.term}
                className="rounded-lg border border-slate-800/60 bg-slate-900/20 p-3"
              >
                <dt className="font-display text-sm font-semibold text-accent">
                  {t.term}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-400">
                  <Sourced item={t.definition} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

/* ===========================================================================
 * 3D OVERLAY ACTION (defensive: no-op until the store action is wired)
 * ===========================================================================
 * Fundamentos teaches planes & axes OVER the real model. The viewer is asked to
 * draw the overlay and frame a camera view through whatever store action exists.
 * We read the store actions dynamically and only call those present, so this
 * component never crashes if the 3D overlay is not yet implemented - it simply
 * shows nothing actionable until then.
 */
function ConceptViewButton({ section }: { section: ConceptSection }) {
  const store = useAnatomyStore() as unknown as Record<string, unknown>;
  const view = section.view;
  if (!view) return null;

  const requestView = store['requestView'];
  const requestConceptOverlay = store['requestConceptOverlay'];
  // Only offer the button if SOME 3D hook exists to act on.
  const canAct =
    typeof requestView === 'function' ||
    typeof requestConceptOverlay === 'function';

  const onClick = () => {
    if (typeof requestConceptOverlay === 'function') {
      (requestConceptOverlay as (o: string) => void)(view.overlay);
    }
    if (typeof requestView === 'function') {
      (requestView as (v: string) => void)(view.view);
    }
  };

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-300">
          {view.caption ? (
            <Sourced item={view.caption} />
          ) : (
            <span>Visualiza este concepto sobre el modelo 3D.</span>
          )}
        </div>
        {canAct && (
          <button
            type="button"
            onClick={onClick}
            className="shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
          >
            Ver en 3D
          </button>
        )}
      </div>
    </div>
  );
}

/* ===========================================================================
 * INLINE 2D DIAGRAMS (built-in SVG, no embedded data)
 * ======================================================================== */

function ConceptDiagramView({ kind }: { kind: ConceptDiagram }) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
      {kind === 'contraction-types' && <ContractionDiagram />}
      {kind === 'lever-classes' && <LeverDiagram />}
      {kind === 'kinetic-chains' && <KineticChainDiagram />}
    </div>
  );
}

/** Concentric / eccentric / isometric, as three labeled bars. */
function ContractionDiagram() {
  const rows = [
    { label: 'Concéntrica', note: 'El músculo se acorta', from: 120, to: 70 },
    { label: 'Excéntrica', note: 'El músculo se alarga', from: 70, to: 120 },
    { label: 'Isométrica', note: 'Longitud constante', from: 95, to: 95 },
  ];
  return (
    <svg viewBox="0 0 320 150" className="w-full" role="img" aria-label="Tipos de contracción">
      {rows.map((r, i) => {
        const y = 24 + i * 42;
        const x = 110;
        return (
          <g key={r.label}>
            <text x="0" y={y + 4} className="fill-slate-300" fontSize="11" fontWeight="600">
              {r.label}
            </text>
            <text x="0" y={y + 18} className="fill-slate-500" fontSize="9">
              {r.note}
            </text>
            {/* baseline (resting length) */}
            <line x1={x} y1={y} x2={x + 130} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
            {/* muscle bar (from -> to length) */}
            <rect x={x} y={y - 6} width={r.to} height="12" rx="3" fill="#22d3ee" opacity="0.35" />
            <rect x={x} y={y - 6} width={r.from} height="12" rx="3" fill="none" stroke="#22d3ee" strokeWidth="1.5" />
          </g>
        );
      })}
    </svg>
  );
}

/** First / second / third class levers, schematic. */
function LeverDiagram() {
  // Order along the bar: which of fulcrum (F) / load (R) / effort (E) is in the
  // middle defines the class.
  const levers = [
    { label: '1.er género', seq: ['E', 'F', 'R'], note: 'Fulcro en medio' },
    { label: '2.o género', seq: ['F', 'R', 'E'], note: 'Resistencia en medio' },
    { label: '3.er género', seq: ['F', 'E', 'R'], note: 'Potencia en medio' },
  ];
  const color: Record<string, string> = { F: '#a78bfa', E: '#22d3ee', R: '#ffa51e' };
  const name: Record<string, string> = { F: 'Fulcro', E: 'Potencia', R: 'Resistencia' };
  return (
    <div className="flex flex-col gap-3">
      <svg viewBox="0 0 320 150" className="w-full" role="img" aria-label="Géneros de palanca">
        {levers.map((lv, i) => {
          const y = 30 + i * 42;
          const xs = [120, 200, 280];
          return (
            <g key={lv.label}>
              <text x="0" y={y - 6} className="fill-slate-300" fontSize="11" fontWeight="600">
                {lv.label}
              </text>
              <text x="0" y={y + 8} className="fill-slate-500" fontSize="9">
                {lv.note}
              </text>
              <line x1="110" y1={y} x2="290" y2={y} stroke="#475569" strokeWidth="2" />
              {lv.seq.map((k, j) => (
                <g key={j}>
                  <circle cx={xs[j]} cy={y} r="7" fill={color[k]} />
                  <text x={xs[j]} y={y + 3} textAnchor="middle" fontSize="8" fontWeight="700" className="fill-ink-950">
                    {k}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
        {(['F', 'E', 'R'] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color[k] }} />
            {k} = {name[k]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Open vs closed kinetic chain, schematic. */
function KineticChainDiagram() {
  return (
    <svg viewBox="0 0 320 140" className="w-full" role="img" aria-label="Cadenas cinéticas">
      {/* Open chain: distal end free */}
      <text x="0" y="16" className="fill-slate-300" fontSize="11" fontWeight="600">
        Cadena abierta
      </text>
      <text x="0" y="30" className="fill-slate-500" fontSize="9">
        El extremo distal se mueve libre
      </text>
      <line x1="20" y1="55" x2="80" y2="45" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="45" x2="140" y2="60" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="45" r="4" fill="#a78bfa" />
      <circle cx="140" cy="60" r="5" fill="#ffa51e" />
      <text x="148" y="63" className="fill-slate-500" fontSize="9">libre</text>

      {/* Closed chain: distal end fixed */}
      <text x="0" y="92" className="fill-slate-300" fontSize="11" fontWeight="600">
        Cadena cerrada
      </text>
      <text x="0" y="106" className="fill-slate-500" fontSize="9">
        El extremo distal está fijo
      </text>
      <line x1="20" y1="128" x2="80" y2="120" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="120" x2="140" y2="132" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
      <circle cx="80" cy="120" r="4" fill="#a78bfa" />
      <line x1="120" y1="135" x2="160" y2="135" stroke="#64748b" strokeWidth="2" />
      <text x="148" y="128" className="fill-slate-500" fontSize="9">fijo</text>
    </svg>
  );
}
