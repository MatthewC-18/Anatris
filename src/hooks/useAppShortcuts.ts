// src/hooks/useAppShortcuts.ts
//
// The ONE global keyboard listener for app-level navigation. Everything it can
// do is declared in lib/shortcuts.ts and published in the cheat sheet, so the
// keys a user can press and the keys the app documents are the same list.
//
// SCOPE: navigation only -- modes, regions, search, guide, the next step,
// Escape. Tool-level keys stay with the tool that owns them (camera views in
// ViewToolbar, dissection in DissectionPanel): those depend on state this hook
// has no business reading, and they only make sense while their surface is
// mounted, which is exactly the guarantee a local listener gives you.
//
// `enabled` is how the hook yields the keyboard. A modal that owns the keyboard
// (the onboarding tour with its arrow keys, the command palette with its own
// Enter/arrows) must not have Shift+Right stolen out from under it, and a user
// half-way through typing must not switch region because the word had an "n" in
// it -- isTypingTarget covers the second case, `enabled` the first.
//
// Handlers are kept in a ref so the listener binds once: passing inline arrow
// functions from App would otherwise tear down and re-attach the listener on
// every render of a component that re-renders on every hover.

import { useEffect, useRef } from 'react';
import { isTypingTarget } from '../lib/shortcuts';
import type { AppMode } from '../components/TopBar';

export interface AppShortcutHandlers {
  /** Jump to a mode (Shift+1..4). */
  onMode: (mode: AppMode) => void;
  /** Step the module list by ±1 (Shift+Left / Shift+Right). */
  onRegionStep: (steps: number) => void;
  /** Take the suggested next step (N). */
  onNextStep: () => void;
  /** Open the command palette (/). */
  onSearch: () => void;
  /** Open the quick guide (G). */
  onGuide: () => void;
  /** Open the shortcut sheet (?). */
  onShortcuts: () => void;
  /** Escape: close what is open, or drop the current selection. */
  onEscape: () => void;
}

/** Shift + these physical keys select a mode, in route order. */
const MODE_CODES: Record<string, number> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
};

export function useAppShortcuts(
  handlers: AppShortcutHandlers,
  modes: AppMode[],
  enabled: boolean,
): void {
  const ref = useRef(handlers);
  ref.current = handlers;

  const modesRef = useRef(modes);
  modesRef.current = modes;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      if (isTypingTarget(e)) return;
      const h = ref.current;

      // Shift + digit -> mode. Matched on `code` so it survives non-US layouts,
      // where Shift+1 does not produce "1". See lib/shortcuts.ts.
      if (e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const slot = MODE_CODES[e.code];
        if (slot !== undefined) {
          const target = modesRef.current[slot];
          if (target) {
            e.preventDefault();
            h.onMode(target);
          }
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          h.onRegionStep(-1);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          h.onRegionStep(1);
          return;
        }
      }

      // Everything below is modifier-free: Cmd/Ctrl combinations belong to the
      // browser (Ctrl+N is a new window) and to the palette's own Cmd+K.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '?') {
        e.preventDefault();
        h.onShortcuts();
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        h.onSearch();
        return;
      }
      if (e.key === 'Escape') {
        h.onEscape();
        return;
      }

      // Single letters last, and only unshifted, so "?" (Shift+' on a Spanish
      // keyboard) can never be read as a stray letter.
      if (e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === 'g') {
        e.preventDefault();
        h.onGuide();
      } else if (k === 'n') {
        e.preventDefault();
        h.onNextStep();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
