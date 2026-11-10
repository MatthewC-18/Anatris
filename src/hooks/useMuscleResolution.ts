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
 * EL SUELO: las fichas que SIEMPRE tienen que resolver, abra el usuario la
 * region que abra.
 *
 * ---------------------------------------------------------------------------
 * EL DEFECTO QUE CIERRA
 * ---------------------------------------------------------------------------
 * El universo de abajo es "hombro gratuito + payload de LA REGION ABIERTA", y
 * una pantalla puede nombrar un musculo de otra region. Pasa en UN sitio
 * medido: los demos de miotoma del panel Neuro, que son los mismos para toda
 * una extremidad. C6 nombra el braquiorradial (ficha del codo), L2 el psoas y
 * el iliaco (cadera), L3 el cuadriceps (rodilla) y L4 y S1 el tibial anterior,
 * el gastrocnemio y el soleo (tobillo). Asi que el play se pulsaba, la
 * articulacion se movia y NO SE ENCENDIA NADA.
 *
 * Medido reconstruyendo este mismo universo contra las 942 mallas vivas de capa
 * muscular del GLB: 24 de las 48 acreditaciones de miotoma no encendian ni una
 * malla. Por region (mudas/totales): lumbar 7/9, tobillo 6/9, cadera 6/9,
 * rodilla 3/9, cervical 1/4 y hombro 1/4; codo 0/4 y toracica sin panel Neuro.
 * `npm run audit-glow` lo vigila region por region y en los dos lados.
 *
 * Son 1.276 bytes para las diez fichas prestadas que hay HOY. La lista cambia
 * cuando cambian los demos: si una raiz nombra una ficha que no esta aqui, la
 * prueba falla y dice cual.
 *
 * ---------------------------------------------------------------------------
 * POR QUE AQUI Y NO SOLO EN EL PAYLOAD
 * ---------------------------------------------------------------------------
 * El payload de cada region premium ya carga lo que esa region necesita
 * (scripts/build-premium-content.mts lo compone en `romLookupMuscles`), pero
 * eso no alcanza al HOMBRO: es region gratuita, no tiene payload que cargar, y
 * su panel Neuro nombra igual el braquiorradial. Sin este suelo esa raiz se
 * queda muda para siempre.
 *
 * ---------------------------------------------------------------------------
 * Y POR QUE NO ROMPE EL MURO DE PAGO
 * ---------------------------------------------------------------------------
 * Aqui va SOLO lo que hace falta para encontrar la malla y rotularla: id,
 * nombre, latino y bases de malla. Lo que se paga --origen, insercion,
 * inervacion, raices, acciones y la nota clinica-- se deja VACIO a proposito:
 * si la region esta descargada, su ficha completa llega antes que esta y gana
 * (el orden de `dedupeById` lo garantiza). Las bases de malla, ademas, son
 * nombres del GLB, que se sirve publico desde /public.
 *
 * La lista no se inventa: `muscleUniverseByRegion.test.ts` falla si falta una
 * ficha que un demo nombre, si un nombre, un latino o unas bases se desvian de
 * la ficha de verdad, o si alguna entrada se trae contenido de pago. Una
 * entrada que deje de hacer falta no rompe nada, asi que no se exige minimal.
 */
function sinFichaDePago(
  id: string,
  name: string,
  latin: string,
  meshBases: string[],
): Muscle {
  return {
    id,
    name,
    latin,
    meshBases,
    layer: 'muscles',
    groups: [],
    // Vacios A PROPOSITO: son el contenido de pago. Ningun panel los lee desde
    // este universo (solo se usa para resolver mallas y para el titulo de la
    // tarjeta de diseccion), y la ficha completa los trae cuando la region se
    // descarga.
    origin: '',
    insertion: '',
    innervation: '',
    roots: [],
    actions: [],
  };
}

export const MINIMO_RESOLUBLE: Muscle[] = [
  sinFichaDePago('brachioradialis', 'Braquiorradial', 'Musculus brachioradialis', [
    'Brachioradialis_muscle',
  ]),
  sinFichaDePago('gastrocnemius', 'Gastrocnemio', 'Musculus gastrocnemius', [
    'Medial_head_of_gastrocnemius',
    'Medial_head_of_gastrocnemiuso',
    'Lateral_head_of_gastrocnemius',
    'Lateral_head_of_gastrocnemiuso',
  ]),
  sinFichaDePago('iliacus', 'Ilíaco', 'Musculus iliacus', [
    'Iliacus_muscle',
    'Iliopsoas_muscle',
  ]),
  sinFichaDePago('psoas-major', 'Psoas mayor', 'Musculus psoas major', [
    'Psoas_major',
    'Psoas_major_1',
  ]),
  sinFichaDePago('rectus-femoris', 'Recto femoral', 'Musculus rectus femoris', [
    'Rectus_femoris_muscle',
  ]),
  sinFichaDePago('soleus', 'Sóleo', 'Musculus soleus', ['Soleus_muscle']),
  sinFichaDePago('tibialis-anterior', 'Tibial anterior', 'Musculus tibialis anterior', [
    'Tibialis_anterior_muscle',
  ]),
  sinFichaDePago('vastus-intermedius', 'Vasto intermedio', 'Musculus vastus intermedius', [
    'Vastus_intermedius_muscle',
  ]),
  sinFichaDePago('vastus-lateralis', 'Vasto lateral', 'Musculus vastus lateralis', [
    'Vastus_lateralis_muscle',
  ]),
  sinFichaDePago('vastus-medialis', 'Vasto medial', 'Musculus vastus medialis', [
    'Vastus_medialis_muscle',
  ]),
];

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
 *
 * Y EL SUELO AL FINAL, nunca antes: `MINIMO_RESOLUBLE` solo lleva nombre y
 * bases de malla, asi que tiene que perder contra la ficha completa de la
 * region cuando esa region esta descargada. `dedupeById` se queda con la
 * PRIMERA de cada id, de modo que el orden de esta lista es el contrato.
 */
export function useAllMuscles(): Muscle[] {
  const version = useSyncExternalStore(subscribePremium, premiumVersion, premiumVersion);
  return useMemo(
    () => dedupeById([shoulderMuscles, allLoadedPremiumMuscles(), MINIMO_RESOLUBLE]),
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
