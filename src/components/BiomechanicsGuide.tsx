// src/components/BiomechanicsGuide.tsx
//
// Step-by-step narration of a movement (e.g. abduction), played alongside the
// live 3D model. This is the honest alternative to deforming the rigid Z-
// Anatomy meshes: instead of faking skinned motion, we NARRATE the gesture over
// the real, highlighted anatomy.
//
// Each step drives the model through mechanisms the store already owns:
//   - setRomPhase(movementId, stepIndex, muscleMap) lights the step's muscles
//     by role (amber prime-mover / sky assistant / violet stabilizer),
//   - requestView(view) animates the camera to the most legible angle,
//   - setSideFilter(side) isolates the studied side so the scene stays clean.
//
// The guide cleans up after itself: leaving the phase clears the ROM highlight
// and restores the side filter to 'both'.
//
// ASCII-only source. UI strings Spanish LATAM. No `any`. English comments.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnatomyStore, type SideFilter } from '../store/anatomyStore';
import { Sourced } from './MuscleContentSections';
import type { GestureGuide, GuideStep } from '../types/pedagogy';
import type { RomMuscleRole } from '../types/rom';

const ROLE_LABEL: Record<RomMuscleRole, string> = {
  'prime-mover': 'Motor principal',
  assistant: 'Asistente',
  stabilizer: 'Estabilizador',
};
const ROLE_COLOR: Record<RomMuscleRole, string> = {
  'prime-mover': '#ffa51e',
  assistant: '#38bdf8',
  stabilizer: '#a78bfa',
};

interface BiomechanicsGuideProps {
  guide: GestureGuide;
}

/** Build the muscleId -> role map a step needs for setRomPhase. */
function stepMuscleMap(step: GuideStep): Map<string, RomMuscleRole> {
  const map = new Map<string, RomMuscleRole>();
  for (const m of step.muscles) map.set(m.id, m.role);
  return map;
}

export function BiomechanicsGuide({ guide }: BiomechanicsGuideProps): JSX.Element {
  const setRomPhase = useAnatomyStore((s) => s.setRomPhase);
  const clearRom = useAnatomyStore((s) => s.clearRom);
  const requestView = useAnatomyStore((s) => s.requestView);
  const setSideFilter = useAnatomyStore((s) => s.setSideFilter);
  const setRomFocusMuscle = useAnatomyStore((s) => s.setRomFocusMuscle);

  const [stepIndex, setStepIndex] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const step = guide.steps[stepIndex];

  // Remember the side filter we found, to restore it when leaving the guide.
  const priorSideRef = useRef<SideFilter | null>(null);

  // Apply a step to the model: highlight its muscles by role, move the camera,
  // isolate the studied side.
  const applyStep = useCallback(
    (s: GuideStep, index: number) => {
      setRomPhase(guide.movementId, index, stepMuscleMap(s));
      requestView(s.view);
      if (s.side) setSideFilter(s.side);
    },
    [guide.movementId, setRomPhase, requestView, setSideFilter],
  );

  // On mount: capture the current side filter, then apply the first step.
  useEffect(() => {
    priorSideRef.current = useAnatomyStore.getState().sideFilter;
    applyStep(guide.steps[0], 0);
    setStepIndex(0);
    // On unmount: clear the ROM highlight and restore the side filter.
    return () => {
      clearRom();
      if (priorSideRef.current) setSideFilter(priorSideRef.current);
    };
    // Run once per guide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide]);

  // Apply whenever the active step changes (via buttons or autoplay).
  useEffect(() => {
    applyStep(guide.steps[stepIndex], stepIndex);
  }, [stepIndex, guide, applyStep]);

  // Simple autoplay: advance every few seconds, stop at the last step.
  useEffect(() => {
    if (!playing) return;
    if (stepIndex >= guide.steps.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStepIndex((i) => Math.min(i + 1, guide.steps.length - 1)), 3500);
    return () => clearTimeout(t);
  }, [playing, stepIndex, guide.steps.length]);

  const atFirst = stepIndex === 0;
  const atLast = stepIndex === guide.steps.length - 1;

  const goPrev = (): void => {
    setPlaying(false);
    setStepIndex((i) => Math.max(0, i - 1));
  };
  const goNext = (): void => {
    setPlaying(false);
    setStepIndex((i) => Math.min(guide.steps.length - 1, i + 1));
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-slate-100">
            Recorrido guiado: {guide.name}
          </h3>
          <span className="shrink-0 text-xs text-slate-500">
            Paso {stepIndex + 1} de {guide.steps.length}
          </span>
        </div>
        <div className="mt-2 text-sm leading-relaxed text-slate-400">
          <Sourced item={guide.intro} />
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {guide.steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setPlaying(false);
              setStepIndex(i);
            }}
            title={s.title}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i === stepIndex
                ? 'bg-accent'
                : i < stepIndex
                  ? 'bg-accent/40'
                  : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Current step */}
      <div className="rounded-lg border border-slate-800/50 bg-ink-900/40 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="font-display text-sm font-semibold text-slate-100">{step.title}</h4>
          {step.rangeLabel && (
            <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              {step.rangeLabel}
            </span>
          )}
        </div>

        <div className="mt-2 text-sm leading-relaxed text-slate-300">
          <Sourced item={step.caption} />
        </div>

        {/* Muscles in play, by role */}
        {step.muscles.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {step.muscles.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2 text-xs"
                onMouseEnter={() => setRomFocusMuscle(m.id)}
                onMouseLeave={() => setRomFocusMuscle(null)}
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: ROLE_COLOR[m.role] }}
                />
                <span className="text-slate-300">{m.id}</span>
                <span className="text-slate-500">{String.fromCharCode(0x2014)}</span>
                <span style={{ color: ROLE_COLOR[m.role] }}>{ROLE_LABEL[m.role]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={atFirst}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>

        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-slate-100"
        >
          {playing ? 'Pausar' : 'Reproducir'}
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={atLast}
          className="rounded-lg border border-accent/40 bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-600">
        El modelo resalta los musculos de cada paso por su rol y orienta la
        camara al mejor angulo. El gesto se explica sobre la anatomia real;
        no se deforma el modelo (las mallas no tienen rigging).
      </p>
    </div>
  );
}
