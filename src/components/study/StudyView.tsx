// src/components/study/StudyView.tsx
//
// Top-level "Estudiar" view. Picks the active region's muscles, shows a small
// progress summary, and lets the student switch between a generated quiz and a
// flashcard deck. Conceptual modules (Fundamentos) have no muscle list, so the
// view shows a friendly empty state for them.
//
// This is the seed of the paid study experience: today it works on whatever
// region is active; gating a region behind a subscription later is a single
// check around the mode/region, not a rewrite.

import { useCallback, useMemo, useState } from 'react';
import { musclesForRegion } from '../../data/musclesByRegion';
import { REGIONS } from '../../data/regiones';
import { getProgress, type RegionProgress } from '../../lib/studyProgress';
import { QuizView } from './QuizView';
import { FlashcardsView } from './FlashcardsView';

type StudyTab = 'quiz' | 'cards';

interface StudyViewProps {
  /** Active region id from the store. null/concept => empty state. */
  region: string | null;
  /** True for conceptual modules (Fundamentos), which have no muscles. */
  isConcept: boolean;
}

export function StudyView({ region, isConcept }: StudyViewProps) {
  const [tab, setTab] = useState<StudyTab>('quiz');
  // Bumped after a session is recorded to re-read persisted progress.
  const [progressNonce, setProgressNonce] = useState(0);

  const regionId = region ?? 'shoulder';
  const muscles = useMemo(() => musclesForRegion(regionId), [regionId]);
  const regionName = REGIONS[regionId]?.name ?? 'Región';

  const progress: RegionProgress = useMemo(
    () => getProgress(regionId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regionId, progressNonce],
  );

  const refreshProgress = useCallback(() => setProgressNonce((n) => n + 1), []);

  if (isConcept) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-base font-semibold text-slate-200">
            El estudio guiado está disponible por región anatómica
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Selecciona una región (Hombro, Codo, Columna o Rodilla) para hacer
            cuestionarios y repasar con tarjetas. Fundamentos es un módulo de
            lectura conceptual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header: region + progress + tab selector */}
      <div className="shrink-0 border-b border-slate-800/60 px-6 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Estudiar
              </p>
              <h1 className="font-display text-xl font-bold text-slate-50">
                {regionName}
              </h1>
            </div>
            <div className="flex gap-4 text-right">
              <Stat label="Mejor quiz" value={`${progress.quizBest}%`} />
              <Stat label="Intentos" value={`${progress.quizAttempts}`} />
              <Stat label="Tarjetas" value={`${progress.cardsKnown}`} />
            </div>
          </div>

          <div className="flex w-fit gap-1 rounded-xl border border-slate-800/60 bg-slate-900/60 p-1">
            <TabButton id="quiz" label="Cuestionario" tab={tab} setTab={setTab} />
            <TabButton id="cards" label="Tarjetas" tab={tab} setTab={setTab} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'quiz' ? (
          <QuizView
            key={`quiz-${regionId}`}
            region={regionId}
            muscles={muscles}
            onFinished={refreshProgress}
          />
        ) : (
          <FlashcardsView
            key={`cards-${regionId}`}
            region={regionId}
            muscles={muscles}
            onFinished={refreshProgress}
          />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-lg font-bold text-slate-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-600">{label}</p>
    </div>
  );
}

function TabButton({
  id,
  label,
  tab,
  setTab,
}: {
  id: StudyTab;
  label: string;
  tab: StudyTab;
  setTab: (t: StudyTab) => void;
}) {
  const isActive = tab === id;
  return (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-accent/20 text-accent'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
