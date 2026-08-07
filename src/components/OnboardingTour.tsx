// src/components/OnboardingTour.tsx
//
// First-run tour: six cards that name what the tool does before the user is
// dropped into a 3D scene with a lot of controls.
//
// -----------------------------------------------------------------------------
// WHY IT LOOKS LIKE THIS
// -----------------------------------------------------------------------------
// This is the FIRST screen anyone sees inside the product, and it used to be the
// loudest thing in the entire app: an 80px icon in a glowing box, a neon
// progress bar, a cyan pill, a solid cyan button, everything centred. That is
// the house style of a generic product tour, and after the site was rebuilt
// around hairlines and restraint it was the one surface still shouting.
//
// It is now built from the same parts as everything else: left-aligned text, one
// hairline rule, semantic theme tokens, and the accent used only to mark
// position. The icons survive — they are hand-drawn to the app's line weight —
// but at reading size and in a muted colour, beside the text rather than
// enthroned above it.
//
// It is also a real dialog now: labelled, focus-managed, dismissable with Escape
// and navigable with the arrow keys. A modal that traps a first-time user with
// only a mouse is not finished.

import { useCallback, useEffect, useRef, useState } from 'react';

const TOUR_KEY = 'anatris.tour.done';
// Bump when the tour content changes materially so returning users see it again.
const TOUR_VERSION = '3';

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
  /** Where in the app this lives. Orientation, not decoration. */
  where: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    icon: <IconModel />,
    where: 'Modo Explorar',
    title: 'Anatomía clínica en 3D',
    body: 'Toca cualquier estructura del modelo para consultar su origen, inserción, inervación, acciones y sus notas clínicas.',
  },
  {
    icon: <IconRegions />,
    where: 'Barra superior',
    title: 'Seis regiones clínicas',
    body: 'Hombro, codo, cadera, rodilla, tobillo y columna, esta última dividida en cervical, torácica y lumbar. Cada una trae su contenido clínico completo.',
  },
  {
    icon: <IconMovement />,
    where: 'Modo Movimiento',
    title: 'Laboratorio de movimiento',
    body: 'Desplaza la articulación por su recorrido y observa qué músculo trabaja en cada grado, con qué función y con qué nivel de activación.',
  },
  {
    icon: <IconTrack />,
    where: 'Modo Aprender',
    title: 'Siete fases por región',
    body: 'Un itinerario fijo que va de la anatomía descriptiva al caso clínico, pasando por biomecánica, palpación, tests, patología y tratamiento.',
  },
  {
    icon: <IconClinical />,
    where: 'Tests, Evidencia y Neuro',
    title: 'Rendimiento diagnóstico y evidencia',
    body: 'Tests ortopédicos con sensibilidad, especificidad y modo examen. Referencias citadas con enlace al estudio. Dermatomas, miotomas y reflejos por raíz.',
  },
  {
    icon: <IconStudy />,
    where: 'Modo Estudiar',
    title: 'Repaso espaciado y cuestionarios',
    body: 'Tarjetas y cuestionarios generados desde el contenido de cada región. El hombro y Fundamentos son gratuitos; el resto del cuerpo y el laboratorio completo requieren Premium.',
  },
];

interface OnboardingTourProps {
  onDone: () => void;
}

