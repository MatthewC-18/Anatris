// scripts/gen-og-image.mjs
//
// Generates public/og-image.png (1200x630) — the preview card that appears when
// someone shares an Anatris link on WhatsApp, LinkedIn, Slack or X.
//
// WHY A SCRIPT AND NOT A HAND-MADE PNG: the card carries live product facts
// (region count, muscle count, test count). Regenerating it is one command, so
// it never drifts from what the app actually contains.
//
// Run:  npm run gen-og-image
//
// ---------------------------------------------------------------------------
// THIS IS A PLACEHOLDER, AND IT SHOULD BE REPLACED.
// A designed card converts far worse than a real frame of the movement lab
// (rig mid-abduction, goniometer, protagonist muscle). The WebGL canvas cannot
// be captured from the embedded tooling, so grab the frame yourself — see
// docs/hero-clip.md — crop it to 1200x630 and drop it in as public/og-image.png.
// ---------------------------------------------------------------------------

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../public/og-image.png');

const W = 1200;
const H = 630;

// Brand colours, mirrored from tailwind.config.js.
const INK_950 = '#070b14';
const INK_900 = '#0b1120';
const ACCENT = '#22d3ee';
const SLATE_50 = '#f8fafc';
const SLATE_400 = '#94a3b8';
const SLATE_600 = '#475569';
const SLATE_800 = '#1e293b';
const ROLE_PRIME = '#f59e0b';
const ROLE_ASSIST = '#38bdf8';
const ROLE_STABILIZE = '#a78bfa';

/**
 * Facts shown on the card. Keep in sync with the app's real content.
 *
 * COUNT THESE, DO NOT ESTIMATE. The test figure is the number of TESTS (79),
 * which is not the same as the number of test CITATIONS the clinical audit
 * reports (85 — several tests carry two sources). Publishing the larger number
 * would inflate the product on the one asset whose entire pitch is rigour.
 */
const STATS = [
  { value: '6', label: 'regiones clínicas' },
  { value: '113', label: 'músculos con ficha' },
  { value: '79', label: 'tests con sens/spec' },
];

// ---- Goniometer geometry (the brand's signature graphic) -------------------
const O = { x: 905, y: 430 }; // pivot
const R = 190; // scale radius
const ANGLE = 116; // the "measured" position

const polar = (deg, r = R) => {
  const a = (deg * Math.PI) / 180;
  return { x: O.x + r * Math.cos(a), y: O.y - r * Math.sin(a) };
};

const arcPoints = Array.from({ length: 91 }, (_, i) => polar(i * 2))
  .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
  .join(' ');

const wedge =
  `M ${O.x} ${O.y} ` +
  Array.from({ length: 40 }, (_, i) => {
    const p = polar((ANGLE / 39) * i, R - 34);
    return `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(' ') +
  ' Z';

const ticks = Array.from({ length: 13 }, (_, i) => i * 15)
  .map((d) => {
    const major = d % 45 === 0;
    const a = polar(d, R);
    const b = polar(d, R - (major ? 22 : 12));
    return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${major ? SLATE_400 : SLATE_600}" stroke-width="${major ? 2 : 1.5}"/>`;
  })
  .join('');

const markers = [
  { deg: 24, fill: ROLE_PRIME },
  { deg: 72, fill: ROLE_ASSIST },
  { deg: 118, fill: ROLE_PRIME },
  { deg: 158, fill: ROLE_STABILIZE },
]
  .map((m) => {
    const p = polar(m.deg, R);
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="7" fill="${m.fill}"/>`;
  })
  .join('');

const tip = polar(ANGLE, R - 6);

// librsvg (sharp's SVG backend) only has the host's fonts, so no Sora/IBM Plex
// here — a generic stack keeps the render predictable across machines.
const FONT = 'DejaVu Sans, Helvetica, Arial, sans-serif';

const statBlocks = STATS.map((s, i) => {
  const x = 80 + i * 200;
  return `
    <text x="${x}" y="536" font-family="${FONT}" font-size="40" font-weight="700" fill="${SLATE_50}">${s.value}</text>
    <text x="${x}" y="566" font-family="${FONT}" font-size="17" fill="${SLATE_600}">${s.label}</text>`;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${INK_900}"/>
      <stop offset="100%" stop-color="${INK_950}"/>
    </linearGradient>
    <radialGradient id="glow" cx="75%" cy="65%" r="45%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="${SLATE_800}" stroke-width="1" stroke-opacity="0.45"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- goniometer -->
  <path d="${wedge}" fill="${ACCENT}" fill-opacity="0.10"/>
  <line x1="${O.x - R - 10}" y1="${O.y}" x2="${O.x + R + 10}" y2="${O.y}" stroke="${SLATE_800}" stroke-width="2"/>
  <polyline points="${arcPoints}" fill="none" stroke="${SLATE_600}" stroke-width="2.5" stroke-linecap="round"/>
  ${ticks}
  <line x1="${O.x}" y1="${O.y}" x2="${polar(0, R - 34).x.toFixed(1)}" y2="${polar(0, R - 34).y.toFixed(1)}" stroke="${SLATE_400}" stroke-width="4" stroke-linecap="round"/>
  <line x1="${O.x}" y1="${O.y}" x2="${tip.x.toFixed(1)}" y2="${tip.y.toFixed(1)}" stroke="${ACCENT}" stroke-width="4" stroke-linecap="round"/>
  ${markers}
  <circle cx="${O.x}" cy="${O.y}" r="8" fill="${INK_900}" stroke="${ACCENT}" stroke-width="3"/>
  <text x="${(tip.x + 14).toFixed(1)}" y="${(tip.y - 10).toFixed(1)}" font-family="${FONT}" font-size="30" font-weight="700" fill="${ACCENT}">${ANGLE}°</text>

  <!-- wordmark -->
  <circle cx="88" cy="82" r="11" fill="none" stroke="${ACCENT}" stroke-width="3"/>
  <text x="112" y="93" font-family="${FONT}" font-size="30" font-weight="700" fill="${SLATE_50}">Anatris</text>

  <!-- kicker -->
  <line x1="80" y1="176" x2="128" y2="176" stroke="${ACCENT}" stroke-width="3"/>
  <text x="144" y="184" font-family="${FONT}" font-size="19" letter-spacing="3" fill="${SLATE_600}">ANATOMÍA CLÍNICA · BIOMECÁNICA · ROM</text>

  <!-- headline -->
  <text x="80" y="268" font-family="${FONT}" font-size="60" font-weight="700" fill="${SLATE_50}">Estudia el <tspan fill="${ACCENT}">movimiento</tspan>,</text>
  <text x="80" y="340" font-family="${FONT}" font-size="60" font-weight="700" fill="${SLATE_50}">no solo la anatomía.</text>

  <!-- subhead -->
  <text x="80" y="400" font-family="${FONT}" font-size="23" fill="${SLATE_400}">Atlas 3D y laboratorio de movimiento para fisioterapia.</text>
  <text x="80" y="436" font-family="${FONT}" font-size="23" fill="${SLATE_400}">Cada dato, con su fuente.</text>

  <!-- stats -->
  <line x1="80" y1="486" x2="640" y2="486" stroke="${SLATE_800}" stroke-width="2"/>
  ${statBlocks}

  <!-- bottom accent rule -->
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="${ACCENT}"/>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log(`og:image escrito en ${OUT} (${W}x${H})`);
