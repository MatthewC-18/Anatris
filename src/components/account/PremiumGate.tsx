// src/components/account/PremiumGate.tsx
//
// Shared UI + plumbing for the capability paywall (src/auth/entitlements.ts).
//
// WHY A CONTEXT: the locked capabilities live deep in the tree (the movement
// lab's tests / neuro panels, the patient-mode pill, the movement list), and
// the pricing overlay is owned by App. Prop-drilling `setOverlay` through five
// levels made every intermediate component know about billing. `UpgradeProvider`
// gives any descendant one call — `useUpgrade().openPricing(source)` — and also
// fires the funnel event with WHERE the user was when they hit the wall, which
// is the number that tells us which capability actually sells.
//
// DESIGN RULE: a locked capability is shown, not hidden. `PremiumPill` marks it
// in place; `PremiumTeaser` replaces a whole locked panel with what it does plus
// one CTA. An empty space communicates nothing; a lock communicates value.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { FEATURE_LABEL, type PremiumFeature } from '../../auth/entitlements';
import { useEntitlement } from '../../auth/AuthContext';
import { EVENTS, track } from '../../lib/analytics';

/* ---------------------------------------------------------------------------
 * Upgrade context
 * ------------------------------------------------------------------------ */

interface UpgradeContextValue {
  /** Open the pricing surface. `source` is recorded in the funnel event. */
  openPricing: (source?: string) => void;
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null);

export function UpgradeProvider({
  onOpenPricing,
  children,
}: {
  onOpenPricing: () => void;
  children: ReactNode;
}) {
  const value = useMemo<UpgradeContextValue>(
    () => ({
      openPricing: (source?: string) => {
        track(EVENTS.paywallViewed, { source: source ?? 'unknown' });
        onOpenPricing();
      },
    }),
    [onOpenPricing],
  );
  return <UpgradeContext.Provider value={value}>{children}</UpgradeContext.Provider>;
}

/**
 * Open the pricing surface from anywhere below <UpgradeProvider>. Falls back to
 * a no-op outside the provider so isolated renders (tests, storybook-style
 * harnesses) don't need the whole app shell.
 */
export function useUpgrade(): UpgradeContextValue {
  return useContext(UpgradeContext) ?? { openPricing: () => {} };
}

/**
 * One-stop hook for a gated capability: whether it's unlocked, and the click
 * handler to use when it isn't.
 */
export function useFeatureGate(feature: PremiumFeature): {
  unlocked: boolean;
  requestUpgrade: () => void;
  label: string;
} {
  const { canUseFeature } = useEntitlement();
  const { openPricing } = useUpgrade();
  const unlocked = canUseFeature(feature);
  return {
    unlocked,
    requestUpgrade: () => openPricing(feature),
    label: FEATURE_LABEL[feature],
  };
}

/* ---------------------------------------------------------------------------
 * Presentational pieces
 * ------------------------------------------------------------------------ */

/** Small lock glyph. Shared by the TopBar region nav and every locked control. */
export function LockGlyph({ className = '' }: { className?: string }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`opacity-80 ${className}`}
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/** Inline "Premium" chip to mark a locked row or control in place. */
export function PremiumPill({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/15 font-semibold uppercase tracking-wide text-amber-300 ${
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
      }`}
    >
      <LockGlyph className="h-2.5 w-2.5" />
      {!compact && 'Premium'}
    </span>
  );
}

/**
 * Replaces a locked panel's body. Says what the capability DOES (so the value is
 * concrete) and offers exactly one action.
 */
export function PremiumTeaser({
  feature,
  title,
  lines,
  compact = false,
}: {
  feature: PremiumFeature;
  /** Overrides the default feature label as the headline. */
  title?: string;
  /** Two or three concrete things this capability gives the physio. */
  lines: string[];
  compact?: boolean;
}) {
  const { requestUpgrade, label } = useFeatureGate(feature);

  return (
    <div
      className={`flex flex-col items-center rounded-xl border border-amber-500/25 bg-amber-500/[0.06] text-center ${
        compact ? 'gap-2 p-3' : 'gap-3 p-5'
      }`}
    >
      <PremiumPill />
      <p
        className={`font-display font-semibold text-slate-100 ${
          compact ? 'text-sm' : 'text-base'
        }`}
      >
        {title ?? label}
      </p>
      <ul className="flex flex-col gap-1 text-left">
        {lines.map((l) => (
          <li key={l} className="flex items-start gap-1.5 text-xs text-slate-400">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400/70" />
            {l}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={requestUpgrade}
        className="mt-1 w-full rounded-lg bg-amber-400/15 px-4 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-400/25"
      >
        Desbloquear con Premium
      </button>
    </div>
  );
}
