// src/data/pathologies.ts
//
// Pathological movement presets: the type, plus the registry.
//
// The preset DATA lives one file per region under `data/pathology/`, because
// FREE content is bundled while PREMIUM content arrives at runtime from the
// entitlement-checked `content` edge function (see data/premiumStore.ts).
// These presets are the product's strongest differentiator, so shipping every
// region's to every visitor was the most valuable part of the old leak.

import type { Citation } from '../types/muscleContent';
import type { ShoulderChainMod } from '../lib/biomech/shoulderChain';

/** A pathological preset for a movement (or set of movements). */
export interface MovementPathology {
  /** Stable id, kebab-case. */
  id: string;
  /** Spanish display name. */
  name: string;
  /** Very short chip label. */
  chip: string;
  /** One-line "what it is". */
  summary: string;
  /** What changes biomechanically vs. normal. */
  mechanism: string;
  /** The clinical payoff — "por que duele aqui". */
  whyItHurts: string;
  /** Muscle ids to emphasize (readout banner). */
  implicated: string[];
  /** Supporting citation(s). */
  cite: Citation[];
  /** Movement ids this preset applies to. */
  appliesTo: string[];
  /** Shoulder scapulohumeral-rhythm alteration (shoulder elevation only). */
  shoulderMod?: ShoulderChainMod;
  /** Cap the reachable MAX angle, degrees (ROM loss). */
  rangeCapDeg?: number;
  /** Raise the reachable MIN angle, degrees (extension lag / contracture). */
  rangeFloorDeg?: number;
}

// ---------------------------------------------------------------------------
// SHOULDER (elevation chain) — see biomech/shoulderChain + data/shoulderRom.
// ---------------------------------------------------------------------------
import { SHOULDER_PATHOLOGIES } from './pathology/shoulder';
import { premiumPathologies } from './premiumStore';

/**
 * The FREE regions' presets, statically bundled.
 *
 * Do NOT add a premium region here — the pathological presets are the product's
 * strongest differentiator and exactly the content the paywall must protect.
 */
export const PATHOLOGIES: MovementPathology[] = [...SHOULDER_PATHOLOGIES];

const BY_ID: Record<string, MovementPathology> = Object.fromEntries(
  PATHOLOGIES.map((p) => [p.id, p]),
);

/** Free presets plus whatever premium regions this session has loaded. */
function available(): MovementPathology[] {
  return [...PATHOLOGIES, ...premiumPathologies()];
}

/** Resolve a pathology by id, or null (null id = Normal). */
export function pathologyById(id: string | null | undefined): MovementPathology | null {
  if (!id) return null;
  return BY_ID[id] ?? available().find((p) => p.id === id) ?? null;
}

/** Presets available for a given movement id (empty = movement has no presets). */
export function pathologiesForMovement(movementId: string | null | undefined): MovementPathology[] {
  if (!movementId) return [];
  return available().filter((p) => p.appliesTo.includes(movementId));
}
