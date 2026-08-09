// src/components/movement/neuroScreenStore.ts
//
// Where a segmental screen lives while the app is open.
//
// -----------------------------------------------------------------------------
// WHY IT IS NOT COMPONENT STATE, AND NOT localStorage EITHER
// -----------------------------------------------------------------------------
// It cannot be component state: on a phone the lab's bottom sheet renders one tab
// at a time, so switching to Movimiento and back UNMOUNTS the neuro panel and a
// half-finished exam disappeared. Nobody grades ten axes twice.
//
// It is deliberately not persisted to disk either. What is in here is a finding
// about a person -- "sensibilidad ausente en L5" -- and writing that to a device's
// storage is a decision about handling patient data, not a caching convenience. So
// the screen survives navigation and dies with the tab, which is the honest scope
// for something taken during one examination. If it should ever outlive a reload,
// that is a product decision about consent and retention, made on purpose.
//
// Keyed by SEGMENT SET, not by region: cervical serves shoulder, elbow and neck,
// so moving between those three regions is still the same limb and the same ten
// findings. Moving from the knee to the shoulder crosses to another set and starts
// a new screen, which is what should happen -- lumbosacral findings have no meaning
// on a cervical figure.
//
// A plain module map, in the manner of demoChannel: no subscription, because only
// one neuro panel is mounted at a time (MovementView renders either the side sheet
// or the mobile one, never both), so the panel can read once on mount and write
// through on change.

import type { NeuroScreenState } from '../../lib/neuroScreen';

const bySet = new Map<string, NeuroScreenState>();

/** What was recorded for this segment set so far, or an empty screen. */
export function readScreen(setId: string): NeuroScreenState {
  return bySet.get(setId) ?? {};
}

/** Write through. Called on every grade, so it stays cheap: one map set. */
export function writeScreen(setId: string, screen: NeuroScreenState): void {
  bySet.set(setId, screen);
}

/** Forget this set's screen (the panel's "Limpiar"). */
export function clearScreen(setId: string): void {
  bySet.delete(setId);
}
