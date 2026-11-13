// src/components/movement/labMotionChannel.ts
//
// EL MARGEN PIDE IR A UN GRADO; LA CONSOLA ES QUIEN MUEVE.
//
// El paginador de fases del margen izquierdo (RhythmReadout) lleva el cuerpo al
// centro de la fase que se pulsa. Pero el angulo es ESTADO DE LA CONSOLA
// (MovementControls): ella reproduce, recorta por el cuadro clinico, guarda la
// pose y empuja el rig. Si el margen escribiera el angulo por su cuenta habria
// dos duenos y el primer fotograma de reproduccion lo pisaria. Asi que el margen
// solo PIDE (`seek`) y la consola hace lo mismo que al arrastrar su deslizador:
// toma el rig, pausa y pone el angulo dentro de su arco.
//
// Y al reves, la consola publica si el cuerpo se esta MOVIENDO (reproduciendo o
// con el deslizador agarrado). El margen lo usa para no bailar: en movimiento la
// celda de la frase mide la fase mas alta, de modo que al cambiar de fase solo
// cambia el texto y nada salta de sitio.

import { useSyncExternalStore } from 'react';

type SeekListener = (deg: number) => void;

const seekListeners = new Set<SeekListener>();
let moving = false;
const movingSubs = new Set<() => void>();

export const labMotionChannel = {
  /** Margen: lleva el cuerpo a `deg` (la consola lo recorta a su arco). */
  seek(deg: number): void {
    seekListeners.forEach((l) => l(deg));
  },
  /** Consola: escucha las peticiones. Devuelve la baja. */
  onSeek(l: SeekListener): () => void {
    seekListeners.add(l);
    return () => {
      seekListeners.delete(l);
    };
  },
  /** Consola: el cuerpo se esta moviendo (reproduccion o arrastre). */
  setMoving(v: boolean): void {
    if (moving === v) return;
    moving = v;
    movingSubs.forEach((f) => f());
  },
  isMoving(): boolean {
    return moving;
  },
};

/** Margen: si el cuerpo se esta moviendo ahora mismo. */
export function useLabMoving(): boolean {
  return useSyncExternalStore(
    (f) => {
      movingSubs.add(f);
      return () => movingSubs.delete(f);
    },
    () => moving,
    () => false,
  );
}
