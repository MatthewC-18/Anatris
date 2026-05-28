// src/components/AttributionScreen.tsx
//
// Attribution screen fulfilling the BY (attribution) requirement of the
// Z-Anatomy model's CC BY-SA 4.0 license. The 3D anatomical model is a
// derivative work of Z-Anatomy and MUST credit its authors and link the
// license wherever the app is distributed.
//
// IMPORTANT (legal): this component satisfies ATTRIBUTION only. The ShareAlike
// (SA) obligation -- whether the modified model itself must be offered under
// CC BY-SA, and how to keep your own code/clinical content separate from that
// obligation -- is a question for an intellectual-property lawyer for your
// jurisdiction. This screen does NOT resolve ShareAlike. Do not treat its
// existence as legal clearance to sell.
//
// ASCII-only source. UI strings Spanish LATAM. No `any`. English comments.

interface CreditEntry {
  /** What is being credited. */
  work: string;
  /** Author(s) to credit. */
  authors: string;
  /** License name shown to the user. */
  license: string;
  /** Link to the license text. */
  licenseUrl: string;
  /** Optional link to the original work. */
  sourceUrl?: string;
  /** Short note on what was used / modified, for transparency. */
  note?: string;
}

// The model credits. Keep these accurate; they are a license obligation, not
// decoration. Z-Anatomy is CC BY-SA 4.0 by Gauthier Kervyn (building on the
// BodyParts model by Kousaku Okubo) and contributors.
const MODEL_CREDITS: CreditEntry[] = [
  {
    work: 'Modelo anatomico 3D (Z-Anatomy)',
    authors: 'Gauthier Kervyn y colaboradores; basado en BodyParts de Kousaku Okubo',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    sourceUrl: 'https://www.z-anatomy.com/',
    note: 'El modelo 3D utilizado en esta aplicacion deriva de Z-Anatomy. Se han modificado colores, visibilidad y recortes de regiones para fines didacticos.',
  },
];

export function AttributionScreen(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-50">
          Creditos y licencias
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          Esta aplicacion utiliza recursos de terceros bajo licencias abiertas.
          A continuacion se reconoce a sus autores, segun lo exigen dichas
          licencias.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        {MODEL_CREDITS.map((c) => (
          <article
            key={c.work}
            className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-5"
          >
            <h2 className="font-display text-base font-semibold text-slate-100">
              {c.work}
            </h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Autoria
                </dt>
                <dd className="text-slate-300">{c.authors}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Licencia
                </dt>
                <dd>
                  <a
                    href={c.licenseUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                  >
                    {c.license}
                  </a>
                </dd>
              </div>
              {c.sourceUrl && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Fuente original
                  </dt>
                  <dd>
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                    >
                      {c.sourceUrl}
                    </a>
                  </dd>
                </div>
              )}
              {c.note && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Modificaciones
                  </dt>
                  <dd className="leading-relaxed text-slate-400">{c.note}</dd>
                </div>
              )}
            </dl>
          </article>
        ))}
      </section>

      <p className="text-xs leading-relaxed text-slate-600">
        La licencia CC BY-SA 4.0 exige reconocer la autoria y compartir las
        obras derivadas del modelo bajo la misma licencia. El alcance exacto de
        esa obligacion respecto a esta aplicacion debe ser revisado con asesoria
        legal especializada.
      </p>
    </div>
  );
}
