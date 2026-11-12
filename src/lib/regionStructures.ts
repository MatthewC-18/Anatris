// src/lib/regionStructures.ts
//
// Las estructuras NO musculares de una region (huesos y nervios), con el nombre
// que la aplicacion les da. Es la pieza comun de tres sitios que tienen que
// decir lo mismo: la lista del margen izquierdo (BoneList), la ficha del margen
// derecho (SelectionPanel) y el buscador (CommandPalette).
//
// Antes cada sitio nombraba por su cuenta. La lista decia "Nervio axilar"
// (tabla de lib/boneList.ts) y, al pincharlo, la ficha de al lado titulaba
// "Nervio axillary instance" (el nombre de la malla pasado por el formateador):
// la misma estructura con dos nombres a 600 px uno de otro.
//
// LA LISTA SALIA EN INGLES FUERA DEL HOMBRO. La tabla de nombres de
// lib/boneList.ts cubre la cintura escapular, los huesos largos y el plexo
// braquial; lo que no esta en ella caia a la clave de agrupacion con los
// guiones bajos quitados, o sea al nombre de Z-Anatomy tal cual. Medido con el
// indice real: en el tobillo 22 de los 27 huesos ("Distal phalanx of fifth
// finger of foot", "Fifth metatarsal bone"), y TODOS los nervios de cadera
// (12 de 12: "Femoral nerve", "Nerve to piriformis muscle"), rodilla (9 de 9) y
// tobillo (6 de 6: "Tibial nerve"); en el raquis, las vertebras y los discos
// ("Vertebra c3", "Intervertebral disc c2-c3", con el nivel en minuscula).
// Ese resto pasa ahora por el mismo formateador que nombra las estructuras en
// el resto de la aplicacion (`formatShortName`), a partir del nombre canonico
// de la malla y no de la clave en minusculas, para que "C3" siga siendo "C3".

import { buildBoneList, buildNerveList, type BoneGroup } from './boneList';
import { formatShortName } from './formatName';
import { REGIONS, resolveRegionMeshes } from '../data/regiones';
import type { AnatomyEntry } from '../types/anatomy';

/** Which layer a list shows. Bones by default; 'nerves' for the plexus. */
export type StructureKind = 'bones' | 'nerves';

/**
 * The Spanish name of a structure from its canonical (Z-Anatomy) name.
 *
 * `formatShortName` con UNA cosa mas: quitar el sufijo `_instance_N`. Es un
 * resto de la exportacion del GLB (las mallas instanciadas) y no del nombre
 * anatomico, pero el formateador solo quita la cifra del final, asi que en
 * pantalla salia "Nervio axillary instance" o "Arteria common interosea
 * instance". Medido en el indice: 307 mallas de capas anatomicas lo llevan
 * (193 vasos, 78 nervios, 11 huesos, 10 organos, 9 de piel, 4 musculos y 2
 * ligamentos).
 */
export function atlasDisplayName(canonicalName: string): string {
  return formatShortName(canonicalName.replace(/_instance_\d+$/i, ''));
}

/** What lib/boneList prints when its table has no Spanish name for a key. */
function prettifiedKey(key: string): string {
  const words = key.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The region's structures of one layer, as the rail lists them.
 *
 * @param entries the anatomy index entries (or the values of `byMesh`).
 * @param region  the store's region id; null (whole body) lists nothing, since
 *                every bone in the skeleton is inventory, not a study aid.
 */
export function listRegionStructures(
  entries: AnatomyEntry[],
  region: string | null,
  kind: StructureKind,
): BoneGroup[] {
  const def = region ? REGIONS[region] : null;
  if (!def) return [];
  const names = entries.map((e) => e.meshName);
  const meshes = resolveRegionMeshes(def, names);
  const groups =
    kind === 'nerves' ? buildNerveList(entries, meshes) : buildBoneList(entries, meshes);

  const canonicalByMesh = new Map<string, string>();
  for (const e of entries) {
    if (!canonicalByMesh.has(e.meshName)) canonicalByMesh.set(e.meshName, e.canonicalName);
  }

  // Named structures keep the table's teaching order (the lib already sorted
  // them first); the rest follow, alphabetical by the name they now show.
  const named: BoneGroup[] = [];
  const rest: BoneGroup[] = [];
  for (const g of groups) {
    if (g.name !== prettifiedKey(g.id)) {
      named.push(g);
      continue;
    }
    const canonical = canonicalByMesh.get(g.meshNames[0] ?? '');
    rest.push({ ...g, name: canonical ? atlasDisplayName(canonical) : g.name });
  }
  rest.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  return [...named, ...rest];
}

/** A listed structure, as looked up from one of its meshes. */
export interface RegionStructure extends BoneGroup {
  kind: StructureKind;
}

/**
 * mesh name -> the listed structure it belongs to, for the active region.
 *
 * This is what lets the sheet title a clicked mesh with the SAME name its row
 * in the list carries, whichever way it was selected (the list, the 3D model
 * or the search).
 */
export function regionStructuresByMesh(
  entries: AnatomyEntry[],
  region: string | null,
): Map<string, RegionStructure> {
  const out = new Map<string, RegionStructure>();
  for (const kind of ['bones', 'nerves'] as const) {
    for (const g of listRegionStructures(entries, region, kind)) {
      const s: RegionStructure = { ...g, kind };
      for (const name of g.meshNames) if (!out.has(name)) out.set(name, s);
    }
  }
  return out;
}
