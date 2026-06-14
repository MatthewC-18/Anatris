// src/auth/mockProvider.ts
//
// Zero-dependency, localStorage-backed implementation of AuthBackend. It exists
// so the ENTIRE product funnel — sign up, sign in, hit the paywall, "upgrade",
// unlock premium, sign out — works and is testable WITHOUT a Supabase project
// or Stripe keys. It is selected automatically whenever the VITE_SUPABASE_*
// env vars are absent (see AuthContext).
//
// Security note: this is intentionally insecure (passwords are not stored, any
// password is accepted for a known email). It is a development stand-in, never
// a production backend. The real provider is supabaseProvider.ts.

import type {
  AuthBackend,
  AuthResult,
  AuthSnapshot,
  Subscription,
} from './types';
import { FREE_SUBSCRIPTION } from './types';

const USER_KEY = 'anatris.mockauth.user';
const SUB_KEY = 'anatris.mockauth.subscription';

type Listener = (snap: AuthSnapshot) => void;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: state just won't persist. Non-fatal. */
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createMockBackend(): AuthBackend {
  const listeners = new Set<Listener>();

  function snapshot(): AuthSnapshot {
    return {
      user: read(USER_KEY, null),
      subscription: read<Subscription>(SUB_KEY, FREE_SUBSCRIPTION),
    };
  }

  function emit(): void {
    const snap = snapshot();
    listeners.forEach((l) => l(snap));
  }

  return {
    name: 'mock',

    async init() {
      return snapshot();
    },

    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async signIn(email, password): Promise<AuthResult> {
      if (!isValidEmail(email)) {
        return { ok: false, error: 'Introduce un correo válido.' };
      }
      if (password.length < 6) {
        return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
      }
      write(USER_KEY, { id: `mock-${email}`, email });
      emit();
      return { ok: true };
    },

    async signUp(email, password): Promise<AuthResult> {
      // In the mock, sign up and sign in are equivalent.
      return this.signIn(email, password);
    },

    async signOut() {
      try {
        window.localStorage.removeItem(USER_KEY);
      } catch {
        /* ignore */
      }
      emit();
    },

    async startCheckout(): Promise<AuthResult> {
      const user = read<{ id: string } | null>(USER_KEY, null);
      if (!user) {
        return { ok: false, error: 'Inicia sesión para suscribirte.' };
      }
      // Simulate a successful Stripe Checkout: grant premium immediately.
      const sub: Subscription = {
        plan: 'premium',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 864e5).toISOString(),
      };
      write(SUB_KEY, sub);
      emit();
      return { ok: true };
    },

    async manageBilling(): Promise<AuthResult> {
      // Simulate the customer portal: toggle back to free (cancel).
      write(SUB_KEY, FREE_SUBSCRIPTION);
      emit();
      return { ok: true };
    },
  };
}
