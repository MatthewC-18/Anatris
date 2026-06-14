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

  /** Subscribe to snapshot changes. Returns an unsubscribe function. */
  onChange(cb: (snap: AuthSnapshot) => void): () => void;

  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;

  /**
   * Begin the upgrade flow. In production this redirects to Stripe Checkout;
   * in the mock it immediately grants premium so the funnel can be demoed.
   */
  startCheckout(): Promise<AuthResult>;

  /** Open the billing/management portal (Stripe portal in production). */
  manageBilling?(): Promise<AuthResult>;
}
