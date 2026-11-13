// src/components/LoaderVideo.tsx
//
// EL VIDEO DE CARGA: UN CUERPO QUE SE CONSTRUYE MIENTRAS LA APLICACION CARGA.
//
// Lo eligio el usuario (`Downloads/gemini_generated_video_3e6e86f0.mp4`). De
// sus diez segundos se usan los seis primeros, que cuentan exactamente lo que
// esta pasando: un esqueleto holografico, un barrido que sube de los pies a la
// cabeza descubriendo el musculo, y el plano que se abre sobre el cuerpo entero
// ya construido, que es lo que aparece despues en el laboratorio.
//
// -----------------------------------------------------------------------------
// LO QUE VIO EL USUARIO, Y LO QUE SE MIDIO (build de produccion, `?perf=1`)
// -----------------------------------------------------------------------------
// "Se traba", "cuando termina el video todavia no acaba de cargar", "la barra
// no va con el video", "a veces solo queda el video". La version anterior era un
// bucle de 9,5 s con dos ciclos y otro <video> para cada espera:
//   - la espera del indice y la del laboratorio tenian CADA UNA su video: el
//     segundo empezaba de cero (o saltaba con una busqueda) al relevarse;
//   - en desarrollo (unos 20 s de carga) el ciclo terminaba y volvia a empezar
//     con el laboratorio aun cargando;
//   - con el hilo bloqueado el video sigue, pero no gratis: 14 de 158
//     fotogramas perdidos, 11 de ellos en los 4,35 s de subida a la GPU.
// Y la barra iba por su lado: cuatro tramos de ancho fijo contra un video que
// no sabia nada de ellos.
//
// -----------------------------------------------------------------------------
// COMO ES AHORA
// -----------------------------------------------------------------------------
// 1. EL FICHERO (`public/carga-revelado.mp4`, 793 KB): los 6,1 s de la
//    construccion RALENTIZADOS EN LA CODIFICACION a 8,46 s con interpolacion de
//    movimiento (ffmpeg minterpolate; duplicar fotogramas iba a saltos), y
//    despues 32 s del ultimo plano QUIETO, que casi no pesa. Ralentizar con
//    `playbackRate` en el navegador habria sido verlo a 11 fotogramas por
//    segundo. Sin audio, 960 x 540, H.264.
// 2. EL MOVIMIENTO DE LA COLA lo pone CSS: un acercamiento lento con
//    `transform` (lo anima el compositor aunque el hilo este bloqueado). Si la
//    carga dura mas que la construccion, el cuerpo construido espera
//    acercandose despacio; no se para ni vuelve a empezar.
// 3. UN SOLO <video> PARA TODA LA APLICACION. Cada espera monta un hueco y el
//    video se MUEVE a ese hueco; dos esperas encadenadas (el modulo del
//    laboratorio y luego el cuerpo) lo comparten sin cortarse. Solo una espera
//    NUEVA (la anterior se fue hace mas de `SEQUENCE_GAP_MS`) lo devuelve al
//    principio.
// 4. EL MISMO RELOJ QUE LA BARRA. `paceReveal` ajusta la velocidad (entre 0,8 y
//    1,25, para no notarlo) para que la construccion acabe cuando se espera que
//    acabe la carga; lo llama la pantalla del laboratorio en la descarga y en el
//    relevo, con los mismos tiempos que mueven su barra.
//
// -----------------------------------------------------------------------------
// LO QUE SE MIDIO DESPUES (12 nov, build de produccion, `?perf=1`, a la vista)
// -----------------------------------------------------------------------------
//   - UN video de punta a punta: en todas las cargas, cero muestras en pausa y
//     `currentTime` nunca hacia atras en el relevo del indice al laboratorio.
//   - La construccion acabo con la carga: a 1440, entre 0,3 s antes y 0,6 s
//     despues del primer fotograma (lo que falta se ve a doble velocidad en el
//     fundido de salida, `finishReveal`).
//   - Fotogramas perdidos en el bloqueo: 8,0 / 9,0 / 8,6 / 8,7 % a 1440 x 900 y
//     11,9 % a 1920 x 1080 (antes, 8,9 %). El bloqueo cuesta lo mismo que antes:
//     lo que se quito es el corte del relevo y el reinicio del bucle. La mascara
//     radial NO es la causa: sin ella y sin el acercamiento, 6,5 y 11,2 %.
//   - Con la pestana OCULTA el navegador pausa el video sin sonido y frena los
//     temporizadores a uno por segundo: esas cargas no valen como medida (y no
//     se aprenden, ver RigLoadingScreen).

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

export const LOADER_VIDEO = '/carga-revelado.mp4';
export const LOADER_POSTER = '/carga-revelado.webp';
/** Donde acaba la construccion dentro del fichero (s). Despues, el plano quieto. */
export const REVEAL_S = 8.4583;
/** Lo que dura el fichero entero (s): la construccion y 32 s de plano quieto. */
export const LOADER_DURATION_S = 40.4583;
/** Una espera que empieza mas de esto despues de la anterior es una espera NUEVA. */
export const SEQUENCE_GAP_MS = 1500;
/** El margen de velocidad que no se nota a la vista. */
export const MIN_RATE = 0.8;
export const MAX_RATE = 1.25;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------------------
 * EL VIDEO UNICO
 * ------------------------------------------------------------------------ */

