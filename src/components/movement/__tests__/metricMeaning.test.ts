// What a sensitivity / specificity figure is TOLD to mean.
//
// The panel used to print "79% (alta)" next to the mnemonic SnNout and assume
// the rest, and a physio reviewing it wrote "no está muy entendible lo de
// especificidad y sensibilidad". The sentences under test are what replaced
// that. The arithmetic is trivial and the wording is the point: it has to count
// the people the test gets WRONG, because that is the half that decides whether
// a result can be acted on.

import { describe, it, expect } from 'vitest';
import { metricMeaning } from '../OrthopedicTestsPanel';

describe('metricMeaning', () => {
  it('says who a sensitive test MISSES', () => {
    const text = metricMeaning('sens', 79)!;
    expect(text).toContain('SÍ tienen la lesión');
    expect(text).toContain('79');
    expect(text).toContain('21'); // the ones it lets through
  });

  it('says who a specific test wrongly FLAGS', () => {
    const text = metricMeaning('espec', 59)!;
    expect(text).toContain('NO la tienen');
    expect(text).toContain('59');
    expect(text).toContain('41'); // the false positives
    expect(text).toContain('falso positivo');
  });

  it('rounds rather than printing a decimal at a patient', () => {
    expect(metricMeaning('sens', 72.4)).toContain('72');
    expect(metricMeaning('sens', 72.4)).toContain('28');
  });

  it('handles the extremes without a negative count', () => {
    expect(metricMeaning('sens', 100)).toContain('0');
    expect(metricMeaning('espec', 0)).toContain('100');
  });

  it('says nothing when the test reports no figure', () => {
    // A test with no published metric must stay silent rather than imply 0%.
    expect(metricMeaning('sens', undefined)).toBeNull();
    expect(metricMeaning('espec', Number.NaN)).toBeNull();
  });
});
