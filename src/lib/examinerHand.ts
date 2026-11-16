// src/lib/examinerHand.ts
//
// SI EL MODELO DIBUJA LA MANO DEL EXPLORADOR EN UN DEMO DE PRUEBA.
//
// Una regla, escrita una vez, porque la leen tres sitios que tienen que decir lo
// mismo: el bucle del demo (que enciende la mano en el rig), la ficha de la
// prueba ("En Demostrar veras donde se apoya la mano del fisio") y la lectura
// del escenario ("donde se apoya la mano del fisio en el modelo"). Si uno la
// dibuja y otro la promete por su cuenta, el texto vuelve a mentir.
//
// Hay mano cuando la prueba dice quien hace la fuerza (`examinerForce`) y no la
// quita expresamente (`examinerHand: false`). Ver TestDemo.examinerHand: la mano
// generica empuja contra el gesto base, y en las pruebas cuya fuerza va en otra
// direccion o sobre otro segmento ensenaba una fuerza que no es la de la prueba.

import type { TestDemo } from '../types/orthopedicTest';

/** True si el rig dibuja la mano del explorador para este demo. */
export function examinerHandDrawn(
  demo: Pick<TestDemo, 'examinerForce' | 'examinerHand'> | null | undefined,
): boolean {
  return !!demo && demo.examinerForce != null && demo.examinerHand !== false;
}
