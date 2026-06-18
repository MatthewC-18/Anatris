// src/components/OnboardingTour.tsx

import { useState } from 'react';

const TOUR_KEY = 'anatris.tour.done';
const TOUR_VERSION = '1';

export function readTourDone(): boolean {
  try {
    return window.localStorage.getItem(TOUR_KEY) === TOUR_VERSION;
  } catch {
    return false;
  }
}

function writeTourDone(): void {
  try {
    window.localStorage.setItem(TOUR_KEY, TOUR_VERSION);
  } catch {}
}

interface TourStep {
  icon: React.ReactNode;
  title: string;
  body: string;
  highlight?: string;
}

const STEPS: TourStep[] = [
  {
    icon: <IconModel />,
    title: 'Anatomía clínica en 3D',
    body: 'Haz clic en cualquier músculo del modelo para ver su origen, inserción, inervación, acciones y notas clínicas relevantes para la fisioterapia.',
    highlight: 'Modo Explorar',
  },
  {
    icon: <IconRegions />,
    title: 'Estudia por región',
    body: 'Navega entre Hombro, Codo, Columna y Rodilla desde la barra superior. Cada región tiene su propio contenido clínico completo.',
    highlight: 'Hombro · Codo · Columna · Rodilla',
  },
  {
    icon: <IconTrack />,
    title: 'El track de 7 fases',
    body: 'El modo Aprender te guía por 7 etapas clínicas por región: Anatomía → Biomecánica → Palpación → Tests → Patología → Tratamiento → Caso clínico.',
    highlight: 'Modo Aprender',
  },
  {
    icon: <IconStudy />,
    title: 'Practica y refuerza',
    body: 'El modo Estudiar genera quizzes y flashcards automáticamente a partir del contenido clínico de cada región. Ideal para preparar exámenes.',
    highlight: 'Modo Estudiar',
  },
  {
    icon: <IconStart />,
    title: 'Empieza ahora',
    body: 'El módulo de Hombro y Fundamentos están disponibles de forma gratuita. El resto de regiones se desbloquean con el plan Premium.',
    highlight: 'Hombro gratis · Premium para todo',
  },
];

interface OnboardingTourProps {
  onDone: () => void;
}

export function OnboardingTour({ onDone }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function advance() {
    if (isLast) finish();
    else setStep((s) => s + 1);
  }

  function finish() {
    writeTourDone();
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={finish}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-800/60 bg-ink-950 shadow-2xl">
        {/* Progress bar */}
        <div className="h-0.5 w-full bg-slate-800/60">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="flex flex-col items-center px-8 pb-8 pt-10 text-center">
          {/* Icon */}
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/60 text-accent">
            {current.icon}
          </div>

          <p className="mb-2 font-mono text-xs text-slate-600">
            {step + 1} / {STEPS.length}
          </p>

          <h2 className="font-display text-xl font-bold text-slate-50">
            {current.title}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {current.body}
          </p>

          {current.highlight && (
            <span className="mt-4 inline-block rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs text-accent">
              {current.highlight}
            </span>
          )}

          {/* Dot indicators */}
          <div className="mt-8 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Paso ${i + 1}`}
                onClick={() => setStep(i)}
                className={[
                  'rounded-full transition-all',
                  i === step
                    ? 'h-2 w-6 bg-accent'
                    : 'h-2 w-2 bg-slate-700 hover:bg-slate-600',
                ].join(' ')}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="mt-6 flex w-full items-center justify-between">
            <button
              type="button"
              onClick={finish}
              className="text-sm text-slate-600 transition-colors hover:text-slate-400"
            >
              Saltar
            </button>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-lg border border-slate-800 px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200"
                >
                  Anterior
                </button>
              )}
              <button
                type="button"
                onClick={advance}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-ink-950 transition-opacity hover:opacity-90"
              >
                {isLast ? 'Comenzar' : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconModel() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="24" cy="10" r="4.5" />
      <path d="M24 14.5v11M17 18l7 3 7-3M17 25.5l-4 10M31 25.5l4 10M20 25.5v9M28 25.5v9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="20" r="2" fill="currentColor" stroke="none" opacity="0.7" />
    </svg>
  );
}

function IconRegions() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6" y="6" width="16" height="16" rx="3" />
      <rect x="26" y="6" width="16" height="16" rx="3" />
      <rect x="6" y="26" width="16" height="16" rx="3" />
      <rect x="26" y="26" width="16" height="16" rx="3" />
      <rect x="6" y="6" width="16" height="16" rx="3" fill="currentColor" opacity="0.15" />
      <path d="M11 14h6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

function IconTrack() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="24" y1="6" x2="24" y2="42" />
      {[6, 12, 18, 24, 30, 36, 42].map((y, i) => (
        <circle
          key={y}
          cx="24"
          cy={y}
          r="3"
          fill={i < 3 ? 'currentColor' : 'none'}
          stroke="currentColor"
          opacity={i < 3 ? '1' : '0.4'}
        />
      ))}
      <path d="M30 6h8M30 24h5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function IconStudy() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="8" y="12" width="32" height="24" rx="4" />
      <path d="M16 24h16M16 30h10" strokeLinecap="round" opacity="0.5" />
      <circle cx="36" cy="12" r="7" fill="currentColor" opacity="0.15" stroke="currentColor" />
      <path d="M32.5 12l2.5 2.5 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconStart() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="24" cy="24" r="18" fill="currentColor" opacity="0.1" />
      <path
        d="M24 8l3.5 9H42l-11.5 8 3.5 9L24 28l-10 6 3.5-9L6 17h14.5z"
        strokeLinejoin="round"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M24 8l3.5 9H42l-11.5 8 3.5 9L24 28l-10 6 3.5-9L6 17h14.5z"
        strokeLinejoin="round"
      />
    </svg>
  );
}