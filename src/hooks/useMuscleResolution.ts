// src/hooks/useMuscleResolution.ts
//
// Builds the muscle resolution maps once, from the loaded anatomy index and the
// clinical muscle data. Memoized on the index so it only recomputes when the
// index changes. The resolver only needs mesh NAMES (from index.entries), so it
// doesn't depend on the Three.js scene being loaded.
import { useMemo } from 'react';
import {
  buildMuscleResolution,
  type MuscleResolution,
} from '../lib/muscleResolver';
import { shoulderMuscles } from '../data/muscles/shoulder';
import { elbowMuscles } from '../data/muscles/elbow';
import {
  cervicalMuscles,
  thoracicMuscles,
  lumbarMuscles,
} from '../data/muscles/spine';
import { kneeMuscles } from '../data/muscles/knee';
import type { AnatomyIndex } from '../types/anatomy';
import type { Muscle } from '../types/muscle';

// All clinical muscles known to the app. As more regions are added, import and
// spread them here. Resolution is by meshBases (parseMeshName base).
//
// SHARED-ID RULE: some muscle ids legitimately exist in more than one region
// with overlapping bases (e.g. biceps-brachii / triceps-brachii are shared by
// the shoulder and elbow). When that happens we keep only ONE record per id so
// the resolver returns a single stable Muscle object regardless of the active
// region. We do this by filtering each later region down to the ids not yet
// present in the accumulated set. The shoulder records already cover every head
// the elbow needs to highlight, so nothing is lost for the elbow view.
//
// Knee ids are all unique (verified: no collision with shoulder/elbow/spine),
// so the filter is a no-op for the knee in practice, but we keep the same
// defensive pattern so a future shared id can't silently duplicate.

/** Ids already covered by the regions accumulated so far. */
function idsOf(muscles: Muscle[]): Set<string> {
  return new Set(muscles.map((m) => m.id));
}

/** Keep only the muscles whose id is not already present. */
function onlyNew(muscles: Muscle[], have: Set<string>): Muscle[] {
  return muscles.filter((m) => !have.has(m.id));
}

// Build the combined list region by region, each time excluding ids already
// taken by an earlier region (shoulder wins shared arm muscles, etc.).
const SHOULDER = shoulderMuscles;
const ELBOW_ONLY = onlyNew(elbowMuscles, idsOf(SHOULDER));

const SPINE_ALL: Muscle[] = [
  ...cervicalMuscles,
  ...thoracicMuscles,
  ...lumbarMuscles,
];
const accAfterElbow = idsOf([...SHOULDER, ...ELBOW_ONLY]);
const SPINE_ONLY = onlyNew(SPINE_ALL, accAfterElbow);

const accAfterSpine = idsOf([...SHOULDER, ...ELBOW_ONLY, ...SPINE_ONLY]);
const KNEE_ONLY = onlyNew(kneeMuscles, accAfterSpine);

const ALL_MUSCLES: Muscle[] = [
  ...SHOULDER,
  ...ELBOW_ONLY,
  ...SPINE_ONLY,
  ...KNEE_ONLY,
];

const EMPTY: MuscleResolution = {
  muscleByMeshName: new Map(),
  meshNamesByMuscleId: new Map(),
  partsByMuscleId: new Map(),
};

export function useMuscleResolution(
  index: AnatomyIndex | null,
): MuscleResolution {
  return useMemo(() => {
    if (!index) return EMPTY;
    const meshNames = index.entries.map((e) => e.meshName);
    return buildMuscleResolution(ALL_MUSCLES, meshNames);
  }, [index]);
}
