// src/lib/navigation.ts
//
// THE MAP OF THE PRODUCT, in one file.
//
// Anatris has 9 modules x 4 modes = 36 places a user can be, and until now each
// surface carried its own private copy of that map: TopBar had MODULES +
// MOBILE_REGIONS + MODE_ITEMS, GuideHub had REGION_LABELS, routing.ts had the
// slug tables, and the movement lab hard-coded a few more. They drifted, as
// duplicated maps always do -- GuideHub's table was missing `hip` and `ankle`,
// so a user who opened the guide from the hip read "Estás en hip".
//
// This module is the single ordered vocabulary: which regions exist, in which
// order, under which label, and which modes exist, in which order. Everything
// that names a place reads it from here.
//
// IT ALSO DEFINES THE ROUTE.
//
// The four modes are not four unrelated tools, they are a sequence: you look at
// the anatomy, you study it phase by phase, you watch it move, and then you test
// yourself on it. Presenting them as a bare tab bar left that order implicit, so
// a new user landed in a 3D scene with 100+ controls and no idea what to do
// second. `routeForRegion` makes the sequence explicit, and the ContextBar draws
// it as a line the user can follow.
//
// ROUTE ORDER IS NOT TOPBAR ORDER BY ACCIDENT: the mode switcher renders in this
// same order (Explorar -> Aprender -> Movimiento -> Estudiar), so the tab strip
// and the progress line always agree. Movimiento moving ahead of Estudiar is
// also deliberate -- it is the product's differentiator and it was sitting last.

import type { AppMode } from '../components/TopBar';

/* ---------------------------------------------------------------------------
 * REGIONS
 * ------------------------------------------------------------------------ */

export interface RegionNavItem {
  /** Store region id (store.region / regiones.ts / routing.ts keys). */
  id: string;
  /** User-facing Spanish label. */
  label: string;
  /**
   * Belongs to the spine group. The three sub-regions are first-class regions
   * in the store, but the wide-monitor nav collapses their run into a single
   * "Columna" entry with a submenu, because that is how a student thinks of it.
   */
  spine?: true;
}

/**
 * Every module, head to toe, in the order the UI walks them. This order is what
 * `adjacentRegion` (and therefore the Shift+arrow shortcut) steps through, so it
 * should stay anatomically sensible rather than alphabetical.
 */
export const REGION_NAV: RegionNavItem[] = [
  { id: 'fundamentos', label: 'Fundamentos' },
  { id: 'shoulder', label: 'Hombro' },
  { id: 'elbow', label: 'Codo' },
  { id: 'cervical', label: 'Cervical', spine: true },
  { id: 'thoracic', label: 'Torácica', spine: true },
  { id: 'lumbar', label: 'Lumbar', spine: true },
  { id: 'hip', label: 'Cadera' },
  { id: 'knee', label: 'Rodilla' },
  { id: 'ankle', label: 'Tobillo' },
];

/** The spine sub-regions, in order, for the "Columna" submenu. */
export const SPINE_REGIONS: RegionNavItem[] = REGION_NAV.filter((r) => r.spine);
export const SPINE_REGION_IDS: string[] = SPINE_REGIONS.map((r) => r.id);

const REGION_LABELS = new Map(REGION_NAV.map((r) => [r.id, r.label]));

/**
 * The label for a region id. Falls back to the id itself so an unmapped module
 * is visibly wrong in review rather than silently blank -- but every id in
 * regiones.ts is mapped above, which is the point of having one table.
 */
export function regionLabel(id: string | null | undefined): string {
  if (!id) return 'Región';
  return REGION_LABELS.get(id) ?? id;
}

/**
 * The region `steps` places away in REGION_NAV order, clamped to the ends.
 *
 * Deliberately NOT wrapping: a keyboard user holding Shift+Right expects to
 * arrive at the last region and stop, not to be teleported back to Fundamentos.
 */
export function adjacentRegion(current: string, steps: number): string {
  const i = REGION_NAV.findIndex((r) => r.id === current);
  if (i === -1) return current;
  const next = Math.min(REGION_NAV.length - 1, Math.max(0, i + steps));
  return REGION_NAV[next].id;
}

/* ---------------------------------------------------------------------------
 * MODES
 * ------------------------------------------------------------------------ */

