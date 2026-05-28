// src/components/MedicalDisclaimer.tsx
//
// Medical / educational disclaimer. An anatomy + clinical-reasoning product
// aimed at physiotherapy students must make clear it is an EDUCATIONAL tool and
// does not replace clinical judgement, formal training, or professional care.
// This protects users and limits liability.
//
// Two variants:
//   - <MedicalDisclaimerBanner /> : compact strip for persistent placement
//     (e.g. footer of the Learn track, or first run).
//   - <MedicalDisclaimerScreen /> : full text for an "About / Legal" section
//     or a one-time acceptance gate.
//
// NOTE (legal): this is reasonable, plain-language disclaimer copy, NOT legal
// advice. Before selling, have a lawyer review the exact wording and whether
// you need an explicit acceptance step (clickwrap) for your jurisdiction.
//
// ASCII-only source. UI strings Spanish LATAM. No `any`. English comments.

const WARN = String.fromCharCode(0x26a0);

/** Compact one-line disclaimer for persistent placement. */
export function MedicalDisclaimerBanner(): JSX.Element {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs leading-relaxed text-amber-200/80">
      <span aria-hidden className="shrink-0">
        {WARN}
      </span>
      <span>
        Contenido educativo. No sustituye la formacion profesional, el criterio
        clinico ni la atencion sanitaria. No debe usarse para diagnosticar ni
        tratar a pacientes reales.
      </span>
    </div>
  );
}

/** Full disclaimer for an About/Legal section or an acceptance gate. */
export function MedicalDisclaimerScreen(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-slate-50">
          Aviso importante
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Lee este aviso antes de usar la aplicacion.
        </p>
      </header>

      <section className="flex flex-col gap-4 text-sm leading-relaxed text-slate-300">
        <p>
          Esta aplicacion es una herramienta <strong>educativa</strong> dirigida
          al estudio de la anatomia y la biomecanica, pensada para estudiantes y
          profesionales de la fisioterapia y disciplinas afines.
        </p>

        <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Lo que esta aplicacion NO es
          </h2>
          <ul className="mt-2 flex flex-col gap-2 text-slate-400">
            <li>
              No es un dispositivo medico ni una herramienta de diagnostico o
              tratamiento.
            </li>
            <li>
              No sustituye la formacion academica reglada, la supervision docente
              ni el criterio de un profesional sanitario cualificado.
            </li>
            <li>
              No debe utilizarse para tomar decisiones clinicas sobre pacientes
              reales.
            </li>
          </ul>
        </div>

        <p>
          El contenido clinico (tests, patologias, principios de tratamiento y
          casos) se elabora a partir de referencias academicas estandar y se
          ofrece como material de estudio. Puede contener simplificaciones,
          errores u omisiones, y debe contrastarse siempre con fuentes
          autorizadas y con la guia de un docente o profesional.
        </p>

        <p>
          Ante cualquier sintoma, lesion o duda de salud, consulta a un
          profesional sanitario cualificado. El uso de esta aplicacion es
          responsabilidad de la persona usuaria.
        </p>
      </section>
    </div>
  );
}
