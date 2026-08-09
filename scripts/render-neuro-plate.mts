// scripts/render-neuro-plate.mts
//
// Rasterise the NEURO dermatome plate to a PNG contact sheet, so the figure can
// actually be LOOKED AT without booting the app.
//
// This exists because of a documented hole in the review loop (see
// docs/movement-lab-premium-roadmap.md, section 3): the lab's WebGL canvas does
// not paint in the embedded preview, so anything inside the movement lab has
// historically been verified by reading the DOM. A dermatome plate cannot be
// verified by reading the DOM -- "is this recognisably an arm" is not a question
// a bounding box answers -- and that is exactly how the plate this replaced
// stayed a stack of rectangles for so long.
//
// The geometry comes from buildPlateGeometry, the SAME builder DermatomeMap
// renders, so the sheet cannot flatter a figure the app draws differently. What
// is duplicated here is only the paint: fills, opacities and the two layers of
// the rim underlay, kept in step with the component by hand.
//
// USAGE
//   npx tsx --tsconfig tsconfig.scripts.json scripts/render-neuro-plate.mts [out.png]
//
// Each row is one figure; the columns are anterior / posterior, first with
// nothing selected and then with one root selected, so both states are judged.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import {
  buildPlateGeometry,
  pigmentFor,
  PLATES,
  type PlateFigure,
  type PlateView,
} from '../src/data/neuro/plate';

// Paint, mirroring DermatomeMap's constants.
const RIM = 'rgba(148,163,184,0.42)';
const SHADE = '#03070f';
const TISSUE = 'rgba(24,34,54,0.94)';
const ACCENT = '#22d3ee';
const FILL_ACTIVE = 0.9;
const FILL_IDLE = 0.44;
const FILL_DIMMED = 0.2;

// The panel's own backdrop, so contrast is judged against what ships.
const PANEL_BG = '#0f1626';

const SURFACE_MARKS: Record<PlateView, string[]> = {
  anterior: [
    'M46,47 C42,49 37,50 33,52',
    'M54,47 C58,49 63,50 67,52',
    'M50,52 L50,116',
    'M40,88 C44,94 50,95 50,95 C50,95 56,94 60,88',
  ],
  posterior: [
    'M50,46 C50,72 50,102 50,134',
    'M44,58 L41,79',
    'M56,58 L59,79',
    'M34,124 C42,120 58,120 66,124',
    'M50,138 L50,149',
  ],
};

const VIEWS: PlateView[] = ['anterior', 'posterior'];

/** Clip-id prefix. Unique per cell, since all cells share one composited sheet. */
function clipBase(figure: PlateFigure, view: PlateView): string {
  return `plate-${figure}-${view}`;
}

