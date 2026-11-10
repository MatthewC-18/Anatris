// LA CASCADA DE ARRANQUE, LEIDA DEL BUILD REAL.
//
// Pregunta que contesta: desde que el navegador recibe el HTML hasta que existe
// three.js y empieza a bajar el GLB del laboratorio, ¿cuantos SALTOS EN SERIE de
// red hay, y cuantos bytes se piden en cada uno?
//
// No abre un navegador a proposito. El panel de vista previa estrangula los
// temporizadores cuando esta oculto (el mismo trabajo midio 2,8 s una vez y 7,8 s
// la siguiente), asi que un cronometro de navegador aqui no vale. Lo que SI es
// exacto es el grafo: dist/index.html dice que pide el HTML, cada trozo dice que
// importa, y la tabla `__vite__mapDeps` de la entrada dice que se precarga en cada
// frontera `React.lazy`. Eso determina la profundidad de la cascada sin medir nada.
//
// Uso: npx tsx --tsconfig tsconfig.scripts.json scripts/audit-boot-waterfall.mts

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import zlib from 'node:zlib';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(REPO, 'dist');
const ASSETS = join(DIST, 'assets');

if (!existsSync(ASSETS)) {
  console.error('No hay dist/assets. Ejecuta `npm run build` primero.');
  process.exit(1);
}

const B = (n: number) => n.toLocaleString('es-ES');
const gz = (p: string) => zlib.gzipSync(readFileSync(p), { level: 9 }).byteLength;

// ---------------------------------------------------------------- 1. EL HTML
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const entryHref = /<script type="module"[^>]*src="([^"]+)"/.exec(html)?.[1] ?? '';
const preloads = [...html.matchAll(/<link rel="modulepreload"[^>]*href="([^"]+)"/g)].map(
  (m) => m[1],
);
const styles = [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
const swTag = /<script id="vite-plugin-pwa:register-sw" src="([^"]+)"/.exec(html)?.[1] ?? null;

