// src/lib/pricing.ts
//
// Single source of truth for DISPLAYED prices per market. These amounts MUST
// match the amounts configured on the Stripe prices' currency_options (see
// supabase/README.md). The app charges in whichever currency it displays, so a
// mismatch would show one price and bill another.
//
// Stripe side: two prices (monthly + annual). Each carries all four currencies
// via "Add another currency" (currency_options) in the Stripe Dashboard.

export type CurrencyCode = 'usd' | 'eur' | 'mxn' | 'cop';

export interface CurrencyPlan {
  code: CurrencyCode;
  /** Short label for the currency selector. */
  label: string;
  /** Locale used to format the amount (symbol, grouping, decimals). */
  locale: string;
  /** How many fraction digits to show for this market. */
  decimals: 0 | 2;
  monthly: number;
  annual: number;
}

/** Prices chosen for launch. Keep in sync with Stripe currency_options. */
export const CURRENCIES: Record<CurrencyCode, CurrencyPlan> = {
  usd: { code: 'usd', label: 'USD', locale: 'en-US', decimals: 2, monthly: 7.99, annual: 59 },
  eur: { code: 'eur', label: 'EUR', locale: 'de-DE', decimals: 2, monthly: 6.99, annual: 54 },
  mxn: { code: 'mxn', label: 'MXN', locale: 'es-MX', decimals: 0, monthly: 149, annual: 1190 },
  cop: { code: 'cop', label: 'COP', locale: 'es-CO', decimals: 0, monthly: 19900, annual: 159000 },
};

/** Order shown in the currency selector. */
export const CURRENCY_ORDER: CurrencyCode[] = ['usd', 'eur', 'mxn', 'cop'];

/** Regions we bill in EUR (a pragmatic eurozone subset). */
const EUR_REGIONS = new Set([
  'ES', 'DE', 'FR', 'IT', 'PT', 'NL', 'IE', 'AT', 'BE', 'FI', 'GR',
  'LU', 'SK', 'SI', 'EE', 'LV', 'LT', 'CY', 'MT', 'HR',
]);

/**
 * Best-effort market detection from the browser locale. MX -> MXN, CO -> COP,
 * eurozone -> EUR, everything else -> USD. Never throws.
 */
export function detectCurrency(): CurrencyCode {
  try {
    const langs = [navigator.language, ...(navigator.languages ?? [])];
    for (const lang of langs) {
      if (!lang) continue;
      const region = new Intl.Locale(lang).maximize().region?.toUpperCase();
      if (!region) continue;
      if (region === 'MX') return 'mxn';
      if (region === 'CO') return 'cop';
      if (EUR_REGIONS.has(region)) return 'eur';
      if (region === 'US') return 'usd';
    }
  } catch {
    /* fall through to the default */
  }
  return 'usd';
}

/** Format an amount in the given plan's currency and locale. */
export function formatPrice(plan: CurrencyPlan, amount: number): string {
  try {
    return new Intl.NumberFormat(plan.locale, {
      style: 'currency',
      currency: plan.code.toUpperCase(),
      minimumFractionDigits: plan.decimals,
      maximumFractionDigits: plan.decimals,
    }).format(amount);
  } catch {
    return `${amount}`;
  }
}
