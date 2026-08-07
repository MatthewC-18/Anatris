// scripts/triage-citations.mts
//
// Sorts the UNVERIFIED clinical citations by HOW they can be verified, so the
// remaining work is a costed list instead of a fog.
//
// Why this exists: two verification passes (2026-08-04 and 2026-08-06) landed on
// the same wall from different directions. The lesson is that "unverified" is
// not one job but three, with wildly different costs:
//
//   LIBRO      the source is a textbook (Kapandji, Oatis, Neumann, Magee). Not
//              online in any legal form. Needs the physical copy. Cheap per item
//              once you have the book open, and one book covers many items.
//   TEXTO      the source is a journal article whose ABSTRACT does not carry the
//              figures. They live in paywalled full-text tables. Needs library
//              access. Slow, one article at a time.
//   RESUMEN    the figures ARE in the public abstract. Verifiable from a browser
//              in minutes. This bucket is now empty — it was harvested in the
//              two passes above (it is what caught the 4 real errors).
//
// Run: npm run triage-citations
//
// It reports COUNTS and the grouping; it never marks anything verified. Only a
// human with the source in front of them may flip `verified`/`pageVerified`.

import { REFERENCES } from '../src/data/references.ts';
import {
  ALL_ROM_BY_REGION,
  ALL_TESTS_BY_REGION,
} from '../src/data/fullContent.ts';

/** Reference ids that are books/standards rather than journal articles. */
const BOOKS = new Set(['kapandji', 'oatis', 'neumann', 'dufour', 'descriptive', 'magee', 'asia']);

type Route = 'LIBRO' | 'TEXTO';

interface Item {
  route: Route;
  ref: string;
  where: string;
  detail: string;
}

const items: Item[] = [];

// ----- ROM citations (page numbers in books) -----
//
// Counts BOTH the movement's range citation AND every phase citation, which is
// what `clinicalAudit` counts. Counting only `rangeCite` would report 71 where
// the audit reports 161 and make this tool quietly disagree with the number the
// user actually tracks.
for (const [region, movements] of Object.entries(ALL_ROM_BY_REGION)) {
  for (const mv of movements) {
    const sets: [string, typeof mv.rangeCite][] = [[`rango`, mv.rangeCite]];
    for (const ph of [...(mv.phases ?? []), ...(mv.labReverse?.phases ?? [])]) {
      sets.push([`fase "${ph.label}"`, ph.cite]);
    }
    for (const [ctx, cites] of sets) {
      for (const c of cites ?? []) {
        if (c.pageVerified) continue;
        items.push({
          route: BOOKS.has(c.ref) ? 'LIBRO' : 'TEXTO',
          ref: c.ref,
          where: `ROM ${region}/${mv.id}`,
          detail: `${ctx}${c.page ? ` p. ${c.page}` : ' (SIN PAGINA)'}`,
        });
      }
    }
  }
}

// ----- Orthopedic-test citations (sens/spec figures) -----
for (const [region, tests] of Object.entries(ALL_TESTS_BY_REGION)) {
  for (const t of tests) {
    for (const c of t.cite ?? []) {
      if (c.verified) continue;
      items.push({
        route: BOOKS.has(c.ref) ? 'LIBRO' : 'TEXTO',
        ref: c.ref,
        where: `TEST ${region}/${t.id}`,
        detail: `S=${t.metrics.sensitivity ?? '-'} E=${t.metrics.specificity ?? '-'}${c.locator ? ` [${c.locator}]` : ''}`,
      });
    }
  }
}

// ----- Report, grouped by route then by source (one source = one sitting) -----
const byRoute = new Map<Route, Map<string, Item[]>>();
for (const it of items) {
  const bySource = byRoute.get(it.route) ?? new Map<string, Item[]>();
  bySource.set(it.ref, [...(bySource.get(it.ref) ?? []), it]);
  byRoute.set(it.route, bySource);
}

console.log('\n===== TRIAJE DE CITAS SIN VERIFICAR =====\n');

for (const route of ['LIBRO', 'TEXTO'] as Route[]) {
  const bySource = byRoute.get(route);
  if (!bySource) continue;
  const total = [...bySource.values()].reduce((n, l) => n + l.length, 0);
  console.log(`\n---------- ${route}  (${total} citas, ${bySource.size} fuentes) ----------`);
  const sorted = [...bySource.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [ref, list] of sorted) {
    const meta = REFERENCES[ref];
    const link = meta?.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${meta.pmid}/` : '(sin PMID)';
    console.log(`\n  ${ref}  x${list.length}   ${link}`);
    console.log(`    ${(meta?.title ?? '??').slice(0, 88)}`);
    for (const it of list) console.log(`      - ${it.where.padEnd(34)} ${it.detail.slice(0, 76)}`);
  }
}

const libro = [...(byRoute.get('LIBRO')?.values() ?? [])].reduce((n, l) => n + l.length, 0);
const texto = [...(byRoute.get('TEXTO')?.values() ?? [])].reduce((n, l) => n + l.length, 0);

console.log('\n\n===== RESUMEN =====\n');
console.log(`  LIBRO (necesita el ejemplar):        ${libro}`);
console.log(`  TEXTO (necesita el texto completo):  ${texto}`);
console.log(`  TOTAL sin verificar:                 ${libro + texto}`);
console.log(
  '\n  Empieza por la fuente con mas citas: un solo libro abierto cierra decenas de items.\n',
);
