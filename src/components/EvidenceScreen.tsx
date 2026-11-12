// src/components/EvidenceScreen.tsx
//
// "Evidencia clínica" page for a region: every source behind that region's
// clinical numbers, in one place, each linked to PubMed (studies) or shown as a
// full citation (textbooks). It makes the app's honesty convention visible:
//   - each diagnostic-accuracy study lists which tests use it and whether those
//     numbers are verified against the primary source (amber "por verificar"
//     until checked);
//   - a headline readout summarises how much of the region is verified.
//
// PRESENTACION: LAMINA. Era una pila de tarjetas (una por estudio, otra para la
// cifra de verificacion, otra para el aviso de region vacia) con una pastilla
// de color para el estado y un boton con caja para el enlace. Ahora es una
// bibliografia: filas partidas por filos, el estado como etiqueta en mono, el
// enlace como texto, y la verificacion como una cifra grande con su medidor de
// 2 px.
//
// Rendered as an App overlay (Overlay 'evidence'), region-scoped. UI Spanish
// LATAM with accents; source ASCII. No em-dashes in visible copy (house style).

import { useMemo } from 'react';
import { REGIONS } from '../data/regiones';
import { sourceUrl, sourceLinkLabel, type Reference } from '../data/references';
import { evidenceForRegion, type EvidenceStudy, type EvidenceBook } from '../lib/evidence';

function regionLabel(region: string | null): string {
  if (region && REGIONS[region]) return REGIONS[region].name;
  return 'Región';
}

/** Vancouver-ish author + year head, kept short for the row title. */
function studyTitleLine(ref: Reference): string {
  const firstAuthor = ref.authors.split(',')[0]?.trim() ?? ref.authors;
  return `${firstAuthor} et al., ${ref.year}`;
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M14 5h5v5M19 5l-8 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Verified/pending state of a study, from its verified vs. total cite counts.
 *  Una etiqueta en mono con el tono en la letra: verde lo cotejado, ambar lo
 *  que falta (ambar es el color de los avisos en todo el sistema). */
function VerifiedTag({ verified, total }: { verified: number; total: number }) {
  if (total > 0 && verified === total) {
    return <span className="tag shrink-0 text-clinical">Verificado</span>;
  }
  if (verified > 0) {
    return (
      <span className="tag shrink-0 text-amber-300/90">
        {verified} de {total} verificados
      </span>
    );
  }
  return <span className="tag shrink-0 text-amber-300/90">Por verificar</span>;
}

function StudyRow({ study }: { study: EvidenceStudy }) {
  const { ref } = study;
  const url = sourceUrl(ref);
  const linkLabel = sourceLinkLabel(ref);
  // De-duplicate test names (a study can back several categories of one test set).
  const tests = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const u of study.usedBy) {
      if (seen.has(u.testName)) continue;
      seen.add(u.testName);
      names.push(u.testName);
    }
    return names;
  }, [study.usedBy]);
  // A single shared locator, when every cite agrees on it (else omit).
  const locator = useMemo(() => {
    const locs = new Set(study.usedBy.map((u) => u.locator).filter(Boolean));
    return locs.size === 1 ? [...locs][0] : undefined;
  }, [study.usedBy]);

  return (
    <li className="py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-fg">{studyTitleLine(ref)}</p>
        <VerifiedTag verified={study.verifiedCount} total={study.totalCount} />
      </div>
      <p className="mt-0.5 text-[13px] italic leading-snug text-fg/85">{ref.title}</p>
      <p className="mt-0.5 text-xs text-fg3">
        {ref.publisher}
        {ref.authors ? ` · ${ref.authors}` : ''}
      </p>

      {tests.length > 0 && (
        <p className="mt-2.5 text-xs leading-snug text-fg2">
          <span className="text-fg3">Respalda: </span>
          {tests.join(', ')}
        </p>
      )}

      {/* SOBRE QUIEN SE MIDIO Y CONTRA QUE.
          Esta pagina listaba autor, titulo y revista: una bibliografia. Lo que
          convierte una cita en evidencia legible son otras dos cosas, y las
          dos estan ya en el fichero de referencias: la MUESTRA (`sample`) y el
          PATRON DE REFERENCIA (`standard`). Una sensibilidad del 94% medida
          contra bloqueo anestesico en 48 pacientes y la misma cifra medida
          contra la impresion clinica de un explorador no valen igual, y hasta
          ahora la pagina no dejaba verlo. Se dibuja solo donde la fuente lo
          trae, asi que no deja huecos en las que aun no lo tienen. */}
      {(ref.sample || ref.standard) && (
        <dl className="mt-2.5 flex flex-col gap-1 text-xs leading-snug">
          {ref.sample && (
            <div>
              <dt className="inline text-fg3">Muestra. </dt>
              <dd className="inline text-fg2">{ref.sample}</dd>
            </div>
          )}
          {ref.standard && (
            <div>
              <dt className="inline text-fg3">Patrón de referencia. </dt>
              <dd className="inline text-fg2">{ref.standard}</dd>
            </div>
          )}
        </dl>
      )}

      {/* Y QUE ENCONTRO. `note` lleva el hallazgo con sus cifras y sus
          salvedades -- que una prueba no tiene especificidad publicada, que el
          79% que todo el mundo cita es la exactitud y no la especificidad, que
          el 40% de las roturas no las vio ninguna de las cuatro pruebas. Es la
          diferencia entre citar un estudio y haberlo leido. */}
      {ref.note && <p className="note mt-2.5">{ref.note}</p>}

      {(url || locator) && (
        <p className="mt-2.5 flex items-center gap-3">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-brand underline-offset-4 hover:underline"
            >
              <ExternalLinkIcon />
              {linkLabel}
            </a>
          )}
          {locator && <span className="num text-[11px] text-fg3">{locator}</span>}
        </p>
      )}
    </li>
  );
}

