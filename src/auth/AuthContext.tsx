// src/auth/AuthContext.tsx
//
// React wiring around the AuthBackend seam. It selects the backend ONCE at
// startup (Supabase when configured, otherwise the mock), restores any existing
// session, subscribes to changes, and exposes everything through useAuth().
//
// Components never touch a backend directly — they call useAuth() / useEntitlement()
// so the app is identical whether it runs on the mock or on real Supabase.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthBackend, AuthResult, AuthSnapshot, Subscription } from './types';
import { FREE_SUBSCRIPTION } from './types';
import type { StudyCloud } from '../lib/studyState';
import { createMockBackend } from './mockProvider';
import { createSupabaseBackend } from './supabaseProvider';
import {
  canAccessRegion,
  canUseFeature,
  isPremiumActive,
  type Plan,
  type PremiumFeature,
} from './entitlements';
import { hasAllAccess } from './devAccess';
import { EVENTS, identifyUser, resetAnalytics, track } from '../lib/analytics';
import type { PremiumFetcher } from '../lib/premiumContent';
import { clearPremiumRegions, type PremiumRegionPayload } from '../data/premiumStore';

/** True when the Supabase env vars are present at build time. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  );
}

/** Build the active backend. Falls back to the mock when unconfigured. */
function resolveBackend(): AuthBackend {
  if (isSupabaseConfigured()) {
    return createSupabaseBackend(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    );
  }
  return createMockBackend();
}

/** A one-shot notice to surface after returning from Stripe Checkout. */
export type CheckoutNotice = 'cancel' | null;

