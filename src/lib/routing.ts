// src/lib/routing.ts
//
// URL <-> app state, without a router dependency.
//
// WHY THIS EXISTS: everything used to live in React state on a single URL, so
// there was no way to link to anything. A physio could not send a colleague
// "look at the shoulder movement lab", the app could not rank for "test de
// Hawkins" in any market, and a reload always dropped you back on the shoulder
// in Explorar. That is a growth channel and a usability floor, not a nicety.
//
// SHAPE: /<region>/<mode>, with Spanish slugs, e.g.
//   /hombro/movimiento     /rodilla/explorar     /fundamentos/aprender
//
// The slugs are DELIBERATELY not the internal ids: ids are ASCII code
// identifiers ('shoulder', 'thoracic'), while the URL is user-facing copy and
// belongs to the market it serves. That split is also what makes a future
// /en/shoulder/movement a matter of adding a second slug table rather than
// renaming every region in the store.
//
// Deep links survive a hard reload: vercel.json rewrites any extension-less path
// to /index.html, and the PWA's navigateFallback does the same offline.

import type { AppMode } from '../components/TopBar';

/** Internal region id -> URL slug. Keys match store.region / regiones.ts. */
const REGION_SLUGS: Record<string, string> = {
  fundamentos: 'fundamentos',
  shoulder: 'hombro',
  elbow: 'codo',
  cervical: 'cervical',
  thoracic: 'toracica',
  lumbar: 'lumbar',
  hip: 'cadera',
  knee: 'rodilla',
  ankle: 'tobillo',
};

/** Internal mode -> URL slug. */
const MODE_SLUGS: Record<AppMode, string> = {
  explore: 'explorar',
  learn: 'aprender',
  study: 'estudiar',
  movement: 'movimiento',
};

/** Reverse lookups, built once. */
const REGION_BY_SLUG = new Map(
  Object.entries(REGION_SLUGS).map(([id, slug]) => [slug, id]),
);
const MODE_BY_SLUG = new Map(
  Object.entries(MODE_SLUGS).map(([id, slug]) => [slug, id as AppMode]),
);

export const DEFAULT_REGION = 'shoulder';
export const DEFAULT_MODE: AppMode = 'explore';

export interface AppRoute {
  region: string;
  mode: AppMode;
}

/** The canonical path for a region + mode. */
export function formatRoute({ region, mode }: AppRoute): string {
  const r = REGION_SLUGS[region] ?? REGION_SLUGS[DEFAULT_REGION];
  const m = MODE_SLUGS[mode] ?? MODE_SLUGS[DEFAULT_MODE];
  return `/${r}/${m}`;
}

/**
 * Parse a pathname into a route. Returns null when the path names no region we
 * know — the caller then leaves the app on its current state instead of
 * bouncing the user somewhere arbitrary, so an unrelated path (a marketing
 * page, a stale bookmark) never hijacks navigation.
 *
 * A known region with a missing/unknown mode resolves to the default mode, so
 * the short link /hombro works and lands on Explorar.
 */
export function parseRoute(pathname: string): AppRoute | null {
  const parts = pathname.split('/').filter(Boolean).map((p) => p.toLowerCase());
  if (parts.length === 0) return null;

  const region = REGION_BY_SLUG.get(parts[0]);
  if (!region) return null;

  const mode = parts[1] ? MODE_BY_SLUG.get(parts[1]) : undefined;
  return { region, mode: mode ?? DEFAULT_MODE };
}

/** The route the current browser location describes, if any. */
export function readRoute(): AppRoute | null {
  if (typeof window === 'undefined') return null;
  return parseRoute(window.location.pathname);
}

/**
 * Write a route to the address bar.
 *
 * `replace` is for the initial normalization (landing on `/` and settling into
 * `/hombro/explorar`), which must NOT create a history entry — otherwise the
 * user's first Back press just re-runs the redirect and they can never leave.
 * Every later region/mode change pushes, so Back walks the path they took.
 *
 * Preserves the query string: Stripe returns to `/?checkout=success` and
 * AuthContext reads that param before stripping it.
 */
export function writeRoute(route: AppRoute, { replace = false } = {}): void {
  if (typeof window === 'undefined') return;
  const path = formatRoute(route);
  const url = path + window.location.search + window.location.hash;
  if (window.location.pathname === path) return;
  if (replace) window.history.replaceState({}, '', url);
  else window.history.pushState({}, '', url);
}

/**
 * True when the address names something this app does not serve: a stale
 * bookmark, a typo, a link to a page that never existed. The root and any known
 * region are NOT unknown — `/hombro` alone is a valid short link.
 *
 * parseRoute already tolerates an unknown MODE (it falls back to Explorar), so
 * only an unrecognised first segment lands here. The app corrects the address
 * silently, which leaves a visitor on a page they did not ask for with no idea
 * why; RouteNotice uses this to tell them, and to offer somewhere to go.
 */
export function isUnknownPath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return false;
  return !REGION_BY_SLUG.has(parts[0].toLowerCase());
}

/** Region id + URL slug pairs, for orientation UI. Ordered as declared above. */
export function regionSlugs(): { id: string; slug: string }[] {
  return Object.entries(REGION_SLUGS).map(([id, slug]) => ({ id, slug }));
}

/** Every region slug, for sitemaps and prerender lists. */
export function allRoutes(): string[] {
  const out: string[] = [];
  for (const region of Object.keys(REGION_SLUGS)) {
    for (const mode of Object.keys(MODE_SLUGS) as AppMode[]) {
      out.push(formatRoute({ region, mode }));
    }
  }
  return out;
}
