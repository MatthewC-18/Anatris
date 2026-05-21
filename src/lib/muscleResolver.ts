// src/lib/muscleResolver.ts
//
// The bridge between clinical muscle data and the 3D scene. Given the list of
// Muscle records (with their meshBases), it builds fast lookup maps:
//
//   muscleByMeshName : runtime mesh name  -> Muscle      (for click selection)
//   meshesByMuscleId : muscle id          -> mesh names  (for highlighting)
//   partsByMuscleId  : muscle id          -> parts breakdown by side
//
// It resolves these by parsing every runtime mesh name and matching its base
// against each muscle's meshBases. This sidesteps the duplicate-name problem:
// we never rely on a mesh name being unique, we group by parsed base + side.

import { parseMeshName, type MusclePart, type ParsedSide } from './parseMeshName';
import type { Muscle } from '../types/muscle';

/** One resolved mesh: its runtime name plus what we decoded about it. */
export interface ResolvedMeshPart {
  meshName: string;
  part: MusclePart;
  side: ParsedSide;
  partIndex: number | null;
}

export interface MuscleResolution {
  /** Click a mesh -> which muscle it belongs to. */
  muscleByMeshName: Map<string, Muscle>;
  /** Muscle id -> every runtime mesh name that belongs to it. */
  meshNamesByMuscleId: Map<string, string[]>;
  /** Muscle id -> structured parts (for "highlight only the origin", etc.). */
  partsByMuscleId: Map<string, ResolvedMeshPart[]>;
}

/**
 * Build the resolution maps from the clinical muscle list and the set of mesh
 * names actually present in the scene.
 *
 * @param muscles   clinical Muscle records (e.g. shoulderMuscles)
 * @param meshNames every THREE.Mesh.name in the loaded scene
 */
export function buildMuscleResolution(
  muscles: Muscle[],
  meshNames: Iterable<string>,
): MuscleResolution {
  // Index muscles by each of their (lowercased) mesh bases for O(1) matching.
  const muscleByBase = new Map<string, Muscle>();
  for (const muscle of muscles) {
    for (const base of muscle.meshBases) {
      muscleByBase.set(base.toLowerCase(), muscle);
    }
  }

  const muscleByMeshName = new Map<string, Muscle>();
  const meshNamesByMuscleId = new Map<string, string[]>();
  const partsByMuscleId = new Map<string, ResolvedMeshPart[]>();

  for (const meshName of meshNames) {
    const parsed = parseMeshName(meshName);
    const muscle = muscleByBase.get(parsed.base.toLowerCase());
    if (!muscle) continue;

    muscleByMeshName.set(meshName, muscle);

    const names = meshNamesByMuscleId.get(muscle.id) ?? [];
    names.push(meshName);
    meshNamesByMuscleId.set(muscle.id, names);

    const parts = partsByMuscleId.get(muscle.id) ?? [];
    parts.push({
      meshName,
      part: parsed.part,
      side: parsed.side,
      partIndex: parsed.partIndex,
    });
    partsByMuscleId.set(muscle.id, parts);
  }

  return { muscleByMeshName, meshNamesByMuscleId, partsByMuscleId };
}

/**
 * Filter a muscle's resolved parts down to one side. 'center' parts (bellies
 * that weren't lateralized in the model) are always included, since they
 * belong to both sides visually.
 */
export function partsForSide(
  parts: ResolvedMeshPart[],
  side: 'left' | 'right',
): ResolvedMeshPart[] {
  return parts.filter((p) => p.side === side || p.side === 'center');
}
