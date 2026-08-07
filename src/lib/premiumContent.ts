// src/lib/premiumContent.ts
//
// Client half of the server-side entitlement check: fetches a premium region's
// clinical library and installs it into the synchronous registries
// (data/premiumStore.ts) BEFORE the region is allowed to render.
//
// Ordering is the whole trick. ~30 call sites read the registries synchronously,
// several inside the r3f render loop where a hook cannot go. Rather than make
// them all async, App blocks a premium region on `usePremiumRegion` and only
// mounts the workspace once the payload is in place.
//
// DEV / DEMO MODE: with no Supabase configured the app runs on the mock backend
// and there is no endpoint to call, so the content is imported straight from
// `fullContent`. That import sits behind `import.meta.env.DEV` inside a dynamic
// `import()`, which Vite eliminates from production builds — so the paid library
// still never reaches a public production chunk. Verified by
// `premium-content.test.ts` and by grepping `dist/` after a build.

import {
  installPremiumRegion,
  isPremiumRegionLoaded,
  type PremiumRegionPayload,
} from '../data/premiumStore';

/** How a load ended. `denied` = signed in but no live subscription. */
export type PremiumLoadState = 'idle' | 'loading' | 'ready' | 'denied' | 'error';

/** Fetches one region's payload from the entitlement-checked endpoint. */
export type PremiumFetcher = (region: string) => Promise<PremiumRegionPayload>;

/** Thrown by a fetcher when the server refused for lack of entitlement (403). */
export class PremiumDeniedError extends Error {
  constructor(message = 'Se requiere suscripcion activa') {
    super(message);
    this.name = 'PremiumDeniedError';
  }
}

/**
 * In-flight requests, so a region that is already being fetched is never
 * requested twice — React strict mode double-invokes effects, and switching
 * region quickly would otherwise fire duplicate paid requests.
 */
const inFlight = new Map<string, Promise<PremiumLoadState>>();

/**
 * Ensure a premium region's content is installed. Idempotent and safe to call
 * on every render: returns immediately once the region is loaded.
 */
export function ensurePremiumRegion(
  region: string,
  fetcher: PremiumFetcher | null,
): Promise<PremiumLoadState> {
  if (isPremiumRegionLoaded(region)) return Promise.resolve('ready');

  const existing = inFlight.get(region);
  if (existing) return existing;

  const run = (async (): Promise<PremiumLoadState> => {
    try {
      const payload = await loadPayload(region, fetcher);
      installPremiumRegion(payload);
      return 'ready';
    } catch (err) {
      if (err instanceof PremiumDeniedError) return 'denied';
      return 'error';
    } finally {
      inFlight.delete(region);
    }
  })();

  inFlight.set(region, run);
  return run;
}

async function loadPayload(
  region: string,
  fetcher: PremiumFetcher | null,
): Promise<PremiumRegionPayload> {
  // No real backend (demo mode) or local dev: read the bundled library. The
  // whole branch is compiled out of production builds.
  if (import.meta.env.DEV || !fetcher) {
    if (!import.meta.env.DEV) {
      // Production with no fetcher would mean a misconfigured backend. Refusing
      // is correct: better a locked region than silently serving paid content.
      throw new PremiumDeniedError('Contenido no disponible sin sesion');
    }
    const full = await import('../data/fullContent');
    return {
      region,
      muscles: full.ALL_MUSCLES_BY_REGION[region] ?? [],
      romLookupMuscles:
        full.ALL_ROM_LOOKUP_BY_REGION[region] ?? full.ALL_MUSCLES_BY_REGION[region] ?? [],
      content: full.ALL_MUSCLE_CONTENT_BY_REGION[region] ?? {},
      rom: full.ALL_ROM_BY_REGION[region] ?? [],
      track: full.ALL_TRACK_BY_REGION[region] ?? null,
      tests: full.ALL_TESTS_BY_REGION[region] ?? [],
      cases: full.ALL_CASES_BY_REGION[region] ?? [],
      pathologies: full.ALL_PATHOLOGIES_BY_REGION[region] ?? [],
    };
  }

  return fetcher(region);
}