interface AuthContextValue {
  loading: boolean;
  snapshot: AuthSnapshot;
  /** 'mock' or 'supabase' — handy for a dev badge. */
  backend: AuthBackend['name'];
  /** Set to 'cancel' when the user returns from an abandoned checkout. */
  checkoutNotice: CheckoutNotice;
  /** Dismiss the checkout notice (e.g. after the toast auto-hides). */
  clearCheckoutNotice: () => void;
  signIn: AuthBackend['signIn'];
  signUp: AuthBackend['signUp'];
  signOut: AuthBackend['signOut'];
  /**
   * Fetch a premium region's clinical library from the entitlement-checked
   * endpoint, or null when this backend has none (mock / demo mode, where
   * lib/premiumContent falls back to the bundled library in dev).
   */
  fetchPremiumRegion: PremiumFetcher | null;
  signInWithGoogle: AuthBackend['signInWithGoogle'];
  resetPassword: AuthBackend['resetPassword'];
  updatePassword: AuthBackend['updatePassword'];
  startCheckout: AuthBackend['startCheckout'];
  manageBilling: () => Promise<AuthResult>;
  /** Re-fetch the snapshot on demand (e.g. after returning from Checkout). */
  refresh: () => Promise<void>;
  /**
   * True when the user opened the app via a password-recovery link and must
   * choose a new password. The app surfaces a "set new password" dialog.
   */
  recoveryMode: boolean;
  /** Dismiss the recovery prompt (after setting a password or cancelling). */
  clearRecovery: () => void;
  /** Cloud transport for study-progress sync, or null on the local-only mock. */
  studyCloud: StudyCloud | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const EMPTY_SNAPSHOT: AuthSnapshot = { user: null, subscription: FREE_SUBSCRIPTION };

export function AuthProvider({ children }: { children: ReactNode }) {
  // The backend is created once and kept stable for the app's lifetime.
  const backendRef = useRef<AuthBackend | null>(null);
  if (backendRef.current === null) backendRef.current = resolveBackend();
  const backend = backendRef.current;

  const [snapshot, setSnapshot] = useState<AuthSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [checkoutNotice, setCheckoutNotice] = useState<CheckoutNotice>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    let alive = true;
    backend
      .init()
      .then((snap) => {
        if (alive) setSnapshot(snap);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    const unsubscribe = backend.onChange((snap) => {
      if (alive) setSnapshot(snap);
    });
    // Surface the "arrived via recovery link" event so the app can prompt for a
    // new password. No-op on the mock (method omitted).
    const unsubRecovery = backend.onPasswordRecovery
      ? backend.onPasswordRecovery(() => {
          if (alive) setRecoveryMode(true);
        })
      : () => {};
    return () => {
      alive = false;
      unsubscribe();
      unsubRecovery();
    };
  }, [backend]);

  // Post-checkout return: Stripe redirects back to `/?checkout=success|cancel`.
  // The subscription is written by the webhook ASYNCHRONOUSLY, so on `success`
  // we poll refresh() a few times until premium flips on (or we give up), which
  // unlocks the app without the user having to reload. The param is stripped
  // immediately so a manual reload can't re-trigger the poll.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let url: URL;
    try {
      url = new URL(window.location.href);
    } catch {
      return;
    }
    const status = url.searchParams.get('checkout');
    if (!status) return;

    url.searchParams.delete('checkout');
    window.history.replaceState({}, '', url.toString());
    if (status !== 'success') {
      // 'cancel' -> nothing to unlock, but let the UI acknowledge it.
      if (status === 'cancel') setCheckoutNotice('cancel');
      return;
    }

    let alive = true;
    let tries = 0;
    const tick = async (): Promise<void> => {
      if (!alive) return;
      tries += 1;
      const snap = await backend.refresh().catch(() => null);
      if (!alive) return;
      if (snap) {
        setSnapshot(snap);
        if (isPremiumActive(snap.subscription)) return; // premium is live
      }
      if (tries < 8) window.setTimeout(() => void tick(), 1500);
    };
    void tick();
    return () => {
      alive = false;
    };
  }, [backend]);

  // Funnel analytics: identify the user, reset on sign-out, and fire
  // `premium_activated` exactly once when the subscription crosses into premium.
  // Seeded on the first snapshot so an already-premium returning user does NOT
  // count as a fresh activation.
  const prevPremiumRef = useRef(false);
  const seededRef = useRef(false);
  const identifiedRef = useRef<string | null>(null);
  useEffect(() => {
    const user = snapshot.user;
    if (user && identifiedRef.current !== user.id) {
      identifyUser(user.id, { email: user.email });
      identifiedRef.current = user.id;
    } else if (!user && identifiedRef.current) {
      resetAnalytics();
      identifiedRef.current = null;
    }
    const isPremium = isPremiumActive(snapshot.subscription);
    if (seededRef.current && isPremium && !prevPremiumRef.current) {
      track(EVENTS.premiumActivated);
    }
    seededRef.current = true;
    prevPremiumRef.current = isPremium;
  }, [snapshot]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      snapshot,
      backend: backend.name,
      checkoutNotice,
      clearCheckoutNotice: () => setCheckoutNotice(null),
      signIn: async (email: string, password: string) => {
        const res = await backend.signIn(email, password);
        if (res.ok) track(EVENTS.signIn);
        return res;
      },
      signUp: async (email: string, password: string) => {
        const res = await backend.signUp(email, password);
        if (res.ok) track(EVENTS.signUp);
        return res;
      },
      signInWithGoogle: async () => {
        const res = await backend.signInWithGoogle();
        if (res.ok) track(EVENTS.signIn, { method: 'google' });
        return res;
      },
      resetPassword: backend.resetPassword.bind(backend),
      updatePassword: backend.updatePassword.bind(backend),
      // Signing out must also drop the paid clinical library from memory:
      // otherwise a shared machine leaves the next person reading it, and a
      // lapsed subscription would keep rendering a stale copy instead of
      // re-asking the server (and being refused).
      signOut: async () => {
        await backend.signOut();
        clearPremiumRegions();
      },
      fetchPremiumRegion: backend.fetchPremiumRegion
        ? (region: string) =>
            backend.fetchPremiumRegion!(region) as Promise<PremiumRegionPayload>
        : null,
      startCheckout: backend.startCheckout.bind(backend),
      manageBilling: backend.manageBilling
        ? backend.manageBilling.bind(backend)
        : async () => ({ ok: false, error: 'No disponible.' }),
      refresh: async () => {
        const snap = await backend.refresh();
        setSnapshot(snap);
      },
      recoveryMode,
      clearRecovery: () => setRecoveryMode(false),
      studyCloud: backend.studyCloud ? backend.studyCloud() : null,
    }),
    [backend, loading, snapshot, checkoutNotice, recoveryMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}

export interface Entitlement {
  plan: Plan;
  isPremium: boolean;
  subscription: Subscription;
  /** Whether the signed-in user can open a given region. */
  canAccessRegion: (region: string) => boolean;
  /**
   * Whether a named premium capability is unlocked. Use this for anything that
   * is premium even inside the FREE regions (orthopedic tests, neuro, patient
   * mode, the full movement lab...). See src/auth/entitlements.ts.
   */
  canUseFeature: (feature: PremiumFeature) => boolean;
}

/** Derived access info for the current user. */
export function useEntitlement(): Entitlement {
  const { snapshot } = useAuth();
  const sub = snapshot.subscription;
  return useMemo<Entitlement>(() => {
    // Owner all-access override unlocks every region and silences the upgrade
    // prompts, while normal users keep the free/premium funnel intact.
    const override = hasAllAccess();
    const isPremium = override || isPremiumActive(sub);
    return {
      plan: isPremium ? 'premium' : 'free',
      isPremium,
      subscription: sub,
      canAccessRegion: (region: string) =>
        override || canAccessRegion(region, sub),
      canUseFeature: (feature: PremiumFeature) =>
        override || canUseFeature(feature, sub),
    };
  }, [sub]);
}
