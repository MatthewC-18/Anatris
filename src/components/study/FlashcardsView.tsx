// src/components/study/FlashcardsView.tsx
//
// "Tarjetas": el mazo entero de la region, de corrido y sin agenda. Delante, el
// musculo; detras, su ficha (origen, insercion, inervacion, acciones), que
// genera studyEngine.buildFlashcards() a partir de los datos clinicos. Cada
// tarjeta se autocalifica ("La sabía" / "Repasar") y la cuenta de sabidas se
// guarda con studyProgress.
//
// EN QUE SE DIFERENCIA DE "REPASO", que es lo primero que se pregunta quien ve
// las dos pestanas: aqui no hay agenda. Se pasa el mazo completo, una ficha
// entera por musculo, y nada de lo que se conteste mueve las fechas del repaso
// espaciado. Sirve para una pasada rapida antes de un examen. La linea bajo la
// tarjeta lo dice.
//
// La tarjeta es la misma pieza que usa el repaso (FlipCard): un solo recuadro,
// justificado alli.

import { useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Muscle } from '../../types/muscle';
import { buildFlashcards, shuffle, type Flashcard } from '../../lib/studyEngine';
import { recordCards } from '../../lib/studyProgress';
import { deckKeyAction } from '../../lib/studyKeys';
import { useStudyKeys } from '../../hooks/useStudyKeys';
import { FlipCard } from './FlipCard';

interface FlashcardsViewProps {
  region: string;
  muscles: Muscle[];
  onFinished?: () => void;
}

export function FlashcardsView({ region, muscles, onFinished }: FlashcardsViewProps) {
  const [seed, setSeed] = useState(0);
  const deck = useMemo<Flashcard[]>(() => {
    return shuffle(buildFlashcards(muscles));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muscles, seed]);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [done, setDone] = useState(false);

  const card: Flashcard | undefined = deck[index];
  const total = deck.length;

  function grade(wasKnown: boolean) {
    const nextKnown = known + (wasKnown ? 1 : 0);
    if (index + 1 < total) {
      setKnown(nextKnown);
      setIndex((i) => i + 1);
      setFlipped(false);
    } else {
      recordCards(region, nextKnown);
      setKnown(nextKnown);
      setDone(true);
      onFinished?.();
    }
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setKnown(0);
    setDone(false);
    setSeed((s) => s + 1);
  }

  // TECLADO: espacio o Intro voltean y, ya volteada, valen por "La sabía";
  // 1 es "Repasar" y 2 "La sabía". Ver lib/studyKeys.ts.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useStudyKeys(rootRef, (key) => {
    if (!card || done) return false;
    const action = deckKeyAction(key, flipped);
    if (!action) return false;
    if (action.type === 'flip') setFlipped(true);
    else grade(action.known);
    return true;
  });

  if (!card) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="kicker">Tarjetas</p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-fg2">
          No hay tarjetas para esta región todavía.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col px-6 py-10">
        <p className="kicker">Mazo completado</p>
        <p className="readout mt-4 text-5xl">
          {known}
          <span className="num ml-1 text-xl font-medium text-fg3">/{total}</span>
        </p>
        <p className="mt-3 text-sm text-fg2">tarjetas que ya sabías.</p>
        <div className="mt-6">
          <button type="button" onClick={restart} className="btn btn-primary">
            Repasar de nuevo
          </button>
        </div>
      </div>
    );
  }

  const progressPct = Math.round((index / total) * 100);

  return (
    <div ref={rootRef} className="mx-auto flex max-w-2xl flex-col px-6 pt-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-fg2">
          Tarjeta <span className="num font-medium text-fg">{index + 1}</span> de{' '}
          <span className="num">{total}</span>
        </p>
        <p className="tag">
          {known} {known === 1 ? 'sabida' : 'sabidas'}
        </p>
      </div>
      <div
        className="meter mb-4 mt-2 text-brand"
        style={{ '--v': progressPct } as CSSProperties}
        role="progressbar"
        aria-label="Avance del mazo"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPct}
      />

      <FlipCard
        kicker="Músculo"
        front={card.front}
        sub={card.sub}
        facts={card.facts}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
      />

      {/* La accion, pegada al borde inferior: la ficha completa de un musculo
          son hasta seis datos y en un telefono empuja los botones fuera. */}
      <div className="sticky bottom-0 -mx-6 bg-page px-6 pb-4 pt-3">
        {flipped ? (
          <div role="group" aria-label="¿La sabías?" className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => grade(false)}
              className="btn btn-line h-auto min-h-[44px]"
            >
              Repasar
            </button>
            <button
              type="button"
              onClick={() => grade(true)}
              className="btn btn-primary h-auto min-h-[44px]"
            >
              La sabía
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="btn btn-primary h-auto min-h-[44px] w-full"
          >
            Mostrar ficha
          </button>
        )}
        <p className="mt-2.5 text-xs leading-relaxed text-fg3">
          {flipped
            ? 'Es una pasada libre: lo que marques aquí no cambia las fechas de tu repaso.'
            : 'Intenta recordar el origen, la inserción y la inervación antes de mostrar la ficha.'}
        </p>
        <p className="mt-2 hidden items-center gap-1.5 text-[11px] text-fg3 [@media(hover:hover)]:flex">
          <span className="kbd">Espacio</span>
          <span>muestra la ficha y vale por «La sabía»</span>
          <span aria-hidden="true">·</span>
          <span className="kbd">1</span>
          <span>repasar</span>
          <span aria-hidden="true">·</span>
          <span className="kbd">2</span>
          <span>la sabía</span>
        </p>
      </div>
    </div>
  );
}
