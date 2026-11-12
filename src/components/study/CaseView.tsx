// src/components/study/CaseView.tsx
//
// "Casos" — interactive clinical cases for the active region. This is the
// clinical-reasoning layer: a patient vignette followed by guided multiple-
// choice steps, each revealing an explanation so the student learns the WHY, not
// just the answer. Content lives in data/clinicalCases.ts; this is the runner.
//
// Flow: list of cases -> pick one -> read vignette -> answer each step with
// immediate feedback + explanation -> takeaway summary.
//
// PRESENTACION: LAMINA. Habia seis cajas y dos bloques: cada caso de la lista
// era una tarjeta, la vineta otra, cada opcion de respuesta una caja con borde
// que se tenia de verde o de rojo, la prueba del paso otra tarjeta dentro, y la
// conclusion y la nota final dos mas. Ahora:
//   - la lista de casos es una lista partida por filos, con el nivel y las
//     etiquetas en mono en la misma linea;
//   - la vineta es una nota con regla a la izquierda, el contexto que se queda;
//   - las opciones son una lista de `.opt` (una entre varias): el punto marca la
//     elegida y, al responder, la correcta se pinta en verde y la equivocada en
//     rosa, con su etiqueta escrita ("Correcta", "Tu respuesta") para no fiarlo
//     todo al color;
//   - el veredicto es una nota con el tono en la regla;
//   - la prueba del paso es una subseccion con su rotulo y su filo.

