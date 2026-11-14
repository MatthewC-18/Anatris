// src/lib/shellRoute.ts
//
// LO QUE EL ARMAZON HACE CON UNA RUTA: EN QUE MODO SE QUEDA Y COMO SE TITULA.
//
// Dos defectos del armazon vivian en App.tsx sin que nada los vigilara, y los
// dos son logica pura, asi que estan aqui, donde un test los alcanza.
//
// 1. EL BOTON ATRAS SE QUEDABA ATRAPADO EN FUNDAMENTOS.
//    Fundamentos no tiene modo Explorar (no hay musculos que listar): al entrar
//    en el desde Explorar, App corrige el modo a Aprender. Pero la ruta se
//    escribia ANTES de corregir: quedaban dos entradas en el historial,
//    `/fundamentos/explorar` y `/fundamentos/aprender`, y la primera rebota a
//    la segunda cada vez que se llega a ella. Atras desde Fundamentos devolvia
//    a Fundamentos, siempre. `shellRoute.test.ts` reproduce la pila del
//    historial paso a paso: diez pulsaciones de Atras y la direccion sigue
//    siendo `/fundamentos/aprender`.
//    La regla que lo arregla: NO SE ESCRIBE UNA RUTA QUE LA PROPIA APLICACION
//    VA A CORREGIR. `settledMode` dice en que modo se queda cada par
//    region/modo, y App solo escribe cuando el modo ya es ese.
//
// 2. EL TITULO DEL DOCUMENTO NO CAMBIABA NUNCA.
//    `document.title` no se asignaba en ningun sitio del codigo (`grep -rn
//    "document.title" src` daba cero), asi que las 36 rutas compartian el
//    titulo de index.html. En la pestana, en el historial del navegador y en
//    los marcadores, /rodilla/movimiento y /hombro/explorar se llamaban igual.
//
// 3. EL RECORRIDO DE BIENVENIDA TAPABA LA CARGA DEL LABORATORIO.
//    Un perfil nuevo que llegaba por enlace a /hombro/movimiento (el de un
//    video) veia el recorrido ENCIMA de la pantalla de carga: MEDIDO en Chrome
//    sin cabeza, en las 13 muestras con la pantalla de carga montada estaba
//    tambien el dialogo, y la captura lo ensena delante de "Abriendo el
//    laboratorio". Y lo que cuenta ("Toca el cuerpo", los cuatro modos, que es
//    gratis) habla del atlas, no del laboratorio. `tourOpens` lo deja para el
//    primer modo que no sea el laboratorio, salvo que se pida desde la guia; y
//    si se va de la pantalla sin terminarlo, `tourLeftUnfinished` lo apunta.

import type { AppMode } from '../components/TopBar';
import { conceptForRegion, isConceptModule } from '../data/conceptByRegion';
import { REGIONS } from '../data/regiones';
import { formatRoute } from './routing';

/**
 * El modo en el que la aplicacion se queda para una region y un modo pedidos.
 * Hoy solo hay una correccion: un modulo conceptual (Fundamentos) abierto en
 * Explorar se ensena en Aprender, que es donde vive su lectura con el modelo.
 */
export function settledMode(region: string | null, mode: AppMode): AppMode {
  return isConceptModule(region) && mode === 'explore' ? 'learn' : mode;
}

/**
 * Si el recorrido de bienvenida esta en pantalla. Solo se aplaza el que sale
 * SOLO: en el laboratorio espera al primer modo que no lo sea. El que se pide
 * desde la guia ("Reabrir el tour") sale donde se pida, tambien en el
 * laboratorio: si no, el boton no haria nada y el recorrido apareceria despues,
 * sin venir a cuento, al pasar a Explorar.
 *
 * @param done  ya se vio (o se salto) en este navegador
 * @param asked se acaba de pedir desde la guia
 * @param mode  el modo asentado (`settledMode`)
 */
export function tourOpens(done: boolean, asked: boolean, mode: AppMode): boolean {
  if (done) return false;
  return asked || mode !== 'movement';
}

/**
 * El recorrido se fue de la pantalla SIN TERMINARLO: cuenta como visto, igual
 * que Saltar.
 *
 * Pasa con Atras. Quien llega al laboratorio por enlace y pasa a Explorar tiene
 * el laboratorio justo detras en el historial. Si mientras lee el recorrido
 * vuelve con Atras (el boton del raton, o el gesto que en el movil cierra los
 * dialogos), el modo vuelve a ser el laboratorio, `tourOpens` da falso y el
 * recorrido se desmonta sin pasar por Saltar: no quedaba apuntado y salia otra
 * vez desde el paso 1 en el siguiente modo que no fuera el laboratorio.
 *
 * @param wasOpen estaba en pantalla en el render anterior
 * @param isOpen  esta en pantalla ahora
 * @param done    ya esta apuntado como visto (Saltar, Empezar, Escape, el velo)
 */
export function tourLeftUnfinished(wasOpen: boolean, isOpen: boolean, done: boolean): boolean {
  return wasOpen && !isOpen && !done;
}

/** El nombre que ve el usuario para una region o un modulo conceptual. */
export function regionDisplayName(region: string): string | null {
  return conceptForRegion(region)?.conceptName ?? REGIONS[region]?.name ?? null;
}

/**
 * El titulo de la pestana para una pantalla: "Rodilla · Movimiento | Anatris".
 *
 * El nombre del modo sale del slug de la ruta, que ya es la palabra en espanol
 * que lleva la barra ("movimiento", "repasar"): asi no hay una cuarta copia de
 * los nombres de los modos que mantener a mano.
 */
export function documentTitleFor(region: string, mode: AppMode): string {
  const slug = formatRoute({ region, mode }).split('/')[2] ?? '';
  const modeName = slug.charAt(0).toUpperCase() + slug.slice(1);
  const parts = [regionDisplayName(region), modeName].filter(Boolean);
  return `${parts.join(' · ')} | Anatris`;
}
