// src/components/EvidenceScreen.tsx
//
// "Evidencia clínica" page for a region: every source behind that region's
// clinical numbers, in one place, each linked to PubMed (studies) or shown as a
// full citation (textbooks). It makes the app's honesty convention visible:
//   - each diagnostic-accuracy study lists which tests use it and whether those
//     numbers are verified against the primary source (amber "por verificar"
//     until checked);
//   - a headline bar summarises how much of the region is verified.
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

/** Verified/pending chip for a study, from its verified vs. total cite counts. */
function VerifiedChip({ verified, total }: { verified: number; total: number }) {
  if (total > 0 && verified === total) {
    return (
      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
        Verificado
      </span>
    );
  }
  if (verified > 0) {
    return (
      <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
        {verified} de {total} verificados
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
      Por verificar
    </span>
  );
}

function StudyCard({ study }: { study: EvidenceStudy }) {
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
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">{studyTitleLine(ref)}</p>
          <p className="mt-0.5 text-[13px] italic leading-snug text-slate-300">{ref.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {ref.publisher}
            {ref.authors ? ` · ${ref.authors}` : ''}
          </p>
        </div>
        <VerifiedChip verified={study.verifiedCount} total={study.totalCount} />
      </div>

      {tests.length > 0 && (
        <p className="mt-2.5 text-[11px] leading-snug text-slate-400">
          <span className="text-slate-500">Respalda: </span>
          {tests.join(', ')}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/20"
          >
            <ExternalLinkIcon />
            {linkLabel}
          </a>
        )}
        {locator && <span className="text-[10px] text-slate-500">{locator}</span>}
      </div>
    </div>
  );
}

function BookRow({ book }: { book: EvidenceBook }) {
  const { ref } = book;
  const cite = `${ref.authors.replace(/\.$/, '')}. ${ref.title}. ${
    ref.edition ? `${ref.edition}. ` : ''
  }${ref.publisher}; ${ref.year}.`;
  return (
    <li className="flex flex-col gap-1 border-b border-slate-800/40 py-2.5 last:border-0">
      <span className="text-[13px] leading-snug text-slate-300">{cite}</span>
      <span className="flex items-center gap-2 text-[10px] text-slate-500">
        {ref.volume && <span>{ref.volume}</span>}
        {ref.volume && <span className="text-slate-700">·</span>}
        <span>
          {book.citeCount} cita{book.citeCount === 1 ? '' : 's'} en esta región
        </span>
        {!book.anyPageVerified && (
          <>
            <span className="text-slate-700">·</span>
            <span className="text-amber-500/80" title="Páginas por confirmar contra el ejemplar">
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
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-7">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-50">
          Evidencia clínica · {label}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Todas las fuentes detrás de los números de esta región. Cada estudio
          enlaza a PubMed; cada libro aparece con su cita completa.
        </p>
      </header>

      {/* Headline honesty bar: how much of the region's test data is verified. */}
      {studyTotal > 0 && (
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">
              Verificación de fuentes
            </span>
            <span className="font-mono tabular-nums text-slate-300">
              {studyVerified} de {studyTotal} citas ({pct}%)
            </span>
          </div>
          <span className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <span
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${pct}%` }}
            />
          </span>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            Verificado significa que la sensibilidad y especificidad se contrastaron
            con la fuente primaria. Las que faltan se marcan como «por verificar»
            hasta confirmarlas.
          </p>
        </div>
      )}

      {/* Studies (diagnostic-accuracy articles) with PubMed links. */}
      {studies.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Pruebas clínicas: precisión diagnóstica
          </h2>
          {studies.map((s) => (
            <StudyCard key={s.ref.id} study={s} />
          ))}
        </section>
      ) : (
        <p className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4 text-sm text-slate-400">
          Esta región todavía no tiene tests ortopédicos con estudios asociados.
          Consulta los libros de referencia más abajo.
        </p>
      )}

      {/* Textbook backbone (no PubMed: books are not indexed there). */}
      {books.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-100">
            Libros de referencia
          </h2>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            Fuentes de anatomía descriptiva y biomecánica que sustentan el
            recorrido articular y el contenido muscular de esta región.
          </p>
          <ul className="mt-2">
            {books.map((b) => (
              <BookRow key={b.ref.id} book={b} />
            ))}
          </ul>
        </section>
      )}

      <p className="text-[11px] leading-relaxed text-slate-600">
        Los valores de sensibilidad y especificidad varían según el estudio, el
        grado de lesión y el criterio de positividad. Interpreta cada prueba
        dentro del cuadro clínico y en conjunto, nunca de forma aislada. Contenido
        educativo, no sustituye el criterio profesional.
      </p>
    </div>
  );
}
