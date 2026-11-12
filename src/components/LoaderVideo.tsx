// src/components/LoaderVideo.tsx
//
// EL VIDEO DE CARGA, EL MISMO EN TODA LA APLICACION.
//
// Lo eligio el usuario (`Downloads/gemini_generated_video_3e6e86f0.mp4`, un
// cuerpo holografico que un barrido va descubriendo de hueso a musculo) para
// sustituir las pantallas de carga del laboratorio, de Explorar y de las esperas
// del escenario.
//
// POR QUE UN VIDEO AGUANTA DONDE UN DIBUJO NO. Al montar el laboratorio el hilo
// principal no suelta durante unos diez segundos (ver RigLoadingScreen), y ahi
// solo se mueve lo que no depende de el. La reproduccion de un <video> la llevan
// el descodificador y el compositor: sigue avanzando con el hilo bloqueado.
//
// PERO EL BUCLE NO. MEDIDO con el banco de la pantalla de carga
// (`/loader-harness.html?auto=1&bloqueo=1`, 10,09 s de bloqueo): el video iba
// por 2,54 s, llego al final 6,92 s despues y se quedo CONGELADO en el ultimo
// fotograma el resto del bloqueo. Volver al principio (`loop`) es una busqueda
// que hace el hilo principal. De ahi dos cosas:
//   - el fichero lleva el ciclo DOS veces (18,9 s): la costura entre los dos es
//     la misma del bucle, invisible, y el bloqueo, que empieza al acabar la
//     descarga, ya no llega al final;
//   - `stretchForBlock`, abajo: si aun asi lo que queda de clip no cubre el
//     bloqueo que ESTE equipo tardo la ultima vez, el video se ralentiza lo
//     justo (hasta la mitad) en vez de pararse.
//
// EL FICHERO, PREPARADO (ffmpeg, ver `public/carga.mp4`):
//   - sin audio (el original traia una pista AAC);
//   - 960 x 540, H.264 CRF 32, 24 fps: 621 KB por ciclo, 1,24 MB los dos (el
//     original, 1280 x 720 con audio, eran 7,3 MB). A CRF 30 eran 774 KB por
//     ciclo sin diferencia visible; el WebM VP9 no ahorraba nada en este
//     material (particulas: mucha entropia);
//   - BUCLE SIN SALTO: el primer y el ultimo plano son abiertos pero el cuerpo
//     esta girado distinto, asi que el corte saltaba. Los ultimos 0,6 s se
//     funden con los primeros 0,6 s (xfade) y el ciclo empieza donde acaba el
//     fundido: 9,46 s que se repiten sin costura.
//   - un poster (`carga-poster.webp`, 36 KB, el primer fotograma) para el
//     instante antes de que arranque y para quien pide menos movimiento.
//
// EL BORDE NO SE VE. El video es negro alrededor del cuerpo y la pagina es casi
// negra; una mascara radial funde el rectangulo con el fondo, y de paso apaga
// los paneles de datos que el clip dibuja en las esquinas (no son datos de
// nada). Sin marco ni caja: es una lamina, no un reproductor.

import { useEffect, useState, type CSSProperties } from 'react';

export const LOADER_VIDEO = '/carga.mp4';
export const LOADER_POSTER = '/carga-poster.webp';
/** Lo que dura el fichero: dos ciclos de 9,458 s. */
export const LOADER_DURATION_S = 18.9167;
/** Margen sobre el bloqueo previsto: la ultima carga no es la siguiente. */
const BLOCK_MARGIN = 1.2;
/** Mas lento que esto ya no se lee como movimiento sino como un fallo. */
const MIN_RATE = 0.5;

/**
 * EL HILO VA A BLOQUEARSE `expectedMs`: que el video no llegue al final antes.
 * Se llama justo antes del bloqueo (RigLoadingScreen, en el relevo). Si lo que
 * queda de clip a velocidad normal cubre el bloqueo con margen, no toca nada;
 * si no, baja la velocidad lo justo, nunca por debajo de la mitad. Devuelve la
 * velocidad puesta.
 */
export function stretchForBlock(
  video: Pick<HTMLVideoElement, 'currentTime' | 'duration' | 'playbackRate'>,
  expectedMs: number,
): number {
  const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : LOADER_DURATION_S;
  const queda = Math.max(0, dur - video.currentTime);
  const hace = (Math.max(0, expectedMs) / 1000) * BLOCK_MARGIN;
  if (hace <= 0 || queda >= hace) return video.playbackRate;
  const rate = Math.max(MIN_RATE, Math.min(1, queda / hace));
  video.playbackRate = rate;
  return rate;
}

/* ---------------------------------------------------------------------------
 * DOS ESPERAS SEGUIDAS SON LA MISMA ESPERA.
 *
 * Al entrar al laboratorio se encadenan dos: "Cargando el indice anatomico"
 * (App) y la del cuerpo (RigLoadingScreen). Son dos componentes y, sin esto, el
 * segundo video empezaba otra vez desde el primer fotograma: un corte en mitad
 * de lo que se esta mirando. Un reloj comun: si la espera anterior se fue hace
 * menos de `CHAIN_MS`, la siguiente sigue por donde iba.
 * ------------------------------------------------------------------------ */
const CHAIN_MS = 3000;
const clock = { origin: -1, lastSeen: -Infinity };

/** Segundos desde que empezo la cadena de esperas en curso, o 0 si es nueva. */
export function chainedTime(now: number, duration: number): number {
  if (clock.origin < 0 || now - clock.lastSeen > CHAIN_MS) clock.origin = now;
  clock.lastSeen = now;
  const d = Number.isFinite(duration) && duration > 0 ? duration : LOADER_DURATION_S;
  return ((now - clock.origin) / 1000) % d;
}

/** Una espera se retira: la siguiente, si llega pronto, la continua. */
export function markLoaderGone(now: number): void {
  clock.lastSeen = now;
}

/** True si montar ahora continuaria una espera en curso (no hace falta poster). */
function continuesChain(now: number): boolean {
  return clock.origin >= 0 && now - clock.lastSeen <= CHAIN_MS;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * El video de carga. Ocupa el tamano que le de quien lo pone (`className` /
 * `style`) y recorta con `object-fit: cover`. Con `prefers-reduced-motion`, o si
 * el video no se puede reproducir, se queda el poster quieto.
 */
export function LoaderVideo({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  // Se decide UNA vez: cambiar de video a imagen a mitad de una carga seria un
  // parpadeo en la unica cosa que se esta mirando.
  const [still] = useState(() => typeof window !== 'undefined' && prefersReducedMotion());
  const [failed, setFailed] = useState(false);
  // Si continua una espera, sin poster: el poster es el PRIMER fotograma y
  // saldria un instante antes de saltar a donde iba el video. Sin el, el
  // elemento es negro hasta su fotograma, y negro es el fondo del clip.
  const [resume] = useState(() => typeof window !== 'undefined' && continuesChain(performance.now()));
  useEffect(() => () => markLoaderGone(performance.now()), []);
  const cls = `loader-video ${className}`.trim();

  if (still || failed) {
    return <img className={cls} style={style} src={LOADER_POSTER} alt="" aria-hidden draggable={false} />;
  }
  return (
    <video
      className={cls}
      style={style}
      src={LOADER_VIDEO}
      poster={resume ? undefined : LOADER_POSTER}
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        const t = chainedTime(performance.now(), v.duration);
        if (t > 0.05) v.currentTime = t;
      }}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden
      // Sin pista de audio no hace falta, pero un navegador que bloquee el
      // autoplay deja el poster: no es un error, no se cambia nada.
      onError={() => setFailed(true)}
    />
  );
}
