// supabase/functions/content/index.ts
//
// Serves a PREMIUM region's clinical library, and only to a caller with a live
// subscription. This is the server-side half of the entitlement model: until it
// existed the paywall was cosmetic, because every region's content shipped as a
// public JavaScript chunk that anyone could fetch without an account.
//
// Deploy:
//   npm run build-premium-content        # regenerate ./payloads
//   supabase functions deploy content
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// Deployable reference code; not part of the Vite app build.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { PAYLOADS } from './payloads.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // Must echo every header supabase-js sends on invoke (authorization, apikey,
  // x-client-info, content-type) or the browser preflight fails.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

/**
 * Subscription statuses that unlock premium content.
 *
 * MUST stay in sync with PREMIUM_STATUSES in src/auth/entitlements.ts. The
 * client copy decides what the UI offers; THIS copy decides what actually gets
 * served, so if they ever diverge, this one is the truth.
 */
const PREMIUM_STATUSES = new Set(['active', 'trialing']);

/**
 * OWNER ALL-ACCESS, server side. Optional comma-separated list of auth user ids
 * in the `OWNER_USER_IDS` secret; empty (the default) means nobody bypasses.
 *
 * The client already has an owner override (`src/auth/devAccess.ts`, the
 * `?acceso=` switch) so the owner can review every region. Since the paid
 * content moved behind this function, that override only unlocks the NAVIGATION:
 * the content request still gets a 403 and the owner sees the paywall — or the
 * failure card — on all seven paid regions. This is the server half, so the
 * switch works end to end without weakening anything for anyone else: it grants
 * exactly the ids listed in a secret only the project owner can set.
 */
const OWNER_USER_IDS = new Set(
  (Deno.env.get('OWNER_USER_IDS') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { region } = (await req.json().catch(() => ({}))) as { region?: string };
    if (!region || typeof region !== 'string') {
      return json({ error: 'Falta el parametro region' }, 400);
    }

    // Unknown region, or a FREE one: free content is bundled in the app and must
    // never be requested here. Answering 404 rather than "not entitled" avoids
    // turning this endpoint into a probe for which regions exist.
    const payload = PAYLOADS[region];
    if (!payload) return json({ error: 'Region no disponible' }, 404);

    // The service-role client is scoped to the CALLER's Authorization header for
    // getUser(), so identity comes from their JWT — the service role only exists
    // so the subscription lookup is not itself subject to RLS timing.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: 'No autenticado' }, 401);

    if (!OWNER_USER_IDS.has(user.id)) {
      const { data: sub, error } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) return json({ error: 'No se pudo verificar la suscripcion' }, 500);

      const live =
        sub?.plan === 'premium' && PREMIUM_STATUSES.has(String(sub?.status ?? ''));
      if (!live) return json({ error: 'Se requiere suscripcion activa' }, 403);
    }

    // no-store: this is per-user paid content. A shared/CDN cache holding it
    // would hand the payload to the next anonymous request and undo the check.
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
