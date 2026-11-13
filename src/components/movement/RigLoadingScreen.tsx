// src/components/movement/RigLoadingScreen.tsx
//
// LA PANTALLA DE CARGA DEL LABORATORIO.
//
// La lamina de carga de toda la aplicacion (`.carga` en index.css): el video del
// cuerpo que se construye (src/components/LoaderVideo.tsx), la marca, que se
// esta cargando, una linea de progreso y la fase. La pinta RigViewer en TODA la
// zona del laboratorio (ver loaderSlot.ts), el mismo rectangulo que la espera
// anterior de App, con el mismo titulo: al encadenarse no se mueve nada.
//
// -----------------------------------------------------------------------------
// POR QUE ESTA HECHA ASI: EL HILO PRINCIPAL ESTA BLOQUEADO CASI TODA LA ESPERA
// -----------------------------------------------------------------------------
// Reloj de arranque de la propia aplicacion (`?perf=1`, src/lib/bootClock.ts)
// sobre el build de produccion, con el modelo ya en la cache:
//
//   bytes leidos (red/cache + inflado)   1.345 ms
//   GLB parseado (meshopt)                 911 ms
//   R3F monta la escena                     72 ms
//   PASES DE PREPARACION                 5.317 ms
//   capas + onReady                         12 ms
//   primer fotograma en pantalla         3.714 ms     total 11,8 s
//
// (En la medida de noviembre, en otra maquina: 1.029 / 469 / 2.882 / 1.805, 6,3 s.)
//
// Despues de la descarga el hilo principal NO SUELTA: el parseo, el montaje, la
// preparacion y la subida a la GPU van seguidos, y entre medias el navegador no
// pinta un solo fotograma de React. Lo unico que sigue moviendose es lo que no
// depende de el: la reproduccion del <video> y lo que el COMPOSITOR sabe animar
// solo, `transform` y `opacity`. Asi que la linea y los rotulos de fase son
// animaciones CSS de esas dos propiedades, programadas de una vez con sus
// retardos y entregadas al compositor ANTES de que empiece el bloqueo:
//
//   - Los rotulos de fase estan los cuatro apilados y se relevan por `opacity`.
//   - El relevo NO lo da React. Lo da un atributo puesto a mano en el DOM en el
//     instante en que el cargador avisa de que la descarga termino, y el
//     cargador cede dos fotogramas justo despues (ver `nextPaint`) para que ese
//     cambio llegue a pintarse.
//
// `src/components/movement/__tests__/rigLoadingScreen.test.ts` comprueba que
// ningun `@keyframes` de este fichero toca otra propiedad.
//
// -----------------------------------------------------------------------------
// UN SOLO RELOJ PARA LA LINEA Y PARA EL VIDEO
// -----------------------------------------------------------------------------
// "Que la barra de carga vaya con el video." La linea son dos tramos seguidos,
// sin hueco: la DESCARGA, que se mide en vivo (bytes del flujo), y el MONTAJE,
// que no se puede medir y se coreografia con lo que tardo ESTE equipo la vez
// anterior (parseo + preparacion + primer fotograma). Cada tramo mide lo que se
// espera que dure, asi que la linea avanza a velocidad constante. Y el video se
// acompasa con los MISMOS numeros en el MISMO instante (`paceReveal`): durante la
// descarga con lo que queda estimado, y en el relevo con lo que dura el montaje.
// La construccion del cuerpo termina cuando termina la linea.
//
// Lo que no hace nunca es ensenar una fase terminada que no ha terminado: la
// linea no llega al final hasta que el laboratorio aparece.
//
// -----------------------------------------------------------------------------
// CUANDO LA PREVISION FALLA (medido el 12 nov, build de produccion, ?perf=1)
// -----------------------------------------------------------------------------
// En este equipo el montaje (bytes -> primer fotograma) tarda 10,5 s de
// costumbre, 9,6 a 11,0 en cinco cargas. Pero la PRIMERA visita de un navegador
// sin cache de shaders tardo 15,9 s: el primer fotograma, 9,5 s en vez de 4.
// Con eso pasaban dos cosas:
//   - En esa primera visita la prevision (10 s) se quedaba corta y la linea
//     llegaba a su tope a los 10 s y se quedaba QUIETA seis segundos: lo que el
//     usuario describia como "termina y todavia no acaba de cargar".
//   - Se guardaba tal cual, y la visita SIGUIENTE se coreografiaba para 15,9 s:
//     el laboratorio aparecia con la linea al 65 % (0,97 x 10,65 / 15,92, con
//     los tiempos medidos de esa carga) mientras el video ya habia terminado.
// Por eso, dos cosas:
//   1. La linea del montaje llega al 90 % cuando la prevision dice que acaba (y
//      ahi acaba tambien la construccion del video) y, si la carga se alarga,
//      sigue avanzando cada vez mas despacio hacia el 98 % durante otro tanto,
//      en vez de pararse. Si acaba antes, el laboratorio la completa de golpe.
//   2. Lo aprendido es una media movil (`learnTimings`, la mitad de lo nuevo y la
//      mitad de lo anterior): una carga rara mueve la prevision la mitad, no
//      entera. Con los numeros de arriba la visita siguiente a la primera se
//      preve en 13 s y no en 15,9.

