// src/lib/__tests__/neuroScreen.test.ts
//
// The localiser makes clinical claims, so the claims are what gets tested -- not
// the arithmetic. Each case below is a sentence a physio would recognise, and
// three of them guard the refusals that matter more than the ranking: a brisk
// reflex must never be scored as segmental evidence, a screen that fails to
// separate two levels must say so, and a ranked root must never be presented as
// having excluded the nerve that imitates it.

import { describe, expect, it } from 'vitest';
import {
  EMPTY_FINDING,
  isScreenEmpty,
  localizeRoot,
  screenSummary,
  type NeuroScreenState,
} from '../neuroScreen';
import { CERVICAL_NEURO } from '../../data/neuro/cervical';
import { LUMBOSACRAL_NEURO } from '../../data/neuro/lumbosacral';

const CERV = CERVICAL_NEURO.roots;
const LUMB = LUMBOSACRAL_NEURO.roots;

/** Shorthand: a screen from a sparse map of grades. */
function screenOf(entries: NeuroScreenState): NeuroScreenState {
  return entries;
}

describe('an empty screen', () => {
  it('is empty and concludes nothing', () => {
    expect(isScreenEmpty({})).toBe(true);
    expect(isScreenEmpty({ C7: { ...EMPTY_FINDING } })).toBe(true);
    const l = localizeRoot(CERV, {});
    expect(l.leading).toBeNull();
    expect(l.caveats).toEqual([]);
  });
});

describe('a normal screen', () => {
  it('says so, and does not invent a level', () => {
    const l = localizeRoot(
      CERV,
      screenOf({
        C7: { sensation: 2, strength: 5, reflex: 2 },
        C6: { sensation: 2, strength: 5, reflex: 2 },
      }),
    );
    expect(l.leading).toBeNull();
    expect(l.caveats.map((c) => c.id)).toEqual(['nothing-abnormal']);
  });
});

describe('a full radicular pattern', () => {
  // The classic C7: numb middle finger, weak triceps, damped triceps reflex.
  const c7 = screenOf({
    C7: { sensation: 1, strength: 4, reflex: 1 },
    C6: { sensation: 2, strength: 5, reflex: 2 },
    C5: { sensation: 2, strength: 5, reflex: 2 },
  });

  it('leads with the level and calls the pattern complete', () => {
    const l = localizeRoot(CERV, c7);
    expect(l.leading?.root.id).toBe('C7');
    expect(l.leading?.extent).toBe('completo');
    expect(l.leading?.affectedAxes).toBe(3);
    expect(l.contenders.map((c) => c.root.id)).toEqual(['C7']);
    expect(l.caveats).toEqual([]);
  });

  it('keeps the peripheral mimic attached to it', () => {
    // The whole point: ranking C7 does not exclude a radial neuropathy.
    const l = localizeRoot(CERV, c7);
    expect(l.leading?.root.mimic?.nerve).toContain('radial');
  });

  it('ranks every root, worst first, and never drops one', () => {
    const l = localizeRoot(CERV, c7);
    expect(l.ranked).toHaveLength(CERV.length);
    expect(l.ranked[0].root.id).toBe('C7');
    for (let i = 1; i < l.ranked.length; i++) {
      expect(l.ranked[i].score).toBeLessThanOrEqual(l.ranked[i - 1].score);
    }
  });
});

describe('a partial pattern', () => {
  it('is called partial, not complete, on two of three axes', () => {
    const l = localizeRoot(CERV, screenOf({ C6: { sensation: 1, strength: 4, reflex: 2 } }));
    expect(l.leading?.root.id).toBe('C6');
    expect(l.leading?.extent).toBe('parcial');
  });

  it('is called isolated on one axis', () => {
    const l = localizeRoot(CERV, screenOf({ C6: { sensation: 1, strength: null, reflex: null } }));
    expect(l.leading?.extent).toBe('aislado');
  });

  it('counts a reflexless root as complete on its own two axes', () => {
    // L5 has no reflex of its own, so two affected axes IS its whole pattern --
    // scoring it out of three would permanently rank the root that is most often
    // missed below every root that has a tendon to tap.
    const l = localizeRoot(LUMB, screenOf({ L5: { sensation: 1, strength: 4, reflex: null } }));
    expect(l.leading?.root.id).toBe('L5');
    expect(l.leading?.extent).toBe('completo');
  });
});

