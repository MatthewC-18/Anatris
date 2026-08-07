// src/components/landing/LandingScreen.tsx
//
// Marketing landing: the first surface a new visitor sees (after the legal
// gate). Sells the value, then drops them into the app (free) or to checkout.
// Logged-in premium users skip this entirely (see App).
//
// -----------------------------------------------------------------------------
// DESIGN INTENT
// -----------------------------------------------------------------------------
// The page reads as a clinical publication, in whichever theme the reader has
// chosen. Its predecessor sat on a cyan-hazed blueprint grid and organised every
// idea into a rounded card with a coloured bar on top.
//
// It is worth being precise about what was wrong there, because it was NOT the
// darkness. Dark surfaces are a legitimate and often premium choice, and the
// tool itself is dark for good reason. What read as machine-generated was the
// DECORATION and the STRUCTURE: the glow, a measurement grid behind marketing
// copy, a uniform grid of interchangeable cards, a mono kicker over every
// heading, and copy built on contrast formulas. All of that is gone in BOTH
// themes, and the surface colour is now the visitor's choice (ThemeToggle).
//
// So the rules here are:
//
//   * No gradients, no glow, no background grid, in either theme.
//   * Structure comes from HAIRLINES and WHITE SPACE, never from nested boxes.
//     There is not one rounded card on this page outside the pricing table and
//     the hero instrument, both of which are objects rather than decoration.
//   * Headings are set in the editorial serif; measurements and codes stay in
//     the mono. The sans carries everything else.
//   * COLOUR IS INFORMATION. The only saturated colours on the page are the
//     three muscle-role colours, and they appear solely where they are being
//     defined (the legend) — never as decorative accents on section headers.
//   * The copy is declarative. No "X, not just Y", no "it isn't A, it's B", no
//     middot-chained fragments. Claims are specific enough to be checked.
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Pricing } from './Pricing';
import { BrandMark, RoleLegend } from '../BrandMark';
import { HeroMedia } from './HeroMedia';
import { SocialProof } from './SocialProof';
import { LegalModal, type LegalTab } from '../LegalScreen';
import { ThemeToggle, useThemePref } from '../ThemeToggle';
import { EVENTS, track } from '../../lib/analytics';

interface LandingScreenProps {
  /** Enter the app on the free tier. */
  onEnter: () => void;
  /** Open the sign-in / sign-up modal. */
  onOpenAuth: () => void;
}

/** Concrete figures. Each is countable inside the app, so each can be checked. */
const STATS: { value: string; label: string }[] = [
  { value: '6', label: 'Regiones anatómicas' },
  { value: '110+', label: 'Músculos con ficha clínica' },
  { value: '7', label: 'Fases de estudio por región' },
];

/** The app's real pedagogical track, shown as the method. */
const PHASES: string[] = [
  'Anatomía',
  'Biomecánica',
  'Palpación',
  'Tests clínicos',
  'Patología',
  'Tratamiento',
  'Caso clínico',
];

/**
 * The four things the product actually does. Written as an editorial list
 * separated by rules, because four identical cards in a grid say "these are
 * interchangeable" — and they are not: the first one is the reason to buy.
 */
const CAPABILITIES: { title: string; body: string }[] = [
  {
    title: 'Actividad muscular a lo largo del rango',
    body: 'Al desplazar el ángulo articular cambia el reparto del trabajo entre agonistas, asistentes y estabilizadores. El laboratorio muestra qué estructura lidera en cada tramo del recorrido y con qué grado de activación, sobre el modelo en movimiento.',
  },
  {
    title: 'Modelo tridimensional por regiones',
    body: 'Aísla músculos, planos y lados, retira capas hasta el hueso y gira la pieza. El visor carga únicamente la región seleccionada, de modo que la escena contiene lo que se está estudiando y nada más.',
  },
  {
    title: 'Tests ortopédicos con su rendimiento diagnóstico',
    body: 'Cada maniobra incluye sensibilidad, especificidad, la demostración en 3D con la resistencia del explorador y el nomograma de Fagan para leer la probabilidad post-test. Los clusters se presentan agrupados, como se aplican en consulta.',
  },
  {
    title: 'Cada dato con su fuente',
    body: 'Origen, inserción, inervación, acciones y rangos remiten a las obras de referencia de las que proceden. La pantalla de Evidencia enlaza los estudios en PubMed por su identificador.',
  },
];