/** One figure in one view, as a standalone <svg> string. */
function renderPlate(figure: PlateFigure, view: PlateView, active: string[], px: number): string {
  const g = buildPlateGeometry(figure);
  const act = new Set(active);
  const hasSel = act.size > 0;
  const shapes = g.bodyShapes.map((d) => `<path d="${d}"/>`).join('');
  const limbClips = g.limbShapes
    .map((d, i) => `<clipPath id="${clipBase(figure, view)}-limb${i}"><path d="${d}"/></clipPath>`)
    .join('');

  const bands = g.spec.order
    .map((root) => {
      const paths = g.byView[view].get(root);
      if (!paths) return '';
      const pigment = pigmentFor(figure, root);
      const isActive = act.has(root);
      const fo = isActive ? FILL_ACTIVE : hasSel ? FILL_DIMMED : FILL_IDLE;
      const clipped = paths
        .map(
          (p) =>
            `<path d="${p.d}" clip-path="url(#${clipBase(figure, view)}-limb${p.limbIndex})"/>`,
        )
        .join('');
      const rim = isActive
        ? `<g fill="none" stroke="${ACCENT}" stroke-width="2.6" stroke-linejoin="round" opacity="0.95">${clipped}</g>`
        : '';
      const fill = `<g fill="${pigment}" fill-opacity="${fo}" stroke="${pigment}" stroke-width="0.5" stroke-opacity="${
        hasSel && !isActive ? 0.35 : 0.7
      }">${clipped}</g>`;
      return rim + fill;
    })
    .join('');

  const marks = SURFACE_MARKS[view]
    .map((d) => `<path d="${d}"/>`)
    .join('');

  const pins = g.pins
    .filter((p) => p.view === view && act.has(p.root))
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="4.4" fill="none" stroke="${pigmentFor(
          figure,
          p.root,
        )}" stroke-width="1.6"/>` +
        `<circle cx="${p.x}" cy="${p.y}" r="2.6" fill="none" stroke="${ACCENT}" stroke-width="1"/>` +
        `<circle cx="${p.x}" cy="${p.y}" r="1.1" fill="#f8fafc"/>`,
    )
    .join('');

  const [, , vbw, vbh] = g.spec.viewBox.split(/\s+/).map(Number);
  const h = Math.round((px * vbh) / vbw);
  const clip = clipBase(figure, view);
  const grads = g.shapeXBounds
    .map(
      ([x0, x1], i) =>
        `<linearGradient id="${clip}-vol${i}" gradientUnits="userSpaceOnUse" x1="${x0}" y1="0" x2="${x1}" y2="0">` +
        `<stop offset="0" stop-color="${SHADE}" stop-opacity="0.5"/>` +
        `<stop offset="0.3" stop-color="${SHADE}" stop-opacity="0"/>` +
        `<stop offset="0.68" stop-color="${SHADE}" stop-opacity="0"/>` +
        `<stop offset="1" stop-color="${SHADE}" stop-opacity="0.42"/></linearGradient>`,
    )
    .join('');
  const volume = g.bodyShapes
    .map((d, i) => `<path d="${d}" fill="url(#${clip}-vol${i})"/>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${h}" viewBox="${g.spec.viewBox}">
<defs><clipPath id="${clip}">${shapes}</clipPath>${limbClips}${grads}</defs>
<g fill="${RIM}" stroke="${RIM}" stroke-width="1.4" stroke-linejoin="round">${shapes}</g>
<g fill="${TISSUE}">${shapes}</g>
${bands}
<g>${volume}</g>
<g clip-path="url(#${clip})" fill="none" stroke="rgba(203,213,225,0.3)" stroke-width="0.7" stroke-linecap="round">${marks}</g>
${pins}
</svg>`;
}

/** A caption strip, so a panel of eight figures is readable. */
function label(text: string, w: number): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="22">
<rect width="${w}" height="22" fill="${PANEL_BG}"/>
<text x="${w / 2}" y="15" text-anchor="middle" font-family="sans-serif" font-size="12"
  fill="#94a3b8">${text}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main(): Promise<void> {
  const out = process.argv[2] ?? 'neuro-plate.png';
  const CELL = 210;
  const GAP = 10;

  // Columns: (anterior, posterior) with nothing selected, then with one root.
  const cases: { figure: PlateFigure; view: PlateView; active: string[]; caption: string }[] = [];
  for (const figure of Object.keys(PLATES) as PlateFigure[]) {
    const probe = figure === 'upper-limb' ? 'C6' : 'S1';
    for (const active of [[], [probe]]) {
      for (const view of VIEWS) {
        cases.push({
          figure,
          view,
          active,
          caption: `${figure} ${view}${active.length ? ` · ${active[0]}` : ' · sin seleccion'}`,
        });
      }
    }
  }

  // Rasterise each cell, then place them on a 4-wide grid.
  const cells = await Promise.all(
    cases.map(async (c) => ({
      ...c,
      png: await sharp(Buffer.from(renderPlate(c.figure, c.view, c.active, CELL)))
        .png()
        .toBuffer(),
    })),
  );
  const metas = await Promise.all(cells.map((c) => sharp(c.png).metadata()));
  const rowH = Math.max(...metas.map((m) => m.height ?? 0)) + 26;
  const cols = 4;
  const rows = Math.ceil(cells.length / cols);
  const W = cols * CELL + (cols + 1) * GAP;
  const H = rows * rowH + (rows + 1) * GAP;

  const composites: sharp.OverlayOptions[] = [];
  for (let i = 0; i < cells.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = GAP + col * (CELL + GAP);
    const top = GAP + row * (rowH + GAP);
    composites.push({ input: cells[i].png, left, top });
    composites.push({ input: await label(cells[i].caption, CELL), left, top: top + rowH - 22 });
  }

  await sharp({
    create: { width: W, height: H, channels: 3, background: PANEL_BG },
  })
    .composite(composites)
    .png()
    .toFile(out);

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  console.log(`Plate sheet -> ${out} (${W}x${H})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
