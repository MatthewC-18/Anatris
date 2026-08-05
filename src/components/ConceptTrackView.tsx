// src/components/ConceptTrackView.tsx
//
// READING COLUMN of a conceptual module (e.g. Fundamentos). Unlike PhaseTrack,
// which walks a region's muscles through 7 anatomical phases, a ConceptTrack is
// a flat ordered list of teaching SECTIONS (planes, axes, nomenclature,
// contraction types, levers, kinetic chains). This view:
//   - shows a section tab strip (numbered, like the 7-phase strip),
//   - renders the active section's sourced prose + optional key-term glossary.
//
// WHAT LIVES ON THE OTHER SIDE (ConceptStage.tsx): the section TITLE, its 3D
// caption, the camera view + planes/axes overlay, the layer controls and the
// full-size schematic. The active section id lives in the store so both halves
// stay in sync, and the stage applies each section's 3D framing automatically —
// there is no "Ver en 3D" button to press any more.
//
// The small inline schematic is kept for COMPACT screens only: there the stage
// is a short strip above the text and the figure has to travel with the prose.
//
// Styling reuses the project tokens (slate/ink/accent, glass, font-display) so
// it matches PhaseTrack and SelectionPanel.

import { useAnatomyStore } from '../store/anatomyStore';
import { Sourced } from './MuscleContentSections';
import { ConceptDiagramView, hasDiagram } from './ConceptDiagrams';
import type { ConceptTrack, ConceptSection } from '../types/concept';

interface ConceptTrackViewProps {
  track: ConceptTrack;
}

export function ConceptTrackView({ track }: ConceptTrackViewProps) {
  const activeId = useAnatomyStore((s) => s.conceptSectionId);
  const setConceptSection = useAnatomyStore((s) => s.setConceptSection);
  const active =
    track.sections.find((s) => s.id === activeId) ?? track.sections[0];
  const activeIndex = track.sections.findIndex((s) => s.id === active?.id);

  const go = (delta: number) => {
    const next = track.sections[activeIndex + delta];
    if (next) setConceptSection(next.id);
  };

  return (
    <section className="flex h-full w-full flex-col bg-ink-900/40">
      {/* Section tab strip (numbered). In a narrow side panel, showing all
          full titles overflows, so inactive tabs collapse to just their number
          and only the ACTIVE tab reveals its title. Hovering an inactive tab
          still shows its summary via the title attribute. */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-800/60 px-3 py-2">
        {track.sections.map((s, i) => {
          const isActive = s.id === active?.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setConceptSection(s.id)}
              title={s.title}
              aria-label={s.title}
              className={`group flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isActive
                    ? 'bg-accent/30 text-accent'
                    : 'bg-slate-800/70 text-slate-400'
                }`}
              >
                {i + 1}
              </span>
              {isActive && (
                <span className="whitespace-nowrap font-medium">{s.title}</span>
              )}
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
      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
        {active && <SectionBody section={active} />}
      </div>

      {/* Sequential navigation: the strip is for jumping, this is for reading
          straight through, which is how a fundamentals module is meant to be
          consumed the first time. */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-800/60 px-5 py-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={activeIndex <= 0}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200 disabled:pointer-events-none disabled:opacity-30"
        >
          Anterior
        </button>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-600">
          {activeIndex + 1} / {track.sections.length}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={activeIndex >= track.sections.length - 1}
          className="rounded-lg bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/25 disabled:pointer-events-none disabled:opacity-30"
        >
          Siguiente
        </button>
      </div>
    </section>
  );
}

/* ===========================================================================
 * SECTION BODY
 * ======================================================================== */

function SectionBody({ section }: { section: ConceptSection }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="font-display text-xl font-semibold text-slate-100">
          {section.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          {section.summary}
        </p>
      </div>

      {/* Teaching prose: flows as a reading column, each paragraph sourced. */}
      <div className="flex flex-col gap-4 text-[15px] leading-7 text-slate-300">
        {section.body.map((para, i) => (
          <Sourced key={i} item={para} />
        ))}
      </div>

      {/* Inline schematic, COMPACT ONLY: on desktop the stage renders it at full
          size beside the text and repeating it here would be duplication. */}
      {hasDiagram(section.diagram) && section.diagram && (
        <div className="lg:hidden">
          <ConceptDiagramView kind={section.diagram} size="inline" />
        </div>
      )}

      {/* Optional key-term glossary, as a clean definition list. */}
      {section.terms && section.terms.length > 0 && (
        <div className="mt-1">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Términos clave
          </h4>
          <dl className="mt-2 divide-y divide-slate-800/60">
            {section.terms.map((t) => (
              <div
                key={t.term}
                className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-x-6"
              >
                <dt className="font-display text-sm font-semibold text-accent">
                  {t.term}
                </dt>
                <dd className="text-sm leading-relaxed text-slate-400">
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
