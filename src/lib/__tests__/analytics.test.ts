// src/lib/__tests__/analytics.test.ts
//
// Guards for the event DICTIONARY, not for PostHog itself.
//
// Why this is worth a test: an analytics event name is a silent contract. A
// duplicated value means two different actions land in the same funnel bucket
// and every number derived from it is wrong — and nothing in the app would ever
// throw. A typo in a name means a dashboard that stays empty forever and gets
// read as "nobody uses this feature". Both failures are invisible at runtime
// and expensive to discover months later, which is exactly what a test is for.

import { describe, expect, it } from 'vitest';
import { EVENTS, trackChange, track } from '../analytics';

describe('event dictionary', () => {
  it('has no duplicated event values', () => {
    const values = Object.values(EVENTS);
    expect(new Set(values).size).toBe(values.length);
  });

  it('names every event in snake_case', () => {
    for (const value of Object.values(EVENTS)) {
      expect(value).toMatch(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/);
    }
  });

  it('keeps the funnel events stable', () => {
    // These seven are already wired into dashboards; renaming one silently
    // breaks historical continuity, so changing this list must be deliberate.
    expect(EVENTS.landingViewed).toBe('landing_viewed');
    expect(EVENTS.enterApp).toBe('enter_app');
    expect(EVENTS.signUp).toBe('sign_up');
    expect(EVENTS.signIn).toBe('sign_in');
    expect(EVENTS.paywallViewed).toBe('paywall_viewed');
    expect(EVENTS.checkoutStarted).toBe('checkout_started');
    expect(EVENTS.premiumActivated).toBe('premium_activated');
  });
});

describe('track / trackChange when analytics is disabled', () => {
  // No VITE_POSTHOG_KEY is configured under test, so the SDK never loads. Both
  // helpers must stay silent no-ops rather than throwing: they are called from
  // render effects and from the dissect channel, where an exception would take
  // the 3D view down with it.
  it('does not throw', () => {
    expect(() => track(EVENTS.regionOpened, { region: 'shoulder' })).not.toThrow();
    expect(() => trackChange(EVENTS.regionOpened, { region: 'shoulder' })).not.toThrow();
    expect(() => trackChange(EVENTS.regionOpened, { region: 'shoulder' })).not.toThrow();
    expect(() => trackChange(EVENTS.regionOpened, { region: 'knee' })).not.toThrow();
  });
});
