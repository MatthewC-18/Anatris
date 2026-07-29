// src/data/neuro/index.ts
//
// Registry of neuro segment sets by region. The cervical set (C5-T1) serves the
// whole UPPER limb (shoulder/elbow/cervical); the lumbosacral set (L2-S1) serves
// the LOWER limb (knee/lumbar). Thoracic has no limb neuro screen, so it returns
// null and the panel stays hidden there.

import type { NeuroIndex, NeuroSegmentSet } from '../../types/neuro';
import { CERVICAL_NEURO } from './cervical';
import { LUMBOSACRAL_NEURO } from './lumbosacral';

/** region id -> neuro set. Keys match regiones.ts / store.region. */
export const NEURO_BY_REGION: NeuroIndex = {
  cervical: CERVICAL_NEURO,
  shoulder: CERVICAL_NEURO,
  elbow: CERVICAL_NEURO,
  lumbar: LUMBOSACRAL_NEURO,
  hip: LUMBOSACRAL_NEURO,
  knee: LUMBOSACRAL_NEURO,
  ankle: LUMBOSACRAL_NEURO,
};

/** Neuro set for a region, or null when none applies (e.g. thoracic). */
export function neuroForRegion(region: string | null): NeuroSegmentSet | null {
  if (region && NEURO_BY_REGION[region]) return NEURO_BY_REGION[region];
  return null;
}

/** True when a region has an authored neuro screen. */
export function hasNeuro(region: string | null): boolean {
  return neuroForRegion(region) !== null;
}
