// EL CRONOMETRO DEL ARRANQUE, EN EL NAVEGADOR Y NO EN NODE.
//
// Los 10,3 s que se tardaba en ver el rig estaban medidos con un cronometro de
// pared, y todo lo que se diseñe para bajarlos se acredita contra ese numero. El
// problema es que Node y el navegador NO miden lo mismo: Node carga el GLB en
// reposo y corre los pases sobre el, el navegador ademas lee bytes de la red o
// de la cache, los infla, monta React, compila shaders y sube un millon de
// vertices a la GPU. Un perfil de Node dice que pase es el caro; no dice cuanto
// pesa el conjunto de los pases DENTRO del arranque.
//
// Esto marca los seis instantes que parten el arranque en tramos que no se
// solapan, con el reloj del navegador (`performance.now()`, cuyo cero es el
// inicio de la navegacion):
//
//   arranque -> bytes     leer la red o la cache (y descomprimir)
//   bytes    -> parse     GLTFLoader + meshopt
//   parse    -> render    Suspense despierta y RigModel renderiza
//   render   -> prep0     R3F monta la escena (commit de React)
//   prep0    -> prep1     LOS PASES DE PREPARACION
//   prep1    -> listo     etiquetado de capas + onReady
//   listo    -> pintado   el primer fotograma de verdad en pantalla
//
// MARCAR SIEMPRE, IMPRIMIR SOLO SI SE PIDE. Antes el reloj entero estaba
// apagado fuera de `vite dev` y de `?perf=1`, y eso dejaba a la PANTALLA DE
// CARGA sin forma de saber en que tramo esta: la barra decia "descargando"
// durante los 9,1 s que van del fin de la lectura de bytes al primer fotograma
// (medido en el build de produccion con `vite preview`). Un sello es un
// `performance.now()` y una escritura en un objeto, asi que tomarlos siempre no
// se nota; lo que cuesta --la tabla por consola-- sigue detras de `?perf=1`.
//
// Leerlo: `__arranque()` en la consola, o la tabla automatica que sale sola
// cuando llega `pintado`.
//
// Y QUIEN LOS LEE EN VIVO: `onStamp` / `stampedAt`, que es de donde
// RigLoadingScreen saca las fases reales del arranque.

/** Los instantes que se marcan, en el orden en que ocurren. */
export type BootStamp =
  | 'arranque'
  | 'bytes'
  | 'parse'
  | 'render'
  | 'commit'
  | 'prep0'
  | 'prep1'
  | 'listo'
  | 'pintado';

const ORDEN: readonly BootStamp[] = [
  'arranque',
  'bytes',
  'parse',
  'render',
  'commit',
  'prep0',
  'prep1',
  'listo',
  'pintado',
];

const ETIQUETA: Record<BootStamp, string> = {
  arranque: 'inicio',
  bytes: 'bytes leidos (red/cache + inflado)',
  parse: 'GLB parseado (meshopt)',
  render: 'Suspense despierta, RigModel renderiza',
  commit: 'R3F monta la escena (commit)',
  prep0: 'el navegador pinta el rig CRUDO',
  prep1: 'PASES DE PREPARACION',
  listo: 'capas + onReady',
  pintado: 'primer fotograma en pantalla',
};

type Oyente = (name: BootStamp, t: number) => void;

interface Reloj {
  t: Partial<Record<BootStamp, number>>;
  fases: { nombre: string; t: number }[];
  on: boolean;
  subs: Set<Oyente>;
}

