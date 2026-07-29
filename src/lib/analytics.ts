// src/lib/analytics.ts
//
// Funnel analytics (PostHog). The ONE place that touches the analytics SDK, so
// the rest of the app fires typed, named events and never imports posthog-js
// directly.
//
// LAZY: posthog-js (~60 KB gzip) is dynamically imported, and ONLY when a key is
// configured, so it never weighs down the deliberately-light landing (which also
// code-splits three.js off the initial load). Events fired before the SDK finishes
// loading are queued and flushed on ready, so nothing early is lost.
//
// PRIVACY-FIRST for a health-adjacent product:
//   - OFF unless VITE_POSTHOG_KEY is set (local/dev and un-configured builds send
//     nothing),
//   - NO autocapture (only the explicit funnel events below, never every click),
//   - NO session recording,
//   - person profiles only for IDENTIFIED (signed-in) users,
//   - we never send patient content or clinical selections -- only sales-funnel
//     steps and the region id.
//
// The key (phc_...) is a PUBLISHABLE client token by design (it can only send
// events, not read data), but it still lives in an env var so it is not baked
// into source and can differ per environment. Set it in your .env:
//   VITE_POSTHOG_KEY=phc_xxx
//   VITE_POSTHOG_HOST=https://us.i.posthog.com   (or https://eu.i.posthog.com)

import type { PostHog } from 'posthog-js';

/** The sales-funnel events, one source of truth. */
export const EVENTS = {
  landingViewed: 'landing_viewed',
  enterApp: 'enter_app',
  signUp: 'sign_up',
  signIn: 'sign_in',
  paywallViewed: 'paywall_viewed',
  checkoutStarted: 'checkout_started',
  premiumActivated: 'premium_activated',
} as const;

export type FunnelEvent = (typeof EVENTS)[keyof typeof EVENTS];

let ph: PostHog | null = null;
let enabled = false;
const queue: Array<(p: PostHog) => void> = [];

/** Run against the SDK, or queue until it finishes loading. No-op when disabled. */
function withPosthog(fn: (p: PostHog) => void): void {
  if (!enabled) return;
  if (ph) fn(ph);
  else queue.push(fn);
}

/** Initialize analytics once at startup. No-op when no key is configured. */
export function initAnalytics(): void {
  if (enabled) return;
  if (import.meta.env.DEV) return; // never pollute the funnel with local dev traffic
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return; // analytics disabled (no key)
  const host = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com';
  enabled = true; // from now on, events queue until the SDK is ready
  import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: host,
        autocapture: false,
        capture_pageview: true,
        disable_session_recording: true,
        person_profiles: 'identified_only',
      });
      ph = posthog;
      for (const fn of queue) fn(posthog);
      queue.length = 0;
    })
    .catch(() => {
      enabled = false;
      queue.length = 0;
    });
}

/** Fire a funnel event with optional properties. Safe no-op when disabled. */
export function track(event: FunnelEvent, props?: Record<string, unknown>): void {
  withPosthog((p) => p.capture(event, props));
}

/** Tie subsequent events to a signed-in user (id + non-sensitive traits). */
export function identifyUser(id: string, traits?: Record<string, unknown>): void {
  withPosthog((p) => p.identify(id, traits));
}

/** Clear identity on sign-out so the next visitor is a fresh anonymous user. */
export function resetAnalytics(): void {
  withPosthog((p) => p.reset());
}
