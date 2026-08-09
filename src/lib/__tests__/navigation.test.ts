// Tests for the shared navigation map.
//
// This module is small but it is the ONE place that says which modules exist,
// in which order, and what "the next step" means. Three surfaces (the trail, the
// keyboard, the command palette) now take the user somewhere based on its
// answers, so a silent regression here moves people to the wrong place rather
// than throwing.
//
// The cross-checks against regiones.ts and routing.ts are the point of the file:
// the four hand-written copies of the region list that this module replaced
// drifted precisely because nothing compared them.

import { describe, it, expect } from 'vitest';
import {
  MODE_NAV,
  REGION_NAV,
  SPINE_REGION_IDS,
  adjacentRegion,
  modeLabel,
  nextStep,
  regionLabel,
  routeForRegion,
  routeStep,
} from '../navigation';
import { formatRoute, parseRoute } from '../routing';
import { REGIONS } from '../../data/regiones';

describe('REGION_NAV', () => {
  it('covers every region the router can address, and nothing else', () => {
    const nav = REGION_NAV.map((r) => r.id).sort();
    // Every nav id must round-trip through the router...
    for (const id of nav) {
      const path = formatRoute({ region: id, mode: 'explore' });
      expect(parseRoute(path)?.region, `slug for ${id}`).toBe(id);
    }
    // ...and every anatomical region in the atlas must be in the nav, or it is
    // a module nobody can reach.
    for (const id of Object.keys(REGIONS)) {
      expect(nav, `${id} missing from REGION_NAV`).toContain(id);
    }
  });

  it('labels every id (no raw ids leaking into the UI)', () => {
    for (const r of REGION_NAV) {
      expect(regionLabel(r.id)).toBe(r.label);
      expect(regionLabel(r.id)).not.toBe(r.id);
    }
  });

  it('groups the three spine sub-regions as one contiguous run', () => {
    const flags = REGION_NAV.map((r) => Boolean(r.spine));
    const first = flags.indexOf(true);
    const last = flags.lastIndexOf(true);
    expect(SPINE_REGION_IDS).toEqual(['cervical', 'thoracic', 'lumbar']);
    // Contiguous: no non-spine entry between the first and the last.
    expect(flags.slice(first, last + 1).every(Boolean)).toBe(true);
  });
});

describe('adjacentRegion', () => {
  it('steps through the list in order', () => {
    expect(adjacentRegion('shoulder', 1)).toBe('elbow');
    expect(adjacentRegion('shoulder', -1)).toBe('fundamentos');
  });

  it('clamps instead of wrapping', () => {
    const first = REGION_NAV[0].id;
    const last = REGION_NAV[REGION_NAV.length - 1].id;
    expect(adjacentRegion(first, -1)).toBe(first);
    expect(adjacentRegion(last, 1)).toBe(last);
  });

  it('leaves an unknown region alone', () => {
    expect(adjacentRegion('wrist', 1)).toBe('wrist');
  });
});

describe('routes', () => {
  it('gives anatomical regions the four modes, in mode-switcher order', () => {
    expect(routeForRegion(false)).toEqual(['explore', 'learn', 'movement', 'study']);
    expect(MODE_NAV.map((m) => m.id)).toEqual(routeForRegion(false));
  });

  it('gives conceptual modules only the two modes they actually have', () => {
    expect(routeForRegion(true)).toEqual(['learn', 'study']);
  });

  it('numbers the steps from 1', () => {
    const route = routeForRegion(false);
    expect(routeStep(route, 'explore')).toBe(1);
    expect(routeStep(route, 'study')).toBe(4);
    // A mode that is not on this route reports 0, which the trail reads as
    // "draw no line" rather than as step -1.
    expect(routeStep(routeForRegion(true), 'movement')).toBe(0);
  });

  it('labels every mode', () => {
    for (const m of MODE_NAV) expect(modeLabel(m.id)).toBe(m.label);
  });
});

describe('nextStep', () => {
  it('advances through the modes of the current module', () => {
    expect(nextStep('shoulder', 'explore', false)).toMatchObject({
      region: 'shoulder',
      mode: 'learn',
      newRegion: false,
    });
    expect(nextStep('shoulder', 'movement', false)).toMatchObject({
      region: 'shoulder',
      mode: 'study',
    });
  });

  it('rolls into the next module once the route is finished', () => {
    expect(nextStep('shoulder', 'study', false)).toMatchObject({
      region: 'elbow',
      mode: 'explore',
      label: 'Codo',
      newRegion: true,
    });
  });

  it('enters a conceptual next module on a mode that module has', () => {
    // Fundamentos is first, so nothing rolls INTO it today; the guard matters
    // the moment a conceptual module is inserted mid-list.
    const step = nextStep('fundamentos', 'study', true);
    expect(step).toMatchObject({ region: 'shoulder', newRegion: true });
    expect(routeForRegion(false)).toContain(step!.mode);
  });

  it('stops at the end of the last module instead of wrapping', () => {
    const last = REGION_NAV[REGION_NAV.length - 1].id;
    expect(nextStep(last, 'study', false)).toBeNull();
  });

  it('recovers from an off-route mode by pointing at the route start', () => {
    // A concept module renders one frame in `explore` before App forces
    // `learn`; the trail must still offer somewhere to go.
    expect(nextStep('fundamentos', 'explore', true)).toMatchObject({
      region: 'fundamentos',
      mode: 'learn',
    });
  });
});
