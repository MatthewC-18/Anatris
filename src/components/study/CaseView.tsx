// src/components/study/CaseView.tsx
//
// "Casos" — interactive clinical cases for the active region. This is the
// clinical-reasoning layer: a patient vignette followed by guided multiple-
// choice steps, each revealing an explanation so the student learns the WHY, not
// just the answer. Content lives in data/clinicalCases.ts; this is the runner.
//
// Flow: list of cases -> pick one -> read vignette -> answer each step with
// immediate feedback + explanation -> takeaway summary.

import { useMemo, useState } from 'react';
import { casesForRegion } from '../../data/clinicalCases';
import type { ClinicalCase } from '../../types/clinicalCase';

interface CaseViewProps {
  region: string;
  /** Called when a case is completed, so the parent can refresh progress. */
  onFinished?: () => void;
}

export function CaseView({ region, onFinished }: CaseViewProps) {
  const cases = useMemo(() => casesForRegion(region), [region]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = activeId ? cases.find((c) => c.id === activeId) ?? null : null;

  if (cases.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10">
        <p className="max-w-sm text-center text-sm text-slate-500">
          Los casos clínicos de esta región están en camino. Mientras tanto,
          prueba el hombro, el codo o la rodilla.
        </p>
      </div>
    );
  }

  if (active) {
    return (
      <CaseRunner
        key={active.id}
        clinicalCase={active}
        onExit={() => setActiveId(null)}
        onFinished={onFinished}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 px-6 py-6">
      <p className="text-sm text-slate-500">
        Resuelve casos guiados para entrenar el razonamiento clínico de la región.
      </p>
      {cases.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => setActiveId(c.id)}
          className="group flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-left transition-colors hover:border-slate-700"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-semibold text-slate-100">
              {c.title}
            </h3>
            <LevelBadge level={c.level} />
          </div>
          <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
            {c.vignette}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {c.tags.map((t) => (
              <span
                key={t}
                className="rounded-md border border-slate-700/70 px-2 py-0.5 font-mono text-[10px] text-slate-400"
              >
                {t}
              </span>
            ))}
            <span className="ml-auto text-[11px] font-medium text-slate-600">
              {c.steps.length} {c.steps.length === 1 ? 'paso' : 'pasos'} ·{' '}
              <span className="text-accent group-hover:text-accent-soft">Resolver →</span>
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ===========================================================================
 * CASE RUNNER
 * ======================================================================== */

function CaseRunner({
  clinicalCase,
  onExit,
  onFinished,
}: {
  clinicalCase: ClinicalCase;
  onExit: () => void;
  onFinished?: () => void;
}) {
  const { steps } = clinicalCase;
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const step = steps[index];
  const answered = picked != null;
  const pickedCorrect = answered && step.options.find((o) => o.id === picked)?.correct;

  function choose(optionId: string) {
    if (answered) return;
    setPicked(optionId);
    if (step.options.find((o) => o.id === optionId)?.correct) setScore((s) => s + 1);
  }

  function next() {
    if (index + 1 < steps.length) {
      setIndex((i) => i + 1);
      setPicked(null);
    } else {
      setDone(true);
      onFinished?.();
    }
  }

  if (done) {
    const pct = Math.round((score / steps.length) * 100);
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-8">
        <button
          type="button"
          onClick={onExit}
          className="self-start text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
        >
          ← Volver a los casos
        </button>
        <div className="rounded-2xl border border-clinical/30 bg-clinical/[0.06] p-6">
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-clinical-soft">
            Conclusión clínica
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">
            {clinicalCase.takeaway}
          </p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 px-5 py-4">
          <span className="text-sm text-slate-400">Aciertos en el razonamiento</span>
          <span className="font-display text-xl font-bold text-slate-50">
            {score}/{steps.length} · {pct}%
          </span>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="self-center rounded-lg bg-accent/20 px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
        >
          Elegir otro caso
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onExit}
          className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
        >
          ← Casos
        </button>
        <span className="text-xs font-medium text-slate-500">
          Paso {index + 1} / {steps.length}
        </span>
      </div>

      {/* Vignette (persistent context) */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-slate-100">
            {clinicalCase.title}
          </h2>
          <LevelBadge level={clinicalCase.level} />
        </div>
        <p className="text-sm leading-relaxed text-slate-300">{clinicalCase.vignette}</p>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${((index + (answered ? 1 : 0)) / steps.length) * 100}%` }}
        />
      </div>

      {/* Step prompt + options */}
      <h3 className="font-display text-lg font-semibold leading-snug text-slate-100">
        {step.prompt}
      </h3>
      <div className="flex flex-col gap-2">
        {step.options.map((o) => {
          const isPicked = picked === o.id;
          const reveal = answered && o.correct;
          const wrongPick = answered && isPicked && !o.correct;
          return (
            <button
              key={o.id}
              type="button"
              disabled={answered}
              onClick={() => choose(o.id)}
              className={[
                'rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                reveal
                  ? 'border-emerald-600/60 bg-emerald-950/40 text-emerald-200'
                  : wrongPick
                    ? 'border-rose-700/60 bg-rose-950/40 text-rose-200'
                    : answered
                      ? 'border-slate-800 text-slate-500'
                      : 'border-slate-800 text-slate-200 hover:border-slate-600 hover:bg-slate-800/40',
              ].join(' ')}
            >
              {o.text}
            </button>
          );
        })}
      </div>

      {/* Explanation + advance */}
      {answered && (
        <div className="flex flex-col gap-3 border-t border-slate-800/60 pt-4">
          <p
            className={`text-sm font-medium ${
              pickedCorrect ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {pickedCorrect ? '¡Correcto!' : 'Respuesta incorrecta'}
          </p>
          <p className="text-sm leading-relaxed text-slate-300">{step.explanation}</p>
          <button
            type="button"
            onClick={next}
            className="self-end rounded-lg bg-accent/20 px-5 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
          >
            {index + 1 < steps.length ? 'Siguiente' : 'Ver conclusión'}
          </button>
        </div>
      )}
    </div>
  );
}

function LevelBadge({ level }: { level: ClinicalCase['level'] }) {
  const tone =
    level === 'básico'
      ? 'border-emerald-700/50 text-emerald-300'
      : level === 'intermedio'
        ? 'border-amber-700/50 text-amber-300'
        : 'border-rose-700/50 text-rose-300';
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone}`}
    >
      {level}
    </span>
  );
}
