// src/lib/rigMaterialStack.ts
//
// DOS SISTEMAS VISTEN LA MISMA MALLA, Y SE PISABAN.
//
// En el laboratorio hay dos cosas que cambian el material de un musculo:
//   - el BRILLO de activacion (RigOverlays), que marca el papel del musculo en
//     la fase del movimiento y se recalcula en cada comando;
//   - el RESALTE DE SELECCION (RigModel), que marca lo que "Diseccionar" se va
//     a llevar y dura lo que dure la seleccion.
//
// Cada uno clonaba el material que encontraba puesto y guardaba ese material
// como "el original". Si el musculo ya estaba encendido cuando se pincha, lo
// que el resalte guardaba como original ERA EL CLON DEL BRILLO. Al mover el
// arco, el brillo veia que la malla ya no lleva su clon, lo descartaba y lo
// DESTRUIA (`dispose`) -- que es lo correcto, es suyo. Y al deseleccionar, el
// resalte devolvia a la malla ese material ya destruido: el musculo se quedaba
// encendido para siempre, sin forma de apagarlo salvo recargar.
//
// La correccion es que ninguno de los dos guarde el clon del otro: los dos
// guardan EL MATERIAL DE BASE, el plano con el que la malla se pinta cuando no
// hay nada encima. Se lleva en un WeakMap y no en `userData` a proposito:
// `THREE.Material.copy` serializa `userData` a JSON, asi que una referencia a
// otro material no sobrevive al clonado.

import type * as THREE from 'three';

const BASE_OF = new WeakMap<THREE.Material, THREE.Material>();

/**
 * El material de base de la malla: el plano original, aunque lo que lleve
 * puesto sea el clon de otro sistema (o el clon de un clon).
 */
export function baseMaterialOf(mat: THREE.Material): THREE.Material {
  return BASE_OF.get(mat) ?? mat;
}

/**
 * Clona un material para decorarlo, recordando cual es el de base.
 *
 * El que llama es el dueno del clon y el unico que puede destruirlo; para
 * devolver la malla a su estado pelado se usa `baseMaterialOf`, nunca el
 * material que estuviera puesto.
 */
export function cloneOverlayMaterial<T extends THREE.Material>(src: T): T {
  const clone = (src.clone ? src.clone() : src) as T;
  if (clone !== src) BASE_OF.set(clone, baseMaterialOf(src));
  return clone;
}
