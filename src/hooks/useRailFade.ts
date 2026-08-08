// src/hooks/useRailFade.ts
//
// Tells a horizontal `.rail` whether it currently has content past its right
// edge, so the trailing fade (`.rail-fade-end` in index.css) is applied ONLY
// when there is something to scroll to.
//
// The fade cannot live on `.rail` itself: a mask is unconditional, so a rail
// whose chips already fit would render its last chip half-transparent for no
// reason. And the fade cannot be skipped either -- the scrollbar is hidden, so
// on a phone the movement rail simply ended mid-word ("Rotación in|") with no
// hint that four more movements existed to the right.

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Returns a ref to attach to the rail element and whether it overflows to the
 * right. Re-measures on resize, on scroll, and whenever the element's contents
 * change size.
 */
export function useRailFade<T extends HTMLElement>(): {
  ref: React.RefObject<T>;
  faded: boolean;
} {
  const ref = useRef<T>(null);
  const [faded, setFaded] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 2px of slack: sub-pixel layout rounding otherwise reports a permanent
    // one-pixel overflow on rails that visually fit exactly.
    setFaded(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    // ResizeObserver catches BOTH the rail being resized and its chips changing
    // (a region switch swaps the movement list, which changes the total width
    // without any resize or scroll event firing).
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [measure]);

  return { ref, faded };
}
