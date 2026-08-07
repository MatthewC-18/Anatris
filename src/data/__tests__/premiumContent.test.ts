// src/data/__tests__/premiumContent.test.ts
//
// Guards the server-side entitlement model. The paid clinical library used to
// ship inside public JavaScript chunks, so anyone could read it without an
// account. These tests exist because that regression is INVISIBLE: nothing
// throws, no type breaks, the app looks fine — the content is just public
// again. Only a test that inspects the imports and the generated payloads can
// catch it.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FREE_REGIONS } from '../../auth/entitlements';
import {
  ALL_CASES_BY_REGION,
  ALL_MUSCLE_CONTENT_BY_REGION,
  ALL_MUSCLES_BY_REGION,
  ALL_PATHOLOGIES_BY_REGION,
  ALL_REGION_IDS,
  ALL_ROM_BY_REGION,
  ALL_TESTS_BY_REGION,
} from '../fullContent';
import { ROM_BY_REGION } from '../romByRegion';
import { MUSCLES_BY_REGION } from '../musclesByRegion';
import { MUSCLE_CONTENT_BY_REGION } from '../muscleContentByRegion';
import { TRACK_BY_REGION } from '../trackByRegion';
import { CLINICAL_CASES } from '../clinicalCases';
import { ORTHOPEDIC_TESTS_BY_REGION } from '../orthopedicTests';

const SRC = resolve(__dirname, '../..');
const PAYLOAD_DIR = resolve(SRC, '../supabase/functions/content/payloads');

/** Every .ts/.tsx file under src/, excluding tests and the full registry itself. */
function appSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      appSourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('the runtime registries carry only free content', () => {
  const registries: [string, Record<string, unknown>][] = [
    ['romByRegion', ROM_BY_REGION],
    ['musclesByRegion', MUSCLES_BY_REGION],
    ['muscleContentByRegion', MUSCLE_CONTENT_BY_REGION],
    ['trackByRegion', TRACK_BY_REGION],
    ['clinicalCases', CLINICAL_CASES],
    ['orthopedicTests', ORTHOPEDIC_TESTS_BY_REGION],
  ];

  for (const [name, registry] of registries) {
    it(`${name} has no premium region statically bundled`, () => {
      const leaked = Object.keys(registry).filter((r) => !FREE_REGIONS.has(r));
      expect(leaked).toEqual([]);
    });
  }
});

describe('app code never imports the full clinical library', () => {
  it('only the audit and the premium loader may reach fullContent', () => {
    // clinicalAudit runs in Node only (CLI + tests); premiumContent's import is
    // inside `if (import.meta.env.DEV)` so Vite drops it from production.
    const allowed = new Set([
      resolve(SRC, 'lib/clinicalAudit.ts'),
      resolve(SRC, 'lib/premiumContent.ts'),
      resolve(SRC, 'data/fullContent.ts'),
    ]);

    const offenders = appSourceFiles(SRC)
      .filter((f) => !allowed.has(f))
      .filter((f) => /from\s+['"][^'"]*fullContent['"]/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(SRC.length + 1).replace(/\\/g, '/'));

    expect(offenders).toEqual([]);
  });

  it("the dev-only fullContent import stays behind import.meta.env.DEV", () => {
    const src = readFileSync(resolve(SRC, 'lib/premiumContent.ts'), 'utf8');
    // A STATIC import would be bundled unconditionally; it must be dynamic and
    // it must sit under the DEV flag Vite can constant-fold away.
    expect(src).not.toMatch(/^import .*fullContent/m);
    expect(src).toMatch(/import\.meta\.env\.DEV/);
    expect(src).toMatch(/await import\(['"]\.\.\/data\/fullContent['"]\)/);
  });
});

describe('generated payloads', () => {
  const premiumRegions = ALL_REGION_IDS.filter((r) => !FREE_REGIONS.has(r)).sort();

  it('exist for every premium region', () => {
    const written = readdirSync(PAYLOAD_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort();
    expect(written).toEqual(premiumRegions);
  });

  it('are in sync with the source data', () => {
    // Catches the "edited the clinical data, forgot to re-run
    // build-premium-content" failure, which would otherwise ship stale content
    // to paying users while the repo looked correct.
    //
    // Checks EVERY content field, not just ROM: a verification pass that only
    // touches `tests` or `pathologies` is exactly the kind of edit that would
    // slip through a ROM-only comparison — and it already nearly did.
    const sources: Record<string, Record<string, unknown>> = {
      rom: ALL_ROM_BY_REGION,
      tests: ALL_TESTS_BY_REGION,
      cases: ALL_CASES_BY_REGION,
      muscles: ALL_MUSCLES_BY_REGION,
      content: ALL_MUSCLE_CONTENT_BY_REGION,
      pathologies: ALL_PATHOLOGIES_BY_REGION,
    };

    for (const region of premiumRegions) {
      const payload = JSON.parse(
        readFileSync(join(PAYLOAD_DIR, `${region}.json`), 'utf8'),
      ) as Record<string, unknown>;
      expect(payload.region).toBe(region);
      for (const [field, source] of Object.entries(sources)) {
        expect(
          JSON.stringify(payload[field]),
          `${region}.${field} está desincronizado: corre "npm run build-premium-content"`,
        ).toBe(JSON.stringify(source[region] ?? (field === 'content' ? {} : [])));
      }
    }
  });

  it('never include a free region', () => {
    const written = readdirSync(PAYLOAD_DIR).map((f) => f.replace(/\.json$/, ''));
    for (const region of written) expect(FREE_REGIONS.has(region)).toBe(false);
  });
});