import { useEffect, useRef, useState } from 'react';
import { modelPhase, onModelPhase } from '../../lib/modelPhase';
import { RIG_URL } from '../../lib/modelWarm';
import { LoaderVideo, finishReveal, paceReveal } from '../LoaderVideo';

/* ---------------------------------------------------------------------------
 * LOS TIEMPOS DE LA COREOGRAFIA
 * ------------------------------------------------------------------------ */

/** Lo que dura cada tramo, en ms. */
export interface LoadTimings {
  /** Leer los bytes del rig (red o cache) e inflarlos. */
  download: number;
  /** De los bytes al GLB parseado. */
  parse: number;
  /** Del parseo a `onReady`: montaje y pases de preparacion. */
  prep: number;
  /** De `onReady` al primer fotograma: shaders y subida a la GPU. */
  paint: number;
}

/** Medidos en el build de produccion (ver la tabla de la cabecera). */
export const DEFAULT_TIMINGS: LoadTimings = { download: 1345, parse: 911, prep: 5401, paint: 3714 };

const TIMINGS_KEY = 'anatris.carga.v1';

/** Un tramo vale si es un numero cuerdo: ni cero ni dos minutos. */
const sane = (ms: unknown): ms is number =>
  typeof ms === 'number' && Number.isFinite(ms) && ms >= 30 && ms <= 120_000;

/** Los tiempos de la ultima carga en este equipo, o los medidos por defecto. */
export function readTimings(): LoadTimings {
  try {
    const raw = window.localStorage.getItem(TIMINGS_KEY);
    if (!raw) return DEFAULT_TIMINGS;
    const t = JSON.parse(raw) as Partial<LoadTimings>;
    if (sane(t.parse) && sane(t.prep) && sane(t.paint)) {
      return {
        // La descarga se aprende desde noviembre; una entrada anterior no la trae.
        download: sane(t.download) ? t.download : DEFAULT_TIMINGS.download,
        parse: t.parse,
        prep: t.prep,
        paint: t.paint,
      };
    }
  } catch {
    /* almacenamiento no disponible o dato roto: los de por defecto */
  }
  return DEFAULT_TIMINGS;
}

/** Cuanto pesa una carga nueva en la prevision: la mitad (ver la cabecera). */
export const LEARN_RATE = 0.5;

/**
 * La prevision siguiente: cada tramo se acerca a lo medido la mitad de la
 * distancia. Sin nada guardado, lo anterior son los tiempos por defecto, asi
 * que tampoco la primera visita (la de la cache de shaders vacia) manda entera.
 */
export function learnTimings(prev: LoadTimings, medido: LoadTimings): LoadTimings {
  const mezcla = (a: number, b: number) => Math.round(a + LEARN_RATE * (b - a));
  return {
    download: mezcla(prev.download, medido.download),
    parse: mezcla(prev.parse, medido.parse),
    prep: mezcla(prev.prep, medido.prep),
    paint: mezcla(prev.paint, medido.paint),
  };
}

