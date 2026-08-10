// src/lib/__tests__/neuroSkin.test.ts
//
// The 3D dermatome map claims that named skin on the real rig belongs to a given
// nerve root. That claim is checkable, and it is checked here against a SNAPSHOT of
// the shipped rig -- fixtures/rigSkinPatches.json, 486 patches with their measured
// positions -- so the whole pipeline runs in CI without the 19 MB LFS binary.
//
// Regenerate the fixture when the rig is re-exported:
//
//   npx tsx --tsconfig tsconfig.scripts.json scripts/dump-rig-skin.mts <rig.glb> out.json
//
// and rebuild it from that dump as [canonicalRegion, side, |x|, y].
//
// What is guarded, in order of how badly it would fail silently:
//
//  1. NO RULE NAMES A MESH THE RIG DOES NOT HAVE. A typo in "Lateral border of
//     forearm" does not throw; it just quietly paints nothing, and the feature
//     looks broken for one root only.
//  2. EVERY ROOT RESOLVES TO REAL PATCHES, ON BOTH SIDES. A root with no skin is a
//     root whose 3D map is missing.
//  3. NO PATCH IS CLAIMED BY TWO ROOTS. Overlapping windows would make a patch's
//     colour depend on iteration order.
//  4. THE ASIA KEY POINTS LAND ON THE RIGHT ROOT. These four are the reason this
//     layer is honest rather than decorative, so they are asserted by name.

import { describe, expect, it } from 'vitest';
import {
  matchesRule,
  ownedPatches,
  patchesForRoot,
  resolvePatches,
  rootsForPatch,
  type ResolvedPatch,
} from '../neuroSkin';
import {
  SKIN_BY_ROOT,
  VERIFIED_SKIN_REGIONS,
  canonicalRegion,
} from '../../data/neuro/skinRegions';
import type { PlateFigure } from '../../data/neuro/plate';
import { CERVICAL_NEURO } from '../../data/neuro/cervical';
import { LUMBOSACRAL_NEURO } from '../../data/neuro/lumbosacral';
import fixture from './fixtures/rigSkinPatches.json';

const FIGURES: PlateFigure[] = ['upper-limb', 'lower-limb'];
const SETS: Record<PlateFigure, string[]> = {
  'upper-limb': CERVICAL_NEURO.roots.map((r) => r.id),
  'lower-limb': LUMBOSACRAL_NEURO.roots.map((r) => r.id),
};

/** The snapshot. Rows are [region, side, |x| of centre, y of centre, x-span]. */
const rows = fixture.patches as [string, number, number, number, number][];
const resolved: ResolvedPatch<number>[] = resolvePatches(
  rows.map(([region, side, absX, y, span], i) => ({
    ref: i,
    name: region,
    // The snapshot stores |x| and the side separately; the resolver reads a signed
    // x, so put the sign back rather than teaching it a second input shape.
    x: absX * side,
    y,
    span,
  })),
);

describe('the snapshot itself', () => {
  it('is the shipped rig, in full', () => {
    expect(rows).toHaveLength(fixture.count);
    expect(rows).toHaveLength(486);
    // Every row carries a span, or `spread` silently becomes 0 and every wide shell
    // passes for a precise half.
    expect(rows.every((r) => typeof r[4] === 'number' && r[4] > 0)).toBe(true);
    // Both sides present, or every laterality assertion below is vacuous.
    expect(new Set(rows.map((r) => r[1]))).toEqual(new Set([1, -1]));
  });

  it('agrees with the committed region vocabulary', () => {
    const inSnapshot = new Set(rows.map((r) => canonicalRegion(r[0])));
    expect([...inSnapshot].sort()).toEqual([...VERIFIED_SKIN_REGIONS].sort());
  });
});

