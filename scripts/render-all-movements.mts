// Una hoja de contactos por CADA movimiento de CADA region.
//
// Revisar los 34 movimientos a mano eran 34 invocaciones de `render-pose.mts`
// con sus angulos, su vista y su encuadre escritos a mano cada vez, asi que en
// la practica no se revisaban: se miraba el hombro y se daba por bueno el resto.
// Esto los lanza todos, con la vista y el encuadre que corresponden a la
// articulacion (una abduccion no se ve de lado, una flexion no se ve de frente)
// y con los angulos sacados del propio dato de rango.
//
// POR QUE LANZA UN PROCESO POR MOVIMIENTO Y NO REUTILIZA LA ESCENA, que seria
// mucho mas rapido: `createRigPoser` captura el REPOSO de la escena tal como
// esta en el momento de crearlo, y ademas aplica las reparaciones de malla
// (winding, puente de piel del hombro, religado de claviculas) que no son
// idempotentes. La primera version de este script cargaba el GLB una vez y
// creaba un poser por movimiento sobre la misma escena: el segundo movimiento
// tomaba como reposo la postura en la que lo habia dejado el primero, y la
// hoja de la flexion de hombro salia recorrida al reves. Las imagenes parecian
// plausibles una por una, que es lo peligroso. Un proceso por movimiento cuesta
// una carga de GLB cada uno y a cambio no puede equivocarse en esto.
//
// Lo que estas hojas sirven para ver, y que una medida no detecta:
//   - que el movimiento vaya hacia donde dice su nombre (`npm run
//     audit-direction` lo mide; aqui se ve);
//   - que la piel no se abra ni se estrangule en el recorrido;
//   - que el miembro no atraviese el tronco;
//   - que el angulo maximo sea el que el panel promete y no uno alcanzado
//     retorciendo el hueso.
//
// Run: npx tsx --tsconfig tsconfig.scripts.json scripts/render-all-movements.mts
//   REGION=hip        solo una region
//   MOVE=hip-flexion  solo un movimiento
//   OUTDIR=...        donde escribir (por defecto docs/movimientos/)
//   W=420             ancho de cada fotograma
//   JOBS=3            procesos en paralelo
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { getBoneControl } from '../src/lib/boneMap.ts';
import { ALL_ROM_BY_REGION } from '../src/data/fullContent.ts';
import type { RomMovement } from '../src/types/rom.ts';
import { buildLabArc } from '../src/lib/romPhaseAtAngle.ts';

/** Encuadre por region: no sirve mirar un tobillo en un plano de cuerpo entero. */
const BOX_BY_REGION: Record<string, string> = {
  shoulder: '-0.8,0.8,0.7,1.9',
  elbow: '-0.8,0.8,0.7,1.9',
  hip: '-0.7,0.7,0.15,1.35',
  knee: '-0.55,0.55,-0.05,1.05',
  ankle: '-0.4,0.4,-0.08,0.6',
  cervical: '-0.45,0.45,1.25,1.95',
  thoracic: '-0.7,0.7,0.75,1.9',
  lumbar: '-0.7,0.7,0.55,1.85',
};

/**
 * Vista por movimiento, deducida del plano en que ocurre.
 *
 * Una abduccion y una inclinacion lateral ocurren en el plano frontal: de lado
 * no se ven. Una flexion y una extension ocurren en el sagital: de frente no se
 * ven. Una rotacion no se aprecia bien en ninguna de las dos y se deja de
 * frente, donde al menos se ve girar el eje largo del miembro.
 */
function viewFor(id: string): 'front' | 'side' {
  if (/abduction|adduction|lateral-flexion|inversion|eversion/.test(id)) return 'front';
  if (/flexion|extension/.test(id)) return 'side';
  return 'front';
}