/** Lo que dura el tramo que no se puede medir: del fin de la descarga al primer fotograma. */
export const buildMs = (t: LoadTimings): number => t.parse + t.prep + t.paint;

// El cronometro de ESTA carga. Vive en el modulo y no en el componente porque
// los dos ultimos instantes los da RigViewer (el rig preparado, el primer
// fotograma) y pueden caer cuando la pantalla ya se esta retirando.
const marks: {
  fetching?: number;
  bytes?: number;
  parsed?: number;
  ready?: number;
  /** La pestana estuvo oculta en algun momento de ESTA carga. */
  oculta?: boolean;
} = {};

// UNA CARGA CON LA PESTANA OCULTA NO MIDE EL EQUIPO. Oculta, el navegador no
// pinta (el primer fotograma espera a que vuelva), frena los temporizadores a uno
// por segundo y pausa el video sin sonido. Medido el 12 nov en este equipo: el
// primer fotograma tardo 6,8 y 9,3 s con la pestana oculta, contra 4,0 a 4,6 a
// la vista. Aprender de eso seria coreografiar la visita siguiente con el rato
// que el usuario paso en otra pestana.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') marks.oculta = true;
  });
}

onModelPhase((url, state) => {
  if (url !== RIG_URL) return;
  if (state.phase === 'fetching') {
    marks.fetching = performance.now();
    marks.bytes = undefined;
    marks.parsed = undefined;
    marks.ready = undefined;
    marks.oculta = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  } else if (state.phase === 'parsing') {
    marks.bytes = state.at.parsing;
  } else if (state.phase === 'done') {
    marks.parsed = state.at.done;
  }
});

/** El rig esta cargado y vestido (`onReady`). Lo llama RigViewer. */
export function noteRigReady(): void {
  if (marks.ready === undefined) marks.ready = performance.now();
}

/**
 * El primer fotograma esta en pantalla. Lo llama RigViewer. Si esta carga se
 * vio entera --de los bytes al fotograma--, lo que tardo cada tramo entra en la
 * prevision de la siguiente (a medias con lo que habia: `learnTimings`).
 */
export function noteRigPainted(): void {
  const { fetching, bytes, parsed, ready } = marks;
  if (bytes === undefined || parsed === undefined || ready === undefined) return;
  const t: LoadTimings = {
    download: fetching !== undefined ? bytes - fetching : DEFAULT_TIMINGS.download,
    parse: parsed - bytes,
    prep: ready - parsed,
    paint: performance.now() - ready,
  };
  // Se consume: un remontaje sobre la escena ya cacheada no es una carga.
  marks.bytes = undefined;
  if (marks.oculta) return;
  if (!sane(t.parse) || !sane(t.prep) || !sane(t.paint)) return;
  if (!sane(t.download)) t.download = DEFAULT_TIMINGS.download;
  try {
    window.localStorage.setItem(TIMINGS_KEY, JSON.stringify(learnTimings(readTimings(), t)));
  } catch {
    /* sin almacenamiento: la proxima vez se usan los de por defecto */
  }
}

/**
 * Lo que queda de carga durante la DESCARGA, en ms: lo que falta de descarga
 * (estimado por lo que lleva, en cuanto hay cifra; si no, lo esperado) mas el
 * montaje entero. Es el numero con el que se acompasa el video.
 */
export function remainingDuringDownload(
  t: LoadTimings,
  elapsedMs: number,
  fraction: number,
): number {
  const f = Math.min(1, Math.max(0, fraction));
  const quedaDescarga =
    f > 0.1 && elapsedMs > 0 ? (elapsedMs * (1 - f)) / f : t.download * (1 - f);
  return quedaDescarga + buildMs(t);
}

/* ---------------------------------------------------------------------------
 * LA PANTALLA
 * ------------------------------------------------------------------------ */

/** Las cuatro fases, en orden. La primera se mide en vivo; las otras tres van
 *  coreografiadas (ver la cabecera). */
export const FASES = [
  'Descargando el cuerpo',
  'Montando el modelo',
  'Preparando músculo y piel',
  'Encendiendo el escenario',
] as const;