import { useMemo, useState } from 'react';
import { LockGlyph, useFeatureGate } from '../account/PremiumGate';
import { REFERENCES } from '../../data/references';
import { casesForRegion } from '../../data/clinicalCases';
import { goToTestInLab, testForStep } from '../../lib/caseEvidence';
import { optionLetter, shuffledCaseOptions } from '../../lib/caseOptions';
import type { ClinicalCase, CaseStep } from '../../types/clinicalCase';
import type { OrthopedicTest } from '../../types/orthopedicTest';

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
        <p className="note max-w-sm text-sm">
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
      <p className="text-sm text-fg2">
        Resuelve casos guiados para entrenar el razonamiento clínico de la región.
      </p>
      <ol className="divide-y divide-line/75 border-y border-line/75">
        {cases.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setActiveId(c.id)}
              className="group flex w-full flex-col gap-1.5 rounded py-4 text-left"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-display text-base font-semibold text-fg transition-colors group-hover:text-brand">
                  {c.title}
                </span>
                <LevelTag level={c.level} />
              </span>
              <span className="line-clamp-2 text-sm leading-relaxed text-fg2">{c.vignette}</span>
              <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {c.tags.map((t, i) => (
                  <span key={t} className="tag">
                    {i > 0 && (
                      <span className="mr-2" aria-hidden="true">
                        ·
                      </span>
                    )}
                    {t}
                  </span>
                ))}
                <span className="ml-auto text-[11px] font-medium text-fg3">
                  {c.steps.length} {c.steps.length === 1 ? 'paso' : 'pasos'} ·{' '}
                  <span className="text-brand">Resolver →</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
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
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-8">
        <button type="button" onClick={onExit} className="btn btn-quiet btn-sm self-start">
          ← Volver a los casos
        </button>
        <section>
          <div className="sec-head">
            <h2 className="kicker text-clinical">Conclusión clínica</h2>
            <span className="sec-rule" />
          </div>
          <p className="note border-l-clinical/70 text-sm leading-relaxed text-fg">
            {clinicalCase.takeaway}
          </p>
        </section>
        {/* La puntuacion como cifra, no como una tarjeta con la cifra dentro. */}
        <div className="flex items-baseline gap-4 border-y border-line/75 py-4">
          <span className="readout text-3xl">
            {score}/{steps.length}
          </span>
          <span className="num text-sm text-fg2">{pct}%</span>
          <span className="kicker ml-auto">Aciertos en el razonamiento</span>
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
            className="btn btn-line"
          >
            Repetir el caso
          </button>
          <button type="button" onClick={onExit} className="btn btn-primary">
            Elegir otro caso
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-6">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onExit} className="btn btn-quiet btn-sm -ml-2">
          ← Casos
        </button>
        <span className="num text-xs text-fg3">
          Paso {index + 1} / {steps.length}
        </span>
      </div>

      {/* Vignette (persistent context): una nota con regla, no una tarjeta. */}
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-bold text-fg">{clinicalCase.title}</h2>
          <LevelTag level={clinicalCase.level} />
        </div>
        <p className="note text-sm leading-relaxed text-fg/85">{clinicalCase.vignette}</p>
      </section>

      {/* Progress: el medidor de 2 px del sistema. */}
      <span
        className="meter block text-brand"
        style={{ '--v': ((index + (answered ? 1 : 0)) / steps.length) * 100 } as React.CSSProperties}
        aria-hidden="true"
      />

      {/* Step prompt + options */}
      <h3 className="font-display text-lg font-semibold leading-snug text-fg">{step.prompt}</h3>
      <div role="radiogroup" aria-label={step.prompt} className="flex flex-col gap-0.5">
        {options.map((o, i) => {
          const isPicked = picked === o.id;
          const reveal = answered && o.correct;
          const wrongPick = answered && isPicked && !o.correct;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={isPicked}
              disabled={answered}
              onClick={() => choose(o.id)}
              className={[
                // La marca baja a la primera linea: una opcion larga ocupa dos
                // o tres, y centrada en vertical el punto quedaba a media frase.
                // 44 px de alto minimo: era una caja con `py-3` (unos 46 px) y
                // esta pantalla se usa en el movil; `.opt` sola da unos 36.
                'opt min-h-[44px] items-start py-2.5 text-sm before:mt-[0.4rem]',
                // El tono va con `!`: `.opt[aria-checked='true']` pone color y
                // peso con dos selectores, y en Tailwind 3 (sin capas nativas)
                // una utilidad de un solo selector pierde contra el. Sin el `!`
                // la opcion elegida salia blanca y en negrita, acertase o no.
                reveal
                  ? '!font-medium !text-clinical before:!bg-clinical before:!shadow-none disabled:opacity-100'
                  : wrongPick
                    ? '!font-medium !text-rose-300 before:!bg-rose-400 before:!shadow-none disabled:opacity-100'
                    : answered
                      ? 'text-fg3'
                      : '',
              ].join(' ')}
            >
              <span className="num shrink-0 text-xs text-fg3">{optionLetter(i)}.</span>
              <span className="min-w-0 flex-1">{o.text}</span>
              {reveal && <span className="tag shrink-0 pt-1 text-clinical">Correcta</span>}
              {wrongPick && <span className="tag shrink-0 pt-1 text-rose-300">Tu respuesta</span>}
            </button>
          );
        })}
      </div>

      {/* Explanation + advance */}
      {answered && (
        <div className="flex flex-col gap-4 border-t border-line/75 pt-4">
          <div
            className={`note text-sm ${
              pickedCorrect ? 'border-l-clinical/70' : 'border-l-rose-400/70'
            }`}
          >
            <p className={`font-medium ${pickedCorrect ? 'text-clinical' : 'text-rose-300'}`}>
              {pickedCorrect ? '¡Correcto!' : 'Respuesta incorrecta'}
            </p>
            <p className="mt-1 leading-relaxed text-fg/85">{step.explanation}</p>
          </div>
          <StepEvidence region={clinicalCase.region} step={step} />
          <button type="button" onClick={next} className="btn btn-primary self-end">
            {index + 1 < steps.length ? 'Siguiente' : 'Ver conclusión'}
          </button>
        </div>
      )}
    </div>
  );
}

