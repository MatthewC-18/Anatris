// src/hooks/useMuscleResolution.ts
//
// Builds the mesh-name -> clinical-muscle maps used for picking, hovering and
// highlighting in 3D. The resolver only needs mesh NAMES (from index.entries),
// so it does not depend on the Three.js scene being loaded.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE READS FROM THE PREMIUM STORE INSTEAD OF IMPORTING REGIONS
// ---------------------------------------------------------------------------
// It used to `import { kneeMuscles }`, `{ elbowMuscles }` and the three spine
// lists directly, so it could build one map covering every region up front.
// That quietly re-opened the content leak the entitlement work closed: those
// imports are static, so origin, insertion, innervation, actions and the
// clinical note of five PAID regions were compiled into the entry chunk that
// every anonymous visitor downloads. Verified on the deployed bundle: the
// records for quadratus lumborum and semimembranosus were both in there.
//
// It slipped past the two guards because it broke neither of their rules — it
// does not import `fullContent`, and it does not add a premium region to a
// runtime registry. It reached around both by importing the region data files
// themselves. `premiumContent.test.ts` now also forbids that.
//
// So the map is composed the same way everything else is: the FREE tier is
// bundled, and each premium region's muscles join once that region has been
// fetched behind the entitlement check. A region the user has not unlocked
// simply is not resolvable — which is correct, since its meshes are not shown.

import { useMemo, useSyncExternalStore } from 'react';
import {
  buildMuscleResolution,
  type MuscleResolution,
} from '../lib/muscleResolver';
import { shoulderMuscles } from '../data/muscles/shoulder';
import {
  allLoadedPremiumMuscles,
  premiumVersion,
  subscribePremium,
} from '../data/premiumStore';
import type { AnatomyIndex } from '../types/anatomy';
import type { Muscle } from '../types/muscle';

/**
 * SHARED-ID RULE: some muscle ids legitimately exist in more than one region
 * with overlapping bases (e.g. biceps-brachii / triceps-brachii are shared by
 * the shoulder and the elbow). Keep only ONE record per id so the resolver
 * returns a single stable Muscle object regardless of the active region. The
 * FREE tier wins ties: its records are always present, so resolution stays
 * stable whether or not a premium region happens to be loaded.
 */
function dedupeById(lists: Muscle[][]): Muscle[] {
  const seen = new Set<string>();
  const out: Muscle[] = [];
  for (const list of lists) {
    for (const m of list) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
    }
  }
  return out;
}

/**
 * EL UNIVERSO DE MUSCULOS RESOLUBLES: el nivel gratuito, que va en el paquete,
 * mas cada region premium que ya se haya descargado tras el control de acceso.
 *
 * Se publica aparte porque el laboratorio de movimiento lo necesita igual y
 * tenia su propia copia: `Object.values(MUSCLES_BY_REGION).flat()`, calculada
 * UNA VEZ al cargar el modulo y sobre el registro ESTATICO, que desde la
 * division premium solo contiene el hombro. Medido en la app: 18 musculos, y
 * los 13 de la rodilla fuera. Consecuencia en pantalla: en el laboratorio de
 * rodilla, cadera, tobillo, codo y raquis el panel anunciaba "Motor principal
 * / Vasto lateral 92%" y NO SE ENCENDIA NINGUN MUSCULO, porque el resolutor no
 * tenia ese id. Sin error y sin aviso: el aviso de RigOverlays solo salta
 * cuando el mapa queda VACIO, y con el hombro dentro nunca lo estaba.
 */
export function useAllMuscles(): Muscle[] {
  const version = useSyncExternalStore(subscribePremium, premiumVersion, premiumVersion);
  return useMemo(
    () => dedupeById([shoulderMuscles, allLoadedPremiumMuscles()]),
    // `version` es la clave de cache, no un dato.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
}

const EMPTY: MuscleResolution = {
  muscleByMeshName: new Map(),
  meshNamesByMuscleId: new Map(),
  partsByMuscleId: new Map(),
};

export function useMuscleResolution(
  index: AnatomyIndex | null,
): MuscleResolution {
  // Re-derive when a premium region is installed or cleared: the set of loaded
  // regions is not otherwise observable to a memo, so without this the map
  // would stay frozen at whatever was loaded on first render and a region
  // opened later would resolve to nothing.
  const muscles = useAllMuscles();

  return useMemo(() => {
    if (!index) return EMPTY;
    const meshNames = index.entries.map((e) => e.meshName);
    return buildMuscleResolution(muscles, meshNames);
  }, [index, muscles]);
}
