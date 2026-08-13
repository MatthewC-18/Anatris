// Orthopedic-test demos have to be DIFFERENT MANEUVERS.
//
// A physiotherapist reviewing the lab said the tests all do the same thing and
// he could not tell them apart. He was right, and it was measurable: six of the
// fourteen shoulder tests posed the rig at "abduct to 90" and nothing else, and
// three at "flex to 90". Everything that distinguishes them -- Hawkins' forced
// internal rotation, the apprehension position's external rotation, Jobe's
// thumb-down -- lived only in the note TEXT.
//
// scripts/measure-test-poses.mts measures the poses on the real rig. These tests
// guard the DATA, so a new test cannot be added as a bare base movement and a
// component cannot be quietly dropped.

import { describe, it, expect } from 'vitest';
import { ORTHOPEDIC_TESTS_BY_REGION } from '../orthopedicTests';
import { getBoneControl } from '../../lib/boneMap';

const shoulder = ORTHOPEDIC_TESTS_BY_REGION.shoulder ?? [];

/**
 * Maneuvers that genuinely share a limb position. Not a loophole -- these are
 * clinical facts, and each one's note says so:
 *   - the painful arc and the drop-arm test are both 90 deg of abduction; what
 *     differs is that one is an active ascent and the other a controlled descent;
 *   - apprehension, relocation and surprise-release are three steps AT one
 *     position, differing only in what the examiner's hand does.
 */
const SHARED_POSITION_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['painful-arc', 'drop-arm'],
  ['apprehension', 'relocation'],
  ['apprehension', 'surprise-release'],
  ['relocation', 'surprise-release'],
];
/** Sorted, so a lookup never depends on which order the caller happens to use. */
const pairKey = (a: string, b: string) => [a, b].sort().join('|');
const SHARED_POSITION: ReadonlySet<string> = new Set(
  SHARED_POSITION_PAIRS.map(([a, b]) => pairKey(a, b)),
);

/** The demo's full recipe, as a comparable signature. */
function signature(t: (typeof shoulder)[number]): string {
  const d = t.demo!;
  const comps = (d.components ?? [])
    .map((c) => `${c.movementId}@${c.angleDeg}`)
    .sort()
    .join(',');
  return `${d.movementId}@${d.angleDeg}|${comps}`;
}

describe('orthopedic test demos', () => {
  const withDemo = shoulder.filter((t) => t.demo);

  it('has demos for the shoulder tests', () => {
    expect(withDemo.length).toBeGreaterThan(10);
  });

  it('never gives two tests the same maneuver unless they clinically share one', () => {
    const bySig = new Map<string, string[]>();
    for (const t of withDemo) {
      const sig = signature(t);
      bySig.set(sig, [...(bySig.get(sig) ?? []), t.id]);
    }
    const unexplained: string[] = [];
    for (const ids of bySig.values()) {
      if (ids.length < 2) continue;
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const pair = pairKey(ids[i], ids[j]);
          if (!SHARED_POSITION.has(pair)) unexplained.push(pair);
        }
    }
    expect(unexplained, 'tests with an identical maneuver and no clinical reason').toEqual([]);
  });

  it('explains itself whenever two maneuvers DO share a position', () => {
    // If the app is going to show the same pose twice, it has to say why, or the
    // user is left with the original complaint.
    for (const pair of SHARED_POSITION_PAIRS) {
      for (const id of pair) {
        const t = withDemo.find((x) => x.id === id);
        expect(t, `${id} must exist`).toBeDefined();
        const note = t!.demo!.note ?? '';
        expect(note.toLowerCase(), `${id} must explain the shared position`)
          .toMatch(/misma posición|comparte posición/);
      }
    }
  });

  it('only names components the rig can actually drive', () => {
    // A component naming a chain (or a typo) is silently skipped at runtime, so
    // the maneuver quietly reverts to its bare base movement -- the exact bug
    // being fixed. Components must be single-joint movements.
    for (const t of withDemo) {
      for (const c of t.demo!.components ?? []) {
        const ctrl = getBoneControl(c.movementId);
        expect(ctrl, `${t.id}: unknown component ${c.movementId}`).toBeDefined();
        expect(ctrl?.kind, `${t.id}: ${c.movementId} must be a joint, not a ${ctrl?.kind}`)
          .toBe('joint');
      }
    }
  });

  it('keeps every component angle inside that movement’s clinical range', () => {
    for (const t of withDemo) {
      for (const c of t.demo!.components ?? []) {
        const ctrl = getBoneControl(c.movementId);
        if (ctrl?.kind !== 'joint') continue;
        expect(Math.abs(c.angleDeg), `${t.id}: ${c.movementId} ${c.angleDeg}`)
          .toBeLessThanOrEqual(ctrl.clinicalRange.max);
      }
    }
  });

  it('separates the two tests that used to be one pose: Neer and Hawkins', () => {
    // Both are flexion. Hawkins is what it is because of the forced internal
    // rotation with the elbow at 90 -- if that ever goes, the two collapse.
    const neer = withDemo.find((t) => t.id === 'neer')!;
    const hawkins = withDemo.find((t) => t.id === 'hawkins-kennedy')!;
    expect(signature(neer)).not.toBe(signature(hawkins));
    const hawkinsComps = (hawkins.demo!.components ?? []).map((c) => c.movementId);
    expect(hawkinsComps).toContain('elbow-flexion');
    expect(hawkinsComps).toContain('glenohumeral-internal-rotation');
  });
});