describe('the mapping references real skin', () => {
  it('names no region the rig does not have', () => {
    const known = new Set(VERIFIED_SKIN_REGIONS);
    for (const figure of FIGURES) {
      for (const [root, rules] of Object.entries(SKIN_BY_ROOT[figure])) {
        for (const rule of rules) {
          expect(known.has(rule.region), `${figure} ${root}: "${rule.region}"`).toBe(true);
        }
      }
    }
  });

  it('writes every window inside 0..1, low end first', () => {
    for (const figure of FIGURES) {
      for (const [root, rules] of Object.entries(SKIN_BY_ROOT[figure])) {
        for (const rule of rules) {
          for (const w of [rule.lateral, rule.level]) {
            if (!w) continue;
            const where = `${figure} ${root} ${rule.region}`;
            expect(w[0], where).toBeGreaterThanOrEqual(0);
            expect(w[1], where).toBeLessThanOrEqual(1);
            expect(w[0], where).toBeLessThan(w[1]);
          }
        }
      }
    }
  });

  it('covers exactly the roots the panel lists', () => {
    for (const figure of FIGURES) {
      expect(Object.keys(SKIN_BY_ROOT[figure]).sort()).toEqual([...SETS[figure]].sort());
    }
  });
});

describe('every root lands on real patches', () => {
  it('finds skin for each root, on both sides of the body', () => {
    for (const figure of FIGURES) {
      for (const root of SETS[figure]) {
        const mine = patchesForRoot(resolved, figure, root);
        expect(mine.length, `${figure} ${root}`).toBeGreaterThan(0);
        const sides = new Set(mine.map((p) => p.side));
        // A dermatome exists on both limbs. Only one side means the geometric
        // laterality rule broke for this region.
        expect([...sides].sort(), `${figure} ${root} sides`).toEqual([-1, 1]);
      }
    }
  });

  it('never lets two roots claim the same patch', () => {
    for (const figure of FIGURES) {
      const clashes = resolved
        .map((p) => ({ p, roots: rootsForPatch(p, figure) }))
        .filter((x) => x.roots.length > 1)
        .map((x) => `${x.p.region} (side ${x.p.side}) -> ${x.roots.join(' + ')}`);
      expect(clashes, `${figure}`).toEqual([]);
    }
  });

  it('leaves the roots it does not screen unpainted', () => {
    // Stated as a test because these gaps are deliberate and a future edit that
    // "fills them in" would be inventing anatomy: L1 at the groin, S2-S3 behind
    // the thigh, C4 over the shoulder cap.
    const unclaimed = ['Inguinal region', 'Posterior region of thigh', 'Gluteal region'];
    for (const region of unclaimed) {
      const some = resolved.filter((p) => p.region === region);
      expect(some.length, region).toBeGreaterThan(0);
      for (const p of some) {
        expect(rootsForPatch(p, 'lower-limb'), region).toEqual([]);
      }
    }
    for (const p of resolved.filter((x) => x.region === 'Deltopectoral triangle')) {
      expect(rootsForPatch(p, 'upper-limb')).toEqual([]);
    }
  });
});

describe('the ASIA key points land on the right root', () => {
  /** Which root owns every patch of this region, as a set. */
  const ownersOf = (region: string, figure: PlateFigure): string[] => {
    const owners = new Set<string>();
    for (const p of resolved.filter((x) => x.region === region)) {
      for (const r of rootsForPatch(p, figure)) owners.add(r);
    }
    return [...owners].sort();
  };

  it('puts the medial malleolus on L4 and the lateral one on S1', () => {
    expect(ownersOf('Medial malleolus', 'lower-limb')).toEqual(['L4']);
    expect(ownersOf('Lateral malleolus', 'lower-limb')).toEqual(['S1']);
  });

  it('puts the dorsum of the foot on L5 and the heel on S1', () => {
    expect(ownersOf('Dorsum of foot', 'lower-limb')).toEqual(['L5']);
    expect(ownersOf('Heel region', 'lower-limb')).toEqual(['S1']);
  });

  it('puts the thumb hollow on C6', () => {
    expect(ownersOf('Radial foveola', 'upper-limb')).toEqual(['C6']);
  });

  it('splits the two borders of the forearm into C6 and C8', () => {
    expect(ownersOf('Lateral border of forearm', 'upper-limb')).toEqual(['C6']);
    expect(ownersOf('Medial border of forearm', 'upper-limb')).toEqual(['C8']);
  });

  it('splits the antecubital fossa laterally into C5 and medially into T1', () => {
    // The one place two roots share a region and MUST divide it: C5's key point is
    // the lateral fossa, T1's the medial one.
    expect(ownersOf('Cubital fossa', 'upper-limb')).toEqual(['C5', 'T1']);
  });
});

