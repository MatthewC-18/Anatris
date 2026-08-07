// src/components/landing/Pricing.tsx
//
// Pricing surface: Free vs Premium with a monthly/annual toggle and a per-market
// currency selector. Reused both on the marketing landing and as an in-app
// "Planes" overlay. The premium CTA is wired to the existing auth/billing seam
// (useAuth.startCheckout) so it works on the mock today and on real Stripe once
// configured — and it charges in the SAME currency it displays.
//
// Prices live in src/lib/pricing.ts and MUST match the Stripe prices'
// currency_options (see supabase/README.md).
//
// THEMING: this component renders on the light public site AND inside the dark
// product overlay, so every surface, border and text colour here is a semantic
// token (`bg-card`, `border-line`, `text-fg2`, `bg-brand`) resolved by the theme
// scope it happens to be mounted under. Do not reintroduce raw slate/ink values:
// they were what made this table illegible on paper. For the same reason it no
// longer borrows the shared `Segmented` control, which is hard-coded for ink.
//
// The emerald "ahorra" chip and the accent-washed CTA are gone too — a price
// list earns trust by being plainly legible, not by glowing.

import { useMemo, useState } from 'react';
import { useAuth, useEntitlement } from '../../auth/AuthContext';
import {
  CURRENCIES,
  CURRENCY_ORDER,
  TRIAL_DAYS,
  detectCurrency,
  formatPrice,
  type CurrencyCode,
} from '../../lib/pricing';

// The two lists MUST describe what src/auth/entitlements.ts actually enforces.
// They are the promise; the entitlements file is the contract. If you change one,
// change the other in the same commit.
const PREMIUM_FEATURES = [
  'Tests ortopédicos: sensibilidad, especificidad, nomograma de Fagan, clusters, modo examen y maniobras resistidas en 3D',
  'Laboratorio de movimiento completo, con todos los arcos y los presets patológicos',
  'Modo paciente a pantalla completa y tarjeta imprimible para llevarse a casa',
  'Panel neurológico: dermatomas, miotomas y reflejos por raíz',
  'Todas las regiones: codo, cadera, rodilla, tobillo y columna',
  'Evidencia clínica enlazada a los estudios originales',
  'Progreso sincronizado en todos tus dispositivos',
];

const FREE_FEATURES = [
  'Región del hombro completa: 17 músculos con su ficha clínica y sus citas',
  'Módulo de Fundamentos',
  'Repaso espaciado, cuestionarios y tarjetas del hombro',
  'Laboratorio de movimiento en demostración, con un arco',
];

interface PricingProps {
  /** Called by the free-plan CTA (e.g. enter the app / close the overlay). */
  onChooseFree?: () => void;
  /** Open the sign-in / sign-up modal (used when not authenticated). */
  onOpenAuth: () => void;
}

