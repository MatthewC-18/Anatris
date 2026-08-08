// src/hooks/useIsCompact.ts
//
// One definition of "compact" for the whole app.
//
// This hook existed twice, copy-pasted into App.tsx and Viewer3D.tsx, and the
// movement lab then invented its own breakpoints inline (`max-width: 639px` in
// LayerControls and MovementControls). Three sources of truth for "is this a
// phone" is how a layout ends up half-adapted: the console reflowed at 640px
// while the shell reflowed at 1024px, so between those widths the lab was
// neither one layout nor the other.
//
// lg (1024px) is the line where the app switches from the desktop
// floating-instrument layout to the phone/tablet stacked one.

import { useEffect, useState } from 'react';

const COMPACT_QUERY = '(max-width: 1023px)';

/** True when the viewport is below the lg breakpoint (Tailwind lg = 1024px). */
export function useIsCompact(): boolean {
  const [compact, setCompact] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(COMPACT_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(COMPACT_QUERY);
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    mq.addEventListener('change', onChange);
    // Re-read on mount: the query can already have changed between the initial
    // state and the effect (rotation, split-view resize).
    setCompact(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return compact;
}
