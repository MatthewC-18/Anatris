// src/components/study/StudyView.tsx
//
// Top-level "Estudiar" view. It now opens on the premium study experience —
// "Repaso" (spaced repetition) — and surfaces a progress dashboard (streak,
// daily goal, mastery, cards due) above three study modes:
//   - Repaso: SRS review session (only the cards that are due + a daily trickle
//             of new ones). The flagship "study like a med student" feature.
//   - Cuestionario: a generated multiple-choice quiz over the region.
//   - Tarjetas: free flip-through of the whole deck (no scheduling).
//
// Conceptual modules (Fundamentos) have no muscle list, so the view shows a
// friendly empty state for them. All three modes derive their content from the
// region's existing clinical muscle data via studyEngine — adding a region
// lights up its quiz, deck and SRS automatically.

import { useCallback, useMemo, useState } from 'react';
import { musclesForRegion } from '../../data/musclesByRegion';
import { REGIONS } from '../../data/regiones';
import { getDeckStats } from '../../lib/srsStore';
import { QuizView } from './QuizView';
import { FlashcardsView } from './FlashcardsView';
import { ReviewView } from './ReviewView';
import { StudyDashboard } from './StudyDashboard';

type StudyTab = 'review' | 'quiz' | 'cards';

interface StudyViewProps {
  /** Active region id from the store. null/concept => empty state. */
  region: string | null;
  /** True for conceptual modules (Fundamentos), which have no muscles. */
  isConcept: boolean;
}

export function StudyView({ region, isConcept }: StudyViewProps) {
  const [tab, setTab] = useState<StudyTab>('review');
  // Bumped after any session activity to re-read persisted progress / schedules.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((n) => n + 1), []);

  const regionId = region ?? 'shoulder';
  const muscles = useMemo(() => musclesForRegion(regionId), [regionId]);
  const cardIds = useMemo(() => muscles.map((m) => m.id), [muscles]);
  const regionName = REGIONS[regionId]?.name ?? 'Región';

  // Cards-due badge on the Repaso tab.
  const dueCount = useMemo(
    () => getDeckStats(regionId, cardIds, Date.now()).toReview,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regionId, cardIds, refreshKey],
  );

  if (isConcept) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-base font-semibold text-slate-200">
            El estudio guiado está disponible por región anatómica
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Selecciona una región (Hombro, Codo, Columna o Rodilla) para repasar
            con repetición espaciada, cuestionarios y tarjetas. Fundamentos es un
            módulo de lectura conceptual.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header: region + dashboard + tab selector */}
      <div className="shrink-0 border-b border-slate-800/60 px-6 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Estudiar
            </p>
            <h1 className="font-display text-xl font-bold text-slate-50">{regionName}</h1>
          </div>

          <StudyDashboard region={regionId} cardIds={cardIds} refreshKey={refreshKey} />

          <div className="flex w-fit gap-1 rounded-xl border border-slate-800/60 bg-slate-900/60 p-1">
            <TabButton id="review" label="Repaso" tab={tab} setTab={setTab} badge={dueCount} />
            <TabButton id="quiz" label="Cuestionario" tab={tab} setTab={setTab} />
            <TabButton id="cards" label="Tarjetas" tab={tab} setTab={setTab} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'review' ? (
          <ReviewView
            key={`review-${regionId}`}
            region={regionId}
            muscles={muscles}
            onReviewed={refresh}
          />
        ) : tab === 'quiz' ? (
          <QuizView
            key={`quiz-${regionId}`}
            region={regionId}
            muscles={muscles}
            onFinished={refresh}
          />
        ) : (
          <FlashcardsView
            key={`cards-${regionId}`}
            region={regionId}
            muscles={muscles}
            onFinished={refresh}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  id,
  label,
  tab,
  setTab,
  badge,
}: {
  id: StudyTab;
  label: string;
  tab: StudyTab;
  setTab: (t: StudyTab) => void;
  /** Optional count shown as a pill (e.g. cards due). Hidden when 0. */
  badge?: number;
}) {
  const isActive = tab === id;
  return (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
        isActive ? 'bg-accent/20 text-accent' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
      {badge != null && badge > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
            isActive ? 'bg-accent/30 text-accent' : 'bg-slate-700/60 text-slate-300'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
