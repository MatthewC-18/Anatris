// src/lib/theme.ts
//
// Theme preference for the PUBLIC SITE.
//
// -----------------------------------------------------------------------------
// SCOPE, and why it is what it is
// -----------------------------------------------------------------------------
// This switches the landing, the pricing table and the account modals between
// the paper and ink theme scopes (see the CSS variables in index.css). It does
// NOT switch the product interior: the movement lab and the Explorar viewer are
// a lit stage for a 3D body, with an image-based environment, a stage glow and a
// vignette all authored against a near-black backdrop. Rendering anatomy on
// white would not be a re-skin, it would be a relighting job. So App.tsx keeps
// `theme-ink` pinned on its root and the tool always looks like the tool.
//
// What DOES follow the preference is everything a visitor meets before the 3D:
// the landing, the plans, sign-in, and the paywall.
//
// -----------------------------------------------------------------------------
// THREE STATES, not two
// -----------------------------------------------------------------------------
// 'system' is the default and is a real state, not a synonym for one of the
// other two: a reader who has their OS on dark at night expects the page to
// follow, and a two-way toggle silently opts them out of that forever the first
// time they touch it. Only an explicit 'light' or 'dark' is persisted as a
// decision; 'system' keeps listening to the media query for as long as it is
// selected.
//
// The class is also applied by a tiny inline script in index.html BEFORE the
// bundle loads. Without it the first paint is whatever the CSS default happens
// to be and the page visibly flips a moment later, which is the single most
// noticeable bug a theme switcher can ship.

export type ThemePref = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/** Shared with the inline boot script in index.html. Keep the two in sync. */
export const THEME_KEY = 'anatris.theme';

const PAPER = 'theme-paper';
const INK = 'theme-ink';

/** Page background per theme, mirrored into <meta name="theme-color">. */
const PAGE_COLOR: Record<ResolvedTheme, string> = {
  light: '#fafaf8',
  dark: '#070b14',
};

function isPref(v: unknown): v is ThemePref {
  return v === 'system' || v === 'light' || v === 'dark';
}

/** The stored preference, or 'system' when absent or unreadable. */
export function readPref(): ThemePref {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return isPref(v) ? v : 'system';
  } catch {
    // Private mode / storage disabled: the switcher still works for the session.
    return 'system';
  }
}

export function writePref(pref: ThemePref): void {
  try {
    if (pref === 'system') window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* preference simply does not survive the reload */
  }
}

/** What the OS is asking for right now. */
export function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  return pref === 'system' ? systemTheme() : pref;
}

/**
 * Put the theme on <html>. The product's own root re-declares `theme-ink`, so
 * the tool stays dark no matter what is set here.
 */
export function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle(PAPER, theme === 'light');
  root.classList.toggle(INK, theme === 'dark');
  root.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', PAGE_COLOR[theme]);
}

/**
 * Call the listener whenever the OS theme changes. Returns an unsubscribe.
 * Only meaningful while the preference is 'system'.
 */
export function onSystemThemeChange(fn: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => fn(e.matches ? 'dark' : 'light');
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
