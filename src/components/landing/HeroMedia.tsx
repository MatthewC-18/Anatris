// src/components/landing/HeroMedia.tsx
//
// The landing's hero visual.
//
// WHY THIS EXISTS: the page used to sell the product with a hand-drawn SVG
// goniometer. It's a good graphic, but it is not the product — the thing that
// actually differentiates Anatris (the rig moving through a range while the
// protagonist muscle and the humero-scapular ratio update live) appeared
// NOWHERE on the page a visitor decides from. A short silent loop of the real
// movement lab does more selling than any amount of copy.
//
// GRACEFUL BY DESIGN: the clip is an optional asset. Until `public/hero-lab.*`
// exists the component falls back to the goniometer, so the landing never ships
// a broken media box. See `docs/hero-clip.md` for how to record it.
//
// The video is decorative-but-informative: muted + loop + playsInline so it
// autoplays on iOS Safari without taking over the screen, `preload="metadata"`
// so it does not compete with the app chunks for bandwidth on first paint, and
// no controls so it reads as an instrument panel rather than a media player.

import { useRef, useState } from 'react';
import { Goniometer } from './Goniometer';

/** Sources tried in order. Every one must fail before we fall back. */
const SOURCES: { src: string; type: string }[] = [
  { src: '/hero-lab.webm', type: 'video/webm' },
  { src: '/hero-lab.mp4', type: 'video/mp4' },
];

export function HeroMedia({ className }: { className?: string }) {
  // How many <source> candidates have reported failure. Counting them (rather
  // than falling back on the first error) means a missing .webm does not hide a
  // perfectly good .mp4.
  const failures = useRef(0);
  const [failed, setFailed] = useState(false);

  function onSourceError() {
    failures.current += 1;
    if (failures.current >= SOURCES.length) setFailed(true);
  }

  if (failed) return <Goniometer className={className} />;

  return (
    <video
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label="Laboratorio de movimiento: abducción de hombro con el músculo protagonista y el ritmo húmero-escapular actualizándose en cada grado"
      // The element itself errors when the resource-selection algorithm runs
      // out of candidates; the per-source handlers cover browsers that only
      // report failure on the <source>.
      onError={() => setFailed(true)}
    >
      {SOURCES.map((s) => (
        <source key={s.src} src={s.src} type={s.type} onError={onSourceError} />
      ))}
    </video>
  );
}
