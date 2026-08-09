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

/**
 * Every event the app can fire, in one place.
 *
 * TWO FAMILIES, and the distinction is the whole point:
 *
 *   FUNNEL  — did the visitor buy? (landing -> enter -> sign up -> checkout)
 *   PRODUCT — what did they actually DO once inside?
 *
 * The funnel half existed alone for a long time, which meant every question
 * about the product ("is the movement lab used at all?", "does anyone finish an
 * exam?", "which region should get content next?") could only be answered with
 * an opinion. The product half exists so those become measurable.
 *
 * WHAT WE DELIBERATELY DO NOT SEND: no free text, no muscle notes, no patient
 * card contents, no exam answers, no study grades — only WHICH region / mode /
 * movement / test id was opened. Ids are a fixed, public vocabulary from the
 * repo's own data files, so nothing here can carry personal or clinical
 * information about a real person. Keep it that way when adding events.
 */
export const EVENTS = {
  // ---- Sales funnel ----
  landingViewed: 'landing_viewed',
  enterApp: 'enter_app',
  signUp: 'sign_up',
  signIn: 'sign_in',
  paywallViewed: 'paywall_viewed',
  checkoutStarted: 'checkout_started',
  premiumActivated: 'premium_activated',

  // ---- Product usage ----
  /** A region was opened. props: { region } */
  regionOpened: 'region_opened',
  /** A mode (explorar/aprender/estudiar/movimiento) was opened. props: { mode, region } */
  modeOpened: 'mode_opened',
  /** A movement was selected in the lab — NOT fired per drag frame. props: { region, movement } */
  movementDriven: 'movement_driven',
  /** A pathological preset was applied. props: { movement, pathology } */
  pathologySelected: 'pathology_selected',
  /** The rig was dissected or isolated. props: { action } */
  dissectionUsed: 'dissection_used',
  /** An orthopedic test card was expanded. props: { region, test } */
  testOpened: 'test_opened',
  /** Exam mode (predict/reveal) was switched on. props: { region } */
  examModeStarted: 'exam_mode_started',
  /** The neuro panel was opened. props: { region } */
  neuroOpened: 'neuro_opened',
  /** First finding recorded in a segmental screen. Fired ONCE per screen, so it
   *  counts exams started rather than taps. props: { region } */
  neuroScreenGraded: 'neuro_screen_graded',
  /** A screen was copied out for the record -- the strongest signal that neuro is
   *  used clinically and not just browsed. props: { region, roots } */
  neuroScreenCopied: 'neuro_screen_copied',
  /** A study tab was opened. props: { region, tab } */
  studyTabOpened: 'study_tab_opened',
  /** A patient card was exported. props: { region, movement } */
  patientCardExported: 'patient_card_exported',
  /** The clinical-evidence screen was opened. props: { region } */
  evidenceOpened: 'evidence_opened',
  /** The quick guide was opened. props: { region, mode } */
  guideOpened: 'guide_opened',
  /** Something was saved to "Mi colección". props: { kind, region } */
  itemSaved: 'item_saved',
} as const;

export type AppEvent = (typeof EVENTS)[keyof typeof EVENTS];

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

/** Fire an event with optional properties. Safe no-op when disabled. */
export function track(event: AppEvent, props?: Record<string, unknown>): void {
  withPosthog((p) => p.capture(event, props));
}

/**
 * Fire an event only when its payload CHANGED since the last call for that
 * event. Product signals live on state that React re-runs freely (a region is
 * "opened" on every render of an effect, a movement stays selected while the
 * user drags for a minute), and without this the same fact would be counted
 * dozens of times and every per-user average would be meaningless.
 *
 * Keyed per event name, in module scope: it is deliberately per page-load, so
 * coming back to the shoulder tomorrow counts again.
 */
const lastPayload = new Map<AppEvent, string>();

export function trackChange(event: AppEvent, props: Record<string, unknown>): void {
  const key = JSON.stringify(props);
  if (lastPayload.get(event) === key) return;
  lastPayload.set(event, key);
  track(event, props);
}

/** Tie subsequent events to a signed-in user (id + non-sensitive traits). */
export function identifyUser(id: string, traits?: Record<string, unknown>): void {
  withPosthog((p) => p.identify(id, traits));
}

/** Clear identity on sign-out so the next visitor is a fresh anonymous user. */
export function resetAnalytics(): void {
  withPosthog((p) => p.reset());
}
