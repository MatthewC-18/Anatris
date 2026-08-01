// src/auth/entitlements.ts
//
// The single source of truth for "what can this user access". Keeping the
// free/premium policy here (not scattered across components) means pricing
// experiments are a one-file change.
//
// THE POLICY, IN ONE SENTENCE: the free tier is a complete, honest shoulder
// course; premium is everything a physio uses IN FRONT OF A PATIENT and to
// prepare an exam.
//
// Cutting by REGION alone (the previous policy) gave the whole movement lab,
// the orthopedic special tests, the neuro panel and patient mode away for free
// on the shoulder — i.e. the entire differentiator — and left "more joints" as
// the only reason to pay, which is the weakest possible pitch. So access is now
// two-dimensional:
//
//   REGION   -> shoulder + fundamentos are free, the rest need premium.
//   FEATURE  -> a named capability that is premium in EVERY region, including
//               the free ones (see PREMIUM_FEATURES below).
//
// Locked things must stay VISIBLE with a lock rather than be hidden: a lock
// sells, an empty space communicates nothing. Components read this module and
// render the lock; they never re-implement the policy.

import type { Subscription } from './types';

/** Region ids usable without a subscription. */
export const FREE_REGIONS = new Set<string>(['shoulder', 'fundamentos']);

export type Plan = 'free' | 'premium';

/**
 * Capabilities that require a subscription no matter which region is open.
 *
 * - `movement-full`     every movement of the lab. Free gets a DEMO: the first
 *                       drivable movement of the free region (see FREE_DEMO_MOVEMENTS).
 * - `orthopedic-tests`  the special-tests panel: sens/spec, Fagan, clusters, exam mode.
 * - `neuro`             dermatomes / myotomes / reflexes panel.
 * - `patient-mode`      the full-screen patient view + "export for patient" card.
 * - `evidence`          the per-region clinical-evidence screen with PubMed links.
 * - `pathologies`       the pathological ROM presets in the lab.
 * - `sync`              cross-device study progress.
 *
 * The manual-resistance overlay is NOT a standalone feature anymore: it only
 * appears inside the resisted orthopedic-test demos, so `orthopedic-tests`
 * covers it.
 */
export type PremiumFeature =
  | 'movement-full'
  | 'orthopedic-tests'
  | 'neuro'
  | 'patient-mode'
  | 'evidence'
  | 'pathologies'
  | 'sync';

/** Short Spanish labels, for the lock tooltips and the paywall headline. */
export const FEATURE_LABEL: Record<PremiumFeature, string> = {
  'movement-full': 'Laboratorio de movimiento completo',
  'orthopedic-tests': 'Tests ortopédicos',
  neuro: 'Panel neurológico',
  'patient-mode': 'Modo paciente',
  evidence: 'Evidencia clínica',
  pathologies: 'Presets patológicos',
  sync: 'Sincronización entre dispositivos',
};

/**
 * How many movements of a region the FREE tier can drive in the lab. The rest
 * are listed with a lock so the free user can see exactly what they'd unlock.
 * One is enough to prove the rig is real without giving away the tool.
 */
export const FREE_MOVEMENT_QUOTA = 1;

/** Statuses that grant premium access. */
const PREMIUM_STATUSES = new Set<Subscription['status']>(['active', 'trialing']);

/** Whether a subscription currently unlocks premium content. */
export function isPremiumActive(sub: Subscription): boolean {
  return sub.plan === 'premium' && PREMIUM_STATUSES.has(sub.status);
}

/** Whether a region is reachable given a subscription. */
export function canAccessRegion(region: string, sub: Subscription): boolean {
  if (FREE_REGIONS.has(region)) return true;
  return isPremiumActive(sub);
}

/** Whether a region needs premium (regardless of the current user). */
export function isRegionPremium(region: string): boolean {
  return !FREE_REGIONS.has(region);
}

/**
 * Whether a named capability is reachable. Every PremiumFeature is premium
 * everywhere, so this is simply "is the subscription live" — but routing the
 * check through a named feature keeps the call sites self-documenting and lets
 * us move a single capability into the free tier later by editing only here.
 */
export function canUseFeature(_feature: PremiumFeature, sub: Subscription): boolean {
  return isPremiumActive(sub);
}
