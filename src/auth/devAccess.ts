// src/auth/devAccess.ts
//
// OWNER "all-access" override. Lets the owner/reviewer open EVERY region
// (to check the whole app) while the public funnel stays exactly as designed:
// shoulder + Fundamentos free, everything else premium.
//
// It is intentionally a CLIENT-SIDE override, consistent with the rest of this
// app's gating (the GLB and content load client-side; the paywall is an
// honor/UI gate in the mock backend). It is NOT a security boundary; real
// server-enforced entitlements live in the Supabase backend.
//
// Two ways to turn it on:
//   1. Local dev: set VITE_ALL_ACCESS=true in .env.local -> always unlocked.
//   2. Any device: visit the app with ?acceso=<OWNER_CODE> once. The flag is
//      saved to localStorage and the code is stripped from the URL. Turn it off
//      again with ?acceso=off.

/** localStorage flag persisted after a successful ?acceso= unlock. */
const ALL_ACCESS_KEY = 'anatris.allAccess';

/**
 * Secret code the owner appends as ?acceso=<CODE> to unlock on any device.
 * Change this to rotate access. Not security-grade (it's client-side), just a
 * private switch the public won't stumble on.
 */
const OWNER_CODE = 'fisio-acceso-total';

/** URL query param that carries the code. */
const PARAM = 'acceso';

/** True when the owner override is active (env flag or saved localStorage). */
export function hasAllAccess(): boolean {
  if (import.meta.env.VITE_ALL_ACCESS === 'true') return true;
  try {
    return window.localStorage.getItem(ALL_ACCESS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Read ?acceso=<code|off> from the URL, apply it (persist or clear), then strip
 * the param so the code never lingers in the address bar / shared links. Call
 * this ONCE at startup, before the app renders, so hasAllAccess() is correct on
 * the first paint.
 */
export function applyAccessFromUrl(): void {
  if (typeof window === 'undefined') return;
  let url: URL;
  try {
    url = new URL(window.location.href);
  } catch {
    return;
  }
  const value = url.searchParams.get(PARAM);
  if (value == null) return;

  try {
    if (value === 'off') {
      window.localStorage.removeItem(ALL_ACCESS_KEY);
    } else if (value === OWNER_CODE) {
      window.localStorage.setItem(ALL_ACCESS_KEY, '1');
      // eslint-disable-next-line no-console
      console.info('[Anatris] Acceso total activado (modo dueño).');
    }
  } catch {
    /* storage unavailable: non-fatal, just won't persist. */
  }

  // Strip the param from the URL without a reload.
  url.searchParams.delete(PARAM);
  window.history.replaceState({}, '', url.toString());
}
