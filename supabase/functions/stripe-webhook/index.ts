// supabase/functions/stripe-webhook/index.ts
//
// Stripe webhook (Deno). The single source of truth that keeps the
// `subscriptions` table in sync with Stripe. Point a Stripe webhook endpoint at
// this function and subscribe to the customer.subscription.* events.
//
// Deploy (must be PUBLIC — Stripe calls it without a Supabase JWT):
//   supabase functions deploy stripe-webhook --no-verify-jwt
// Required secrets:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET    whsec_...  (from the Stripe webhook settings)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected)
//
// Deployable reference code; not part of the Vite app build.

import Stripe from 'npm:stripe@^16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Stripe subscription statuses that mean "premium is on".
const ACTIVE = new Set(['active', 'trialing']);

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      WEBHOOK_SECRET,
    );
  } catch (err) {
    return new Response(`Invalid signature: ${(err as Error).message}`, {
      status: 400,
    });
  }

  if (event.type.startsWith('customer.subscription.')) {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.supabase_user_id;
    const customerId =
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

    const isActive = ACTIVE.has(sub.status);
    const row = {
      plan: isActive ? 'premium' : null,
      status: sub.status,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Prefer matching by our user id; fall back to the Stripe customer id.
    if (userId) {
      await admin.from('subscriptions').upsert({ user_id: userId, ...row });
    } else {
      await admin
        .from('subscriptions')
        .update(row)
        .eq('stripe_customer_id', customerId);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