export function Pricing({ onChooseFree, onOpenAuth }: PricingProps) {
  const { snapshot, startCheckout } = useAuth();
  const { isPremium } = useEntitlement();
  const [annual, setAnnual] = useState(true);
  const [busy, setBusy] = useState(false);
  // Currency defaults to the visitor's market; they can override it.
  const [currency, setCurrency] = useState<CurrencyCode>(() => detectCurrency());

  const plan = CURRENCIES[currency];
  const perMonth = annual ? plan.annual / 12 : plan.monthly;
  const priceLabel = formatPrice(plan, perMonth);
  const annualLabel = useMemo(() => formatPrice(plan, plan.annual), [plan]);
  // Trial CTA only for users who never subscribed ('none'); returning users pay now.
  const trialEligible =
    TRIAL_DAYS > 0 && !isPremium && snapshot.subscription.status === 'none';

  async function goPremium() {
    if (isPremium) return;
    if (!snapshot.user) {
      onOpenAuth();
      return;
    }
    setBusy(true);
    await startCheckout(annual ? 'annual' : 'monthly', currency);
    setBusy(false);
  }

  return (
    <div className="w-full">
      {/* Billing period and currency. Plain labelled controls: on a payment
          surface the user has to be certain what they are about to be charged,
          and in what. */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:gap-10">
        <Choice
          label="Facturación"
          options={[
            { value: 'monthly', label: 'Mensual' },
            { value: 'annual', label: 'Anual' },
          ]}
          value={annual ? 'annual' : 'monthly'}
          onChange={(v) => setAnnual(v === 'annual')}
          ariaLabel="Periodo de facturación"
        />
        <Choice
          label="Moneda"
          options={CURRENCY_ORDER.map((code) => ({
            value: code,
            label: CURRENCIES[code].label,
          }))}
          value={currency}
          onChange={(v) => setCurrency(v as CurrencyCode)}
          ariaLabel="Elegir moneda"
        />
      </div>

      <div className="grid gap-px border-b border-line bg-line sm:grid-cols-2">
        {/* Free */}
        <div className="flex flex-col bg-card p-6 sm:p-8">
          <h3 className="font-serif text-xl font-normal text-fg">Gratis</h3>
          <p className="mt-1 text-sm text-fg3">Para empezar a estudiar hoy.</p>
          <p className="tnum mt-6 font-serif text-4xl font-normal leading-none text-fg">
            {formatPrice(plan, 0)}
          </p>
          <p className="mt-2 text-[13px] text-fg3">Sin caducidad y sin tarjeta.</p>
          <ul className="mt-7 flex flex-1 flex-col gap-2.5">
            {FREE_FEATURES.map((f) => (
              <Feature key={f} text={f} />
            ))}
          </ul>
          <button
            type="button"
            onClick={onChooseFree}
            className="mt-8 rounded border border-line px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-brand-wash"
          >
            Empezar gratis
          </button>
        </div>

        {/* Premium */}
        <div className="flex flex-col bg-card p-6 sm:p-8">
          <h3 className="font-serif text-xl font-normal text-fg">Premium</h3>
          <p className="mt-1 text-sm text-fg3">
            El cuerpo completo y todas las herramientas clínicas.
          </p>
          <p className="mt-6 flex items-baseline gap-1.5">
            <span className="tnum font-serif text-4xl font-normal leading-none text-fg">
              {priceLabel}
            </span>
            <span className="text-sm text-fg3">al mes</span>
          </p>
          <p className="mt-2 text-[13px] text-fg3">
            {annual
              ? `Un pago de ${annualLabel} al año.`
              : 'Facturación mensual.'}
            {trialEligible ? ` Los primeros ${TRIAL_DAYS} días no se cobran.` : ''}
          </p>
          <ul className="mt-7 flex flex-1 flex-col gap-2.5">
            {PREMIUM_FEATURES.map((f) => (
              <Feature key={f} text={f} />
            ))}
          </ul>
          <button
            type="button"
            onClick={goPremium}
            disabled={busy || isPremium}
            className="mt-8 rounded bg-brand-fill px-4 py-2.5 text-sm font-medium text-brand-on transition-colors hover:bg-brand-deep disabled:opacity-50"
          >
            {isPremium
              ? 'Tu plan actual'
              : busy
                ? 'Procesando…'
                : snapshot.user
                  ? trialEligible
                    ? `Empezar ${TRIAL_DAYS} días de prueba`
                    : 'Suscribirme'
                  : trialEligible
                    ? `Crear cuenta y probar ${TRIAL_DAYS} días`
                    : 'Crear cuenta y suscribirme'}
          </button>
        </div>
      </div>

      <p className="mt-5 max-w-xl text-[13px] leading-relaxed text-fg3">
        {trialEligible
          ? `Durante los ${TRIAL_DAYS} días de prueba no se realiza ningún cargo. `
          : ''}
        La suscripción puede cancelarse en cualquier momento. El pago se procesa
        a través de Stripe. Anatris es una herramienta educativa y no sustituye
        al criterio clínico profesional.
      </p>
    </div>
  );
}

/**
 * A labelled radio group rendered as plain underlined options rather than a
 * pill switcher. Two of these sit next to each other on a payment surface; as
 * segmented pills they read as one ambiguous control, and the caption is what
 * tells the user which is which.
 */
function Choice({
  label,
  options,
  value,
  onChange,
  ariaLabel,
}: {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] text-fg3">{label}</span>
      <div role="radiogroup" aria-label={ariaLabel} className="flex items-center gap-1">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={[
                'rounded px-2.5 py-1 text-[13px] font-medium transition-colors',
                active
                  ? 'bg-brand-wash text-brand'
                  : 'text-fg2 hover:text-fg',
              ].join(' ')}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] leading-relaxed text-fg2">
      <svg
        className="mt-[3px] shrink-0 text-brand"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {text}
    </li>
  );
}
