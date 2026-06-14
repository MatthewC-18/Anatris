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
import { createMockBackend } from './mockProvider';
import { createSupabaseBackend } from './supabaseProvider';
import { canAccessRegion, isPremiumActive, type Plan } from './entitlements';

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

interface AuthContextValue {
  loading: boolean;
  snapshot: AuthSnapshot;
  /** 'mock' or 'supabase' — handy for a dev badge. */
  backend: AuthBackend['name'];
  signIn: AuthBackend['signIn'];
  signUp: AuthBackend['signUp'];
  signOut: AuthBackend['signOut'];
  startCheckout: AuthBackend['startCheckout'];
  manageBilling: () => Promise<AuthResult>;
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
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [backend]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      snapshot,
      backend: backend.name,
      signIn: backend.signIn.bind(backend),
      signUp: backend.signUp.bind(backend),
      signOut: backend.signOut.bind(backend),
      startCheckout: backend.startCheckout.bind(backend),
      manageBilling: backend.manageBilling
        ? backend.manageBilling.bind(backend)
        : async () => ({ ok: false, error: 'No disponible.' }),
    }),
    [backend, loading, snapshot],
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
}

/** Derived access info for the current user. */
export function useEntitlement(): Entitlement {
  const { snapshot } = useAuth();
  const sub = snapshot.subscription;
  return useMemo<Entitlement>(() => {
    const isPremium = isPremiumActive(sub);
    return {
      plan: isPremium ? 'premium' : 'free',
      isPremium,
      subscription: sub,
      canAccessRegion: (region: string) => canAccessRegion(region, sub),
    };
  }, [sub]);
}