describe('hyperreflexia', () => {
  const brisk = screenOf({ C7: { sensation: null, strength: null, reflex: 4 } });

  it('scores nothing segmentally', () => {
    const l = localizeRoot(CERV, brisk);
    expect(l.ranked.find((r) => r.root.id === 'C7')?.score).toBe(0);
    expect(l.leading).toBeNull();
  });

  it('is reported as a sign above the root', () => {
    const l = localizeRoot(CERV, brisk);
    const ids = l.caveats.map((c) => c.id);
    expect(ids).toContain('upper-motor-neuron');
    // And it must NOT be filed as a normal screen, which is the inversion this
    // guards: a clonic reflex is the opposite of a reassuring finding.
    expect(ids).not.toContain('nothing-abnormal');
  });

  it('does not outrank a real radicular pattern', () => {
    const l = localizeRoot(
      CERV,
      screenOf({
        C5: { sensation: 1, strength: 3, reflex: 1 },
        C7: { sensation: null, strength: null, reflex: 3 },
      }),
    );
    expect(l.leading?.root.id).toBe('C5');
  });
});

describe('a screen that does not isolate a level', () => {
  it('says so instead of picking a winner by one grade', () => {
    const l = localizeRoot(
      CERV,
      screenOf({
        C6: { sensation: 1, strength: null, reflex: null },
        C7: { sensation: 1, strength: null, reflex: null },
      }),
    );
    expect(l.contenders.map((c) => c.root.id).sort()).toEqual(['C6', 'C7']);
    expect(l.caveats.map((c) => c.id)).toContain('multi-root');
  });

  it('keeps the authored proximal-to-distal order on a tie', () => {
    // Stability matters: the readout must not reshuffle two equal levels between
    // renders, or the "leading" root flickers.
    const tie = screenOf({
      C6: { sensation: 1, strength: null, reflex: null },
      C7: { sensation: 1, strength: null, reflex: null },
    });
    const a = localizeRoot(CERV, tie).ranked.map((r) => r.root.id);
    const b = localizeRoot(CERV, tie).ranked.map((r) => r.root.id);
    expect(a).toEqual(b);
    expect(a.indexOf('C6')).toBeLessThan(a.indexOf('C7'));
  });
});

describe('the record line', () => {
  it('is empty until something is recorded', () => {
    expect(screenSummary(CERV, {}, CERVICAL_NEURO.title)).toBe('');
  });

  it('carries the grades, the level and what to rule out', () => {
    const text = screenSummary(
      CERV,
      screenOf({ C7: { sensation: 1, strength: 4, reflex: 1 } }),
      CERVICAL_NEURO.title,
    );
    expect(text).toContain('C7: sensibilidad alterada, fuerza 4/5, reflejo 1/4');
    expect(text).toContain('Patrón completo compatible con C7');
    expect(text).toContain('A descartar');
    expect(text).toContain('No sustituye la valoración médica');
  });

  it('omits a reflex grade for a root that has no reflex', () => {
    const text = screenSummary(
      LUMB,
      screenOf({ L5: { sensation: 1, strength: 5, reflex: 3 } }),
      LUMBOSACRAL_NEURO.title,
    );
    expect(text).toContain('L5: sensibilidad alterada, fuerza 5/5');
    expect(text).not.toContain('reflejo');
  });
});

describe('a reflex grade on a root with no reflex', () => {
  // The UI cannot produce this (the reflex scale only renders for roots that have
  // one) but the state shape can hold it, and scoring and caveats must read the
  // field by the SAME rule. They did not: the summary correctly dropped the grade
  // while the caveat announced hyperreflexia at L5, which has no tendon to tap.
  const stray = screenOf({ L5: { sensation: null, strength: null, reflex: 4 } });

  it('is ignored by the score and by the caveats alike', () => {
    const l = localizeRoot(LUMB, stray);
    expect(l.ranked.find((r) => r.root.id === 'L5')?.score).toBe(0);
    expect(l.caveats.map((c) => c.id)).not.toContain('upper-motor-neuron');
  });

  it('still triggers the flag for a root that does have a reflex', () => {
    const l = localizeRoot(LUMB, screenOf({ S1: { sensation: null, strength: null, reflex: 4 } }));
    expect(l.caveats.map((c) => c.id)).toContain('upper-motor-neuron');
  });
});
