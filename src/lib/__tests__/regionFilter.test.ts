// Guards the Explorar region filter against the two failures that made "por
// zonas" look broken.
//
// 1. KEYWORDS MUST USE UNDERSCORES. Three.js turns spaces in GLB node names into
//    underscores, so a fragment written with a space ("vertebra c") matches
//    nothing. The three spine regions shipped that way and rendered almost
//    empty: cervical drew 10 meshes (two sternocleidomastoids and the scalenes,
//    floating with no spine behind them), thoracic 2, lumbar 18. A keyword with
//    a space is always a bug, and the per-region floors below catch a region
//    that quietly stops resolving.
//
// 2. NO CROSS-REGION LEAKS. A knee must not drag in ankle bones, a hip must not
//    drag in the hamstrings.
//
// Resolution runs against the real shipped mesh names (public/anatomy-index.json)
// so this tests what the app actually loads, not a fixture.

import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { REGIONS, resolveRegionMeshes, resolveRegionFade } from '../../data/regiones';

interface IndexEntry {
  meshName: string;
  layer: string;
  hiddenByDefault: boolean;
}
const index = JSON.parse(readFileSync('public/anatomy-index.json', 'utf8')) as {
  entries: IndexEntry[];
};
const ALL_NAMES = index.entries.map((e) => e.meshName);

describe('region keywords', () => {
  for (const [id, def] of Object.entries(REGIONS)) {
    it(`${id} uses underscore-separated fragments`, () => {
      const withSpaces = [...def.include, ...(def.exclude ?? []), ...(def.focus ?? [])].filter(
        (frag) => frag.includes(' '),
      );
      expect(withSpaces).toEqual([]);
    });
  }
});

describe('region resolution', () => {
  // Floors, not exact counts: the point is to catch a region collapsing to
  // nothing, not to freeze the atlas.
  const MIN_MESHES: Record<string, number> = {
    shoulder: 200,
    elbow: 90,
    cervical: 60,
    thoracic: 40,
    lumbar: 45,
    hip: 150,
    knee: 180,
    ankle: 250,
  };

  for (const [id, min] of Object.entries(MIN_MESHES)) {
    it(`${id} resolves at least ${min} meshes`, () => {
      const meshes = resolveRegionMeshes(REGIONS[id], ALL_NAMES);
      expect(meshes.size).toBeGreaterThanOrEqual(min);
    });
  }

  it('every spine sub-region keeps its own vertebral levels only', () => {
    const levels = (id: string, re: RegExp) =>
      [...resolveRegionMeshes(REGIONS[id], ALL_NAMES)].filter((n) => re.test(n));

    expect(levels('cervical', /^Vertebra_C\d/).length).toBeGreaterThan(0);
    expect(levels('cervical', /^Vertebra_[TL]\d/)).toEqual([]);
    expect(levels('thoracic', /^Vertebra_T\d/).length).toBeGreaterThan(0);
    expect(levels('thoracic', /^Vertebra_[CL]\d/)).toEqual([]);
    expect(levels('lumbar', /^Vertebra_L\d/).length).toBeGreaterThan(0);
    expect(levels('lumbar', /^Vertebra_[CT]\d/)).toEqual([]);
  });

  it('does not leak neighbouring regions', () => {
    const leaks: [string, RegExp][] = [
      ['knee', /^(Talus|Calcaneus|Navicular_bone|Cuboid_bone)/],
      ['hip', /^(Patella|Tibia|Fibula|Semitendinosus|Semimembranosus)/],
      ['shoulder', /^(Radius|Ulna|Flexor_carpi|Extensor_carpi)/],
      ['cervical', /^(Vertebra_L|Sacrum|Femur)/],
    ];
    for (const [id, re] of leaks) {
      const found = [...resolveRegionMeshes(REGIONS[id], ALL_NAMES)].filter((n) => re.test(n));
      expect(`${id}: ${found.join(', ')}`).toBe(`${id}: `);
    }
  });
});

describe('region falloff', () => {
  it('every limb/spine region defines a slab that contains its own joint', () => {
    // The landmark each region is built around (world metres, measured with
    // scripts/measure-landmarks.mts). If a fade band ever drifts off its own
    // joint, the region would dissolve the thing it exists to show.
    const JOINT_Y: Record<string, number> = {
      shoulder: 1.36,
      elbow: 1.1,
      cervical: 1.49,
      thoracic: 1.29,
      lumbar: 1.05,
      hip: 0.87,
      knee: 0.44,
      ankle: 0.09,
    };
    for (const [id, y] of Object.entries(JOINT_Y)) {
      const fade = resolveRegionFade(REGIONS[id]);
      expect(fade, `${id} has no fade`).not.toBeNull();
      expect(y, `${id} joint below its slab`).toBeGreaterThan(fade!.min);
      expect(y, `${id} joint above its slab`).toBeLessThan(fade!.max);
    }
  });

  it('never hands an infinite edge to the shader', () => {
    // The slab goes into a GLSL smoothstep, and smoothstep(inf, inf + soft, y)
    // is NaN, which poisons the fragment alpha: with Infinity for the open ends,
    // the shoulder (open at the top) and the ankle (open at the bottom) rendered
    // as flat black silhouettes.
    for (const id of Object.keys(REGIONS)) {
      const fade = resolveRegionFade(REGIONS[id]);
      if (!fade) continue;
      for (const [k, v] of Object.entries(fade)) {
        expect(Number.isFinite(v), `${id}.${k} = ${v}`).toBe(true);
      }
    }
  });

  it('an open-ended slab keeps its own region fully lit', () => {
    // Mirrors the shader: alpha = smoothstep(lo) * (1 - smoothstep(hi)).
    const smoothstep = (a: number, b: number, x: number) => {
      const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const alphaAt = (id: string, y: number) => {
      const f = resolveRegionFade(REGIONS[id])!;
      return (
        smoothstep(f.min - f.soft, f.min, y) * (1 - smoothstep(f.max, f.max + f.soft, y))
      );
    };
    expect(alphaAt('shoulder', 1.36)).toBe(1); // glenohumeral joint, open above
    expect(alphaAt('ankle', 0.09)).toBe(1); // talocrural mortise, open below
    expect(alphaAt('hip', 0.87)).toBe(1); // acetabulum, closed both ends
    // ...and the far end of the limb really is gone.
    expect(alphaAt('hip', 0.44)).toBe(0); // the knee
    expect(alphaAt('knee', 0.09)).toBe(0); // the ankle
  });
});