export function OnboardingTour({ onDone }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = useCallback(() => {
    writeTourDone();
    onDone();
  }, [onDone]);

  const advance = useCallback(() => {
    if (isLast) finish();
    else setStep((s) => s + 1);
  }, [isLast, finish]);

  // Move focus into the dialog so the keyboard lands somewhere useful, and hand
  // it back to the page on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        advance();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setStep((s) => Math.max(0, s - 1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, finish]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={finish}
        aria-hidden="true"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg rounded-lg border border-line bg-card shadow-xl outline-none"
      >
        <div className="px-8 pb-7 pt-8">
          {/* Position: the count, then a rule segmented once per step. Precise
              enough to tell you where you are without a progress bar glowing
              across the top of the panel. */}
          <div className="flex items-center gap-4">
            <span className="tnum shrink-0 font-mono text-[11px] text-fg3">
              {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
            </span>
            <div className="flex flex-1 items-center gap-1">
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  aria-label={`Paso ${i + 1}: ${s.title}`}
                  aria-current={i === step ? 'step' : undefined}
                  onClick={() => setStep(i)}
                  className="group flex h-4 flex-1 items-center"
                >
                  <span
                    className={[
                      'w-full transition-all',
                      // The current segment is both accented AND thicker: at 1px
                      // a colour change alone is not a reliable position cue.
                      i === step
                        ? 'h-0.5 bg-brand'
                        : i < step
                          ? 'h-px bg-fg3 group-hover:bg-fg2'
                          : 'h-px bg-line group-hover:bg-fg3',
                    ].join(' ')}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7 flex gap-5">
            <span className="mt-0.5 shrink-0 text-fg2">{current.icon}</span>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg3">
                {current.where}
              </p>
              <h2
                id="tour-title"
                className="mt-2 font-display text-lg font-semibold leading-snug text-fg"
              >
                {current.title}
              </h2>
              {/* Fixed height so the panel does not resize between steps: a card
                  that jumps as you advance reads as unfinished. */}
              <p className="mt-2 min-h-[4.5rem] text-sm leading-relaxed text-fg2">
                {current.body}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
            <button
              type="button"
              onClick={finish}
              className="text-sm text-fg3 transition-colors hover:text-fg"
            >
              Saltar
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0}
                className="rounded border border-line px-4 py-2 text-sm font-medium text-fg2 transition-colors hover:text-fg disabled:pointer-events-none disabled:opacity-0"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={advance}
                className="rounded bg-brand-fill px-5 py-2 text-sm font-medium text-brand-on transition-colors hover:bg-brand-deep"
              >
                {isLast ? 'Empezar' : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Icons. Drawn at 28px on a 48 grid, 1.5 stroke, to sit next to 15px text.
 * The opacity tiers inside each one carry meaning (filled = done / active),
 * which is why they are not flattened to a single stroke.
 * ------------------------------------------------------------------------ */

const iconProps = {
  width: 28,
  height: 28,
  viewBox: '0 0 48 48',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  'aria-hidden': true,
} as const;

function IconModel() {
  return (
    <svg {...iconProps}>
      <circle cx="24" cy="10" r="4.5" />
      <path d="M24 14.5v11M17 18l7 3 7-3M17 25.5l-4 10M31 25.5l4 10M20 25.5v9M28 25.5v9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="20" r="2" fill="currentColor" stroke="none" opacity="0.7" />
    </svg>
  );
}

function IconRegions() {
  return (
    <svg {...iconProps}>
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
    <svg {...iconProps}>
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
    <svg {...iconProps}>
      <rect x="8" y="12" width="32" height="24" rx="4" />
      <path d="M16 24h16M16 30h10" strokeLinecap="round" opacity="0.5" />
      <circle cx="36" cy="12" r="7" fill="currentColor" opacity="0.15" stroke="currentColor" />
      <path d="M32.5 12l2.5 2.5 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMovement() {
  return (
    <svg {...iconProps}>
      {/* Goniometer arc + swinging limb: the movement lab. */}
      <circle cx="14" cy="34" r="2.5" fill="currentColor" stroke="none" />
      <path d="M14 34L34 20" strokeLinecap="round" />
      <path d="M14 34L36 34" strokeLinecap="round" opacity="0.5" />
      <path d="M34 34a20 20 0 0 0-6-14" strokeLinecap="round" opacity="0.6" />
      <path d="M30 12l4 8-8 1" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </svg>
  );
}

function IconClinical() {
  return (
    <svg {...iconProps}>
      {/* Clipboard with a check + pulse: tests, evidence, neuro. */}
      <rect x="12" y="8" width="24" height="32" rx="3" />
      <rect x="18" y="5" width="12" height="6" rx="2" fill="currentColor" opacity="0.15" />
      <path d="M17 20l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 30h4l2-4 2 8 2-4h4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </svg>
  );
}