/** El nivel del caso: etiqueta en mono con el tono en la letra, sin pastilla. */
function LevelTag({ level }: { level: ClinicalCase['level'] }) {
  const tone =
    level === 'básico'
      ? 'text-emerald-300'
      : level === 'intermedio'
        ? 'text-amber-300'
        : 'text-rose-300';
  return <span className={`tag shrink-0 ${tone}`}>{level}</span>;
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
 * null y esta seccion no existe, en vez de dejar un bloque a medias.
 * ======================================================================== */

function StepEvidence({ region, step }: { region: string; step: CaseStep }) {
  const test = useMemo(() => testForStep(region, step), [region, step]);
  const gate = useFeatureGate('orthopedic-tests');
  if (!test) return null;
  const { sensitivity: sens, specificity: spec } = test.metrics;
  const unverified = test.cite.some((c) => !c.verified);
  return (
    <section>
      <div className="sec-head mb-2">
        <span className="kicker">La prueba</span>
        <span className="sec-rule" />
        <span className="tag shrink-0">{test.target}</span>
      </div>
      <p className="font-display text-sm font-semibold text-fg">{test.name}</p>
      <dl className="mt-2 flex flex-col gap-1.5 text-xs leading-relaxed text-fg2">
        <div>
          <dt className="inline font-medium text-fg">Maniobra. </dt>
          <dd className="inline">{test.maneuver}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-fg">Positivo. </dt>
          <dd className="inline">{test.positive}</dd>
        </div>
      </dl>
      {(sens != null || spec != null) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {sens != null && <Metric label="Sensibilidad" value={sens} tone="sky" />}
          {spec != null && <Metric label="Especificidad" value={spec} tone="emerald" />}
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-fg3">
        {test.cite.map((c) => REFERENCES[c.ref]?.authors ?? c.ref).join('; ')}
        {unverified && (
          <span className="ml-1.5 text-amber-300/90">· cifra sin verificar contra la fuente</span>
        )}
      </p>
      {/* SOBRE QUIEN se midio la cifra que acaba de ver.
          Es la diferencia entre ensenar un numero y ensenar una prueba: el
          alumno que lee "sensibilidad 73%" sin saber que sale de 24 mujeres
          con dolor trocantereo comparadas contra resonancia no ha aprendido a
          leer evidencia, solo a memorizar una cifra. Se dibuja solo donde la
          fuente lo trae, asi que no deja hueco en las que aun no lo tienen. */}
      {studyScope(test) && (
        <p className="mt-1 text-[11px] leading-relaxed text-fg3">{studyScope(test)}</p>
      )}
      {test.demo && (
        <button
          type="button"
          onClick={() => (gate.unlocked ? goToTestInLab(region, test.id) : gate.requestUpgrade())}
          className="btn btn-line btn-sm mt-3"
        >
          {/* Con candado si el panel de pruebas no esta desbloqueado: mejor
              decirlo aqui que mandar al usuario a una puerta cerrada. */}
          {!gate.unlocked && <LockGlyph className="h-3 w-3" />}
          Ver la prueba en el laboratorio →
        </button>
      )}
    </section>
  );
}

/**
 * Muestra y patron de referencia de las fuentes de una prueba, en una linea.
 *
 * Devuelve cadena vacia cuando ninguna de las fuentes trae esos datos, que es
 * todavia el caso de la mayoria: el bloque entero no se dibuja.
 */
function studyScope(test: OrthopedicTest): string {
  const partes = test.cite
    .map((c) => REFERENCES[c.ref])
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => [r.sample, r.standard].filter(Boolean).join(' · '))
    .filter(Boolean);
  return [...new Set(partes)].join(' | ');
}

/**
 * Una cifra de la prueba.
 *
 * El color dice EL EJE, no si la cifra es buena: cielo = sensibilidad,
 * esmeralda = especificidad, igual que en el panel de pruebas. Dos pantallas
 * que usan el mismo color para cosas distintas se leen mal las dos. La barra es
 * el medidor de 2 px del sistema (`.meter`), que toma el color de la letra.
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
  const txt = tone === 'sky' ? 'text-sky-300' : 'text-emerald-300';
  return (
    <div className="flex min-w-[8.5rem] flex-1 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-fg3">{label}</span>
        <span className={`readout text-sm ${txt}`}>{value}%</span>
      </div>
      <span
        className={`meter block ${txt}`}
        style={{ '--v': value } as React.CSSProperties}
        aria-hidden="true"
      />
    </div>
  );
}
