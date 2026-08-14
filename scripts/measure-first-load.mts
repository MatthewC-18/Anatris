// What does a first-time visitor actually download, and in what order?
//
// The physiotherapist's first note was "lento". The repeat visit was fixed by
// caching (see vercel.json), but the FIRST load was only ever estimated from
// file sizes on disk -- which is not the same question, because it does not say
// which files a cold visitor fetches, whether they are fetched in parallel with
// the code, or what the transport actually puts on the wire.
//
// This serves the real `dist/` over HTTP and drives a real browser at it, so the
// answer comes from the network log rather than from `ls`.
//
// Needs a browser driver, which is NOT a dependency of the app:
//   npm install --no-save playwright
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/measure-first-load.mts [flags]
//   --route=/hombro/explorar  go straight to a view instead of the landing page
//   --offline-fast            fail third-party calls immediately instead of
//                             letting them hang, so the number measures OUR app
//   --gzip                    serve with transport compression, to price it
import { createServer } from 'node:http';
import { createReadStream, statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const GZIP = process.argv.includes('--gzip');
const ROOT = new URL('../dist/', import.meta.url).pathname;
const PORT = 4319;

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};
/** What a CDN would compress. Vercel's default list does NOT include model/*. */
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.webmanifest', '.glb']);

const cache = new Map<string, Buffer>();

const server = createServer((req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  let path = join(ROOT, normalize(url));
  try {
    if (!statSync(path).isFile()) throw new Error('dir');
  } catch {
    path = join(ROOT, 'index.html'); // SPA fallback, as vercel.json rewrites
  }
  const ext = extname(path);
  res.setHeader('Content-Type', TYPES[ext] ?? 'application/octet-stream');
  if (GZIP && COMPRESSIBLE.has(ext)) {
    let body = cache.get(path);
    if (!body) {
      body = gzipSync(readFileSync(path), { level: 6 });
      cache.set(path, body);
    }
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Length', String(body.length));
    res.end(body);
    return;
  }
  res.setHeader('Content-Length', String(statSync(path).size));
  createReadStream(path).pipe(res);
});
await new Promise<void>((r) => server.listen(PORT, r));

// Software GL, so the canvas really rasterises in a headless container -- without
// it an empty canvas would be indistinguishable from a model that failed to load.
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();

// This harness has no route to the internet, so a third-party call does not fail
// fast -- it hangs until the proxy resets it, which would be measured as if the
// app itself were slow. `--offline-fast` fails those calls IMMEDIATELY instead,
// which is what a real network does when a host is unreachable. The difference
// between the two runs is exactly how much of the first paint is being spent
// waiting on somebody else's server.
if (process.argv.includes('--offline-fast'))
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return route.continue();
    return route.abort('addressunreachable');
  });

interface Row { url: string; bytes: number; type: string; start: number; end: number }
const rows: Row[] = [];
const started = new Map<string, number>();
const t0 = Date.now();
page.on('request', (r) => started.set(r.url(), Date.now() - t0));
page.on('response', async (r) => {
  const req = r.request();
  let bytes = 0;
  const len = r.headers()['content-length'];
  if (len) bytes = Number(len);
  else {
    try { bytes = (await r.body()).length; } catch { bytes = 0; }
  }
  rows.push({
    url: new URL(r.url()).pathname,
    bytes,
    type: req.resourceType(),
    start: started.get(r.url()) ?? 0,
    end: Date.now() - t0,
  });
});

page.on('console', (m) => {
  if (m.type() === 'error') console.log(`  [console error] ${m.text().slice(0, 140)}`);
});
page.on('pageerror', (e) => console.log(`  [page error] ${String(e).slice(0, 140)}`));

