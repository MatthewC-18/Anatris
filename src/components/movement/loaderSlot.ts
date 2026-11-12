// src/components/movement/loaderSlot.ts
//
// DONDE SE PINTA LA PANTALLA DE CARGA DEL LABORATORIO.
//
// El cuerpo lo carga RigViewer, que vive en el ESCENARIO, entre los dos
// margenes. Si su pantalla de carga se pinta ahi, ocupa solo el escenario y deja
// a la vista los margenes medio montados; y la espera de antes (App, mientras
// baja el trozo de codigo del laboratorio) ocupa la zona ENTERA. Eran dos
// pantallas de distinto tamano encadenadas: el video saltaba de sitio y "a veces
// se quita todo y solo queda el video".
//
// App registra aqui su `<main>` del laboratorio (el mismo rectangulo que su
// espera) y RigViewer pinta su pantalla de carga en el con un portal: las dos
// esperas ocupan el mismo sitio, el video no se mueve, y el laboratorio aparece
// entero, de una vez, cuando el cuerpo esta pintado.

import { useSyncExternalStore } from 'react';

let slot: HTMLElement | null = null;
const subs = new Set<() => void>();

/** App: el `<main>` del laboratorio (o null al desmontarse). Va como `ref`. */
export function setLoaderSlot(el: HTMLElement | null): void {
  if (slot === el) return;
  slot = el;
  subs.forEach((f) => f());
}

export function useLoaderSlot(): HTMLElement | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => slot,
    () => null,
  );
}
