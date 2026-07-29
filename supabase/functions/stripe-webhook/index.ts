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
//
// Idempotency / ordering: writes are last-write-wins and naturally idempotent
// (re-delivering the same event sets the same final state). To be immune to
// out-of-order delivery too, on every subscription event we RE-FETCH the
// subscription from Stripe and persist that fresh snapshot rather than trusting
// the (possibly stale) event payload. Re-fetching also normalizes the object to
// the SDK's pinned API version, so `current_period_end` is read reliably even
// if the account default API version moved it onto the subscription items.

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

/**
 * Read the period-end epoch robustly. Older API versions expose it on the
 * subscription; newer ones (basil, 2025+) moved it onto each subscription item.
 */
function periodEndISO(sub: Stripe.Subscription): string | null {
  const anySub = sub as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const secs = anySub.current_period_end ?? anySub.items?.data?.[0]?.current_period_end;
  return typeof secs === 'number' ? new Date(secs * 1000).toISOString() : null;
}

/** Recover our Supabase user id from the subscription, then the customer. */
async function resolveUserId(
  sub: Stripe.Subscription,
  customerId: string,
): Promise<string | undefined> {
  const fromSub = sub.metadata?.supabase_user_id;
  if (fromSub) return fromSub;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted) {
      return (customer as Stripe.Customer).metadata?.supabase_user_id ?? undefined;
    }
  } catch {
    /* customer lookup failed: fall through to the customer-id match path */
  }
  return undefined;
}

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
    try {
      const eventSub = event.data.object as Stripe.Subscription;

      // Re-fetch for the authoritative, current, version-normalized snapshot.
      // Fall back to the event payload if the lookup fails.
      let sub = eventSub;
      try {
        sub = await stripe.subscriptions.retrieve(eventSub.id);
      } catch {
        /* keep the event payload */
      }

      const customerId =
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

      const isActive = ACTIVE.has(sub.status);
      const row = {
        plan: isActive ? 'premium' : null,
        status: sub.status,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        current_period_end: periodEndISO(sub),
        updated_at: new Date().toISOString(),
      };

      const userId = await resolveUserId(sub, customerId);

      // Prefer matching by our user id; fall back to the Stripe customer id.
      const { error } = userId
        ? await admin.from('subscriptions').upsert({ user_id: userId, ...row })
        : await admin
            .from('subscriptions')
            .update(row)
            .eq('stripe_customer_id', customerId);

      // Surface DB failures as 500 so Stripe retries the delivery.
      if (error) {
        return new Response(`DB error: ${error.message}`, { status: 500 });
      }
    } catch (err) {
      return new Response(`Handler error: ${(err as Error).message}`, {
        status: 500,
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
