// src/lib/stageToolbar.ts
//
// LA BARRA DE VISTAS DE EXPLORAR, MEDIDA, PARA QUE NADA SE ESCRIBA DEBAJO.
//
// Lo que se pinta sobre el escenario (los nombres del atlas y la etiqueta de
// origen / insercion) guardaba una franja FIJA abajo, la de la barra en
// escritorio (96 px: la barra a 1,5rem del borde, 56 de alto, y 16 de aire).
// Pero en la tableta y el movil la barra sube a 4,75rem, por encima de "Indice"
// y "Ficha": medido a 768 x 1024, su borde de arriba en y = 886, a 138 px del
// pie de la ventana. Bajando alli el modelo con el arrastre, hasta cuatro
// nombres (pectoral mayor y menor, dorsal ancho, humero) quedaban detras de la
// barra; y la etiqueta de origen tambien, a 1440 x 900, al acercar la camara.
//
// La barra lleva la marca `data-stage-toolbar` (ViewToolbar.tsx). Se lee su
// borde de arriba contra el lienzo; se llama cada medio segundo, no en cada
// fotograma, porque solo cambia al redimensionar.

/** Atributo que marca la barra de vistas en el DOM. */
export const STAGE_TOOLBAR_SELECTOR = '[data-stage-toolbar]';

/** Aire entre lo escrito y el borde de arriba de la barra (el mismo que en escritorio). */
export const STAGE_TOOLBAR_AIR = 16;

/**
 * Cuanto ocupa la barra de vistas desde el borde de abajo del lienzo, en px.
 * Sin barra (otro modo, oculta) o si no toca el lienzo, 0.
 */
export function toolbarReserve(canvas: HTMLElement): number {
  const bar = document.querySelector(STAGE_TOOLBAR_SELECTOR);
  if (!bar) return 0;
  const c = canvas.getBoundingClientRect();
  const b = bar.getBoundingClientRect();
  if (b.height === 0 || b.top >= c.bottom || b.bottom <= c.top) return 0;
  return Math.max(0, c.bottom - b.top);
}
