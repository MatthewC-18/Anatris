// src/components/movement/RigLoadingScreen.tsx
//
// LA PANTALLA DE CARGA DEL LABORATORIO.
//
// El video de carga de toda la aplicacion (src/components/LoaderVideo.tsx) y,
// debajo, las cuatro fases de lo que de verdad esta pasando, con su barra.
// Antes el centro era un cuerpo esquematico que se armaba por capas mientras su
// brazo recorria una abduccion; el usuario eligio su video para todas las
// esperas y el esquema se fue. Las fases se quedan: son lo unico que dice
// cuanto falta.
//
// Ocupa el ESCENARIO entero, sin tarjeta (sistema LAMINA, docs/sistema-lamina.md).
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
// La descarga son 1,3 s de 11,8. Los otros 10 el hilo principal NO SUELTA: el
// parseo, el montaje, la preparacion y la subida a la GPU van seguidos, y entre
// medias el navegador no pinta un solo fotograma de React. Medido fotograma a
// fotograma, la pantalla de antes solo conseguia pintar TRES veces en todo ese
// tramo, asi que su rotulo se quedaba clavado en la fase que ya habia pasado.
//
// Lo unico que sigue moviendose con el hilo bloqueado es lo que no depende de
// el: la reproduccion de un <video> (descodificador y compositor; medido, el
// video avanzo 3,07 s durante 3,07 s bloqueados) y lo que el COMPOSITOR sabe
// animar solo, `transform` y `opacity` de un elemento HTML con su propia capa.
// Asi que los rotulos que se relevan y la barra son animaciones CSS de esas dos
// propiedades y nada mas, programadas de una vez con sus retardos y entregadas
// al compositor ANTES de que empiece el bloqueo. Por eso:
//
//   - Los rotulos de fase estan los cuatro apilados y se relevan por `opacity`.
//   - El relevo NO lo da React. Lo da un atributo puesto a mano en el DOM en el
//     instante en que el cargador avisa de que la descarga termino, y el
//     cargador cede dos fotogramas justo despues (ver `nextPaint`) para que ese
//     cambio llegue a pintarse. Un `setState` no llegaba: React lo agrupaba con
//     el despertar de Suspense y el commit caia dentro del bloqueo.
//
// `src/components/movement/__tests__/rigLoadingScreen.test.ts` comprueba que
// ningun `@keyframes` de este fichero toca otra propiedad.
//
// -----------------------------------------------------------------------------
// LOS TIEMPOS SON LOS DE ESTA MAQUINA, NO UNOS INVENTADOS
// -----------------------------------------------------------------------------
// Con el hilo bloqueado no se puede PREGUNTAR en que fase se esta: hay que
// haberlo previsto. La primera vez se usan los tiempos medidos arriba. Al
// terminar cada carga se guardan los que ha tardado ESTE equipo (parseo,
// preparacion, primer fotograma) y la siguiente visita se coreografia con
// ellos. Si la carga va mas lenta de lo previsto, el ultimo rotulo se queda; si
// va mas rapida, la pantalla se retira antes. Lo que no hace nunca es ensenar
// una fase terminada que no ha terminado: la ultima barra no llega al final
// hasta que el laboratorio aparece.
//
// LA DESCARGA SI SE MIDE EN VIVO, porque ahi el hilo esta libre: el porcentaje
// es el de los bytes del flujo.

import { useEffect, useRef, useState } from 'react';
import { modelPhase, onModelPhase } from '../../lib/modelPhase';
import { RIG_URL } from '../../lib/modelWarm';
import { LoaderVideo, stretchForBlock } from '../LoaderVideo';

/* ---------------------------------------------------------------------------
 * LOS TIEMPOS DE LA COREOGRAFIA
 * ------------------------------------------------------------------------ */

/** Lo que dura cada tramo bloqueado, en ms. */
export interface LoadTimings {
  /** De los bytes al GLB parseado. */
  parse: number;
  /** Del parseo a `onReady`: montaje y pases de preparacion. */
  prep: number;
  /** De `onReady` al primer fotograma: shaders y subida a la GPU. */
  paint: number;
}

/** Medidos en el build de produccion (ver la tabla de la cabecera). */
export const DEFAULT_TIMINGS: LoadTimings = { parse: 911, prep: 5401, paint: 3714 };

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
      return { parse: t.parse, prep: t.prep, paint: t.paint };
    }
  } catch {
    /* almacenamiento no disponible o dato roto: los de por defecto */
  }
  return DEFAULT_TIMINGS;
}

