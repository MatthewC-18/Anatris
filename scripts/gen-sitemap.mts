// scripts/gen-sitemap.mts
//
// Writes public/sitemap.xml and public/robots.txt from the SAME slug tables the
// app routes with (src/lib/routing.ts), so a region can never exist in the app
// but be missing from the sitemap -- or worse, be listed under a slug that
// 404s.
//
// Until this ran, the whole app lived on a single URL: nothing to submit, and
// no way for a search engine to know the knee or the movement lab existed.
//
// Usage:  npx tsx --tsconfig tsconfig.scripts.json scripts/gen-sitemap.mts
// Set SITE_URL to the production origin (defaults to the .app domain).

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { allRoutes } from '../src/lib/routing';

const SITE = (process.env.SITE_URL ?? 'https://anatris.app').replace(/\/$/, '');
const today = new Date().toISOString().slice(0, 10);

// The landing is the entry point, then every region/mode pair. "explorar" is
// the canonical view of a region, so it gets the higher priority.
const urls = [
  { loc: `${SITE}/`, priority: '1.0' },
  ...allRoutes().map((path) => ({
    loc: SITE + path,
    priority: path.endsWith('/explorar') ? '0.8' : '0.6',
  })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`,
  )
  .join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;

const publicDir = resolve(import.meta.dirname, '..', 'public');
writeFileSync(resolve(publicDir, 'sitemap.xml'), sitemap, 'utf8');
writeFileSync(resolve(publicDir, 'robots.txt'), robots, 'utf8');

console.log(`sitemap.xml: ${urls.length} URLs (${SITE})`);
console.log('robots.txt escrito');
