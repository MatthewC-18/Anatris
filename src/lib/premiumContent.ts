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
//
// FAILURES ARE NAMED, NOT SWALLOWED. Every non-entitlement failure used to
// collapse into a bare `'error'`, which painted one red card for four very
// different causes — the function not deployed, the function 500-ing, the
// browser offline, or a malformed payload — and left nothing in the console to
// tell them apart. Since the free region (shoulder) is bundled and every paid
// region goes through here, "only the shoulder loads" is the symptom of ALL of
// them, so the cause has to travel with the state.

import {
  installPremiumRegion,
  isPremiumRegionLoaded,
  type PremiumRegionPayload,
} from '../data/premiumStore';

/** How a load ended. `denied` = signed in but no live subscription. */
export type PremiumLoadState = 'idle' | 'loading' | 'ready' | 'denied' | 'error';

/**
 * The outcome of a load. `reason` is set only for `'error'` and is short
 * developer-facing Spanish, shown in the failure card the same way IndexError
 * shows the anatomy index's error — this app's owner is also its developer, and
 * "no cargó" without a cause is a dead end.
 */
export interface PremiumLoadOutcome {
  state: PremiumLoadState;
  reason?: string;
}

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
 * Thrown by a fetcher when the content endpoint failed for a reason that is NOT
 * "you have not paid": not deployed, 5xx, unreachable. `status` is the HTTP
 * status when there was a response at all, and undefined for a transport
 * failure (offline, DNS, CORS) — that difference is the first thing to know
 * when the paid regions stop loading, so it is carried explicitly.
 */
export class PremiumContentError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'PremiumContentError';
    this.status = status;
  }
}

/**
 * In-flight requests, so a region that is already being fetched is never
 * requested twice — React strict mode double-invokes effects, and switching
 * region quickly would otherwise fire duplicate paid requests.
 */
const inFlight = new Map<string, Promise<PremiumLoadOutcome>>();

/**
 * Ensure a premium region's content is installed. Idempotent and safe to call
 * on every render: returns immediately once the region is loaded.
 */
export function ensurePremiumRegion(
  region: string,
  fetcher: PremiumFetcher | null,
): Promise<PremiumLoadOutcome> {
  if (isPremiumRegionLoaded(region)) return Promise.resolve({ state: 'ready' });

  const existing = inFlight.get(region);
  if (existing) return existing;

  const run = (async (): Promise<PremiumLoadOutcome> => {
    try {
      const payload = await loadPayload(region, fetcher);
      // A 200 with the wrong body is the worst outcome available: installing it
      // would report 'ready' and mount the workspace over empty registries, so
      // the region would render as "this region has no content" instead of as a
      // failure. Refuse it and say why.
      if (!isRegionPayload(region, payload)) {
        throw new PremiumContentError(
          `El servidor devolvio un contenido invalido para "${region}"`,
        );
      }
      installPremiumRegion(payload);
      return { state: 'ready' };
    } catch (err) {
      if (err instanceof PremiumDeniedError) return { state: 'denied' };
      const reason = describeFailure(err);
      // The card shows a one-line cause; the console keeps the whole error for
      // whoever opens devtools.
      // eslint-disable-next-line no-console
      console.error(`[Anatris] No se pudo cargar la region "${region}":`, err);
      return { state: 'error', reason };
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
      // Production with no fetcher means the build has no Supabase configured
      // (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing), so it fell back to
      // the mock backend and there is no endpoint to ask. Refusing is correct —
      // better a locked region than silently serving paid content — but this is
      // a MISCONFIGURED DEPLOY, not a user without a plan, so it must not be
      // reported as "denied" and hidden behind the paywall.
      throw new PremiumContentError(
        'Esta build no tiene Supabase configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), asi que no hay servidor de contenido al que pedir la region',
      );
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

/**
 * Structural check on what came back. Deliberately shallow: it verifies the
 * payload is for the region we asked for and that every registry the synchronous
 * accessors read is present, which is exactly what App's 'ready' promises.
 */
function isRegionPayload(region: string, value: unknown): value is PremiumRegionPayload {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Partial<PremiumRegionPayload>;
  return (
    p.region === region &&
    Array.isArray(p.muscles) &&
    Array.isArray(p.romLookupMuscles) &&
    Array.isArray(p.rom) &&
    Array.isArray(p.tests) &&
    Array.isArray(p.cases) &&
    Array.isArray(p.pathologies) &&
    typeof p.content === 'object' &&
    p.content !== null
  );
}

/** One short line naming the cause, for the failure card. */
function describeFailure(err: unknown): string {
  if (err instanceof PremiumContentError) {
    return err.status != null ? `${err.message} (HTTP ${err.status})` : err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Error desconocido';
}
