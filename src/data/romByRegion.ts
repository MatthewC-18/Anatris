// src/data/romByRegion.ts
//
// Central registry mapping a region id (store.region) to that region's ROM
// movement list. RomPanel looks the active region up here instead of importing
// a single region's data directly.
//
// Adding a new region = import its *_ROM_LIST and add one entry.

import type { RomMovement } from '../types/rom';
import { SHOULDER_ROM_LIST } from './shoulderRom';
import { ELBOW_ROM_LIST } from './elbowRom';
import { KNEE_ROM_LIST } from './kneeRom';

/** region id -> ROM movements. Keys match regiones.ts / store.region. */
export const ROM_BY_REGION: Record<string, RomMovement[]> = {
  shoulder: SHOULDER_ROM_LIST,
  elbow: ELBOW_ROM_LIST,
  knee: KNEE_ROM_LIST,
};

/**
 * Resolve the ROM movement list for the active region. Falls back to the
 * shoulder list when no region is set, preserving the previous default.
 *
 * @param region the store's current region id (null = whole body)
 */
export function romForRegion(region: string | null): RomMovement[] {
  if (region && ROM_BY_REGION[region]) {
    return ROM_BY_REGION[region];
  }
  return SHOULDER_ROM_LIST;
}
