// ¿SE DISTINGUEN LAS PRUEBAS, EN TODAS LAS REGIONES?
//
// `measure-test-poses` mide una region por pasada porque su informe por pares
// se lee region a region. Esto las recorre todas y devuelve error si alguna
// falla, para que la regla entre en la rutina de auditoria sin tener que
// acordarse de las ocho.
//
// Run: npm run audit-test-poses
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ALL_TESTS_BY_REGION } from '../src/data/fullContent.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(HERE, 'measure-test-poses.mts');
const TSCONFIG = resolve(HERE, '../tsconfig.scripts.json');

const regions = Object.entries(ALL_TESTS_BY_REGION)
  .filter(([, list]) => list.some((t) => t.demo))
  .map(([r]) => r);

let failed = 0;
for (const region of regions) {
  const r = spawnSync(
    process.execPath,
    [
      resolve(HERE, '../node_modules/tsx/dist/cli.mjs'),
      '--tsconfig',
      TSCONFIG,
      SCRIPT,
      region,
    ],
    { encoding: 'utf8' },
  );
  const out = r.stdout ?? '';
  const bad = r.status !== 0;
  if (bad) failed += 1;
  console.log(`\n===== ${region} ${bad ? '❌' : 'ok'} =====`);
  // Solo lo que importa: los avisos y los errores, no la tabla entera.
  for (const line of out.split('\n')) {
    if (/^(⚠️|❌|✅|   |     )/.test(line) && !/^  [a-z-]+ {2,}/.test(line)) {
      console.log(line.replace(/\s+$/, ''));
    }
  }
  if (r.stderr) console.log(r.stderr.trim());
}

console.log(
  `\n===== ${failed === 0 ? 'ninguna region falla' : `${failed} region(es) con pares indistinguibles sin declarar`} =====`,
);
if (failed > 0) process.exitCode = 1;
