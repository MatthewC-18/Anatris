// Routing is the one place where a typo silently degrades to "user lands on the
// shoulder", which looks like it works. These lock the contract down.

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MODE,
  allRoutes,
  formatRoute,
  isUnknownPath,
  parseRoute,
  regionSlugs,
} from '../routing';
import { REGIONS } from '../../data/regiones';

describe('routing', () => {
  it('round-trips every region and mode', () => {
    for (const path of allRoutes()) {
      const parsed = parseRoute(path);
      expect(parsed, `no parsea ${path}`).not.toBeNull();
      expect(formatRoute(parsed!)).toBe(path);
    }
  });

  it('covers every anatomical region in regiones.ts', () => {
    // A region added to the atlas without a slug would fall back to the
    // shoulder's URL, so two regions would share one link.
    const slugs = new Set(allRoutes().map((p) => p.split('/')[1]));
    for (const id of Object.keys(REGIONS)) {
      const path = formatRoute({ region: id, mode: 'explore' });
      expect(parseRoute(path)?.region, `${id} no tiene slug propio`).toBe(id);
      expect(slugs.has(path.split('/')[1])).toBe(true);
    }
  });

  it('accepts a region-only short link and defaults the mode', () => {
    expect(parseRoute('/hombro')).toEqual({ region: 'shoulder', mode: DEFAULT_MODE });
    expect(parseRoute('/rodilla/')).toEqual({ region: 'knee', mode: DEFAULT_MODE });
  });

  it('is case-insensitive and tolerates an unknown mode', () => {
    expect(parseRoute('/Hombro/MOVIMIENTO')?.mode).toBe('movement');
    expect(parseRoute('/hombro/inventado')?.mode).toBe(DEFAULT_MODE);
  });

  it('returns null for paths that name no region, so navigation is not hijacked', () => {
    expect(parseRoute('/')).toBeNull();
    expect(parseRoute('/precios')).toBeNull();
    expect(parseRoute('/en/shoulder')).toBeNull();
  });

  it('uses Spanish slugs, not the internal ids', () => {
    expect(formatRoute({ region: 'shoulder', mode: 'movement' })).toBe('/hombro/movimiento');
    expect(formatRoute({ region: 'thoracic', mode: 'study' })).toBe('/toracica/estudiar');
    expect(formatRoute({ region: 'ankle', mode: 'learn' })).toBe('/tobillo/aprender');
  });

  // RouteNotice only appears when this says so, so a false positive would nag
  // every visitor on a perfectly good link, and a false negative would leave
  // someone stranded with no explanation.
  it('flags only addresses we do not serve', () => {
    expect(isUnknownPath('/precios')).toBe(true);
    expect(isUnknownPath('/en/shoulder')).toBe(true);
    expect(isUnknownPath('/hombros')).toBe(true); // near miss, still unknown
    expect(isUnknownPath('/')).toBe(false); // the root is the landing, not a 404
    expect(isUnknownPath('/hombro')).toBe(false); // short link
    expect(isUnknownPath('/HOMBRO/Movimiento')).toBe(false);
    for (const path of allRoutes()) expect(isUnknownPath(path), path).toBe(false);
  });

  it('offers every routable region in the orientation directory', () => {
    const slugs = regionSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    for (const { id, slug } of slugs) {
      expect(formatRoute({ region: id, mode: DEFAULT_MODE }).startsWith(`/${slug}/`), id).toBe(true);
    }
  });
});
