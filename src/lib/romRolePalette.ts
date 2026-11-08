// LOS CUATRO TONOS DEL PAPEL, EN UN SOLO SITIO.
//
// El papel de un músculo en una fase (motor, freno excéntrico, asistente,
// estabilizador) se dibuja en cuatro lugares distintos del laboratorio: el
// contorno de la malla, la leyenda del panel, el borde de la tarjeta del
// protagonista y la barra de porcentaje. Los hexadecimales estaban escritos
// tres veces (`RigOverlays`, `MuscleBands` y a mano dentro de
// `RhythmReadout`), lo que garantiza que antes o después dejen de coincidir
// justo cuando alguien mira un fotograma congelado.
//
// IMPORTANTE, Y ES LA MEDIDA QUE JUSTIFICA ESTE ARCHIVO: estos tonos NO se
// pueden escribir sobre la carne del músculo. Ver `src/lib/rigRim.ts`: tres de
// los cuatro tienen el rojo casi a cero en espacio lineal, así que puestos en
// el emisivo --que es aditivo-- repintan el tejido (el freno salía verde menta,
// hue 170, al lado de un músculo en reposo en hue 0). Aquí viven para el BORDE
// y para el TEXTO; el vientre lleva su propio rojo calentado.
import type { RomMuscleRole } from '../types/rom';

/** Tono del papel como entero, para three. */
export const ROLE_TONE: Record<RomMuscleRole, number> = {
  'prime-mover': 0xffa51e, // ámbar — el que mueve
  'eccentric-control': 0x2dd4bf, // teal — el que frena
  assistant: 0x38bdf8, // cian — el que ayuda
  stabilizer: 0xa78bfa, // violeta — el que sujeta
};

/** El mismo tono como cadena CSS, para el panel. */
export const ROLE_TONE_CSS: Record<RomMuscleRole, string> = {
  'prime-mover': '#ffa51e',
  'eccentric-control': '#2dd4bf',
  assistant: '#38bdf8',
  stabilizer: '#a78bfa',
};

/**
 * El orden en que se leen. No es alfabético ni el del tipo: es el del esfuerzo.
 * El freno va JUNTO al motor porque en una flexión de tronco es el protagonista
 * de la fase, y enterrarlo detrás de los asistentes sería contarla al revés.
 */
export const ROLE_ORDER: readonly RomMuscleRole[] = [
  'prime-mover',
  'eccentric-control',
  'assistant',
  'stabilizer',
];