// ---------------------------------------------------------------- 2. EL GRAFO
interface Chunk {
  name: string;
  bytes: number;
  gzip: number;
  statics: string[];
  dynamics: string[];
  hasThree: boolean;
}
const chunks = new Map<string, Chunk>();
for (const name of readdirSync(ASSETS).filter((n) => n.endsWith('.js'))) {
  const p = join(ASSETS, name);
  const src = readFileSync(p, 'utf8');
  chunks.set(name, {
    name,
    bytes: statSync(p).size,
    gzip: gz(p),
    // Un trozo ES declara sus dependencias estaticas con `from"./x.js"` o
    // `import"./x.js"` (efecto lateral). Las dos formas cuentan: las dos se
    // descubren al PARSEAR el trozo, o sea un salto de red despues.
    statics: [
      ...new Set(
        [...src.matchAll(/(?:from|import)\s*"\.\/([A-Za-z0-9_.-]+\.js)"/g)].map((m) => m[1]),
      ),
    ],
    dynamics: [
      ...new Set([...src.matchAll(/import\("\.\/([A-Za-z0-9_.-]+\.js)"\)/g)].map((m) => m[1])),
    ],
    // El marcador de three: su renderizador. No se busca "three" como texto
    // porque el minificador borra los nombres de modulo.
    hasThree: src.includes('WebGLRenderer') && src.includes('REVISION'),
  });
}
const entryName = entryHref.replace(/^.*\//, '');
const threeChunks = [...chunks.values()].filter((c) => c.hasThree).map((c) => c.name);

// -------------------------------------------- 3. LA TABLA DE PRECARGA DE VITE
// Vite envuelve cada `import()` en un ayudante que, ANTES de esperar al modulo,
// inyecta un <link rel=modulepreload> por cada dependencia de ese modulo. Si el
// trozo de three esta en esa lista, viaja EN PARALELO con el trozo que lo importa
// y no cuesta un salto extra. Si no estuviera, costaria uno.
const entrySrc = readFileSync(join(ASSETS, entryName), 'utf8');
const depTable =
  /__vite__mapDeps=\(i,m=__vite__mapDeps,d=\(m\.f\|\|\(m\.f=\[([^\]]*)\]/.exec(entrySrc)?.[1] ?? '';
const depList = [...depTable.matchAll(/"([^"]+)"/g)].map((m) => m[1].replace(/^.*\//, ''));

// Los sitios de llamada: import("./X.js"),__vite__mapDeps([a,b,c])
const callSites = new Map<string, string[]>();
for (const m of entrySrc.matchAll(
  /import\("\.\/([A-Za-z0-9_.-]+\.js)"\)\s*,\s*__vite__mapDeps\(\[([0-9,\s]*)\]\)/g,
)) {
  const deps = m[2]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((i) => depList[Number(i)]);
  callSites.set(m[1], deps);
}
// El ayudante tambien se usa sin lista (`,[]`): ahi no precarga nada.
const bareDynamic = [...entrySrc.matchAll(/import\("\.\/([A-Za-z0-9_.-]+\.js)"\)/g)]
  .map((m) => m[1])
  .filter((n) => !callSites.has(n));

// ------------------------------------------------- 4. PROFUNDIDAD DE CASCADA
// Salto 1 = el documento HTML. Salto 2 = todo lo que el HTML declara (entrada,
// modulepreload, css). Salto 3 = lo que la entrada pide al EVALUARSE, con sus
// dependencias precargadas en el mismo salto. Salto 4 = lo que solo se descubre
// al parsear un trozo del salto 3 y que nadie precargo.
const hop: Map<string, number> = new Map();
hop.set('index.html', 1);
hop.set(entryName, 2);
for (const p of preloads) hop.set(p.replace(/^.*\//, ''), 2);
// Las dependencias estaticas de un trozo ya descargado se descubren al parsearlo:
// un salto mas, salvo que alguien las haya precargado antes.
function closeStatics(seed: string[], atHop: number): void {
  let frontier = seed;
  let h = atHop;
  while (frontier.length) {
    const next: string[] = [];
    for (const n of frontier) {
      const c = chunks.get(n);
      if (!c) continue;
      for (const d of c.statics) {
        if (hop.has(d)) continue;
        hop.set(d, h + 1);
        next.push(d);
      }
    }
    frontier = next;
    h += 1;
  }
}
closeStatics([entryName, ...preloads.map((p) => p.replace(/^.*\//, ''))], 2);

// SALTO 3: lo que la entrada pide al evaluarse. Dos cosas, en paralelo, las dos
// desde un useEffect de App: /anatomy-index.json (useAnatomyIndex) y el GLB
// (modelWarm.warmModelForMode).
hop.set('anatomy-index.json', 3);
hop.set('cuerpo-rig.opt.glb.gz', 3);

// SALTO 4: la frontera lazy de MovementView. React.lazy solo dispara su
// `import()` cuando el componente SE RENDERIZA, y App.tsx:458 no lo renderiza
// mientras `status === 'loading'` -- es decir, hasta que el indice ha llegado y
// se ha parseado. Asi que el trozo de three cae un salto DESPUES del indice, no
// en paralelo con el. Sus 10 dependencias si viajan con el: `__vite__mapDeps`
// las precarga antes de esperar al modulo.
const MOVEMENT = [...callSites.keys()].find((n) => n.startsWith('MovementView')) ?? '';
const movementDeps = callSites.get(MOVEMENT) ?? [];
for (const d of [MOVEMENT, ...movementDeps]) if (!hop.has(d)) hop.set(d, 4);
closeStatics([MOVEMENT, ...movementDeps], 4);

// --------------------------------------------------- 5. EL PRECACHE DEL SW
const swPath = join(DIST, 'sw.js');
let precache: { url: string; bytes: number }[] = [];
if (existsSync(swPath)) {
  const sw = readFileSync(swPath, 'utf8');
  const urls = [...new Set([...sw.matchAll(/\{url:"([^"]+)",revision:/g)].map((m) => m[1]))];
  precache = urls.map((u) => {
    const p = join(DIST, u);
    return { url: u, bytes: existsSync(p) ? statSync(p).size : 0 };
  });
}
const sum = (xs: { bytes: number }[]) => xs.reduce((a, b) => a + b.bytes, 0);
const precacheJs = precache.filter((e) => e.url.endsWith('.js'));
const precacheCss = precache.filter((e) => e.url.endsWith('.css'));
const precacheOther = precache.filter((e) => !e.url.endsWith('.js') && !e.url.endsWith('.css'));
// Lo que el SW se baja DE VERDAD en la primera visita: lo precacheado MENOS lo
// que esa misma visita ya trajo por la ruta /hombro/movimiento.
const movementSet = new Set<string>([
  'index.html',
  entryName,
  ...preloads.map((p) => p.replace(/^.*\//, '')),
  ...styles.map((p) => p.replace(/^.*\//, '')),
  'anatomy-index.json',
  MOVEMENT,
  ...movementDeps,
]);
for (const n of [...movementSet]) {
  const c = chunks.get(n);
  if (c) for (const d of c.statics) movementSet.add(d);
}
const swExtra = precache.filter((e) => !movementSet.has(e.url.replace(/^.*\//, '')));

// ------------------------------------------------------------------ INFORME
console.log('=============== 1. QUE PIDE EL HTML (salto 1 -> 2) ===============');
const show = (href: string) => {
  const n = href.replace(/^.*\//, '');
  const p = join(DIST, href.replace(/^\//, ''));
  const b = existsSync(p) ? statSync(p).size : 0;
  const g = existsSync(p) ? gz(p) : 0;
  return `${href}  ${B(b)} B  (gzip ${B(g)} B)`;
};
console.log(`  entrada (script type=module): ${show(entryHref)}`);
for (const p of preloads) console.log(`  modulepreload               : ${show(p)}`);
for (const s of styles) console.log(`  stylesheet                  : ${show(s)}`);
console.log(`  registerSW (PWA)            : ${swTag ? show(swTag) : 'AUSENTE'}`);

console.log('\n=============== 2. DONDE ESTA THREE ===============');
for (const n of threeChunks) {
  const c = chunks.get(n)!;
  console.log(`  ${n}  ${B(c.bytes)} B  (gzip ${B(c.gzip)} B)   salto ${hop.get(n) ?? '?'}`);
}
if (!threeChunks.length) console.log('  NO ENCONTRADO (marcador WebGLRenderer+REVISION)');

console.log('\n=============== 3. CASCADA DE /hombro/movimiento ===============');
const byHop = new Map<number, string[]>();
for (const [n, h] of hop) {
  if (!movementSet.has(n) && n !== 'index.html') continue;
  if (!byHop.has(h)) byHop.set(h, []);
  byHop.get(h)!.push(n);
}
for (const h of [...byHop.keys()].sort()) {
  const names = byHop.get(h)!.sort();
  const bytes = names.reduce((a, n) => a + (chunks.get(n)?.bytes ?? 0), 0);
  const gzip = names.reduce((a, n) => a + (chunks.get(n)?.gzip ?? 0), 0);
  console.log(`  SALTO ${h}  (JS/CSS: ${B(bytes)} B, gzip ${B(gzip)} B)`);
  for (const n of names) {
    const c = chunks.get(n);
    const three = c?.hasThree ? '   <-- THREE' : '';
    const extra = existsSync(join(DIST, n)) && !c ? `  ${B(statSync(join(DIST, n)).size)} B` : '';
    console.log(`     ${n}${c ? `  ${B(c.bytes)} B` : extra}${three}`);
  }
}

console.log('\n=============== 4. PRECARGA QUE FALTA EN EL HTML ===============');
const missing = [...movementSet].filter(
  (n) => n !== 'index.html' && n !== entryName && (hop.get(n) ?? 9) >= 3 && chunks.has(n),
);
const missBytes = missing.reduce((a, n) => a + chunks.get(n)!.bytes, 0);
const missGzip = missing.reduce((a, n) => a + chunks.get(n)!.gzip, 0);
console.log(`  el HTML precarga ${preloads.length} trozo(s): ${preloads.join(', ') || '(ninguno)'}`);
console.log(
  `  NO precarga ${missing.length} trozo(s) que la ruta necesita: ${B(missBytes)} B (gzip ${B(missGzip)} B)`,
);
for (const n of missing.sort()) console.log(`     ${n}  salto ${hop.get(n)}`);

console.log('\n=============== 5. FRONTERAS LAZY Y SUS DEPS ===============');
for (const [n, deps] of callSites) console.log(`  import("${n}") precarga ${deps.length}: ${deps.join(', ')}`);
for (const n of bareDynamic) console.log(`  import("${n}") SIN lista de deps`);

// ------------------------------------- 6. LA PUERTA DEL INDICE DE ANATOMIA
// src/App.tsx:458 no renderiza <MovementView> hasta que `status !== 'loading'`,
// y ese estado lo pone useAnatomyIndex al terminar de traer y parsear
// /anatomy-index.json. Como React.lazy solo dispara su `import()` cuando el
// componente SE RENDERIZA, el trozo de three no empieza a bajar hasta entonces:
// la puerta no retrasa un pintado, retrasa una DESCARGA.
//
// Esto mide lo que cuesta esa puerta en CPU, en Node, porque el reloj del
// navegador no sirve con el panel oculto.
const idxPath = join(DIST, 'anatomy-index.json');
if (existsSync(idxPath)) {
  const raw = readFileSync(idxPath);
  // 5 pasadas y se toma la MINIMA de cada etapa: en una sola pasada el
  // recolector de basura del proceso (que acaba de comprimir 24 trozos) mete
  // 2x de ruido -- medido, 13 ms frente a 5 ms para el mismo parseo.
  let parseMs = Infinity;
  let mapMs = Infinity;
  let idx = { entries: [] as { meshName: string }[] };
  let map = new Map<string, unknown>();
  let set = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    idx = JSON.parse(raw.toString('utf8')) as { entries: { meshName: string }[] };
    parseMs = Math.min(parseMs, performance.now() - t0);
    const t1 = performance.now();
    map = new Map<string, unknown>();
    for (const e of idx.entries) if (!map.has(e.meshName)) map.set(e.meshName, e);
    set = new Set(map.keys());
    mapMs = Math.min(mapMs, performance.now() - t1);
  }
  const g = zlib.gzipSync(raw, { level: 9 }).byteLength;
  const br = zlib.brotliCompressSync(raw).byteLength;
  console.log('\n=============== 6. LA PUERTA DEL INDICE (App.tsx:458) ===============');
  console.log(`  /anatomy-index.json       ${B(raw.byteLength)} B en disco`);
  console.log(`     gzip -9                ${B(g)} B`);
  console.log(`     brotli                 ${B(br)} B   (lo que sirve un CDN de texto)`);
  console.log(`  entradas                  ${B(idx.entries.length)}`);
  console.log(`  claves unicas (byMesh)    ${B(map.size)}  / set de nombres ${B(set.size)}`);
  console.log(`  JSON.parse                ${parseMs.toFixed(1)} ms  (minimo de 5, hilo principal)`);
  console.log(`  construir Map + Set       ${mapMs.toFixed(1)} ms  (minimo de 5, hilo principal)`);
  console.log(`  => la puerta NO cuesta CPU: cuesta un VIAJE DE IDA Y VUELTA entero.`);
  console.log(`     Y el laboratorio no lee el indice: grep en src/components/movement/`);
  console.log(`     solo da un import de TIPO y 3 props opcionales que nadie lee.`);
}

console.log('\n=============== 7. PRECACHE DEL SERVICE WORKER ===============');
console.log(`  entradas: ${precache.length}`);
console.log(`  JS   : ${precacheJs.length} ficheros, ${B(sum(precacheJs))} B`);
console.log(`  CSS  : ${precacheCss.length} ficheros, ${B(sum(precacheCss))} B`);
console.log(`  resto: ${precacheOther.length} ficheros, ${B(sum(precacheOther))} B`);
console.log(`  TOTAL: ${B(sum(precache))} B`);
const swExtraJs = swExtra.filter((e) => e.url.endsWith('.js'));
console.log(
  `  de eso, NO lo trae la ruta /hombro/movimiento (descarga extra en 1a visita): ` +
    `${swExtra.length} ficheros, ${B(sum(swExtra))} B`,
);
console.log(`     de los cuales JS: ${swExtraJs.length} ficheros, ${B(sum(swExtraJs))} B`);
console.log(
  `  (en visita CALIENTE el precache ya esta hecho: el SW no descarga nada y no compite)`,
);

// ------------------------------------------- 8. LO DEMAS QUE CORRE AL ARRANCAR
console.log('\n=============== 8. COMPETIDORES EN EL ARRANQUE ===============');
const css = styles[0] ? join(DIST, styles[0].replace(/^\//, '')) : '';
const cssSrc = css && existsSync(css) ? readFileSync(css, 'utf8') : '';
const atImport = /^@import\s*"([^"]+)"/.exec(cssSrc)?.[1] ?? null;
console.log(
  `  FUENTES (BLOQUEA EL PINTADO): @import en la PRIMERA linea del CSS compilado`,
);
console.log(`     ${atImport ?? '(no hay @import)'}`);
console.log(
  `     => origen nuevo (DNS+TCP+TLS) descubierto solo tras parsear el CSS del salto 2,`,
);
console.log(`        y fonts.gstatic.com es un TERCER origen tras parsear esa hoja.`);
const ph = [...chunks.values()].find((c) => c.name.startsWith('module-'));
const phKey = /"(phc_[A-Za-z0-9]+)"/.exec(entrySrc)?.[1] ?? null;
console.log(
  `  POSTHOG (no bloquea, compite): ${ph ? `${ph.name} ${B(ph.bytes)} B (gzip ${B(ph.gzip)} B)` : 'no encontrado'}`,
);
console.log(
  `     clave horneada en el bundle: ${phKey ? `${phKey.slice(0, 12)}... => ACTIVO` : 'ninguna => inactivo'}`,
);
console.log(`     se pide en main.tsx ANTES de createRoot (initAnalytics), sin lista de deps`);
const sbUrl = /"(https:\/\/[a-z0-9]+\.supabase\.co)"/.exec(entrySrc)?.[1] ?? null;
console.log(`  SUPABASE: ${sbUrl ?? 'no horneada => backend simulado'}`);
console.log(
  `     el trozo esta en el salto 2 (import ESTATICO de la entrada: la entrada no evalua sin el)`,
);
console.log(`  EDGE 'content': solo para regiones de pago; 'shoulder' esta en FREE_REGIONS`);
console.log(`     (src/auth/entitlements.ts:28) => en /hombro/movimiento no se llama.`);
for (const e of swExtra.filter((e) => e.bytes > 1000).sort((a, b) => b.bytes - a.bytes))
  console.log(`     ${e.url}  ${B(e.bytes)} B`);