export function LandingScreen({ onEnter, onOpenAuth }: LandingScreenProps) {
  const { snapshot } = useAuth();
  // Which legal tab (if any) is open in the footer modal.
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);
  // Light / dark / system. Owns the class on <html> while the site is mounted;
  // the product's own root re-pins `theme-ink`, so the tool is unaffected.
  const [themePref, setThemePref] = useThemePref();

  // Funnel step 1: the visitor saw the landing.
  useEffect(() => track(EVENTS.landingViewed), []);

  return (
    <div className="site h-screen w-screen overflow-y-auto font-sans">
      {/* ------------------------------------------------------------------ */}
      {/* Masthead */}
      {/* ------------------------------------------------------------------ */}
      <header className="sticky top-0 z-10 border-b border-line bg-page/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-5 w-5 text-fg" title="Anatris" />
            <span className="font-display text-[15px] font-semibold tracking-tight text-fg">
              Anatris
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* The switch lives here from `sm` up and in the footer below it:
                at 375px the masthead cannot hold four controls, and sign-in is
                the one that must never be the thing that yields. */}
            <ThemeToggle
              pref={themePref}
              setPref={setThemePref}
              className="hidden sm:inline-flex"
            />
            {!snapshot.user && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="rounded px-3 py-2 text-sm font-medium text-fg2 transition-colors hover:text-fg"
              >
                Iniciar sesión
              </button>
            )}
            <button
              type="button"
              onClick={onEnter}
              className="rounded bg-brand-fill px-4 py-2 text-sm font-medium text-brand-on transition-colors hover:bg-brand-deep"
            >
              Entrar
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-5xl px-6 pb-14 pt-16 sm:pt-20">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_400px]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg3">
              Anatomía clínica y biomecánica
            </p>
            <h1 className="mt-4 max-w-xl font-serif text-[2.6rem] font-normal leading-[1.1] tracking-[-0.015em] text-fg sm:text-[3.1rem]">
              Atlas tridimensional de anatomía y movimiento para fisioterapia
            </h1>
            <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-fg2">
              Anatris reúne el modelo anatómico, el rango articular y la actividad
              muscular en una sola herramienta. Mueve la articulación hasta el
              grado que te interesa y verás qué músculos trabajan ahí, con qué
              función y de qué obra procede el dato.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onEnter}
                className="rounded bg-brand-fill px-6 py-3 text-sm font-medium text-brand-on transition-colors hover:bg-brand-deep"
              >
                Empezar con el hombro
              </button>
              <a
                href="#planes"
                className="rounded border border-line px-6 py-3 text-center text-sm font-medium text-fg transition-colors hover:bg-brand-wash"
              >
                Ver planes
              </a>
            </div>
            <p className="mt-4 text-[13px] text-fg3">
              No se pide tarjeta. La región del hombro y el módulo de Fundamentos
              son gratuitos de forma permanente.
            </p>
          </div>

          {/* Instrument panel: the real movement lab when the clip is present,
              the goniometer until then (see HeroMedia). The one boxed object in
              the upper half of the page, because it is a device and not a card. */}
          <figure className="rounded-md border border-line bg-card p-5">
            <figcaption className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-fg">
                Abducción de hombro
              </span>
              <span className="tnum font-mono text-[11px] text-fg3">0–180°</span>
            </figcaption>
            <div className="mt-4">
              <HeroMedia className="w-full rounded-sm" />
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <RoleLegend />
            </div>
          </figure>
        </div>

        {/* Figures. A row of type divided by rules, not three boxes. */}
        <dl className="mt-16 grid grid-cols-1 border-t border-line sm:grid-cols-3">
          {STATS.map((s) => (
            <div
              key={s.value}
              className="border-b border-line py-6 sm:border-b-0 sm:border-r sm:pr-6 sm:last:border-r-0 sm:[&+div]:pl-6"
            >
              <dt className="tnum font-serif text-4xl font-normal leading-none text-fg">
                {s.value}
              </dt>
              <dd className="mt-2 text-sm text-fg2">{s.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Method */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t border-line bg-card">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <div>
              <h2 className="font-serif text-2xl font-normal leading-snug text-fg">
                Siete fases por región
              </h2>
            </div>
            <div>
              <p className="max-w-xl text-[15px] leading-relaxed text-fg2">
                Todas las regiones se recorren en el mismo orden, desde la
                anatomía descriptiva hasta el caso clínico. El itinerario es
                fijo para que el estudio de una articulación nueva parta de una
                estructura ya conocida.
              </p>
              <ol className="mt-8 border-t border-line">
                {PHASES.map((label, i) => (
                  <li
                    key={label}
                    className="flex items-baseline gap-4 border-b border-line py-3"
                  >
                    <span className="tnum w-6 shrink-0 font-mono text-[11px] text-fg3">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[15px] text-fg">{label}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* What it does */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-serif text-2xl font-normal text-fg">
            Qué incluye la herramienta
          </h2>
          <div className="mt-10 border-t border-line">
            {CAPABILITIES.map((c) => (
              <article
                key={c.title}
                className="grid gap-2 border-b border-line py-8 lg:grid-cols-[280px_1fr] lg:gap-8"
              >
                <h3 className="font-serif text-lg font-normal leading-snug text-fg">
                  {c.title}
                </h3>
                <p className="max-w-2xl text-[15px] leading-relaxed text-fg2">
                  {c.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Bibliographic backing (and testimonials once real ones exist). */}
      <SocialProof />

      {/* ------------------------------------------------------------------ */}
      {/* Pricing */}
      {/* ------------------------------------------------------------------ */}
      <section id="planes" className="border-t border-line bg-card">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-serif text-2xl font-normal text-fg">
            Planes y precios
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-fg2">
            El hombro y Fundamentos son gratuitos de forma permanente. Premium
            añade el resto de regiones, los tests ortopédicos completos y el
            laboratorio de movimiento sin restricciones.
          </p>
          <div className="mt-10">
            <Pricing onChooseFree={onEnter} onOpenAuth={onOpenAuth} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <BrandMark className="h-4 w-4 text-fg2" />
                <span className="font-display text-sm font-semibold text-fg2">
                  Anatris
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-fg3">Apariencia</span>
                <ThemeToggle pref={themePref} setPref={setThemePref} />
              </div>
            </div>
            <p className="max-w-sm text-[13px] leading-relaxed text-fg3">
              Herramienta educativa dirigida a estudiantes y profesionales de
              fisioterapia. No sustituye al diagnóstico ni al criterio clínico
              profesional.
            </p>
          </div>

          <nav className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-6 text-[13px] text-fg3">
            {LEGAL_LINKS.map((l) => (
              <button
                key={l.tab}
                type="button"
                onClick={() => setLegalTab(l.tab)}
                className="transition-colors hover:text-fg"
              >
                {l.label}
              </button>
            ))}
            <span className="tnum ml-auto">
              © {new Date().getFullYear()} Anatris
            </span>
          </nav>
        </div>
      </footer>

      <LegalModal
        open={legalTab !== null}
        defaultTab={legalTab ?? 'terminos'}
        onClose={() => setLegalTab(null)}
      />
    </div>
  );
}

/** Footer legal entries, each opening the corresponding tab in the modal. */
const LEGAL_LINKS: { tab: LegalTab; label: string }[] = [
  { tab: 'terminos', label: 'Términos' },
  { tab: 'privacidad', label: 'Privacidad' },
  { tab: 'reembolsos', label: 'Reembolsos' },
  { tab: 'aviso', label: 'Aviso médico' },
];