function BookRow({ book }: { book: EvidenceBook }) {
  const { ref } = book;
  const cite = `${ref.authors.replace(/\.$/, '')}. ${ref.title}. ${
    ref.edition ? `${ref.edition}. ` : ''
  }${ref.publisher}; ${ref.year}.`;
  return (
    <li className="flex flex-col gap-1 py-3">
      <span className="text-[13px] leading-snug text-fg/85">{cite}</span>
      <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-fg3">
        {ref.volume && <span>{ref.volume}</span>}
        {ref.volume && <span aria-hidden="true">·</span>}
        <span>
          {book.citeCount} cita{book.citeCount === 1 ? '' : 's'} en esta región
        </span>
        {!book.anyPageVerified && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-amber-300/80" title="Páginas por confirmar contra el ejemplar">
              páginas por verificar
            </span>
          </>
        )}
      </span>
    </li>
  );
}

export function EvidenceScreen({ region }: { region: string | null }) {
  const label = regionLabel(region);
  const { studies, books, studyVerified, studyTotal } = useMemo(
    () => evidenceForRegion(region),
    [region],
  );
  const pct = studyTotal > 0 ? Math.round((studyVerified / studyTotal) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-7 px-6 py-7">
      <header>
        <h1 className="font-display text-2xl font-semibold text-fg">
          Evidencia clínica · {label}
        </h1>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-fg2">
          Todas las fuentes detrás de los números de esta región. Cada estudio
          enlaza a PubMed; cada libro aparece con su cita completa.
        </p>
      </header>

      {/* Headline honesty readout: how much of the region's test data is
          verified. La cifra grande es el porcentaje; debajo, de cuantas citas
          sale y el medidor de 2 px. */}
      {studyTotal > 0 && (
        <section>
          <div className="sec-head">
            <h2 className="kicker">Verificación de fuentes</h2>
            <span className="sec-rule" />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="readout text-3xl">{pct}%</span>
            <span className="num text-xs text-fg2">
              {studyVerified} de {studyTotal} citas
            </span>
          </div>
          <span
            className="meter mt-3 block text-clinical"
            style={{ '--v': pct } as React.CSSProperties}
            aria-hidden="true"
          />
          <p className="mt-3 max-w-prose text-xs leading-relaxed text-fg3">
            Verificado significa que la sensibilidad y especificidad se contrastaron
            con la fuente primaria. Las que faltan se marcan como «por verificar»
            hasta confirmarlas.
          </p>
        </section>
      )}

      {/* Studies (diagnostic-accuracy articles) with PubMed links. */}
      {studies.length > 0 ? (
        <section>
          <div className="sec-head mb-0">
            <h2 className="kicker">Pruebas clínicas: precisión diagnóstica</h2>
            <span className="sec-rule" />
            <span className="num shrink-0 text-[11px] text-fg3">{studies.length}</span>
          </div>
          <ol className="divide-y divide-line/75">
            {studies.map((s) => (
              <StudyRow key={s.ref.id} study={s} />
            ))}
          </ol>
        </section>
      ) : (
        <p className="note">
          Esta región todavía no tiene tests ortopédicos con estudios asociados.
          Consulta los libros de referencia más abajo.
        </p>
      )}

      {/* Textbook backbone (no PubMed: books are not indexed there). */}
      {books.length > 0 && (
        <section>
          <div className="sec-head mb-1">
            <h2 className="kicker">Libros de referencia</h2>
            <span className="sec-rule" />
            <span className="num shrink-0 text-[11px] text-fg3">{books.length}</span>
          </div>
          <p className="max-w-prose text-xs leading-snug text-fg3">
            Fuentes de anatomía descriptiva y biomecánica que sustentan el
            recorrido articular y el contenido muscular de esta región.
          </p>
          <ul className="mt-1 divide-y divide-line/75">
            {books.map((b) => (
              <BookRow key={b.ref.id} book={b} />
            ))}
          </ul>
        </section>
      )}

      <p className="max-w-prose text-[11px] leading-relaxed text-fg3">
        Los valores de sensibilidad y especificidad varían según el estudio, el
        grado de lesión y el criterio de positividad. Interpreta cada prueba
        dentro del cuadro clínico y en conjunto, nunca de forma aislada. Contenido
        educativo, no sustituye el criterio profesional.
      </p>
    </div>
  );
}
