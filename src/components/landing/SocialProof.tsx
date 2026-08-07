// src/components/landing/SocialProof.tsx
//
// The trust block of the landing.
//
// WHY: in a health product, confidence IS the product. A student comparing
// Anatris against an app that says "Elsevier" needs a reason to believe the
// numbers here. The page had none — no quotes, no institutions, no sourcing.
//
// TWO KINDS OF PROOF, and the distinction matters:
//
//   1. TESTIMONIALS — social proof. Renders only when `TESTIMONIALS` actually
//      has permissioned, real entries (see src/data/testimonials.ts). Until
//      then this half is simply absent. We do not ship invented praise.
//
//   2. BIBLIOGRAPHIC BACKING — authority proof, and it is TRUE TODAY: the
//      clinical content is authored against these works, every figure carries a
//      `cite`, and the app exposes them in "Evidencia" and in each muscle
//      sheet. This is the honest thing to lead with while the quotes are being
//      collected.
//
// PRESENTED AS A BIBLIOGRAPHY, not as a logo wall of five boxes. Author, title
// and edition set as a reference list is both the truthful format for what this
// is and the one a clinician already knows how to read.
//
// NOTE ON THE BOOK LIST: the titles are duplicated here as short display
// labels rather than imported from `src/data/references.ts` on purpose. The
// landing lives in the ENTRY chunk (see the code-splitting note in App.tsx);
// importing the reference registry would drag the whole studies list — which
// only "Evidencia" needs — into the download every visitor pays for. Keep the
// two in sync by hand; there are five, and they change once a year at most.

import { TESTIMONIALS } from '../../data/testimonials';

/** Short display labels for the works the clinical content is authored from. */
const SOURCES: { author: string; work: string }[] = [
  { author: 'Kapandji, A. I.', work: 'Fisiología articular' },
  { author: 'Oatis, C. A.', work: 'Kinesiology: The Mechanics and Pathomechanics of Human Movement' },
  { author: 'Neumann, D. A.', work: 'Kinesiology of the Musculoskeletal System' },
  { author: 'Magee, D. J.', work: 'Orthopedic Physical Assessment' },
  { author: 'Dufour, M.', work: 'Anatomía del aparato locomotor' },
];

export function SocialProof() {
  const hasQuotes = TESTIMONIALS.length > 0;

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <div>
            <h2 className="font-serif text-2xl font-normal leading-snug text-fg">
              De dónde salen los datos
            </h2>
          </div>

          <div>
            <p className="max-w-xl text-[15px] leading-relaxed text-fg2">
              Los rangos articulares, las acciones musculares y el rendimiento
              diagnóstico de cada test se redactan contra obras de referencia y
              estudios indexados. Cada ficha indica su fuente y la pantalla de
              Evidencia enlaza los estudios en PubMed.
            </p>

            {/* Reference list. */}
            <ul className="mt-8 border-t border-line">
              {SOURCES.map((s) => (
                <li
                  key={s.author}
                  className="flex flex-col gap-0.5 border-b border-line py-3 sm:flex-row sm:items-baseline sm:gap-4"
                >
                  <span className="w-40 shrink-0 text-sm font-medium text-fg">
                    {s.author}
                  </span>
                  <span className="text-sm leading-snug text-fg2">{s.work}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Testimonials — absent until real ones exist. */}
        {hasQuotes && (
          <ul className="mt-12 grid gap-8 border-t border-line pt-10 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <li key={t.name}>
                <blockquote className="font-serif text-[17px] leading-relaxed text-fg">
                  {t.quote}
                </blockquote>
                <footer className="mt-4">
                  <p className="text-sm font-medium text-fg">{t.name}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-fg3">
                    {t.role}, {t.institution}
                  </p>
                </footer>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
