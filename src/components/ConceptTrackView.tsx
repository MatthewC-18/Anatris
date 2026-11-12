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
// stay in sync, and the stage applies each section's 3D framing automatically,
// so there is no "Ver en 3D" button to press any more.
//
// The small inline schematic is kept for COMPACT screens only: there the stage
// is a short strip above the text and the figure has to travel with the prose.
//
// PRESENTACION: LAMINA, la misma que PhaseTrack. Pestanas numeradas subrayadas
// (eran pastillas con un circulo tintado), glosario como lista de definiciones
// partida por filos bajo un rotulo, y la navegacion de pie como dos botones de
// texto, no un boton relleno de acento.
//
// EL ANCHO DE LINEA. En escritorio la columna mide 440 a 520 px y el texto ya
// cae en unos 60 a 70 caracteres. Por debajo de `lg` la columna ocupa la
// ventana entera, y en una tableta en vertical (768 px) el parrafo se iba a
// mas de 100 caracteres por linea: se acota a 32 rem y se centra.

import { useEffect, useRef } from 'react';
import { useAnatomyStore } from '../store/anatomyStore';
import { Sourced } from './MuscleContentSections';
import { ConceptDiagramView, hasDiagram } from './ConceptDiagrams';
import type { ConceptTrack, ConceptSection } from '../types/concept';

const SECTION_KEY = 'anatris.concept.section';

function readSavedSection(): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(SECTION_KEY);
  } catch {
    return null;
  }
}

function saveSection(id: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(SECTION_KEY, id);
  } catch {
    // Sin almacenamiento la seccion no se recuerda. No es un error.
  }
}

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

  // LA SECCION POR LA QUE IBA. `conceptSectionId` vive en memoria y el store lo
  // pone a null al salir de Fundamentos, asi que volver al modulo (o recargar)
  // abria siempre la seccion 1. Se recuerda en este navegador: es una comodidad
  // por usuario y cada acceso esta protegido.
  useEffect(() => {
    if (useAnatomyStore.getState().conceptSectionId != null) return;
    const saved = readSavedSection();
    if (saved && track.sections.some((s) => s.id === saved)) setConceptSection(saved);
    // Solo al montar: despues manda lo que elija el lector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (activeId) saveSection(activeId);
  }, [activeId]);

  // CADA SECCION EMPIEZA ARRIBA. El cuerpo es el mismo contenedor con scroll
  // para las siete secciones, asi que al pulsar "Siguiente" desde el pie de una
  // seccion larga la nueva se abria por la mitad, con el titulo fuera de vista.
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [active?.id]);

  return (
    <section className="flex h-full w-full flex-col bg-page">
      {/* Section tab strip (numbered). In a narrow side panel, showing all
          full titles overflows, so inactive tabs collapse to just their number
          and only the ACTIVE tab reveals its title. Hovering an inactive tab
          still shows its summary via the title attribute. The base rule lives
          INSIDE the scroller so the active tab's 2 px underline is not clipped
          to 1 px against the scroll edge. */}
      <div className="shrink-0 overflow-x-auto">
        <div role="tablist" aria-label="Secciones del módulo" className="tabs min-w-max px-5">
          {track.sections.map((s, i) => {
            const isActive = s.id === active?.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setConceptSection(s.id)}
                title={s.title}
                aria-label={s.title}
                className="tab"
              >
                <span className={`num text-[11px] ${isActive ? 'text-brand' : ''}`}>{i + 1}</span>
                {isActive && <span className="whitespace-nowrap">{s.title}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Module intro */}
      <div className="shrink-0 px-5 pt-5">
        <div className="mx-auto max-w-[32rem]">
          <h2 className="font-display text-lg font-semibold text-fg">{track.conceptName}</h2>
          <div className="mt-1.5">
            <Sourced item={track.intro} />
          </div>
        </div>
      </div>

      {/* Active section body */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 pb-6 pt-5">
        {/* Keyed by section: a citation opened in one section must not stay
            open on the paragraph that takes its place in the next one. */}
        <div className="mx-auto max-w-[32rem]">
          {active && <SectionBody key={active.id} section={active} />}
        </div>
      </div>

      {/* Sequential navigation: the strip is for jumping, this is for reading
          straight through, which is how a fundamentals module is meant to be
          consumed the first time. */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line/75 px-5 py-2.5">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={activeIndex <= 0}
          className="btn btn-quiet btn-sm"
        >
          Anterior
        </button>
        <span className="num text-[11px] text-fg3">
          {activeIndex + 1} / {track.sections.length}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={activeIndex >= track.sections.length - 1}
          className="btn btn-line btn-sm"
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
        <h3 className="font-display text-xl font-semibold text-fg">{section.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-fg3">{section.summary}</p>
      </div>

      {/* EL PIE DE LA FIGURA, EN COMPACTO. Por debajo de lg el escenario es una
          franja de 45vh y su rotulo flotante ya no esta (ConceptStage solo deja
          ahi una anotacion de una linea): sin esto, la frase que explica que
          ensenan los planos o los ejes del modelo desaparecia en la tableta y
          en el movil. Desde lg la escribe el propio escenario. */}
      {section.view?.caption && (
        <div className="note note-brand lg:hidden">
          <p className="kicker mb-1.5">En el modelo</p>
          <Sourced item={section.view.caption} />
        </div>
      )}

      {/* Teaching prose: flows as a reading column, each paragraph sourced. */}
      <div className="flex flex-col gap-4">
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
        <div>
          <div className="sec-head mb-0">
            <h4 className="kicker">Términos clave</h4>
            <span className="sec-rule" />
          </div>
          <dl className="divide-y divide-line/75">
            {section.terms.map((t) => (
              <div
                key={t.term}
                className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-5"
              >
                <dt className="font-display text-sm font-semibold text-brand">{t.term}</dt>
                <dd className="min-w-0">
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
