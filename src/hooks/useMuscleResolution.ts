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
import type { AnatomyIndex } from '../types/anatomy';
import type { Muscle } from '../types/muscle';

// All clinical muscles known to the app. As more regions are added, import and
// spread them here (e.g. [...shoulderMuscles, ...elbowMuscles]).
const ALL_MUSCLES: Muscle[] = [...shoulderMuscles];

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
