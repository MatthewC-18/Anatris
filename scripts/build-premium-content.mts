// scripts/build-premium-content.mts
//
// Serialises the PREMIUM regions' clinical library into the JSON payloads that
// the `content` edge function serves after checking the caller's subscription.
//
// WHY: the paid library used to be compiled into public JavaScript chunks, so
// anyone could fetch them without signing up. Splitting the bundle fixed the
// download size, not the leak. Now the free tier stays bundled and every paid
// region lives behind an entitlement check.
//
// Run:  npm run build-premium-content
// Out:  supabase/functions/content/payloads/<region>.json  (+ payloads.ts index)
//
// RE-RUN THIS WHENEVER YOU EDIT PREMIUM CLINICAL DATA, then redeploy the
// function. `premium-content.test.ts` fails if a payload is missing or stale,
// so a forgotten run is caught by `npm test` rather than by a user.

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FREE_REGIONS } from '../src/auth/entitlements.ts';
import {
  ALL_CASES_BY_REGION,
  ALL_MUSCLE_CONTENT_BY_REGION,
  ALL_MUSCLES_BY_REGION,
  ALL_REGION_IDS,
  ALL_ROM_BY_REGION,
  ALL_ROM_LOOKUP_BY_REGION,
  ALL_PATHOLOGIES_BY_REGION,
  ALL_TESTS_BY_REGION,
  ALL_TRACK_BY_REGION,
} from '../src/data/fullContent.ts';
import { NEURO_BY_REGION } from '../src/data/neuro/index.ts';
import type { PremiumRegionPayload } from '../src/data/premiumStore.ts';
import type { Muscle } from '../src/types/muscle.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '../supabase/functions/content/payloads');

/** Regions whose content must be paid for. Derived, never hand-listed. */
export const PREMIUM_REGION_IDS: string[] = ALL_REGION_IDS.filter(
  (r) => !FREE_REGIONS.has(r),
).sort();

/** Todas las fichas del catalogo, una por id, para componer prestamos. */
const CATALOGO: Map<string, Muscle> = (() => {
  const out = new Map<string, Muscle>();
  for (const list of Object.values(ALL_MUSCLES_BY_REGION)) {
    for (const m of list) if (!out.has(m.id)) out.set(m.id, m);
  }
  return out;
})();

/** Ids que ya van en el paquete publico, asi que nunca hay que prestarlos. */
const FREE_REGION_MUSCLE_IDS: Set<string> = new Set(
  ALL_REGION_IDS.filter((r) => FREE_REGIONS.has(r)).flatMap((r) =>
    (ALL_MUSCLES_BY_REGION[r] ?? []).map((m) => m.id),
  ),
);

/**
 * LAS FICHAS QUE EL PANEL NEURO DE ESTA REGION NOMBRA Y LA REGION NO TIENE.
 *
 * El panel Neuro no es por region sino por EXTREMIDAD: el mismo juego cervical
 * (C5-T1) sirve a hombro, codo y cervical, y el lumbosacro (L2-S1) a cadera,
 * rodilla, tobillo y lumbar. Asi que un demo de miotoma nombra fichas que viven
 * en otra region: C6 el braquiorradial (codo), L2 el psoas y el iliaco
 * (cadera), L3 el cuadriceps (rodilla), L4 y S1 el tibial anterior, el
 * gastrocnemio y el soleo (tobillo).
 *
 * Como el universo que el laboratorio resuelve contra el GLB es "hombro
 * gratuito + payload de LA REGION ABIERTA", esos ids no resolvian ninguna malla
 * y el play movia la articulacion sin encender nada. Medido contra las 942
 * mallas vivas de capa muscular: 24 de 48 acreditaciones mudas (lumbar 7/9,
 * tobillo 6/9, cadera 6/9, rodilla 3/9, cervical 1/4, hombro 1/4).
 *
 * Es el mismo arreglo que ya se hizo para el raquis (`ALL_ROM_LOOKUP_BY_REGION`)
 * y se compone igual: en tiempo de CONSTRUCCION, de modo que el runtime nunca
 * necesita otra region cargada. Coste medido: +17,0 KB repartidos entre los
 * siete payloads (+0,0 KB codo y toracica; +5,3 KB lumbar, que es el peor caso,
 * un 4% sobre sus 129 KB). La alternativa --meter el catalogo entero en cada
 * payload-- son +389,8 KB, con el tobillo pasando de 75 a 139 KB, y regala a
 * cada region la biblioteca de las otras siete.
 *
 * Barre TODO lo que una region nombra, no solo los miotomas, para que el
 * proximo prestamo no vuelva a pasar inadvertido. Medido hoy: ROM, guias de la
 * via y resaltes de las pruebas ortopedicas estan todos dentro de la region;
 * los unicos prestamos son los de los miotomas (23 en total, 10 fichas
 * distintas).
 *
 * Y el payload no alcanza al HOMBRO, que es gratuito y no tiene payload que
 * cargar: su parte la cubre `MINIMO_RESOLUBLE`
 * (src/hooks/useMuscleResolution.ts), que lleva nombre y bases de malla y nada
 * de contenido de pago.
 */
