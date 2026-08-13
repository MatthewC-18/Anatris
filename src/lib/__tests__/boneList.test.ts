// Grouping a region's bone meshes into the structures the sidebar lists.
//
// Every case below is a real naming pattern from the shipped model, because the
// grouping is entirely at the mercy of how Z-Anatomy names things and the naming
// is not consistent. The physio's complaint was that the clavicle could not be
// found; a grouping bug here brings it back as two half-clavicles, or hides it
// under a mangled name, which is the same failure wearing a different hat.

import { describe, it, expect } from 'vitest';
import { buildBoneList, buildNerveList, boneKey } from '../boneList';
import type { AnatomyEntry } from '../../types/anatomy';

const bone = (
  meshName: string,
  side: AnatomyEntry['side'] = 'center',
): AnatomyEntry => ({
  meshName,
  canonicalName: meshName,
  materialName: 'Bone',
  layer: 'bones',
  side,
  hiddenByDefault: false,
});

const allOf = (entries: AnatomyEntry[]) => new Set(entries.map((e) => e.meshName));

describe('boneKey', () => {
  it('strips the bookkeeping tails but keeps the name', () => {
    expect(boneKey('Clavicle')).toBe('clavicle');
    expect(boneKey('Clavicle_1')).toBe('clavicle');
    expect(boneKey('Scapula_001')).toBe('scapula');
    expect(boneKey('Humerus_instance_0')).toBe('humerus');
  });

  it('leaves laterality alone (that needs the whole set)', () => {
    expect(boneKey('Glenoid_labruml')).toBe('glenoid_labruml');
    expect(boneKey('Femur')).toBe('femur');
  });
});

describe('buildBoneList', () => {
  it('joins a bone split across a Blender duplicate tail', () => {
    // The two clavicles are "Clavicle" and "Clavicle_1", and each NAME appears
    // twice in the index (the scene has duplicate node names). One row, four
    // meshes -- not two rows, and not four.
    const entries = [
      bone('Clavicle', 'left'),
      bone('Clavicle', 'right'),
      bone('Clavicle_1', 'left'),
      bone('Clavicle_1', 'right'),
    ];
    const list = buildBoneList(entries, allOf(entries));
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Clavícula');
    expect(list[0].meshNames).toEqual(['Clavicle', 'Clavicle_1']);
    expect(list[0].bilateral).toBe(true);
  });

  it('joins a bone split across an l/r suffix', () => {
    const entries = [bone('Glenoid_labruml', 'left'), bone('Glenoid_labrumr', 'right')];
    const list = buildBoneList(entries, allOf(entries));
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('glenoid_labrum');
    expect(list[0].name).toBe('Rodete glenoideo');
  });

  it('does NOT eat a final letter that belongs to the name', () => {
    // The bug this guards: "Femur" ends in `r`, so a laterality rule based on the
    // letter alone renamed the femur to "Femu". What separates it from a real
    // side suffix is that no "Femul" exists.
    const entries = [bone('Femur', 'left'), bone('Femur_1', 'right')];
    const list = buildBoneList(entries, allOf(entries));
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('femur');
    expect(list[0].name).toBe('Fémur');
  });

  it('counts laterality from the index, not from the mesh count', () => {
    // The sacrum ships as two meshes and is still one midline bone.
    const entries = [bone('Sacrum_1', 'center'), bone('Sacrum_2', 'center')];
    const list = buildBoneList(entries, allOf(entries));
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Sacro');
    expect(list[0].bilateral).toBe(false);
  });

  it('never drops a structure it has no Spanish name for', () => {
    // The complaint being answered is that things went missing, so an unnamed
    // structure must still be listed, readably, rather than silently skipped.
    const entries = [bone('Interpubic_disc', 'center')];
    const list = buildBoneList(entries, allOf(entries));
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Interpubic disc');
  });

  it('ignores meshes outside the region and outside the bone layer', () => {
    const entries: AnatomyEntry[] = [
      bone('Clavicle', 'left'),
      bone('Femur', 'left'),
      { ...bone('Deltoid_muscle', 'left'), layer: 'muscles' },
    ];
    const list = buildBoneList(entries, new Set(['Clavicle', 'Deltoid_muscle']));
    expect(list.map((b) => b.name)).toEqual(['Clavícula']);
  });

  it('puts the named bones first, in anatomical order', () => {
    const entries = [
      bone('Interpubic_disc', 'center'),
      bone('Humerus', 'left'),
      bone('Clavicle', 'left'),
      bone('Scapula', 'left'),
    ];
    const list = buildBoneList(entries, allOf(entries));
    expect(list.map((b) => b.name)).toEqual([
      'Clavícula',
      'Escápula',
      'Húmero',
      'Interpubic disc',
    ]);
  });

  it('gives the shoulder every structure a physio would look for', () => {
    // The real shoulder set, as resolved from the shipped index.
    const entries = [
      bone('Clavicle', 'left'), bone('Clavicle_1', 'right'),
      bone('Scapula', 'left'), bone('Scapula_1', 'right'),
      bone('Humerus', 'left'), bone('Humerus_1', 'right'),
      bone('Glenoid_labruml', 'left'), bone('Glenoid_labrumr', 'right'),
      bone('Articular_disc_of_acromioclavicular_jointl', 'left'),
      bone('Articular_disc_of_acromioclavicular_jointr', 'right'),
      bone('Articular_disc_of_sternoclavicular_jointl', 'center'),
      bone('Articular_disc_of_sternoclavicular_jointr', 'center'),
    ];
    const list = buildBoneList(entries, allOf(entries));
    expect(list.map((b) => b.name)).toEqual([
      'Clavícula',
      'Escápula',
      'Húmero',
      'Rodete glenoideo',
      'Disco articular acromioclavicular',
      'Disco articular esternoclavicular',
    ]);
  });
});

