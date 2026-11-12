// src/components/MuscleContentSections.tsx
//
// Shared render primitives for displaying MuscleContent in the reading screens:
// the PhaseTrack (pedagogical phases), the guided gestures (BiomechanicsGuide)
// and the Fundamentos module (ConceptTrackView, ConceptStage).
//
// NOTE: SelectionPanel.tsx keeps its own private copies of these components.
// Both follow the LAMINA sources row (mono tags separated by a middle dot); if
// you change how a source reads, keep the two in step.

import { useState } from 'react';
import { REFERENCES, sourceUrl, sourceLinkLabel, type Reference } from '../data/references';
import type { SourcedText, Citation, MuscleAction } from '../types/muscleContent';

/** La cita completa de una referencia, como en la bibliografia de Evidencia. */
function fullCitation(ref: Reference): string {
  const authors = ref.authors.replace(/\.$/, '');
  const edition = ref.edition ? `${ref.edition}. ` : '';
  const volume = ref.volume ? ` ${ref.volume}.` : '';
  return `${authors}. ${ref.title}. ${edition}${ref.publisher}; ${ref.year}.${volume}`;
}

/**
 * The sources under a claim: mono tags separated by a middle dot (they were
 * bordered chips with a tinted fill, one per source).
 *
 * CADA FUENTE SE PUEDE ABRIR. La cita solo decia el primer autor ("DRAKE RL") y
 * la obra entera vivia en un `title`, que en una tableta o un movil no se ve
 * nunca: el fisio leia una fuente a la que no podia llegar. Pulsar la etiqueta
 * despliega debajo la cita completa (autores, obra, edicion, editorial, ano y el
 * localizador) y, si es un articulo, el enlace a PubMed o al DOI, el mismo que
 * da la pantalla de Evidencia. Una sola abierta a la vez.
 */
export function CitationRow({ cites }: { cites: Citation[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!cites || cites.length === 0) return null;
  const openCite = open !== null ? cites[open] : undefined;
  const openRef = openCite ? REFERENCES[openCite.ref] : undefined;
  const openLocator = openCite ? (openCite.page ?? openCite.section) : undefined;
  const openUrl = openRef ? sourceUrl(openRef) : null;
  return (
    <div className="mt-1">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {cites.map((c, i) => {
          const ref = REFERENCES[c.ref];
          const label = ref ? ref.authors.split(',')[0] : c.ref;
          const locator = c.page ?? c.section;
          const isOpen = open === i;
          return (
            <span key={i} className="inline-flex items-baseline gap-2">
              {i > 0 && (
                <span className="tag" aria-hidden="true">
                  ·
                </span>
              )}
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                title={ref ? `${ref.authors}. ${ref.title}` : c.ref}
                // `-my-1.5 py-1.5`: la etiqueta mide 10 px de letra y en una
                // pantalla tactil no se acertaba; se agranda la zona que
                // responde sin mover la linea.
                className={`tag -my-1.5 rounded py-1.5 text-left transition-colors hover:text-fg2 ${
                  isOpen ? 'text-fg2 underline decoration-line underline-offset-4' : ''
                }`}
              >
                {label}
                {locator ? `, ${locator}` : ''}
                {/* EL TRIANGULO AMARILLO ESTABA EN TODAS LAS CITAS, Y NO DECIA NADA.
                    `pageVerified` es falso por defecto, asi que la ficha de un
                    musculo salia con tres o cuatro avisos de peligro seguidos y la
                    pagina leia "esto no es de fiar" cuando lo unico sin confirmar
                    era el NUMERO DE PAGINA. Peor: la mayoria de esas citas no
                    llevan pagina, asi que el aviso no se referia a nada.
                    Ahora se marca solo cuando hay localizador que dudar, y con un
                    interrogante discreto en vez de una alarma. Lo que de verdad no
                    esta cotejado se dice con palabras donde toca (ver el pie del
                    panel de neuro). */}
                {locator && !c.pageVerified && (
                  <span title="Localizador por confirmar contra la edición citada" className="ml-1">
                    ?
                  </span>
                )}
              </button>
            </span>
          );
        })}
      </p>
      {openCite && (
        <p className="note mt-1.5 max-w-prose">
          {/* Una cita que apunta a un id que no esta en la bibliografia (la
              rodilla y Fundamentos citan 'gray', que no existe: el libro de
              Gray es 'descriptive') se dice como tal en vez de ensenar el id
              crudo como si fuera la cita. */}
          {openRef
            ? fullCitation(openRef)
            : `Esta fuente («${openCite.ref}») no está registrada en la bibliografía de la aplicación.`}
          {openLocator && (
            <>
              {' '}
              <span className="num text-fg3">{openLocator}</span>
              {!openCite.pageVerified && (
                <span className="text-fg3"> (localizador por confirmar contra la edición citada)</span>
              )}
            </>
          )}
          {openRef && openUrl && (
            <>
              {' '}
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap font-medium text-brand underline-offset-4 hover:underline"
              >
                {sourceLinkLabel(openRef)}
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}

export function Sourced({ item }: { item: SourcedText }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-fg/85">{item.text}</p>
      <CitationRow cites={item.cite} />
    </div>
  );
}

export function SourcedList({ items }: { items: SourcedText[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <li key={i}>
          <Sourced item={it} />
        </li>
      ))}
    </ul>
  );
}

export function ActionItem({ action }: { action: MuscleAction }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-fg/85">{action.text}</p>
      <CitationRow cites={action.cite} />
    </div>
  );
}
