// src/components/landing/Pricing.tsx
//
// Pricing surface: Free vs Premium with a monthly/annual toggle. Reused both on
// the marketing landing and as an in-app "Planes" overlay. The premium CTA is
// wired to the existing auth/billing seam (useAuth.startCheckout) so it works on
// the mock today and on real Stripe once configured.
//
// EDIT ME: the amounts/currency below are placeholders. Set your real prices —
// and consider local currency for your market (MXN / COP / EUR ...).

import { useState } from 'react';
import { useAuth, useEntitlement } from '../../auth/AuthContext';

const PRICING = {
  currency: 'USD',
  symbol: '$',
  monthly: 7.99,
  annual: 59, // ~ 4.92 / mes (ahorro frente al mensual)
};

const PREMIUM_FEATURES = [
  'Todas las regiones: hombro, codo, columna y rodilla',
  'Laboratorio de movimiento (biomecánica interactiva)',
  'Cuestionarios y tarjetas de estudio de cada región',
  'Rangos de movimiento y músculos activos por fase',
  'Contenido clínico con referencias',
  'Tu progreso sincronizado en todos tus dispositivos',
];

const FREE_FEATURES = [
  'Región del hombro completa',
  'Módulo de Fundamentos',
  'Explorador 3D y estudio del hombro',
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

  const price = annual ? PRICING.annual / 12 : PRICING.monthly;
  const priceLabel = `${PRICING.symbol}${price.toFixed(2)}`;

  async function goPremium() {
    if (isPremium) return;
    if (!snapshot.user) {
      onOpenAuth();
      return;
    }
    setBusy(true);
    await startCheckout();
    setBusy(false);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-2">
      {/* Billing period toggle */}
      <div className="mb-6 flex items-center justify-center gap-3">
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

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Free */}
        <div className="flex flex-col rounded-2xl border border-slate-800/60 bg-slate-900/30 p-6">
          <h3 className="font-display text-lg font-bold text-slate-100">Gratis</h3>
          <p className="mt-1 text-sm text-slate-500">Para empezar a estudiar hoy.</p>
          <p className="mt-4 font-display text-3xl font-bold text-slate-50">
            {PRICING.symbol}0
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
            {annual
              ? `Facturado ${PRICING.symbol}${PRICING.annual.toFixed(2)} al año`
              : 'Facturación mensual'}
          </p>
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
                  ? 'Suscribirme'
                  : 'Crear cuenta y suscribirme'}
          </button>
        </div>
      </div>

      <p className="mt-5 text-center text-[11px] text-slate-600">
        Cancela cuando quieras. Pago seguro con Stripe. Solo con fines educativos;
        no sustituye el criterio clínico profesional.
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
