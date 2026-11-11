// src/lib/modelPhase.ts
//
// EN QUE TRAMO DE SU CARGA ESTA CADA MODELO, PARA QUIEN QUIERA SABERLO.
//
// La pantalla de carga del laboratorio leia las fases del reloj de arranque
// (bootClock), y ese reloj guarda la PRIMERA marca de cada nombre: mide el
// arranque de la aplicacion, no cada carga. Quien abria Explorar y despues el
// laboratorio llegaba a la pantalla de carga con `bytes` y `parse` ya puestos
// por el atlas, y la pantalla tenia que renunciar a las fases y decir "cargando"
// a secas. Aqui cada modelo lleva su propio estado, por URL, y avisa cada vez.
//
// Sin dependencias (ni three, ni React): lo publica el cargador de modelos y lo
// lee la pantalla de carga.

/** Los tramos de la carga de un modelo, en orden. */
export type ModelPhase = 'fetching' | 'parsing' | 'done' | 'error';

export interface ModelPhaseState {
  phase: ModelPhase;
  /** `performance.now()` del momento en que empezo cada tramo. */
  at: Partial<Record<ModelPhase, number>>;
}

type Listener = (url: string, state: ModelPhaseState) => void;

const states = new Map<string, ModelPhaseState>();
const listeners = new Set<Listener>();

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Publica que un modelo ha entrado en un tramo. */
export function setModelPhase(url: string, phase: ModelPhase): void {
  const prev = states.get(url);
  // Una carga nueva del mismo modelo (tras un error o un `clearGLTF`) empieza
  // su cuenta de cero.
  const at = phase === 'fetching' ? {} : { ...(prev?.at ?? {}) };
  at[phase] = now();
  const state: ModelPhaseState = { phase, at };
  states.set(url, state);
  for (const fn of listeners) {
    // Un oyente que falle no puede dejar un modelo a medio cargar.
    try {
      fn(url, state);
    } catch {
      /* ignorado a proposito */
    }
  }
}

/** El tramo en el que esta un modelo, o undefined si nadie lo ha pedido. */
export function modelPhase(url: string): ModelPhaseState | undefined {
  return states.get(url);
}

/** Avisa de cada cambio de tramo de cualquier modelo. Devuelve como soltarse. */
export function onModelPhase(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * CEDE EL HILO HASTA QUE EL NAVEGADOR HAYA PINTADO.
 *
 * Entre el fin de la descarga y el primer fotograma del laboratorio el hilo
 * principal no suelta: parsear el GLB, montar la escena, los pases de
 * preparacion y la subida a la GPU van seguidos, unos diez segundos (medido con
 * bootClock). Lo que la pantalla de carga quiera ensenar en ese tramo tiene que
 * estar YA en manos del compositor cuando empieza, y eso exige que el navegador
 * llegue a pintar un fotograma con el cambio. Medido: sin ceder, el aviso del
 * fin de la descarga caia dentro del bloqueo y no se pintaba hasta 7 s despues.
 *
 * Dos `requestAnimationFrame` y no uno: el primero corre ANTES de pintar el
 * fotograma en curso; el segundo, despues de haberlo pintado.
 *
 * CON SALIDA DE EMERGENCIA. En una pestana en segundo plano
 * `requestAnimationFrame` no corre nunca, y la carga de un modelo no puede
 * quedarse esperando a que alguien mire la pestana: si no esta visible se cede
 * con un temporizador, y aunque lo este, a los 120 ms se sigue de todos modos.
 */
export function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
    if (typeof requestAnimationFrame !== 'function' || !visible) {
      setTimeout(finish, 0);
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(finish));
    setTimeout(finish, 120);
  });
}
