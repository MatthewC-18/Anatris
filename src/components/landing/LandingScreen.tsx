// src/components/landing/LandingScreen.tsx
//
// Marketing landing: the first surface a new visitor sees (after the legal
// gate). Sells the value, then drops them into the app (free) or to checkout.
// Logged-in premium users skip this entirely (see App).

import { useAuth } from '../../auth/AuthContext';
import { Pricing } from './Pricing';

interface LandingScreenProps {
  /** Enter the app on the free tier. */
  onEnter: () => void;
  /** Open the sign-in / sign-up modal. */
  onOpenAuth: () => void;
}

const FEATURES = [
  {
    title: 'Atlas 3D por regiones',
    body: 'Explora hombro, codo, columna y rodilla en un modelo interactivo. Aísla músculos, capas y lados.',
  },
  {
    title: 'Biomecánica que se entiende',
    body: 'Mueve la articulación y observa qué músculos trabajan en cada tramo del recorrido, por su rol.',
  },
  {
    title: 'Estudio con retención',
    body: 'Cuestionarios y tarjetas generados desde el contenido clínico de cada región. Mide tu progreso.',
  },
  {
    title: 'Pensado para fisioterapia',
    body: 'Origen, inserción, inervación, acciones y rangos de movimiento, con referencias y enfoque clínico.',
  },
];

export function LandingScreen({ onEnter, onOpenAuth }: LandingScreenProps) {
  const { snapshot } = useAuth();

  return (
    <div className="h-screen w-screen overflow-y-auto bg-ink-950 text-slate-200">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/60 bg-ink-950/85 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="font-display text-base font-bold tracking-tight text-slate-50">
            Anatris
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
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
            className="rounded-lg bg-accent/20 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
          >
            Entrar a la app
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pb-10 pt-16 text-center">
        <span className="inline-block rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-400">
          Anatomía y biomecánica para fisioterapia
        </span>
        <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-slate-50 sm:text-5xl">
          Estudia el movimiento,
          <br className="hidden sm:block" /> no solo la anatomía
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-400">
          Un atlas 3D enfocado en fisioterapia: explora cada región, entiende qué
          músculos actúan en cada fase del rango de movimiento y afianza con
          cuestionarios y tarjetas.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onEnter}
            className="w-full rounded-lg bg-accent/20 px-6 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/30 sm:w-auto"
          >
            Probar gratis
          </button>
          <a
            href="#planes"
            className="w-full rounded-lg border border-slate-700 px-6 py-3 text-center text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60 sm:w-auto"
          >
            Ver planes
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Empieza con el hombro gratis. Sin tarjeta.
        </p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-5"
            >
              <h3 className="font-display text-base font-semibold text-slate-100">
                {f.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="planes" className="mx-auto max-w-4xl px-6 py-12">
        <h2 className="mb-2 text-center font-display text-2xl font-bold text-slate-50">
          Planes
        </h2>
        <p className="mb-8 text-center text-sm text-slate-500">
          Empieza gratis con el hombro; desbloquea el cuerpo completo cuando
          quieras.
        </p>
        <Pricing onChooseFree={onEnter} onOpenAuth={onOpenAuth} />
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 px-6 py-8 text-center">
        <p className="text-xs leading-relaxed text-slate-600">
          Anatris es una herramienta educativa. No sustituye el diagnóstico ni el
          criterio clínico profesional.
        </p>
      </footer>
    </div>
  );
}
