// src/data/romByRegion.ts

import type { RomMovement } from '../types/rom';
import { SHOULDER_ROM_LIST } from './shoulderRom';
import { ELBOW_ROM_LIST } from './elbowRom';
import { KNEE_ROM_LIST } from './kneeRom';
import { THORACIC_ROM_LIST } from './thoracicRom';
import { CERVICAL_ROM_LIST } from './cervicalRom';
import { LUMBAR_ROM_LIST } from './lumbarRom';

/** region id -> ROM movements. Keys match regiones.ts / store.region. */
export const ROM_BY_REGION: Record<string, RomMovement[]> = {
  shoulder: SHOULDER_ROM_LIST,
  elbow: ELBOW_ROM_LIST,
  knee: KNEE_ROM_LIST,
  thoracic: THORACIC_ROM_LIST,
  cervical: CERVICAL_ROM_LIST,
  lumbar: LUMBAR_ROM_LIST,
};

export function romForRegion(region: string | null): RomMovement[] {
  if (region && ROM_BY_REGION[region]) {
    return ROM_BY_REGION[region];
  }
  return SHOULDER_ROM_LIST;
}

/** Find a movement by its id across every region (movement ids are unique). */
export function movementById(id: string | null | undefined): RomMovement | undefined {
  if (!id) return undefined;
  for (const list of Object.values(ROM_BY_REGION)) {
    const hit = list.find((m) => m.id === id);
    if (hit) return hit;
  }
  return undefined;
}