describe('buildNerveList', () => {
  const nerve = (meshName: string, side: AnatomyEntry['side'] = 'center'): AnatomyEntry => ({
    meshName,
    canonicalName: meshName,
    materialName: 'Nerve-3',
    layer: 'nerves',
    side,
    hiddenByDefault: false,
  });

  it('names the brachial plexus in Spanish, in teaching order', () => {
    // Roots, trunks, divisions, cords, then branches -- the order a plexus is
    // taught, not alphabetical.
    const entries = [
      nerve('Axillary_nerve_instance_0', 'left'),
      nerve('Axillary_nerve_instance_1', 'right'),
      nerve('Superior_trunk_of_brachial_plexus_instance_0', 'left'),
      nerve('Superior_trunk_of_brachial_plexus_instance_1', 'right'),
      nerve('Roots_of_brachial_plexusl', 'left'),
      nerve('Roots_of_brachial_plexusr', 'right'),
    ];
    const list = buildNerveList(entries, new Set(entries.map((e) => e.meshName)));
    expect(list.map((n) => n.name)).toEqual([
      'Raíces del plexo braquial',
      'Tronco superior',
      'Nervio axilar',
    ]);
  });

  it('joins the two sides of a nerve into one row', () => {
    const entries = [
      nerve('Suprascapular_nervel', 'left'),
      nerve('Suprascapular_nerver', 'right'),
    ];
    const list = buildNerveList(entries, new Set(entries.map((e) => e.meshName)));
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Nervio supraescapular');
    expect(list[0].bilateral).toBe(true);
  });

  it('does not pick up bones, and the bone list does not pick up nerves', () => {
    const entries: AnatomyEntry[] = [
      nerve('Axillary_nerve_instance_0', 'left'),
      bone('Clavicle', 'left'),
    ];
    const all = new Set(entries.map((e) => e.meshName));
    expect(buildNerveList(entries, all).map((n) => n.name)).toEqual(['Nervio axilar']);
    expect(buildBoneList(entries, all).map((n) => n.name)).toEqual(['Clavícula']);
  });
});
