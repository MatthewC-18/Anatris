// supabase/functions/create-checkout/index.ts
//
// Stripe Checkout edge function (Deno). The frontend calls this via
// supabase.functions.invoke('create-checkout'); it returns { url } and the
// client redirects the user to Stripe's hosted checkout.
//
// Deploy:
//   supabase functions deploy create-checkout
// Required secrets (supabase secrets set ...):
//   STRIPE_SECRET_KEY        sk_live_... / sk_test_...
//   STRIPE_PRICE_PREMIUM     price_...   (your monthly/annual price id)
//   SUPABASE_URL             (auto-injected in functions)
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected in functions)
//
// NOTE: this is deployable reference code. It is NOT part of the Vite app build
// and is intentionally not type-checked by the app's tsconfig (Deno runtime).

import Stripe from 'npm:stripe@^16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const PRICE = Deno.env.get('STRIPE_PRICE_PREMIUM')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    // Identify the caller from their Supabase JWT.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: 'No autenticado' }, 401);
    }

    const { returnUrl } = (await req.json().catch(() => ({}))) as {
      returnUrl?: string;
    };
    const base = returnUrl ?? new URL(req.url).origin;

    // Reuse an existing Stripe customer for this user if we have one.
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from('subscriptions')
        .upsert({ user_id: user.id, stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: PRICE, quantity: 1 }],
      success_url: `${base}/?checkout=success`,
      cancel_url: `${base}/?checkout=cancel`,
      // So the webhook can map the event back to our user even if metadata
      // on the customer is missing.
      subscription_data: { metadata: { supabase_user_id: user.id } },
    });

    return json({ url: session.url });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
