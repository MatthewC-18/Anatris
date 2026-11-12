// src/components/study/QuizView.tsx
//
// Una sesion de cuestionario sobre los musculos de una region. Las preguntas
// las genera studyEngine.buildQuizQuestions() a partir de los datos clinicos,
// se muestrean a SESSION_SIZE y se presentan de una en una con correccion
// inmediata. La mejor marca se guarda con studyProgress.
//
// LAS OPCIONES ERAN CUATRO CAJAS REDONDEADAS, y al contestar se tenian de verde
// o de rosa. En LAMINA son una LISTA partida por filos, como el indice de un
// atlas: el numero de la opcion (que es tambien su tecla) en la voz mono, el
// texto, y al corregir una marca a la derecha. El color solo aparece en la
// marca y en el peso de la letra, no en un fondo.

import { useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Muscle } from '../../types/muscle';
import { buildQuizQuestions, shuffle, type QuizQuestion } from '../../lib/studyEngine';
import { recordQuiz } from '../../lib/studyProgress';
import { quizKeyAction } from '../../lib/studyKeys';
import { useStudyKeys } from '../../hooks/useStudyKeys';

const SESSION_SIZE = 10;

interface QuizViewProps {
  region: string;
  muscles: Muscle[];
  /** Called after a session is recorded, so the parent can refresh its stats. */
  onFinished?: () => void;
}

export function QuizView({ region, muscles, onFinished }: QuizViewProps) {
  // Build a fresh session whenever the user (re)starts. `seed` forces a new
  // sample + reshuffle without recomputing the whole pool's identity.
  const [seed, setSeed] = useState(0);
  const session = useMemo<QuizQuestion[]>(() => {
    const pool = buildQuizQuestions(muscles);
    return shuffle(pool).slice(0, SESSION_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muscles, seed]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q: QuizQuestion | undefined = session[index];
  const total = session.length;
  const answered = picked != null;
  const pickedCorrect = Boolean(answered && q?.options.find((o) => o.id === picked)?.correct);

  function choose(optionId: string) {
    if (!q || answered) return;
    setPicked(optionId);
    if (q.options.find((o) => o.id === optionId)?.correct) {
      setScore((s) => s + 1);
    }
  }

  function next() {
    if (index + 1 < total) {
      setIndex((i) => i + 1);
      setPicked(null);
    } else {
      const pct = (score / total) * 100;
      recordQuiz(region, pct);
      setDone(true);
      onFinished?.();
    }
  }

  function restart() {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
    setSeed((s) => s + 1);
  }

  // TECLADO: el numero de la opcion la elige; espacio o Intro pasan a la
  // siguiente una vez contestada. Ver lib/studyKeys.ts.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useStudyKeys(rootRef, (key) => {
    if (!q || done) return false;
    const action = quizKeyAction(key, answered, q.options.length);
    if (!action) return false;
    if (action.type === 'choose') choose(q.options[action.index].id);
    else next();
    return true;
  });

  if (!q) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="kicker">Cuestionario</p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-fg2">
          No hay preguntas suficientes para esta región todavía.
        </p>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / total) * 100);
    return (
      <div className="mx-auto flex max-w-2xl flex-col px-6 py-10">
        <p className="kicker">Resultado</p>
        <p className="readout mt-4 text-5xl">
          {pct}
          <span className="num ml-1 text-xl font-medium text-fg3">%</span>
        </p>
        <p className="mt-3 text-sm text-fg2">
          {score} de {total} correctas.
        </p>
        <div className="mt-6">
          <button type="button" onClick={restart} className="btn btn-primary">
            Repetir cuestionario
          </button>
        </div>
      </div>
    );
  }

  const progressPct = Math.round(((index + (answered ? 1 : 0)) / total) * 100);

  return (
    <div ref={rootRef} className="mx-auto flex max-w-2xl flex-col px-6 pb-6 pt-5">
      {/* Avance y aciertos */}
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-fg2">
          Pregunta <span className="num font-medium text-fg">{index + 1}</span> de{' '}
          <span className="num">{total}</span>
        </p>
        <p className="tag">
          {score} {score === 1 ? 'acierto' : 'aciertos'}
        </p>
      </div>
      <div
        className="meter mt-2 text-brand"
        style={{ '--v': progressPct } as CSSProperties}
        role="progressbar"
        aria-label="Avance del cuestionario"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPct}
      />

      {/* Enunciado */}
      <h2 className="mt-6 font-display text-lg font-semibold leading-snug text-fg">
        {q.prompt}
      </h2>

      {/* Opciones: una lista, no cuatro cajas. */}
      <div role="radiogroup" aria-label="Opciones" className="mt-4 border-t border-line/75">
        {q.options.map((o, i) => {
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
                'flex min-h-[44px] w-full items-baseline gap-3 border-b border-line/75 py-3 text-left text-sm leading-snug transition-colors',
                reveal
                  ? 'font-semibold text-fg'
                  : wrongPick
                    ? 'text-fg2'
                    : answered
                      ? 'text-fg3'
                      : 'text-fg2 hover:text-fg',
              ].join(' ')}
            >
              <span className="num w-4 shrink-0 text-xs font-normal text-fg3">{i + 1}</span>
              <span className="min-w-0 flex-1">{o.text}</span>
              {reveal && (
                <span className="tag shrink-0 text-clinical-soft">Correcta</span>
              )}
              {wrongPick && <span className="tag shrink-0 text-amber-300/90">Tu respuesta</span>}
            </button>
          );
        })}
      </div>

      {/* Correccion y paso a la siguiente */}
      <div className="mt-4 flex min-h-[2.75rem] items-center justify-between gap-3" aria-live="polite">
        {answered ? (
          <>
            {/* El tono va en la regla de la izquierda: verde clinico si acierta,
                ambar (el color de los avisos) si falla. */}
            <p className={`note ${pickedCorrect ? 'border-l-clinical/70' : 'note-warn'}`}>
              {pickedCorrect ? 'Correcto.' : 'Respuesta incorrecta.'}
            </p>
            <button type="button" onClick={next} className="btn btn-primary shrink-0">
              {index + 1 < total ? 'Siguiente' : 'Ver resultado'}
            </button>
          </>
        ) : (
          <p className="hidden items-center gap-1.5 text-[11px] text-fg3 [@media(hover:hover)]:flex">
            <span className="kbd">1</span>
            <span>a</span>
            <span className="kbd">{q.options.length}</span>
            <span>eligen la opción</span>
            <span aria-hidden="true">·</span>
            <span className="kbd">Espacio</span>
            <span>pasa a la siguiente</span>
          </p>
        )}
      </div>
    </div>
  );
}