function fichasPrestadas(region: string): Muscle[] {
  const dentro = new Set([
    // EL NIVEL GRATUITO CUENTA COMO PRESENTE: va en el paquete y el universo
    // del laboratorio siempre lo lleva delante (`useAllMuscles`). Sin esta
    // linea el payload se llevaba otra copia del deltoides, del biceps y del
    // triceps braquial a seis regiones, +3 KB cada una para nada.
    ...FREE_REGION_MUSCLE_IDS,
    ...(ALL_ROM_LOOKUP_BY_REGION[region] ?? ALL_MUSCLES_BY_REGION[region] ?? []).map((m) => m.id),
  ]);
  const pedidos = new Set<string>();
  for (const root of NEURO_BY_REGION[region]?.roots ?? []) {
    for (const id of root.demo?.highlightMuscleIds ?? []) pedidos.add(id);
  }
  for (const test of ALL_TESTS_BY_REGION[region] ?? []) {
    const id = test.demo?.highlightMuscleId;
    if (id) pedidos.add(id);
  }
  const out: Muscle[] = [];
  for (const id of pedidos) {
    if (dentro.has(id)) continue;
    const ficha = CATALOGO.get(id);
    // Un id que no existe en ningun catalogo no es un prestamo, es un dato
    // roto: lo cazan `neuroMyotomeDemo.test.ts` y `npm run audit-glow`.
    if (ficha) out.push(ficha);
  }
  return out;
}

/** Build one region's payload exactly as the client store expects it. */
export function buildPayload(region: string): PremiumRegionPayload {
  return {
    region,
    muscles: ALL_MUSCLES_BY_REGION[region] ?? [],
    // Resolved at BUILD time: for the spine this is the whole-spine union, so
    // the runtime never needs a sibling region loaded to render this one.
    // Mas las fichas prestadas que los paneles de la region nombran (ver arriba).
    romLookupMuscles: [
      ...(ALL_ROM_LOOKUP_BY_REGION[region] ?? ALL_MUSCLES_BY_REGION[region] ?? []),
      ...fichasPrestadas(region),
    ],
    content: ALL_MUSCLE_CONTENT_BY_REGION[region] ?? {},
    rom: ALL_ROM_BY_REGION[region] ?? [],
    track: ALL_TRACK_BY_REGION[region] ?? null,
    tests: ALL_TESTS_BY_REGION[region] ?? [],
    cases: ALL_CASES_BY_REGION[region] ?? [],
    pathologies: ALL_PATHOLOGIES_BY_REGION[region] ?? [],
  };
}

function main(): void {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  let total = 0;
  for (const region of PREMIUM_REGION_IDS) {
    const json = JSON.stringify(buildPayload(region));
    writeFileSync(resolve(OUT_DIR, `${region}.json`), json, 'utf8');
    total += json.length;
    console.log(
      `  ${region.padEnd(10)} ${(json.length / 1024).toFixed(0).padStart(4)} KB`,
    );
  }

  // A generated index so the Deno function imports the payloads statically:
  // edge deployments bundle what is imported, and a dynamic path would not be
  // included.
  const index = [
    '// GENERATED by scripts/build-premium-content.mts — do not edit by hand.',
    '//',
    "// Static imports on purpose: Supabase bundles what a function imports, so a",
    '// dynamic path would deploy an empty folder and every request would 500.',
    '',
    ...PREMIUM_REGION_IDS.map(
      (r) => `import ${r} from './payloads/${r}.json' with { type: 'json' };`,
    ),
    '',
    'export const PAYLOADS: Record<string, unknown> = {',
    ...PREMIUM_REGION_IDS.map((r) => `  ${r},`),
    '};',
    '',
  ].join('\n');
  writeFileSync(resolve(dirname(OUT_DIR), 'payloads.ts'), index, 'utf8');

  console.log(
    `\n${PREMIUM_REGION_IDS.length} regiones premium · ${(total / 1024).toFixed(0)} KB en total`,
  );
  console.log(`Escrito en ${OUT_DIR}`);
  console.log('\nRecuerda desplegar:  supabase functions deploy content');
}

// Only run when invoked as a script; the test imports the helpers above.
const invokedDirectly =
  process.argv[1] != null && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();

/** Read back what is currently on disk (used by the freshness test). */
export function readWrittenPayload(region: string): PremiumRegionPayload | null {
  try {
    if (!readdirSync(OUT_DIR).includes(`${region}.json`)) return null;
    return JSON.parse(
      readFileSync(resolve(OUT_DIR, `${region}.json`), 'utf8'),
    ) as PremiumRegionPayload;
  } catch {
    return null;
  }
}
