// src/components/account/Paywall.tsx
//
// Shown in place of a premium region's content when the user isn't subscribed.
// Drives the upgrade funnel: sign in (if needed) -> subscribe -> unlock. On the
// mock backend "Suscribirme" grants premium instantly so the flow is demoable.

import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { REGIONS } from '../../data/regiones';
import { EVENTS, track } from '../../lib/analytics';
import { CURRENCIES, TRIAL_DAYS, detectCurrency, formatPrice } from '../../lib/pricing';

type Interval = 'monthly' | 'annual';

const PREMIUM_BENEFITS = [
  'Todas las regiones: hombro, codo, cadera, rodilla, tobillo y columna',
  'Cuestionarios y tarjetas de estudio de cada región',
  'Rangos de movimiento y guías de biomecánica',
  'Tu progreso sincronizado en todos tus dispositivos',
];

export function Paywall({
  region,
  onOpenAuth,
}: {
  region: string;
  onOpenAuth: () => void;
}) {
  const { snapshot, startCheckout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Default to annual: it's the better value for the user and higher LTV for us.
  const [interval, setInterval] = useState<Interval>('annual');
  const [currency] = useState(() => detectCurrency());
  const regionName = REGIONS[region]?.name ?? 'esta región';

  const plan = CURRENCIES[currency];
  const perMonth = interval === 'annual' ? plan.annual / 12 : plan.monthly;
  // Offer the trial only to users who have NEVER subscribed ('none'); a returning
  // canceled user ('canceled') pays immediately (the backend denies repeat trials).
  const trialEligible = TRIAL_DAYS > 0 && snapshot.subscription.status === 'none';

  // Funnel step: the visitor hit the paywall for a premium region.
  useEffect(() => track(EVENTS.paywallViewed, { region }), [region]);

  async function upgrade() {
    if (!snapshot.user) {
      onOpenAuth();
      return;
    }
    setBusy(true);
    setError(null);
    track(EVENTS.checkoutStarted, { region, interval });
    const res = await startCheckout(interval, currency);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'No se pudo iniciar el pago.');
  }

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-6 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
          <LockIcon /> Contenido Premium
        </span>

        <h2 className="mt-4 font-display text-xl font-bold text-slate-50">
          Desbloquea {regionName} y todo Anatris
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          La región del hombro y Fundamentos son gratuitas. Suscríbete para
          acceder al resto del cuerpo y a todas las herramientas de estudio.
        </p>

        <ul className="mx-auto mt-5 flex max-w-xs flex-col gap-2 text-left">
          {PREMIUM_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-slate-300">
              <CheckIcon /> {b}
            </li>
          ))}
        </ul>

        {/* Billing period toggle + price (annual offered right at the wall). */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-slate-800/70 bg-slate-900/40 p-1">
            <IntervalBtn id="monthly" label="Mensual" interval={interval} setInterval={setInterval} />
            <IntervalBtn id="annual" label="Anual" interval={interval} setInterval={setInterval} />
          </div>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-2xl font-bold text-slate-50">
              {formatPrice(plan, perMonth)}
            </span>
            <span className="text-xs text-slate-500">/ mes</span>
          </p>
          {trialEligible && (
            <p className="mt-1 rounded-full bg-emerald-600/15 px-3 py-1 text-[11px] font-semibold text-emerald-300">
              {TRIAL_DAYS} días gratis, luego {formatPrice(plan, perMonth)}/mes
            </p>
          )}
          <p className="text-[11px] text-slate-500">
            {interval === 'annual'
              ? `Facturado ${formatPrice(plan, plan.annual)} al año · ahorra ${savingsPct(plan)}%`
              : 'Facturación mensual · cancela cuando quieras'}
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-900/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={upgrade}
          disabled={busy}
          className="mt-6 w-full rounded-lg bg-accent/20 px-5 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/30 disabled:opacity-50"
        >
          {busy
            ? 'Procesando…'
            : !snapshot.user
              ? trialEligible
                ? `Inicia sesión y prueba ${TRIAL_DAYS} días gratis`
                : 'Inicia sesión para suscribirte'
              : trialEligible
                ? `Empezar ${TRIAL_DAYS} días gratis`
                : 'Suscribirme a Premium'}
        </button>

        <p className="mt-3 text-[11px] text-slate-600">
          {trialEligible
            ? `Sin cargo hoy. Cancela antes de que terminen los ${TRIAL_DAYS} días y no se te cobra.`
            : 'Cancela cuando quieras. El pago se procesa de forma segura con Stripe.'}
        </p>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="mt-0.5 shrink-0 text-emerald-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Discount of the annual plan vs paying monthly, as a rounded percentage. */
function savingsPct(plan: { monthly: number; annual: number }): number {
  return Math.round((1 - plan.annual / 12 / plan.monthly) * 100);
}

function IntervalBtn({
  id,
  label,
  interval,
  setInterval,
}: {
  id: Interval;
  label: string;
  interval: Interval;
  setInterval: (i: Interval) => void;
}) {
  const active = interval === id;
  return (
    <button
      type="button"
      onClick={() => setInterval(id)}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        active ? 'bg-accent/20 text-accent' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