let el: HTMLVideoElement | null = null;
let goneAt = Number.NEGATIVE_INFINITY;
let hosts = 0;

function theVideo(): HTMLVideoElement {
  if (el) return el;
  const v = document.createElement('video');
  v.className = 'loader-video';
  v.src = LOADER_VIDEO;
  v.poster = LOADER_POSTER;
  v.muted = true;
  v.defaultMuted = true;
  v.autoplay = true;
  v.playsInline = true;
  v.preload = 'auto';
  // El fichero dura 40 s: con un plano quieto al final, no hace falta bucle
  // (y el bucle lo hace el hilo principal, que en la carga esta bloqueado).
  v.loop = false;
  v.disablePictureInPicture = true;
  v.setAttribute('playsinline', '');
  v.setAttribute('muted', '');
  v.setAttribute('aria-hidden', 'true');
  v.setAttribute('disableremoteplayback', '');
  el = v;
  return v;
}

/**
 * Velocidad para que la construccion acabe en `remainingMs`: lo que queda de
 * construccion entre lo que queda de carga, dentro de [MIN_RATE, MAX_RATE]. Si
 * ya esta construido, velocidad normal (la cola es un plano quieto).
 */
export function revealRate(currentTime: number, remainingMs: number): number {
  const queda = REVEAL_S - currentTime;
  if (queda <= 0 || remainingMs <= 0) return 1;
  return Math.min(MAX_RATE, Math.max(MIN_RATE, queda / (remainingMs / 1000)));
}

/** Acompasa el video con lo que se espera que quede de carga. */
export function paceReveal(remainingMs: number): void {
  const v = el;
  if (!v || !v.isConnected) return;
  const r = revealRate(v.currentTime, remainingMs);
  if (Math.abs(v.playbackRate - r) > 0.02) v.playbackRate = r;
}

/** La carga termino: lo que falte de construccion, rapido, durante el fundido. */
export function finishReveal(): void {
  const v = el;
  if (v && v.currentTime < REVEAL_S) v.playbackRate = 2;
}

/* ---------------------------------------------------------------------------
 * MEDIR SI SE TRABA (`?perf=1`, como el reloj de arranque).
 *
 * `currentTime` avanza aunque se pierdan fotogramas, asi que "10 s de video en
 * 10 s" no dice si se vio fluido. Con `?perf=1` el video apunta cada 100 ms sus
 * fotogramas presentados y perdidos (`getVideoPlaybackQuality`) en
 * `window.__cargaVideo`; los huecos entre muestras son el hilo bloqueado.
 * ------------------------------------------------------------------------ */
const PERF = typeof location !== 'undefined' && /[?&]perf=1\b/.test(location.search);
function sampleQuality(v: HTMLVideoElement): () => void {
  if (!PERF) return () => {};
  const w = window as unknown as { __cargaVideo?: unknown[] };
  w.__cargaVideo = w.__cargaVideo ?? [];
  const tick = () => {
    const q = typeof v.getVideoPlaybackQuality === 'function' ? v.getVideoPlaybackQuality() : null;
    w.__cargaVideo!.push({
      t: Math.round(performance.now()),
      ct: +v.currentTime.toFixed(3),
      total: q?.totalVideoFrames ?? -1,
      dropped: q?.droppedVideoFrames ?? -1,
      rate: v.playbackRate,
      paused: v.paused,
    });
  };
  tick();
  const h = window.setInterval(tick, 100);
  return () => {
    tick();
    window.clearInterval(h);
  };
}

/**
 * El hueco del video de carga. Ocupa lo que le de quien lo pone y el video lo
 * llena (`object-fit: cover`). Con `prefers-reduced-motion`, el poster quieto.
 */
export function LoaderVideo({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const host = useRef<HTMLDivElement>(null);
  // Se decide UNA vez: cambiar de video a imagen a mitad de una carga seria un
  // parpadeo en la unica cosa que se esta mirando.
  const [still] = useState(() => typeof window !== 'undefined' && prefersReducedMotion());
  const [failed, setFailed] = useState(false);

  // En la fase de LAYOUT y no en un efecto: si una espera se retira y otra
  // aparece en el mismo commit, el video se saca de un hueco y se mete en el otro
  // antes de que el navegador mire si sigue en el documento, y no se pausa.
  useLayoutEffect(() => {
    if (still || !host.current) return;
    const v = theVideo();
    const nueva = hosts === 0 && performance.now() - goneAt > SEQUENCE_GAP_MS;
    hosts++;
    host.current.appendChild(v);
    if (nueva) {
      v.playbackRate = 1;
      if (v.currentTime > 0.01) v.currentTime = 0;
    }
    const onError = () => setFailed(true);
    v.addEventListener('error', onError);
    // Un navegador que bloquee el autoplay deja el poster: no es un error.
    void v.play().catch(() => {});
    const stop = sampleQuality(v);
    return () => {
      v.removeEventListener('error', onError);
      stop();
      hosts--;
      goneAt = performance.now();
    };
  }, [still]);

  if (still || failed) {
    return (
      <img
        className={`loader-video ${className}`.trim()}
        style={style}
        src={LOADER_POSTER}
        alt=""
        aria-hidden
        draggable={false}
      />
    );
  }
  return <div ref={host} className={`loader-video-host ${className}`.trim()} style={style} aria-hidden />;
}
