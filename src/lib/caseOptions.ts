// src/lib/caseOptions.ts
//
// EL ORDEN DE LAS OPCIONES DE UN CASO CLINICO.
//
// Medido sobre el contenido real: en los 15 casos, los 38 pasos, la respuesta
// correcta era la opcion `a`. El 100%. Es decir que el ejercicio de
// razonamiento clinico se aprobaba pulsando siempre la primera, sin leer el
// enunciado, y los pasos se parecian todos entre si porque la mecanica era
// siempre la misma.
//
// No es culpa de quien escribio los casos: poner la correcta primera es lo
// natural al redactarla, y es mas facil de revisar asi. La que tiene que
// desordenar es la vista, no el archivo de datos. El cuestionario generado ya
// lo hacia (`studyEngine.shuffle`); los casos autorales se habian quedado sin
// ese paso.
//
// Por eso esto vive en una funcion pura y probada en vez de dentro del
// componente: el fallo era invisible mirando la pantalla -- cada pregunta,
// por separado, parecia perfectamente correcta.

import { shuffle } from './studyEngine';
import type { CaseOption, CaseStep } from '../types/clinicalCase';

/**
 * Las opciones de un paso, desordenadas.
 *
 * Usa el mismo Fisher-Yates que el cuestionario, con `Math.random`: cada
 * intento reordena, asi que repetir un caso no se resuelve de memoria
 * posicional. Devuelve un array nuevo; nunca muta el contenido autoral.
 */
export function shuffledCaseOptions(step: CaseStep): CaseOption[] {
  return shuffle(step.options);
}

/**
 * La letra que se le muestra al usuario para la opcion en la posicion `i`.
 *
 * Deliberadamente derivada de la POSICION en pantalla y no del `id` del dato:
 * tras desordenar, el `id` 'a' puede estar en tercer lugar, y ensenar "a" ahi
 * seria confuso. El `id` sigue siendo la identidad para puntuar.
 */
export function optionLetter(i: number): string {
  return String.fromCharCode(97 + i);
}
