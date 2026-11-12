// src/lib/studyKeys.ts
//
// EL TECLADO DEL MODO REPASAR, EN PURO.
//
// Repasar cien tarjetas con el raton son doscientos viajes: uno a la tarjeta
// para verla y otro al boton para calificarla. Antes de esto el modo Repasar no
// escuchaba NINGUNA tecla (no habia un solo `keydown` en src/components/study),
// asi que quien venia de Anki pulsaba espacio y no pasaba nada.
//
// El reparto es el de Anki, que es el que los estudiantes ya traen en los dedos:
//   Espacio / Intro   muestra la respuesta; con la respuesta a la vista, "Bien"
//   1 2 3 4           Otra vez, Dificil, Bien, Facil (solo con la respuesta a la vista)
//
// Aqui solo vive la DECISION (que tecla hace que, y cuando no hay que tocarla),
// sin DOM, para poder probarla. El gancho que la conecta a la ventana esta en
// src/hooks/useStudyKeys.ts.

import type { Grade } from './srs';

/** Las cuatro notas en el orden de sus teclas: 1, 2, 3 y 4. */
export const GRADE_KEYS: readonly Grade[] = ['again', 'hard', 'good', 'easy'];

export type ReviewKeyAction =
  | { type: 'flip' }
  | { type: 'grade'; grade: Grade }
  | null;

/** True para las dos teclas que "avanzan": espacio e Intro. */
export function isAdvanceKey(key: string): boolean {
  return key === ' ' || key === 'Spacebar' || key === 'Enter';
}

/** El indice (desde 0) de una tecla de digito "1".."9", o -1. */
export function digitIndex(key: string): number {
  return /^[1-9]$/.test(key) ? Number(key) - 1 : -1;
}

/**
 * Que hace una tecla en la sesion de repaso.
 *
 * Con la tarjeta SIN voltear los digitos no hacen nada, a proposito: calificar
 * una respuesta que no se ha visto es como se estropea una agenda de repaso
 * (la tarjeta se va a 4 dias con un "4" pulsado sin querer).
 */
export function reviewKeyAction(key: string, flipped: boolean): ReviewKeyAction {
  if (isAdvanceKey(key)) {
    return flipped ? { type: 'grade', grade: 'good' } : { type: 'flip' };
  }
  const i = digitIndex(key);
  if (flipped && i >= 0 && i < GRADE_KEYS.length) {
    return { type: 'grade', grade: GRADE_KEYS[i] };
  }
  return null;
}

export type DeckKeyAction = { type: 'flip' } | { type: 'grade'; known: boolean } | null;

/**
 * Que hace una tecla en el mazo libre (Tarjetas), que solo tiene dos notas:
 * 1 = "Repasar", 2 = "La sabía". Espacio voltea y, ya volteada, vale por
 * "La sabía", igual que en el repaso vale por "Bien".
 */
export function deckKeyAction(key: string, flipped: boolean): DeckKeyAction {
  if (isAdvanceKey(key)) {
    return flipped ? { type: 'grade', known: true } : { type: 'flip' };
  }
  const i = digitIndex(key);
  if (flipped && (i === 0 || i === 1)) return { type: 'grade', known: i === 1 };
  return null;
}

export type QuizKeyAction = { type: 'choose'; index: number } | { type: 'next' } | null;

/**
 * Que hace una tecla en el cuestionario: un digito elige la opcion de ese
 * numero mientras no se haya contestado; espacio o Intro pasan a la siguiente
 * una vez contestada. Espacio NO elige nada antes de contestar: no hay una
 * opcion "por defecto" que no sea regalar o quitar un acierto.
 */
export function quizKeyAction(key: string, answered: boolean, optionCount: number): QuizKeyAction {
  if (answered) return isAdvanceKey(key) ? { type: 'next' } : null;
  const i = digitIndex(key);
  return i >= 0 && i < optionCount ? { type: 'choose', index: i } : null;
}

/** Lo minimo que hace falta saber de una tecla para decidir si es nuestra. */
export interface KeyContext {
  key: string;
  /** Ctrl, Alt o Meta pulsados. */
  modifier: boolean;
  /** Autorrepeticion por mantener la tecla pulsada. */
  repeat: boolean;
  /** El foco esta en un campo de texto (input, textarea, editable). */
  typing: boolean;
  /**
   * El foco esta en un control que la tecla ACTIVA por si sola (un boton, un
   * enlace, un desplegable). No cuenta la pestana ya seleccionada: activarla
   * otra vez no hace nada, y es donde se queda el foco justo despues de entrar
   * en "Repaso" con el raton.
   */
  onControl: boolean;
  /** Algo tapa la vista de repaso (un dialogo, la paleta, el tour). */
  covered: boolean;
}

/**
 * True si la tecla NO es para el repaso y hay que dejarla pasar.
 *
 *   - con modificador: Ctrl+1 cambia de pestana del navegador, Ctrl+Intro y
 *     Alt+espacio son del sistema. El atajo es la tecla sola.
 *   - repetida: dejar el dedo en el espacio calificaria "Bien" una tarjeta tras
 *     otra, a 30 por segundo, sin haber visto ninguna.
 *   - escribiendo: un "3" en la nota de Mi coleccion es un 3.
 *   - tapada: con la guia o el dialogo de cuenta abiertos encima, las teclas
 *     seguirian calificando tarjetas que no se ven.
 *   - espacio o Intro sobre un control: esa tecla ya tiene dueno (el boton
 *     enfocado). Los digitos no activan nada, asi que esos si pasan.
 */
export function shouldIgnoreStudyKey(ctx: KeyContext): boolean {
  if (ctx.modifier || ctx.repeat || ctx.typing || ctx.covered) return true;
  if (isAdvanceKey(ctx.key) && ctx.onControl) return true;
  return false;
}
