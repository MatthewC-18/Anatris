// The viewer's hover chip and selection panel show these labels, so a
// regression here is text the user reads. Two things are pinned:
//
//   1. The FLATTENED SIDE LETTER. three.js turns ".l" / ".r" into a bare
//      trailing letter, so the atlas ships "Anterior_cruciate_ligamentl". The
//      old suffix table expected a dot, never fired, and the glued word matched
//      no term — the chip read "Dorsal radio-ulnar ligamentl". Stripping any
//      trailing l/r instead would break "Femur" into "Femu", so the letter is
//      only dropped when the opposite-sided sibling exists in the atlas.
//   2. WORD ORDER. Spanish puts the noun first, so a word-by-word substitution
//      produced "Anular ligamento de radio".

import { describe, it, expect } from 'vitest';
import { formatCanonicalName, registerAtlasNames, stripFlattenedSide } from '../formatName';

registerAtlasNames([
  'Anterior_cruciate_ligamentl',
  'Anterior_cruciate_ligamentr',
  'Annular_ligament_of_radiusl',
  'Annular_ligament_of_radiusr',
  'Articular_capsule_of_knee_jointl',
  'Articular_capsule_of_knee_jointr',
  'Lateral_meniscusl',
  'Lateral_meniscusr',
  'Femur',
  'Patella_1',
  'Vertebra_T5_1',
]);

describe('agreement', () => {
  // The whole reason the agreement pass exists: a word-for-word substitution
  // cannot know that "porción" is feminine, and shipped "porción profundo".
  const cases: Array<[string, string]> = [
    ['Deep_part_of_tibial_collateral_ligament', 'Porción profunda del ligamento tibial colateral'],
    ['Subtendinous_bursa_of_infraspinatus', 'Bolsa subtendinosa de infraspinatus'],
    ['Interosseous_membrane_of_forearm', 'Membrana interósea del antebrazo'],
    ['Middle_phalanx_of_second_finger_of_foot', 'Falange media del segundo dedo del pie'],
    ['Articular_capsule_of_superior_tibiofibular_joint', 'Cápsula articular de la articulación superior tibioperonea'],
    // Masculine head noun keeps the masculine adjective.
    ['Deep_part_of_ligament', 'Porción profunda del ligamento'],
    ['Transverse_ligament_of_knee', 'Ligamento transverso de la rodilla'],
  ];
  for (const [raw, expected] of cases) {
    it(`${raw} -> ${expected}`, () => {
      expect(formatCanonicalName(raw, 'center')).toBe(expected);
    });
  }

  it('contracts the article with a masculine noun', () => {
    expect(formatCanonicalName('Ligament_of_head_of_femur', 'center')).toContain('del fémur');
  });

  it('pluralises the adjectives with a plural noun', () => {
    expect(formatCanonicalName('Dorsal_metatarsal_ligaments', 'center')).toBe(
      'Ligamentos dorsales metatarsianos',
    );
  });
});

describe('stripFlattenedSide', () => {
  it('drops a side letter that has a paired sibling', () => {
    expect(stripFlattenedSide('Lateral_meniscusl')).toBe('Lateral_meniscus');
    expect(stripFlattenedSide('Anterior_cruciate_ligamentr')).toBe('Anterior_cruciate_ligament');
  });

  it('keeps a letter that is part of the word', () => {
    // No "Femul" in the atlas, so the r is the end of "Femur".
    expect(stripFlattenedSide('Femur')).toBe('Femur');
  });

  it('leaves names that end in neither letter alone', () => {
    expect(stripFlattenedSide('Patella_1')).toBe('Patella_1');
  });
});

describe('formatCanonicalName', () => {
  const cases: Array<[string, 'left' | 'right' | 'center', string]> = [
    ['Anterior_cruciate_ligamentl', 'left', 'Ligamento anterior cruzado, izquierdo'],
    ['Annular_ligament_of_radiusl', 'left', 'Ligamento anular del radio, izquierdo'],
    ['Lateral_meniscusl', 'left', 'Menisco lateral, izquierdo'],
    ['Articular_capsule_of_knee_jointl', 'left', 'Cápsula articular de la rodilla, izquierdo'],
    ['Femur', 'right', 'Fémur, derecho'],
    // Blender's duplicate tail is not part of the name.
    ['Vertebra_T5_1', 'center', 'Vértebra T5'],
  ];
  for (const [raw, side, expected] of cases) {
    it(`${raw} -> ${expected}`, () => {
      expect(formatCanonicalName(raw, side)).toBe(expected);
    });
  }

  it('keeps vertebral level codes in capitals', () => {
    expect(formatCanonicalName('Vertebra_T5_1', 'center')).toContain('T5');
  });

  it('never leaves the glued side letter in the output', () => {
    for (const [raw, side] of cases) {
      expect(formatCanonicalName(raw, side)).not.toMatch(/ligamentl|ligamentr|meniscusl/i);
    }
  });
});
