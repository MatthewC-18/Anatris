// src/data/premiumStore.ts
//
// Runtime home for the clinical content of PREMIUM regions.
//
// THE PROBLEM THIS SOLVES: every region's clinical library used to be a static
// import, so the whole thing was compiled into JavaScript chunks that Vercel
// serves as public static files. Anyone could fetch them and read the paid
// content without signing up. Splitting the bundle (an earlier pass) fixed the
// DOWNLOAD SIZE but not the leak: the chunks were still there for the asking.
//
// THE SHAPE OF THE FIX: the free tier (shoulder + fundamentos) stays bundled —
// it is meant to be public, and it must work offline and on first paint. Every
// premium region is fetched at runtime from the `content` edge function, which
// checks the caller's subscription before answering, and lands HERE.
//
// WHY A MUTABLE MODULE STORE AND NOT REACT STATE: the registries
// (`romForRegion`, `musclesForRegion`, ...) are called SYNCHRONOUSLY from ~30
// call sites, several of them inside the r3f render loop where a hook cannot go.
// Rewriting all of them to be async would have touched every panel in the app.
// Instead the payload is installed here BEFORE a premium region is allowed to
// render (App gates on `usePremiumRegion`), so by the time any of those call
// sites runs, the data is already in place and they stay synchronous.
//
// This is the same module-pub/sub discipline already used by rigChannel /
// layerChannel / dissectChannel: one writer, many synchronous readers.

import type { Muscle } from '../types/muscle';
import type { MuscleContentIndex } from '../types/muscleContent';
import type { RomMovement } from '../types/rom';
import type { RegionTrack } from '../types/pedagogy';
import type { OrthopedicTest } from '../types/orthopedicTest';
import type { ClinicalCase } from '../types/clinicalCase';
import type { MovementPathology } from './pathologies';

/**
 * One premium region's complete clinical library — exactly what the edge
 * function returns, and what `scripts/build-premium-content.mts` writes.
 *
 * `romLookupMuscles` is stored separately from `muscles` because they differ
 * for the spine: a thoracic rotation recruits the abdominal wall, which is
 * authored in the lumbar sub-region. The composition is resolved at BUILD time
 * so the runtime never needs a sibling region loaded to render this one.
 */
export interface PremiumRegionPayload {
  region: string;
  muscles: Muscle[];
  romLookupMuscles: Muscle[];
  content: MuscleContentIndex;
  rom: RomMovement[];
  track: RegionTrack | null;
  tests: OrthopedicTest[];
  cases: ClinicalCase[];
  pathologies: MovementPathology[];
}

const installed = new Map<string, PremiumRegionPayload>();

/** Make a fetched region's content available to the synchronous registries. */
export function installPremiumRegion(payload: PremiumRegionPayload): void {
  installed.set(payload.region, payload);
}

/** True once this region's content has arrived. */
export function isPremiumRegionLoaded(region: string | null): boolean {
  return region != null && installed.has(region);
}

/**
 * Drop everything. Called on sign-out so a shared machine does not leave the
 * paid library sitting in memory for the next person, and so a lapsed
 * subscription re-fetches (and gets refused) instead of reading a stale copy.
 */
export function clearPremiumRegions(): void {
  installed.clear();
}

/* ---------------------------------------------------------------------------
 * Accessors — one per registry. All return undefined when the region has not
 * been loaded, so each registry can apply its own documented fallback.
 * ------------------------------------------------------------------------ */

export function premiumMuscles(region: string): Muscle[] | undefined {
  return installed.get(region)?.muscles;
}

export function premiumRomLookupMuscles(region: string): Muscle[] | undefined {
  return installed.get(region)?.romLookupMuscles;
}

export function premiumContent(region: string): MuscleContentIndex | undefined {
  return installed.get(region)?.content;
}

export function premiumRom(region: string): RomMovement[] | undefined {
  return installed.get(region)?.rom;
}

export function premiumTrack(region: string): RegionTrack | undefined {
  return installed.get(region)?.track ?? undefined;
}

export function premiumTests(region: string): OrthopedicTest[] | undefined {
  return installed.get(region)?.tests;
}

export function premiumCases(region: string): ClinicalCase[] | undefined {
  return installed.get(region)?.cases;
}

/**
 * Every pathological preset of every LOADED premium region. `pathologyById` and
 * `pathologiesForMovement` are called with a movement/preset id and no region,
 * so they need the union rather than a per-region lookup.
 */
export function premiumPathologies(): MovementPathology[] {
  const out: MovementPathology[] = [];
  for (const p of installed.values()) out.push(...p.pathologies);
  return out;
}

/**
 * Every movement of every LOADED premium region, for the by-id lookup that
 * `movementById` needs (it is called with a movement id and no region).
 */
export function allLoadedPremiumRom(): RomMovement[] {
  const out: RomMovement[] = [];
  for (const p of installed.values()) out.push(...p.rom);
  return out;
}