describe('the spelling three.js actually gives us', () => {
  // Captured from the running app, not imagined: GLTFLoader sanitises node names,
  // so "Anterior region of forearm.001" arrives as "Anterior_region_of_forearm_1"
  // and "Dorsum of hand.l" as "Dorsum_of_handl", with the laterality letter GLUED
  // to the last word. The first canonicaliser only understood the GLB spelling and
  // matched 1 patch out of 486 on the real rig -- a failure no fixture built from
  // glTF names could have caught, and the reason these cases are pinned here.
  const cases: [string, string][] = [
    ['Anterior_region_of_forearm', 'Anterior region of forearm'],
    ['Anterior_region_of_forearm_1', 'Anterior region of forearm'],
    ['Anterior_region_of_forearm_9', 'Anterior region of forearm'],
    ['Anterior_region_of_thigh_8', 'Anterior region of thigh'],
    ['Cubital_fossa', 'Cubital fossa'],
    ['Cubital_fossa_3', 'Cubital fossa'],
    ['Dorsum_of_handl', 'Dorsum of hand'],
    ['Dorsum_of_handr', 'Dorsum of hand'],
    ['Dorsum_of_foot_2', 'Dorsum of foot'],
    // The GLB spellings must keep working too: the dump script reads those.
    ['Palm.l', 'Palm'],
    ['Cubital fossa.', 'Cubital fossa'],
    ['Anterior region of arm.001', 'Anterior region of arm'],
    // A hyphen is not a separator; three leaves it alone.
    ['Infra-orbital region', 'Infra-orbital region'],
  ];

  it.each(cases)('reads %s as %s', (raw, expected) => {
    expect(canonicalRegion(raw)).toBe(expected);
  });

  it('never truncates a region into something it is not', () => {
    // The stripping is only allowed because the result must be a KNOWN region, and
    // the unstripped candidate is tried first.
    for (const region of VERIFIED_SKIN_REGIONS) {
      expect(canonicalRegion(region)).toBe(region);
      expect(canonicalRegion(region.replace(/ /g, '_'))).toBe(region);
    }
  });

  it('resolves the runtime spelling to the same roots as the GLB spelling', () => {
    // End to end: the sanitised name has to land on the same root, or the 3D layer
    // paints nothing while every other check stays green.
    const runtime = resolvePatches([
      { ref: 'heel', name: 'Heel_region_2', x: 0.087, y: 0.036, span: 0.048 },
      { ref: 'medmall', name: 'Medial_malleolusl', x: 0.045, y: 0.073, span: 0.006 },
      { ref: 'foveola', name: 'Radial_foveolal', x: 0.299, y: 0.845, span: 0.01 },
    ]);
    expect(rootsForPatch(runtime[0], 'lower-limb')).toEqual(['S1']);
    expect(rootsForPatch(runtime[1], 'lower-limb')).toEqual(['L4']);
    expect(rootsForPatch(runtime[2], 'upper-limb')).toEqual(['C6']);
  });
});

