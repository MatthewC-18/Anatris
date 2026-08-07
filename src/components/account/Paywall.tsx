// src/components/account/Paywall.tsx
//
// Shown in place of a premium region's content when the user isn't subscribed.
// Drives the upgrade funnel: sign in (if needed) -> subscribe -> unlock. On the
// mock backend "Suscribirme" grants premium instantly so the flow is demoable.
//
// TONE: this is the surface where a professional decides whether to pay, so it
// is written and drawn as a plain statement of what is behind the wall and what
// it costs. The uppercase neon "CONTENIDO PREMIUM" chip, the emerald trial pill
// and the accent-washed button are gone: three saturated badges stacked above a
// price read as a promotion, and a clinical tool is not sold that way. Surfaces
// use the semantic theme tokens, so it stays coherent with the public site.

import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { REGIONS } from '../../data/regiones';
import { EVENTS, track } from '../../lib/analytics';
import { CURRENCIES, TRIAL_DAYS, detectCurrency, formatPrice } from '../../lib/pricing';

type Interval = 'monthly' | 'annual';

// Keep in sync with PREMIUM_FEATURES in landing/Pricing.tsx and with what
// src/auth/entitlements.ts actually enforces. Lead with the tools a physio uses
// in front of a patient -- that is what converts, not the joint count.
const PREMIUM_BENEFITS = [
  'Tests ortopédicos con sensibilidad, especificidad, Fagan, clusters y maniobras resistidas en 3D',
  'Laboratorio de movimiento completo y presets patológicos',
  'Modo paciente y tarjeta imprimible para el paciente',
  'Todas las regiones: codo, cadera, rodilla, tobillo y columna',
  'Progreso sincronizado en todos tus dispositivos',
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
      <div className="w-full max-w-md">
        <p className="flex items-center gap-2 text-xs font-medium text-fg3">
          <LockIcon />
          Incluido en Premium
        </p>

        <h2 className="mt-4 font-display text-xl font-semibold leading-snug text-fg">
          {regionName} forma parte del plan Premium
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-fg2">
          El hombro y Fundamentos son gratuitos. Premium abre el resto del cuerpo
          y las herramientas que se usan delante del paciente.
        </p>

        <ul className="mt-6 border-t border-line">
          {PREMIUM_BENEFITS.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2.5 border-b border-line py-2.5 text-[13px] leading-relaxed text-fg2"
            >
              <CheckIcon />
              {b}
            </li>
          ))}
        </ul>

        {/* Billing period + price. */}
        <div className="mt-6 flex items-baseline justify-between gap-4">
          <p className="flex items-baseline gap-1.5">
            <span className="tnum font-display text-3xl font-semibold leading-none text-fg">
              {formatPrice(plan, perMonth)}
            </span>
            <span className="text-sm text-fg3">al mes</span>
          </p>
          <div role="radiogroup" aria-label="Periodo de facturación" className="flex gap-1">
            <IntervalBtn id="monthly" label="Mensual" interval={interval} setInterval={setInterval} />
            <IntervalBtn id="annual" label="Anual" interval={interval} setInterval={setInterval} />
          </div>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-fg3">
          {interval === 'annual'
            ? `Un pago de ${formatPrice(plan, plan.annual)} al año, un ${savingsPct(plan)}% menos que la cuota mensual.`
            : 'Facturación mensual, cancelable en cualquier momento.'}
          {trialEligible ? ` Los primeros ${TRIAL_DAYS} días no se cobran.` : ''}
        </p>

        {error && (
          <p className="mt-4 border-l-2 border-rose-500 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={upgrade}
          disabled={busy}
          className="mt-6 w-full rounded bg-brand-fill px-5 py-3 text-sm font-semibold text-brand-on transition-colors hover:bg-brand-deep disabled:opacity-50"
        >
          {busy
            ? 'Procesando…'
            : !snapshot.user
              ? trialEligible
                ? `Inicia sesión y prueba ${TRIAL_DAYS} días`
                : 'Inicia sesión para suscribirte'
              : trialEligible
                ? `Empezar ${TRIAL_DAYS} días de prueba`
                : 'Suscribirme a Premium'}
        </button>

        <p className="mt-3 text-[13px] leading-relaxed text-fg3">
          {trialEligible
            ? `Si cancelas antes de que terminen los ${TRIAL_DAYS} días no se realiza ningún cargo.`
            : 'El pago se procesa a través de Stripe.'}
        </p>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="mt-[3px] shrink-0 text-brand" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
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
      role="radio"
      aria-checked={active}
      onClick={() => setInterval(id)}
      className={`rounded px-2.5 py-1 text-[13px] font-medium transition-colors ${
        active ? 'bg-brand-wash text-brand' : 'text-fg2 hover:text-fg'
      }`}
    >
      {label}
    </button>
  );
}
