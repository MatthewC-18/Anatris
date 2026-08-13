// src/lib/boneList.ts
//
// THE SIDEBAR ONLY EVER LISTED MUSCLES.
//
// A physiotherapist reviewing the shoulder checked two structures by name and
// wrote: "no se muestra todos los músculos o huesos: romboides ✓ / clavícula ✗".
// Both are in the model and both are labelled in Explorar's margin -- what he
// could not do was FIND the clavicle, because the only list in the rail is
// MuscleList, and a clavicle is not a muscle. Deep bones are exactly the ones you
// cannot reach by clicking, which is the same reason MuscleList exists.
//
// This turns the region's bone-layer meshes into a list of named structures.
//
// GROUPING IS THE WHOLE PROBLEM. Z-Anatomy names the two sides inconsistently:
// some structures carry an `l`/`r` suffix (Glenoid_labruml / ...r), and others
// encode the second side as a Blender DUPLICATE TAIL with no laterality at all
// (Clavicle / Clavicle_1). On top of that the same mesh NAME can appear twice in
// the scene, once per side. So a bone is keyed by its name with both the
// laterality suffix and the duplicate tail removed, and every mesh that reduces
// to that key belongs to it -- which is how "Clavícula" ends up being one row
// covering four meshes instead of two rows covering two.

import type { AnatomyEntry, AnatomyLayer } from '../types/anatomy';

/** One structure as the sidebar lists it. */
export interface BoneGroup {
  /** Stable key, e.g. "clavicle". */
  id: string;
  /** Spanish display name. */
  name: string;
  /** Every mesh in the scene belonging to this structure, both sides. */
  meshNames: string[];
  /** True when the structure exists on both sides of the body. */
  bilateral: boolean;
}

/**
 * Spanish names, matched against the GROUPING KEY (lowercase, no side suffix, no
 * duplicate tail). Order here is the order the list shows: proximal-to-distal
 * within the girdle, then the fibrocartilages that belong to its joints.
 *
 * Anything not listed still appears, under a prettified name -- the complaint
 * being answered is precisely that structures went missing, so the fallback must
 * never be silence.
 */
const BONE_NAMES: Array<[string, string]> = [
  // --- shoulder girdle ---
  ['clavicle', 'Clavícula'],
  ['scapula', 'Escápula'],
  ['humerus', 'Húmero'],
  ['glenoid_labrum', 'Rodete glenoideo'],
  ['articular_disc_of_acromioclavicular_joint', 'Disco articular acromioclavicular'],
  ['articular_disc_of_sternoclavicular_joint', 'Disco articular esternoclavicular'],
  // --- elbow / forearm ---
  ['radius', 'Radio'],
  ['ulna', 'Cúbito'],
  // --- pelvis / lower limb ---
  ['hip_bone', 'Coxal'],
  ['sacrum', 'Sacro'],
  ['coccyx', 'Cóccix'],
  ['femur', 'Fémur'],
  ['patella', 'Rótula'],
  ['tibia', 'Tibia'],
  ['fibula', 'Peroné'],
  ['talus', 'Astrágalo'],
  ['calcaneus', 'Calcáneo'],
  ['navicular_bone', 'Escafoides'],
  ['cuboid_bone', 'Cuboides'],
  ['acetabular_labrum', 'Rodete acetabular'],
  ['medial_meniscus', 'Menisco interno'],
  ['lateral_meniscus', 'Menisco externo'],
  // --- thorax ---
  ['sternum', 'Esternón'],
  ['manubrium', 'Manubrio esternal'],
  ['xiphoid_process', 'Apéndice xifoides'],
];

/**
 * Spanish names for the UPPER-LIMB nerves, in the order a plexus is taught:
 * roots, trunks, divisions, cords, then the branches that leave them.
 *
 * The whole brachial plexus was already in the model -- 88 meshes, roots through
 * digital branches -- and none of it was reachable: the nerve layer is off by
 * default (a documented choice, because branches leaving a cut-out region trail
 * into mid-air) and the shoulder region's keywords let through only the few
 * nerves whose names happen to contain "scapular". A physio wrote "no hay
 * nervios" twice.
 */
const NERVE_NAMES: Array<[string, string]> = [
  // --- plexus, proximal to distal ---
  ['roots_of_brachial_plexus', 'Raíces del plexo braquial'],
  ['superior_trunk_of_brachial_plexus', 'Tronco superior'],
  ['middle_trunk_of_brachial_plexus', 'Tronco medio'],
  ['inferior_trunk_of_brachial_plexus', 'Tronco inferior'],
  ['anterior_division_of_superior_trunk_of_brachial_plexus', 'División anterior del tronco superior'],
  ['anterior_division_of_middle_trunk_of_brachial_plexus', 'División anterior del tronco medio'],
  ['anterior_division_of_inferior_trunk_of_brachial_plexus', 'División anterior del tronco inferior'],
  ['posterior_division_of_superior_trunk_of_brachial_plexus', 'División posterior del tronco superior'],
  ['posterior_division_of_middle_trunk_of_brachial_plexus', 'División posterior del tronco medio'],
  ['posterior_division_of_inferior_trunk_of_brachial_plexus', 'División posterior del tronco inferior'],
  ['lateral_cord_of_brachial_plexus', 'Fascículo lateral'],
  ['medial_cord_of_brachial_plexus', 'Fascículo medial'],
  ['posterior_cord_of_brachial_plexus', 'Fascículo posterior'],
  // --- branches that matter at the shoulder ---
  ['axillary_nerve', 'Nervio axilar'],
  ['suprascapular_nerve', 'Nervio supraescapular'],
  ['dorsal_scapular_nerve', 'Nervio dorsal de la escápula'],
  ['long_thoracic_nerve', 'Nervio torácico largo'],
  ['thoracodorsal_nerve', 'Nervio toracodorsal'],
  ['superior_subscapular_nerve', 'Nervio subescapular superior'],
  ['inferior_subscapular_nerve', 'Nervio subescapular inferior'],
  ['lateral_pectoral_nerve', 'Nervio pectoral lateral'],
  ['medial_pectoral_nerve', 'Nervio pectoral medial'],
  ['musculocutaneous_nerve', 'Nervio musculocutáneo'],
  // --- the long branches, present from the shoulder down ---
  ['radial_nerve', 'Nervio radial'],
  ['median_nerve', 'Nervio mediano'],
  ['ulnar_nerve', 'Nervio cubital'],
  ['muscular_branches_of_axillary_nerve', 'Ramos musculares del axilar'],
  ['muscular_branches_of_radial_nerve', 'Ramos musculares del radial'],
  ['muscular_branches_of_median_nerve', 'Ramos musculares del mediano'],
  ['muscular_branches_of_ulnar_nerve', 'Ramos musculares del cubital'],
];

