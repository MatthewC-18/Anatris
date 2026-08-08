// src/hooks/usePremiumRegion.ts
//
// Gate hook: resolves whether the active region's clinical content is ready to
// render. Free regions are bundled and answer 'ready' immediately; premium ones
// are fetched from the entitlement-checked `content` edge function and only
// report 'ready' once installed in the synchronous registries.
//
// App renders the workspace only on 'ready', which is what lets ~30 registry
// call sites stay synchronous (see lib/premiumContent.ts for the reasoning).
//
// A failed load used to be a DEAD END: the effect only re-runs when the region
// or the fetcher changes, so a user whose request failed once (a flaky network,
// a function still deploying) had to navigate to another region and back to get
// another attempt. `retry` gives the failure card a button instead.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { isRegionPremium } from '../auth/entitlements';
import { isPremiumRegionLoaded } from '../data/premiumStore';
import { ensurePremiumRegion, type PremiumLoadState } from '../lib/premiumContent';

export interface PremiumRegionStatus {
  state: PremiumLoadState;
  /** Short cause, set only when `state === 'error'`. */
  reason?: string;
  /** Ask for the region again after a failure. */
  retry: () => void;
}

/**
 * @param region the active region id, or null before one is chosen
 * @returns `state === 'ready'` when it is safe to render the region's UI
 */
export function usePremiumRegion(region: string | null): PremiumRegionStatus {
  const { fetchPremiumRegion } = useAuth();

  const [state, setState] = useState<PremiumLoadState>(() =>
    region == null || !isRegionPremium(region) || isPremiumRegionLoaded(region)
      ? 'ready'
      : 'idle',
  );
  const [reason, setReason] = useState<string | undefined>(undefined);
  // Bumped by `retry`, and part of the effect's deps so a new attempt runs.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Free region (or none yet): nothing to fetch.
    if (region == null || !isRegionPremium(region)) {
      setState('ready');
      setReason(undefined);
      return;
    }
    // Already installed — e.g. coming back to a region visited this session.
    if (isPremiumRegionLoaded(region)) {
      setState('ready');
      setReason(undefined);
      return;
    }

    let cancelled = false;
    setState('loading');
    setReason(undefined);
    ensurePremiumRegion(region, fetchPremiumRegion).then((outcome) => {
      // The user may have switched region while this was in flight; applying a
      // stale result would flash the wrong state over the new region.
      if (cancelled) return;
      setState(outcome.state);
      setReason(outcome.reason);
    });
    return () => {
      cancelled = true;
    };
  }, [region, fetchPremiumRegion, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, reason, retry };
}
