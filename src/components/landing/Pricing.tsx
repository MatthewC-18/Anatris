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

import { useMemo, useState } from 'react';
import { Segmented } from '../ui/Controls';
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
  'Tests ortopédicos: sensibilidad, especificidad, Fagan, clusters, modo examen y maniobras resistidas en 3D',
  'Laboratorio de movimiento completo: todos los arcos y presets patológicos',
  'Modo paciente a pantalla completa y tarjeta para llevarse a casa',
  'Panel neurológico: dermatomas, miotomas y reflejos por raíz',
  'Todas las regiones: codo, cadera, rodilla, tobillo y columna',
  'Evidencia clínica con enlaces a los estudios originales',
  'Progreso sincronizado en todos tus dispositivos',
];

const FREE_FEATURES = [
  'Región del hombro completa: 17 músculos con su ficha clínica y citas',
  'Módulo de Fundamentos',
  'Repaso espaciado, cuestionarios y tarjetas del hombro',
  'Laboratorio de movimiento en demostración (un arco)',
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
    <div className="mx-auto w-full max-w-3xl px-2">
      {/* Currency selector + billing period toggle */}
      <div className="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
        {/* Four currencies fit on one rail, so they are all visible at a glance
            instead of hidden behind a native dropdown. */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          Moneda
          <Segmented
            value={currency}
            options={CURRENCY_ORDER.map((code) => ({
              value: code,
              label: CURRENCIES[code].label,
            }))}
            onChange={setCurrency}
            ariaLabel="Elegir moneda"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-sm ${!annual ? 'text-slate-200' : 'text-slate-500'}`}>
            Mensual
          </span>
          <button
            type="button"
            onClick={() => setAnnual((a) => !a)}
            className="relative h-6 w-11 rounded-full border border-slate-700 bg-slate-800 transition-colors"
            aria-label="Cambiar periodo de facturación"
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-accent transition-all ${
                annual ? 'left-[1.4rem]' : 'left-0.5'
              }`}
            />
          </button>
          <span className={`text-sm ${annual ? 'text-slate-200' : 'text-slate-500'}`}>
            Anual
            <span className="ml-1 rounded bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
              ahorra
            </span>
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Free */}
        <div className="flex flex-col rounded-2xl border border-slate-800/60 bg-slate-900/30 p-6">
          <h3 className="font-display text-lg font-bold text-slate-100">Gratis</h3>
          <p className="mt-1 text-sm text-slate-500">Para empezar a estudiar hoy.</p>
          <p className="mt-4 font-display text-3xl font-bold text-slate-50">
            {formatPrice(plan, 0)}
          </p>
          <ul className="mt-5 flex flex-1 flex-col gap-2">
            {FREE_FEATURES.map((f) => (
              <Feature key={f} text={f} />
            ))}
          </ul>
          <button
            type="button"
            onClick={onChooseFree}
            className="mt-6 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60"
          >
            Empezar gratis
          </button>
        </div>

        {/* Premium */}
        <div className="relative flex flex-col rounded-2xl border border-accent/40 bg-accent/[0.06] p-6">
          <span className="absolute -top-2.5 right-5 rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
            Recomendado
          </span>
          <h3 className="font-display text-lg font-bold text-slate-100">Premium</h3>
          <p className="mt-1 text-sm text-slate-500">El cuerpo completo y todo el estudio.</p>
          <p className="mt-4 flex items-baseline gap-1">
            <span className="font-display text-3xl font-bold text-slate-50">{priceLabel}</span>
            <span className="text-sm text-slate-500">/ mes</span>
          </p>
          <p className="text-xs text-slate-500">
            {annual ? `Facturado ${annualLabel} al año` : 'Facturación mensual'}
          </p>
          {trialEligible && (
            <p className="mt-2 w-fit rounded-full bg-emerald-600/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
              {TRIAL_DAYS} días gratis, sin cargo hoy
            </p>
          )}
          <ul className="mt-5 flex flex-1 flex-col gap-2">
            {PREMIUM_FEATURES.map((f) => (
              <Feature key={f} text={f} highlight />
            ))}
          </ul>
          <button
            type="button"
            onClick={goPremium}
            disabled={busy || isPremium}
            className="mt-6 rounded-lg bg-accent/20 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/30 disabled:opacity-60"
          >
            {isPremium
              ? 'Tu plan actual'
              : busy
                ? 'Procesando…'
                : snapshot.user
                  ? trialEligible
                    ? `Empezar ${TRIAL_DAYS} días gratis`
                    : 'Suscribirme'
                  : trialEligible
                    ? `Crear cuenta · ${TRIAL_DAYS} días gratis`
                    : 'Crear cuenta y suscribirme'}
          </button>
        </div>
      </div>

      <p className="mt-5 text-center text-[11px] text-slate-600">
        {trialEligible ? `Empieza con ${TRIAL_DAYS} días gratis. ` : ''}Cancela cuando
        quieras. Pago seguro con Stripe. Solo con fines educativos; no sustituye el
        criterio clínico profesional.
      </p>
    </div>
  );
}

function Feature({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-300">
      <svg
        className={`mt-0.5 shrink-0 ${highlight ? 'text-accent' : 'text-emerald-400'}`}
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {text}
    </li>
  );
}
