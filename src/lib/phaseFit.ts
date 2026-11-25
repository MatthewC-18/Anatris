// src/lib/phaseFit.ts
//
// CUANTAS LINEAS DE CONTINUACION CABEN EN LA FRASE DE LA FASE.
//
// PhaseStack (components/movement/LabMarginParts.tsx) pinta todas las fases en
// la misma celda de rejilla, una encima de otra y solo la activa visible, para
// que la celda mida siempre lo que la fase mas alta y nada de debajo se mueva.
// El sitio que le sobra a la fase activa se llena con la continuacion de su
// propio texto, por lineas enteras.
//
// LA CUENTA NO PUEDE DEPENDER DE SI LA CONTINUACION YA ESTA PINTADA. Antes
// restaba solo el alto del parrafo de continuacion, sin su margen de 6 px, y
// cambiaba de interlineado segun hubiera parrafo o no (20 frente a 20,15 px).
// Medido en la flexion del codo a 1440x900, fase "Rango medio" (celda de
// 311 px): sin continuacion, (146,55 - 116,11 - 6) / 20 = 1,22 -> 1 linea; con
// esa linea pintada el nucleo salia 6 px mas alto y (146,55 - 122,11 - 6) /
// 20,15 = 0,92 -> 0. Como el resultado estaba en las dependencias del efecto,
// oscilaba 1-0-1 hasta que React cortaba a las 50 vueltas ("Maximum update
// depth exceeded") y la ErrorBoundary desmontaba el laboratorio entero, lienzo
// incluido ("Algo salio mal en la vista 3D"). A 1920x1080 caia igual a 100
// grados; en la encuesta sin rig, 1.092 bucles en 13 fases de 7 regiones.
//
// Ahora el nucleo resta la CAJA entera de la continuacion (alto + margen) y el
// interlineado es una constante: pintada o no, la cuenta da lo mismo y el
// efecto se para en la segunda pasada.

/**
 * Interlineado de la continuacion, en px: text-[13px] leading-[1.55] en
 * PhaseStack. Va en px fijos (no en rem), asi que no depende de la fuente raiz.
 * Si cambia la clase, cambia esto.
 */
export const PHASE_CONT_LINE_PX = 13 * 1.55;

/** Margen de arriba de la continuacion (mt-1.5 = 0,375 rem), en rem. */
export const PHASE_CONT_GAP_REM = 0.375;

export interface PhaseFitInput {
  /** Alto pintado de cada fase; la activa, con su continuacion si la hay. */
  blockHeights: readonly number[];
  /** Fase activa. */
  index: number;
  /** Alto del parrafo de continuacion pintado (sin margen), 0 si no lo hay. */
  contHeight: number;
  /** Margen de arriba de la continuacion, en px. */
  contGapPx: number;
  /** Interlineado de la continuacion, en px. */
  lineHeightPx?: number;
}

/**
 * Lineas de continuacion que caben en la fase activa sin que la celda crezca:
 * el sitio entre su NUCLEO (la fase sin la continuacion ni su margen) y el de
 * la fase mas alta, menos el margen de la continuacion, en lineas enteras.
 */
export function phaseContinuationLines({
  blockHeights,
  index,
  contHeight,
  contGapPx,
  lineHeightPx = PHASE_CONT_LINE_PX,
}: PhaseFitInput): number {
  if (index < 0 || index >= blockHeights.length || !(lineHeightPx > 0)) return 0;
  const contBox = contHeight > 0 ? contHeight + contGapPx : 0;
  const nucleo = blockHeights.map((h, i) => (i === index ? h - contBox : h));
  const alto = Math.max(...nucleo);
  return Math.max(0, Math.floor((alto - nucleo[index] - contGapPx) / lineHeightPx));
}
