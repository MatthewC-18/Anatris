// src/components/landing/LandingScreen.tsx
//
// Marketing landing: the first surface a new visitor sees (after the legal
// gate). Sells the value, then drops them into the app (free) or to checkout.
// Logged-in premium users skip this entirely (see App).
//
// Design intent: read as a purpose-built CLINICAL INSTRUMENT, not a generic
// product page. So the layout is asymmetric (not centered-everything), the hero
// carries a real goniometer graphic, the numbers are concrete, and the "method"
// is the app's actual 7-phase clinical track rather than a row of identical
// feature cards.

import { useAuth } from '../../auth/AuthContext';
import { Pricing } from './Pricing';
import { BrandMark, RoleLegend } from '../BrandMark';
import { Goniometer } from './Goniometer';

interface LandingScreenProps {
  /** Enter the app on the free tier. */
  onEnter: () => void;
  /** Open the sign-in / sign-up modal. */
  onOpenAuth: () => void;
}

/** Concrete figures — specifics read as a real product, not marketing filler. */
const STATS: { value: string; label: string }[] = [
  { value: '4', label: 'Regiones · hombro, codo, columna, rodilla' },
  { value: '80+', label: 'Músculos con datos clínicos' },
  { value: '7', label: 'Fases clínicas por región' },
];

/** The app's real pedagogical track — shown as the "method", with role color. */
const PHASES: { n: string; label: string; dot: string }[] = [
  { n: '01', label: 'Anatomía', dot: 'bg-accent' },
  { n: '02', label: 'Biomecánica', dot: 'bg-role-prime' },
  { n: '03', label: 'Palpación', dot: 'bg-role-assist' },
  { n: '04', label: 'Tests clínicos', dot: 'bg-role-stabilize' },
  { n: '05', label: 'Patología', dot: 'bg-clinical' },
  { n: '06', label: 'Tratamiento', dot: 'bg-accent' },
  { n: '07', label: 'Caso clínico', dot: 'bg-role-prime' },
];

