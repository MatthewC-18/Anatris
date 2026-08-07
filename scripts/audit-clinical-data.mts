// scripts/audit-clinical-data.mts
//
// CLI wrapper around the shared, tested audit in src/lib/clinicalAudit.ts. Prints
// the consistency issues + verification progress, and (with --worklist) writes
// docs/clinical-verification-worklist.md. The SAME audit runs as a regression
// test (src/lib/__tests__/clinicalAudit.test.ts), so the CLI and CI never drift.
//
// It does NOT verify the numbers themselves against sources -- that needs the books.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-clinical-data.mts [--worklist]

import { writeFileSync } from 'node:fs';
import { runClinicalAudit } from '../src/lib/clinicalAudit.ts';
// Full registry (every region, paid included): the runtime ones now carry only
// the free tier. See src/data/fullContent.ts.
import {
  ALL_ROM_BY_REGION as ROM_BY_REGION,
  ALL_TESTS_BY_REGION as ORTHOPEDIC_TESTS_BY_REGION,
} from '../src/data/fullContent.ts';

const { issues, progress } = runClinicalAudit();
const errors = issues.filter((i) => i.level === 'ERROR');
const warns = issues.filter((i) => i.level === 'WARN');

console.log('\n===== AUDITORÍA DE DATOS CLÍNICOS =====\n');
console.log(`Errores: ${errors.length}   Avisos: ${warns.length}\n`);
for (const i of [...errors, ...warns]) {
  console.log(`  [${i.level}] ${i.where}\n           ${i.msg}`);
}

console.log('\n----- Progreso de verificación (citas comprobadas / total) -----\n');
const regions = Object.keys(progress).sort();
let romT = 0;
let romV = 0;
let tT = 0;
let tV = 0;
const pct = (v: number, t: number) => (t === 0 ? '—' : `${Math.round((100 * v) / t)}%`);
console.log('  región        ROM verificado        Tests verificados');
for (const r of regions) {
  const p = progress[r];
  romT += p.romCites;
  romV += p.romVerified;
  tT += p.testCites;
  tV += p.testVerified;
  const rom = `${p.romVerified}/${p.romCites} (${pct(p.romVerified, p.romCites)})`;
  const tst = `${p.testVerified}/${p.testCites} (${pct(p.testVerified, p.testCites)})`;
  console.log(`  ${r.padEnd(12)}  ${rom.padEnd(20)}  ${tst}`);
}
console.log(
  `  ${'TOTAL'.padEnd(12)}  ${`${romV}/${romT} (${pct(romV, romT)})`.padEnd(20)}  ${tV}/${tT} (${pct(tV, tT)})`,
);

// ----- Optional worklist -----
if (process.argv.includes('--worklist')) {
  const lines: string[] = [];
  lines.push('# Worklist de verificación clínica (Anatris)');
  lines.push('');
  lines.push('> Generado por `scripts/audit-clinical-data.mts --worklist`. Marca cada dato');
  lines.push('> tras comprobarlo contra tu fuente y pon `pageVerified: true` / `verified: true`');
  lines.push('> (y el `locator`/`page`) en el archivo correspondiente. NO inventes páginas.');
  lines.push('');
  for (const r of regions) {
    lines.push(`## ${r}`);
    lines.push('');
    lines.push('### ROM');
    for (const mv of ROM_BY_REGION[r] ?? []) {
      const refs = [...new Set((mv.rangeCite ?? []).map((c) => c.ref))].join(', ');
      const done = (mv.rangeCite ?? []).every((c) => c.pageVerified);
      lines.push(
        `- [${done ? 'x' : ' '}] **${mv.name}** — ${mv.totalRangeDeg.min}–${mv.totalRangeDeg.max}° · fuentes: ${refs || '—'}`,
      );
    }
    const tests = ORTHOPEDIC_TESTS_BY_REGION[r] ?? [];
    if (tests.length) {
      lines.push('');
      lines.push('### Tests ortopédicos (sens/espec)');
      for (const t of tests) {
        const done = (t.cite ?? []).every((c) => c.verified);
        const s = t.metrics.sensitivity ?? '—';
        const e = t.metrics.specificity ?? '—';
        const refs = [...new Set((t.cite ?? []).map((c) => c.ref))].join(', ');
        lines.push(`- [${done ? 'x' : ' '}] **${t.name}** — S ${s}% / E ${e}% · fuentes: ${refs || '—'}`);
      }
    }
    lines.push('');
  }
  const out = 'docs/clinical-verification-worklist.md';
  writeFileSync(out, lines.join('\n'), 'utf8');
  console.log(`\nWorklist escrito en ${out}`);
}

if (errors.length > 0) process.exitCode = 1;