/**
 * Strip the bookkeeping tails from a mesh name: the Z-Anatomy instance suffix and
 * the Blender duplicate tail. `Clavicle_1` -> `clavicle`. Laterality is NOT
 * handled here -- see `dropLateralSuffix`, which needs to see the whole set.
 */
export function boneKey(meshName: string): string {
  return meshName
    .replace(/_instance_\d+$/i, '')
    .replace(/\.\d+$/, '')
    // Only a PURE numeric tail, so a real name ending in a number (a rib, a
    // vertebra) survives.
    .replace(/_\d{1,3}$/, '')
    .toLowerCase();
}

/**
 * Drop a trailing `l`/`r` laterality letter, but ONLY when the opposite side
 * really exists in the same set.
 *
 * A rule based on the letter alone cannot work: `Glenoid_labruml` must lose its
 * `l`, and `Femur` must keep its `r`. Nothing about the two names distinguishes
 * them -- what distinguishes them is that `Glenoid_labrumr` exists and `Femul`
 * does not. So the pairing is what decides, and a bone whose name merely happens
 * to end in a side letter is left intact.
 */
function dropLateralSuffix(key: string, allKeys: ReadonlySet<string>): string {
  const m = key.match(/^(.*[a-z])(l|r)$/);
  if (!m) return key;
  const sibling = `${m[1]}${m[2] === 'l' ? 'r' : 'l'}`;
  return allKeys.has(sibling) ? m[1] : key;
}

/** Prettify a grouping key when the table has no Spanish name for it. */
function prettify(key: string): string {
  const words = key.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Group a region's meshes of ONE LAYER into the structures the sidebar lists.
 *
 * The grouping is layer-agnostic -- Z-Anatomy's naming chaos is the same for a
 * nerve as for a bone -- so only the Spanish name table changes. `buildBoneList`
 * and `buildNerveList` are the two callers.
 *
 * @param entries    the anatomy index entries (may contain the SAME mesh name
 *                   more than once: the two sides can share a name).
 * @param regionMesh the mesh names resolved for the active region.
 * @param layer      which index layer to group.
 * @param names      grouping key -> Spanish name, in display order.
 */
export function buildStructureList(
  entries: AnatomyEntry[],
  regionMesh: ReadonlySet<string>,
  layer: AnatomyLayer,
  names: ReadonlyArray<readonly [string, string]>,
): BoneGroup[] {
  const NAME_ORDER = new Map(names.map(([key], i) => [key, i]));
  const NAME_BY_KEY = new Map(names);
  // Two passes: the laterality rule needs to know which keys exist before it can
  // tell a side suffix from a letter that belongs to the name.
  const inRegion = entries.filter(
    (e) => e.layer === layer && regionMesh.has(e.meshName),
  );
  const rawKeys = new Set(inRegion.map((e) => boneKey(e.meshName)));

  const groups = new Map<string, { meshNames: Set<string>; sides: Set<string> }>();

  for (const entry of inRegion) {
    const key = dropLateralSuffix(boneKey(entry.meshName), rawKeys);
    if (!key) continue;
    let g = groups.get(key);
    if (!g) {
      g = { meshNames: new Set(), sides: new Set() };
      groups.set(key, g);
    }
    g.meshNames.add(entry.meshName);
    g.sides.add(entry.side);
  }

  const out: BoneGroup[] = [];
  for (const [key, g] of groups) {
    out.push({
      id: key,
      name: NAME_BY_KEY.get(key) ?? prettify(key),
      meshNames: [...g.meshNames].sort(),
      // The INDEX's laterality, not the mesh count: the sacrum ships as two
      // meshes and is still one midline bone.
      bilateral: g.sides.has('left') && g.sides.has('right'),
    });
  }

  // Named bones first, in the table's order; anything unnamed after them,
  // alphabetically, so an unexpected structure is visible rather than buried.
  out.sort((a, b) => {
    const ai = NAME_ORDER.get(a.id);
    const bi = NAME_ORDER.get(b.id);
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return a.name.localeCompare(b.name, 'es');
  });
  return out;
}

/** The region's bones, for the sidebar's "Huesos" section. */
export function buildBoneList(
  entries: AnatomyEntry[],
  regionMesh: ReadonlySet<string>,
): BoneGroup[] {
  return buildStructureList(entries, regionMesh, 'bones', BONE_NAMES);
}

/** The region's nerves, for the sidebar's "Nervios" section. */
export function buildNerveList(
  entries: AnatomyEntry[],
  regionMesh: ReadonlySet<string>,
): BoneGroup[] {
  return buildStructureList(entries, regionMesh, 'nerves', NERVE_NAMES);
}
