// src/lib/__tests__/premiumLoader.test.ts
//
// The loader's FAILURE behaviour, which is what the user actually meets when a
// paid region does not open. Every case here used to collapse into the same
// bare 'error' with nothing in the card and nothing in the console, so "solo
// carga el hombro" was indistinguishable between a function that was never
// deployed, a 500, being offline, and a 200 carrying the wrong body.
//
// The happy path runs against the real store, so an install that silently does
// not register (the wrong `region` in the payload) fails here too — that one is
// the nastiest, because it reports 'ready' and mounts an EMPTY region.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensurePremiumRegion,
  PremiumContentError,
  PremiumDeniedError,
} from '../premiumContent';
import {
  clearPremiumRegions,
  isPremiumRegionLoaded,
  type PremiumRegionPayload,
} from '../../data/premiumStore';

/** A minimal but STRUCTURALLY COMPLETE payload, as the edge function returns. */
function payloadFor(region: string): PremiumRegionPayload {
  return {
    region,
    muscles: [],
    romLookupMuscles: [],
    content: {},
    rom: [],
    track: null,
    tests: [],
    cases: [],
    pathologies: [],
  };
}

beforeEach(() => {
  clearPremiumRegions();
  // The loader reads the bundled library in DEV and never calls the fetcher, so
  // the server path only exists with DEV off — which is also the only mode the
  // real users of this code run in.
  vi.stubEnv('DEV', false);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('ensurePremiumRegion', () => {
  it('installs the region and reports ready', async () => {
    const outcome = await ensurePremiumRegion('knee', async (r) => payloadFor(r));
    expect(outcome.state).toBe('ready');
    expect(isPremiumRegionLoaded('knee')).toBe(true);
  });

  it('reports denied — not error — when the server refuses for lack of plan', async () => {
    const outcome = await ensurePremiumRegion('knee', async () => {
      throw new PremiumDeniedError();
    });
    // 'denied' routes to the paywall; anything else would show a red failure
    // card to a user whose only problem is not having paid.
    expect(outcome.state).toBe('denied');
    expect(isPremiumRegionLoaded('knee')).toBe(false);
  });

  it('carries the cause of a server failure into the outcome', async () => {
    const outcome = await ensurePremiumRegion('elbow', async () => {
      throw new PremiumContentError('La funcion "content" no existe', 404);
    });
    expect(outcome.state).toBe('error');
    expect(outcome.reason).toContain('no existe');
    // The status is what separates "not deployed" from "offline", so it must
    // survive as far as the card.
    expect(outcome.reason).toContain('404');
  });

  it('refuses a payload for a different region instead of mounting it empty', async () => {
    const outcome = await ensurePremiumRegion('elbow', async () => payloadFor('knee'));
    expect(outcome.state).toBe('error');
    expect(isPremiumRegionLoaded('elbow')).toBe(false);
  });

  it('refuses a structurally invalid payload', async () => {
    const outcome = await ensurePremiumRegion(
      'hip',
      async () => ({ region: 'hip' }) as unknown as PremiumRegionPayload,
    );
    expect(outcome.state).toBe('error');
    expect(isPremiumRegionLoaded('hip')).toBe(false);
  });

  it('reports a misconfigured build rather than pretending the user has not paid', async () => {
    // No fetcher in production = no Supabase env vars in the build. Reporting
    // that as 'denied' sent an owner in circles: "upgrade" then paywall again.
    const outcome = await ensurePremiumRegion('lumbar', null);
    expect(outcome.state).toBe('error');
    expect(outcome.reason).toContain('Supabase');
  });

  it('deduplicates concurrent requests for the same region', async () => {
    const fetcher = vi.fn(async (r: string) => payloadFor(r));
    const [a, b] = await Promise.all([
      ensurePremiumRegion('ankle', fetcher),
      ensurePremiumRegion('ankle', fetcher),
    ]);
    expect(a.state).toBe('ready');
    expect(b.state).toBe('ready');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('lets a failed region be retried', async () => {
    const fetcher = vi
      .fn<(r: string) => Promise<PremiumRegionPayload>>()
      .mockRejectedValueOnce(new PremiumContentError('caida', 503))
      .mockImplementation(async (r) => payloadFor(r));

    expect((await ensurePremiumRegion('cervical', fetcher)).state).toBe('error');
    // The in-flight entry must be released on failure, or the retry button
    // would keep resolving the same rejected promise.
    expect((await ensurePremiumRegion('cervical', fetcher)).state).toBe('ready');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
