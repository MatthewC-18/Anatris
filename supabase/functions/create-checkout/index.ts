// supabase/functions/create-checkout/index.ts
//
// Stripe Checkout edge function (Deno). The frontend calls this via
// supabase.functions.invoke('create-checkout', { body: { interval } }); it
// returns { url } and the client redirects the user to Stripe's hosted checkout.
//
// Deploy:
//   supabase functions deploy create-checkout
// Required secrets (supabase secrets set ...):
//   STRIPE_SECRET_KEY               sk_live_... / sk_test_...
//   STRIPE_PRICE_PREMIUM_MONTHLY    price_...   (monthly recurring price)
//   STRIPE_PRICE_PREMIUM_ANNUAL     price_...   (annual recurring price)
//   STRIPE_PRICE_PREMIUM            price_...   (legacy fallback: used for both
//                                                if the two above are unset)
//   STRIPE_TRIAL_DAYS              (optional) free-trial days for FIRST-TIME
//                                  subscribers; default 7, 0 disables. MUST match
//                                  TRIAL_DAYS in src/lib/pricing.ts (the UI copy).
//   SUPABASE_URL                    (auto-injected in functions)
//   SUPABASE_SERVICE_ROLE_KEY       (auto-injected in functions)
//
// NOTE: this is deployable reference code. It is NOT part of the Vite app build
// and is intentionally not type-checked by the app's tsconfig (Deno runtime).

import Stripe from 'npm:stripe@^16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

// Two prices: monthly + annual. Fall back to the legacy single price id so an
// existing deployment keeps working until the two new secrets are set.
const LEGACY = Deno.env.get('STRIPE_PRICE_PREMIUM');
const PRICE_MONTHLY = Deno.env.get('STRIPE_PRICE_PREMIUM_MONTHLY') ?? LEGACY;
const PRICE_ANNUAL = Deno.env.get('STRIPE_PRICE_PREMIUM_ANNUAL') ?? LEGACY;

// Free-trial length for FIRST-TIME subscribers (must match TRIAL_DAYS in
// src/lib/pricing.ts). 0 or unset-to-7 disables/sets the trial.
const TRIAL_DAYS = Number(Deno.env.get('STRIPE_TRIAL_DAYS') ?? '7');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // supabase-js sends authorization + apikey + x-client-info on every invoke;
  // all custom request headers must be echoed here or the browser preflight
  // fails and the call never reaches this function.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
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

    const { returnUrl, interval, currency } = (await req
      .json()
      .catch(() => ({}))) as {
      returnUrl?: string;
      interval?: 'monthly' | 'annual';
      currency?: string;
    };

    // Choose the price for the requested billing period (default: monthly).
    const price = interval === 'annual' ? PRICE_ANNUAL : PRICE_MONTHLY;
    if (!price) {
      return json(
        {
          error:
            'Precio no configurado. Define STRIPE_PRICE_PREMIUM_MONTHLY / _ANNUAL en los secretos.',
        },
        500,
      );
    }

    const base = returnUrl ?? new URL(req.url).origin;

    // Reuse an existing Stripe customer for this user if we have one. Also read
    // any prior subscription id so the trial is only granted to first-timers.
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: user.email,
          metadata: { supabase_user_id: user.id },
        },
        // Idempotency: a double-clicked checkout must not create two customers.
        { idempotencyKey: `customer_${user.id}` },
      );
      customerId = customer.id;
      await supabase
        .from('subscriptions')
        .upsert({ user_id: user.id, stripe_customer_id: customerId });
    }

    // Free trial ONLY for first-time subscribers (no prior subscription on
    // record), so a returning/resubscribing customer can't farm repeat trials.
    // The webhook already treats a `trialing` subscription as premium, and the
    // customer portal lets them cancel before the first charge.
    const isReturning = !!existing?.stripe_subscription_id;
    const trialDays =
      !isReturning && Number.isFinite(TRIAL_DAYS) && TRIAL_DAYS > 0
        ? Math.floor(TRIAL_DAYS)
        : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      // When the price carries currency_options, this picks which currency the
      // customer is charged in; omitted -> Stripe uses the price default.
      ...(currency ? { currency: currency.toLowerCase() } : {}),
      success_url: `${base}/?checkout=success`,
      cancel_url: `${base}/?checkout=cancel`,
      // So the webhook can map the event back to our user even if metadata on
      // the customer is missing.
      client_reference_id: user.id,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
        // Card is still collected up front (Checkout default); the customer isn't
        // charged until the trial ends, and the subscription starts `trialing`.
        ...(trialDays ? { trial_period_days: trialDays } : {}),
      },
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
