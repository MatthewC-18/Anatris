// supabase/functions/billing-portal/index.ts
//
// Opens the Stripe Customer Portal so a subscribed user can update payment
// methods, see invoices, or cancel. The frontend calls this via
// supabase.functions.invoke('billing-portal') and redirects to { url }.
//
// Deploy:
//   supabase functions deploy billing-portal
// Required secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// Deployable reference code; not part of the Vite app build.

import Stripe from 'npm:stripe@^16';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: 'No autenticado' }, 401);

    const { data } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const customerId = data?.stripe_customer_id as string | undefined;
    if (!customerId) return json({ error: 'Sin cliente de Stripe' }, 400);

    const { returnUrl } = (await req.json().catch(() => ({}))) as {
      returnUrl?: string;
    };

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl ?? new URL(req.url).origin,
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