describe('how confidently a territory can be drawn', () => {
  // The rig's skin shells are not cut on dermatome lines. One shell of "Anterior
  // region of forearm" spans 68% of the region's whole width, so a window meaning
  // "the lateral half" swallowed the entire forearm and the 3D map taught a
  // boundary that does not exist -- C6 and C8 each looked like the whole thing.
  //
  // The answer is not to drop those shells (that empties the limb) but to draw them
  // as a WASH, and to keep full strength for the places the rig is genuinely
  // precise. These tests pin which is which.
  const confidenceOf = (region: string, figure: PlateFigure, root: string) => {
    const mine = ownedPatches(resolved, figure, root).filter(
      (o) => o.patch.region === region,
    );
    return [...new Set(mine.map((o) => o.confidence))].sort();
  };

  it('is sure about the ASIA key points and the named borders', () => {
    // Every one of these is an unwindowed rule: the NAME is the precision.
    expect(confidenceOf('Medial malleolus', 'lower-limb', 'L4')).toEqual(['sure']);
    expect(confidenceOf('Heel region', 'lower-limb', 'S1')).toEqual(['sure']);
    expect(confidenceOf('Dorsum of foot', 'lower-limb', 'L5')).toEqual(['sure']);
    expect(confidenceOf('Radial foveola', 'upper-limb', 'C6')).toEqual(['sure']);
    expect(confidenceOf('Lateral border of forearm', 'upper-limb', 'C6')).toEqual(['sure']);
    expect(confidenceOf('Medial border of forearm', 'upper-limb', 'C8')).toEqual(['sure']);
  });

  it('is only broad about the wide shells that made the forearm look solid', () => {
    // The two shells behind the bug, one per root, now washes rather than fills.
    expect(confidenceOf('Anterior region of forearm', 'upper-limb', 'C8')).toContain('broad');
    expect(confidenceOf('Posterior region of forearm', 'upper-limb', 'C7')).toContain('broad');
  });

  it('still paints every root, on both sides, at some confidence', () => {
    // The wash exists so that nothing had to be dropped. If a root lost its skin
    // to this rule, the cure was worse than the disease.
    for (const figure of FIGURES) {
      for (const root of SETS[figure]) {
        const mine = ownedPatches(resolved, figure, root);
        expect(mine.length, `${figure} ${root}`).toBeGreaterThan(0);
        expect(mine.some((o) => o.confidence === 'sure'), `${figure} ${root} sure`).toBe(true);
      }
    }
  });

  it('agrees with patchesForRoot about WHICH patches belong to a root', () => {
    // Two entry points, one answer: the renderer uses ownedPatches and the coverage
    // checks use patchesForRoot, and they must not drift apart.
    for (const figure of FIGURES) {
      for (const root of SETS[figure]) {
        expect(ownedPatches(resolved, figure, root).map((o) => o.patch.ref)).toEqual(
          patchesForRoot(resolved, figure, root).map((p) => p.ref),
        );
      }
    }
  });
});

describe('window semantics', () => {
  it('tiles a region without a gap or a double claim', () => {
    const patch = (lateral: number) => ({ region: 'R', lateral, level: 0.5 });
    const lower = { region: 'R', lateral: [0, 0.5] as [number, number] };
    const upper = { region: 'R', lateral: [0.5, 1] as [number, number] };
    // Exactly on the shared edge: the UPPER window keeps it, and only it. Which
    // side wins matters less than that exactly one does.
    expect(matchesRule(patch(0.5), upper)).toBe(true);
    expect(matchesRule(patch(0.5), lower)).toBe(false);
    // The far end belongs to the upper window, since hi = 1 is inclusive.
    expect(matchesRule(patch(1), upper)).toBe(true);
    expect(matchesRule(patch(0), lower)).toBe(true);
  });

  it('places a single-patch region at the middle, so an unwindowed rule takes it', () => {
    const [only] = resolvePatches([
      { ref: 0, name: 'Dorsum of hand', x: 0.27, y: 0.8, span: 0.099 },
    ]);
    expect(only.lateral).toBe(0.5);
    expect(only.level).toBe(0.5);
    expect(matchesRule(only, { region: 'Dorsum of hand' })).toBe(true);
  });
});
