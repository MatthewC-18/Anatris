// src/auth/entitlements.ts
//
// The single source of truth for "what can this user access". Keeping the
// free/premium policy here (not scattered across components) means pricing
// experiments are a one-file change.
//
// Funnel: the shoulder region and the conceptual Fundamentos module are FREE
// (a meaningful teaser), and every other region requires an active premium
// subscription. Adjust FREE_REGIONS to change the free tier.

import type { Subscription } from './types';

/** Region ids usable without a subscription. */
export const FREE_REGIONS = new Set<string>(['shoulder', 'fundamentos']);

export type Plan = 'free' | 'premium';

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
