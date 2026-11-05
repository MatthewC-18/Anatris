// scripts/audit-muscle-spill-all.mts
//
// QUE MUSCULO SE SALE DE LA PIEL, EN LOS TREINTA Y CUATRO MOVIMIENTOS.
//
// `measure-muscle-spill.mts` mide UN movimiento muy bien y deja un informe
// largo. Esto lo lanza sobre todos y se queda con una linea por movimiento, que
// es lo que hace falta para saber POR DONDE empezar sin mirar treinta y cuatro
// hojas de cuatro fotogramas a ojo.
//
// Por que hace falta: la revision visual encontro de verdad el deltoides
// posterior y la aguja del flexor largo de los dedos, pero encontrarlos costo
// abrir hoja por hoja, y lo que no se ve en un fotograma de 420 px de ancho
// simplemente no existe. Esto no depende de la vista ni del encuadre.
//
// Cada movimiento corre en SU PROPIO PROCESO, a proposito: `createRigPoser`
// hace reparaciones de malla que no son idempotentes, asi que dos poses
// distintas en el mismo proceso se contaminan.
//
// Uso:
//   npx tsx --tsconfig tsconfig.scripts.json scripts/audit-muscle-spill-all.mts
//   REGION=ankle  solo una region
//   JOBS=3        procesos en paralelo
//   UMBRAL=0.01   centimetros a partir de los cuales se considera hallazgo

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getBoneControl } from '../src/lib/boneMap.ts';
import { ALL_ROM_BY_REGION } from '../src/data/fullContent.ts';
import { buildLabArc } from '../src/lib/romPhaseAtAngle.ts';

const REGION = process.env.REGION ?? '';
const JOBS = Number(process.env.JOBS ?? 3);
/** Por debajo de esto es ruido de las superficies de origen, no un fallo. */
const UMBRAL_CM = Number(process.env.UMBRAL ?? 0.5);

const here = fileURLToPath(new URL('.', import.meta.url));
const SPILL = `${here}measure-muscle-spill.mts`;

interface Job {
  region: string;
  id: string;
  angles: number[];
}

const jobs: Job[] = [];
for (const [region, movements] of Object.entries(ALL_ROM_BY_REGION)) {
  if (REGION && region !== REGION) continue;
  for (const mv of movements) {
    const ctrl = getBoneControl(mv.id);
    if (!ctrl || (ctrl.kind !== 'joint' && ctrl.kind !== 'chain' && ctrl.kind !== 'spine')) {
      continue;
    }
    // El mismo arco que recorre el laboratorio, en tres paradas: el reposo lo
    // pone el propio medidor como linea base.
    const arc = buildLabArc(mv);
    const from = arc.startDeg;
    const to = from === arc.max ? Math.max(arc.min, 0) : arc.max;
    const mid = from + (to - from) / 2;
    jobs.push({ region, id: mv.id, angles: [0, round(mid), round(to)] });
  }
}

function round(n: number): number {
  return Math.round(n);
}

interface Result {
  id: string;
  region: string;
  peor: number;
  musculo: string;
  verts: number;
  deg: number;
}

/** Lee la tabla por angulo que imprime el medidor y se queda con la peor fila. */
function parse(id: string, region: string, out: string): Result {
  let best: Result = { id, region, peor: 0, musculo: '', verts: 0, deg: 0 };
  for (const line of out.split(/\r?\n/)) {
    // "   50        2.91 cm   Flexor_digitorum_longus     62   x0.07 ..."
    const m = line.match(/^\s*(-?\d+)\s+(-?\d+\.\d+) cm\s+(\S+)?\s+(\d+)?\s/);
    if (!m) continue;
    const cm = Number(m[2]);
    if (cm > best.peor) {
      best = {
        id,
        region,
        peor: cm,
        musculo: m[3] ?? '',
        verts: Number(m[4] ?? 0),
        deg: Number(m[1]),
      };
    }
  }
  return best;
}

function run(job: Job): Promise<Result> {
  return new Promise((resolve) => {
    const child = spawn(
      'npx',
      ['tsx', '--tsconfig', 'tsconfig.scripts.json', SPILL, job.id, ...job.angles.map(String)],
      { shell: true, cwd: process.cwd() },
    );
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', () => resolve(parse(job.id, job.region, out)));
  });
}

const results: Result[] = [];
let next = 0;
async function worker(): Promise<void> {
  while (next < jobs.length) {
    const job = jobs[next++];
    const r = await run(job);
    results.push(r);
    process.stdout.write(
      `  ${String(results.length).padStart(2)}/${jobs.length}  ${job.id.padEnd(32)} ` +
        `${r.peor.toFixed(2).padStart(6)} cm\n`,
    );
  }
}

console.log(`\nmidiendo ${jobs.length} movimientos con ${JOBS} procesos...\n`);
await Promise.all(Array.from({ length: Math.max(1, JOBS) }, worker));

results.sort((a, b) => b.peor - a.peor);
console.log('\n===== MUSCULO FUERA DE LA PIEL, POR MOVIMIENTO =====');
console.log('(crecimiento sobre la pose de reposo; el reposo ya trae su propio ruido)\n');
console.log('  salida   vert   grados  movimiento                        musculo');
for (const r of results) {
  const marca = r.peor >= UMBRAL_CM ? '*' : ' ';
  console.log(
    `${marca} ${r.peor.toFixed(2).padStart(6)} cm ${String(r.verts).padStart(5)}  ` +
      `${String(r.deg).padStart(5)}   ${r.id.padEnd(32)}  ${r.musculo}`,
  );
}
const malos = results.filter((r) => r.peor >= UMBRAL_CM);
console.log(
  `\n  ${malos.length} de ${results.length} movimientos por encima de ${UMBRAL_CM} cm.\n`,
);