function host(): Reloj {
  const w = globalThis as unknown as { __bootClock?: Reloj };
  if (!w.__bootClock) {
    let on = false;
    try {
      on =
        !!(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV ||
        (typeof location !== 'undefined' && location.search.includes('perf=1'));
    } catch {
      on = false;
    }
    w.__bootClock = { t: {}, fases: [], on, subs: new Set() };
  }
  // Un reloj creado por una version anterior de este modulo (recarga en
  // caliente) puede no traer `subs`.
  if (!w.__bootClock.subs) w.__bootClock.subs = new Set();
  return w.__bootClock;
}

/** El instante de un sello, o undefined si todavia no ha ocurrido. */
export function stampedAt(name: BootStamp): number | undefined {
  return host().t[name];
}

/**
 * Avisa cuando se marca un instante. Lo usa la pantalla de carga para cambiar de
 * fase cuando la fase cambia DE VERDAD, en vez de por un temporizador.
 */
export function onStamp(fn: Oyente): () => void {
  const h = host();
  h.subs.add(fn);
  return () => {
    h.subs.delete(fn);
  };
}

/**
 * Marca un instante. La primera marca de cada nombre gana: el efecto de
 * preparacion puede volver a montarse sobre la escena cacheada, y lo que se mide
 * es el ARRANQUE, no la segunda vez.
 */
export function stamp(name: BootStamp): void {
  const h = host();
  if (h.t[name] !== undefined) return;
  h.t[name] = performance.now();
  // Un oyente que falle no puede dejar el arranque a medias: el que sigue
  // avisando es el mismo que levanta el cartel de carga.
  for (const fn of h.subs) {
    try {
      fn(name, h.t[name] as number);
    } catch {
      /* ignorado a proposito */
    }
  }
  if (name === 'listo') {
    // El primer rAF tras `listo` todavia es el que encola el dibujo; el segundo
    // ya ocurre con el fotograma presentado. Medir en el primero se adelanta un
    // fotograma entero y, con shaders por compilar, bastante mas.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      stamp('pintado');
      report();
    }));
  }
}

/**
 * Marca un paso DENTRO de la preparacion.
 *
 * El tramo "PASES DE PREPARACION" es el mas gordo del arranque y dentro hay 25
 * pases. Sin partirlo, cualquier plan para bajarlo se discute en vez de medirse.
 * Se imprime en su propia tabla al llegar el primer fotograma.
 */
export function fase(nombre: string): void {
  const h = host();
  if (!h.on) return;
  h.fases.push({ nombre, t: performance.now() });
}

/** Los pasos de la preparacion, ya en ms por tramo. */
export function fases(): { paso: string; ms: number }[] {
  const h = host();
  const out: { paso: string; ms: number }[] = [];
  let prev = h.t.prep0;
  for (const f of h.fases) {
    if (prev !== undefined) out.push({ paso: f.nombre, ms: Math.round(f.t - prev) });
    prev = f.t;
  }
  return out;
}

/** Devuelve los tramos medidos, en ms, sin huecos ni solapes. */
export function spans(): { tramo: string; ms: number; acumulado: number }[] {
  const h = host();
  const out: { tramo: string; ms: number; acumulado: number }[] = [];
  let prev: BootStamp | null = null;
  for (const k of ORDEN) {
    const v = h.t[k];
    if (v === undefined) continue;
    if (prev !== null) {
      out.push({
        tramo: ETIQUETA[k],
        ms: Math.round(v - (h.t[prev] as number)),
        acumulado: Math.round(v),
      });
    }
    prev = k;
  }
  return out;
}

/** Imprime la tabla. Devuelve los tramos para poder leerlos desde un script. */
export function report(): { tramo: string; ms: number; acumulado: number }[] {
  const s = spans();
  const h = host();
  if (!h.on || s.length === 0) return s;
  const total = s.reduce((a, b) => a + b.ms, 0);
  // eslint-disable-next-line no-console
  console.table(s.map((r) => ({ ...r, '%': `${Math.round((100 * r.ms) / (total || 1))}%` })));
  const f = fases();
  if (f.length > 0) {
    const tp = f.reduce((a, b) => a + b.ms, 0);
    // eslint-disable-next-line no-console
    console.table(
      f.map((r) => ({ ...r, '%': `${Math.round((100 * r.ms) / (tp || 1))}%` })).sort((a, b) => b.ms - a.ms),
    );
  }
  // eslint-disable-next-line no-console
  console.log(`ARRANQUE: ${(total / 1000).toFixed(2)} s hasta el primer fotograma`);
  return s;
}

// Un asa para la consola y para los scripts de medida.
try {
  (globalThis as unknown as { __arranque?: typeof report }).__arranque = report;
} catch {
  /* entorno sin globalThis escribible: la tabla automatica sigue saliendo */
}
