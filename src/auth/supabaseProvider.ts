// src/auth/supabaseProvider.ts
//
// Real backend: Supabase Auth for identity + a Stripe Checkout edge function
// for billing. Activated automatically when VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY are set (see AuthContext / isSupabaseConfigured).
//
// Expected backend pieces (see /supabase in the repo for the deployable code):
//   - table `subscriptions` (user_id PK, plan, status, current_period_end),
//     written by the Stripe webhook, readable by the owner via RLS.
//   - edge function `create-checkout` -> returns { url } for Stripe Checkout.
//   - edge function `billing-portal`  -> returns { url } for the Stripe portal.
//
// This file is fully type-checked against @supabase/supabase-js but cannot be
// exercised end-to-end without a live project + keys; the mock covers local
// testing of the funnel.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AuthBackend,
  AuthResult,
  AuthSnapshot,
  AuthUser,
  Subscription,
} from './types';
import { FREE_SUBSCRIPTION } from './types';

/** Shape of a row in the `subscriptions` table. */
interface SubscriptionRow {
  plan: 'premium' | null;
  status: Subscription['status'];
  current_period_end: string | null;
}

/** Translate a raw Supabase auth error into Spanish UI copy. */
function friendly(error: { message?: string } | null): string | undefined {
  if (!error?.message) return undefined;
  const m = error.message.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered')) return 'Ese correo ya está registrado.';
  if (m.includes('password')) return 'La contraseña no cumple los requisitos.';
  return error.message;
}

export function createSupabaseBackend(url: string, anonKey: string): AuthBackend {
  const supabase: SupabaseClient = createClient(url, anonKey);

  async function fetchSubscription(userId: string): Promise<Subscription> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan,status,current_period_end')
      .eq('user_id', userId)
      .maybeSingle<SubscriptionRow>();
    if (error || !data) return FREE_SUBSCRIPTION;
    return {
      plan: data.plan,
      status: data.status,
      currentPeriodEnd: data.current_period_end ?? undefined,
    };
  }

  async function snapshotFor(
    user: { id: string; email?: string } | null,
  ): Promise<AuthSnapshot> {
    if (!user) return { user: null, subscription: FREE_SUBSCRIPTION };
    const authUser: AuthUser = { id: user.id, email: user.email ?? '' };
    const subscription = await fetchSubscription(user.id);
    return { user: authUser, subscription };
  }

  return {
    name: 'supabase',

    async init() {
      const { data } = await supabase.auth.getSession();
      return snapshotFor(data.session?.user ?? null);
    },

    onChange(cb) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        // The callback must stay sync; resolve the snapshot then emit.
        void snapshotFor(session?.user ?? null).then(cb);
      });
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password): Promise<AuthResult> {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { ok: false, error: friendly(error) } : { ok: true };
    },

    async signUp(email, password): Promise<AuthResult> {
      const { error } = await supabase.auth.signUp({ email, password });
      return error ? { ok: false, error: friendly(error) } : { ok: true };
    },

    async signOut() {
      await supabase.auth.signOut();
    },

    async startCheckout(): Promise<AuthResult> {
      const { data, error } = await supabase.functions.invoke<{ url: string }>(
        'create-checkout',
        { body: { returnUrl: window.location.origin } },
      );
      if (error || !data?.url) {
        return { ok: false, error: 'No se pudo iniciar el pago. Inténtalo de nuevo.' };
      }
      window.location.assign(data.url);
      return { ok: true };
    },

    async manageBilling(): Promise<AuthResult> {
      const { data, error } = await supabase.functions.invoke<{ url: string }>(
        'billing-portal',
        { body: { returnUrl: window.location.origin } },
      );
      if (error || !data?.url) {
        return { ok: false, error: 'No se pudo abrir el portal de facturación.' };
      }
      window.location.assign(data.url);
      return { ok: true };
    },
  };
}