// El cronometro de ESTA carga. Vive en el modulo y no en el componente porque
// los dos ultimos instantes los da RigViewer (el rig preparado, el primer
// fotograma) y pueden caer cuando la pantalla ya se esta retirando.
const marks: { bytes?: number; parsed?: number; ready?: number } = {};

onModelPhase((url, state) => {
  if (url !== RIG_URL) return;
  if (state.phase === 'fetching') {
    marks.bytes = undefined;
    marks.parsed = undefined;
    marks.ready = undefined;
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
 * vio entera --de los bytes al fotograma--, se guarda lo que tardo cada tramo
 * para coreografiar la siguiente.
 */
export function noteRigPainted(): void {
  const { bytes, parsed, ready } = marks;
  if (bytes === undefined || parsed === undefined || ready === undefined) return;
  const t: LoadTimings = {
    parse: parsed - bytes,
    prep: ready - parsed,
    paint: performance.now() - ready,
  };
  // Se consume: un remontaje sobre la escena ya cacheada no es una carga.
  marks.bytes = undefined;
  if (!sane(t.parse) || !sane(t.prep) || !sane(t.paint)) return;
  try {
    window.localStorage.setItem(TIMINGS_KEY, JSON.stringify(t));
  } catch {
    /* sin almacenamiento: la proxima vez se usan los de por defecto */
  }
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

  // EL RELEVO. Cuando el cargador avisa de que los bytes del rig ya estan, se
  // pone el atributo A MANO y la coreografia entera arranca en el compositor.
  // React no pinta este atributo (no esta en el JSX), asi que ningun render
  // posterior puede quitarlo y reiniciar las animaciones.
  useEffect(() => {
    const arrancar = () => {
      const el = root.current;
      if (!el || el.dataset.run === '1') return;
      el.dataset.run = '1';
      // Y EL VIDEO, QUE NO LLEGUE AL FINAL CON EL HILO BLOQUEADO: volver al
      // principio lo hace el hilo principal (ver LoaderVideo). Lo que va a
      // durar el bloqueo es lo que tardo este equipo la ultima vez.
      const video = el.querySelector('video');
      if (video) stretchForBlock(video, t.parse + t.prep + t.paint);
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
  }, []);

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
  // cifra no significa nada, asi que deja de ensenarse y la barra pasa a una
  // lanzadera hasta que el cargador da el relevo, que nunca miente.
  const medido = delRig && loaded < total;
  const porciento = medido ? Math.max(0, Math.min(99, Math.round(progress))) : 0;
  const p = medido ? Math.min(0.99, loaded / total) : delRig ? 1 : 0;

  return (
    <div
      ref={root}
      className={`cg ${compact ? 'cg-compacto' : ''}`}
      data-fuera={leaving ? '1' : undefined}
      style={
        {
          '--p': p.toFixed(3),
          '--t1': Math.round(t.parse),
          '--t2': Math.round(t.prep),
          '--t3': Math.round(t.paint),
        } as React.CSSProperties
      }
    >
      <style>{CSS}</style>

      <div className="cg-video">
        <LoaderVideo className="h-full w-full" />
      </div>

      <div className="cg-texto">
        <p className="kicker">Laboratorio de movimiento</p>
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
        <div className="cg-pista" aria-hidden>
          {FASES.map((f, i) => (
            <span key={f} className="cg-tramo">
              <span
                className={`cg-relleno cg-relleno-${i + 1} ${
                  i === 0 && delRig && !medido ? 'cg-lanzadera' : ''
                }`}
              />
            </span>
          ))}
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {dicho}
        </p>
        {/* LA FRASE QUE SUSTITUYE A UNA MENTIRA. La pantalla de antes prometia
            que la espera no se repetiria. Se repite: lo unico que queda
            guardado son los bytes, y esos eran 1,3 s de los 11,8 medidos. */}
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
 * Va en el componente y no en index.css porque esto solo vive diez segundos al
 * entrar al laboratorio.
 *
 * TODO `@keyframes` DE AQUI ANIMA `transform` U `opacity` Y NADA MAS. Ver la
 * cabecera: es lo unico que sigue moviendose con el hilo principal bloqueado.
 * Hay un test que lo comprueba.
 *
 * Los retardos salen de --t1, --t2 y --t3 (ms de parseo, preparacion y primer
 * fotograma en ESTE equipo), puestos en linea por el componente.
 *
 * `prefers-reduced-motion` no apaga la informacion, solo el movimiento: el
 * video se queda en su poster (lo decide LoaderVideo) y la lanzadera se para,
 * pero las fases se siguen relevando a su hora.
 * ------------------------------------------------------------------------ */
export const CSS = `
.cg {
  position: absolute; inset: 0; z-index: 10;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1.25rem; padding: 1.25rem;
  background: rgb(var(--c-page));
  opacity: 1; transition: opacity .45s ease-out;
  overflow: hidden;
}
.cg[data-fuera='1'] { opacity: 0; pointer-events: none; }

/* EL VIDEO: 16:9, tan grande como deje el escenario sin comerse el texto. */
.cg-video {
  position: relative; flex: 0 1 auto;
  width: min(94%, 58rem); aspect-ratio: 16 / 9; max-height: 64%;
  transition: transform .45s ease-out; will-change: transform;
}
.cg[data-fuera='1'] .cg-video { transform: scale(1.04); }
.cg-compacto .cg-video { width: min(100%, 32rem); max-height: 56%; }
.cg-compacto { gap: .875rem; }

/* --- el texto ----------------------------------------------------------- */
.cg-texto { display: flex; flex-direction: column; align-items: center; gap: .75rem; width: min(100%, 22rem); }
.cg-titulos { position: relative; width: 100%; height: 1.375rem; }
.cg-titulo {
  position: absolute; inset: 0; margin: 0;
  display: flex; align-items: center; justify-content: center; gap: .625rem;
  font-family: Sora, system-ui, sans-serif; font-size: .9375rem; font-weight: 600;
  color: rgb(var(--c-fg)); white-space: nowrap;
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

/* La barra: cuatro tramos, uno por fase. */
.cg-pista { display: flex; gap: 3px; width: 100%; }
.cg-tramo { position: relative; flex: 1 1 0%; height: 2px; overflow: hidden; background: rgb(var(--c-line)); }
.cg-tramo:nth-child(3) { flex-grow: 2.4; }
.cg-tramo:nth-child(4) { flex-grow: 1.7; }
.cg-relleno {
  position: absolute; inset: 0; background: rgb(var(--c-brand));
  transform-origin: left center; transform: scaleX(0); will-change: transform;
}
.cg-relleno-1 { transform: scaleX(var(--p)); transition: transform .35s linear; }
.cg-relleno-1.cg-lanzadera {
  transform: none; inset: 0 auto 0 0; width: 40%;
  background: linear-gradient(90deg, rgb(var(--c-brand) / 0), rgb(var(--c-brand)), rgb(var(--c-brand) / 0));
  animation: cg-lanzar 1.5s ease-in-out infinite;
}
.cg[data-run='1'] .cg-relleno-1 { transform: scaleX(1); animation: none; inset: 0; width: auto; background: rgb(var(--c-brand)); }
.cg[data-run='1'] .cg-relleno-2 { animation: cg-llenar calc(var(--t1) * 1ms) linear both; }
.cg[data-run='1'] .cg-relleno-3 { animation: cg-llenar calc(var(--t2) * 1ms) linear calc(var(--t1) * 1ms) both; }
/* La ultima no llega al final: lo que la completa es el laboratorio. */
.cg[data-run='1'] .cg-relleno-4 {
  animation: cg-casi calc(var(--t3) * 1ms) cubic-bezier(.2, .6, .3, 1) calc(var(--t1) * 1ms + var(--t2) * 1ms) both;
}
@keyframes cg-llenar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes cg-casi { from { transform: scaleX(0); } to { transform: scaleX(.9); } }
@keyframes cg-lanzar { from { transform: translateX(-110%); } to { transform: translateX(270%); } }

.cg-pie { margin: 0; max-width: 30ch; text-align: center; font-size: .6875rem; line-height: 1.5; color: rgb(var(--c-fg3)); }
.cg-compacto .cg-pie { display: none; }

@media (prefers-reduced-motion: reduce) {
  .cg, .cg-video { transition: none; }
  .cg[data-fuera='1'] .cg-video { transform: none; }
  .cg-relleno-1 { transition: none; }
  .cg-relleno-1.cg-lanzadera { animation: none; width: 100%; opacity: .35; }
}
`;
