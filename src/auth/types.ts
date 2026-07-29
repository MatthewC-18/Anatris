// src/auth/types.ts
//
// Provider-agnostic auth + billing contract. The rest of the app depends ONLY
// on these types, never on Supabase or Stripe directly. Two implementations
// satisfy this contract:
//   - mockProvider:     localStorage-backed, works with zero configuration so
//                       the whole sign-in / paywall / upgrade funnel is
//                       demoable and testable today.
//   - supabaseProvider: real Supabase Auth + a Stripe Checkout edge function,
//                       activated automatically when the VITE_SUPABASE_* env
//                       vars are present.
// Swapping the backend later is a one-file change behind this seam.

import type { StudyCloud } from '../lib/studyState';

/** Billing period the user picks at checkout. */
export type BillingInterval = 'monthly' | 'annual';

/** The signed-in user, reduced to what the UI needs. */
export interface AuthUser {
  id: string;
  email: string;
}

/** Subscription state, mirrored from Stripe (via the backend) or the mock. */
export interface Subscription {
  /** 'premium' once a paid plan is active; null on the free tier. */
  plan: 'premium' | null;
  /** Lifecycle status. 'none' = never subscribed. */
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';
  /** ISO date the current paid period ends, when known. */
  currentPeriodEnd?: string;
}

/** A full snapshot of auth state emitted to subscribers. */
export interface AuthSnapshot {
  user: AuthUser | null;
  subscription: Subscription;
}

export const FREE_SUBSCRIPTION: Subscription = { plan: null, status: 'none' };

/** Result of a credential operation, so the UI can show a friendly error. */
export interface AuthResult {
  ok: boolean;
  /** User-facing (Spanish) error message when ok is false. */
  error?: string;
  /** User-facing (Spanish) confirmation message when ok is true (e.g. "revisa tu correo"). */
  message?: string;
}

/**
 * The contract every backend implements. Methods are async and never throw for
 * expected failures (bad password, email taken): they resolve an AuthResult so
 * the UI handles them uniformly.
 */
export interface AuthBackend {
  /** Human label shown in dev so it's obvious which backend is live. */
  readonly name: 'mock' | 'supabase';

  /** Resolve the initial snapshot (e.g. restore an existing session). */
  init(): Promise<AuthSnapshot>;

  /**
   * Re-resolve the current snapshot on demand (same shape as init). Used after
   * returning from Stripe Checkout to pick up the webhook's subscription write
   * without waiting for a page reload or an auth event.
   */
  refresh(): Promise<AuthSnapshot>;

  /** Subscribe to snapshot changes. Returns an unsubscribe function. */
  onChange(cb: (snap: AuthSnapshot) => void): () => void;

  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;

  /**
   * Federated sign-in with Google (OAuth). In production this redirects the
   * browser to Google and back; the mock signs a demo Google account in
   * immediately so the funnel is demoable without OAuth configured.
   */
  signInWithGoogle(): Promise<AuthResult>;

  /**
   * Send a password-recovery email. Resolves ok even when we can't confirm the
   * address exists (to avoid leaking which emails are registered); the UI shows
   * a neutral "revisa tu correo" message from `message`.
   */
  resetPassword(email: string): Promise<AuthResult>;

  /**
   * Set a new password for the CURRENTLY authenticated session. Used both after
   * following a recovery link (recovery session) and from the account menu.
   */
  updatePassword(newPassword: string): Promise<AuthResult>;

  /**
   * Subscribe to the "arrived via a password-recovery link" event so the app can
   * prompt the user to choose a new password. Returns an unsubscribe function.
   * Optional: the mock has no real recovery flow and omits it.
   */
  onPasswordRecovery?(cb: () => void): () => void;

  /**
   * Begin the upgrade flow for the chosen billing period (default: monthly) and
   * optional currency (a lowercase ISO code the Stripe price supports via
   * currency_options; omitted -> the price's default currency). In production
   * this redirects to Stripe Checkout; in the mock it immediately grants premium
   * so the funnel can be demoed.
   */
  startCheckout(interval?: BillingInterval, currency?: string): Promise<AuthResult>;

  /** Open the billing/management portal (Stripe portal in production). */
  manageBilling?(): Promise<AuthResult>;

  /**
   * Cloud transport for syncing study progress to the user's account, or null
   * when this backend has none (e.g. the mock, where progress stays local).
   * Returned lazily so it can capture the live session.
   */
  studyCloud?(): StudyCloud | null;
}
