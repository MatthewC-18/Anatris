// scripts/gen-pwa-icons.mjs
//
// Generates the PWA / iOS icon PNGs from the Anatris goniometer motif (same as
// public/favicon.svg: a measuring arm + arc + pivot dot). Run after changing the
// brand mark:  node scripts/gen-pwa-icons.mjs
//
// Outputs into public/:
//   pwa-192x192.png, pwa-512x512.png          (standard, rounded)
//   pwa-maskable-512x512.png                  (full-bleed, motif in the safe zone)
//   apple-touch-icon.png (180)                (opaque square; iOS rounds it)
//   favicon-32x32.png                         (small raster fallback)

import sharp from 'sharp';

const BG = '#0b1120';
const BONE = '#e2e8f0';
const CYAN = '#22d3ee';

// The favicon motif lives in a 24x24 box. We place it inside a 512 canvas with a
// transform so it reads at icon scale.
const motif = (scale, tx, ty) => `
  <g transform="translate(${tx},${ty}) scale(${scale})" fill="none" stroke-linecap="round">
    <path d="M7 18.5V7" stroke="${BONE}" stroke-width="2.2"/>
    <path d="M7 18.5L16.5 12.2" stroke="${BONE}" stroke-width="2.2"/>
    <path d="M7 8.1A9.5 9.5 0 0 1 15.6 11.2" stroke="${CYAN}" stroke-width="1.9"/>
    <circle cx="7" cy="18.5" r="2.3" fill="${CYAN}" stroke="none"/>
  </g>`;

// Standard: rounded-rect dark tile + centered motif.
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${BG}"/>${motif(10, 140, 120)}
</svg>`;

// Maskable: full-bleed dark + slightly smaller motif inside the ~80% safe zone.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>${motif(8.6, 156, 140)}
</svg>`;

// Apple: opaque square (no transparency, no rounding — iOS applies its own mask).
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>${motif(10, 140, 120)}
</svg>`;

const png = (svg, size, out) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/${out}`);

await Promise.all([
  png(standardSvg, 192, 'pwa-192x192.png'),
  png(standardSvg, 512, 'pwa-512x512.png'),
  png(maskableSvg, 512, 'pwa-maskable-512x512.png'),
  png(appleSvg, 180, 'apple-touch-icon.png'),
  png(standardSvg, 32, 'favicon-32x32.png'),
]);

console.log('PWA icons generados en public/.');
