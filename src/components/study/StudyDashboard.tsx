// src/components/study/StudyDashboard.tsx
//
// The study "cockpit" shown above the study tabs: at a glance the student sees
// their streak, today's goal progress, how mastered the region is, and how many
// cards are waiting. These four signals are the engagement core of a premium
// study product — they turn an anonymous deck into measurable, daily progress
// the student can feel, which is exactly what justifies a subscription.
//
// It is a pure read of localStorage (streak + SRS schedules); `refreshKey` is
// bumped by the parent after each graded review so the numbers update live.

import { useMemo } from 'react';
import { getStreak, DAILY_GOAL } from '../../lib/streak';
import { getDeckStats } from '../../lib/srsStore';

interface StudyDashboardProps {
  region: string;
  /** All card ids available for this region (one per muscle). */
  cardIds: string[];
  /** Bumped by the parent to force a re-read after reviews. */
  refreshKey: number;
}

export function StudyDashboard({ region, cardIds, refreshKey }: StudyDashboardProps) {
  const now = Date.now();
  const streak = useMemo(
    () => getStreak(now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refreshKey],
  );
  const stats = useMemo(
    () => getDeckStats(region, cardIds, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [region, cardIds, refreshKey],
  );

  const goalPct = Math.min(100, Math.round((streak.reviewedToday / DAILY_GOAL) * 100));

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {/* Streak */}
      <Tile>
        <div className="flex items-center gap-2">
          <FlameIcon active={streak.current > 0} />
          <div>
            <p className="font-display text-xl font-bold leading-none text-slate-50">
              {streak.current}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
              {streak.current === 1 ? 'día de racha' : 'días de racha'}
            </p>
          </div>
        </div>
      </Tile>

      {/* Daily goal ring */}
      <Tile>
        <div className="flex items-center gap-2.5">
          <Ring pct={goalPct} />
          <div>
            <p className="font-display text-xl font-bold leading-none text-slate-50">
              {streak.reviewedToday}
              <span className="text-sm font-medium text-slate-500">/{DAILY_GOAL}</span>
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
              meta de hoy
            </p>
          </div>
        </div>
      </Tile>

      {/* Mastery */}
      <Tile>
        <p className="font-display text-xl font-bold leading-none text-clinical-soft">
          {stats.masteryPct}%
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
          dominio · {stats.mature}/{stats.total}
        </p>
      </Tile>

      {/* Cards due */}
      <Tile highlight={stats.toReview > 0}>
        <p
          className={`font-display text-xl font-bold leading-none ${
            stats.toReview > 0 ? 'text-accent' : 'text-slate-50'
          }`}
        >
          {stats.toReview}
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
          para repasar
        </p>
      </Tile>
    </div>
  );
}

function Tile({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={[
        'rounded-xl border px-3 py-2.5',
        highlight
          ? 'border-accent/40 bg-accent/[0.06]'
          : 'border-slate-800/60 bg-slate-900/40',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

/** A small circular progress ring (SVG, no deps). */
function Ring({ pct }: { pct: number }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0 -rotate-90">
      <circle cx="16" cy="16" r={r} fill="none" stroke="#1c2740" strokeWidth="4" />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke="#22d3ee"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className="transition-all duration-500"
      />
    </svg>
  );
}

function FlameIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={active ? '#f59e0b' : 'none'}
      stroke={active ? '#f59e0b' : '#475569'}
      strokeWidth="1.8"
      className="shrink-0"
      aria-hidden
    >
      <path d="M12 2c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.7-2.5C9 9 9 7 9 7c-2 1.5-4 4-4 7a7 7 0 0 0 14 0c0-4.5-4-8-7-12z" />
    </svg>
  );
}