export interface ModeNavItem {
  id: AppMode;
  label: string;
  /** Three words on what this mode is, for menus and the guide. */
  tagline: string;
  /** What the user gets out of it, used by the "next step" affordance. */
  promise: string;
}

export const MODE_NAV: ModeNavItem[] = [
  {
    id: 'explore',
    label: 'Explorar',
    tagline: 'El modelo 3D',
    promise: 'Mira la anatomía y toca cada estructura',
  },
  {
    id: 'learn',
    label: 'Aprender',
    tagline: 'Track de 7 fases',
    promise: 'Recorre la región fase por fase',
  },
  {
    id: 'movement',
    label: 'Movimiento',
    tagline: 'Laboratorio animado',
    promise: 'Ponla en movimiento y mira quién trabaja',
  },
  {
    id: 'study',
    label: 'Estudiar',
    tagline: 'Repaso activo',
    promise: 'Compruébate con tarjetas y preguntas',
  },
];

const MODE_LABELS = new Map(MODE_NAV.map((m) => [m.id, m.label]));

export function modeLabel(mode: AppMode): string {
  return MODE_LABELS.get(mode) ?? mode;
}

export function modeInfo(mode: AppMode): ModeNavItem {
  return MODE_NAV.find((m) => m.id === mode) ?? MODE_NAV[0];
}

/* ---------------------------------------------------------------------------
 * THE ROUTE
 * ------------------------------------------------------------------------ */

/** Anatomical regions: the full four-step sequence. */
const REGION_ROUTE: AppMode[] = ['explore', 'learn', 'movement', 'study'];

/**
 * Conceptual modules (Fundamentos) have no muscle list and no rig, so Explorar
 * and Movimiento do not exist for them -- App already forces `learn` on entry.
 * Their route is the two steps that are real, so the progress line never counts
 * a step the user cannot take.
 */
const CONCEPT_ROUTE: AppMode[] = ['learn', 'study'];

/**
 * The ordered modes that make up this module's route.
 *
 * `isConcept` is passed in rather than derived here on purpose: resolving it
 * would mean importing the concept registry (and with it the Fundamentos
 * content) into a module that TopBar pulls into the entry chunk. Every caller
 * already has the flag.
 */
export function routeForRegion(isConcept: boolean): AppMode[] {
  return isConcept ? CONCEPT_ROUTE : REGION_ROUTE;
}

/** 1-based position of `mode` in the route, or 0 when it is not part of it. */
export function routeStep(route: AppMode[], mode: AppMode): number {
  return route.indexOf(mode) + 1;
}

/** Where the "Siguiente" affordance sends the user. */
export interface NextStep {
  region: string;
  mode: AppMode;
  /** Short label for the button ("Aprender", "Codo"). */
  label: string;
  /** Why they would want to go ("Recorre la región fase por fase"). */
  promise: string;
  /** True when this step changes module rather than mode. */
  newRegion: boolean;
}

/**
 * The next step on the route: the following mode of this module, or -- once the
 * route is finished -- the first mode of the next module.
 *
 * Rolling on to the next module at the end is what turns four separate routes
 * into one continuous path through the product, and it is also how a free user
 * meets the paywall: as the natural next step after finishing the shoulder,
 * marked with a lock by the caller, rather than as a wall they walked into.
 *
 * Returns null only at the very end of the last module, where there is honestly
 * nothing left to suggest.
 */
export function nextStep(
  regionId: string,
  mode: AppMode,
  isConcept: boolean,
): NextStep | null {
  const route = routeForRegion(isConcept);
  const i = route.indexOf(mode);

  // Off-route (a concept module showing Explorar for one render): send them to
  // the start of the route rather than nowhere.
  if (i === -1) {
    const first = modeInfo(route[0]);
    return {
      region: regionId,
      mode: route[0],
      label: first.label,
      promise: first.promise,
      newRegion: false,
    };
  }

  if (i < route.length - 1) {
    const next = modeInfo(route[i + 1]);
    return {
      region: regionId,
      mode: next.id,
      label: next.label,
      promise: next.promise,
      newRegion: false,
    };
  }

  const following = adjacentRegion(regionId, 1);
  if (following === regionId) return null;
  const followingIsConcept = following === 'fundamentos';
  const entry = routeForRegion(followingIsConcept)[0];
  return {
    region: following,
    mode: entry,
    label: regionLabel(following),
    promise: `Empieza la siguiente región en ${modeLabel(entry)}`,
    newRegion: true,
  };
}