export function LandingScreen({ onEnter, onOpenAuth }: LandingScreenProps) {
  const { snapshot } = useAuth();

  return (
    <div className="clinical-grid h-screen w-screen overflow-y-auto text-slate-200">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/60 bg-ink-950/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <BrandMark className="h-5 w-5 text-slate-200" title="Anatris" />
          <span className="font-display text-base font-bold tracking-tight text-slate-50">
            Anatris
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!snapshot.user && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-slate-100"
            >
              Iniciar sesión
            </button>
          )}
          <button
            type="button"
            onClick={onEnter}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60"
          >
            Entrar a la app
          </button>
        </div>
      </header>

      {/* Hero — asymmetric: copy left, instrument right. */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <span className="h-px w-6 bg-accent" />
            Anatomía clínica · Biomecánica · ROM
          </p>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] text-slate-50 sm:text-5xl">
            Estudia el <span className="text-accent">movimiento</span>,
            <br className="hidden sm:block" /> no solo la anatomía.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-400">
            Anatris es un atlas 3D para fisioterapia. Mueve la articulación y
            observa qué músculo trabaja en cada grado del recorrido y con qué rol:{' '}
            <span className="text-slate-300">agonista, asistente o estabilizador</span>.
            Cada dato lleva su origen, inserción, inervación y referencia.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onEnter}
              className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-ink-950 transition-opacity hover:opacity-90"
            >
              Probar gratis con el hombro
            </button>
            <a
              href="#planes"
              className="rounded-lg border border-slate-700 px-6 py-3 text-center text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60"
            >
              Ver planes
            </a>
          </div>
          <p className="mt-3 font-mono text-[11px] text-slate-600">
            Sin tarjeta · Hombro y Fundamentos siempre gratis
          </p>

          {/* Concrete stat strip */}
          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-xl border border-slate-800/60 bg-slate-800/40">
            {STATS.map((s) => (
              <div key={s.value} className="bg-ink-950/80 px-4 py-3.5">
                <dt className="font-display text-2xl font-bold text-slate-50">{s.value}</dt>
                <dd className="mt-0.5 text-[11px] leading-snug text-slate-500">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Instrument panel */}
        <div className="relative">
          <div className="rounded-2xl border border-slate-800/60 bg-gradient-to-b from-ink-900/80 to-ink-950/80 p-6 shadow-glass">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Abducción de hombro
              </span>
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] text-accent">
                ROM 0–180°
              </span>
            </div>
            <Goniometer className="w-full" />
            <div className="mt-4 border-t border-slate-800/60 pt-4">
              <RoleLegend />
            </div>
          </div>
        </div>
      </section>

      {/* Method — the real 7-phase clinical track. */}
      <section className="border-y border-slate-800/60 bg-ink-950/40">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                El método
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-slate-50">
                Siete fases clínicas por región
              </h2>
            </div>
            <p className="hidden max-w-xs text-right text-sm text-slate-500 sm:block">
              No es una galería de imágenes: es un recorrido de razonamiento, de la
              anatomía al caso clínico.
            </p>
          </div>

          <ol className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-800/60 bg-slate-800/40 sm:grid-cols-4 lg:grid-cols-7">
            {PHASES.map((p) => (
              <li key={p.n} className="bg-ink-950/80 px-4 py-5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                  <span className="font-mono text-[11px] text-slate-600">{p.n}</span>
                </div>
                <p className="mt-2 text-sm font-medium leading-snug text-slate-200">
                  {p.label}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Differentiators — asymmetric "bento", not a uniform card grid. */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Wide: the biomechanics differentiator, with a product-truth detail. */}
          <article className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/30 p-6 lg:col-span-2">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-role-prime" />
            <p className="font-mono text-[11px] text-slate-600">01 · Biomecánica</p>
            <h3 className="mt-2 font-display text-lg font-semibold text-slate-100">
              Músculos por tramo del rango, por su rol
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              Arrastra el ángulo y observa cómo cambia el reparto de trabajo a lo
              largo del recorrido. Lo que un libro deja estático, aquí se mueve.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 font-mono text-[11px]">
              {['0–30° inicio', '30–90° medio', '90–180° final'].map((t, i) => (
                <span
                  key={t}
                  className={[
                    'rounded-md border px-2.5 py-1',
                    i === 1
                      ? 'border-role-prime/40 bg-role-prime/10 text-role-prime'
                      : 'border-slate-700/70 text-slate-400',
                  ].join(' ')}
                >
                  {t}
                </span>
              ))}
            </div>
          </article>

          {/* Atlas */}
          <article className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/30 p-6">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
            <p className="font-mono text-[11px] text-slate-600">02 · Atlas 3D</p>
            <h3 className="mt-2 font-display text-lg font-semibold text-slate-100">
              El cuerpo, por regiones
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Aísla músculos, capas y lados en un modelo interactivo. Sin ruido:
              solo la región que estudias.
            </p>
          </article>

          {/* Study */}
          <article className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/30 p-6">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-role-stabilize" />
            <p className="font-mono text-[11px] text-slate-600">03 · Estudio</p>
            <h3 className="mt-2 font-display text-lg font-semibold text-slate-100">
              Afianza lo que ves
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Cuestionarios y tarjetas generados desde el contenido clínico de cada
              región. Mide tu avance.
            </p>
          </article>

          {/* Wide: clinical authority / references */}
          <article className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/30 p-6 lg:col-span-2">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-clinical" />
            <p className="font-mono text-[11px] text-slate-600">04 · Rigor clínico</p>
            <h3 className="mt-2 font-display text-lg font-semibold text-slate-100">
              Cada afirmación, con su fuente
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              Origen, inserción, inervación, acciones y rangos citados a obras de
              referencia (Kapandji, Oatis…). Enfoque clínico, no solo descriptivo.
            </p>
          </article>
        </div>
      </section>

      {/* Pricing */}
      <section id="planes" className="border-t border-slate-800/60 bg-ink-950/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Planes
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-slate-50">
            Empieza gratis. Crece cuando lo necesites.
          </h2>
          <p className="mb-8 mt-2 max-w-lg text-sm text-slate-500">
            El hombro y Fundamentos son gratis para siempre. Desbloquea el cuerpo
            completo y el laboratorio de movimiento con Premium.
          </p>
          <Pricing onChooseFree={onEnter} onOpenAuth={onOpenAuth} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BrandMark className="h-4 w-4 text-slate-400" />
            <span className="font-display text-sm font-semibold text-slate-300">Anatris</span>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-slate-600">
            Herramienta educativa para estudiantes y clínicos de fisioterapia. No
            sustituye el diagnóstico ni el criterio clínico profesional.
          </p>
        </div>
      </footer>
    </div>
  );
}