export function RigLoadingScreen({
  progress,
  loaded = 0,
  total = 0,
  item = '',
  compact = false,
  leaving = false,
}: {
  /** Porcentaje de bytes leidos que publica el gestor de carga de three. */
  progress: number;
  /** Bytes leidos y declarados, del mismo gestor. */
  loaded?: number;
  total?: number;
  /** A que recurso se refieren las tres cifras de arriba. */
  item?: string;
  compact?: boolean;
  /** El laboratorio ya esta pintado debajo: la pantalla se desvanece. */
  leaving?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  // Los tiempos se leen UNA vez, al montar: son los de la carga anterior.
  const [t] = useState<LoadTimings>(() =>
    typeof window === 'undefined' ? DEFAULT_TIMINGS : readTimings(),
  );
  // Solo para el lector de pantalla: en que fase se esta. El dibujo no depende
  // de este estado (ver la cabecera), asi que da igual que llegue tarde.
  const [dicho, setDicho] = useState<string>(FASES[0]);
  const desdeRef = useRef<number | null>(null);
  const ultimoPaso = useRef(0);

  // EL RELEVO. Cuando el cargador avisa de que los bytes del rig ya estan, se
  // pone el atributo A MANO y la coreografia entera arranca en el compositor.
  // React no pinta este atributo (no esta en el JSX), asi que ningun render
  // posterior puede quitarlo y reiniciar las animaciones. Y en ese MISMO
  // instante el video se acompasa con lo que va a durar el montaje: un reloj.
  useEffect(() => {
    const arrancar = () => {
      const el = root.current;
      if (!el || el.dataset.run === '1') return;
      el.dataset.run = '1';
      paceReveal(buildMs(t));
      setDicho('Montando y preparando el modelo');
    };
    // El modelo puede ir ya por delante al montar la pantalla: bytes leidos, o
    // incluso parseado (se vuelve al laboratorio con la escena en memoria).
    const ya = modelPhase(RIG_URL);
    if (ya && (ya.phase === 'parsing' || ya.phase === 'done')) arrancar();
    return onModelPhase((url, state) => {
      if (url !== RIG_URL) return;
      if (state.phase === 'parsing' || state.phase === 'done') arrancar();
    });
  }, [t]);

  // LA DESCARGA, EN VIVO. El gestor de carga de three es UNO para toda la
  // aplicacion y mezcla en el mismo canal los BYTES del modelo con las CUENTAS
  // DE ITEMS (1 de 1, 2 de 2...). Medido: sin filtrar, la barra se llenaba con
  // la mano del fisioterapeuta, que son 336 KB, mientras el cuerpo seguia
  // bajando. Por eso se exige la URL del rig y un total que solo puede ser
  // bytes.
  const delRig = item === RIG_URL && total > 1024;
  // Y POR QUE SE CALLA AL 100. `content-length` cuenta los bytes COMPRIMIDOS
  // cuando el servidor declara el gzip, y el navegador entrega los inflados: el
  // contador cruza el 100% con el 57% del flujo leido (medido en `vite preview`:
  // 9.323.344 declarados contra 16.410.748 entregados). Pasado ese punto la
  // cifra no significa nada, asi que deja de ensenarse y el tramo pasa a una
  // lanzadera hasta que el cargador da el relevo, que nunca miente.
  const medido = delRig && loaded < total;
  const porciento = medido ? Math.max(0, Math.min(99, Math.round(progress))) : 0;
  const p = medido ? Math.min(0.99, loaded / total) : delRig ? 1 : 0;

  // El video, con el mismo numero que la linea: lo que queda de descarga mas el
  // montaje. Como mucho cuatro veces por segundo (cada cambio de velocidad se
  // nota menos si son pocos).
  useEffect(() => {
    if (!medido) return;
    const ahora = performance.now();
    if (desdeRef.current === null) desdeRef.current = ahora;
    if (ahora - ultimoPaso.current < 250) return;
    ultimoPaso.current = ahora;
    paceReveal(remainingDuringDownload(t, ahora - desdeRef.current, p));
  }, [medido, p, t]);

  // Al retirarse: lo que falte de construccion, durante el fundido.
  useEffect(() => {
    if (leaving) finishReveal();
  }, [leaving]);

  const tb = buildMs(t);

  return (
    <div
      ref={root}
      className={`carga cg ${compact ? 'cg-compacto' : ''}`}
      data-fuera={leaving ? '1' : undefined}
      style={
        {
          '--p': p.toFixed(3),
          '--t1': Math.round(t.parse),
          '--t2': Math.round(t.prep),
          '--t3': Math.round(t.paint),
          '--tb': Math.round(tb),
        } as React.CSSProperties
      }
    >
      <style>{CSS}</style>

      <div className="carga-video cg-video">
        <div className="carga-acercar">
          <LoaderVideo />
        </div>
      </div>

      <div className="carga-texto">
        <p className="carga-marca">Anatris</p>
        <p className="carga-titulo">Laboratorio de movimiento</p>

        {/* LA LINEA: dos tramos seguidos, cada uno tan largo como lo que se
            espera que dure. Asi avanza a velocidad constante y acaba con la
            construccion del video. */}
        <div className="carga-linea cg-linea" aria-hidden>
          <span className="cg-tramo" style={{ flexGrow: Math.max(1, Math.round(t.download)) }}>
            <span
              className={`carga-relleno cg-relleno-1 ${delRig && !medido ? 'cg-lanzadera' : ''}`}
            />
          </span>
          <span className="cg-tramo" style={{ flexGrow: Math.max(1, Math.round(tb)) }}>
            <span className="carga-relleno cg-relleno-2" />
          </span>
        </div>

        {/* Los cuatro rotulos, apilados. El primero lo releva el atributo; los
            otros tres se relevan solos. Ocultos al lector de pantalla, que lee
            la linea de estado de abajo. */}
        <div className="cg-titulos" aria-hidden>
          {FASES.map((f, i) => (
            <p key={f} className={`cg-titulo cg-titulo-${i + 1}`}>
              <span className="num cg-paso">{`0${i + 1}`}</span>
              {f}
              {i === 0 && medido && porciento > 0 && (
                <span className="num cg-cifra">{porciento}%</span>
              )}
            </p>
          ))}
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {dicho}
        </p>
        {/* LA FRASE QUE SUSTITUYE A UNA MENTIRA, solo en las esperas largas:
            aparece a los 6 s (por CSS). La pantalla de antes prometia que la
            espera no se repetiria; se repite: lo unico que queda guardado son
            los bytes. */}
        <p className="cg-pie">
          El cuerpo son 9 MB y se descargan una sola vez. El montaje se rehace en
          cada visita.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * CSS
 * ---------------------------------------------------------------------------
 * La lamina (`.carga`) es comun y vive en index.css; aqui solo lo propio del
 * laboratorio: los tramos de la linea, los rotulos de fase y la salida.
 *
 * TODO `@keyframes` DE AQUI ANIMA `transform` U `opacity` Y NADA MAS. Ver la
 * cabecera: es lo unico que sigue moviendose con el hilo principal bloqueado.
 * Hay un test que lo comprueba.
 *
 * Los retardos salen de --t1, --t2, --t3 y --tb (ms de parseo, preparacion,
 * primer fotograma y su suma en ESTE equipo), puestos en linea por el componente.
 *
 * `prefers-reduced-motion` no apaga la informacion, solo el movimiento: el
 * video se queda en su poster (lo decide LoaderVideo), la lanzadera se para y
 * el acercamiento tambien (index.css), pero las fases se siguen relevando.
 * ------------------------------------------------------------------------ */
export const CSS = `
.cg { opacity: 1; transition: opacity .5s ease-out; }
.cg[data-fuera='1'] { opacity: 0; pointer-events: none; }
.cg-video { transition: transform .5s ease-out; }
.cg[data-fuera='1'] .cg-video { transform: scale(1.05); }
.cg-compacto .cg-video { max-height: 50%; }

/* --- la linea ----------------------------------------------------------- */
.cg-linea { display: flex; }
.cg-tramo { position: relative; flex: 1 1 0%; height: 100%; overflow: hidden; }
.cg-relleno-1 { transform: scaleX(var(--p)); transition: transform .35s linear; }
.cg-relleno-1.cg-lanzadera {
  transform: none; inset: 0 auto 0 0; width: 40%;
  background: linear-gradient(90deg, rgb(var(--c-brand) / 0), rgb(var(--c-brand)), rgb(var(--c-brand) / 0));
  animation: cg-lanzar 1.5s ease-in-out infinite;
}
.cg[data-run='1'] .cg-relleno-1 { transform: scaleX(1); animation: none; inset: 0; width: auto; background: rgb(var(--c-brand)); }
.cg-relleno-2 { transform: scaleX(0); }
/* El montaje: un trazo lineal hasta el 90 % en lo que se espera que tarde
   (--tb, donde acaba tambien la construccion del video) y, si la carga se
   alarga, otro tanto acercandose al 98 % cada vez mas despacio: nunca se queda
   quieto en su tope. No llega al final: lo que lo completa es el laboratorio. */
.cg[data-run='1'] .cg-relleno-2 { animation: cg-construir calc(var(--tb) * 2ms) linear both; }
.cg[data-fuera='1'] .cg-relleno-2 { animation: none; transform: scaleX(1); }
/* La segunda mitad frena como 1 - (1 - x)^2, en tramos rectos: asi el bloque
   solo lleva transform y el compositor lo anima con el hilo bloqueado. */
@keyframes cg-construir {
  0% { transform: scaleX(0); }
  50% { transform: scaleX(.9); }
  60% { transform: scaleX(.929); }
  70% { transform: scaleX(.951); }
  80% { transform: scaleX(.967); }
  90% { transform: scaleX(.977); }
  100% { transform: scaleX(.98); }
}
@keyframes cg-lanzar { from { transform: translateX(-110%); } to { transform: translateX(270%); } }

/* --- los rotulos de fase ------------------------------------------------ */
.cg-titulos { position: relative; width: 100%; height: 1.25rem; }
.cg-titulo {
  position: absolute; inset: 0; margin: 0;
  display: flex; align-items: center; justify-content: center; gap: .625rem;
  font-size: .8125rem; color: rgb(var(--c-fg2)); white-space: nowrap;
  opacity: 0; will-change: opacity;
}
.cg-paso { font-size: .6875rem; font-weight: 500; color: rgb(var(--c-fg3)); }
.cg-cifra { font-size: .75rem; font-weight: 500; color: rgb(var(--c-brand)); min-width: 2.25rem; text-align: right; }
.cg-titulo-1 { opacity: 1; }
.cg[data-run='1'] .cg-titulo-1 { animation: cg-salir .25s ease-out both; }
.cg[data-run='1'] .cg-titulo-2 { animation: cg-ventana calc(var(--t1) * 1ms) linear .2s both; }
.cg[data-run='1'] .cg-titulo-3 { animation: cg-ventana calc(var(--t2) * 1ms) linear calc(var(--t1) * 1ms + .2s) both; }
.cg[data-run='1'] .cg-titulo-4 { animation: cg-entrar .4s ease-out calc(var(--t1) * 1ms + var(--t2) * 1ms + .2s) both; }
@keyframes cg-entrar { from { opacity: 0; } to { opacity: 1; } }
@keyframes cg-salir { from { opacity: 1; } to { opacity: 0; } }
/* Visible durante SU tramo: entra, aguanta y cede al siguiente. Los
   porcentajes son de la duracion del tramo, asi que en un tramo de un segundo
   la entrada dura 120 ms y en uno de cinco, 600: nunca se come el rotulo. */
@keyframes cg-ventana {
  0%   { opacity: 0; }
  12%  { opacity: 1; }
  92%  { opacity: 1; }
  100% { opacity: 0; }
}

/* --- la frase de las esperas largas ------------------------------------- */
.cg-pie {
  margin: 0; max-width: 30ch; text-align: center; font-size: .6875rem; line-height: 1.5;
  color: rgb(var(--c-fg3));
  animation: cg-entrar .6s ease-out 6s both;
}
.cg-compacto .cg-pie { display: none; }

@media (prefers-reduced-motion: reduce) {
  .cg, .cg-video { transition: none; }
  .cg[data-fuera='1'] .cg-video { transform: none; }
  .cg-relleno-1 { transition: none; }
  .cg-relleno-1.cg-lanzadera { animation: none; width: 100%; opacity: .35; }
}
`;
