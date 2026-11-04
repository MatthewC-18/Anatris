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
import { LockGlyph, useFeatureGate } from '../account/PremiumGate';
import { REFERENCES } from '../../data/references';
import { casesForRegion } from '../../data/clinicalCases';
import { goToTestInLab, testForStep } from '../../lib/caseEvidence';
import { optionLetter, shuffledCaseOptions } from '../../lib/caseOptions';
import type { ClinicalCase, CaseStep } from '../../types/clinicalCase';

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
  /** Bumped by "Repetir el caso", so the options reshuffle on a second pass. */
  const [attempt, setAttempt] = useState(0);

  const step = steps[index];
  // LAS OPCIONES SE DESORDENAN AQUI, y por una razon medida: en el contenido
  // real la respuesta correcta era la opcion `a` en los 38 pasos de los 15
  // casos. El 100%. Se aprobaba pulsando siempre la primera sin leer, y por eso
  // todos los pasos parecian el mismo. Ver src/lib/caseOptions.ts.
  //
  // Clave en `step.id` + `attempt`: avanzar de paso reordena, y rehacer el caso
  // tambien, asi que no se memoriza la posicion.
  const options = useMemo(
    () => shuffledCaseOptions(step),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step.id, attempt],
  );
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
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          {/* Repetir sirve para algo ahora que las opciones se reordenan: antes
              era el mismo examen con las mismas posiciones. */}
          <button
            type="button"
            onClick={() => {
              setAttempt((a) => a + 1);
              setIndex(0);
              setPicked(null);
              setScore(0);
              setDone(false);
            }}
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
          >
            Repetir el caso
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg bg-accent/20 px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
          >
            Elegir otro caso
          </button>
        </div>
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
        {options.map((o, i) => {
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
              <span className="mr-2 font-mono text-xs text-slate-500">
                {optionLetter(i)}.
              </span>
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
          <StepEvidence region={clinicalCase.region} step={step} />
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

/* ===========================================================================
 * LA PRUEBA QUE EL PASO NOMBRA
 *
 * Un paso que apunta a una prueba ortopedica (`showsTest`) ya no se queda en la
 * explicacion: aqui debajo aparecen la maniobra, el hallazgo positivo, los
 * numeros reales de esa prueba y el estudio del que salen, con un enlace que la
 * abre en el laboratorio con su demostracion en 3D.
 *
 * POR QUE. La aplicacion tiene 79 pruebas con sensibilidad, especificidad,
 * razones de verosimilitud y cita, y los casos no las tocaban: decian "la
 * maniobra de Jobe carga selectivamente al supraespinoso" y ahi se acababa. El
 * alumno leia una afirmacion; ahora ve de donde sale y cuanto vale.
 *
 * Se dibuja SOLO si la prueba esta disponible. En una region de pago cuyo
 * contenido todavia no ha llegado del edge function, `testForStep` devuelve
 * null y este bloque no existe, en vez de dejar una tarjeta a medias.
 * ======================================================================== */

function StepEvidence({ region, step }: { region: string; step: CaseStep }) {
  const test = useMemo(() => testForStep(region, step), [region, step]);
  const gate = useFeatureGate('orthopedic-tests');
  if (!test) return null;
  const { sensitivity: sens, specificity: spec } = test.metrics;
  const unverified = test.cite.some((c) => !c.verified);
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-sm font-semibold text-slate-100">{test.name}</p>
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-slate-500">
          {test.target}
        </span>
      </div>
      <dl className="mt-2.5 flex flex-col gap-1.5 text-xs leading-relaxed text-slate-400">
        <div>
          <dt className="inline font-medium text-slate-300">Maniobra. </dt>
          <dd className="inline">{test.maneuver}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-slate-300">Positivo. </dt>
          <dd className="inline">{test.positive}</dd>
        </div>
      </dl>
      {(sens != null || spec != null) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {sens != null && <Metric label="Sensibilidad" value={sens} tone="sky" />}
          {spec != null && <Metric label="Especificidad" value={spec} tone="emerald" />}
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        {test.cite.map((c) => REFERENCES[c.ref]?.authors ?? c.ref).join('; ')}
        {unverified && (
          <span className="ml-1.5 text-amber-500/90">· cifra sin verificar contra la fuente</span>
        )}
      </p>
      {test.demo && (
        <button
          type="button"
          onClick={() => (gate.unlocked ? goToTestInLab(region, test.id) : gate.requestUpgrade())}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
        >
          {/* Con candado si el panel de pruebas no esta desbloqueado: mejor
              decirlo aqui que mandar al usuario a una puerta cerrada. */}
          {!gate.unlocked && <LockGlyph className="h-3 w-3" />}
          Ver la prueba en el laboratorio →
        </button>
      )}
    </div>
  );
}

/**
 * Una cifra de la prueba.
 *
 * El color dice EL EJE, no si la cifra es buena: cielo = sensibilidad,
 * esmeralda = especificidad, igual que en el panel de pruebas. Dos pantallas
 * que usan el mismo color para cosas distintas se leen mal las dos.
 */
function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'sky' | 'emerald';
}) {
  const bar = tone === 'sky' ? 'bg-sky-400/80' : 'bg-emerald-400/80';
  const txt = tone === 'sky' ? 'text-sky-300' : 'text-emerald-300';
  return (
    <div className="flex min-w-[8.5rem] flex-1 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-slate-500">{label}</span>
        <span className={`font-display text-sm font-semibold ${txt}`}>{value}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