/**
 * Cuatro fotogramas, RECORRIDOS COMO LOS RECORRE LA APLICACION.
 *
 * La primera version iba siempre de min a max, y eso hacia inutil la hoja de
 * las dos extensiones que comparten arco con su flexion: la del codo y la de la
 * rodilla salian IDENTICAS byte a byte a las de flexion (mismo md5), porque
 * recorrian el mismo 0 -> 145. En la aplicacion no es asi -- `labStartAt: 'max'`
 * abre el arco en el extremo flexionado y el play baja hacia 0, que es lo que
 * significa "extension" cuando 0 grados es el miembro recto -- de modo que la
 * hoja mentia sobre el producto y, de paso, tapaba justo el movimiento que
 * habria que revisar.
 *
 * `buildLabArc` es la misma funcion que usa el panel, asi que esto no puede
 * volver a desviarse del arco real.
 */
function anglesFor(mv: RomMovement): number[] {
  const arc = buildLabArc(mv);
  // El arco bidireccional (hombro) se recorre desde su apertura hacia el
  // maximo: la mitad negativa es otro gesto, con otro nombre, y tiene su propia
  // hoja si se quiere mirar.
  const from = arc.startDeg;
  const to = from === arc.max ? Math.max(arc.min, 0) : arc.max;
  return [0, 1, 2, 3].map((k) => Math.round(from + ((to - from) * k) / 3));
}

const OUTDIR = process.env.OUTDIR ?? 'docs/movimientos';
const W = process.env.W ?? '420';
// LADO DEL RIG (ver scripts/lib/rigPose.mts): con `R` se posa el miembro que
// esta en +x, que es el IZQUIERDO anatomico, y es tambien el que la vista
// `side` deja delante (la camara mira desde +x). Para revisar la cinematica da
// igual cual de los dos se mire -- lo que se juzga es hacia donde va el
// movimiento y si la piel aguanta -- pero no confundas la hoja con el lado que
// el panel rotula.
const SIDE = process.env.SIDE ?? 'R';
const JOBS = Math.max(1, Number(process.env.JOBS ?? 3));
const ONLY_REGION = process.env.REGION ?? '';
const ONLY_MOVE = process.env.MOVE ?? '';

interface Job {
  region: string;
  mv: RomMovement;
  view: string;
  degs: number[];
  out: string;
}

const jobs: Job[] = [];
for (const [region, list] of Object.entries(ALL_ROM_BY_REGION)) {
  if (ONLY_REGION && region !== ONLY_REGION) continue;
  if (!BOX_BY_REGION[region]) continue;
  for (const mv of list as RomMovement[]) {
    if (ONLY_MOVE && mv.id !== ONLY_MOVE) continue;
    if (!getBoneControl(mv.id)) continue;
    jobs.push({
      region,
      mv,
      view: viewFor(mv.id),
      degs: anglesFor(mv),
      out: `${OUTDIR}/${mv.id}.png`,
    });
  }
}

mkdirSync(OUTDIR, { recursive: true });
console.log(`${jobs.length} movimientos, ${JOBS} en paralelo -> ${OUTDIR}/\n`);

function run(job: Job): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        ...process.execArgv,
        // fileURLToPath, no `.pathname`: en Windows eso devuelve /C:/... y node
        // intenta abrir C:/C:/...
        fileURLToPath(import.meta.resolve('tsx/cli')),
        '--tsconfig',
        'tsconfig.scripts.json',
        'scripts/render-pose.mts',
      ],
      {
        env: {
          ...process.env,
          MOVE: job.mv.id,
          DEG: job.degs.join(','),
          SIDE,
          VIEW: job.view,
          BOX: BOX_BY_REGION[job.region],
          W,
          OUT: job.out,
        },
        stdio: ['ignore', 'ignore', 'inherit'],
      },
    );
    child.on('exit', (code) => {
      console.log(
        `  ${code === 0 ? 'ok  ' : 'FALLO'} ${job.mv.id.padEnd(32)} ${job.view.padEnd(5)} ${job.degs.join(', ')} deg`,
      );
      resolve();
    });
  });
}

let next = 0;
await Promise.all(
  Array.from({ length: Math.min(JOBS, jobs.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= jobs.length) return;
      await run(jobs[i]);
    }
  }),
);
console.log(`\nhojas en ${OUTDIR}/`);