const ROUTE = (process.argv.find((a) => a.startsWith('--route=')) ?? '--route=/').slice(8);
await page.goto(`http://localhost:${PORT}${ROUTE}`, { waitUntil: 'load', timeout: 120000 });
// The big model is fetched by the 3D view, well after `load`. Wait for the
// network to go quiet rather than for a lifecycle event.
try {
  await page.waitForLoadState('networkidle', { timeout: 120000 });
} catch {
  /* a long-running fetch is itself a finding; report what we have */
}
// The educational-use notice gates the whole app, so nothing 3D is fetched until
// it is accepted. Accepting it is part of "entering the lab" and has to be in the
// measurement, or the model never loads at all.
const accept = page.getByRole('button', { name: /Acepto y contin/i });
if (await accept.count()) {
  // Wait for the MODEL specifically. `networkidle` races it: the 3D chunk mounts
  // a moment after the click, so the network can look quiet before the fetch has
  // even started.
  const modelDone = page
    .waitForResponse((r) => /\.glb(\.gz)?(\?|$)/.test(r.url()), { timeout: 180000 })
    .catch(() => null);
  await accept.first().click();
  await modelDone;
  try {
    await page.waitForLoadState('networkidle', { timeout: 180000 });
  } catch {
    /* report what we have */
  }
}
const painted = Date.now() - t0;

const paints = await page.evaluate(() =>
  performance.getEntriesByType('paint').map((e) => ({ name: e.name, t: Math.round(e.startTime) })),
);
console.log('paint:', paints.map((p) => `${p.name} ${p.t}ms`).join(', ') || '(none)');

rows.sort((a, b) => b.bytes - a.bytes);
const total = rows.reduce((a, r) => a + r.bytes, 0);
console.log(`transport: ${GZIP ? 'gzip' : 'identity (no compression)'}`);
console.log(`${rows.length} requests, ${(total / 1024 / 1024).toFixed(1)} MB total, quiet at ${painted} ms\n`);
console.log('     MB   type        start    end   resource');
for (const r of rows.slice(0, 14))
  console.log(
    `${(r.bytes / 1024 / 1024).toFixed(2).padStart(7)}  ${r.type.padEnd(10)} ${String(r.start).padStart(6)} ${String(r.end).padStart(6)}   ${r.url}`,
  );

const byType = new Map<string, number>();
for (const r of rows) byType.set(r.type, (byType.get(r.type) ?? 0) + r.bytes);
console.log('\nby resource type:');
for (const [t, b] of [...byType.entries()].sort((a, c) => c[1] - a[1]))
  console.log(`  ${(b / 1024 / 1024).toFixed(2).padStart(7)} MB  ${t}`);

// Downloading the model is not the same as MOUNTING it. Reading pixels back off
// the WebGL canvas does not work (without `preserveDrawingBuffer` the buffer is
// blank by the time we could read it), so the check is on the DOM instead: the
// Suspense fallback is gone and no error boundary took its place. That the
// inflated bytes are the right bytes is proved separately and exactly, by
// comparing the hash of the inflated `.gz` against the plain `.glb`.
// ...and WAIT for it. Parsing 2.8M triangles is not instant, so checking the DOM
// the moment the download finishes measures the parse, not the bug. This waits up
// to a minute for the overlay to lift and reports how long it took -- which is
// both the correctness check and the number worth knowing.
const overlayGone = Date.now();
const lifted = await page
  .waitForFunction(() => !/Cargando modelo anat/i.test(document.body.innerText), null, {
    timeout: 60000,
  })
  .then(() => Date.now() - overlayGone)
  .catch(() => null);
console.log(
  lifted === null
    ? '\noverlay: NEVER LIFTED (60 s) -- the model is loaded but the veil is stuck'
    : `\noverlay: lifted ${(lifted / 1000).toFixed(1)} s after the download`,
);

const state = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    canvas: !!document.querySelector('canvas'),
    overlay: /Cargando modelo anat/i.test(text),
    pct: (text.match(/·\s*(\d+)%/) ?? [])[1] ?? null,
    broke: /algo ha ido mal|ha ocurrido un error/i.test(text),
  };
});
console.log(
  `\nmounted: canvas ${state.canvas ? 'present' : 'MISSING'}` +
    `, loading overlay ${state.overlay ? `STILL SHOWING at ${state.pct}%` : 'gone'}` +
    `, error boundary ${state.broke ? 'TRIPPED' : 'clear'}`,
);

if (process.env.SHOT) {
  await page.screenshot({ path: process.env.SHOT, fullPage: false, timeout: 60000 }).catch(() => {});
  console.log(`screenshot -> ${process.env.SHOT}`);
}

await browser.close();
server.close();
