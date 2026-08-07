// src/data/romByRegion.ts
//
// FREE content is bundled; PREMIUM content arrives at runtime from the
// entitlement-checked `content` edge function (see data/premiumStore.ts). The
// accessors below stay SYNCHRONOUS — App does not render a premium region until
// its payload is installed — so the ~30 call sites are unchanged.

import type { RomMovement } from '../types/rom';
import { SHOULDER_ROM_LIST } from './shoulderRom';
import { allLoadedPremiumRom, premiumRom } from './premiumStore';

/**
 * The FREE regions' ROM, statically bundled.
 *
 * Do NOT add a premium region here: it would put the paid clinical library back
 * into the public bundle. `fullContent.test.ts` guards the app against
 * importing the full registry, but this object is the other half of that
 * discipline and has to be kept honest by hand.
 */
export const ROM_BY_REGION: Record<string, RomMovement[]> = {
  shoulder: SHOULDER_ROM_LIST,
};

export function romForRegion(region: string | null): RomMovement[] {
  if (!region) return SHOULDER_ROM_LIST;
  return ROM_BY_REGION[region] ?? premiumRom(region) ?? SHOULDER_ROM_LIST;
}

/**
 * Find a movement by its id across every region (movement ids are unique).
 * Searches the bundled free regions plus whatever premium regions the current
 * session has loaded — an unloaded region's movements are simply not findable,
 * which is the intended behaviour for someone without a subscription.
 */
export function movementById(id: string | null | undefined): RomMovement | undefined {
  if (!id) return undefined;
  for (const list of Object.values(ROM_BY_REGION)) {
    const hit = list.find((m) => m.id === id);
    if (hit) return hit;
  }
  return allLoadedPremiumRom().find((m) => m.id === id);
}
