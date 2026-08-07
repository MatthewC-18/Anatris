// src/hooks/usePremiumRegion.ts
//
// Gate hook: resolves whether the active region's clinical content is ready to
// render. Free regions are bundled and answer 'ready' immediately; premium ones
// are fetched from the entitlement-checked `content` edge function and only
// report 'ready' once installed in the synchronous registries.
//
// App renders the workspace only on 'ready', which is what lets ~30 registry
// call sites stay synchronous (see lib/premiumContent.ts for the reasoning).

import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { isRegionPremium } from '../auth/entitlements';
import { isPremiumRegionLoaded } from '../data/premiumStore';
import { ensurePremiumRegion, type PremiumLoadState } from '../lib/premiumContent';

/**
 * @param region the active region id, or null before one is chosen
 * @returns 'ready' when it is safe to render the region's UI
 */
export function usePremiumRegion(region: string | null): PremiumLoadState {
  const { fetchPremiumRegion } = useAuth();

  const [state, setState] = useState<PremiumLoadState>(() =>
    region == null || !isRegionPremium(region) || isPremiumRegionLoaded(region)
      ? 'ready'
      : 'idle',
  );

  useEffect(() => {
    // Free region (or none yet): nothing to fetch.
    if (region == null || !isRegionPremium(region)) {
      setState('ready');
      return;
    }
    // Already installed — e.g. coming back to a region visited this session.
    if (isPremiumRegionLoaded(region)) {
      setState('ready');
      return;
    }

    let cancelled = false;
    setState('loading');
    ensurePremiumRegion(region, fetchPremiumRegion).then((next) => {
      // The user may have switched region while this was in flight; applying a
      // stale result would flash the wrong state over the new region.
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [region, fetchPremiumRegion]);

  return state;
}
